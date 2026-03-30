import type { Player, Position, Team } from '../types/player';
import { fisherYatesShuffle } from './playerGenerator';
import {
  footKindFromAyak,
  inferCollarType,
  isGoalkeeperPlayer,
  isVeteranPlayer,
  playerAgeYears,
  type CollarType,
  type FootKind,
} from './playerDerivedStats';

export type BalanceMode = 'shuffle' | 'rating' | 'tournament';

const POS_LIST: Position[] = ['GK', 'DEF', 'MID', 'FWD'];

interface TeamAcc {
  players: Player[];
  veterans: number;
  /** Takımdaki veteranların mevkilere göre dağılımı */
  vetPos: Record<Position, number>;
  females: number;
  sumRating: number;
  sumAge: number;
  ageCount: number;
  sumHeight: number;
  hCount: number;
  sumWeight: number;
  wCount: number;
  leftF: number;
  rightF: number;
  bothF: number;
  pos: Record<Position, number>;
  white: number;
  blue: number;
  unk: number;
}

function emptyAcc(): TeamAcc {
  return {
    players: [],
    veterans: 0,
    vetPos: { GK: 0, DEF: 0, MID: 0, FWD: 0 },
    females: 0,
    sumRating: 0,
    sumAge: 0,
    ageCount: 0,
    sumHeight: 0,
    hCount: 0,
    sumWeight: 0,
    wCount: 0,
    leftF: 0,
    rightF: 0,
    bothF: 0,
    pos: { GK: 0, DEF: 0, MID: 0, FWD: 0 },
    white: 0,
    blue: 0,
    unk: 0,
  };
}

function cloneAcc(a: TeamAcc): TeamAcc {
  return {
    ...a,
    players: [...a.players],
    pos: { ...a.pos },
    vetPos: { ...a.vetPos },
  };
}

function addPlayer(acc: TeamAcc, p: Player): void {
  acc.players.push(p);
  if (isVeteranPlayer(p)) {
    acc.veterans++;
    acc.vetPos[p.position]++;
  }
  if (p.gender === 'female') acc.females++;
  acc.sumRating += p.rating;

  const age = playerAgeYears(p);
  if (age != null) {
    acc.sumAge += age;
    acc.ageCount++;
  }

  const ex = p.excel;
  if (ex?.boyCm != null) {
    acc.sumHeight += ex.boyCm;
    acc.hCount++;
  }
  if (ex?.kiloKg != null) {
    acc.sumWeight += ex.kiloKg;
    acc.wCount++;
  }

  const fk = footKindFromAyak(ex?.baskinAyak ?? '');
  if (fk === 'left') acc.leftF++;
  else if (fk === 'right') acc.rightF++;
  else if (fk === 'both') acc.bothF++;

  acc.pos[p.position]++;

  const c: CollarType = inferCollarType(ex?.statu ?? '');
  if (c === 'white') acc.white++;
  else if (c === 'blue') acc.blue++;
  else acc.unk++;
}

