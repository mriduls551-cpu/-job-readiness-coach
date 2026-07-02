'use client';

import type { StoredUser } from '@/lib/client-session';

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let posthogReady: Promise<typeof import('posthog-js').default | null> | null = null;

async function getPostHog() {
  if (typeof window === 'undefined') {
    return null;
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) {
    return null;
  }

  if (!posthogReady) {
    posthogReady = import('posthog-js')
      .then((module) => {
        const posthog = module.default;
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
            capture_pageview: false,
            person_profiles: 'identified_only',
          });
        }
        return posthog;
      })
      .catch(() => null);
  }

  return posthogReady;
}

export async function captureProductEvent(
  eventName: string,
  properties: AnalyticsProperties = {}
) {
  const posthog = await getPostHog();
  posthog?.capture(eventName, properties);
}

export async function captureProductPageView(url: string) {
  await captureProductEvent('$pageview', { $current_url: url });
}

export async function getProductFeatureFlagVariant(
  flagKey: string,
  timeoutMs = 1500
): Promise<string | boolean | null> {
  const posthog = await getPostHog();
  if (!posthog) return null;

  const current = posthog.getFeatureFlag(flagKey);
  if (current !== undefined) {
    return current ?? null;
  }

  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe: (() => void) | undefined;

    const settle = (value: string | boolean | null | undefined) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      unsubscribe?.();
      resolve(value ?? null);
    };

    const timer = window.setTimeout(() => {
      settle(posthog.getFeatureFlag(flagKey));
    }, timeoutMs);

    try {
      unsubscribe = posthog.onFeatureFlags(() => {
        settle(posthog.getFeatureFlag(flagKey));
      });
      posthog.reloadFeatureFlags();
    } catch {
      settle(null);
    }
  });
}

export async function identifyProductUser(user: StoredUser | null) {
  const posthog = await getPostHog();
  if (!posthog) return;

  if (!user) {
    posthog.reset();
    return;
  }

  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
