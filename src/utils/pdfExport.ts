import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Team, Player } from '../types/player';

const FONT_VFS_NAME = 'NotoSans-Regular.ttf';
const FONT_FAMILY = 'NotoSans';

let notoFontBase64: string | null = null;

const positionOrder: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

function sortedByPosition(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const pa = positionOrder[a.position] ?? 99;
    const pb = positionOrder[b.position] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.rating - a.rating;
  });
}

function positionCounts(players: Player[]): { GK: number; DEF: number; MID: number; FWD: number } {
  const c = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) {
    if (p.position === 'GK') c.GK++;
    else if (p.position === 'DEF') c.DEF++;
    else if (p.position === 'MID') c.MID++;
    else if (p.position === 'FWD') c.FWD++;
  }
  return c;
}

function positionSummary(players: Player[]): string {
  const c = positionCounts(players);
  return `Kaleci ${c.GK} · Defans ${c.DEF} · Orta Saha ${c.MID} · Forvet ${c.FWD}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function ensureNotoFont(doc: jsPDF): Promise<void> {
  if (!notoFontBase64) {
    const base = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const res = await fetch(`${base}fonts/NotoSans-Regular.ttf`);
    if (!res.ok) {
      throw new Error(`Font alınamadı (${res.status})`);
    }
    const buf = await res.arrayBuffer();
    notoFontBase64 = arrayBufferToBase64(buf);
  }
  doc.addFileToVFS(FONT_VFS_NAME, notoFontBase64);
  doc.addFont(FONT_VFS_NAME, FONT_FAMILY, 'normal');
  doc.setFont(FONT_FAMILY, 'normal');
}

const tableFont = { font: FONT_FAMILY, fontStyle: 'normal' as const };

export async function exportTeamsToPDF(
  teams: Team[],
  reserves: Player[],
  groupName: string = 'Takımlar'
): Promise<void> {
  const doc = new jsPDF();
  await ensureNotoFont(doc);

  doc.setFontSize(20);
  doc.setFont(FONT_FAMILY, 'normal');
  doc.text('MBA Spor - Takım Listesi', 105, 15, { align: 'center' });

  doc.setFontSize(12);
  doc.text(groupName, 105, 25, { align: 'center' });
  doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 105, 32, { align: 'center' });

  let yPosition = 45;

  teams.forEach((team) => {
    if (yPosition > 250) {
      doc.addPage();
      doc.setFont(FONT_FAMILY, 'normal');
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text(team.name, 14, yPosition);

    const n = team.players.length;
    const avgRating = n > 0 ? Math.round(team.players.reduce((sum, p) => sum + p.rating, 0) / n) : 0;
    doc.setFontSize(10);
    doc.text(`Ortalama Rating: ${avgRating}`, 14, yPosition + 6);
    doc.text(positionSummary(team.players), 14, yPosition + 11);

    yPosition += 17;

    const tableData = sortedByPosition(team.players).map((player, idx) => [
      (idx + 1).toString(),
      player.excel ? String(player.excel.participantNo) : '-',
      player.name,
      getPositionName(player.position),
      player.rating.toString(),
      player.gender === 'male' ? 'Erkek' : 'Kadın',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Kat. No', 'Ad Soyad', 'Pozisyon', 'Rating', 'Cinsiyet']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], ...tableFont },
      styles: { fontSize: 9, ...tableFont },
      bodyStyles: tableFont,
      margin: { left: 14 },
    });

    yPosition = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  });

  if (reserves.length > 0) {
    if (yPosition > 220) {
      doc.addPage();
      doc.setFont(FONT_FAMILY, 'normal');
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.text('Yedek Oyuncular', 14, yPosition);
    yPosition += 8;

    const reserveData = sortedByPosition(reserves).map((player, idx) => [
      (idx + 1).toString(),
      player.excel ? String(player.excel.participantNo) : '-',
      player.name,
      getPositionName(player.position),
      player.rating.toString(),
      player.gender === 'male' ? 'Erkek' : 'Kadın',
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Kat. No', 'Ad Soyad', 'Pozisyon', 'Rating', 'Cinsiyet']],
      body: reserveData,
      theme: 'grid',
      headStyles: { fillColor: [234, 179, 8], ...tableFont },
      styles: { fontSize: 9, ...tableFont },
      bodyStyles: tableFont,
      margin: { left: 14 },
    });
  }

  doc.save(`MBA-Futbol-Takimlar-${Date.now()}.pdf`);
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
