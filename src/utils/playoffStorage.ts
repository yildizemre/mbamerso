import type { KnockoutMatchData, KnockoutMatchId } from './playoffBracket';

export type PlayoffBracketMap = Record<KnockoutMatchId, KnockoutMatchData>;

export function playoffStorageKey(sport: string): string {
  return `mba-playoff::${sport}`;
}

export function loadPlayoff(sport: string): PlayoffBracketMap | null {
  try {
    const raw = localStorage.getItem(playoffStorageKey(sport));
    if (!raw) return null;
    const data = JSON.parse(raw) as PlayoffBracketMap;
    if (!data?.SF1 || !data?.SF2 || !data?.F) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePlayoff(sport: string, bracket: PlayoffBracketMap) {
  localStorage.setItem(playoffStorageKey(sport), JSON.stringify(bracket));
}

export function clearPlayoff(sport: string) {
  localStorage.removeItem(playoffStorageKey(sport));
}
