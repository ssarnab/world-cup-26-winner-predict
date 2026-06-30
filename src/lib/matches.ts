export type Team = {
  name: string;
  flag: string; // emoji flag
};

export type Match = {
  id: string;
  round: string;
  date: string;
  teamA: Team;
  teamB: Team;
  status: "completed" | "upcoming";
  // winner team name for completed matches (so we show the result, not a vote)
  winner?: string;
};

// Data sourced from the ESPN World Cup 2026 bracket (Round of 32).
// Completed matches show the actual result; upcoming matches are votable.
export const MATCHES: Match[] = [
  // ---- Completed (results shown, not votable) ----
  {
    id: "r32-germany-paraguay",
    round: "Round of 32",
    date: "Played",
    teamA: { name: "Germany", flag: "🇩🇪" },
    teamB: { name: "Paraguay", flag: "🇵🇾" },
    status: "completed",
    winner: "Paraguay",
  },
  {
    id: "r32-southafrica-canada",
    round: "Round of 32",
    date: "Played",
    teamA: { name: "South Africa", flag: "🇿🇦" },
    teamB: { name: "Canada", flag: "🇨🇦" },
    status: "completed",
    winner: "Canada",
  },
  {
    id: "r32-brazil-japan",
    round: "Round of 32",
    date: "Played",
    teamA: { name: "Brazil", flag: "🇧🇷" },
    teamB: { name: "Japan", flag: "🇯🇵" },
    status: "completed",
    winner: "Brazil",
  },
  {
    id: "r32-netherlands-morocco",
    round: "Round of 32",
    date: "Played",
    teamA: { name: "Netherlands", flag: "🇳🇱" },
    teamB: { name: "Morocco", flag: "🇲🇦" },
    status: "completed",
    winner: "Morocco",
  },

  // ---- Upcoming (votable) ----
  {
    id: "r32-france-sweden",
    round: "Round of 32",
    date: "Jun 30, 5:00 PM",
    teamA: { name: "France", flag: "🇫🇷" },
    teamB: { name: "Sweden", flag: "🇸🇪" },
    status: "upcoming",
  },
  {
    id: "r32-ivorycoast-norway",
    round: "Round of 32",
    date: "Jun 30, 1:00 PM",
    teamA: { name: "Ivory Coast", flag: "🇨🇮" },
    teamB: { name: "Norway", flag: "🇳🇴" },
    status: "upcoming",
  },
  {
    id: "r32-mexico-ecuador",
    round: "Round of 32",
    date: "Jun 30, 9:00 PM",
    teamA: { name: "Mexico", flag: "🇲🇽" },
    teamB: { name: "Ecuador", flag: "🇪🇨" },
    status: "upcoming",
  },
  {
    id: "r32-england-congodr",
    round: "Round of 32",
    date: "Jul 1, 12:00 PM",
    teamA: { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
    teamB: { name: "Congo DR", flag: "🇨🇩" },
    status: "upcoming",
  },
  {
    id: "r32-belgium-senegal",
    round: "Round of 32",
    date: "Jul 1, 4:00 PM",
    teamA: { name: "Belgium", flag: "🇧🇪" },
    teamB: { name: "Senegal", flag: "🇸🇳" },
    status: "upcoming",
  },
  {
    id: "r32-usa-bosnia",
    round: "Round of 32",
    date: "Jul 1, 8:00 PM",
    teamA: { name: "USA", flag: "🇺🇸" },
    teamB: { name: "Bosnia-Herzegovina", flag: "🇧🇦" },
    status: "upcoming",
  },
  {
    id: "r32-spain-austria",
    round: "Round of 32",
    date: "Jul 2, 3:00 PM",
    teamA: { name: "Spain", flag: "🇪🇸" },
    teamB: { name: "Austria", flag: "🇦🇹" },
    status: "upcoming",
  },
  {
    id: "r32-portugal-croatia",
    round: "Round of 32",
    date: "Jul 2, 7:00 PM",
    teamA: { name: "Portugal", flag: "🇵🇹" },
    teamB: { name: "Croatia", flag: "🇭🇷" },
    status: "upcoming",
  },
  {
    id: "r32-switzerland-algeria",
    round: "Round of 32",
    date: "Jul 2, 11:00 PM",
    teamA: { name: "Switzerland", flag: "🇨🇭" },
    teamB: { name: "Algeria", flag: "🇩🇿" },
    status: "upcoming",
  },
  {
    id: "r32-australia-egypt",
    round: "Round of 32",
    date: "Jul 3, 2:00 PM",
    teamA: { name: "Australia", flag: "🇦🇺" },
    teamB: { name: "Egypt", flag: "🇪🇬" },
    status: "upcoming",
  },
  {
    id: "r32-argentina-capeverde",
    round: "Round of 32",
    date: "Jul 3, 6:00 PM",
    teamA: { name: "Argentina", flag: "🇦🇷" },
    teamB: { name: "Cape Verde", flag: "🇨🇻" },
    status: "upcoming",
  },
  {
    id: "r32-colombia-ghana",
    round: "Round of 32",
    date: "Jul 3, 9:30 PM",
    teamA: { name: "Colombia", flag: "🇨🇴" },
    teamB: { name: "Ghana", flag: "🇬🇭" },
    status: "upcoming",
  },
];
