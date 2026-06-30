"use client";

import {
  Picks,
  Results,
  Team,
  champion,
  effectiveWinner,
  gradeOf,
  isLocked,
  slotKey,
  teamsAt,
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
  const champ = champion(picks, results);
  return (
    <div className="mb-5 flex items-center justify-center gap-4 rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/10 to-transparent py-5">
      <span className="text-4xl">🏆</span>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
          {results[slotKey(4, 0)] ? "Champion" : "Predicted Champion"}
        </p>
        {champ ? (
          <p className="flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
            <Flag code={champ.code} size="lg" />
            {champ.name}
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
  const readOnly = !onPick;
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
                  readOnly={readOnly}
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
  readOnly,
  center,
}: {
  round: number;
  match: number;
  picks: Picks;
  results: Results;
  onPick?: (round: number, match: number, team: string) => void;
  readOnly: boolean;
  center?: boolean;
}) {
  const [a, b] = teamsAt(round, match, picks, results);
  const locked = isLocked(round, match, results);
  const effWinner = effectiveWinner(round, match, picks, results);
  const userPick = picks[slotKey(round, match)];
  const grade = gradeOf(round, match, picks, results); // vs real result
  const bothReady = Boolean(a && b);
  const canClick = Boolean(onPick) && !readOnly && bothReady && !locked;

  const row = (team: Team | null) => {
    if (!team) {
      return (
        <div className="flex h-7 items-center gap-1.5 px-2 text-white/25">
          <span className="text-xs">—</span>
        </div>
      );
    }
    const isResultWinner = locked && results[slotKey(round, match)] === team.name;
    const isUserPick = userPick === team.name;
    const isEffWinner = effWinner?.name === team.name;
    const advanced = locked ? isResultWinner : isEffWinner;
    const dim = (locked && !isResultWinner) || (!locked && effWinner && !isEffWinner);

    return (
      <button
        type="button"
        disabled={!canClick}
        onClick={() => canClick && onPick!(round, match, team.name)}
        title={team.name}
        className={`flex h-7 w-full items-center gap-1.5 px-2 text-left transition
          ${advanced ? "bg-emerald-400/20 text-white" : "text-white/85"}
          ${dim ? "text-white/35" : ""}
          ${canClick ? "cursor-pointer hover:bg-white/10" : "cursor-default"}`}
      >
        <Flag code={team.code} />
        <span className="truncate text-xs font-medium">{team.name}</span>
        {locked && isUserPick && isResultWinner && (
          <span className="ml-auto text-emerald-300" title="You got it right">
            ✓
          </span>
        )}
        {locked && isUserPick && !isResultWinner && (
          <span className="ml-auto text-red-400" title="You picked this — wrong">
            ✗
          </span>
        )}
      </button>
    );
  };

  const border =
    grade === "correct"
      ? "border-emerald-400/40"
      : grade === "wrong"
      ? "border-red-400/40"
      : center
      ? "border-emerald-400/40 bg-emerald-400/[0.04]"
      : locked
      ? "border-white/15"
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
