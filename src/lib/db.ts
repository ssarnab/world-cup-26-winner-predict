import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { Picks, Results, Tallies, slotKey } from "./bracket";

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

// ---- All users who submitted, paginated + optional search ----
export async function loadAllUsers(
  page: number,
  pageSize: number,
  query = ""
): Promise<{ rows: UserScore[]; total: number }> {
  if (!isSupabaseConfigured) return { rows: [], total: 0 };
  let q = supabase.from("user_scores").select("*", { count: "exact" });
  const term = query.trim();
  if (term) q = q.ilike("user_name", `%${term}%`);
  const from = page * pageSize;
  const { data, count } = await q
    .order("pct", { ascending: false })
    .order("user_name", { ascending: true })
    .range(from, from + pageSize - 1);
  return { rows: (data as UserScore[]) ?? [], total: count ?? 0 };
}

// ---- Vote tallies per match slot (for the consensus / favourite bracket) ----
export async function loadSlotTallies(): Promise<Tallies> {
  if (!isSupabaseConfigured) return {};
  const out: Tallies = {};
  const pageSize = 1000;
  let from = 0;
  // paginate so it keeps working past PostgREST's default row cap
  for (;;) {
    const { data, error } = await supabase
      .from("predictions")
      .select("round, match_index, selected_team")
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    data.forEach((r) => {
      const k = slotKey(r.round, r.match_index);
      (out[k] ??= {})[r.selected_team] = (out[k][r.selected_team] ?? 0) + 1;
    });
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

// ---- Champion race: how many predicted each team to win the final ----
export type ChampCount = { team: string; count: number; pct: number };
export async function loadChampionPicks(): Promise<ChampCount[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await supabase
    .from("predictions")
    .select("selected_team")
    .eq("round", 4)
    .eq("match_index", 0);
  if (!data || data.length === 0) return [];
  const counts: Record<string, number> = {};
  data.forEach((r) => {
    counts[r.selected_team] = (counts[r.selected_team] ?? 0) + 1;
  });
  const total = data.length;
  return Object.entries(counts)
    .map(([team, count]) => ({
      team,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.team.localeCompare(b.team));
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