function marginalPenalty(
  acc: TeamAcc,
  p: Player,
  ideal: {
    veterans: number;
    vetPos: Record<Position, number>;
    females: number;
    /** Havuzdaki oyuncu rating ortalaması; n kişilik kadro hedef toplamı = n × bu değer */
    globalAvgPlayerRating: number;
    avgAge: number;
    globalAvgHeight: number;
    globalAvgWeight: number;
    left: number;
    right: number;
    both: number;
    pos: Record<Position, number>;
    white: number;
    blue: number;
  }
): number {
  const next = cloneAcc(acc);
  addPlayer(next, p);

  const n = next.players.length;
  const sq = (x: number) => x * x;

  let pen = 0;
  const W = {
    vet: 45,
    /** Veteranların mevkilere göre de eşit dağılması (örn. veteran DEF'ler her takıma yayılır) */
    vetPos: 18,
    female: 28,
    /** Ortalama rating dengeyi güçlendirir (diğer eksenlerle yarışır) */
    rating: 1.05,
    age: 1.2,
    h: 0.04,
    w: 0.045,
    foot: 6,
    /** Mevki dağılımı futbol için kritik: GK/DEF/MID/FWD takım başına dengeli */
    pos: 14,
    collar: 10,
  };

  pen += W.vet * sq(next.veterans - ideal.veterans);
  for (const pos of POS_LIST) {
    pen += W.vetPos * sq(next.vetPos[pos] - ideal.vetPos[pos]);
  }
  pen += W.female * sq(next.females - ideal.females);
  const targetSumRating = ideal.globalAvgPlayerRating * n;
  pen += W.rating * sq(next.sumRating - targetSumRating);

  const newAvgAge = next.ageCount > 0 ? next.sumAge / next.ageCount : ideal.avgAge;
  pen += W.age * sq(newAvgAge - ideal.avgAge);

  const newAvgH = next.hCount > 0 ? next.sumHeight / next.hCount : ideal.globalAvgHeight;
  const newAvgW = next.wCount > 0 ? next.sumWeight / next.wCount : ideal.globalAvgWeight;
  pen += W.h * sq(newAvgH - ideal.globalAvgHeight) * Math.max(1, n);
  pen += W.w * sq(newAvgW - ideal.globalAvgWeight) * Math.max(1, n);

  pen += W.foot * sq(next.leftF - ideal.left);
  pen += W.foot * sq(next.rightF - ideal.right);
  pen += W.foot * sq(next.bothF - ideal.both);

  for (const pos of POS_LIST) {
    pen += W.pos * sq(next.pos[pos] - ideal.pos[pos]);
  }

  pen += W.collar * sq(next.white - ideal.white);
  pen += W.collar * sq(next.blue - ideal.blue);

  return pen;
}

function splitGkField(players: Player[]): { gks: Player[]; field: Player[] } {
  const gks: Player[] = [];
  const field: Player[] = [];
  for (const p of players) {
    (isGoalkeeperPlayer(p) ? gks : field).push(p);
  }
  return { gks, field };
}

function accHasGk(acc: TeamAcc): boolean {
  return acc.players.some(isGoalkeeperPlayer);
}

function splitVeterans(players: Player[]): { veterans: Player[]; nonVeterans: Player[] } {
  const veterans: Player[] = [];
  const nonVeterans: Player[] = [];
  for (const p of players) {
    (isVeteranPlayer(p) ? veterans : nonVeterans).push(p);
  }
  return { veterans, nonVeterans };
}

/**
 * Veteranları mümkün olduğunca eşit dağıt:
 * - Her adımda veteran sayısı en az olan takımı seç
 * - Kapasiteyi ve (Futbol) takım başına 1 kaleci kuralını bozma
 */
function distributeVeteransEvenly(
  teams: TeamAcc[],
  caps: number[],
  veterans: Player[],
  sport?: string
): void {
  const ordered = [...veterans].sort((a, b) => b.rating - a.rating);
  const T = teams.length;

  for (const p of ordered) {
    let bestIdx = -1;
    for (let i = 0; i < T; i++) {
      if (teams[i].players.length >= caps[i]) continue;
      if (sport === 'Futbol' && isGoalkeeperPlayer(p) && accHasGk(teams[i])) continue;

      if (bestIdx < 0) {
        bestIdx = i;
        continue;
      }

      const a = teams[i];
      const b = teams[bestIdx];
      if (a.veterans < b.veterans) bestIdx = i;
      else if (a.veterans === b.veterans) {
        if (a.players.length < b.players.length) bestIdx = i;
        else if (a.players.length === b.players.length && i < bestIdx) bestIdx = i;
      }
    }

    if (bestIdx >= 0) addPlayer(teams[bestIdx], p);
  }
}

/** Futbol: önce takım başına en fazla 1 kaleci (liste sırası + puana göre); fazla kaleciler sahaya karışır */
/** n oyuncuyu T takıma üst sınır maxPerTeam ile mümkün olduğunca eşit böler (sum = min(n, T*max)) */
export function getTeamSlotCaps(totalPlayers: number, teamCount: number, maxPerTeam: number): number[] {
  const T = Math.max(1, teamCount);
  const assign = Math.min(totalPlayers, T * maxPerTeam);
  const base = Math.floor(assign / T);
  const rem = assign % T;
  return Array.from({ length: T }, (_, i) => (i < rem ? base + 1 : base));
}

