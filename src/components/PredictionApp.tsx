"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Picks,
  Results,
  slotKey,
  isLocked,
  score,
  decidedCount,
  TOTAL_MATCHES,
} from "@/lib/bracket";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/useAuth";
import { loadResults, loadPicks, savePick, Identity } from "@/lib/db";
import { Bracket, ChampionHero } from "./Bracket";
import Leaderboard from "./Leaderboard";
import ChampionRace from "./ChampionRace";

const PICKS_KEY = "wc26_bracket_picks";

export default function PredictionApp() {
  const { user, loading, error: authError, login, logout } = useAuth();
  const name = user?.displayName ?? user?.email ?? "Player";

  const [results, setResults] = useState<Results>({});
  const [picks, setPicks] = useState<Picks>({});
  const [tab, setTab] = useState<"bracket" | "board">("bracket");
  const [refreshSignal, setRefreshSignal] = useState(0);
  const savedReady = useRef(false);

  const identity: Identity | null = user
    ? { uid: user.uid, name, photo: user.photoURL ?? null }
    : null;

  // Load results once configured
  useEffect(() => {
    loadResults().then(setResults);
  }, []);

  // Load this user's saved picks (DB first, localStorage as instant cache)
  useEffect(() => {
    if (!user) return;
    savedReady.current = false;
    try {
      const cached = JSON.parse(
        localStorage.getItem(`${PICKS_KEY}_${user.uid}`) ?? "{}"
      );
      setPicks(cached);
    } catch {
      setPicks({});
    }
    loadPicks(user.uid).then((dbPicks) => {
      setPicks(dbPicks);
      localStorage.setItem(`${PICKS_KEY}_${user.uid}`, JSON.stringify(dbPicks));
      savedReady.current = true;
    });
  }, [user]);

  // Realtime: results change → re-grade; any prediction change → refresh board
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const ch = supabase
      .channel("live-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_results" },
        () => loadResults().then(setResults)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        () => setRefreshSignal((n) => n + 1)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const handlePick = useCallback(
    (round: number, match: number, team: string) => {
      if (!identity || isLocked(round, match, results)) return;
      setPicks((prev) => {
        const next = { ...prev, [slotKey(round, match)]: team };
        localStorage.setItem(
          `${PICKS_KEY}_${identity.uid}`,
          JSON.stringify(next)
        );
        return next;
      });
      savePick(identity, round, match, team);
    },
    [results, identity]
  );

  const myScore = useMemo(() => score(picks, results), [picks, results]);
  const decided = useMemo(() => decidedCount(picks, results), [picks, results]);

  // ---------- Auth gates ----------
  if (!isFirebaseConfigured) {
    return (
      <Centered>
        <h1 className="text-2xl font-black">Almost there</h1>
        <p className="mt-3 text-sm text-amber-300/90">
          ⚠️ Firebase keys missing. Add the <code>NEXT_PUBLIC_FIREBASE_*</code>{" "}
          values to <code>.env.local</code> to enable Google login.
        </p>
      </Centered>
    );
  }
  if (loading) {
    return (
      <Centered>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-emerald-400" />
      </Centered>
    );
  }
  if (!user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 py-12 text-center">
        <div className="mb-4 text-6xl">🏆</div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
          FIFA World Cup 2026™
        </p>
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent sm:text-5xl">
          Predict the Knockout Bracket
        </h1>
        <p className="mt-4 max-w-md text-base text-white/60">
          Pick the winner of every match — from the Round of 32 all the way to
          the Final — build your own bracket and crown your World Champion. As
          real results come in, see which of your picks were right and climb the
          global leaderboard. 🌍⚽
        </p>
        <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-3">
          {[
            { icon: "🗳️", title: "Pick winners", sub: "Tap a team to advance" },
            { icon: "✅", title: "Get graded", sub: "Right vs wrong" },
            { icon: "📊", title: "Leaderboard", sub: "Rank by accuracy" },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="text-xl">{f.icon}</div>
              <div className="mt-1 text-xs font-semibold text-white/90">
                {f.title}
              </div>
              <div className="text-[10px] text-white/45">{f.sub}</div>
            </div>
          ))}
        </div>
        <button
          onClick={login}
          className="mt-8 flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-black/30 transition hover:bg-white/90"
        >
          <GoogleIcon />
          Sign in with Google to start
        </button>
        <p className="mt-3 text-xs text-white/35">
          Free · sign in saves your bracket. Not affiliated with FIFA.
        </p>
        {authError && <p className="mt-4 text-xs text-red-300/90">{authError}</p>}
      </main>
    );
  }

  // ---------- Signed in ----------
  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 pb-16 pt-6 sm:px-5">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
            FIFA World Cup 2026™
          </p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Bracket Predictor
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          {user.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full ring-1 ring-white/20"
            />
          )}
          <span className="hidden text-white/70 sm:inline">{name}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        <TabButton active={tab === "bracket"} onClick={() => setTab("bracket")}>
          🧩 My Bracket
        </TabButton>
        <TabButton active={tab === "board"} onClick={() => setTab("board")}>
          🏆 Leaderboard
        </TabButton>
      </div>

      {tab === "bracket" ? (
        <>
          {/* Stats strip */}
          <div className="mb-2 grid grid-cols-3 gap-3">
            <StatCard
              big={myScore.graded > 0 ? `${myScore.pct}%` : "—"}
              label="Correct"
              accent="emerald"
            />
            <StatCard
              big={myScore.graded > 0 ? `${100 - myScore.pct}%` : "—"}
              label="Wrong"
              accent="red"
            />
            <StatCard big={`${decided}/${TOTAL_MATCHES}`} label="Predicted" />
          </div>
          <p className="mb-5 text-center text-xs text-white/45">
            {myScore.graded > 0 ? (
              <>
                <span className="text-emerald-300">
                  ✓ {myScore.correct} correct
                </span>{" "}
                ·{" "}
                <span className="text-red-300">✗ {myScore.wrong} wrong</span> ·{" "}
                {myScore.graded} of your picks decided so far
              </>
            ) : (
              "Fill your bracket — accuracy shows up as real results come in."
            )}
          </p>

          {/* Legend */}
          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-blue-500/50" />
              Your pick
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-emerald-500/50" />
              Correct ✓
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-red-500/50" />
              Wrong ✗
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded border border-white/25" />
              Already decided (WON)
            </span>
          </div>

          <ChampionHero picks={picks} results={results} />
          <Bracket picks={picks} results={results} onPick={handlePick} />

          <p className="mt-3 text-center text-xs text-white/35">
            Tap a team to advance it to your champion. Matches that are already
            decided are locked (shown as “WON”, outside your prediction). Your
            picks turn green ✓ or red ✗ as results come in. Saved automatically.
          </p>
        </>
      ) : (
        <div className="mx-auto max-w-2xl">
          <ChampionRace refreshSignal={refreshSignal} />
          <Leaderboard
            results={results}
            myUid={user.uid}
            refreshSignal={refreshSignal}
          />
        </div>
      )}

      <footer className="mt-12 text-center text-xs text-white/30">
        Fan predictions · not affiliated with FIFA · built for fun
      </footer>
    </main>
  );
}

// ---------- Small UI helpers ----------
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition
        ${
          active
            ? "border-emerald-400/50 bg-emerald-400/15 text-white"
            : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white"
        }`}
    >
      {children}
    </button>
  );
}

function StatCard({
  big,
  label,
  accent,
}: {
  big: string;
  label: string;
  accent?: "emerald" | "red";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center">
      <div
        className={`text-2xl font-black tabular-nums sm:text-3xl ${
          accent === "emerald"
            ? "text-emerald-400"
            : accent === "red"
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {big}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wider text-white/45">
        {label}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
      {children}
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
