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
