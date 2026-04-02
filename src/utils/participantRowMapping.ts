import type { Gender, ParticipantExcelRow, Player, Position } from '../types/player';

export function mapPositionFromMevki(raw: string): Position {
  const s = (raw || '').trim().toLowerCase();
  if (s.includes('kaleci')) return 'GK';
  if (s.includes('defans')) return 'DEF';
  if (s.includes('forvet')) return 'FWD';
  if (s.includes('orta')) return 'MID';
  return 'MID';
}

export function mapGenderFromCinsiyet(raw: string): Gender {
  const s = (raw || '').trim().toLowerCase();
  if (s.includes('kadın') || s.includes('kadin')) return 'female';
  return 'male';
}

/** Excel seri günü (Doğum vb.) veya metin tarih */
export function formatExcelCellDate(value: unknown): string {
  if (value === '' || value == null) return '';
  if (typeof value === 'number') {
    if (value > 20000 && value < 60000) {
      const d = new Date((value - 25569) * 86400 * 1000);
      if (!Number.isNaN(d.getTime())) return d.toLocaleDateString('tr-TR');
    }
    return String(value);
  }
  return String(value);
}

export function parseRatingCell(raw: unknown): number {
  if (raw === '' || raw == null) return 50;
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.min(100, Math.max(1, Math.round(n)));
  return 50;
}

export function parseNumCell(raw: unknown): number | null {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export interface RowToPlayerOptions {
  /** Satır kaynağı: excel dosyası veya manuel */
  idPrefix?: string;
  /** Manuel girişte ad soyad; yoksa "Katılımcı {no}" */
  displayName?: string;
  /** Excel sekme / branş adı */
  sport?: string;
}

/**
 * Eski sabit düzen (referans). 2026 numaralı şablonda araya "Kısım Numarası" gelir;
 * uygulama satır başlıklarından otomatik sütun bulur (`excelFlexibleParser`).
 */
export function playerFromTournamentExcelRow(
  row: unknown[],
  rowIndex: number,
  options: RowToPlayerOptions = {}
): Player | null {
  if (!row || row.length === 0) return null;

  const participantNo = row[4];
  const formId = row[0];
  const hasParticipant = participantNo !== '' && participantNo != null;
  const hasForm = formId !== '' && formId != null;
  if (!hasParticipant && !hasForm) {
    return null;
  }

  const puanRaw = row[5];
  const dogumRaw = row[6];
  const statu = String(row[7] ?? '').trim();
  const lokasyon = String(row[8] ?? '').trim();
  const cinsiyet = String(row[9] ?? '').trim();
  const mevki = String(row[12] ?? '').trim();
  const ayak = String(row[13] ?? '').trim();

  const noStr =
    participantNo !== '' && participantNo != null ? String(participantNo) : String(formId ?? rowIndex);

  const excel: ParticipantExcelRow = {
    formId: formId as string | number,
    startTime: formatExcelCellDate(row[1]),
    completionTime: formatExcelCellDate(row[2]),
    email: String(row[3] ?? '').trim(),
    participantNo: (hasParticipant ? participantNo : (formId ?? rowIndex)) as string | number,
    puanlamaRaw: puanRaw === '' || puanRaw == null ? null : (puanRaw as string | number),
    dogumTarihi: formatExcelCellDate(dogumRaw),
    statu,
    lokasyon,
    cinsiyetRaw: cinsiyet,
    boyCm: parseNumCell(row[10]),
    kiloKg: parseNumCell(row[11]),
    mevkiRaw: mevki,
    baskinAyak: ayak,
  };

  const idPrefix = options.idPrefix ?? 'excel';
  const name =
    options.displayName?.trim() ||
    `Katılımcı ${noStr}`;

  const player: Player = {
    id: `${idPrefix}-${String(formId)}-${noStr}`,
    name,
    gender: mapGenderFromCinsiyet(cinsiyet),
    position: mapPositionFromMevki(mevki),
    rating: parseRatingCell(puanRaw),
    is_favorite: false,
    sport: options.sport ?? 'Futbol',
    excel,
  };

  return player;
}

/** Başlık satırı mı (ID, Email vb.) */
export function isLikelyTournamentHeaderRow(row: unknown[]): boolean {
  const c0 = String(row[0] ?? '').trim().toLowerCase();
  const c3 = String(row[3] ?? '').trim().toLowerCase();
  return c0 === 'id' || c3 === 'email' || c0 === 'ıd';
}

export function buildManualParticipantExcel(input: {
  participantNo: string | number;
  email: string;
  puanlamaRaw: string | number | null;
  dogumTarihi: string;
  statu: string;
  lokasyon: string;
  cinsiyetRaw: string;
  boyCm: number | null;
  kiloKg: number | null;
  mevkiRaw: string;
  baskinAyak: string;
  katilimOnayi?: string;
}): ParticipantExcelRow {
  return {
    formId: `manual-${Date.now()}`,
    startTime: '',
    completionTime: '',
    email: input.email.trim(),
    participantNo: input.participantNo,
    puanlamaRaw: input.puanlamaRaw,
    dogumTarihi: input.dogumTarihi.trim(),
    statu: input.statu.trim(),
    lokasyon: input.lokasyon.trim(),
    cinsiyetRaw: input.cinsiyetRaw.trim(),
    boyCm: input.boyCm,
    kiloKg: input.kiloKg,
    mevkiRaw: input.mevkiRaw.trim(),
    baskinAyak: input.baskinAyak.trim(),
    katilimOnayi: input.katilimOnayi?.trim() || undefined,
  };
}
