"use client";

import { useCallback, useEffect, useState } from "react";
import { Results, Picks } from "@/lib/bracket";
import {
  UserScore,
  loadLeaderboard,
  loadAllUsers,
  loadPicks,
} from "@/lib/db";
import { Bracket, ChampionHero } from "./Bracket";

const PAGE_SIZE = 10;

function Avatar({ score }: { score: UserScore }) {
  if (score.user_photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={score.user_photo}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 rounded-full ring-1 ring-border"
      />
    );
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-border text-xs font-bold text-fg-muted">
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
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-fg-subtle
        ${isMe ? "border-emerald-400/40 bg-emerald-400/10" : "border-border bg-surface"}`}
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
              : "text-fg-subtle"
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
        <div className="text-[11px] text-fg-muted">
          {score.graded > 0
            ? `${score.correct}/${score.graded} correct`
            : "no results yet"}
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-black tabular-nums">
          {score.graded > 0 ? `${score.pct}%` : "—"}
        </div>
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
  const [top, setTop] = useState<UserScore[]>([]);

  const [all, setAll] = useState<UserScore[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");

  const [viewing, setViewing] = useState<UserScore | null>(null);
  const [viewPicks, setViewPicks] = useState<Picks>({});

  // Top 10 (no search)
  useEffect(() => {
    loadLeaderboard(10).then(setTop);
  }, [refreshSignal]);

  // All players (search + pagination)
  const fetchAll = useCallback(() => {
    loadAllUsers(page, PAGE_SIZE, q).then(({ rows, total }) => {
      setAll(rows);
      setTotal(total);
    });
  }, [page, q]);

  useEffect(() => {
    const t = setTimeout(fetchAll, 200);
    return () => clearTimeout(t);
  }, [fetchAll, refreshSignal]);

  // reset to first page whenever the search term changes
  useEffect(() => {
    setPage(0);
  }, [q]);

  const openUser = async (s: UserScore) => {
    setViewing(s);
    setViewPicks({});
    setViewPicks(await loadPicks(s.user_id));
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto max-w-2xl">
      {/* ---- Top predictors (top 10, no search) ---- */}
      <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-fg-muted">
        🏆 Top predictors
      </h2>
      {top.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-fg-subtle">
          No graded predictions yet — be the first to top the board!
        </p>
      ) : (
        <div className="space-y-2">
          {top.map((s, i) => (
            <ScoreRow
              key={s.user_id}
              rank={i + 1}
              score={s}
              isMe={s.user_id === myUid}
              onView={() => openUser(s)}
            />
          ))}
        </div>
      )}
      <p className="mt-2 px-1 text-xs text-fg-subtle">
        Ranked by accuracy %, ties broken by name. Top 10 only.
      </p>

      {/* ---- All players (search + pagination) ---- */}
      <div className="mt-9 mb-3 flex items-center justify-between gap-3">
        <h2 className="px-1 text-sm font-semibold uppercase tracking-wider text-fg-muted">
          All players ({total})
        </h2>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search all players by name…"
        className="mb-3 w-full rounded-xl border border-border bg-input px-4 py-2.5 text-sm outline-none placeholder:text-fg-subtle focus:border-emerald-400/60"
      />

      {all.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-5 text-center text-sm text-fg-subtle">
          {q ? "No players match that name." : "No players yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {all.map((s) => (
            <ScoreRow
              key={s.user_id}
              score={s}
              isMe={s.user_id === myUid}
              onView={() => openUser(s)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-fg-subtle hover:text-fg disabled:opacity-30"
          >
            ← Prev
          </button>
          <span className="text-fg-muted">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-fg-subtle hover:text-fg disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}

      <p className="mt-3 px-1 text-xs text-fg-subtle">
        Tap anyone to see their full bracket.
      </p>

      {/* ---- View a user's bracket ---- */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setViewing(null)}
        >
          <div
            className="my-6 w-full max-w-[1500px] rounded-2xl border border-border bg-surface-2 p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar score={viewing} />
                <div>
                  <div className="text-lg font-black">{viewing.user_name}</div>
                  <div className="text-xs text-fg-muted">
                    {viewing.graded > 0
                      ? `${viewing.correct}/${viewing.graded} correct · ${viewing.pct}% accuracy`
                      : "No graded predictions yet"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-fg-muted transition hover:border-fg-subtle hover:text-fg"
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
