import type { Team, Player } from '../types/player';

export interface SquadSnapshotV1 {
  version: 1;
  sport: string;
  teamSize: number;
  desiredTeamCount: number;
  teams: Team[];
  reserves: Player[];
  updatedAt: string;
}

export function squadKey(sport: string): string {
  return `mba-squad-v1-${sport}`;
}

export function loadSquad(sport: string): SquadSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(squadKey(sport));
    if (!raw) return null;
    const data = JSON.parse(raw) as SquadSnapshotV1;
    if (data?.version !== 1 || !Array.isArray(data.teams)) return null;
    return data;
  } catch {
    return null;
  }
}

export function saveSquad(
  partial: Omit<SquadSnapshotV1, 'version' | 'updatedAt'> & { updatedAt?: string }
): void {
  const payload: SquadSnapshotV1 = {
    version: 1,
    sport: partial.sport,
    teamSize: partial.teamSize,
    desiredTeamCount: partial.desiredTeamCount,
    teams: partial.teams,
    reserves: partial.reserves,
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(squadKey(partial.sport), JSON.stringify(payload));
  window.dispatchEvent(new Event('mba-squad-updated'));
}

export function clearSquad(sport: string): void {
  localStorage.removeItem(squadKey(sport));
  window.dispatchEvent(new Event('mba-squad-updated'));
}
