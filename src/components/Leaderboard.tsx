"use client";

import { useCallback, useEffect, useState } from "react";
import { Results, Picks } from "@/lib/bracket";
import {
  UserScore,
  loadLeaderboard,
  searchUsers,
  loadPicks,
} from "@/lib/db";
import { Bracket, ChampionHero } from "./Bracket";

function Avatar({ score }: { score: UserScore }) {
  if (score.user_photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={score.user_photo}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-full ring-1 ring-white/20"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/70">
      {score.user_name.charAt(0).toUpperCase()}
    </div>
  );
}

function ScoreRow({
  rank,
  score,
  isMe,
  onView,
}: {
  rank?: number;
  score: UserScore;
  isMe: boolean;
  onView: () => void;
}) {
  return (
    <button
      onClick={onView}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-white/25
        ${isMe ? "border-emerald-400/40 bg-emerald-400/10" : "border-white/10 bg-white/[0.03]"}`}
    >
      {rank !== undefined && (
        <span
          className={`w-6 shrink-0 text-center text-sm font-black ${
            rank === 1
              ? "text-yellow-400"
              : rank === 2
              ? "text-slate-300"
              : rank === 3
              ? "text-amber-600"
              : "text-white/40"
          }`}
        >
          {rank}
        </span>
      )}
      <Avatar score={score} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {score.user_name}
          {isMe && <span className="ml-1.5 text-xs text-emerald-300">(you)</span>}
        </div>
        <div className="text-[11px] text-white/45">
          {score.correct}/{score.graded} correct
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-black tabular-nums">{score.pct}%</div>
      </div>
    </button>
  );
}

export default function Leaderboard({
  results,
  myUid,
  refreshSignal,
}: {
  results: Results;
  myUid: string;
  refreshSignal: number;
}) {
  const [board, setBoard] = useState<UserScore[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<UserScore[] | null>(null);
  const [viewing, setViewing] = useState<UserScore | null>(null);
  const [viewPicks, setViewPicks] = useState<Picks>({});

  const refresh = useCallback(() => {
    loadLeaderboard(10).then(setBoard);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal]);

  // debounced search
  useEffect(() => {
    if (q.trim().length < 1) {
      setFound(null);
      return;
    }
    const t = setTimeout(() => {
      searchUsers(q).then(setFound);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const openUser = async (s: UserScore) => {
    setViewing(s);
    setViewPicks({});
    setViewPicks(await loadPicks(s.user_id));
  };

  const list = found ?? board;

  return (
    <section className="mx-auto max-w-2xl">
      {/* Search */}
      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Search players by name…"
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-emerald-400/60"
        />
      </div>

      <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-white/50">
        {found ? `Search results (${found.length})` : "🏆 Top predictors"}
      </h2>

      {list.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center text-sm text-white/40">
          {found
            ? "No players found with that name."
            : "No graded predictions yet. Be the first to climb the board!"}
        </p>
      ) : (
        <div className="space-y-2">
          {list.map((s, i) => (
            <ScoreRow
              key={s.user_id}
              rank={found ? undefined : i + 1}
              score={s}
              isMe={s.user_id === myUid}
              onView={() => openUser(s)}
            />
          ))}
        </div>
      )}

      <p className="mt-3 px-1 text-xs text-white/30">
        Ranked by accuracy %, ties broken by name. Tap anyone to see their bracket.
      </p>

      {/* View a user's bracket */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setViewing(null)}
        >
          <div
            className="my-6 w-full max-w-[1500px] rounded-2xl border border-white/10 bg-[#0c0c12] p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar score={viewing} />
                <div>
                  <div className="text-lg font-black">{viewing.user_name}</div>
                  <div className="text-xs text-white/50">
                    {viewing.correct}/{viewing.graded} correct · {viewing.pct}%
                    accuracy
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
              >
                Close ✕
              </button>
            </div>
            <ChampionHero picks={viewPicks} results={results} />
            <Bracket picks={viewPicks} results={results} />
          </div>
        </div>
      )}
    </section>
  );
}
