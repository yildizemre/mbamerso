import type { Player } from '../types/player';

/** 1986 ve öncesi doğumlular veteran kabul edilir */
export const VETERAN_BIRTH_YEAR_MAX = 1986;

/** Turnuva sezonu (yaş hesabı) */
export const TOURNAMENT_YEAR = 2026;

export type CollarType = 'white' | 'blue' | 'unknown';
export type FootKind = 'left' | 'right' | 'both' | 'unknown';

/** DD.MM.YYYY, DD/MM/YYYY veya metin içinde 4 haneli yıl */
export function parseBirthYear(dogumTr: string): number | null {
  const s = (dogumTr || '').trim();
  if (!s) return null;

  const y4 = s.match(/\b(19|20)\d{2}\b/);
  if (y4) {
    const y = Number(y4[0]);
    if (y >= 1900 && y <= 2100) return y;
  }

  const dot = s.split(/[./]/).map((x) => x.trim());
  if (dot.length >= 3) {
    const last = dot[dot.length - 1];
    const y = parseInt(last, 10);
    if (last.length === 4 && y >= 1900 && y <= 2100) return y;
  }

  return null;
}

export function playerAgeYears(player: Player, referenceYear = TOURNAMENT_YEAR): number | null {
  const y = parseBirthYear(player.excel?.dogumTarihi ?? '');
  if (y == null) return null;
  return Math.max(0, referenceYear - y);
}

export function isVeteranPlayer(player: Player): boolean {
  const y = parseBirthYear(player.excel?.dogumTarihi ?? '');
  if (y == null) return false;
  return y <= VETERAN_BIRTH_YEAR_MAX;
}

/** Statü metninden beyaz / mavi yaka tahmini (Excel kodları + anahtar kelimeler) */
export function inferCollarType(statu: string): CollarType {
  const s = (statu || '').toLowerCase();
  if (!s.trim()) return 'unknown';

  if (
    /\b(010|013|014|direkt\s*işçi|direkt\s*isci|endirek?t?\s*işçi|endirek?t?\s*isci|endirek?t?\s*memur|endirek?t?\s*my|üretim|uretim|işçi|isci|mavi|posta\s*başı|posta\s*basi|postabaşı|postabasi|fabrika)\b/.test(
      s
    )
  ) {
    return 'blue';
  }
  if (
    /\b(006|007|009|012|pep|memur|mühendis|muhendis|şef|sef|yönetim|yonetim|stajyer|müdür|mudur|personel|beyaz|ofis)\b/.test(
      s
    )
  ) {
    return 'white';
  }
  if (/\b015\b|engelli/.test(s)) return 'white';

  return 'unknown';
}

/** Form / uygulama mevkisi kaleci mi (futbolda takım başına 1 kaleci için) */
export function isGoalkeeperPlayer(player: Player): boolean {
  if (player.position === 'GK') return true;
  const m = (player.excel?.mevkiRaw ?? '').toLowerCase();
  return m.includes('kaleci');
}

export function footKindFromAyak(baskinAyak: string): FootKind {
  const s = (baskinAyak || '').toLowerCase();
  if (s.includes('iki') || s.includes('her iki')) return 'both';
  if (s.includes('sol')) return 'left';
  if (s.includes('sağ') || s.includes('sag')) return 'right';
  return 'unknown';
}

