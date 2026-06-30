import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { Picks, Results, slotKey } from "./bracket";

export type UserScore = {
  user_id: string;
  user_name: string;
  user_photo: string | null;
  graded: number;
  correct: number;
  pct: number;
};

export type Identity = {
  uid: string;
  name: string;
  photo: string | null;
};

// ---- Results (real winners) ----
export async function loadResults(): Promise<Results> {
  if (!isSupabaseConfigured) return {};
  const { data, error } = await supabase
    .from("match_results")
    .select("round, match_index, winner");
  if (error || !data) return {};
  const out: Results = {};
  data.forEach((r) => {
    out[slotKey(r.round, r.match_index)] = r.winner;
  });
  return out;
}

// ---- A user's picks ----
export async function loadPicks(userId: string): Promise<Picks> {
  if (!isSupabaseConfigured) return {};
  const { data, error } = await supabase
    .from("predictions")
    .select("round, match_index, selected_team")
    .eq("user_id", userId);
  if (error || !data) return {};
  const out: Picks = {};
  data.forEach((r) => {
    out[slotKey(r.round, r.match_index)] = r.selected_team;
  });
  return out;
}

// ---- Save / update one pick ----
export async function savePick(
  who: Identity,
  round: number,
  matchIndex: number,
  team: string
) {
  if (!isSupabaseConfigured) return;
  await supabase.from("predictions").upsert(
    {
      user_id: who.uid,
      user_name: who.name,
      user_photo: who.photo,
      round,
      match_index: matchIndex,
      selected_team: team,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,round,match_index" }
  );
}

// ---- Leaderboard (top 10 by accuracy, tie-break by name) ----
export async function loadLeaderboard(limit = 10): Promise<UserScore[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("user_scores")
    .select("*")
    .gt("graded", 0)
    .order("pct", { ascending: false })
    .order("user_name", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as UserScore[];
}

// ---- Search users by name ----
export async function searchUsers(query: string): Promise<UserScore[]> {
  if (!isSupabaseConfigured || query.trim().length < 1) return [];
  const { data, error } = await supabase
    .from("user_scores")
    .select("*")
    .ilike("user_name", `%${query.trim()}%`)
    .order("pct", { ascending: false })
    .order("user_name", { ascending: true })
    .limit(20);
  if (error || !data) return [];
  return data as UserScore[];
}

// ---- One user's score row ----
export async function loadUserScore(userId: string): Promise<UserScore | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase
    .from("user_scores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as UserScore) ?? null;
}
