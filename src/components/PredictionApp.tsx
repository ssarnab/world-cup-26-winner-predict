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

const NAME_KEY = "wc26_voter_name";
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
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [picks, setPicks] = useState<Picks>(LOCKED_PICKS);
  const [champCounts, setChampCounts] = useState<Record<string, number>>({});
  const lastSaved = useRef<string | null>(null);

  // Restore from localStorage (locked results always take precedence)
  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    try {
      const saved = JSON.parse(localStorage.getItem(PICKS_KEY) ?? "{}");
      setPicks({ ...saved, ...LOCKED_PICKS });
    } catch {
      setPicks(LOCKED_PICKS);
    }
  }, []);

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

  const pick = (round: number, match: number, teamName: string) => {
    if (isLocked(round, match)) return; // completed results can't change
    setPicks((prev) => {
      const next = { ...prev, [slotKey(round, match)]: teamName };
      localStorage.setItem(PICKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const reset = () => {
    setPicks(LOCKED_PICKS);
    localStorage.setItem(PICKS_KEY, JSON.stringify(LOCKED_PICKS));
    lastSaved.current = null;
  };

  const submitName = () => {
    const clean = nameInput.trim();
    if (clean.length < 2) return;
    setName(clean);
    localStorage.setItem(NAME_KEY, clean);
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

  // ---------- Name gate ----------
  if (!name) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
          FIFA World Cup 2026™
        </p>
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-black tracking-tight text-transparent">
          Build Your Bracket
        </h1>
        <p className="mt-3 text-sm text-white/50">
          Pick a winner in every tie and watch your champion rise to the top.
        </p>
        <div className="mt-6 flex w-full gap-2">
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitName()}
            placeholder="Your name (e.g. Antu)"
            maxLength={24}
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-emerald-400/60"
          />
          <button
            onClick={submitName}
            className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            Start
          </button>
        </div>
        {!isSupabaseConfigured && (
          <p className="mt-4 text-xs text-amber-300/80">
            ⚠️ Supabase keys missing — bracket works, but champion tally is off.
          </p>
        )}
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
        <div className="flex items-center gap-3 text-sm">
          <span className="text-white/50">
            {decided}/{TOTAL_MATCHES} picked
          </span>
          <button
            onClick={reset}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Reset
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
