"use client";

import { useState } from "react";
import { SEEDS, ROUNDS } from "@/lib/bracket";

type ResultRow = {
  round: number;
  match_index: number;
  winner: string;
  decided_at?: string;
};

function matchLabel(round: number, idx: number): string {
  if (round === 0) {
    const a = SEEDS[idx * 2]?.name ?? "?";
    const b = SEEDS[idx * 2 + 1]?.name ?? "?";
    return `${a} vs ${b}`;
  }
  return `${ROUNDS[round]?.short ?? "?"} · match #${idx}`;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [round, setRound] = useState(0);
  const [matchIndex, setMatchIndex] = useState(0);
  const [winner, setWinner] = useState("");

  const call = async (action: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch("/api/admin/result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, action, ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const login = async () => {
    setErr(null);
    setBusy(true);
    try {
      const data = await call("list");
      setResults(data.results ?? []);
      setAuthed(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    try {
      const data = await call("list");
      setResults(data.results ?? []);
    } catch {
      /* ignore */
    }
  };

  const saveResult = async () => {
    setErr(null);
    setMsg(null);
    if (!winner.trim()) {
      setErr("Pick a winner first.");
      return;
    }
    setBusy(true);
    try {
      await call("set", { round, match_index: matchIndex, winner: winner.trim() });
      setMsg(`Saved: ${matchLabel(round, matchIndex)} → ${winner.trim()}`);
      setWinner("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteResult = async (r: ResultRow) => {
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      await call("delete", { round: r.round, match_index: r.match_index });
      setMsg(`Deleted result for ${matchLabel(r.round, r.match_index)}`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Login ----------
  if (!authed) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-5 text-center">
        <div className="mb-3 text-4xl">🔐</div>
        <h1 className="text-2xl font-black">Admin access</h1>
        <p className="mt-2 text-sm text-white/50">
          Enter results once a match is over. Restricted area.
        </p>
        <div className="mt-6 w-full space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-emerald-400/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm outline-none placeholder:text-white/30 focus:border-emerald-400/60"
          />
          <button
            onClick={login}
            disabled={busy}
            className="w-full rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </div>
        {err && <p className="mt-4 text-xs text-red-300/90">{err}</p>}
        <a href="/" className="mt-6 text-xs text-white/35 hover:text-white/60">
          ← Back to site
        </a>
      </main>
    );
  }

  // ---------- Panel ----------
  const matchCount = ROUNDS[round]?.matches ?? 1;
  const round0Teams =
    round === 0
      ? [SEEDS[matchIndex * 2], SEEDS[matchIndex * 2 + 1]].filter(Boolean)
      : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-20 pt-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-400/80">
            Admin
          </p>
          <h1 className="text-2xl font-black">Match Results</h1>
        </div>
        <button
          onClick={() => {
            setAuthed(false);
            setPassword("");
          }}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70 transition hover:border-white/30 hover:text-white"
        >
          Lock
        </button>
      </header>

      {/* Set / update form */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
          Set / update a result
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-white/50">
            Round
            <select
              value={round}
              onChange={(e) => {
                setRound(Number(e.target.value));
                setMatchIndex(0);
                setWinner("");
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            >
              {ROUNDS.map((r, i) => (
                <option key={r.key} value={i} className="bg-[#0c0c12]">
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            Match #
            <select
              value={matchIndex}
              onChange={(e) => {
                setMatchIndex(Number(e.target.value));
                setWinner("");
              }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            >
              {Array.from({ length: matchCount }, (_, i) => (
                <option key={i} value={i} className="bg-[#0c0c12]">
                  #{i} — {matchLabel(round, i)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            Winner
            {round === 0 ? (
              <select
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              >
                <option value="" className="bg-[#0c0c12]">
                  Select…
                </option>
                {round0Teams.map((t) => (
                  <option key={t!.name} value={t!.name} className="bg-[#0c0c12]">
                    {t!.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
                placeholder="Exact team name"
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-400/60"
              />
            )}
          </label>
        </div>
        <button
          onClick={saveResult}
          disabled={busy}
          className="mt-4 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save result"}
        </button>
        {msg && <p className="mt-3 text-xs text-emerald-300/90">{msg}</p>}
        {err && <p className="mt-3 text-xs text-red-300/90">{err}</p>}
        {round !== 0 && (
          <p className="mt-3 text-xs text-white/35">
            For R16+ the team name must exactly match the app (e.g. “France”,
            “USA”, “Congo DR”).
          </p>
        )}
      </section>

      {/* Current results */}
      <section className="mt-6">
        <h2 className="mb-3 px-1 text-sm font-semibold uppercase tracking-wider text-white/50">
          Current results ({results.length})
        </h2>
        {results.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center text-sm text-white/40">
            No results entered yet.
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((r) => (
              <div
                key={`${r.round}-${r.match_index}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {matchLabel(r.round, r.match_index)}
                  </div>
                  <div className="text-[11px] text-white/45">
                    {ROUNDS[r.round]?.short} · winner:{" "}
                    <span className="font-semibold text-emerald-300">
                      {r.winner}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteResult(r)}
                  disabled={busy}
                  className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <a
        href="/"
        className="mt-8 inline-block text-xs text-white/35 hover:text-white/60"
      >
        ← Back to site
      </a>
    </main>
  );
}