function pinOneGkPerFootballTeam(
  teams: TeamAcc[],
  caps: number[],
  players: Player[]
): Player[] {
  const T = teams.length;
  const { gks, field } = splitGkField(players);
  const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
  const assignedIds = new Set<string>();
  let gi = 0;
  for (let t = 0; t < T && gi < gksSorted.length; t++) {
    if (caps[t] < 1) continue;
    const p = gksSorted[gi];
    addPlayer(teams[t], p);
    assignedIds.add(p.id);
    gi++;
  }
  const restGks = gks.filter((p) => !assignedIds.has(p.id));
  return [...field, ...restGks];
}

function buildIdealPerTeam(players: Player[], teamCount: number): {
  ideal: {
    veterans: number;
    vetPos: Record<Position, number>;
    females: number;
    globalAvgPlayerRating: number;
    avgAge: number;
    globalAvgHeight: number;
    globalAvgWeight: number;
    left: number;
    right: number;
    both: number;
    pos: Record<Position, number>;
    white: number;
    blue: number;
  };
} {
  let veterans = 0,
    females = 0,
    sumRating = 0,
    sumAge = 0,
    ageCount = 0,
    sumH = 0,
    hCount = 0,
    sumW = 0,
    wCount = 0,
    left = 0,
    right = 0,
    both = 0,
    white = 0,
    blue = 0;
  const pos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const vetPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

  for (const p of players) {
    if (isVeteranPlayer(p)) {
      veterans++;
      vetPos[p.position]++;
    }
    if (p.gender === 'female') females++;
    sumRating += p.rating;
    const age = playerAgeYears(p);
    if (age != null) {
      sumAge += age;
      ageCount++;
    }
    const ex = p.excel;
    if (ex?.boyCm != null) {
      sumH += ex.boyCm;
      hCount++;
    }
    if (ex?.kiloKg != null) {
      sumW += ex.kiloKg;
      wCount++;
    }
    const fk: FootKind = footKindFromAyak(ex?.baskinAyak ?? '');
    if (fk === 'left') left++;
    else if (fk === 'right') right++;
    else if (fk === 'both') both++;
    pos[p.position]++;
    const c = inferCollarType(ex?.statu ?? '');
    if (c === 'white') white++;
    else if (c === 'blue') blue++;
  }

  const tc = Math.max(1, teamCount);
  const avgAge = ageCount > 0 ? sumAge / ageCount : 0;
  const globalAvgHeight = hCount > 0 ? sumH / hCount : 0;
  const globalAvgWeight = wCount > 0 ? sumW / wCount : 0;
  const globalAvgPlayerRating = players.length > 0 ? sumRating / players.length : 0;

  return {
    ideal: {
      veterans: veterans / tc,
      vetPos: {
        GK: vetPos.GK / tc,
        DEF: vetPos.DEF / tc,
        MID: vetPos.MID / tc,
        FWD: vetPos.FWD / tc,
      },
      females: females / tc,
      globalAvgPlayerRating,
      avgAge,
      globalAvgHeight,
      globalAvgWeight,
      left: left / tc,
      right: right / tc,
      both: both / tc,
      pos: {
        GK: pos.GK / tc,
        DEF: pos.DEF / tc,
        MID: pos.MID / tc,
        FWD: pos.FWD / tc,
      },
      white: white / tc,
      blue: blue / tc,
    },
  };
}

function resolveTeamCount(
  playersLen: number,
  teamSize: number,
  maxTeams: number | undefined,
  fixedTeamCount: number | undefined
): number {
  if (fixedTeamCount != null && fixedTeamCount > 0) {
    let t = fixedTeamCount;
    if (maxTeams != null && maxTeams > 0) t = Math.min(t, maxTeams);
    return Math.max(1, t);
  }
  let teamCount = Math.floor(playersLen / teamSize);
  if (maxTeams != null && maxTeams > 0) {
    teamCount = Math.min(teamCount, maxTeams);
  }
  return Math.max(0, teamCount);
}

