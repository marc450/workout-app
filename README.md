# PPLUL Workout Tracker

Mobile-first, single-user web app for logging a fixed five-day Push / Pull / Legs / Upper / Lower plan. Built for one-handed use between sets.

Stack: Next.js 16 (App Router, TypeScript, Tailwind v4), Supabase (Postgres + Auth via `@supabase/ssr`), Recharts, pnpm, deployed on Railway.

## Environment variables

Copy `.env.example` to `.env.local` for local development and set the same values on Railway.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`). The legacy anon key also works under `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the app, e.g. `https://<app>.up.railway.app`. Used for the magic-link redirect. |
| `ALLOWED_EMAIL` | The only email allowed to sign in. Checked server-side in `src/proxy.ts`. |

## 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com) and copy the URL and publishable key from Settings → API.
2. Run the migration in `supabase/migrations/`. Either:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   or paste the contents of `supabase/migrations/20260925000000_init.sql` into the SQL editor and run it.

3. Create your user once: Authentication → Users → "Add user" with the email from `ALLOWED_EMAIL`. Sign-ups are disabled, so this is the only way to create the account.

### Auth settings

Authentication → Sign In / Providers → Email:

- **Allow new users to sign up: off**
- Confirm email can stay on; the OTP flow handles it.

Authentication → URL Configuration:

- Site URL: `https://<app>.up.railway.app`
- Redirect URLs: `https://<app>.up.railway.app/auth/confirm` (add `http://localhost:3000/auth/confirm` for local dev)

Authentication → Emails → Templates → **Magic Link**: the default template only has the link. Replace the body so it includes the six-digit code as well, for example:

```html
<h2>Your PPLUL sign-in code</h2>
<p style="font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>Enter this code in the app. It expires in one hour.</p>
<p>Or open this link in a browser: <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Sign in</a></p>
```

Why code first: on iOS a magic link opens in Safari, not in the installed PWA, which has its own cookie storage. Typing the code inside the app avoids that.

Sessions are long-lived: the Supabase client refreshes the access token with the refresh token automatically, and the proxy writes refreshed cookies on every request. You can raise the refresh-token lifetime under Authentication → Sessions if you want to log in even less often.

## 2. Local development

```bash
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev
```

The plan lives in `src/plan.ts`. Logs reference exercises by `slug`, so exercises can be renamed or reordered without breaking history. Don't change a slug that already has logs.

## 3. Railway

1. Push this repo to GitHub.
2. In Railway: New Project → Deploy from GitHub repo → pick the repo. Railway detects Next.js via Nixpacks/Railpack and runs `pnpm install` and `pnpm build`.
3. Set the four environment variables under the service → Variables. `NEXT_PUBLIC_*` values are inlined at build time, so redeploy after changing them.
4. Settings → Networking → Generate Domain to get the `*.up.railway.app` URL. Put that URL into `NEXT_PUBLIC_SITE_URL` and into the Supabase URL configuration above.
5. Every push to `main` triggers a deploy.

The start command is `next start -p $PORT` (see `package.json`), which binds to the port Railway injects. `railway.json` pins the builder and health check.

## 4. Verifying RLS

All three tables have row level security with `user_id = auth.uid()` for select, insert, update and delete. To verify, create a second user in the Supabase dashboard, sign in with their credentials via the REST API and query `set_logs`: the result is an empty array, and inserts fail with a policy violation.

```bash
curl "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/set_logs?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer <second user's access token>"
# -> []
```

## Behaviour notes

- **Today** opens the workout for the current weekday in Europe/Zurich. Saturday and Sunday show the week summary. Missed weekdays cannot be logged later.
- **Prefill**: each set row starts with the last session's weight and reps for the same set index.
- **Progression chip** appears when the last session had every planned set at one weight with every set at `repMax`. Tapping applies `+incrementKg` to the unconfirmed rows. It is never applied automatically.
- **Rest timer** stores its end timestamp in `localStorage`, so it stays correct after the phone locks. At zero it vibrates (Android), beeps (all platforms, after the first tap unlocked audio) and flashes.
- **PRs** on the summary card: an exercise counts when its best Epley e1RM beats every previous session of that exercise (needs at least one previous session).
- **Offline**: the service worker caches static assets only. If a save fails the row shows "Not saved, retry".
