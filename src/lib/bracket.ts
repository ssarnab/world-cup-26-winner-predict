export type Team = {
  name: string;
  abbr: string;
  code: string; // ISO 3166-1 alpha-2 (flagcdn), e.g. "br". England uses "gb-eng".
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

// Completed Round-of-32 results (ESPN). Key = R32 match index, value = winner.
// These are locked: users see the real result and cannot change them.
export const RESULTS: Record<number, string> = {
  0: "Paraguay", // Germany 1 (3) vs Paraguay 1 (4) — pens
  2: "Canada", // South Africa 0 vs Canada 1
  3: "Morocco", // Netherlands 1 (2) vs Morocco 1 (3) — pens
  8: "Brazil", // Brazil 2 vs Japan 1
};

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

// picks key helper
export const slotKey = (round: number, match: number) => `${round}:${match}`;

export type Picks = Record<string, string>; // "round:match" -> winning team name

const byName = new Map(SEEDS.map((t) => [t.name, t]));

/** A completed R32 match cannot be re-picked. */
export function isLocked(round: number, match: number): boolean {
  return round === 0 && match in RESULTS;
}

/** Locked results as a picks object, used to seed initial state. */
export const LOCKED_PICKS: Picks = Object.fromEntries(
  Object.entries(RESULTS).map(([m, winner]) => [slotKey(0, Number(m)), winner])
);

/** The two teams contesting a given match, derived from earlier picks. */
export function teamsAt(
  round: number,
  match: number,
  picks: Picks
): [Team | null, Team | null] {
  if (round === 0) {
    return [SEEDS[match * 2] ?? null, SEEDS[match * 2 + 1] ?? null];
  }
  return [
    winnerAt(round - 1, match * 2, picks),
    winnerAt(round - 1, match * 2 + 1, picks),
  ];
}

/** The winner of a match, but only if the stored pick is still one of the
 *  two valid teams. This auto-invalidates stale downstream picks when an
 *  upstream selection changes. */
export function winnerAt(round: number, match: number, picks: Picks): Team | null {
  const [a, b] = teamsAt(round, match, picks);
  const picked = picks[slotKey(round, match)];
  if (!picked) return null;
  if (a && picked === a.name) return a;
  if (b && picked === b.name) return b;
  return null;
}

export function champion(picks: Picks): Team | null {
  return winnerAt(FINAL_ROUND, 0, picks);
}

export function teamByName(name: string): Team | undefined {
  return byName.get(name);
}

/** How many matches in total across all rounds. */
export const TOTAL_MATCHES = ROUNDS.reduce((s, r) => s + r.matches, 0); // 31
