import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const errors = [];
const warnings = [];

function getValue(name) {
  return process.env[name]?.trim() || '';
}

function isPlaceholder(value) {
  return /^(your-|generate-with:|https:\/\/your-|changeme|replace-me)/i.test(value);
}

function requireValue(name, minimumLength = 1) {
  const value = getValue(name);
  if (!value || isPlaceholder(value) || value.length < minimumLength) {
    errors.push(`${name} must be set to a real value.`);
  }
  return value;
}

function requireHttpsUrl(name) {
  const value = requireValue(name);
  if (!value) return;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') {
      errors.push(`${name} must use https:// in deployment.`);
    }
    if (['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
      errors.push(`${name} cannot point to a local host in deployment.`);
    }
  } catch {
    errors.push(`${name} must be a valid URL.`);
  }
}

requireHttpsUrl('NEXT_PUBLIC_APP_URL');
requireHttpsUrl('NEXTAUTH_URL');
requireValue('NEXTAUTH_SECRET', 32);
requireHttpsUrl('NEXT_PUBLIC_SUPABASE_URL');
requireValue('NEXT_PUBLIC_SUPABASE_ANON_KEY', 20);
requireValue('SUPABASE_SERVICE_ROLE_KEY', 20);
requireValue('VERCEL_CRON_SECRET', 24);

if (getValue('ENABLE_LOCAL_AUTH') !== 'false') {
  errors.push('ENABLE_LOCAL_AUTH must be false in deployment.');
}

if (getValue('ALLOW_IN_MEMORY_DB') !== 'false') {
  errors.push('ALLOW_IN_MEMORY_DB must be false in deployment.');
}

if (!getValue('OPENROUTER_API_KEY')) {
  warnings.push('OPENROUTER_API_KEY is not set; the deterministic coach fallback will be used.');
}

if (!getValue('UPSTASH_REDIS_REST_URL') || !getValue('UPSTASH_REDIS_REST_TOKEN')) {
  warnings.push('Upstash Redis is not configured; rate limits will be instance-local.');
}

if (!getValue('RESEND_API_KEY') && !getValue('SENDGRID_API_KEY')) {
  warnings.push('No email provider is configured; scheduled email delivery will be unavailable.');
}

for (const warning of warnings) {
  console.warn(`[deploy:check] Warning: ${warning}`);
}

if (errors.length > 0) {
  console.error('[deploy:check] Deployment environment is not ready:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log('[deploy:check] Deployment environment is ready.');
