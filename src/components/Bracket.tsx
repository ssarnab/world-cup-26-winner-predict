"use client";

import {
  Picks,
  Results,
  Team,
  champion,
  effectiveWinner,
  gradeOf,
  hasStarted,
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
          {isLocked(4, 0, results) ? "Champion" : "Predicted Champion"}
        </p>
        {champ ? (
          <p className="flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
            <Flag code={champ.code} size="lg" />
            {champ.name}
            {grade === "correct" && <span className="text-emerald-400">✓</span>}
            {grade === "wrong" && <span className="text-red-400">✗</span>}
          </p>
        ) : (
          <p className="text-2xl font-black text-fg-subtle sm:text-3xl">?</p>
        )}
      </div>
    </div>
  );
}

export function Bracket({
  picks,
  results,
  onPick,
  now = Date.now(),
}: {
  picks: Picks;
  results: Results;
  onPick?: (round: number, match: number, team: string) => void;
  now?: number;
}) {
  return (
    <div className="overflow-x-auto pb-3">
      <div
        className="flex min-w-[1180px] items-stretch gap-2 sm:gap-3"
        style={{ height: 560 }}
      >
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="flex h-full flex-col">
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
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
                  now={now}
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
  now = Date.now(),
  center,
}: {
  round: number;
  match: number;
  picks: Picks;
  results: Results;
  onPick?: (round: number, match: number, team: string) => void;
  now?: number;
  center?: boolean;
}) {
  const key = slotKey(round, match);
  const [a, b] = teamsAt(round, match, picks, results);
  const effWinner = effectiveWinner(round, match, picks, results);
  const locked = isLocked(round, match, results);
  const started = !locked && hasStarted(round, match, now); // kicked off, no result yet
  const grade = gradeOf(round, match, picks, results); // correct | wrong | null
  const actualWinner = results[key];

  const rawPick = picks[key];
  const validPick = Boolean(rawPick && (a?.name === rawPick || b?.name === rawPick));
  const bothReady = Boolean(a && b);
  // started matches stay clickable so the tap shows the "locked" warning
  const canClick = Boolean(onPick) && bothReady && !locked;

  const row = (team: Team | null) => {
    if (!team) {
      return (
        <div className="flex h-7 items-center gap-1.5 px-2 text-fg-subtle">
          <span className="text-xs">—</span>
        </div>
      );
    }
    const isUserPick = rawPick === team.name;
    const isRealWinner = locked && actualWinner === team.name;
    const isEff = effWinner?.name === team.name;

    let cls = "text-fg";
    let badge: React.ReactNode = null;

    if (isUserPick && grade === "correct") {
      cls = "bg-emerald-500/25 text-fg";
      badge = <span className="ml-auto font-bold text-emerald-300">✓</span>;
    } else if (isUserPick && grade === "wrong") {
      cls = "bg-red-500/25 text-fg line-through decoration-red-400/60";
      badge = <span className="ml-auto font-bold text-red-400">✗</span>;
    } else if (isUserPick) {
      // your prediction, no result yet — distinct blue
      cls = "bg-blue-500/25 text-fg";
      badge = <span className="ml-auto text-[9px] font-semibold text-blue-300">PICK</span>;
    } else if (isRealWinner) {
      // real winner you didn't pick (already decided, outside your prediction)
      cls = "text-fg";
      badge = <span className="ml-auto text-[9px] font-semibold text-fg-subtle">WON</span>;
    } else if (effWinner && !isEff) {
      cls = "text-fg-subtle";
    }

    return (
      <button
        type="button"
        disabled={!canClick}
        onClick={() => canClick && onPick!(round, match, team.name)}
        title={team.name}
        className={`flex h-7 w-full items-center gap-1.5 px-2 text-left transition
          ${cls}
          ${canClick ? "cursor-pointer hover:bg-hover" : "cursor-default"}`}
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
      : started
      ? "border-amber-400/30"
      : validPick && !locked
      ? "border-blue-400/40"
      : locked
      ? "border-border"
      : center
      ? "border-emerald-400/40"
      : "border-border";

  return (
    <div
      className={`relative w-[128px] overflow-hidden rounded-lg border bg-surface sm:w-[140px] ${border}`}
    >
      {started && (
        <span
          className="absolute right-1 top-1 z-20 text-[10px]"
          title="Match has started — locked"
        >
          🔒
        </span>
      )}
      {row(a)}
      <div className="h-px bg-border" />
      {row(b)}
    </div>
  );
}
