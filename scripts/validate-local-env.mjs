import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const errors = [];
const warnings = [];

function getValue(name) {
  return process.env[name]?.trim() || '';
}

function isTruthy(name) {
  return getValue(name).toLowerCase() === 'true';
}

function hasSupabaseConfig() {
  return Boolean(
    getValue('NEXT_PUBLIC_SUPABASE_URL') &&
      getValue('NEXT_PUBLIC_SUPABASE_ANON_KEY') &&
      getValue('SUPABASE_SERVICE_ROLE_KEY')
  );
}

const appUrl = getValue('NEXT_PUBLIC_APP_URL');
const authUrl = getValue('NEXTAUTH_URL');

if (!appUrl) {
  errors.push('NEXT_PUBLIC_APP_URL must be set for local testing.');
}

if (!authUrl) {
  errors.push('NEXTAUTH_URL must be set for local testing.');
}

const usingSupabase = hasSupabaseConfig();
const usingLocalAuth = isTruthy('ENABLE_LOCAL_AUTH');
const usingMemoryDb = isTruthy('ALLOW_IN_MEMORY_DB');

if (!usingSupabase && !usingMemoryDb) {
  errors.push(
    'ALLOW_IN_MEMORY_DB must be true for local product work unless Supabase is already configured.'
  );
}

if (!usingSupabase && !usingLocalAuth) {
  errors.push(
    'ENABLE_LOCAL_AUTH must be true for local product work unless Supabase auth is already configured.'
  );
}

if (usingLocalAuth && !getValue('MOCK_DEMO_PASSWORD')) {
  warnings.push('MOCK_DEMO_PASSWORD is empty; local auth may fall back to insecure dev defaults.');
}

if (usingLocalAuth && !getValue('MOCK_ADMIN_PASSWORD')) {
  warnings.push('MOCK_ADMIN_PASSWORD is empty; local admin auth may fall back to insecure dev defaults.');
}

if (usingMemoryDb) {
  warnings.push('Local persistence is in-memory only; registrations, plans, and results will reset on server restart.');
}

if (!getValue('OPENROUTER_API_KEY')) {
  warnings.push('OPENROUTER_API_KEY is not set; deterministic/local coaching fallbacks will be used.');
}

if (usingSupabase) {
  console.log('[local:check] Supabase is configured. Local data can persist.');
} else {
  console.log('[local:check] Running in local completion mode (mock auth + in-memory data).');
}

for (const warning of warnings) {
  console.warn(`[local:check] Warning: ${warning}`);
}

if (errors.length > 0) {
  console.error('[local:check] Local environment is not ready:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[local:check] Local environment is ready.');
