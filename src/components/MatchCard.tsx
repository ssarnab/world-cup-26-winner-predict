"use client";

import { Match, Team } from "@/lib/matches";

type Props = {
  match: Match;
  counts: Record<string, number>; // team name -> vote count
  myPick?: string;
  onVote: (matchId: string, team: string) => void;
  busy: boolean;
};

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export default function MatchCard({ match, counts, myPick, onVote, busy }: Props) {
  const total = (counts[match.teamA.name] ?? 0) + (counts[match.teamB.name] ?? 0);
  const hasVoted = Boolean(myPick) || match.status === "completed";

  const renderTeam = (team: Team, accent: string) => {
    const votes = counts[team.name] ?? 0;
    const percentage = pct(votes, total);
    const isMyPick = myPick === team.name;
    const isWinner = match.winner === team.name;
    const dimmed = match.status === "completed" && !isWinner;

    return (
      <button
        key={team.name}
        disabled={hasVoted || busy}
        onClick={() => onVote(match.id, team.name)}
        className={`group relative w-full overflow-hidden rounded-xl border px-4 py-3 text-left transition
          ${
            isMyPick || isWinner
              ? "border-emerald-400/70 bg-emerald-400/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
          }
          ${hasVoted ? "cursor-default" : "cursor-pointer"}
          ${dimmed ? "opacity-50" : ""}
          disabled:cursor-default`}
      >
        {/* live percentage fill */}
        {hasVoted && (
          <span
            aria-hidden
            className="absolute inset-y-0 left-0 -z-0 rounded-xl transition-all duration-500"
            style={{
              width: `${percentage}%`,
              background: `linear-gradient(90deg, ${accent}33, ${accent}14)`,
            }}
          />
        )}

        <span className="relative z-10 flex items-center justify-between gap-3">
          <span className="flex items-center gap-3">
            <span className="text-2xl leading-none">{team.flag}</span>
            <span className="font-medium">{team.name}</span>
            {isMyPick && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Your pick
              </span>
            )}
            {isWinner && (
              <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Winner
              </span>
            )}
          </span>
          {hasVoted && match.status !== "completed" && (
            <span className="relative z-10 text-sm font-semibold tabular-nums text-white/80">
              {percentage}%
            </span>
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 shadow-lg shadow-black/30">
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] uppercase tracking-wider text-white/40">
        <span>{match.round}</span>
        <span>{match.date}</span>
      </div>
      <div className="flex flex-col gap-2">
        {renderTeam(match.teamA, "#22c55e")}
        {renderTeam(match.teamB, "#3b82f6")}
      </div>
      {hasVoted && match.status !== "completed" && (
        <div className="mt-2 px-1 text-[11px] text-white/35">
          {total} {total === 1 ? "vote" : "votes"}
        </div>
      )}
    </div>
  );
}
