import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ChevronLeft,
  MapPin,
  Briefcase,
  Users,
  Star,
  Calendar,
  Shield,
  Footprints,
  Shirt,
} from 'lucide-react';
import type { Player, Position, Team } from '../types/player';
import { useSport } from '../context/SportContext';
import { loadSquad } from '../utils/squadStorage';
import {
  footKindFromAyak,
  inferCollarType,
  isVeteranPlayer,
  playerAgeYears,
} from '../utils/playerDerivedStats';

function labelOrDash(v: string | undefined): string {
  const t = (v ?? '').trim();
  return t === '' ? '—' : t;
}

function countByField(players: Player[], field: 'lokasyon' | 'statu'): { label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of players) {
    const raw = field === 'lokasyon' ? p.excel?.lokasyon : p.excel?.statu;
    const k = labelOrDash(raw);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr'));
}

const POS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
const POS_LABEL: Record<Position, string> = {
  GK: 'K',
  DEF: 'D',
  MID: 'O',
  FWD: 'F',
};

interface TeamMetrics {
  n: number;
  avgRating: number;
  avgAge: number | null;
  male: number;
  female: number;
  veterans: number;
  pos: Record<Position, number>;
  foot: { left: number; right: number; both: number; unknown: number };
  collar: { white: number; blue: number; unknown: number };
}

function computeTeamMetrics(players: Player[]): TeamMetrics {
  const n = players.length;
  let sumR = 0;
  let sumAge = 0;
  let ageC = 0;
  const pos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const foot = { left: 0, right: 0, both: 0, unknown: 0 };
  const collar = { white: 0, blue: 0, unknown: 0 };
  let male = 0;
  let female = 0;
  let veterans = 0;

  for (const p of players) {
    sumR += p.rating;
    pos[p.position]++;
    if (p.gender === 'male') male++;
    else female++;
    if (isVeteranPlayer(p)) veterans++;
    const age = playerAgeYears(p);
    if (age != null) {
      sumAge += age;
      ageC++;
    }
    const fk = footKindFromAyak(p.excel?.baskinAyak ?? '');
    if (fk === 'left') foot.left++;
    else if (fk === 'right') foot.right++;
    else if (fk === 'both') foot.both++;
    else foot.unknown++;
    const c = inferCollarType(p.excel?.statu ?? '');
    if (c === 'white') collar.white++;
    else if (c === 'blue') collar.blue++;
    else collar.unknown++;
  }

  return {
    n,
    avgRating: n > 0 ? Math.round(sumR / n) : 0,
    avgAge: ageC > 0 ? Math.round((sumAge / ageC) * 10) / 10 : null,
    male,
    female,
    veterans,
    pos,
    foot,
    collar,
  };
}

