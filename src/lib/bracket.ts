export type Team = {
  name: string;
  abbr: string;
  code: string; // ISO 3166-1 alpha-2 (flagcdn). England uses "gb-eng".
};

// 32 teams in bracket order (ESPN World Cup 2026 bracket).
// Left half = indices 0..15, right half = indices 16..31.
// Each consecutive pair is one Round-of-32 match.
export const SEEDS: Team[] = [
  // ----- Left half -----
  { name: "Germany", abbr: "GER", code: "de" },
  { name: "Paraguay", abbr: "PAR", code: "py" },
  { name: "France", abbr: "FRA", code: "fr" },
  { name: "Sweden", abbr: "SWE", code: "se" },
  { name: "South Africa", abbr: "RSA", code: "za" },
  { name: "Canada", abbr: "CAN", code: "ca" },
  { name: "Netherlands", abbr: "NED", code: "nl" },
  { name: "Morocco", abbr: "MAR", code: "ma" },
  { name: "Portugal", abbr: "POR", code: "pt" },
  { name: "Croatia", abbr: "CRO", code: "hr" },
  { name: "Spain", abbr: "ESP", code: "es" },
  { name: "Austria", abbr: "AUT", code: "at" },
  { name: "USA", abbr: "USA", code: "us" },
  { name: "Bosnia", abbr: "BIH", code: "ba" },
  { name: "Belgium", abbr: "BEL", code: "be" },
  { name: "Senegal", abbr: "SEN", code: "sn" },
  // ----- Right half -----
  { name: "Brazil", abbr: "BRA", code: "br" },
  { name: "Japan", abbr: "JPN", code: "jp" },
  { name: "Ivory Coast", abbr: "CIV", code: "ci" },
  { name: "Norway", abbr: "NOR", code: "no" },
  { name: "Mexico", abbr: "MEX", code: "mx" },
  { name: "Ecuador", abbr: "ECU", code: "ec" },
  { name: "England", abbr: "ENG", code: "gb-eng" },
  { name: "Congo DR", abbr: "COD", code: "cd" },
  { name: "Argentina", abbr: "ARG", code: "ar" },
  { name: "Cape Verde", abbr: "CPV", code: "cv" },
  { name: "Australia", abbr: "AUS", code: "au" },
  { name: "Egypt", abbr: "EGY", code: "eg" },
  { name: "Switzerland", abbr: "SUI", code: "ch" },
  { name: "Algeria", abbr: "ALG", code: "dz" },
  { name: "Colombia", abbr: "COL", code: "co" },
  { name: "Ghana", abbr: "GHA", code: "gh" },
];

export type RoundMeta = { key: string; name: string; short: string; matches: number };

// roundIndex: 0=R32, 1=R16, 2=QF, 3=SF, 4=Final
export const ROUNDS: RoundMeta[] = [
  { key: "r32", name: "Round of 32", short: "R32", matches: 16 },
  { key: "r16", name: "Round of 16", short: "R16", matches: 8 },
  { key: "qf", name: "Quarterfinal", short: "QF", matches: 4 },
  { key: "sf", name: "Semifinal", short: "SF", matches: 2 },
  { key: "final", name: "Final", short: "F", matches: 1 },
];

export const FINAL_ROUND = ROUNDS.length - 1; // 4
export const TOTAL_MATCHES = ROUNDS.reduce((s, r) => s + r.matches, 0); // 31

export const slotKey = (round: number, match: number) => `${round}:${match}`;

// Round-of-32 kickoff times in Bangladesh time (UTC+6). Once a match has
// kicked off, its prediction locks. Later rounds aren't scheduled yet.
export const KICKOFFS: Record<number, string> = {
  0: "2026-06-30T02:30:00+06:00", // Germany vs Paraguay
  1: "2026-07-01T03:00:00+06:00", // France vs Sweden
  2: "2026-06-29T01:00:00+06:00", // South Africa vs Canada
  3: "2026-06-30T07:00:00+06:00", // Netherlands vs Morocco
  4: "2026-07-03T05:00:00+06:00", // Portugal vs Croatia
  5: "2026-07-03T01:00:00+06:00", // Spain vs Austria
  6: "2026-07-02T06:00:00+06:00", // USA vs Bosnia
  7: "2026-07-02T02:00:00+06:00", // Belgium vs Senegal
  8: "2026-06-29T23:00:00+06:00", // Brazil vs Japan
  9: "2026-06-30T23:00:00+06:00", // Ivory Coast vs Norway
  10: "2026-07-01T07:00:00+06:00", // Mexico vs Ecuador
  11: "2026-07-01T22:00:00+06:00", // England vs Congo DR
  12: "2026-07-04T04:00:00+06:00", // Argentina vs Cape Verde
  13: "2026-07-04T00:00:00+06:00", // Australia vs Egypt
  14: "2026-07-03T09:00:00+06:00", // Switzerland vs Algeria
  15: "2026-07-04T07:30:00+06:00", // Colombia vs Ghana
};

export function kickoffOf(round: number, m: number): string | null {
  return round === 0 ? KICKOFFS[m] ?? null : null;
}

/** Has this match kicked off yet (BD time)? nowMs defaults to Date.now(). */
export function hasStarted(round: number, m: number, nowMs = Date.now()): boolean {
  const k = kickoffOf(round, m);
  return k ? nowMs >= new Date(k).getTime() : false;
}

