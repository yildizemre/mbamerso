import * as XLSX from 'xlsx';
import { playersFromSheetRows } from './excelFlexibleParser';
import { PIVOT_SHEET_NAME } from './sports';
import type { Player } from '../types/player';

/** `public/` altına konmalı — 2026 İstanbul Spor Turnuvası katılımcı numaralı liste (çok sayfalı) */
export const PARTICIPANTS_XLSX_FILENAME = '2026 İstanbul Spor Turnuvası Katılımcı Numaralı3.xlsx';

export function loadPlayersFromPublicXlsx(): Promise<Player[]> {
  const url = `${window.location.origin}/${encodeURIComponent(PARTICIPANTS_XLSX_FILENAME)}`;
  return fetch(url, { cache: 'no-store' }).then(async (res) => {
    if (!res.ok) throw new Error(`Excel dosyası yüklenemedi (${res.status})`);
    const buf = await res.arrayBuffer();
    return playersFromWorkbookBuffer(buf, 'excel');
  });
}

/** Tüm sayfaları okur (Pivot hariç); her satır branş (sekme) bilgisiyle gelir */
export function playersFromWorkbookBuffer(buf: ArrayBuffer, idPrefix: string): Player[] {
  const wb = XLSX.read(buf, { type: 'array' });
  const all: Player[] = [];

  for (const sheetName of wb.SheetNames) {
    if (sheetName.trim() === PIVOT_SHEET_NAME) continue;

    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
    const players = playersFromSheetRows(sheetName, rows, idPrefix);
    all.push(...players);
  }

  return all;
}

/** Yüklenen Excel (aynı çok sayfalı şablon) */
export function playersFromUploadedTournamentWorkbook(buf: ArrayBuffer): Player[] {
  return playersFromWorkbookBuffer(buf, 'import');
}
