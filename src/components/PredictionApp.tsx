"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MATCHES } from "@/lib/matches";
import {
  supabase,
  isSupabaseConfigured,
  PredictionRow,
} from "@/lib/supabaseClient";
import MatchCard from "./MatchCard";

type CountMap = Record<string, Record<string, number>>; // matchId -> team -> count

const NAME_KEY = "wc26_voter_name";
const PICKS_KEY = "wc26_my_picks";

export default function PredictionApp() {
  const [name, setName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [counts, setCounts] = useState<CountMap>({});
  const [myPicks, setMyPicks] = useState<Record<string, string>>({});
  const [busyMatch, setBusyMatch] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upcoming = useMemo(
    () => MATCHES.filter((m) => m.status === "upcoming"),
    []
  );
  const completed = useMemo(
    () => MATCHES.filter((m) => m.status === "completed"),
    []
  );

  // Restore name + picks from localStorage
  useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    try {
      setMyPicks(JSON.parse(localStorage.getItem(PICKS_KEY) ?? "{}"));
    } catch {
      setMyPicks({});
    }
  }, []);

  const refetchCounts = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data, error } = await supabase
      .from("predictions")
      .select("match_id, selected_team");
    if (error) {
      setError(error.message);
      return;
    }
    const next: CountMap = {};
    (data as Pick<PredictionRow, "match_id" | "selected_team">[]).forEach(
      (row) => {
        next[row.match_id] = next[row.match_id] ?? {};
        next[row.match_id][row.selected_team] =
          (next[row.match_id][row.selected_team] ?? 0) + 1;
      }
    );
    setCounts(next);
  }, []);

  // Initial load + realtime subscription for live percentages
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refetchCounts();
    const channel = supabase
      .channel("predictions-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "predictions" },
        () => refetchCounts()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchCounts]);

  const submitName = () => {
    const clean = nameInput.trim();
    if (clean.length < 2) return;
    setName(clean);
    localStorage.setItem(NAME_KEY, clean);
  };

  const handleVote = async (matchId: string, team: string) => {
    if (!name || myPicks[matchId] || busyMatch) return;
    if (!isSupabaseConfigured) {
      setError("Supabase is not configured yet — add your keys in .env.local");
      return;
    }
    setBusyMatch(matchId);
    setError(null);

    const { error } = await supabase
      .from("predictions")
      .insert({ match_id: matchId, voter_name: name, selected_team: team });

    if (error) {
      setError(error.message);
      setBusyMatch(null);
      return;
    }

    const nextPicks = { ...myPicks, [matchId]: team };
    setMyPicks(nextPicks);
    localStorage.setItem(PICKS_KEY, JSON.stringify(nextPicks));
    await refetchCounts();
    setBusyMatch(null);
  };

  const votedCount = Object.keys(myPicks).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-10 sm:pt-14">
      {/* Header */}
      <header className="mb-8 text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
          FIFA World Cup 2026™
        </p>
        <h1 className="bg-gradient-to-b from-white to-white/60 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
          Predict the Winners
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-white/50">
          Pick who advances in each knockout tie and watch the live fan vote
          update in real time.
        </p>
      </header>

      {!isSupabaseConfigured && (
        <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          ⚠️ Supabase keys missing. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to <code>.env.local</code>{" "}
          to enable voting.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Name gate */}
      {!name ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <h2 className="text-lg font-semibold">Enter your name to start</h2>
          <p className="mt-1 text-sm text-white/45">
            We&apos;ll show your picks next to the live results.
          </p>
          <div className="mx-auto mt-4 flex max-w-sm gap-2">
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitName()}
              placeholder="e.g. Antu"
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
        </div>
      ) : (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
          <span className="text-white/60">
            Playing as <span className="font-semibold text-white">{name}</span>
          </span>
          <span className="text-white/45">
            {votedCount}/{upcoming.length} predicted
          </span>
        </div>
      )}

      {/* Upcoming matches (votable) */}
      {name && (
        <section className="mt-2">
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-white/40">
            Pick the winners
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                counts={counts[m.id] ?? {}}
                myPick={myPicks[m.id]}
                onVote={handleVote}
                busy={busyMatch === m.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed results */}
      {name && (
        <section className="mt-10">
          <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-white/40">
            Already decided
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {completed.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                counts={counts[m.id] ?? {}}
                myPick={myPicks[m.id]}
                onVote={handleVote}
                busy={false}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="mt-14 text-center text-xs text-white/30">
        Fan predictions · not affiliated with FIFA · built for fun
      </footer>
    </main>
  );
}
