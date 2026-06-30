"use client";

import {
  Picks,
  Results,
  Team,
  champion,
  gradeOf,
  hasResult,
  slotKey,
  teamsAt,
  winnerAt,
} from "@/lib/bracket";
import { Flag } from "./Flag";

type Col = { label: string; round: number; matches: number[]; center?: boolean };
const COLUMNS: Col[] = [
  { label: "R32", round: 0, matches: [0, 1, 2, 3, 4, 5, 6, 7] },
  { label: "R16", round: 1, matches: [0, 1, 2, 3] },
  { label: "QF", round: 2, matches: [0, 1] },
  { label: "SF", round: 3, matches: [0] },
  { label: "Final", round: 4, matches: [0], center: true },
  { label: "SF", round: 3, matches: [1] },
  { label: "QF", round: 2, matches: [2, 3] },
  { label: "R16", round: 1, matches: [4, 5, 6, 7] },
  { label: "R32", round: 0, matches: [8, 9, 10, 11, 12, 13, 14, 15] },
];

export function ChampionHero({
  picks,
  results,
}: {
  picks: Picks;
  results: Results;
}) {
  const champ = champion(picks);
  const grade = gradeOf(4, 0, picks, results);
  const ring =
    grade === "correct"
      ? "border-emerald-400/50"
      : grade === "wrong"
      ? "border-red-400/40"
      : "border-emerald-400/20";
  return (
    <div
      className={`mb-5 flex items-center justify-center gap-4 rounded-2xl border bg-gradient-to-b from-emerald-400/10 to-transparent py-5 ${ring}`}
    >
      <span className="text-4xl">🏆</span>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
          Predicted Champion
        </p>
        {champ ? (
          <p className="flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
            <Flag code={champ.code} size="lg" />
            {champ.name}
            {grade === "correct" && <span className="text-emerald-400">✓</span>}
            {grade === "wrong" && <span className="text-red-400">✗</span>}
          </p>
        ) : (
          <p className="text-2xl font-black text-white/40 sm:text-3xl">?</p>
        )}
      </div>
    </div>
  );
}

export function Bracket({
  picks,
  results,
  onPick,
}: {
  picks: Picks;
  results: Results;
  onPick?: (round: number, match: number, team: string) => void;
}) {
  return (
    <div className="overflow-x-auto pb-3">
      <div
        className="flex min-w-[1180px] items-stretch gap-2 sm:gap-3"
        style={{ height: 560 }}
      >
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="flex h-full flex-col">
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {col.label}
            </div>
            <div className="flex flex-1 flex-col justify-around">
              {col.matches.map((m) => (
                <MatchBox
                  key={`${col.round}-${m}`}
                  round={col.round}
                  match={m}
                  picks={picks}
                  results={results}
                  onPick={onPick}
                  center={col.center}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchBox({
  round,
  match,
  picks,
  results,
  onPick,
  center,
}: {
  round: number;
  match: number;
  picks: Picks;
  results: Results;
  onPick?: (round: number, match: number, team: string) => void;
  center?: boolean;
}) {
  const [a, b] = teamsAt(round, match, picks);
  const userPick = winnerAt(round, match, picks);
  const grade = gradeOf(round, match, picks, results); // correct | wrong | null
  const decided = hasResult(round, match, results);
  const actualWinner = results[slotKey(round, match)];
  const bothReady = Boolean(a && b);
  const canClick = Boolean(onPick) && bothReady;

  const row = (team: Team | null) => {
    if (!team) {
      return (
        <div className="flex h-7 items-center gap-1.5 px-2 text-white/25">
          <span className="text-xs">—</span>
        </div>
      );
    }
    const isPick = userPick?.name === team.name;
    const isActualWinner = decided && actualWinner === team.name;

    // colour rules
    let cls = "text-white/85";
    let badge: React.ReactNode = null;
    if (isPick && grade === "correct") {
      cls = "bg-emerald-500/25 text-white";
      badge = <span className="ml-auto font-bold text-emerald-300">✓</span>;
    } else if (isPick && grade === "wrong") {
      cls = "bg-red-500/25 text-white";
      badge = <span className="ml-auto font-bold text-red-400">✗</span>;
    } else if (isPick) {
      cls = "bg-emerald-400/15 text-white"; // selected, no result yet
    } else if (isActualWinner) {
      // the real winner that the user did NOT pick — show the right answer
      cls = "text-emerald-300/80";
      badge = <span className="ml-auto text-[10px] text-emerald-300/80">won</span>;
    } else if (userPick) {
      cls = "text-white/35"; // the eliminated side of a decided pick
    }

    return (
      <button
        type="button"
        disabled={!canClick}
        onClick={() => canClick && onPick!(round, match, team.name)}
        title={team.name}
        className={`flex h-7 w-full items-center gap-1.5 px-2 text-left transition
          ${cls}
          ${canClick ? "cursor-pointer hover:bg-white/10" : "cursor-default"}`}
      >
        <Flag code={team.code} />
        <span className="truncate text-xs font-medium">{team.name}</span>
        {badge}
      </button>
    );
  };

  const border =
    grade === "correct"
      ? "border-emerald-400/50"
      : grade === "wrong"
      ? "border-red-400/50"
      : center
      ? "border-emerald-400/40"
      : "border-white/10";

  return (
    <div
      className={`w-[128px] overflow-hidden rounded-lg border bg-white/[0.03] sm:w-[140px] ${border}`}
    >
      {row(a)}
      <div className="h-px bg-white/10" />
      {row(b)}
    </div>
  );
}
