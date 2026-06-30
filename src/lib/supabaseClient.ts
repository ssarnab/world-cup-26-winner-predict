import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// `isSupabaseConfigured` lets the UI show a friendly hint when env vars
// are missing instead of throwing at runtime.
export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export type PredictionRow = {
  id: number;
  match_id: string;
  voter_name: string;
  selected_team: string;
  created_at: string;
};