function generateTournamentTeams(
  players: Player[],
  teamSize: number,
  maxTeams?: number,
  sport?: string,
  fixedTeamCount?: number
): { teams: Team[]; reserves: Player[] } {
  if (players.length === 0) return { teams: [], reserves: [] };

  const teamCount = resolveTeamCount(players.length, teamSize, maxTeams, fixedTeamCount);
  if (teamCount < 1) return { teams: [], reserves: [...players] };

  const caps = getTeamSlotCaps(players.length, teamCount, teamSize);

  const { ideal } = buildIdealPerTeam(players, teamCount);

  const teams: TeamAcc[] = Array.from({ length: teamCount }, () => emptyAcc());

  const poolForPhase2 =
    sport === 'Futbol' ? pinOneGkPerFootballTeam(teams, caps, players) : [...players];

  // Faz 1: Veteranları olabildiğince eşit yay (kural: herkesin veteran sayısı yakın olsun)
  const { veterans: veteranPool, nonVeterans: nonVeteranPool } = splitVeterans(poolForPhase2);
  distributeVeteransEvenly(teams, caps, veteranPool, sport);

  // Faz 2: Kalan oyuncuları çok eksenli dengeyle doldur
  const ordered = [...nonVeteranPool].sort((a, b) => b.rating - a.rating);

  for (const p of ordered) {
    let bestIdx = -1;
    let bestPen = Number.POSITIVE_INFINITY;

    for (let i = 0; i < teamCount; i++) {
      if (teams[i].players.length >= caps[i]) continue;
      if (sport === 'Futbol' && isGoalkeeperPlayer(p) && accHasGk(teams[i])) continue;
      const pen = marginalPenalty(teams[i], p, ideal);
      if (pen < bestPen || (pen === bestPen && (bestIdx < 0 || teams[i].players.length < teams[bestIdx].players.length))) {
        bestPen = pen;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      addPlayer(teams[bestIdx], p);
    }
  }

  const allAssigned = teams.flatMap((t) => t.players);
  const reserves = players.filter((p) => !allAssigned.includes(p));

  const outTeams: Team[] = teams.map((t, i) => ({
    id: i + 1,
    name: `Takım ${i + 1}`,
    players: fisherYatesShuffle(t.players),
  }));

  return { teams: outTeams, reserves };
}

function generateRatingTeams(
  players: Player[],
  teamSize: number,
  maxTeams?: number,
  sport?: string,
  fixedTeamCount?: number
): { teams: Team[]; reserves: Player[] } {
  if (players.length === 0) return { teams: [], reserves: [] };

  const teamCount = resolveTeamCount(players.length, teamSize, maxTeams, fixedTeamCount);
  if (teamCount < 1) return { teams: [], reserves: [...players] };

  const caps = getTeamSlotCaps(players.length, teamCount, teamSize);

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: i + 1,
    name: `Takım ${i + 1}`,
    players: [] as Player[],
  }));

  const teamRatings = Array(teamCount).fill(0);
  const globalAvgPlayerRating =
    players.length > 0 ? players.reduce((s, p) => s + p.rating, 0) / players.length : 0;

  let pool: Player[] = [...players];
  if (sport === 'Futbol') {
    const { gks, field } = splitGkField(players);
    const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
    const assignedIds = new Set<string>();
    let gi = 0;
    for (let t = 0; t < teamCount && gi < gksSorted.length; t++) {
      if (caps[t] < 1) continue;
      const p = gksSorted[gi];
      teams[t].players.push(p);
      teamRatings[t] += p.rating;
      assignedIds.add(p.id);
      gi++;
    }
    pool = [...field, ...gks.filter((p) => !assignedIds.has(p.id))];
  }

  const sortedPlayers = [...pool].sort((a, b) => b.rating - a.rating);

  for (const player of sortedPlayers) {
    const candidates = teams
      .map((t, i) => ({ i, len: t.players.length, r: teamRatings[i] }))
      .filter((x) => x.len < caps[x.i])
      .filter(
        (x) =>
          !(
            sport === 'Futbol' &&
            isGoalkeeperPlayer(player) &&
            teams[x.i].players.some(isGoalkeeperPlayer)
          )
      );
    if (candidates.length === 0) break;

    let bestIdx = -1;
    let bestPen = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const newSum = c.r + player.rating;
      const newLen = c.len + 1;
      const targetSum = globalAvgPlayerRating * newLen;
      const pen = (newSum - targetSum) ** 2;
      if (pen < bestPen) {
        bestPen = pen;
        bestIdx = c.i;
      } else if (pen === bestPen && bestIdx >= 0) {
        if (c.r < teamRatings[bestIdx] || (c.r === teamRatings[bestIdx] && c.i < bestIdx)) {
          bestIdx = c.i;
        }
      }
    }
    if (bestIdx < 0) break;
    teams[bestIdx].players.push(player);
    teamRatings[bestIdx] += player.rating;
  }

  const allAssignedPlayers = teams.flatMap((t) => t.players);
  const reserves = players.filter((p) => !allAssignedPlayers.includes(p));

  teams.forEach((team) => {
    team.players = fisherYatesShuffle(team.players);
  });

  return { teams, reserves };
}

