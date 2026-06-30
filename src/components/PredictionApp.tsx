"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Picks,
  Team,
  champion,
  slotKey,
  teamsAt,
  winnerAt,
  isLocked,
  LOCKED_PICKS,
  TOTAL_MATCHES,
} from "@/lib/bracket";

// flagcdn flag image (renders everywhere, unlike emoji flags on Windows)
function Flag({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-7 w-10" : "h-3.5 w-5";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width={40}
      height={30}
      alt=""
      loading="lazy"
      className={`${cls} shrink-0 rounded-[2px] object-cover ring-1 ring-black/30`}
    />
  );
}
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/useAuth";
import { isFirebaseConfigured } from "@/lib/firebase";

const PICKS_KEY = "wc26_bracket_picks";

// Column layout: left half -> center Final -> right half (mirrors the bracket)
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

export default function PredictionApp() {
  const { user, loading, error: authError, login, logout } = useAuth();
  const name = user?.displayName ?? user?.email ?? "Player";

  const [picks, setPicks] = useState<Picks>(LOCKED_PICKS);
  const [champCounts, setChampCounts] = useState<Record<string, number>>({});
  const lastSaved = useRef<string | null>(null);

  // Restore this signed-in user's bracket (locked results always win)
  useEffect(() => {
    if (!user) return;
    try {
      const saved = JSON.parse(
        localStorage.getItem(`${PICKS_KEY}_${user.uid}`) ?? "{}"
      );
      setPicks({ ...saved, ...LOCKED_PICKS });
    } catch {
      setPicks(LOCKED_PICKS);
    }
    lastSaved.current = null;
  }, [user]);

  const champ = useMemo(() => champion(picks), [picks]);
  const decided = useMemo(
    () =>
      COLUMNS.reduce(
        (sum, c) =>
          sum + c.matches.filter((m) => winnerAt(c.round, m, picks)).length,
        0
      ),
    [picks]
  );

  const storageKey = user ? `${PICKS_KEY}_${user.uid}` : PICKS_KEY;

  const pick = (round: number, match: number, teamName: string) => {
    if (isLocked(round, match)) return; // completed results can't change
    setPicks((prev) => {
      const next = { ...prev, [slotKey(round, match)]: teamName };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    setPicks(LOCKED_PICKS);
    localStorage.setItem(storageKey, JSON.stringify(LOCKED_PICKS));
    lastSaved.current = null;
  };

  // ---- Supabase: live "fan favourite champion" tally ----
  const refetchChampions = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase
      .from("predictions")
      .select("selected_team")
      .eq("match_id", "champion");
    if (!data) return;
    const counts: Record<string, number> = {};
    data.forEach((r) => {
      counts[r.selected_team] = (counts[r.selected_team] ?? 0) + 1;
    });
    setChampCounts(counts);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refetchChampions();
    const ch = supabase
      .channel("champions-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "predictions" },
        () => refetchChampions()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetchChampions]);

  // Save the user's champion pick whenever it changes
  useEffect(() => {
    if (!isSupabaseConfigured || !name || !champ) return;
    if (lastSaved.current === champ.name) return;
    (async () => {
      await supabase
        .from("predictions")
        .delete()
        .eq("voter_name", name)
        .eq("match_id", "champion");
      await supabase
        .from("predictions")
        .insert({ match_id: "champion", voter_name: name, selected_team: champ.name });
      lastSaved.current = champ.name;
      refetchChampions();
    })();
  }, [champ, name, refetchChampions]);

  const totalChampVotes = Object.values(champCounts).reduce((a, b) => a + b, 0);
  const topChampions = Object.entries(champCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // ---------- Auth gates (login is mandatory) ----------
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
          the Final — build your own bracket and crown your World Champion. Then
          see who the fans are backing to lift the trophy. 🌍⚽
        </p>

        {/* How it works */}
        <div className="mt-7 grid w-full max-w-md grid-cols-3 gap-3">
          {[
            { icon: "🗳️", title: "Pick winners", sub: "Tap a team to advance it" },
            { icon: "🧩", title: "Build a bracket", sub: "R32 → Final" },
            { icon: "📊", title: "Live fan vote", sub: "See the favourite" },
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
          Free · sign in just saves your bracket. Not affiliated with FIFA.
        </p>
        {authError && <p className="mt-4 text-xs text-red-300/90">{authError}</p>}
      </main>
    );
  }

  // ---------- Bracket ----------
  return (
    <main className="mx-auto w-full max-w-[1500px] px-3 pb-16 pt-6 sm:px-5">
      {/* Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
            FIFA World Cup 2026™
          </p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            {name}&apos;s Bracket
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <span className="hidden text-white/50 sm:inline">
            {decided}/{TOTAL_MATCHES} picked
          </span>
          <button
            onClick={reset}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Reset
          </button>
          {user?.photoURL && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full ring-1 ring-white/20"
            />
          )}
          <button
            onClick={logout}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Champion hero */}
      <ChampionHero champ={champ} />

      {/* Bracket (horizontal scroll on small screens) */}
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
                    onPick={pick}
                    center={col.center}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live champion tally */}
      {isSupabaseConfigured && (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/50">
            🏆 Fan favourite to win it all
          </h2>
          {totalChampVotes === 0 ? (
            <p className="text-sm text-white/40">
              No champions picked yet — finish your bracket to be the first!
            </p>
          ) : (
            <div className="space-y-2">
              {topChampions.map(([team, votes]) => {
                const p = Math.round((votes / totalChampVotes) * 100);
                return (
                  <div key={team} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate font-medium">{team}</span>
                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${p}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right tabular-nums text-white/70">
                      {p}%
                    </span>
                  </div>
                );
              })}
              <p className="pt-1 text-xs text-white/35">
                {totalChampVotes} {totalChampVotes === 1 ? "bracket" : "brackets"} submitted
              </p>
            </div>
          )}
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-white/30">
        Fan predictions · not affiliated with FIFA · built for fun
      </footer>
    </main>
  );
}

// ---------- Champion hero ----------
function ChampionHero({ champ }: { champ: Team | null }) {
  return (
    <div className="mb-5 flex items-center justify-center gap-4 rounded-2xl border border-emerald-400/20 bg-gradient-to-b from-emerald-400/10 to-transparent py-5">
      <span className="text-4xl">🏆</span>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
          World Champion
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

// ---------- Match box ----------
function MatchBox({
  round,
  match,
  picks,
  onPick,
  center,
}: {
  round: number;
  match: number;
  picks: Picks;
  onPick: (round: number, match: number, team: string) => void;
  center?: boolean;
}) {
  const [a, b] = teamsAt(round, match, picks);
  const winner = winnerAt(round, match, picks);
  const bothReady = Boolean(a && b);
  const locked = isLocked(round, match);

  const row = (team: Team | null) => {
    if (!team) {
      return (
        <div className="flex h-7 items-center gap-1.5 px-2 text-white/25">
          <span className="text-base leading-none">·</span>
          <span className="text-xs">—</span>
        </div>
      );
    }
    const isWinner = winner?.name === team.name;
    const decided = Boolean(winner);
    return (
      <button
        type="button"
        disabled={!bothReady || locked}
        onClick={() => onPick(round, match, team.name)}
        title={team.name}
        className={`flex h-7 w-full items-center gap-1.5 px-2 text-left transition
          ${isWinner ? "bg-emerald-400/20 text-white" : decided ? "text-white/40" : "text-white/90 hover:bg-white/10"}
          ${bothReady && !locked ? "cursor-pointer" : "cursor-default"}`}
      >
        <Flag code={team.code} />
        <span className="truncate text-xs font-medium">{team.name}</span>
        {isWinner && locked && (
          <span className="ml-auto text-[9px] font-bold text-emerald-300">FT</span>
        )}
      </button>
    );
  };

  return (
    <div
      className={`w-[128px] overflow-hidden rounded-lg border sm:w-[140px]
        ${center ? "border-emerald-400/40 bg-emerald-400/[0.04]" : locked ? "border-emerald-400/25 bg-emerald-400/[0.03]" : "border-white/10 bg-white/[0.03]"}`}
    >
      {row(a)}
      <div className="h-px bg-white/10" />
      {row(b)}
    </div>
  );
}

// ---------- Small helpers ----------
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
