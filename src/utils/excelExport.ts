import * as XLSX from 'xlsx';
import type { Player, Team } from '../types/player';

const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

function sortedByPosition(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const pa = positionOrder[a.position] ?? 99;
    const pb = positionOrder[b.position] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.rating - a.rating;
  });
}

function getPositionName(position: string): string {
  const positions: Record<string, string> = {
    GK: 'Kaleci',
    DEF: 'Defans',
    MID: 'Orta Saha',
    FWD: 'Forvet',
  };
  return positions[position] || position;
}

function addTeamSheet(wb: XLSX.WorkBook, team: Team): void {
  const rows = sortedByPosition(team.players).map((player, idx) => ({
    Sira: idx + 1,
    KatilimciNo: player.excel?.participantNo ?? '-',
    AdSoyad: player.name,
    Pozisyon: getPositionName(player.position),
    Rating: player.rating,
    Cinsiyet: player.gender === 'male' ? 'Erkek' : 'Kadın',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, team.name.slice(0, 31));
}

export function exportTeamsToExcel(
  teams: Team[],
  reserves: Player[],
  groupName: string = 'Takımlar'
): void {
  const wb = XLSX.utils.book_new();

  const summaryRows = teams.map((team, idx) => {
    const count = team.players.length;
    const avgRating =
      count > 0 ? Math.round(team.players.reduce((sum, p) => sum + p.rating, 0) / count) : 0;
    return {
      Sira: idx + 1,
      Takim: team.name,
      OyuncuSayisi: count,
      OrtalamaRating: avgRating,
    };
  });

  summaryRows.push({
    Sira: summaryRows.length + 1,
    Takim: 'Yedek Havuzu',
    OyuncuSayisi: reserves.length,
    OrtalamaRating:
      reserves.length > 0 ? Math.round(reserves.reduce((sum, p) => sum + p.rating, 0) / reserves.length) : 0,
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wb, summarySheet, 'Ozet');

  for (const team of teams) {
    addTeamSheet(wb, team);
  }

  if (reserves.length > 0) {
    const reserveRows = sortedByPosition(reserves).map((player, idx) => ({
      Sira: idx + 1,
      KatilimciNo: player.excel?.participantNo ?? '-',
      AdSoyad: player.name,
      Pozisyon: getPositionName(player.position),
      Rating: player.rating,
      Cinsiyet: player.gender === 'male' ? 'Erkek' : 'Kadın',
    }));
    const reserveSheet = XLSX.utils.json_to_sheet(reserveRows);
    XLSX.utils.book_append_sheet(wb, reserveSheet, 'Yedekler');
  }

  const sanitizedGroup = groupName.replace(/[\\/:*?"<>|]/g, '-');
  XLSX.writeFile(wb, `${sanitizedGroup}-${Date.now()}.xlsx`);
}
