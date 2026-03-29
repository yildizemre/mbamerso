import type { Team, Player } from '../types/player';
import { loadSquad } from './squadStorage';

export const LEAGUE_SNAPSHOT_KEY = 'mba-league-snapshot';
export const LEAGUE_RESULTS_KEY = 'mba-league-results';
export const YELLOW_CARDS_KEY = 'mba-yellow-cards';
export const RED_CARDS_KEY = 'mba-red-cards';

export interface LeagueSnapshotV1 {
  version: 1;
  sport: string;
  teamSize: number;
  teams: Team[];
  reserves?: Player[];
  createdAt: string;
}

/** Maç anahtarı m-{düşükId}-{yüksekId}; skorlar küçük / büyük id’li takımlara ait */
export type MatchResult = { lo: number; hi: number };

export function loadSnapshot(): LeagueSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(LEAGUE_SNAPSHOT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LeagueSnapshotV1;
    if (data?.version !== 1 || !Array.isArray(data.teams)) return null;
    return data;
  } catch {
    return null;
  }
}

/** Lig ekranı: seçili branş için kayıtlı kadro; yoksa eski “lige aktar” anlık görüntüsü (aynı branş) */
export function loadLeagueViewSnapshot(sport: string): LeagueSnapshotV1 | null {
  const sq = loadSquad(sport);
  if (sq && sq.teams.length > 0) {
    return {
      version: 1,
      sport: sq.sport,
      teamSize: sq.teamSize,
      teams: sq.teams,
      reserves: sq.reserves,
      createdAt: sq.updatedAt,
    };
  }
  const legacy = loadSnapshot();
  if (legacy && legacy.sport === sport) return legacy;
  return null;
}

export function loadResults(): Record<string, MatchResult> {
  try {
    const raw = localStorage.getItem(LEAGUE_RESULTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, MatchResult>;
  } catch {
    return {};
  }
}

export function saveResults(r: Record<string, MatchResult>) {
  localStorage.setItem(LEAGUE_RESULTS_KEY, JSON.stringify(r));
}

export function loadYellowCards(): Record<string, number> {
  try {
    const raw = localStorage.getItem(YELLOW_CARDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveYellowCards(c: Record<string, number>) {
  localStorage.setItem(YELLOW_CARDS_KEY, JSON.stringify(c));
}

export function loadRedCards(): Record<string, number> {
  try {
    const raw = localStorage.getItem(RED_CARDS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

export function saveRedCards(c: Record<string, number>) {
  localStorage.setItem(RED_CARDS_KEY, JSON.stringify(c));
}

export function matchKey(teamIdA: number, teamIdB: number): string {
  const lo = Math.min(teamIdA, teamIdB);
  const hi = Math.max(teamIdA, teamIdB);
  return `m-${lo}-${hi}`;
}

export function allPlayersFromTeams(teams: Team[]): Player[] {
  return teams.flatMap((t) => t.players);
}
