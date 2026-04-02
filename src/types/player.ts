export type Gender = 'male' | 'female';
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

/** Excel dosyasındaki ham satır alanları (2026 İstanbul Spor Turnuvası katılımcı listesi) */
export interface ParticipantExcelRow {
  formId: string | number;
  startTime: string;
  completionTime: string;
  email: string;
  participantNo: string | number;
  /** 2026 numaralı listede: Kısım Numarası (ör. 1513) */
  kisimNumarasi?: string | number | null;
  puanlamaRaw: string | number | null;
  dogumTarihi: string;
  statu: string;
  lokasyon: string;
  cinsiyetRaw: string;
  boyCm: number | null;
  kiloKg: number | null;
  mevkiRaw: string;
  baskinAyak: string;
  /** Futbol dışı sayfalarda "X'e katılmak ister misiniz?" cevabı */
  katilimOnayi?: string;
}

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  position: Position;
  rating: number;
  is_favorite: boolean;
  /** Excel sekme adı: Futbol, Voleybol, … */
  sport: string;
  created_at?: string;
  user_id?: string;
  /** Turnuva Excel satırı; dosyadan veya formdan doldurulur */
  excel?: ParticipantExcelRow;
}

export type TeamCategory = 'all' | 'male' | 'female';

export interface Team {
  id: number;
  name: string;
  players: Player[];
}

export interface SavedTeam {
  id: string;
  name: string;
  category: TeamCategory;
  team_size: number;
  created_at: string;
  user_id: string;
  teams: Team[];
}