function generateShuffleTeams(
  players: Player[],
  teamSize: number,
  maxTeams?: number,
  sport?: string,
  fixedTeamCount?: number
): { teams: Team[]; reserves: Player[] } {
  if (players.length === 0) return { teams: [], reserves: [] };

  const teamCount = resolveTeamCount(players.length, teamSize, maxTeams, fixedTeamCount);
  if (teamCount < 1) return { teams: [], reserves: [...players] };

  const caps = getTeamSlotCaps(players.length, teamCount, teamSize);

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: i + 1,
    name: `Takım ${i + 1}`,
    players: [] as Player[],
  }));

  let pool: Player[] = [...players];
  if (sport === 'Futbol') {
    const { gks, field } = splitGkField(players);
    const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
    const assignedIds = new Set<string>();
    let gi = 0;
    for (let t = 0; t < teamCount && gi < gksSorted.length; t++) {
      if (caps[t] < 1) continue;
      const p = gksSorted[gi];
      teams[t].players.push(p);
      assignedIds.add(p.id);
      gi++;
    }
    pool = [...field, ...gks.filter((p) => !assignedIds.has(p.id))];
  }

  const shuffled = fisherYatesShuffle(pool);

  let rr = 0;
  for (const p of shuffled) {
    let placed = false;
    for (let tries = 0; tries < teamCount && !placed; tries++) {
      const i = (rr + tries) % teamCount;
      if (teams[i].players.length >= caps[i]) continue;
      if (sport === 'Futbol' && isGoalkeeperPlayer(p) && teams[i].players.some(isGoalkeeperPlayer)) {
        continue;
      }
      teams[i].players.push(p);
      rr = (i + 1) % teamCount;
      placed = true;
    }
  }

  const allAssigned = teams.flatMap((t) => t.players);
  const reserves = players.filter((p) => !allAssigned.includes(p));

  teams.forEach((team) => {
    team.players = fisherYatesShuffle(team.players);
  });

  return { teams, reserves };
}

export function generateBalancedTeams(
  players: Player[],
  teamSize: number,
  mode: BalanceMode = 'shuffle',
  opts?: { maxTeams?: number; sport?: string; teamCount?: number }
): { teams: Team[]; reserves: Player[] } {
  const maxTeams = opts?.maxTeams;
  const sport = opts?.sport;
  const fixedTeamCount = opts?.teamCount;
  if (mode === 'tournament') {
    return generateTournamentTeams(players, teamSize, maxTeams, sport, fixedTeamCount);
  }
  if (mode === 'rating') {
    return generateRatingTeams(players, teamSize, maxTeams, sport, fixedTeamCount);
  }
  return generateShuffleTeams(players, teamSize, maxTeams, sport, fixedTeamCount);
}

export function calculateTeamRating(players: Player[]): number {
  if (players.length === 0) return 0;
  const total = players.reduce((sum, p) => sum + p.rating, 0);
  return Math.round(total / players.length);
}
