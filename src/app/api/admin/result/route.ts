import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const readKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function readClient() {
  return createClient(url, readKey, { auth: { persistSession: false } });
}
function writeClient() {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function authorized(username: unknown, password: unknown): boolean {
  const okUser = process.env.ADMIN_USERNAME || "Admin";
  const okPass = process.env.ADMIN_PASSWORD || "";
  return (
    typeof password === "string" &&
    okPass.length > 0 &&
    username === okUser &&
    password === okPass
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { username, password, action } = body;
  if (!authorized(username, password)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // ---- list (public-readable, no service key needed) ----
  if (action === "list") {
    const { data, error } = await readClient()
      .from("match_results")
      .select("*")
      .order("round")
      .order("match_index");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ results: data ?? [] });
  }

  // ---- writes need the service role key ----
  if (!serviceKey) {
    return NextResponse.json(
      {
        error:
          "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local (and Vercel) to save or delete results.",
      },
      { status: 500 }
    );
  }

  if (action === "set") {
    const round = Number(body.round);
    const match_index = Number(body.match_index);
    const winner = String(body.winner ?? "").trim();
    if (Number.isNaN(round) || Number.isNaN(match_index) || !winner) {
      return NextResponse.json(
        { error: "round, match_index and winner are required" },
        { status: 400 }
      );
    }
    const { error } = await writeClient()
      .from("match_results")
      .upsert({ round, match_index, winner }, { onConflict: "round,match_index" });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "delete") {
    const round = Number(body.round);
    const match_index = Number(body.match_index);
    const { error } = await writeClient()
      .from("match_results")
      .delete()
      .eq("round", round)
      .eq("match_index", match_index);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
