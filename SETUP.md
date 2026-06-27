# Tazama Auth — Setup

Three steps to get the auth flow running. ~5 minutes.

## 1. Create the database tables

1. Open your project at [supabase.com](https://supabase.com) → **SQL Editor**.
2. Open [`supabase/schema.sql`](./supabase/schema.sql), copy the whole file, paste it in, and click **Run**.

This creates the `profiles` and `business_profiles` tables, Row Level Security
policies, and a trigger that auto-creates a profile when someone signs up. It's
safe to run more than once.

## 2. Configure Auth

In the Supabase dashboard → **Authentication**:

- **Sign In / Providers → Email**: turn **OFF** "Confirm email" (so signup lands
  straight in the dashboard, as designed). Leave "Enable Email provider" ON.
- **Sign In / Providers → Google**: enable it and paste your Google OAuth
  **Client ID** and **Client Secret**. Create those at
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
  - Authorized JavaScript origin: `http://localhost:3000`
  - Authorized redirect URI: the **callback URL Supabase shows you** on that
    Google provider screen (looks like `https://<project>.supabase.co/auth/v1/callback`).
- **URL Configuration → Redirect URLs**: add `http://localhost:3000/**`
  (and your production URL later).

> Forgot-password emails use Supabase's built-in SMTP in development (rate-limited).
> For production, configure your own SMTP under **Authentication → Emails**.

## 3. Add your keys

```bash
cp .env.example .env.local
```

Fill `.env.local` from **Project Settings → API**:

| Variable | Where to find it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` in dev |

Then:

```bash
npm run dev
```

Visit `http://localhost:3000/signup` to create an account.

## 4. Music dashboard (genre feed)

The dashboard fills horizontal carousels with real music based on the genres a
user picks during signup. Audio plays through the YouTube IFrame player; Supabase
only stores track **metadata** (YouTube is the CDN). Two extra keys are needed —
both **server-only**, so the YouTube key never reaches the browser.

1. **Run the latest schema.** Re-paste [`supabase/schema.sql`](./supabase/schema.sql)
   into the SQL Editor and **Run** it again. This adds `profiles.genre_preferences`
   and the shared `tracks` table (plus its read-only RLS policy). It's idempotent.

2. **Get a YouTube Data API v3 key.** At
   [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com):
   create/pick a project → **Enable** "YouTube Data API v3" →
   **APIs & Services → Credentials → Create credentials → API key**. Copy it.
   (Optional but recommended: under the key's settings, restrict it to the
   YouTube Data API.)

3. **Get the Supabase service-role key.** Supabase dashboard →
   **Project Settings → API → Project API keys → `service_role`** (click reveal).

4. **Add both to `.env.local`:**

   | Variable | Where to find it |
   | --- | --- |
   | `YOUTUBE_API_KEY` | Google Cloud → the API key from step 2 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → `service_role` secret |

   Restart `npm run dev` after editing `.env.local`.

> **Heads up — quota & cost.** Each genre that isn't already cached costs one
> YouTube `search` call (100 units; the free daily quota is 10,000 units). Once a
> genre is seeded, the dashboard serves it straight from the `tracks` table and
> makes **no** further YouTube calls — that's the read-through cache. The
> `service_role` key bypasses RLS, so keep it server-side only; it's never bundled
> into client code.

If you skip these keys, the app still runs — the genre carousels just stay empty
until the keys are present.

5. **Seed the catalog** (optional — the dashboard also seeds on demand):

   ```bash
   npm run seed:tracks
   ```

   This fills every genre in one shot and prints a per-genre report. It's also a
   setup checker — it names the exact missing piece (env var, table, or a
   disabled API) instead of failing silently.

> **Gotcha — `403 API_KEY_SERVICE_BLOCKED`.** Means the **YouTube Data API v3
> isn't enabled** for your key's project, or the key is API-restricted. Fix:
> enable it at
> [console.cloud.google.com/apis/library/youtube.googleapis.com](https://console.cloud.google.com/apis/library/youtube.googleapis.com),
> then under **Credentials → your key → API restrictions** allow "YouTube Data
> API v3" (or "Don't restrict key"). Wait a minute for it to propagate.

## How it fits together

- **`/signup`** — multi-step: account details → (individual: pick an avatar) /
  (business: business details). Creates the user and lands in `/dashboard`.
- **`/login`** — email + password, or Continue with Google.
- **Google sign-in** → `/auth/callback` → new users finish at **`/onboarding`**,
  returning users go straight to `/dashboard`.
- **`/dashboard`** — protected; businesses get an extra "Your venue" panel.
- Route protection lives in `proxy.ts` (Next.js 16's renamed middleware).
