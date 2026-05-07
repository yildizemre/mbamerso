import * as XLSX from 'xlsx';
import type { Player, Position, Team } from '../types/player';

export interface FixedSquadData {
  teamSize: number;
  desiredTeamCount: number;
  teams: Team[];
  reserves: Player[];
}

const FIXED_TEAM_FILES: Record<string, string> = {
  Basketbol: 'MAB Basketbol - Takimlar-1778149533486.xlsx',
  Futbol: 'MAB Futbol - Takimlar-1778149520776.xlsx',
  'Halat Çekme': 'MAB Halat Çekme - Takimlar-1778149538751.xlsx',
  Voleybol: 'MAB Voleybol - Takimlar-1778149527643.xlsx',
};

function normalizeParticipantNo(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function parsePosition(raw: unknown): Position {
  const s = String(raw ?? '').toLocaleLowerCase('tr-TR');
  if (s.includes('kaleci')) return 'GK';
  if (s.includes('defans')) return 'DEF';
  if (s.includes('forvet')) return 'FWD';
  return 'MID';
}

function parseGender(raw: unknown): Player['gender'] {
  const s = String(raw ?? '').toLocaleLowerCase('tr-TR');
  return s.includes('kad') ? 'female' : 'male';
}

function parseTeamId(sheetName: string, idx: number): number {
  const m = sheetName.match(/\d+/);
  if (!m) return idx + 1;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : idx + 1;
}

function createFallbackPlayer(
  sport: string,
  teamId: number,
  rowIdx: number,
  participantNo: unknown,
  row: unknown[]
): Player {
  const name = String(row[2] ?? '').trim();
  const ratingRaw = Number(row[4]);
  const rating = Number.isFinite(ratingRaw) ? Math.max(1, Math.min(100, Math.round(ratingRaw))) : 50;
  const idNo = normalizeParticipantNo(participantNo) || `row-${rowIdx + 1}`;
  return {
    id: `fixed-${sport}-${teamId}-${idNo}-${rowIdx}`,
    name: name !== '' ? name : `Katılımcı ${idNo}`,
    gender: parseGender(row[5]),
    position: parsePosition(row[3]),
    rating,
    is_favorite: false,
    sport,
  };
}

export function hasFixedTeamsForSport(sport: string): boolean {
  return Boolean(FIXED_TEAM_FILES[sport]);
}

export async function loadFixedSquadForSport(sport: string, pool: Player[]): Promise<FixedSquadData | null> {
  const filename = FIXED_TEAM_FILES[sport];
  if (!filename) return null;

  const url = `${window.location.origin}/${encodeURIComponent(filename)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Sabit takım dosyası yüklenemedi (${res.status})`);

  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });

  const byParticipant = new Map<string, Player>();
  for (const p of pool) {
    const key = normalizeParticipantNo(p.excel?.participantNo);
    if (key !== '') byParticipant.set(key, p);
  }

  const usedIds = new Set<string>();
  const teams: Team[] = [];

  wb.SheetNames
    .filter((name) => /^takım\s*\d+/i.test(name.trim()))
    .forEach((sheetName, idx) => {
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];
      const teamPlayers: Player[] = [];
      const teamId = parseTeamId(sheetName, idx);

      rows.slice(1).forEach((row, rowIdx) => {
        const participantNo = normalizeParticipantNo(row[1]);
        if (participantNo === '') return;

        const fromPool = byParticipant.get(participantNo);
        const player = fromPool ?? createFallbackPlayer(sport, teamId, rowIdx, participantNo, row);
        if (usedIds.has(player.id)) return;
        usedIds.add(player.id);
        teamPlayers.push(player);
      });

      teams.push({ id: teamId, name: sheetName, players: teamPlayers });
    });

  teams.sort((a, b) => a.id - b.id);
  const teamSize = Math.max(0, ...teams.map((t) => t.players.length));
  const reserves = pool.filter((p) => !usedIds.has(p.id));
  return {
    teamSize,
    desiredTeamCount: teams.length,
    teams,
    reserves,
  };
}
