export type Team = {
  name: string;
  abbr: string;
  flag: string; // emoji flag
};

// 32 teams in bracket order (ESPN World Cup 2026 bracket).
// Left half = indices 0..15, right half = indices 16..31.
// Each consecutive pair is one Round-of-32 match.
export const SEEDS: Team[] = [
  // ----- Left half -----
  { name: "Germany", abbr: "GER", flag: "🇩🇪" },
  { name: "Paraguay", abbr: "PAR", flag: "🇵🇾" },
  { name: "France", abbr: "FRA", flag: "🇫🇷" },
  { name: "Sweden", abbr: "SWE", flag: "🇸🇪" },
  { name: "South Africa", abbr: "RSA", flag: "🇿🇦" },
  { name: "Canada", abbr: "CAN", flag: "🇨🇦" },
  { name: "Netherlands", abbr: "NED", flag: "🇳🇱" },
  { name: "Morocco", abbr: "MAR", flag: "🇲🇦" },
  { name: "Portugal", abbr: "POR", flag: "🇵🇹" },
  { name: "Croatia", abbr: "CRO", flag: "🇭🇷" },
  { name: "Spain", abbr: "ESP", flag: "🇪🇸" },
  { name: "Austria", abbr: "AUT", flag: "🇦🇹" },
  { name: "USA", abbr: "USA", flag: "🇺🇸" },
  { name: "Bosnia", abbr: "BIH", flag: "🇧🇦" },
  { name: "Belgium", abbr: "BEL", flag: "🇧🇪" },
  { name: "Senegal", abbr: "SEN", flag: "🇸🇳" },
  // ----- Right half -----
  { name: "Brazil", abbr: "BRA", flag: "🇧🇷" },
  { name: "Japan", abbr: "JPN", flag: "🇯🇵" },
  { name: "Ivory Coast", abbr: "CIV", flag: "🇨🇮" },
  { name: "Norway", abbr: "NOR", flag: "🇳🇴" },
  { name: "Mexico", abbr: "MEX", flag: "🇲🇽" },
  { name: "Ecuador", abbr: "ECU", flag: "🇪🇨" },
  { name: "England", abbr: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Congo DR", abbr: "COD", flag: "🇨🇩" },
  { name: "Argentina", abbr: "ARG", flag: "🇦🇷" },
  { name: "Cape Verde", abbr: "CPV", flag: "🇨🇻" },
  { name: "Australia", abbr: "AUS", flag: "🇦🇺" },
  { name: "Egypt", abbr: "EGY", flag: "🇪🇬" },
  { name: "Switzerland", abbr: "SUI", flag: "🇨🇭" },
  { name: "Algeria", abbr: "ALG", flag: "🇩🇿" },
  { name: "Colombia", abbr: "COL", flag: "🇨🇴" },
  { name: "Ghana", abbr: "GHA", flag: "🇬🇭" },
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

// picks key helper
export const slotKey = (round: number, match: number) => `${round}:${match}`;

export type Picks = Record<string, string>; // "round:match" -> winning team name

const byName = new Map(SEEDS.map((t) => [t.name, t]));

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

/** How many of the user's picks are locked in (out of 31 total matches). */
export const TOTAL_MATCHES = ROUNDS.reduce((s, r) => s + r.matches, 0); // 31
