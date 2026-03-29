import type { Team } from '../types/player';
import type { MatchResult } from './leagueStorage';
import { matchKey } from './leagueStorage';

export interface StandingRow {
  teamId: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export function computeStandings(
  teams: Team[],
  results: Record<string, MatchResult>
): StandingRow[] {
  const byId = new Map<number, StandingRow>();

  for (const t of teams) {
    byId.set(t.id, {
      teamId: t.id,
      name: t.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    });
  }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const ta = teams[i];
      const tb = teams[j];
      const lo = Math.min(ta.id, tb.id);
      const hi = Math.max(ta.id, tb.id);
      const k = matchKey(lo, hi);
      const r = results[k];
      if (!r) continue;

      const gLo = r.lo;
      const gHi = r.hi;

      const rowLo = byId.get(lo)!;
      const rowHi = byId.get(hi)!;

      rowLo.played++;
      rowHi.played++;
      rowLo.gf += gLo;
      rowLo.ga += gHi;
      rowHi.gf += gHi;
      rowHi.ga += gLo;

      if (gLo > gHi) {
        rowLo.won++;
        rowHi.lost++;
        rowLo.points += 3;
      } else if (gLo < gHi) {
        rowHi.won++;
        rowLo.lost++;
        rowHi.points += 3;
      } else {
        rowLo.drawn++;
        rowHi.drawn++;
        rowLo.points++;
        rowHi.points++;
      }
    }
  }

  const rows = [...byId.values()].map((row) => ({
    ...row,
    gd: row.gf - row.ga,
  }));

  rows.sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.gd !== x.gd) return y.gd - x.gd;
    if (y.gf !== x.gf) return y.gf - x.gf;
    return x.name.localeCompare(y.name, 'tr');
  });

  return rows;
}

/** Fikstür satırı: iç saha / deplasman yok; sıra taraf tutar, skor `matchKey(min,max)` ile saklanır */
export interface FixturePair {
  a: number;
  b: number;
}

export function roundRobinMatchList(teamIds: number[]): FixturePair[] {
  const sorted = [...teamIds].sort((a, b) => a - b);
  const out: FixturePair[] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      out.push({ a: sorted[i], b: sorted[j] });
    }
  }
  return out;
}

/** Tek devreli lig: toplam maç sayısı = T·(T−1)/2 */
export function leagueSingleRoundMatchCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return (teamCount * (teamCount - 1)) / 2;
}

/**
 * Tek devre Berger: hafta sayısı. T çift → T−1 hafta; T tek → T hafta (her hafta bir bay).
 * Örn. 13 takım → 13 hafta (her takım 12 maç + 1 bay haftası), 78 maç.
 */
export function leagueSingleRoundWeekCount(teamCount: number): number {
  if (teamCount < 2) return 0;
  return teamCount % 2 === 0 ? teamCount - 1 : teamCount;
}

export interface FixtureRound {
  round: number;
  /** Örn. "1. Hafta" */
  label: string;
  matches: FixturePair[];
}

/**
 * Tek devreli lig fikstürü (tüm branşlar): her ikili en fazla bir kez, rövanş yok.
 * Berger çemberi: her haftada her takım en fazla bir maç. Tek sayıda takımda bir takım bay.
 */
export function buildRoundRobinFixtures(teamIds: number[]): FixtureRound[] {
  const sorted = [...new Set(teamIds)].sort((a, b) => a - b);
  if (sorted.length < 2) return [];

  const teams = [...sorted];
  if (teams.length % 2 === 1) {
    teams.push(0);
  }
  const n = teams.length;
  const rounds = n - 1;
  const half = n / 2;
  const out: FixtureRound[] = [];

  for (let r = 0; r < rounds; r++) {
    const matches: FixturePair[] = [];
    for (let i = 0; i < half; i++) {
      const a = teams[i];
      const b = teams[n - 1 - i];
      if (a !== 0 && b !== 0) {
        matches.push({ a, b });
      }
    }
    const last = teams.pop()!;
    teams.splice(1, 0, last);
    out.push({
      round: r + 1,
      label: `${r + 1}. Hafta`,
      matches,
    });
  }

  return out;
}
