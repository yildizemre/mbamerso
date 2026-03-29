import { useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Trophy, ChevronLeft, AlertCircle, Plus, Minus } from 'lucide-react';
import type { Team } from '../types/player';
import { useSport } from '../context/SportContext';
import {
  LEAGUE_RESULTS_KEY,
  loadResults,
  loadLeagueViewSnapshot,
  loadRedCards,
  loadYellowCards,
  matchKey,
  saveRedCards,
  saveResults,
  saveYellowCards,
  allPlayersFromTeams,
  type LeagueSnapshotV1,
  type MatchResult,
} from '../utils/leagueStorage';
import {
  buildRoundRobinFixtures,
  computeStandings,
  leagueSingleRoundMatchCount,
  leagueSingleRoundWeekCount,
  type FixtureRound,
} from '../utils/leagueStandings';
import {
  applySemisToFinal,
  buildBracketFromTopFour,
  isLeagueComplete,
  leagueMatchesProgress,
} from '../utils/playoffBracket';
import { clearPlayoff, loadPlayoff, savePlayoff, type PlayoffBracketMap } from '../utils/playoffStorage';
import KnockoutSection from '../components/KnockoutSection';

export const YELLOW_FOR_SUSPENSION = 4;
/** Futbol: bu kadar kırmızı kart = 1 maç men (en az 1 yeter) */
export const RED_FOR_SUSPENSION = 1;

function teamName(teams: Team[], id: number): string {
  return teams.find((t) => t.id === id)?.name ?? `Takım ${id}`;
}

/** Tek sayıda takımda o hafta maçı olmayan (bay) takım */
function byeTeamIdForRound(round: FixtureRound, allTeamIds: number[]): number | null {
  if (allTeamIds.length % 2 === 0) return null;
  const playing = new Set<number>();
  round.matches.forEach((m) => {
    playing.add(m.a);
    playing.add(m.b);
  });
  return allTeamIds.find((id) => !playing.has(id)) ?? null;
}

