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

## 2. Set up Firebase (Google login)

Login is **mandatory** — the whole site is gated behind Google sign-in.

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Project Overview → Add app → Web (`</>`)**, register it, and copy the
   `firebaseConfig` values.
4. **Authentication → Settings → Authorized domains**: make sure `localhost` is
   listed, and later add your Vercel domain (e.g. `your-app.vercel.app`).

## 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your Supabase **and** Firebase values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx

NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
```

## 4. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Import it on [vercel.com](https://vercel.com).
3. Add **all** the `NEXT_PUBLIC_SUPABASE_*` and `NEXT_PUBLIC_FIREBASE_*`
   environment variables in the Vercel project settings.
4. Deploy. 🎉
5. Back in **Firebase → Authentication → Settings → Authorized domains**, add
   your live Vercel domain so Google login works in production.

---

## How it works

- **Bracket** — teams and structure live in [`src/lib/bracket.ts`](./src/lib/bracket.ts).
  Click a team and it advances through R32 → R16 → QF → SF → Final. Changing an
  earlier pick auto-clears the picks that depended on it.
- **Completed results** — `RESULTS` in `bracket.ts` locks finished matches so
  they show the real winner and can't be changed. Update it as rounds finish
  (data: [ESPN bracket](https://www.espn.com/soccer/bracket)).
- **Login** — Google sign-in via Firebase is required for the whole site.
- **Champion tally** — each user's champion pick is saved to Supabase and the
  "fan favourite" bars update live via Supabase Realtime.
