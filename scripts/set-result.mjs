// Set (or update) a real match result. This instantly re-grades every user's
// bracket and updates the leaderboard — no redeploy needed.
//
// Setup (one time): add your Supabase SERVICE ROLE key to .env.local:
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Supabase → Project Settings → API → service_role)
//
// Usage:
//   node scripts/set-result.mjs <round> <matchIndex> "<WinnerName>"
// Rounds: 0=R32  1=R16  2=QF  3=SF  4=Final
// Example (France win their R32 match, which is match index 1):
//   node scripts/set-result.mjs 0 1 "France"

import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const [round, matchIndex, winner] = process.argv.slice(2);
if (round === undefined || matchIndex === undefined || !winner) {
  console.error('Usage: node scripts/set-result.mjs <round> <matchIndex> "<Winner>"');
  process.exit(1);
}

const sb = createClient(url, serviceKey);
const { error } = await sb.from("match_results").upsert(
  {
    round: Number(round),
    match_index: Number(matchIndex),
    winner,
  },
  { onConflict: "round,match_index" }
);

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`✓ Result saved: round ${round}, match ${matchIndex} → ${winner}`);
console.log("  Every bracket has been re-graded automatically.");
