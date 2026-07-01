"use client";

import {
  Results,
  Tallies,
  Team,
  consensusChampion,
  consensusTeamsAt,
  consensusWinner,
  isLocked,
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

export function ConsensusChampionHero({
  tallies,
  results,
}: {
  tallies: Tallies;
  results: Results;
}) {
  const c = consensusChampion(tallies, results);
  return (
    <div className="mb-5 flex items-center justify-center gap-4 rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/10 to-transparent py-5">
      <span className="text-4xl">🔥</span>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-300/80">
          {c.decided ? "Champion" : "Crowd's Pick to Win It All"}
        </p>
        {c.team ? (
          <p className="flex items-center justify-center gap-2 text-2xl font-black sm:text-3xl">
            <Flag code={c.team.code} size="lg" />
            {c.team.name}
            {!c.decided && c.total > 0 && (
              <span className="text-lg font-bold text-amber-300">{c.pct}%</span>
            )}
          </p>
        ) : (
          <p className="text-2xl font-black text-white/40 sm:text-3xl">?</p>
        )}
      </div>
    </div>
  );
}

export function ConsensusBracket({
  tallies,
  results,
}: {
  tallies: Tallies;
  results: Results;
}) {
  return (
    <div className="overflow-x-auto pb-3">
      <div
        className="flex min-w-[1180px] items-stretch gap-2 sm:gap-3"
        style={{ height: 620 }}
      >
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="flex h-full flex-col">
            <div className="mb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {col.label}
            </div>
            <div className="flex flex-1 flex-col justify-around">
              {col.matches.map((m) => (
                <ConsensusBox
                  key={`${col.round}-${m}`}
                  round={col.round}
                  match={m}
                  tallies={tallies}
                  results={results}
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

function ConsensusBox({
  round,
  match,
  tallies,
  results,
  center,
}: {
  round: number;
  match: number;
  tallies: Tallies;
  results: Results;
  center?: boolean;
}) {
  const [a, b] = consensusTeamsAt(round, match, tallies, results);
  const c = consensusWinner(round, match, tallies, results);
  const decided = isLocked(round, match, results);

  const row = (team: Team | null) => {
    if (!team) {
      return (
        <div className="flex h-8 items-center gap-1.5 px-2 text-white/25">
          <span className="text-xs">—</span>
        </div>
      );
    }
    const isFav = c.team?.name === team.name;
    const teamVotes = tallies[`${round}:${match}`]?.[team.name] ?? 0;
    const teamPct = c.total > 0 ? Math.round((teamVotes / c.total) * 100) : 0;

    let cls = "text-white/70";
    let badge: React.ReactNode = null;

    if (decided && isFav) {
      cls = "bg-white/10 text-white";
      badge = <span className="ml-auto text-[9px] font-semibold text-white/45">RESULT</span>;
    } else if (decided) {
      cls = "text-white/30";
    } else if (isFav) {
      cls = "bg-amber-500/25 text-white";
      badge = (
        <span className="ml-auto text-[11px] font-black tabular-nums text-amber-300">
          {teamPct}%
        </span>
      );
    } else {
      cls = "text-white/40";
      badge =
        c.total > 0 ? (
          <span className="ml-auto text-[10px] tabular-nums text-white/30">
            {teamPct}%
          </span>
        ) : null;
    }

    return (
      <div className={`relative flex h-8 w-full items-center gap-1.5 px-2 ${cls}`}>
        {/* subtle vote bar behind the favourite */}
        {!decided && isFav && c.total > 0 && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 -z-0 bg-amber-400/10"
            style={{ width: `${teamPct}%` }}
          />
        )}
        <Flag code={team.code} />
        <span className="relative z-10 truncate text-xs font-medium">
          {team.name}
        </span>
        <span className="relative z-10 ml-auto flex items-center">{badge}</span>
      </div>
    );
  };

  const border = decided
    ? "border-white/15"
    : c.team
    ? "border-amber-400/40"
    : center
    ? "border-amber-400/30"
    : "border-white/10";

  return (
    <div
      className={`w-[132px] overflow-hidden rounded-lg border bg-white/[0.03] sm:w-[144px] ${border}`}
    >
      {row(a)}
      <div className="h-px bg-white/10" />
      {row(b)}
    </div>
  );
}
