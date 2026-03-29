import { useCallback, useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { Team } from '../types/player';
import type { StandingRow } from '../utils/leagueStandings';
import {
  applySemisToFinal,
  needsWinnerPick,
  resolveKnockoutWinner,
  type KnockoutMatchData,
  type KnockoutMatchId,
} from '../utils/playoffBracket';
import type { PlayoffBracketMap } from '../utils/playoffStorage';

function teamName(teams: Team[], id: number): string {
  return teams.find((t) => t.id === id)?.name ?? `Takım ${id}`;
}

function KnockoutMatchCard({
  teams,
  label,
  subtitle,
  data,
  onCommit,
  accent,
}: {
  teams: Team[];
  label: string;
  subtitle?: string;
  data: KnockoutMatchData;
  onCommit: (next: KnockoutMatchData) => void;
  accent: 'default' | 'final';
}) {
  const [homeScore, setHomeScore] = useState(String(data.homeScore === '' ? '' : data.homeScore));
  const [awayScore, setAwayScore] = useState(String(data.awayScore === '' ? '' : data.awayScore));
  const [penH, setPenH] = useState(String(data.penHome === '' ? '' : data.penHome));
  const [penA, setPenA] = useState(String(data.penAway === '' ? '' : data.penAway));

  useEffect(() => {
    setHomeScore(String(data.homeScore === '' ? '' : data.homeScore));
    setAwayScore(String(data.awayScore === '' ? '' : data.awayScore));
    setPenH(String(data.penHome === '' ? '' : data.penHome));
    setPenA(String(data.penAway === '' ? '' : data.penAway));
  }, [data]);

  const hi = data.homeId;
  const ai = data.awayId;
  const canEdit = hi != null && ai != null;

  const buildPatch = useCallback((): KnockoutMatchData => {
    const parseN = (s: string): number | '' => {
      if (s.trim() === '') return '';
      const n = parseInt(s, 10);
      return Number.isFinite(n) && n >= 0 ? n : '';
    };
    return {
      ...data,
      homeScore: parseN(homeScore),
      awayScore: parseN(awayScore),
      penHome: parseN(penH),
      penAway: parseN(penA),
    };
  }, [data, homeScore, awayScore, penH, penA]);

  const toDraft = (): KnockoutMatchData => buildPatch();

  const commit = () => {
    if (!canEdit) return;
    let next = buildPatch();
    const hs = next.homeScore;
    const as = next.awayScore;
    if (hs !== '' && as !== '' && hs !== as) {
      next = { ...next, winnerId: null };
    } else {
      const ph = next.penHome;
      const pa = next.penAway;
      if (hs !== '' && as !== '' && hs === as && ph !== '' && pa !== '' && ph !== pa) {
        next = { ...next, winnerId: null };
      }
    }
    onCommit(next);
  };

  const pickWinner = (wid: number) => {
    onCommit({ ...buildPatch(), winnerId: wid });
  };

  const needPick = canEdit && needsWinnerPick({ ...data, ...toDraft(), winnerId: data.winnerId });
  const winner = resolveKnockoutWinner(data);

  const border =
    accent === 'final'
      ? 'border-amber-500/35 bg-gradient-to-b from-amber-500/10 to-transparent'
      : 'border-white/10 bg-white/[0.03]';

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{label}</h4>
          {subtitle && <p className="text-[11px] text-zinc-500">{subtitle}</p>}
        </div>
        {winner && (
          <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            Kazanan: {teamName(teams, winner)}
          </span>
        )}
      </div>

      {!canEdit ? (
        <p className="text-xs text-zinc-500">Önce üst tur sonuçları girilmeli.</p>
      ) : (
        <>
          <div className="mb-2 grid gap-2 text-[11px] text-zinc-400 sm:grid-cols-2">
            <div className="rounded-lg border border-white/5 bg-zinc-900/40 px-3 py-2">
              <span className="text-zinc-500">Ev / 1. sıra</span>
              <p className="font-medium text-white">
                #{hi} {teamName(teams, hi!)}
              </p>
            </div>
            <div className="rounded-lg border border-white/5 bg-zinc-900/40 px-3 py-2">
              <span className="text-zinc-500">Deplasman / 2. sıra</span>
              <p className="font-medium text-white">
                #{ai} {teamName(teams, ai!)}
              </p>
            </div>
          </div>
          <p className="mb-2 text-[10px] text-zinc-600">
            Skor (90 dk). Beraberlikte penaltı girin veya kazanan seçin.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              onBlur={commit}
              className="w-14 rounded border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-center text-sm tabular-nums text-white"
              aria-label="Ev skoru"
            />
            <span className="text-zinc-600">—</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              onBlur={commit}
              className="w-14 rounded border border-white/10 bg-zinc-900/80 px-2 py-1.5 text-center text-sm tabular-nums text-white"
              aria-label="Deplasman skoru"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase text-zinc-500">Penaltı</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={penH}
              onChange={(e) => setPenH(e.target.value)}
              onBlur={commit}
              className="w-12 rounded border border-white/10 bg-zinc-900/80 px-1.5 py-1 text-center text-xs tabular-nums text-white"
              aria-label="Penaltı ev"
            />
            <span className="text-zinc-600">—</span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={penA}
              onChange={(e) => setPenA(e.target.value)}
              onBlur={commit}
              className="w-12 rounded border border-white/10 bg-zinc-900/80 px-1.5 py-1 text-center text-xs tabular-nums text-white"
              aria-label="Penaltı dep"
            />
          </div>
          {needPick && canEdit && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/5 p-2">
              <p className="mb-2 text-[11px] text-amber-200/90">Kazananı seçin</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => pickWinner(hi!)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    data.winnerId === hi
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {teamName(teams, hi!)}
                </button>
                <button
                  type="button"
                  onClick={() => pickWinner(ai!)}
                  className={`rounded-lg border px-3 py-1.5 text-xs ${
                    data.winnerId === ai
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                      : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {teamName(teams, ai!)}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  teams: Team[];
  standings: StandingRow[];
  leagueComplete: boolean;
  leagueDone: number;
  leagueTotal: number;
  bracket: PlayoffBracketMap | null;
  onBracketChange: (b: PlayoffBracketMap) => void;
};

export default function KnockoutSection({
  teams,
  standings,
  leagueComplete,
  leagueDone,
  leagueTotal,
  bracket,
  onBracketChange,
}: Props) {
  const top4 = standings.slice(0, 4);

  const patch = useCallback(
    (id: KnockoutMatchId, m: KnockoutMatchData) => {
      if (!bracket) return;
      let next: PlayoffBracketMap = { ...bracket, [id]: m };
      if (id === 'SF1' || id === 'SF2') {
        next = applySemisToFinal(next);
      }
      onBracketChange(next);
    },
    [bracket, onBracketChange]
  );

  const champion = bracket ? resolveKnockoutWinner(bracket.F) : null;

  return (
    <div className="surface-panel mb-10 rounded-2xl p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Eleme — yarı final &amp; final</h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-zinc-500">
            Lig fikstüründeki tüm maçlar girilince üst 4 takım burada eşleşir (1. vs 4., 2. vs 3.).
            Sonuçları kaydedince final eşleşmesi otomatik dolar. Ayrı çeyrek sonuç sayfası yok — her şey
            bu blokta.
          </p>
        </div>
      </div>

      {!leagueComplete && (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/40 p-4">
          <p className="text-sm text-zinc-400">
            Lig maçları tamamlanmadan eleme başlamaz.
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            İlerleme: <strong className="text-zinc-300">{leagueDone}</strong> /{' '}
            <strong className="text-zinc-300">{leagueTotal}</strong> maç girildi.
          </p>
          {top4.length >= 1 && (
            <p className="mt-3 text-[11px] text-zinc-600">
              Güncel ilk 4 (önizleme):{' '}
              {top4.map((r) => r.name).join(', ')}
            </p>
          )}
        </div>
      )}

      {leagueComplete && teams.length < 4 && (
        <p className="text-sm text-amber-200/80">Eleme için en az 4 takım gerekir.</p>
      )}

      {leagueComplete && teams.length >= 4 && !bracket && (
        <p className="text-sm text-zinc-500">Eleme tablosu yükleniyor…</p>
      )}

      {leagueComplete && teams.length >= 4 && bracket && (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <KnockoutMatchCard
              teams={teams}
              label="Yarı final 1"
              subtitle="Lig 1. sıra vs 4. sıra"
              data={bracket.SF1}
              onCommit={(m) => patch('SF1', m)}
              accent="default"
            />
            <KnockoutMatchCard
              teams={teams}
              label="Yarı final 2"
              subtitle="Lig 2. sıra vs 3. sıra"
              data={bracket.SF2}
              onCommit={(m) => patch('SF2', m)}
              accent="default"
            />
          </div>

          <KnockoutMatchCard
            teams={teams}
            label="Final"
            subtitle="Yarı final kazananları otomatik eşleşir"
            data={bracket.F}
            onCommit={(m) => patch('F', m)}
            accent="final"
          />

          {champion && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4">
              <Trophy className="h-10 w-10 shrink-0 text-emerald-400" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-400/90">
                  Şampiyon
                </p>
                <p className="text-lg font-semibold text-white">{teamName(teams, champion)}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