export default function ReportsPage() {
  const { selectedSport } = useSport();
  const [teams, setTeams] = useState<Team[]>([]);
  const [reserves, setReserves] = useState<Player[]>([]);
  const [teamSize, setTeamSize] = useState(0);

  const refresh = useCallback(() => {
    const s = loadSquad(selectedSport);
    if (s) {
      setTeams(s.teams);
      setReserves(s.reserves ?? []);
      setTeamSize(s.teamSize);
    } else {
      setTeams([]);
      setReserves([]);
      setTeamSize(0);
    }
  }, [selectedSport]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener('mba-squad-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('mba-squad-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const hasTeams = teams.length > 0;

  const allInTeams = useMemo(() => teams.flatMap((t) => t.players), [teams]);

  const leagueSummary = useMemo(() => {
    const onField = allInTeams.length;
    const bench = reserves.length;
    const total = onField + bench;
    const m = computeTeamMetrics(allInTeams);
    const ratings = allInTeams.map((p) => p.rating);
    const minR = ratings.length ? Math.min(...ratings) : 0;
    const maxR = ratings.length ? Math.max(...ratings) : 0;
    return { onField, bench, total, avgRating: m.avgRating, avgAge: m.avgAge, minR, maxR };
  }, [allInTeams, reserves.length]);

  const reserveLok = useMemo(() => countByField(reserves, 'lokasyon'), [reserves]);
  const reserveStatu = useMemo(() => countByField(reserves, 'statu'), [reserves]);
  const reserveMetrics = useMemo(() => computeTeamMetrics(reserves), [reserves]);

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-b mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 animate-fadeIn sm:mb-10">
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-emerald-400"
          >
            <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Takımlar
          </Link>
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
              <ClipboardList className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Takım raporları
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">
                Lokasyon, statü, mevki, yaş, rating, cinsiyet, veteran, ayak ve yaka (tahmini) dağılımları.
                Kadro Takımlar sayfasıyla senkron.
              </p>
              <p className="mt-2 text-xs font-medium text-emerald-400/90">Branş: {selectedSport}</p>
            </div>
          </div>
        </div>

        {!hasTeams && (
          <div className="surface-panel rounded-2xl p-8 text-center">
            <p className="text-sm text-zinc-400">
              Bu branş için henüz takım oluşturulmamış. Önce{' '}
              <Link to="/" className="font-medium text-emerald-400 underline-offset-2 hover:underline">
                Takımlar
              </Link>{' '}
              sayfasında kadro üret; ardından burada raporları görebilirsin.
            </p>
          </div>
        )}

        {hasTeams && (
          <div className="space-y-6">
            <section className="surface-panel rounded-2xl border border-white/10 p-4 sm:p-6">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Lig özeti</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Takım</div>
                  <div className="text-xl font-semibold tabular-nums text-white">{teams.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Sahada</div>
                  <div className="text-xl font-semibold tabular-nums text-emerald-300">{leagueSummary.onField}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Yedek</div>
                  <div className="text-xl font-semibold tabular-nums text-amber-300/90">{leagueSummary.bench}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Ort. rating</div>
                  <div className="text-xl font-semibold tabular-nums text-white">{leagueSummary.avgRating}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Ort. yaş</div>
                  <div className="text-xl font-semibold tabular-nums text-white">
                    {leagueSummary.avgAge ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] text-zinc-500">Rating aralığı</div>
                  <div className="text-sm font-semibold tabular-nums text-zinc-200">
                    {allInTeams.length ? `${leagueSummary.minR} – ${leagueSummary.maxR}` : '—'}
                  </div>
                </div>
              </div>
            </section>

            <section className="surface-panel overflow-hidden rounded-2xl border border-white/10">
              <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-6">
                <h2 className="text-sm font-semibold text-zinc-200">Takımlar — hızlı karşılaştırma</h2>
                <p className="mt-0.5 text-[11px] text-zinc-500">Kaydırarak tüm sütunları görebilirsin.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      <th className="sticky left-0 z-10 bg-zinc-900/95 px-3 py-2 backdrop-blur-sm">Takım</th>
                      <th className="px-2 py-2 text-right tabular-nums">Kişi</th>
                      <th className="px-2 py-2 text-right tabular-nums">Ort.R</th>
                      <th className="px-2 py-2 text-right tabular-nums">Ort. yaş</th>
                      <th className="px-2 py-2 text-right tabular-nums">E</th>
                      <th className="px-2 py-2 text-right tabular-nums">K</th>
                      <th className="px-2 py-2 text-right tabular-nums">Vet</th>
                      {POS.map((p) => (
                        <th key={p} className="px-1.5 py-2 text-center tabular-nums">
                          {POS_LABEL[p]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team) => {
                      const tm = computeTeamMetrics(team.players);
                      return (
                        <tr key={team.id} className="border-b border-white/5 last:border-0">
                          <td className="sticky left-0 z-10 max-w-[10rem] truncate border-r border-white/5 bg-zinc-900/90 px-3 py-2 font-medium text-zinc-100 backdrop-blur-sm">
                            {team.name}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-300">{tm.n}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-200">{tm.avgRating}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-300">
                            {tm.avgAge ?? '—'}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{tm.male}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{tm.female}</td>
                          <td className="px-2 py-2 text-right tabular-nums text-amber-400/90">{tm.veterans}</td>
                          {POS.map((p) => (
                            <td key={p} className="px-1.5 py-2 text-center tabular-nums text-zinc-300">
                              {tm.pos[p]}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {teams.map((team) => {
              const lok = countByField(team.players, 'lokasyon');
              const st = countByField(team.players, 'statu');
              const tm = computeTeamMetrics(team.players);
              return (
                <section
                  key={team.id}
                  className="surface-panel overflow-hidden rounded-2xl border border-white/10"
                >
                  <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-6 sm:py-4">
                    <h2 className="text-base font-semibold text-white sm:text-lg">{team.name}</h2>
                    <p className="mt-0.5 text-[11px] text-zinc-500 tabular-nums">
                      {team.players.length} oyuncu
                      {teamSize > 0 ? ` · kadro üst sınırı ${teamSize}` : ''}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300">
                        <Star className="h-3 w-3 text-yellow-500/80" strokeWidth={1.5} />
                        Ort. rating <strong className="tabular-nums text-white">{tm.avgRating}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300">
                        <Calendar className="h-3 w-3 text-sky-400/80" strokeWidth={1.5} />
                        Ort. yaş{' '}
                        <strong className="tabular-nums text-white">{tm.avgAge ?? '—'}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300">
                        <Users className="h-3 w-3 text-zinc-400" strokeWidth={1.5} />
                        E {tm.male} · K {tm.female}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200/95">
                        Veteran {tm.veterans}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="h-3 w-3 shrink-0 text-emerald-500/70" strokeWidth={1.5} />
                        Mevki:{' '}
                        {POS.map((p, i) => (
                          <span key={p}>
                            {POS_LABEL[p]}
                            {tm.pos[p]}
                            {i < POS.length - 1 ? ' · ' : ''}
                          </span>
                        ))}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                      <span className="inline-flex items-center gap-1">
                        <Footprints className="h-3 w-3 shrink-0 text-violet-400/80" strokeWidth={1.5} />
                        Ayak: Sol {tm.foot.left} · Sağ {tm.foot.right} · İki {tm.foot.both} · Bilinmiyor{' '}
                        {tm.foot.unknown}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Shirt className="h-3 w-3 shrink-0 text-cyan-400/70" strokeWidth={1.5} />
                        Yaka (tahmin): Beyaz {tm.collar.white} · Mavi {tm.collar.blue} · Diğer{' '}
                        {tm.collar.unknown}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
                    <div>
                      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <MapPin className="h-3.5 w-3.5 text-emerald-500/80" strokeWidth={1.5} />
                        Lokasyon
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/10">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              <th className="px-3 py-2">Lokasyon</th>
                              <th className="w-16 px-3 py-2 text-right tabular-nums">Adet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lok.map((row) => (
                              <tr key={row.label} className="border-b border-white/5 last:border-0">
                                <td className="px-3 py-2 text-zinc-200">{row.label}</td>
                                <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">
                                  {row.count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        <Briefcase className="h-3.5 w-3.5 text-amber-500/80" strokeWidth={1.5} />
                        Statü
                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/10">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                              <th className="px-3 py-2">Statü</th>
                              <th className="w-16 px-3 py-2 text-right tabular-nums">Adet</th>
                            </tr>
                          </thead>
                          <tbody>
                            {st.map((row) => (
                              <tr key={row.label} className="border-b border-white/5 last:border-0">
                                <td className="px-3 py-2 text-zinc-200">{row.label}</td>
                                <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">
                                  {row.count}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}

            {reserves.length > 0 && (
              <section className="surface-panel overflow-hidden rounded-2xl border border-amber-500/15 bg-amber-500/[0.04]">
                <div className="border-b border-amber-500/15 px-4 py-3 sm:px-6 sm:py-4">
                  <h2 className="text-base font-semibold text-amber-200/95">Yedek havuzu</h2>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{reserves.length} oyuncu</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                    <span>
                      Ort. rating <strong className="text-zinc-200">{reserveMetrics.avgRating}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Ort. yaş{' '}
                      <strong className="text-zinc-200">{reserveMetrics.avgAge ?? '—'}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      E {reserveMetrics.male} · K {reserveMetrics.female} · Vet {reserveMetrics.veterans}
                    </span>
                  </div>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:gap-6 sm:p-6">
                  <div>
                    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Lokasyon</div>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                            <th className="px-3 py-2">Lokasyon</th>
                            <th className="w-16 px-3 py-2 text-right tabular-nums">Adet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reserveLok.map((row) => (
                            <tr key={row.label} className="border-b border-white/5 last:border-0">
                              <td className="px-3 py-2 text-zinc-200">{row.label}</td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <div className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">Statü</div>
                    <div className="overflow-hidden rounded-xl border border-white/10">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/[0.04] text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                            <th className="px-3 py-2">Statü</th>
                            <th className="w-16 px-3 py-2 text-right tabular-nums">Adet</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reserveStatu.map((row) => (
                            <tr key={row.label} className="border-b border-white/5 last:border-0">
                              <td className="px-3 py-2 text-zinc-200">{row.label}</td>
                              <td className="px-3 py-2 text-right font-medium tabular-nums text-zinc-100">
                                {row.count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
