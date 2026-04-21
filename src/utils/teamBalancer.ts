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

/** Futbol + Voleybol: aynı kadro denge kuralları (kaleci önceliği, veteran fazı, rating cezası, …) */
function usesAdvancedSquadRules(sport: string | undefined): boolean {
  return sport === 'Futbol' || sport === 'Voleybol';
}

type BalanceWeights = {
  vet: number;
  vetPos: number;
  female: number;
  rating: number;
  age: number;
  h: number;
  w: number;
  foot: number;
  pos: number;
  collar: number;
};

type VolleyballGenderTargets = {
  female: number[];
  male: number[];
};

/** Turnuva ceza ağırlıkları: Basketbol’da rating + boy + yaş öne çıkar */
function balanceWeights(sport: string | undefined): BalanceWeights {
  const base: BalanceWeights = {
    vet: 22,
    vetPos: 8,
    female: 22,
    rating: 52,
    age: 0.45,
    h: 0.028,
    w: 0.032,
    foot: 4,
    pos: 5,
    collar: 6,
  };
  if (sport === 'Basketbol') {
    return {
      ...base,
      vet: 5,
      vetPos: 2,
      female: 8,
      rating: 56,
      age: 1.35,
      h: 0.095,
      w: 0.018,
      foot: 1,
      pos: 2,
      collar: 2,
    };
  }
  if (sport === 'Voleybol') {
    return { ...base, female: 42 };
  }
  return base;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function buildVolleyballGenderTargets(
  players: Player[],
  caps: number[],
  sport: string | undefined
): VolleyballGenderTargets | null {
  if (sport !== 'Voleybol') return null;
  const totalSlots = caps.reduce((a, b) => a + b, 0);
  const femalePool = players.filter((p) => p.gender === 'female').length;
  const malePool = players.length - femalePool;

  const minFemaleNeeded = Math.max(0, totalSlots - malePool);
  const maxFemaleAllowed = Math.min(totalSlots, femalePool);
  const desiredFemaleTotal = Math.round(totalSlots / 2);
  const targetFemaleTotal = clamp(desiredFemaleTotal, minFemaleNeeded, maxFemaleAllowed);

  const femaleTarget = caps.map((c) => Math.floor(c / 2));
  let sumFemale = femaleTarget.reduce((a, b) => a + b, 0);

  while (sumFemale < targetFemaleTotal) {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < caps.length; i++) {
      if (femaleTarget[i] >= caps[i]) continue;
      const nextRatioDiff = Math.abs((femaleTarget[i] + 1) / caps[i] - 0.5);
      if (nextRatioDiff < bestScore || (nextRatioDiff === bestScore && i < bestIdx)) {
        bestScore = nextRatioDiff;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    femaleTarget[bestIdx]++;
    sumFemale++;
  }

  while (sumFemale > targetFemaleTotal) {
    let bestIdx = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let i = 0; i < caps.length; i++) {
      if (femaleTarget[i] <= 0) continue;
      const nextRatioDiff = Math.abs((femaleTarget[i] - 1) / caps[i] - 0.5);
      if (nextRatioDiff < bestScore || (nextRatioDiff === bestScore && i < bestIdx)) {
        bestScore = nextRatioDiff;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    femaleTarget[bestIdx]--;
    sumFemale--;
  }

  return { female: femaleTarget, male: caps.map((c, i) => c - femaleTarget[i]) };
}

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

function accMaleCount(acc: TeamAcc): number {
  return acc.players.length - acc.females;
}

function teamFemaleCount(team: Team): number {
  return team.players.reduce((acc, p) => acc + (p.gender === 'female' ? 1 : 0), 0);
}

function canPlaceVolleyballInAcc(
  acc: TeamAcc,
  teamIdx: number,
  p: Player,
  targets: VolleyballGenderTargets | null
): boolean {
  if (!targets) return true;
  if (p.gender === 'female') return acc.females < targets.female[teamIdx];
  return accMaleCount(acc) < targets.male[teamIdx];
}

function canPlaceVolleyballInTeam(
  team: Team,
  teamIdx: number,
  p: Player,
  targets: VolleyballGenderTargets | null
): boolean {
  if (!targets) return true;
  const f = teamFemaleCount(team);
  const m = team.players.length - f;
  if (p.gender === 'female') return f < targets.female[teamIdx];
  return m < targets.male[teamIdx];
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
  },
  sport?: string
): number {
  const next = cloneAcc(acc);
  addPlayer(next, p);

  const n = next.players.length;
  const sq = (x: number) => x * x;

  let pen = 0;
  const W = balanceWeights(sport);

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

function assignedIdSet(teams: TeamAcc[]): Set<string> {
  const s = new Set<string>();
  for (const t of teams) for (const p of t.players) s.add(p.id);
  return s;
}

/**
 * Veteranları takımlara mümkün olduğunca eşit: önce az veteranlı takım,
 * eşitse bu mevkide az veteranlı takım, sonra düşük toplam rating (yıldız yayılımı).
 */
function distributeVeteransEvenly(
  teams: TeamAcc[],
  caps: number[],
  veterans: Player[],
  sport?: string,
  volleyballTargets?: VolleyballGenderTargets | null
): void {
  const ordered = [...veterans].sort((a, b) => b.rating - a.rating);
  const T = teams.length;

  for (const p of ordered) {
    const pos = p.position;
    let bestIdx = -1;
    for (let i = 0; i < T; i++) {
      if (teams[i].players.length >= caps[i]) continue;
      if (usesAdvancedSquadRules(sport) && isGoalkeeperPlayer(p) && accHasGk(teams[i])) continue;
      if (!canPlaceVolleyballInAcc(teams[i], i, p, volleyballTargets ?? null)) continue;

      if (bestIdx < 0) {
        bestIdx = i;
        continue;
      }

      const a = teams[i];
      const b = teams[bestIdx];
      if (a.veterans < b.veterans) bestIdx = i;
      else if (a.veterans === b.veterans) {
        if (a.vetPos[pos] < b.vetPos[pos]) bestIdx = i;
        else if (a.vetPos[pos] === b.vetPos[pos]) {
          if (a.sumRating < b.sumRating) bestIdx = i;
          else if (a.sumRating === b.sumRating && a.players.length < b.players.length) bestIdx = i;
          else if (
            a.sumRating === b.sumRating &&
            a.players.length === b.players.length &&
            i < bestIdx
          ) {
            bestIdx = i;
          }
        }
      }
    }

    if (bestIdx >= 0) addPlayer(teams[bestIdx], p);
  }
}

/**
 * Voleybol: kadınları önce dağıt — her takımda mümkünse 2 kadın (en az kadınlı takıma öncelik).
 * Veteran/kaleci sonrası kalan kadınlar için çalışır.
 */
function distributeFemalesForVolleyball(
  teams: TeamAcc[],
  caps: number[],
  females: Player[],
  sport: string | undefined,
  volleyballTargets?: VolleyballGenderTargets | null
): void {
  if (sport !== 'Voleybol') return;
  const ordered = [...females].sort((a, b) => b.rating - a.rating);
  const T = teams.length;

  for (const p of ordered) {
    let bestIdx = -1;
    for (let i = 0; i < T; i++) {
      if (teams[i].players.length >= caps[i]) continue;
      if (usesAdvancedSquadRules(sport) && isGoalkeeperPlayer(p) && accHasGk(teams[i])) continue;
      if (!canPlaceVolleyballInAcc(teams[i], i, p, volleyballTargets ?? null)) continue;

      if (bestIdx < 0) {
        bestIdx = i;
        continue;
      }

      const a = teams[i];
      const b = teams[bestIdx];
      if (a.females < b.females) bestIdx = i;
      else if (a.females === b.females) {
        if (a.sumRating < b.sumRating) bestIdx = i;
        else if (a.sumRating === b.sumRating && a.players.length < b.players.length) bestIdx = i;
        else if (
          a.sumRating === b.sumRating &&
          a.players.length === b.players.length &&
          i < bestIdx
        ) {
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) addPlayer(teams[bestIdx], p);
  }
}

/** Futbol/Voleybol: önce takım başına en fazla 1 kaleci (liste sırası + puana göre); fazla kaleciler sahaya karışır */
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
  players: Player[],
  volleyballTargets?: VolleyballGenderTargets | null
): Player[] {
  const T = teams.length;
  const { gks, field } = splitGkField(players);
  const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
  const assignedIds = new Set<string>();
  const eligible: number[] = [];
  for (let t = 0; t < T; t++) if (caps[t] >= 1) eligible.push(t);
  const L = eligible.length;
  if (L === 0) return [...field, ...gks];
  /** En yüksek kaleci hep Takım 1’e gitmesin: takım indekslerine karışık (coprime adım) eşleme */
  let step = 7;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  while (step < 50 && gcd(step, L) !== 1) step++;
  for (let gi = 0; gi < gksSorted.length && gi < L; gi++) {
    const t = eligible[(gi * step) % L];
    const p = gksSorted[gi];
    if (!canPlaceVolleyballInAcc(teams[t], t, p, volleyballTargets ?? null)) continue;
    addPlayer(teams[t], p);
    assignedIds.add(p.id);
  }
  const restGks = gks.filter((p) => !assignedIds.has(p.id));
  return [...field, ...restGks];
}

function buildIdealPerTeam(
  players: Player[],
  teamCount: number,
  sport?: string
): {
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

  /** Voleybol: takım başına kadın/erkek dengesi (yaklaşık %50) */
  const femalesPerTeamIdeal = sport === 'Voleybol' ? 0.5 * (players.length / tc) : females / tc;

  return {
    ideal: {
      veterans: veterans / tc,
      vetPos: {
        GK: vetPos.GK / tc,
        DEF: vetPos.DEF / tc,
        MID: vetPos.MID / tc,
        FWD: vetPos.FWD / tc,
      },
      females: femalesPerTeamIdeal,
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
  const volleyballTargets = buildVolleyballGenderTargets(players, caps, sport);

  const { ideal } = buildIdealPerTeam(players, teamCount, sport);

  const teams: TeamAcc[] = Array.from({ length: teamCount }, () => emptyAcc());

  /** Futbol/Voleybol: kaleciler sabit → veteranlar → kalanlar rating/mevki/yaş dengesi */
  const poolAfterGk = usesAdvancedSquadRules(sport)
    ? pinOneGkPerFootballTeam(teams, caps, players, volleyballTargets)
    : [...players];

  const { veterans: veteranPool } = splitVeterans(poolAfterGk);
  distributeVeteransEvenly(teams, caps, veteranPool, sport, volleyballTargets);

  const afterVets = assignedIdSet(teams);
  const afterVetPool = poolAfterGk.filter((p) => !afterVets.has(p.id));
  const femalePool = afterVetPool.filter((p) => p.gender === 'female');
  distributeFemalesForVolleyball(teams, caps, femalePool, sport, volleyballTargets);

  const placed = assignedIdSet(teams);
  const remaining = poolAfterGk.filter((p) => !placed.has(p.id));
  const ordered = [...remaining].sort((a, b) => b.rating - a.rating);

  for (const p of ordered) {
    let bestIdx = -1;
    let bestPen = Number.POSITIVE_INFINITY;

    for (let i = 0; i < teamCount; i++) {
      if (teams[i].players.length >= caps[i]) continue;
      if (usesAdvancedSquadRules(sport) && isGoalkeeperPlayer(p) && accHasGk(teams[i])) continue;
      if (!canPlaceVolleyballInAcc(teams[i], i, p, volleyballTargets)) continue;
      const pen = marginalPenalty(teams[i], p, ideal, sport);
      let take = false;
      if (pen < bestPen) take = true;
      else if (pen === bestPen && bestIdx >= 0) {
        const a = teams[i];
        const b = teams[bestIdx];
        if (a.players.length < b.players.length) take = true;
        else if (a.players.length === b.players.length && a.sumRating < b.sumRating) take = true;
        else if (
          a.players.length === b.players.length &&
          a.sumRating === b.sumRating &&
          i < bestIdx
        ) {
          take = true;
        }
      }
      if (take) {
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
  const volleyballTargets = buildVolleyballGenderTargets(players, caps, sport);

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: i + 1,
    name: `Takım ${i + 1}`,
    players: [] as Player[],
  }));

  const teamRatings = Array(teamCount).fill(0);
  const globalAvgPlayerRating =
    players.length > 0 ? players.reduce((s, p) => s + p.rating, 0) / players.length : 0;

  const { ideal } = buildIdealPerTeam(players, teamCount, sport);

  let pool: Player[] = [...players];
  if (usesAdvancedSquadRules(sport)) {
    const { gks, field } = splitGkField(players);
    const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
    const assignedIds = new Set<string>();
    let gi = 0;
    for (let t = 0; t < teamCount && gi < gksSorted.length; t++) {
      if (caps[t] < 1) continue;
      const p = gksSorted[gi];
      if (!canPlaceVolleyballInTeam(teams[t], t, p, volleyballTargets)) {
        gi++;
        continue;
      }
      teams[t].players.push(p);
      teamRatings[t] += p.rating;
      assignedIds.add(p.id);
      gi++;
    }
    pool = [...field, ...gks.filter((p) => !assignedIds.has(p.id))];
  }

  if (sport === 'Voleybol') {
    const fem = pool.filter((p) => p.gender === 'female');
    const rest = pool.filter((p) => p.gender !== 'female');
    const femSorted = [...fem].sort((a, b) => b.rating - a.rating);
    const placedFem = new Set<string>();
    for (const player of femSorted) {
      const candidates = teams
        .map((t, i) => ({ i, len: t.players.length, r: teamRatings[i] }))
        .filter((x) => x.len < caps[x.i])
        .filter(
          (x) =>
            !(
              usesAdvancedSquadRules(sport) &&
              isGoalkeeperPlayer(player) &&
              teams[x.i].players.some(isGoalkeeperPlayer)
            )
        )
        .filter((x) => canPlaceVolleyballInTeam(teams[x.i], x.i, player, volleyballTargets));
      if (candidates.length === 0) continue;

      let bestIdx = -1;
      let bestKey: [number, number] = [Infinity, Infinity];
      for (const c of candidates) {
        const fc = teams[c.i].players.filter((p) => p.gender === 'female').length;
        const newLen = c.len + 1;
        const newSum = teamRatings[c.i] + player.rating;
        const targetSum = globalAvgPlayerRating * newLen;
        const pen = (newSum - targetSum) ** 2;
        const key: [number, number] = [fc, pen];
        if (
          bestIdx < 0 ||
          key[0] < bestKey[0] ||
          (key[0] === bestKey[0] && key[1] < bestKey[1]) ||
          (key[0] === bestKey[0] && key[1] === bestKey[1] && c.i < bestIdx)
        ) {
          bestKey = key;
          bestIdx = c.i;
        }
      }
      if (bestIdx < 0) continue;
      teams[bestIdx].players.push(player);
      teamRatings[bestIdx] += player.rating;
      placedFem.add(player.id);
    }
    const unplacedFem = femSorted.filter((p) => !placedFem.has(p.id));
    pool = [...rest, ...unplacedFem];
  }

  const sortedPlayers = [...pool].sort((a, b) => b.rating - a.rating);

  for (const player of sortedPlayers) {
    const candidates = teams
      .map((t, i) => ({ i, len: t.players.length, r: teamRatings[i] }))
      .filter((x) => x.len < caps[x.i])
      .filter(
        (x) =>
          !(
            usesAdvancedSquadRules(sport) &&
            isGoalkeeperPlayer(player) &&
            teams[x.i].players.some(isGoalkeeperPlayer)
          )
      )
      .filter((x) => canPlaceVolleyballInTeam(teams[x.i], x.i, player, volleyballTargets));
    if (candidates.length === 0) break;

    let bestIdx = -1;
    let bestPen = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      let pen: number;
      if (sport === 'Basketbol') {
        const acc = emptyAcc();
        for (const pl of teams[c.i].players) addPlayer(acc, pl);
        pen = marginalPenalty(acc, player, ideal, sport);
      } else {
        const newSum = c.r + player.rating;
        const newLen = c.len + 1;
        const targetSum = globalAvgPlayerRating * newLen;
        pen = (newSum - targetSum) ** 2;
      }
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
  const volleyballTargets = buildVolleyballGenderTargets(players, caps, sport);

  const { ideal } = buildIdealPerTeam(players, teamCount, sport);

  /** Basketbol: sıra karışık ama yerleştirme rating + boy + yaş dengesine göre (turnuva cezası) */
  if (sport === 'Basketbol') {
    const teamsAcc: TeamAcc[] = Array.from({ length: teamCount }, () => emptyAcc());
    const shuffledB = fisherYatesShuffle([...players]);
    for (const p of shuffledB) {
      let bestIdx = -1;
      let bestPen = Number.POSITIVE_INFINITY;
      for (let i = 0; i < teamCount; i++) {
        if (teamsAcc[i].players.length >= caps[i]) continue;
        if (!canPlaceVolleyballInAcc(teamsAcc[i], i, p, volleyballTargets)) continue;
        const pen = marginalPenalty(teamsAcc[i], p, ideal, sport);
        let take = false;
        if (pen < bestPen) take = true;
        else if (pen === bestPen && bestIdx >= 0) {
          const a = teamsAcc[i];
          const b = teamsAcc[bestIdx];
          if (a.players.length < b.players.length) take = true;
          else if (a.players.length === b.players.length && a.sumRating < b.sumRating) take = true;
          else if (
            a.players.length === b.players.length &&
            a.sumRating === b.sumRating &&
            i < bestIdx
          ) {
            take = true;
          }
        }
        if (take) {
          bestPen = pen;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) addPlayer(teamsAcc[bestIdx], p);
    }
    const outTeams: Team[] = teamsAcc.map((t, i) => ({
      id: i + 1,
      name: `Takım ${i + 1}`,
      players: fisherYatesShuffle(t.players),
    }));
    const allAssigned = outTeams.flatMap((t) => t.players);
    const reserves = players.filter((p) => !allAssigned.includes(p));
    return { teams: outTeams, reserves };
  }

  const teams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
    id: i + 1,
    name: `Takım ${i + 1}`,
    players: [] as Player[],
  }));

  let pool: Player[] = [...players];
  if (usesAdvancedSquadRules(sport)) {
    const { gks, field } = splitGkField(players);
    const gksSorted = [...gks].sort((a, b) => b.rating - a.rating);
    const assignedIds = new Set<string>();
    let gi = 0;
    for (let t = 0; t < teamCount && gi < gksSorted.length; t++) {
      if (caps[t] < 1) continue;
      const p = gksSorted[gi];
      if (!canPlaceVolleyballInTeam(teams[t], t, p, volleyballTargets)) {
        gi++;
        continue;
      }
      teams[t].players.push(p);
      assignedIds.add(p.id);
      gi++;
    }
    pool = [...field, ...gks.filter((p) => !assignedIds.has(p.id))];
  }

  if (sport === 'Voleybol') {
    const fem = pool.filter((p) => p.gender === 'female');
    const rest = pool.filter((p) => p.gender !== 'female');
    const femShuf = fisherYatesShuffle(fem);
    const unplacedFem: Player[] = [];
    for (const p of femShuf) {
      let bestI = -1;
      let bestFc = Infinity;
      for (let i = 0; i < teamCount; i++) {
        if (teams[i].players.length >= caps[i]) continue;
        if (
          usesAdvancedSquadRules(sport) &&
          isGoalkeeperPlayer(p) &&
          teams[i].players.some(isGoalkeeperPlayer)
        ) {
          continue;
        }
        const fc = teams[i].players.filter((x) => x.gender === 'female').length;
        if (!canPlaceVolleyballInTeam(teams[i], i, p, volleyballTargets)) continue;
        if (fc < bestFc || (fc === bestFc && (bestI < 0 || i < bestI))) {
          bestFc = fc;
          bestI = i;
        }
      }
      if (bestI >= 0) teams[bestI].players.push(p);
      else unplacedFem.push(p);
    }
    pool = fisherYatesShuffle([...rest, ...unplacedFem]);
  }

  const shuffled = fisherYatesShuffle(pool);

  let rr = 0;
  for (const p of shuffled) {
    let placed = false;
    for (let tries = 0; tries < teamCount && !placed; tries++) {
      const i = (rr + tries) % teamCount;
      if (teams[i].players.length >= caps[i]) continue;
      if (
        usesAdvancedSquadRules(sport) &&
        isGoalkeeperPlayer(p) &&
        teams[i].players.some(isGoalkeeperPlayer)
      ) {
        continue;
      }
      if (!canPlaceVolleyballInTeam(teams[i], i, p, volleyballTargets)) continue;
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
