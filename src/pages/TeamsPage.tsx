import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users as MaleIcon, UserCircle2 as FemaleIcon, Shuffle, ChevronDown,
  Download, Edit2, Star, Columns3, X, LayoutGrid, ArrowLeftRight,
} from 'lucide-react';
import { Player, Position, Team } from '../types/player';
import {
  generateBalancedTeams,
  calculateTeamRating,
  getTeamSlotCaps,
  type BalanceMode,
} from '../utils/teamBalancer';
import { exportTeamsToPDF } from '../utils/pdfExport';
import {
  emptyTeamColumnFilters,
  playerPassesTeamColumnFilters,
  uniqSorted,
  type TeamColumnFiltersState,
} from '../utils/teamPlayerFilters';
import { useSport } from '../context/SportContext';
import { defaultTeamSizeForSport, maxTeamsForSport } from '../utils/sports';
import { isVeteranPlayer, playerAgeYears } from '../utils/playerDerivedStats';
import { saveSquad, loadSquad, clearSquad } from '../utils/squadStorage';

interface TeamsPageProps {
  players: Player[];
}

type Category = 'mixed' | 'male' | 'female';

const positionLabels: Record<Position, string> = {
  GK: 'Kaleci',
  DEF: 'Defans',
  MID: 'Orta Saha',
  FWD: 'Forvet',
};

const allPositions: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

function tryMovePlayer(
  teams: Team[],
  reserves: Player[],
  playerId: string,
  dest: 'reserve' | number,
  maxPerTeam: number
): { teams: Team[]; reserves: Player[] } | null {
  let player: Player | undefined;
  for (const t of teams) {
    const f = t.players.find((p) => p.id === playerId);
    if (f) {
      player = f;
      break;
    }
  }
  if (!player) player = reserves.find((p) => p.id === playerId);
  if (!player) return null;

  const nextT = teams.map((t) => ({
    ...t,
    players: t.players.filter((p) => p.id !== playerId),
  }));
  const nextR = reserves.filter((p) => p.id !== playerId);

  if (dest === 'reserve') {
    return { teams: nextT, reserves: [...nextR, player] };
  }

  const target = nextT.find((t) => t.id === dest);
  if (!target) return null;
  if (target.players.length >= maxPerTeam) return null;

  return {
    teams: nextT.map((t) =>
      t.id === dest ? { ...t, players: [...t.players, player] } : t
    ),
    reserves: nextR,
  };
}