export default function LeaguePage() {
  const { selectedSport } = useSport();
  const location = useLocation();
  const [snap, setSnap] = useState<LeagueSnapshotV1 | null>(() =>
    loadLeagueViewSnapshot(selectedSport)
  );
  const [results, setResults] = useState<Record<string, MatchResult>>(() => loadResults());
  const [cards, setCards] = useState<Record<string, number>>(() => loadYellowCards());
  const [redCards, setRedCards] = useState<Record<string, number>>(() => loadRedCards());
  const [playoffBracket, setPlayoffBracket] = useState<PlayoffBracketMap | null>(() =>
    loadPlayoff(selectedSport)
  );

  useEffect(() => {
    setSnap(loadLeagueViewSnapshot(selectedSport));
    setPlayoffBracket(loadPlayoff(selectedSport));
    setCards(loadYellowCards());
    setRedCards(loadRedCards());
  }, [selectedSport, location.pathname]);

  useEffect(() => {
    const refresh = () => {
      setSnap(loadLeagueViewSnapshot(selectedSport));
      setResults(loadResults());
      setCards(loadYellowCards());
      setRedCards(loadRedCards());
      setPlayoffBracket(loadPlayoff(selectedSport));
    };
    window.addEventListener('storage', refresh);
    window.addEventListener('mba-squad-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('mba-squad-updated', refresh);
    };
  }, [selectedSport]);

  const teams = snap?.teams ?? [];

  const teamIdsSorted = useMemo(
    () => [...teams.map((t) => t.id)].sort((a, b) => a - b),
    [teams]
  );

  const fixtureRounds = useMemo(() => buildRoundRobinFixtures(teamIdsSorted), [teamIdsSorted]);

  const totalLeagueMatches = useMemo(
    () => fixtureRounds.reduce((acc, r) => acc + r.matches.length, 0),
    [fixtureRounds]
  );

  const standings = useMemo(() => computeStandings(teams, results), [teams, results]);

  const leagueComplete = useMemo(
    () => isLeagueComplete(results, fixtureRounds),
    [results, fixtureRounds]
  );

  const leagueProg = useMemo(
    () => leagueMatchesProgress(results, fixtureRounds),
    [results, fixtureRounds]
  );

  const top4Key = useMemo(
    () => standings.slice(0, 4).map((s) => s.teamId).join('-'),
    [standings]
  );

  useEffect(() => {
    if (!leagueComplete || teams.length < 4) return;
    const existing = loadPlayoff(selectedSport);
    if (existing) {
      setPlayoffBracket(existing);
      return;
    }
    const top4 = standings.slice(0, 4).map((s) => s.teamId) as [number, number, number, number];
    const b = applySemisToFinal(buildBracketFromTopFour(top4));
    savePlayoff(selectedSport, b);
    setPlayoffBracket(b);
  }, [leagueComplete, selectedSport, teams.length, top4Key]);

  const onBracketChange = useCallback((b: PlayoffBracketMap) => {
    savePlayoff(selectedSport, b);
    setPlayoffBracket(b);
  }, [selectedSport]);

  const setMatchScore = useCallback(
    (lo: number, hi: number, loScore: number, hiScore: number) => {
      const k = matchKey(lo, hi);
      setResults((prev) => {
        const next = { ...prev, [k]: { lo: loScore, hi: hiScore } };
        saveResults(next);
        return next;
      });
    },
    []
  );

  const bumpCard = useCallback((playerId: string, delta: number) => {
    setCards((prev) => {
      const n = Math.max(0, (prev[playerId] ?? 0) + delta);
      const next = { ...prev };
      if (n === 0) delete next[playerId];
      else next[playerId] = n;
      saveYellowCards(next);
      return next;
    });
  }, []);

  const bumpRedCard = useCallback((playerId: string, delta: number) => {
    setRedCards((prev) => {
      const n = Math.max(0, (prev[playerId] ?? 0) + delta);
      const next = { ...prev };
      if (n === 0) delete next[playerId];
      else next[playerId] = n;
      saveRedCards(next);
      return next;
    });
  }, []);

  const clearLeagueData = () => {
    localStorage.removeItem(LEAGUE_RESULTS_KEY);
    clearPlayoff(selectedSport);
    setResults({});
    saveResults({});
    setPlayoffBracket(null);
    setSnap(loadLeagueViewSnapshot(selectedSport));
  };

  const isFutbol = selectedSport === 'Futbol';

  if (!snap || teams.length === 0) {
    return (
      <div className="min-h-screen safe-x safe-b mx-auto max-w-lg px-4 py-16 text-center">
        <Trophy className="mx-auto mb-4 h-12 w-12 text-zinc-600" strokeWidth={1.5} />
        <h1 className="mb-2 text-xl font-semibold text-white">Bu branşta takım yok</h1>
        <p className="mb-6 text-sm text-zinc-500">
          Üst menüde <strong>{selectedSport}</strong> seçili. <strong>Takımlar</strong> sayfasında kadro
          oluşturun — kayıt otomatik tutulur; sayfayı yenilesen de kalır. Lig’e doğrudan geçebilirsin.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Takım oluşturucuya dön
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="safe-x safe-b mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/"
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-emerald-400"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
              Takımlar
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Lig — {snap.sport}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {teams.length} takım · {fixtureRounds.length} hafta · {totalLeagueMatches} maç — tek devre (rövanş yok,
              iç/dış saha ayrımı yok). Tüm branşlarda aynı lig fikstürü. Skorları haftaya göre girin;
              puan tablosu güncellenir.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={clearLeagueData}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400 hover:text-white"
            >
              Maç sonuçlarını sıfırla
            </button>
            <span className="max-w-[14rem] text-right text-[10px] text-zinc-600">
              Takım kadrosu silinmez; puan tablosunu temizler.
            </span>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={1.5} />
            <div className="text-xs leading-relaxed text-zinc-400">
              <p className="font-medium text-amber-200/90">Turnuva kuralları (özet)</p>
              <p className="mt-1">
                Lig usulü: ilk <strong className="text-zinc-200">4</strong> takım çeyrek finale
                yükselir. Diğer takımlar kendi aralarında sıralama / devam maçları oynar.{' '}
                {isFutbol ? (
                  <>
                    <strong className="text-zinc-200">4 sarı kart</strong> veya{' '}
                    <strong className="text-zinc-200">1 kırmızı kart</strong> 1 maç men cezasıdır
                    (oyuncu takipinde).
                  </>
                ) : (
                  <>
                    <strong className="text-zinc-200">{YELLOW_FOR_SUSPENSION} sarı kart</strong> bir maç
                    men cezasıdır (oyuncu takipinde).
                  </>
                )}
              </p>
              <p className="mt-2 border-t border-amber-500/15 pt-2 text-zinc-500">
                <span className="font-medium text-amber-200/80">Fikstür:</span> Her takım diğerleriyle{' '}
                <strong className="text-zinc-300">bir kez</strong> oynar (tek devre, rövanş yok). Hafta
                sayısı: çift takımda <strong className="text-zinc-300">T−1</strong>, tek{' '}
                <strong className="text-zinc-300">T</strong> (ör. 13 takım → 13 hafta, her takım 12 maç +
                1 bay). Toplam maç:{' '}
                <strong className="text-zinc-300">T×(T−1)/2</strong>
                {teams.length >= 2 &&
                  ` — bu branşta ${leagueSingleRoundWeekCount(teams.length)} hafta, ${leagueSingleRoundMatchCount(teams.length)} maç.`}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-panel mb-10 rounded-2xl p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-semibold text-white">Fikstür — skor girişi</h2>
          <p className="mb-6 text-[11px] leading-relaxed text-zinc-500">
            Her hafta birbirini gören eşleşmeler aşağıda (iç/dış saha yok; soldaki skor küçük takım
            numarasına, sağdaki büyüğe aittir). Skorları girdikçe puan durumu güncellenir.
          </p>
          <div className="max-h-[min(80vh,56rem)] space-y-8 overflow-y-auto pr-1">
            {fixtureRounds.map((fr) => {
              const byeId = byeTeamIdForRound(fr, teamIdsSorted);
              return (
                <div key={fr.round}>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2">
                    <h3 className="text-sm font-semibold text-emerald-400/95">{fr.label}</h3>
                    {byeId != null && (
                      <span className="text-[11px] text-zinc-500">
                        Bay: <span className="text-zinc-400">{teamName(teams, byeId)}</span>
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fr.matches.map(({ a, b }) => {
                      const lo = Math.min(a, b);
                      const hi = Math.max(a, b);
                      const k = matchKey(lo, hi);
                      const cur = results[k];
                      return (
                        <MatchRow
                          key={k}
                          lo={lo}
                          hi={hi}
                          nameLo={teamName(teams, lo)}
                          nameHi={teamName(teams, hi)}
                          loScore={cur?.lo ?? ''}
                          hiScore={cur?.hi ?? ''}
                          onSave={(a, b) => setMatchScore(lo, hi, a, b)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <KnockoutSection
          teams={teams}
          standings={standings}
          leagueComplete={leagueComplete}
          leagueDone={leagueProg.done}
          leagueTotal={leagueProg.total}
          bracket={playoffBracket}
          onBracketChange={onBracketChange}
        />

        <div className="mb-10">
          <div className="surface-panel rounded-2xl p-4 sm:p-6">
            <h2 className="mb-4 text-sm font-semibold text-white">Puan durumu</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] uppercase text-zinc-500">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Takım</th>
                    <th className="py-2 pr-2 tabular-nums">O</th>
                    <th className="py-2 pr-2 tabular-nums">G</th>
                    <th className="py-2 pr-2 tabular-nums">B</th>
                    <th className="py-2 pr-2 tabular-nums">M</th>
                    <th className="py-2 pr-2 tabular-nums">A</th>
                    <th className="py-2 pr-2 tabular-nums">Y</th>
                    <th className="py-2 tabular-nums">P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {standings.map((row, idx) => (
                    <tr key={row.teamId} className="text-zinc-300">
                      <td className="py-2 pr-2 tabular-nums text-zinc-500">{idx + 1}</td>
                      <td className="py-2 pr-2 font-medium text-white">{row.name}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.played}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.won}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.drawn}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.lost}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.gf}</td>
                      <td className="py-2 pr-2 tabular-nums">{row.ga}</td>
                      <td className="py-2 font-semibold tabular-nums text-emerald-400">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="surface-panel rounded-2xl p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-semibold text-white">
            {isFutbol ? 'Kart takibi (sarı & kırmızı)' : 'Sarı kart takibi'}
          </h2>
          <p className="mb-4 text-xs text-zinc-500">
            {isFutbol ? (
              <>
                <strong className="text-zinc-400">{YELLOW_FOR_SUSPENSION} sarı kart</strong> = 1 maç
                cezası. <strong className="text-zinc-400">{RED_FOR_SUSPENSION} kırmızı kart</strong> = 1
                maç cezası. Aşağıdan oyuncu bazında artırıp azaltın.
              </>
            ) : (
              <>
                {YELLOW_FOR_SUSPENSION} sarı kart = 1 maç cezası. Aşağıdan oyuncu bazında sayı artırıp
                azaltın.
              </>
            )}
          </p>
          <div className="grid max-h-[min(50vh,24rem)] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {allPlayersFromTeams(teams).map((p) => {
              const y = cards[p.id] ?? 0;
              const r = redCards[p.id] ?? 0;
              const suspendedYellow = y >= YELLOW_FOR_SUSPENSION;
              const suspendedRed = isFutbol && r >= RED_FOR_SUSPENSION;
              const suspended = suspendedYellow || suspendedRed;
              const rowStyle =
                suspended && suspendedRed && !suspendedYellow
                  ? 'border-rose-500/40 bg-rose-500/10'
                  : suspended
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-white/10 bg-white/[0.03]';
              return (
                <div
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border px-3 py-2 text-xs ${rowStyle}`}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-zinc-200" title={p.name}>
                    {p.name}
                  </span>
                  <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                    <div className="flex items-center gap-0.5">
                      <span className="text-[10px] text-amber-500/90">Sarı</span>
                      <button
                        type="button"
                        onClick={() => bumpCard(p.id, -1)}
                        className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                        aria-label="Sarı azalt"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                      <span
                        className={`w-6 text-center tabular-nums font-semibold ${
                          suspendedYellow ? 'text-amber-400' : 'text-zinc-300'
                        }`}
                      >
                        {y}
                      </span>
                      <button
                        type="button"
                        onClick={() => bumpCard(p.id, 1)}
                        className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                        aria-label="Sarı arttır"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                    {isFutbol && (
                      <div className="flex items-center gap-0.5 border-l border-white/10 pl-2">
                        <span className="text-[10px] text-rose-400/90">Kırmızı</span>
                        <button
                          type="button"
                          onClick={() => bumpRedCard(p.id, -1)}
                          className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                          aria-label="Kırmızı azalt"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <span
                          className={`w-6 text-center tabular-nums font-semibold ${
                            suspendedRed ? 'text-rose-400' : 'text-zinc-300'
                          }`}
                        >
                          {r}
                        </span>
                        <button
                          type="button"
                          onClick={() => bumpRedCard(p.id, 1)}
                          className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                          aria-label="Kırmızı arttır"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                    {suspended && (
                      <span className="ml-1 rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-200">
                        Men
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({
  lo,
  hi,
  nameLo,
  nameHi,
  loScore,
  hiScore,
  onSave,
}: {
  lo: number;
  hi: number;
  nameLo: string;
  nameHi: string;
  loScore: number | '';
  hiScore: number | '';
  onSave: (lo: number, hi: number) => void;
}) {
  const [a, setA] = useState(String(loScore === '' ? '' : loScore));
  const [b, setB] = useState(String(hiScore === '' ? '' : hiScore));

  useEffect(() => {
    setA(String(loScore === '' ? '' : loScore));
    setB(String(hiScore === '' ? '' : hiScore));
  }, [loScore, hiScore]);

  const commit = () => {
    const x = parseInt(a, 10);
    const y = parseInt(b, 10);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return;
    onSave(x, y);
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 text-[11px] text-zinc-500">
        #{lo} {nameLo} — #{hi} {nameHi}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={a}
          onChange={(e) => setA(e.target.value)}
          onBlur={commit}
          className="w-14 rounded border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-center text-sm tabular-nums text-white"
        />
        <span className="text-zinc-600">—</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={b}
          onChange={(e) => setB(e.target.value)}
          onBlur={commit}
          className="w-14 rounded border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-center text-sm tabular-nums text-white"
        />
      </div>
    </div>
  );
}
