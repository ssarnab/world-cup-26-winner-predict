"use client";

import { useEffect, useState } from "react";
import { ChampCount, loadChampionPicks } from "@/lib/db";
import { teamByName } from "@/lib/bracket";
import { Flag } from "./Flag";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function ChampionRace({
  refreshSignal,
}: {
  refreshSignal: number;
}) {
  const [rows, setRows] = useState<ChampCount[]>([]);

  useEffect(() => {
    loadChampionPicks().then(setRows);
  }, [refreshSignal]);

  const total = rows.reduce((s, r) => s + r.count, 0);
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 8);

  return (
    <section className="mb-8 rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">
        🏆 Who will win it all?
      </h2>
      <p className="mb-4 mt-0.5 text-xs text-fg-subtle">
        {total > 0
          ? `${total} ${total === 1 ? "person has" : "people have"} picked a champion`
          : "No champion picked yet — finish your bracket!"}
      </p>

      {total > 0 && (
        <div className="space-y-3">
          {top3.map((r, i) => {
            const t = teamByName(r.team);
            return (
              <div key={r.team} className="flex items-center gap-3">
                <span className="w-6 shrink-0 text-center text-lg">
                  {MEDALS[i]}
                </span>
                {t && <Flag code={t.code} size="lg" />}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-sm font-bold">{r.team}</span>
                    <span className="text-sm font-black tabular-nums text-emerald-400">
                      {r.pct}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${r.pct}%` }}
                    />
                  </div>
                </div>
                <span className="w-14 shrink-0 text-right text-[11px] text-fg-subtle">
                  {r.count} {r.count === 1 ? "vote" : "votes"}
                </span>
              </div>
            );
          })}

          {rest.length > 0 && (
            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              {rest.map((r, i) => {
                const t = teamByName(r.team);
                return (
                  <div
                    key={r.team}
                    className="flex items-center gap-2.5 text-xs text-fg-muted"
                  >
                    <span className="w-6 shrink-0 text-center text-fg-subtle">
                      {i + 4}
                    </span>
                    {t && <Flag code={t.code} size="sm" />}
                    <span className="flex-1 truncate">{r.team}</span>
                    <span className="tabular-nums text-fg-muted">{r.pct}%</span>
                    <span className="w-14 shrink-0 text-right text-fg-subtle">
                      {r.count} {r.count === 1 ? "vote" : "votes"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
