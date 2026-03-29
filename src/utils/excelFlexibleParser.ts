import type { ParticipantExcelRow, Player, Position } from '../types/player';
import {
  formatExcelCellDate,
  mapGenderFromCinsiyet,
  mapPositionFromMevki,
  parseNumCell,
  parseRatingCell,
} from './participantRowMapping';

/** Başlık satırından sütun indeksleri (farklı branşlarda son sütunlar değişir) */
interface ColIx {
  id?: number;
  start?: number;
  end?: number;
  email?: number;
  kat?: number;
  puan?: number;
  dogum?: number;
  statu?: number;
  lokasyon?: number;
  cinsiyet?: number;
  boy?: number;
  kilo?: number;
  mevki?: number;
  ayak?: number;
  katilim?: number;
}

function buildColIx(headers: string[]): ColIx {
  const ix: ColIx = {};
  headers.forEach((raw, i) => {
    const s = String(raw).toLowerCase().trim();
    if (s === 'id' || s === 'ıd') ix.id = i;
    if (s.includes('start') && s.includes('time')) ix.start = i;
    if (s.includes('completion') && s.includes('time')) ix.end = i;
    if (s.includes('email')) ix.email = i;
    if (s.includes('katılımcı') || s.includes('katilimci')) ix.kat = i;
    if (s.includes('puanlama')) ix.puan = i;
    if (s.includes('doğum') || s.includes('dogum')) ix.dogum = i;
    if (s.includes('statü') || s.includes('statu')) ix.statu = i;
    if (s.includes('lokasyon')) ix.lokasyon = i;
    if (s.includes('cinsiyet')) ix.cinsiyet = i;
    if (s.includes('boyunuz') || (s.includes('boy') && s.includes('cm'))) ix.boy = i;
    if (s.includes('kilonuz') || (s.includes('kilo') && s.includes('kg'))) ix.kilo = i;
    if (s.includes('mevkiiler')) ix.mevki = i;
    if ((s.includes('baskın') || s.includes('baskin') || s.includes('ayağınız')) && !s.includes('katılmak')) {
      ix.ayak = i;
    }
    if (s.includes('katılmak') || s.includes('katilmak')) ix.katilim = i;
  });
  return ix;
}

function at(row: unknown[], ix: number | undefined): unknown {
  if (ix === undefined || ix < 0) return '';
  return row[ix] ?? '';
}

export function isLikelyHeaderRowFromHeaders(row: unknown[]): boolean {
  const c0 = String(row[0] ?? '').trim().toLowerCase();
  const c3 = String(row[3] ?? '').trim().toLowerCase();
  return c0 === 'id' || c3 === 'email' || c0 === 'ıd';
}

/**
 * Tek bir sayfadaki katılımcı satırlarını oyuncuya çevirir.
 */
export function playersFromSheetRows(
  sheetName: string,
  rows: unknown[][],
  idPrefix: string
): Player[] {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map((h) => String(h));
  const col = buildColIx(headers);
  const out: Player[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const formId = at(row, col.id !== undefined ? col.id : 0);
    const participantNo = at(row, col.kat !== undefined ? col.kat : 4);
    const hasParticipant = participantNo !== '' && participantNo != null;
    const hasForm = formId !== '' && formId != null;
    if (!hasParticipant && !hasForm) continue;

    const puanRaw = at(row, col.puan);
    const dogumRaw = at(row, col.dogum);
    const statu = String(at(row, col.statu) ?? '').trim();
    const lokasyon = String(at(row, col.lokasyon) ?? '').trim();
    const cinsiyet = String(at(row, col.cinsiyet) ?? '').trim();
    const mevkiStr = String(at(row, col.mevki) ?? '').trim();
    const ayakStr = String(at(row, col.ayak) ?? '').trim();
    const katilimStr = String(at(row, col.katilim) ?? '').trim();

    const noStr =
      hasParticipant && participantNo != null && participantNo !== ''
        ? String(participantNo)
        : String(formId ?? i);

    const excel: ParticipantExcelRow = {
      formId: formId as string | number,
      startTime: formatExcelCellDate(at(row, col.start ?? 1)),
      completionTime: formatExcelCellDate(at(row, col.end ?? 2)),
      email: String(at(row, col.email ?? 3) ?? '').trim(),
      participantNo: (hasParticipant ? participantNo : (formId ?? i)) as string | number,
      puanlamaRaw:
        puanRaw === '' || puanRaw == null ? null : (puanRaw as string | number),
      dogumTarihi: formatExcelCellDate(dogumRaw),
      statu,
      lokasyon,
      cinsiyetRaw: cinsiyet,
      boyCm: parseNumCell(at(row, col.boy)),
      kiloKg: parseNumCell(at(row, col.kilo)),
      mevkiRaw: mevkiStr,
      baskinAyak: ayakStr,
      katilimOnayi: katilimStr || undefined,
    };

    let position: Position = mapPositionFromMevki(mevkiStr);
    if (!mevkiStr) position = 'MID';

    const name = `Katılımcı ${noStr}`;
    const slug = sheetName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ-]/g, '');

    const player: Player = {
      id: `${idPrefix}-${slug}-r${i}-${String(formId)}-${noStr}`,
      name,
      gender: mapGenderFromCinsiyet(cinsiyet),
      position,
      rating: parseRatingCell(puanRaw),
      is_favorite: false,
      sport: sheetName,
      excel,
    };

    out.push(player);
  }

  return out;
}