/** Prediction is editable only before kickoff and before a result exists. */
export function canPredict(
  round: number,
  m: number,
  results: Results,
  nowMs = Date.now()
): boolean {
  return !results[slotKey(round, m)] && !hasStarted(round, m, nowMs);
}

export type Picks = Record<string, string>; // "round:match" -> team the user picked
export type Results = Record<string, string>; // "round:match" -> actual winner

const byName = new Map(SEEDS.map((t) => [t.name, t]));
export function teamByName(name: string): Team | undefined {
  return byName.get(name);
}

function pickTeam(a: Team | null, b: Team | null, name?: string): Team | null {
  if (!name) return null;
  if (a && a.name === name) return a;
  if (b && b.name === name) return b;
  return null;
}

/** The two teams contesting a match, derived from earlier advancers. */
export function teamsAt(
  round: number,
  m: number,
  picks: Picks,
  results: Results
): [Team | null, Team | null] {
  if (round === 0) {
    return [SEEDS[m * 2] ?? null, SEEDS[m * 2 + 1] ?? null];
  }
  return [
    effectiveWinner(round - 1, m * 2, picks, results),
    effectiveWinner(round - 1, m * 2 + 1, picks, results),
  ];
}

/** The team that advances from this match:
 *  - the user's own pick if they made one (their bracket / their prediction), else
 *  - the real winner if the match is already decided (outside their prediction).
 *  Validated against the current matchup so stale picks auto-clear. */
export function effectiveWinner(
  round: number,
  m: number,
  picks: Picks,
  results: Results
): Team | null {
  const [a, b] = teamsAt(round, m, picks, results);
  const key = slotKey(round, m);
  return pickTeam(a, b, picks[key]) ?? pickTeam(a, b, results[key]);
}

/** A match is locked (not predictable) once it has an official result. */
export function isLocked(round: number, m: number, results: Results): boolean {
  return Boolean(results[slotKey(round, m)]);
}

export function champion(picks: Picks, results: Results): Team | null {
  return effectiveWinner(FINAL_ROUND, 0, picks, results);
}

// ---------- Consensus ("fan favourite") bracket ----------
// tallies[slot][teamName] = how many people predicted that team to win that slot.
export type Tallies = Record<string, Record<string, number>>;
export type Consensus = {
  team: Team | null;
  votes: number; // votes for the favourite
  total: number; // votes for either of the two teams in this match
  pct: number; // votes / total
  decided: boolean; // true when the match already has a real result
};

export function consensusTeamsAt(
  round: number,
  m: number,
  tallies: Tallies,
  results: Results
): [Team | null, Team | null] {
  if (round === 0) {
    return [SEEDS[m * 2] ?? null, SEEDS[m * 2 + 1] ?? null];
  }
  return [
    consensusWinner(round - 1, m * 2, tallies, results).team,
    consensusWinner(round - 1, m * 2 + 1, tallies, results).team,
  ];
}

/** The crowd favourite for a slot: the real winner if decided, otherwise
 *  whichever of the two teams more people predicted to win here. */
export function consensusWinner(
  round: number,
  m: number,
  tallies: Tallies,
  results: Results
): Consensus {
  const [a, b] = consensusTeamsAt(round, m, tallies, results);
  const key = slotKey(round, m);

  if (results[key]) {
    return { team: pickTeam(a, b, results[key]), votes: 0, total: 0, pct: 0, decided: true };
  }

  const tally = tallies[key] ?? {};
  const va = a ? tally[a.name] ?? 0 : 0;
  const vb = b ? tally[b.name] ?? 0 : 0;
  const total = va + vb;
  if (total === 0) {
    return { team: null, votes: 0, total: 0, pct: 0, decided: false };
  }
  const team = va >= vb ? a : b;
  const votes = Math.max(va, vb);
  return { team, votes, total, pct: Math.round((votes / total) * 100), decided: false };
}

export function consensusChampion(tallies: Tallies, results: Results): Consensus {
  return consensusWinner(FINAL_ROUND, 0, tallies, results);
}

// ---------- Grading (compare the user's pick to the real result) ----------
export type Grade = "correct" | "wrong" | null;

export function gradeOf(
  round: number,
  m: number,
  picks: Picks,
  results: Results
): Grade {
  const key = slotKey(round, m);
  const winner = results[key];
  const pick = picks[key];
  if (!winner || !pick) return null; // no result yet, or user never picked it
  return pick === winner ? "correct" : "wrong";
}

/** Whether a match has an official result. */
export function hasResult(round: number, m: number, results: Results): boolean {
  return Boolean(results[slotKey(round, m)]);
}

/** Totals across the whole bracket for one user. */
export function score(picks: Picks, results: Results) {
  let correct = 0;
  let graded = 0;
  ROUNDS.forEach((r, round) => {
    for (let m = 0; m < r.matches; m++) {
      const g = gradeOf(round, m, picks, results);
      if (g === null) continue;
      graded++;
      if (g === "correct") correct++;
    }
  });
  const pct = graded > 0 ? Math.round((correct / graded) * 100) : 0;
  return { correct, graded, wrong: graded - correct, pct };
}

/** How many valid predictions the user has made (their pick is one of the two
 *  teams currently in that match). Decided matches they never picked don't count. */
export function decidedCount(picks: Picks, results: Results): number {
  let n = 0;
  ROUNDS.forEach((r, round) => {
    for (let m = 0; m < r.matches; m++) {
      const [a, b] = teamsAt(round, m, picks, results);
      const p = picks[slotKey(round, m)];
      if (p && (a?.name === p || b?.name === p)) n++;
    }
  });
  return n;
}
