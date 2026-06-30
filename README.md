# World Cup 2026 — Prediction Website

A simple, modern, single-page site where fans enter their name, pick the winner
of each remaining World Cup 2026 knockout tie, and watch **live fan-vote
percentages** update in real time.

Built with **Next.js + TypeScript + Tailwind CSS** and **Supabase**
(Postgres + Realtime). Designed to deploy on **Vercel**.

---

## 1. Set up Supabase

1. Open your project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor → New query**, paste the contents of
   [`supabase-schema.sql`](./supabase-schema.sql), and click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key

## 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 4. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on [vercel.com](https://vercel.com).
3. Add the two `NEXT_PUBLIC_SUPABASE_*` environment variables in the Vercel
   project settings.
4. Deploy. 🎉

---

## Editing the matches

All fixtures live in [`src/lib/matches.ts`](./src/lib/matches.ts). As rounds
progress, add new matches (Round of 16, Quarterfinals, etc.) or flip a match's
`status` to `"completed"` with a `winner`. Match data is sourced from the
[ESPN World Cup 2026 bracket](https://www.espn.com/soccer/bracket).

## Notes

- Identity is a simple name field (no login). A browser `localStorage` flag
  prevents a person from re-voting the same match in the same browser — fine for
  a casual fun site, not bulletproof.
- Live percentages use Supabase Realtime; every vote refreshes the bars for all
  open clients.
