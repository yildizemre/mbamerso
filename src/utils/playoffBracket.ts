import type { MatchResult } from './leagueStorage';
import { matchKey } from './leagueStorage';
import type { FixtureRound } from './leagueStandings';

export type KnockoutMatchId = 'SF1' | 'SF2' | 'F';

export interface KnockoutMatchData {
  homeId: number | null;
  awayId: number | null;
  homeScore: number | '';
  awayScore: number | '';
  penHome: number | '';
  penAway: number | '';
  /** Beraberlik / eşit penaltıda manuel */
  winnerId: number | null;
}

export function emptyKnockoutMatch(): KnockoutMatchData {
  return {
    homeId: null,
    awayId: null,
    homeScore: '',
    awayScore: '',
    penHome: '',
    penAway: '',
    winnerId: null,
  };
}

export function isLeagueComplete(
  results: Record<string, MatchResult>,
  fixtureRounds: FixtureRound[]
): boolean {
  let seen = 0;
  let done = 0;
  for (const fr of fixtureRounds) {
    for (const { a, b } of fr.matches) {
      seen++;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (results[matchKey(lo, hi)]) done++;
    }
  }
  return seen > 0 && seen === done;
}

export function leagueMatchesProgress(
  results: Record<string, MatchResult>,
  fixtureRounds: FixtureRound[]
): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const fr of fixtureRounds) {
    for (const { a, b } of fr.matches) {
      total++;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      if (results[matchKey(lo, hi)]) done++;
    }
  }
  return { total, done };
}

/** Normal veya penaltıda fark varsa kazanan; yoksa null (kazanan seç gerekir) */
export function resolveKnockoutWinner(m: KnockoutMatchData): number | null {
  const { homeId, awayId, homeScore, awayScore, penHome, penAway, winnerId } = m;
  if (!homeId || !awayId) return null;
  if (winnerId === homeId || winnerId === awayId) return winnerId;

  const hs = homeScore === '' ? null : homeScore;
  const as = awayScore === '' ? null : awayScore;
  if (hs === null || as === null) return null;

  if (hs > as) return homeId;
  if (as > hs) return awayId;

  const ph = penHome === '' ? null : penHome;
  const pa = penAway === '' ? null : penAway;
  if (ph !== null && pa !== null) {
    if (ph > pa) return homeId;
    if (pa > ph) return awayId;
  }
  return null;
}

export function needsWinnerPick(m: KnockoutMatchData): boolean {
  if (!m.homeId || !m.awayId) return false;
  const hs = m.homeScore === '' ? null : m.homeScore;
  const as = m.awayScore === '' ? null : m.awayScore;
  if (hs === null || as === null) return false;
  if (hs !== as) return false;
  const ph = m.penHome === '' ? null : m.penHome;
  const pa = m.penAway === '' ? null : m.penAway;
  if (ph !== null && pa !== null && ph !== pa) return false;
  return !(m.winnerId === m.homeId || m.winnerId === m.awayId);
}

/** Lig 1–4 sırasına göre: 1v4, 2v3; final yarı final kazananlarıyla dolar */
export function buildBracketFromTopFour(
  orderedTeamIds: [number, number, number, number]
): Record<KnockoutMatchId, KnockoutMatchData> {
  const [s1, s2, s3, s4] = orderedTeamIds;
  return {
    SF1: {
      ...emptyKnockoutMatch(),
      homeId: s1,
      awayId: s4,
    },
    SF2: {
      ...emptyKnockoutMatch(),
      homeId: s2,
      awayId: s3,
    },
    F: {
      ...emptyKnockoutMatch(),
      homeId: null,
      awayId: null,
    },
  };
}

export function applySemisToFinal(
  matches: Record<KnockoutMatchId, KnockoutMatchData>
): Record<KnockoutMatchId, KnockoutMatchData> {
  const w1 = resolveKnockoutWinner(matches.SF1);
  const w2 = resolveKnockoutWinner(matches.SF2);
  if (!w1 || !w2) {
    return {
      ...matches,
      F: {
        ...emptyKnockoutMatch(),
        homeId: null,
        awayId: null,
      },
    };
  }
  const prev = matches.F;
  const samePair = prev.homeId === w1 && prev.awayId === w2;
  if (!samePair) {
    return {
      ...matches,
      F: {
        homeId: w1,
        awayId: w2,
        homeScore: '',
        awayScore: '',
        penHome: '',
        penAway: '',
        winnerId: null,
      },
    };
  }
  return {
    ...matches,
    F: {
      ...prev,
      homeId: w1,
      awayId: w2,
    },
  };
}