function TransferBar({
  teams,
  reserves,
  teamSize,
  onMove,
}: {
  teams: Team[];
  reserves: Player[];
  teamSize: number;
  onMove: (playerId: string, dest: 'reserve' | number) => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [dest, setDest] = useState<string>('reserve');

  const options = useMemo(() => {
    const o: { id: string; label: string }[] = [];
    teams.forEach((t) => {
      t.players.forEach((p) => {
        o.push({ id: p.id, label: `${p.name} — ${t.name}` });
      });
    });
    reserves.forEach((p) => {
      o.push({ id: p.id, label: `${p.name} — Yedek` });
    });
    return o;
  }, [teams, reserves]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-0 flex-1">
        <label className="mb-1.5 block text-[11px] text-zinc-500">Oyuncu</label>
        <select
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
          className="input-modern min-h-[2.75rem] w-full cursor-pointer text-sm"
        >
          <option value="">Seçin…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0 flex-1">
        <label className="mb-1.5 block text-[11px] text-zinc-500">Hedef</label>
        <select
          value={dest}
          onChange={(e) => setDest(e.target.value)}
          className="input-modern min-h-[2.75rem] w-full cursor-pointer text-sm"
        >
          <option value="reserve">Yedek havuzu</option>
          {teams.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name} ({t.players.length}/{teamSize})
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={() => {
          if (!playerId) return;
          const d = dest === 'reserve' ? 'reserve' : Number(dest);
          onMove(playerId, d);
          setPlayerId('');
        }}
        className="min-h-[2.75rem] rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25"
      >
        Taşı
      </button>
    </div>
  );
}

function cell(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function ratingClass(r: number): string {
  if (r >= 80) return 'text-emerald-400';
  if (r >= 65) return 'text-yellow-400';
  return 'text-orange-400';
}

function teamVeteranCount(players: Player[]): number {
  return players.reduce((acc, p) => acc + (isVeteranPlayer(p) ? 1 : 0), 0);
}

function teamAvgAge(players: Player[]): number | null {
  let sum = 0;
  let c = 0;
  for (const p of players) {
    const age = playerAgeYears(p);
    if (age != null) {
      sum += age;
      c++;
    }
  }
  if (c === 0) return null;
  return Math.round((sum / c) * 10) / 10;
}

function TeamPlayerDetail({ player, index }: { player: Player; index: number }) {
  const ex = player.excel;
  return (
    <li className="rounded-lg border border-white/5 bg-white/[0.03] p-2.5 transition-colors hover:bg-white/[0.06]">
      <div className="flex gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-medium tabular-nums text-zinc-400">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              {player.gender === 'male' ? (
                <MaleIcon className="h-3 w-3 shrink-0 text-zinc-500" strokeWidth={1.5} />
              ) : (
                <FemaleIcon className="h-3 w-3 shrink-0 text-zinc-500" strokeWidth={1.5} />
              )}
              <span className="truncate text-xs font-medium text-zinc-100" title={player.name}>
                {player.name}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className={`text-[10px] font-semibold tabular-nums ${ratingClass(player.rating)}`}>
                {player.rating}
              </span>
              {player.is_favorite && (
                <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" strokeWidth={1.5} />
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5">
              {positionLabels[player.position]}
            </span>
            {isVeteranPlayer(player) && (
              <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-amber-400/90">
                Veteran
              </span>
            )}
            {ex?.mevkiRaw && (
              <span className="rounded border border-emerald-500/15 bg-emerald-500/5 px-1.5 py-0.5 text-emerald-400/90">
                {ex.mevkiRaw}
              </span>
            )}
          </div>
          {ex ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-snug">
              <dt className="text-zinc-600">Kat. no</dt>
              <dd className="truncate text-zinc-400 tabular-nums">{cell(ex.participantNo)}</dd>
              <dt className="text-zinc-600">Lokasyon</dt>
              <dd className="truncate text-zinc-400" title={ex.lokasyon}>
                {cell(ex.lokasyon)}
              </dd>
              <dt className="text-zinc-600">Statü</dt>
              <dd className="truncate text-zinc-400" title={ex.statu}>
                {cell(ex.statu)}
              </dd>
              <dt className="text-zinc-600">Boy / kilo</dt>
              <dd className="text-zinc-400 tabular-nums">
                {ex.boyCm != null || ex.kiloKg != null
                  ? `${ex.boyCm != null ? `${ex.boyCm} cm` : '—'} · ${ex.kiloKg != null ? `${ex.kiloKg} kg` : '—'}`
                  : '—'}
              </dd>
              <dt className="text-zinc-600">Doğum</dt>
              <dd className="truncate text-zinc-400">{cell(ex.dogumTarihi)}</dd>
              <dt className="text-zinc-600">Ayak</dt>
              <dd className="text-zinc-400">{cell(ex.baskinAyak)}</dd>
              {ex.email ? (
                <>
                  <dt className="text-zinc-600">E-posta</dt>
                  <dd className="truncate text-zinc-400" title={ex.email}>
                    {ex.email}
                  </dd>
                </>
              ) : null}
            </dl>
          ) : (
            <p className="text-[10px] text-zinc-600">Ek detay yok</p>
          )}
        </div>
      </div>
    </li>
  );
}

function ReservePlayerDetail({ player }: { player: Player }) {
  const ex = player.excel;
  return (
    <div className="rounded-lg border border-white/5 bg-white/5 p-3 transition-colors hover:bg-white/10">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {player.gender === 'male' ? (
            <MaleIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
          ) : (
            <FemaleIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" strokeWidth={1.5} />
          )}
          <span className="truncate text-xs font-medium text-zinc-200" title={player.name}>
            {player.name}
          </span>
        </div>
        <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${ratingClass(player.rating)}`}>
          {player.rating}
        </span>
      </div>
      {ex ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-snug">
          <dt className="text-zinc-600">Kat.</dt>
          <dd className="truncate text-zinc-400 tabular-nums">{cell(ex.participantNo)}</dd>
          <dt className="text-zinc-600">Mevki</dt>
          <dd className="text-zinc-400">
            {positionLabels[player.position]}
            {ex.mevkiRaw ? ` · ${ex.mevkiRaw}` : ''}
          </dd>
          <dt className="text-zinc-600">Lokasyon</dt>
          <dd className="truncate text-zinc-400">{cell(ex.lokasyon)}</dd>
          <dt className="text-zinc-600">Statü</dt>
          <dd className="truncate text-zinc-400">{cell(ex.statu)}</dd>
          <dt className="text-zinc-600">Boy / kilo</dt>
          <dd className="text-zinc-400 tabular-nums">
            {ex.boyCm != null || ex.kiloKg != null
              ? `${ex.boyCm != null ? `${ex.boyCm} cm` : '—'} · ${ex.kiloKg != null ? `${ex.kiloKg} kg` : '—'}`
              : '—'}
          </dd>
        </dl>
      ) : (
        <p className="text-[10px] text-zinc-600">Ek detay yok</p>
      )}
    </div>
  );
}

export default function TeamsPage({ players }: TeamsPageProps) {
  const navigate = useNavigate();
  const { selectedSport } = useSport();

  const pool = useMemo(
    () => players.filter((p) => p.sport === selectedSport),
    [players, selectedSport]
  );

  const [category, setCategory] = useState<Category>('mixed');
  const [columnFilters, setColumnFilters] = useState<TeamColumnFiltersState>(() =>
    emptyTeamColumnFilters()
  );
  const [teamSize, setTeamSize] = useState<number>(() => defaultTeamSizeForSport('Futbol'));
  const [desiredTeamCount, setDesiredTeamCount] = useState(13);
  const [teams, setTeams] = useState<Team[]>([]);
  const [reserves, setReserves] = useState<Player[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [showColumnFilters, setShowColumnFilters] = useState(true);
  const [balanceMode, setBalanceMode] = useState<BalanceMode>('tournament');
  const [editingTeamId, setEditingTeamId] = useState<number | null>(null);
  const [tempTeamName, setTempTeamName] = useState('');

  useEffect(() => {
    const cap = maxTeamsForSport(selectedSport);
    const s = loadSquad(selectedSport);
    if (s && (s.teams.length > 0 || s.reserves.length > 0)) {
      setTeams(s.teams);
      setReserves(s.reserves);
      setTeamSize(s.teamSize);
      setDesiredTeamCount(s.desiredTeamCount);
    } else {
      setTeamSize(defaultTeamSizeForSport(selectedSport));
      setDesiredTeamCount(cap != null ? cap : 6);
      setTeams([]);
      setReserves([]);
    }
  }, [selectedSport]);

  useEffect(() => {
    if (teams.length === 0 && reserves.length === 0) return;
    saveSquad({
      sport: selectedSport,
      teamSize,
      desiredTeamCount,
      teams,
      reserves,
    });
  }, [teams, reserves, teamSize, desiredTeamCount, selectedSport]);

  const uniqueLokasyon = useMemo(
    () => uniqSorted(pool.map((p) => p.excel?.lokasyon)),
    [pool]
  );
  const uniqueStatu = useMemo(
    () => uniqSorted(pool.map((p) => p.excel?.statu)),
    [pool]
  );
  const uniqueMevki = useMemo(
    () => uniqSorted(pool.map((p) => p.excel?.mevkiRaw)),
    [pool]
  );
  const uniqueAyak = useMemo(
    () => uniqSorted(pool.map((p) => p.excel?.baskinAyak)),
    [pool]
  );

  const clearTeams = useCallback(() => {
    setTeams([]);
    setReserves([]);
  }, []);

  const getFilteredPlayers = useCallback(() => {
    return pool.filter((p) => playerPassesTeamColumnFilters(p, category, columnFilters));
  }, [pool, category, columnFilters]);

  const filteredPlayers = getFilteredPlayers();

  const hasActiveColumnFilters = useMemo(() => {
    const f = columnFilters;
    return (
      f.lokasyon.length > 0 ||
      f.statu.length > 0 ||
      f.mevkiRaw.length > 0 ||
      f.ayak.length > 0 ||
      f.positions.length > 0 ||
      f.ratingMin != null ||
      f.ratingMax != null
    );
  }, [columnFilters]);

  const resetColumnFilters = () => {
    setColumnFilters(emptyTeamColumnFilters());
    clearTeams();
  };

  const toggleStringFilter = (
    key: 'lokasyon' | 'statu' | 'mevkiRaw' | 'ayak',
    value: string
  ) => {
    setColumnFilters((prev) => {
      const arr = [...prev[key]];
      const i = arr.indexOf(value);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(value);
      return { ...prev, [key]: arr };
    });
    clearTeams();
  };

  const togglePositionFilter = (pos: Position) => {
    setColumnFilters((prev) => {
      const arr = [...prev.positions];
      const i = arr.indexOf(pos);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(pos);
      return { ...prev, positions: arr };
    });
    clearTeams();
  };

  const maxTeamsCap = maxTeamsForSport(selectedSport);

  const effectiveTeamCount = Math.max(
    1,
    Math.min(desiredTeamCount, maxTeamsCap ?? 999)
  );

  const generateTeamsHandler = () => {
    const result = generateBalancedTeams(filteredPlayers, teamSize, balanceMode, {
      maxTeams: maxTeamsCap,
      sport: selectedSport,
      teamCount: effectiveTeamCount,
    });
    setTeams(result.teams);
    setReserves(result.reserves);
  };

  const movePlayerBetweenTeams = (playerId: string, dest: 'reserve' | number) => {
    const next = tryMovePlayer(teams, reserves, playerId, dest, teamSize);
    if (!next) {
      window.alert('Takım bu kadro sınırına ulaştı veya oyuncu bulunamadı.');
      return;
    }
    setTeams(next.teams);
    setReserves(next.reserves);
  };

  const goLeague = () => {
    if (teams.length === 0) return;
    navigate('/league');
  };

  const resetSavedSquad = () => {
    if (!window.confirm('Bu branştaki kayıtlı kadro silinsin mi? (Lig maç sonuçları ayrı; Lig sayfasından sıfırlanır.)')) {
      return;
    }
    clearSquad(selectedSport);
    const cap = maxTeamsForSport(selectedSport);
    setTeamSize(defaultTeamSizeForSport(selectedSport));
    setDesiredTeamCount(cap != null ? cap : 6);
    setTeams([]);
    setReserves([]);
  };

  const handleTeamNameEdit = (teamId: number, currentName: string) => {
    setEditingTeamId(teamId);
    setTempTeamName(currentName);
  };

  const saveTeamName = (teamId: number) => {
    setTeams(prev => prev.map(team =>
      team.id === teamId ? { ...team, name: tempTeamName || team.name } : team
    ));
    setEditingTeamId(null);
    setTempTeamName('');
  };

  const handleExportPDF = async () => {
    try {
      await exportTeamsToPDF(teams, reserves, `MAB ${selectedSport} — Takımlar`);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'PDF oluşturulamadı.');
    }
  };

  const getCategoryStats = () => {
    const filtered = getFilteredPlayers();
    const maleCount = filtered.filter((p) => p.gender === 'male').length;
    const femaleCount = filtered.filter((p) => p.gender === 'female').length;
    const veteranCount = filtered.filter((p) => isVeteranPlayer(p)).length;
    const avgRating =
      filtered.length > 0
        ? Math.round(filtered.reduce((sum, p) => sum + p.rating, 0) / filtered.length)
        : 0;
    return { total: filtered.length, maleCount, femaleCount, veteranCount, avgRating };
  };

  const stats = getCategoryStats();
  const slotCapsPreview = getTeamSlotCaps(stats.total, effectiveTeamCount, teamSize);
  const playersPlannedInTeams = slotCapsPreview.reduce((a, b) => a + b, 0);
  const benchPlayersPreview = stats.total - playersPlannedInTeams;

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-b mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 animate-fadeIn sm:mb-12">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl md:text-4xl">
            Takım oluşturucu
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-zinc-400">
            Üst menüden branş seçin. Kadro oluşturduktan sonra tarayıcıda saklanır; sayfayı yenilesen de
            takımların kalır. İsimleri karttan düzenleyebilir, transferle oynatırsın. Lig’e geçince puan
            tablosu bu kadroya göre çalışır.
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-400/90">
            Seçili branş: {selectedSport}
            {maxTeamsCap != null && (
              <span className="text-zinc-500"> · Bu branşta en fazla {maxTeamsCap} takım</span>
            )}
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            Mercedes turnuva dengesi
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            <strong className="text-zinc-300">1986 ve öncesi doğumlular veteran</strong>, diğerleri genç
            sayılır. Takımlarda veteran / genç, cinsiyet, boy, kilo, baskın ayak, yaş ortalaması, statü
            (beyaz/mavi yaka tahmini), mevki ve puanlama (geçen sezon başarısı) mümkün olduğunca eşit
            dağıtılır. <strong className="text-zinc-300">Futbol:</strong> formda kaleci olanlar önce takımlara
            ayrılır (takım başına 1 kaleci); 13 takım × 14 kişi üst sınırı; kadro eksik olabilir. Ligde ilk 4 çeyrek
            final.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <div className="mb-4 flex items-center space-x-2">
              <h3 className="text-sm font-medium text-zinc-300">Kategori</h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'mixed' as Category, label: 'Karışık' },
                { value: 'male' as Category, label: 'Erkekler' },
                { value: 'female' as Category, label: 'Kadınlar' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => {
                    setCategory(cat.value);
                    setTeams([]);
                    setReserves([]);
                  }}
                  className={`touch-target rounded-lg px-2 py-2.5 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                    category === cat.value
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-panel rounded-2xl">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-6">
              <button
                type="button"
                onClick={() => setShowColumnFilters(!showColumnFilters)}
                className="flex min-w-0 flex-1 items-start gap-2 text-left"
              >
                <Columns3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/80" strokeWidth={1.5} />
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-zinc-300">Kadro tablosu — sütun filtreleri</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                    Oyuncu listesindeki sütunlara göre havuzu daraltın; seçim yoksa tüm kadro kullanılır.
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/5 pt-3 sm:border-t-0 sm:pt-0">
                {hasActiveColumnFilters && (
                  <button
                    type="button"
                    onClick={resetColumnFilters}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-zinc-400 hover:text-white hover:bg-white/10"
                  >
                    <X className="w-3 h-3" strokeWidth={2} />
                    Sıfırla
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowColumnFilters(!showColumnFilters)}
                  className="p-1 rounded-md text-zinc-400 hover:bg-white/10 hover:text-white"
                  aria-label={showColumnFilters ? 'Daralt' : 'Genişlet'}
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showColumnFilters ? 'rotate-180' : ''}`}
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            </div>

            {showColumnFilters && (
              <div className="space-y-5 border-t border-white/5 px-4 pb-6 pt-5 animate-fadeIn sm:px-6">
                {[
                  {
                    label: 'Lokasyon',
                    key: 'lokasyon' as const,
                    items: uniqueLokasyon,
                  },
                  {
                    label: 'Statü',
                    key: 'statu' as const,
                    items: uniqueStatu,
                  },
                  {
                    label: 'Mevki (form)',
                    key: 'mevkiRaw' as const,
                    items: uniqueMevki,
                  },
                  {
                    label: 'Baskın ayak',
                    key: 'ayak' as const,
                    items: uniqueAyak,
                  },
                ].map(({ label, key, items }) => (
                  <div key={key}>
                    <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
                      {label}
                    </div>
                    {items.length === 0 ? (
                      <p className="text-xs text-zinc-600">Bu alanda veri yok</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                        {items.map((val) => {
                          const selected = columnFilters[key].includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => toggleStringFilter(key, val)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                selected
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                                  : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                <div>
                  <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
                    Pozisyon (uygulama)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allPositions.map((pos) => {
                      const selected = columnFilters.positions.includes(pos);
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => togglePositionFilter(pos)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            selected
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                              : 'bg-white/5 text-zinc-400 border-white/10 hover:border-white/20'
                          }`}
                        >
                          {positionLabels[pos]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide mb-2">
                    Rating aralığı
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Min"
                        inputMode="numeric"
                        value={columnFilters.ratingMin ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setColumnFilters((prev) => ({
                            ...prev,
                            ratingMin:
                              v === '' ? null : Math.min(100, Math.max(1, Number.parseInt(v, 10) || 1)),
                          }));
                          clearTeams();
                        }}
                        className="min-h-[2.75rem] w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-800/80 px-3 py-2 text-sm text-white tabular-nums placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none sm:w-24 sm:flex-none"
                      />
                      <span className="text-zinc-600">—</span>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        placeholder="Max"
                        inputMode="numeric"
                        value={columnFilters.ratingMax ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          setColumnFilters((prev) => ({
                            ...prev,
                            ratingMax:
                              v === '' ? null : Math.min(100, Math.max(1, Number.parseInt(v, 10) || 1)),
                          }));
                          clearTeams();
                        }}
                        className="min-h-[2.75rem] w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-800/80 px-3 py-2 text-sm text-white tabular-nums placeholder:text-zinc-600 focus:border-emerald-500/40 focus:outline-none sm:w-24 sm:flex-none"
                      />
                    </div>
                    <span className="text-[11px] leading-snug text-zinc-500 sm:max-w-[12rem]">
                      Boş bırakınca alt/üst sınır yok
                    </span>
                  </div>
                </div>

                {hasActiveColumnFilters && (
                  <p className="text-[11px] text-emerald-500/80">
                    Filtre sonrası havuz: <span className="font-semibold text-emerald-400">{filteredPlayers.length}</span>{' '}
                    oyuncu — “Takımları Oluştur” buna göre çalışır.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-zinc-300">Takım büyüklüğü</h3>
              <span className="text-2xl font-semibold tabular-nums text-white">{teamSize}</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              value={teamSize}
              onChange={(e) => {
                setTeamSize(parseInt(e.target.value, 10));
                setTeams([]);
                setReserves([]);
              }}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 mt-2 tabular-nums">
              <span>2</span>
              <span>11</span>
              <span>20</span>
            </div>

            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <label className="mb-2 block text-[11px] font-medium text-zinc-500">
                Kaç takım oluşturulsun?
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={maxTeamsCap ?? 30}
                  inputMode="numeric"
                  value={desiredTeamCount}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isFinite(v)) return;
                    const hi = maxTeamsCap ?? 30;
                    setDesiredTeamCount(Math.min(hi, Math.max(1, v)));
                    setTeams([]);
                    setReserves([]);
                  }}
                  className="min-h-[2.75rem] w-24 rounded-xl border border-white/10 bg-zinc-800/80 px-3 py-2 text-sm text-white tabular-nums focus:border-emerald-500/40 focus:outline-none"
                />
                <span className="text-[11px] text-zinc-500">
                  {maxTeamsCap != null
                    ? `Branş üst sınırı: ${maxTeamsCap} takım`
                    : 'İstediğiniz takım sayısı (kadro eksik kalabilir)'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2 rounded-lg bg-white/5 p-3">
              <p className="text-[11px] font-medium text-zinc-500">Dağıtım modu</p>
              <div className="flex flex-col gap-2">
                {(
                  [
                    {
                      id: 'tournament' as const,
                      label: 'Turnuva dengesi',
                      desc: 'Veteran, yaş, boy, kilo, ayak, yaka, cinsiyet, mevki; rating ortalamaları da birbirine yakın tutulur',
                    },
                    {
                      id: 'rating' as const,
                      label: 'Sadece puan',
                      desc: 'Takım rating ortalamalarını havuz ortalamasına yaklaştırır (kadro sayıları farklıysa oransal)',
                    },
                    { id: 'shuffle' as const, label: 'Rastgele', desc: 'Karışık sıra' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      balanceMode === opt.id
                        ? 'border-emerald-500/35 bg-emerald-500/10'
                        : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <input
                      type="radio"
                      name="balanceMode"
                      checked={balanceMode === opt.id}
                      onChange={() => setBalanceMode(opt.id)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span>
                      <span className="block text-xs font-medium text-zinc-200">{opt.label}</span>
                      <span className="block text-[11px] text-zinc-500">{opt.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="surface-panel rounded-2xl">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="flex w-full touch-target items-center justify-between px-4 py-4 sm:p-6"
            >
              <h3 className="text-sm font-medium text-zinc-300">İstatistikler</h3>
              <ChevronDown
                className={`w-4 h-4 text-zinc-400 transition-transform ${
                  showPreview ? 'rotate-180' : ''
                }`}
                strokeWidth={1.5}
              />
            </button>

            {showPreview && (
              <div className="space-y-3 px-4 pb-6 animate-fadeIn sm:px-6">
                <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="mb-1 text-[10px] text-zinc-500">Toplam</div>
                    <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{stats.total}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="mb-1 text-[10px] text-zinc-500">Erkek</div>
                    <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{stats.maleCount}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="mb-1 text-[10px] text-zinc-500">Kadın</div>
                    <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{stats.femaleCount}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="mb-1 text-[10px] text-zinc-500">Veteran (≤1986)</div>
                    <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{stats.veteranCount}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                    <div className="mb-1 text-[10px] text-zinc-500">Ort. Rating</div>
                    <div className="text-xl font-semibold tabular-nums text-white sm:text-2xl">{stats.avgRating}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="mb-1 text-[10px] text-zinc-400">Hedef takım sayısı</p>
                      <p className="text-2xl font-semibold tabular-nums text-emerald-400 sm:text-3xl">
                        {effectiveTeamCount}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-500">Takıma dağıtılacak</p>
                      <p className="text-xl font-semibold tabular-nums text-white sm:text-2xl">
                        {playersPlannedInTeams}
                      </p>
                    </div>
                    {benchPlayersPreview > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-zinc-500">Yedek havuz</p>
                        <p className="text-xl font-semibold tabular-nums text-zinc-400 sm:text-2xl">
                          {benchPlayersPreview}
                        </p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-zinc-500">
                    Kadro başına en fazla {teamSize} kişi; toplam kapasite {effectiveTeamCount * teamSize}.
                    Oyuncu azsa takımlar eksik kalır, fazlaysa yedekte kalır.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={generateTeamsHandler}
              className="btn-primary w-full min-h-[3rem] py-3.5 text-sm shadow-emerald-500/20 sm:flex-1 sm:text-base"
            >
              <Shuffle className="h-4 w-4" strokeWidth={1.5} />
              <span>Takımları oluştur</span>
            </button>
            {(teams.length > 0 || reserves.length > 0) && (
              <button
                type="button"
                onClick={resetSavedSquad}
                className="min-h-[3rem] w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-400 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 sm:w-auto sm:shrink-0"
              >
                Kadroyu sıfırla
              </button>
            )}
          </div>
          {(teams.length > 0 || reserves.length > 0) && (
            <p className="text-center text-[11px] text-emerald-500/80 sm:text-left">
              Bu branş için kadro kayıtlı — isim değişiklikleri ve transferler otomatik saklanır.
            </p>
          )}
        </div>

        {teams.length > 0 && (
          <div className="space-y-6 animate-fadeIn">
            <div className="surface-panel rounded-2xl p-4 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-emerald-500/80" strokeWidth={1.5} />
                <h3 className="text-sm font-medium text-zinc-200">Takımlar arası transfer</h3>
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">
                Oyuncuyu başka takıma veya yedek havuzuna taşıyın. Hedef takımda en fazla {teamSize} kişi olabilir.
              </p>
              <TransferBar
                teams={teams}
                reserves={reserves}
                teamSize={teamSize}
                onMove={movePlayerBetweenTeams}
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                  Takımlar
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {teams.length} takım · {teams.reduce((acc, team) => acc + team.players.length, 0)} oyuncu
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                  type="button"
                  onClick={goLeague}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-200 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/15 sm:w-auto"
                >
                  <LayoutGrid className="h-4 w-4" strokeWidth={1.5} />
                  Lige aktar
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-200 sm:w-auto"
                >
                  <Download className="h-4 w-4" strokeWidth={1.5} />
                  PDF indir
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="group surface-card rounded-xl p-4 transition-all duration-300 hover:border-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/10 sm:p-5"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    {editingTeamId === team.id ? (
                      <input
                        type="text"
                        value={tempTeamName}
                        onChange={(e) => setTempTeamName(e.target.value)}
                        onBlur={() => saveTeamName(team.id)}
                        onKeyPress={(e) => e.key === 'Enter' && saveTeamName(team.id)}
                        className="flex-1 bg-zinc-800 border border-emerald-500/50 rounded px-2 py-1 text-sm text-white font-medium focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-base font-semibold text-white flex items-center space-x-2">
                        <span>{team.name}</span>
                        <button
                          type="button"
                          onClick={() => handleTeamNameEdit(team.id, team.name)}
                          className="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Edit2 className="w-3 h-3 text-zinc-400 hover:text-white" strokeWidth={1.5} />
                        </button>
                      </h3>
                    )}
                    <div className="text-xs font-medium text-zinc-400 tabular-nums">
                      {team.players.length}
                    </div>
                  </div>

                  <div className="mb-3 flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
                    <span className="text-xs text-zinc-400">Rating</span>
                    <span className={`text-sm font-semibold tabular-nums ${ratingClass(calculateTeamRating(team.players))}`}>
                      {calculateTeamRating(team.players)}
                    </span>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-xs text-zinc-400">Ort. yaş</span>
                      <span className="text-xs font-semibold tabular-nums text-zinc-200">
                        {teamAvgAge(team.players) ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                      <span className="text-xs text-zinc-400">Veteran</span>
                      <span className="text-xs font-semibold tabular-nums text-amber-300">
                        {teamVeteranCount(team.players)}
                      </span>
                    </div>
                  </div>

                  <ul className="max-h-[min(70vh,28rem)] space-y-2 overflow-y-auto pr-0.5">
                    {team.players.map((member, memberIdx) => (
                      <TeamPlayerDetail key={member.id} player={member} index={memberIdx} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {reserves.length > 0 && (
              <div className="surface-card rounded-xl p-4 sm:p-6">
                <h3 className="mb-4 flex items-center space-x-2 text-base font-semibold text-white">
                  <span>Yedek Oyuncular</span>
                  <span className="text-xs text-zinc-500 tabular-nums">({reserves.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {reserves.map((player) => (
                    <ReservePlayerDetail key={player.id} player={player} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
