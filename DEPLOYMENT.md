# Deployment

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
