/** Excel sekme sırası (Pivot hariç) */
export const SPORT_SHEET_ORDER = [
  'Futbol',
  'Voleybol',
  'Basketbol',
  'Halat Çekme',
  'Tavla',
  'Masa Tenisi',
  '3 Sayılık Atış',
  'Satranç',
] as const;

export type SportSheetName = (typeof SPORT_SHEET_ORDER)[number];

export const PIVOT_SHEET_NAME = 'Pivot';

/** Sabit takım kadro sayısı (turnuva notu: genelde 10; futbol 14) */
export const DEFAULT_TEAM_SIZE_BY_SPORT: Record<string, number> = {
  Futbol: 14,
  Voleybol: 6,
  Basketbol: 5,
  'Halat Çekme': 10,
  Tavla: 2,
  'Masa Tenisi': 2,
  '3 Sayılık Atış': 3,
  Satranç: 4,
};

/** Branş başına üst takım sayısı (futbol 13, voleybol 12 …) */
export const MAX_TEAMS_BY_SPORT: Record<string, number> = {
  Futbol: 13,
  Voleybol: 10,
};

export const DEFAULT_TEAM_SIZE_FALLBACK = 10;

export function sortSportLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const ia = SPORT_SHEET_ORDER.indexOf(a as SportSheetName);
    const ib = SPORT_SHEET_ORDER.indexOf(b as SportSheetName);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'tr');
  });
}

export function defaultTeamSizeForSport(sport: string): number {
  return DEFAULT_TEAM_SIZE_BY_SPORT[sport] ?? DEFAULT_TEAM_SIZE_FALLBACK;
}

export function maxTeamsForSport(sport: string): number | undefined {
  const n = MAX_TEAMS_BY_SPORT[sport];
  return n !== undefined ? n : undefined;
}
