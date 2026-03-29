import type { Player, Position } from '../types/player';

export interface TeamColumnFiltersState {
  lokasyon: string[];
  statu: string[];
  mevkiRaw: string[];
  ayak: string[];
  positions: Position[];
  ratingMin: number | null;
  ratingMax: number | null;
}

export const emptyTeamColumnFilters = (): TeamColumnFiltersState => ({
  lokasyon: [],
  statu: [],
  mevkiRaw: [],
  ayak: [],
  positions: [],
  ratingMin: null,
  ratingMax: null,
});

/** Boş dizi = o sütunda filtre yok (hepsi). Dolu dizi = seçilen değerlerden biriyle eşleşmeli (OR). */
export function playerPassesTeamColumnFilters(
  player: Player,
  category: 'mixed' | 'male' | 'female',
  filters: TeamColumnFiltersState
): boolean {
  if (category === 'male' && player.gender !== 'male') return false;
  if (category === 'female' && player.gender !== 'female') return false;

  const ex = player.excel;
  const needsExcel =
    filters.lokasyon.length > 0 ||
    filters.statu.length > 0 ||
    filters.mevkiRaw.length > 0 ||
    filters.ayak.length > 0;

  if (needsExcel && !ex) return false;

  if (filters.lokasyon.length > 0) {
    const v = ex?.lokasyon ?? '';
    if (!filters.lokasyon.includes(v)) return false;
  }
  if (filters.statu.length > 0) {
    const v = ex?.statu ?? '';
    if (!filters.statu.includes(v)) return false;
  }
  if (filters.mevkiRaw.length > 0) {
    const v = ex?.mevkiRaw ?? '';
    if (!filters.mevkiRaw.includes(v)) return false;
  }
  if (filters.ayak.length > 0) {
    const v = ex?.baskinAyak ?? '';
    if (!filters.ayak.includes(v)) return false;
  }

  if (filters.positions.length > 0 && !filters.positions.includes(player.position)) {
    return false;
  }

  const rMin = filters.ratingMin;
  const rMax = filters.ratingMax;
  if (rMin != null || rMax != null) {
    let lo = rMin ?? 1;
    let hi = rMax ?? 100;
    if (lo > hi) [lo, hi] = [hi, lo];
    if (player.rating < lo || player.rating > hi) return false;
  }

  return true;
}

export function uniqSorted(values: (string | undefined)[]): string[] {
  const s = new Set<string>();
  values.forEach((v) => {
    if (v != null && String(v).trim() !== '') s.add(String(v).trim());
  });
  return [...s].sort((a, b) => a.localeCompare(b, 'tr'));
}
