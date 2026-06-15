# Deployment

This project now has two intended operating modes:

- `Local completion mode`: finish UX, copy, interactions, and deployment polish using mock auth plus in-memory data.
- `Real deployment mode`: switch to Supabase for persistence and OpenRouter for live AI once the product is complete.

GitHub tracks the code, scripts, and migrations in both modes. It does not track live user data. Until Supabase is configured, any registrations, plans, applications, or chat history you create locally should be treated as disposable test data.

## Recommended Workflow

1. Copy [.env.local.example](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/.env.local.example>) into your real `.env.local` while the product is still being finished.
2. Run `npm run local:check` before local QA. This verifies that local auth and in-memory persistence are set up correctly.
3. Push code to GitHub as normal while product work continues.
4. When the product is ready, switch to [.env.production.example](</C:/Users/mridul/Documents/Job-startup - Copy/New folder/Job-startup/nextjs-migration/.env.production.example>), configure Supabase and OpenRouter, then run `npm run deploy:check`.

The app is configured for Vercel. Its deployment build runs:

```sh
npm run deploy:check
npm run build
```

## Required environment variables

- `NEXT_PUBLIC_APP_URL`: public `https://` application URL
- `NEXTAUTH_URL`: same public `https://` URL
- `NEXTAUTH_SECRET`: random secret of at least 32 characters
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_CRON_SECRET`: random secret of at least 24 characters
- `ENABLE_LOCAL_AUTH=false`
- `ALLOW_IN_MEMORY_DB=false`

Apply the migrations in `supabase/migrations` before serving production traffic.

## Cutover From Local Mode

When you are ready to move from local completion mode to real infrastructure:

1. Create the Supabase project and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
2. Run the SQL in `supabase/migrations` so the production schema exists before user traffic arrives.
3. Set `ENABLE_LOCAL_AUTH=false` and `ALLOW_IN_MEMORY_DB=false`.
4. Add `OPENROUTER_API_KEY` when you want live AI responses instead of deterministic fallback behavior.
5. Run `npm run deploy:check` and confirm `/api/health` returns `status: "ok"` after deploy.

## Optional integrations

- `OPENROUTER_API_KEY`: enables remote AI responses; deterministic coaching remains available without it.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: provide shared rate limiting across instances.
- `RESEND_API_KEY` or `SENDGRID_API_KEY`: enables scheduled email delivery.
- `NEXT_PUBLIC_SENTRY_DSN`: enables client monitoring when a Sentry integration is configured.

## Verification

After deployment:

1. Open `/api/health` and confirm `status` is `ok`.
2. Register a new account and complete the fit check.
3. Confirm results, resume, plan, applications, interview prep, and dashboard load.
4. Confirm the Vercel cron requests return success with the configured bearer secret.
