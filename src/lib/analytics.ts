'use client';

import { getStoredUser, type StoredUser } from '@/lib/client-session';

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

  // The first-party funnel store requires a registered user (the events table
  // has a NOT NULL user_id FK), so anonymous events must not be mirrored there
  // — PostHog owns the anonymous portion of the funnel via its own device ids.
  if (typeof window !== 'undefined' && getStoredUser()) {
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        eventName,
        properties,
      }),
    }).catch(() => undefined);
  }
}

export async function captureProductPageView(url: string) {
  await captureProductEvent('$pageview', { $current_url: url });
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
