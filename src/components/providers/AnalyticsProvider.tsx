'use client';

import dynamic from 'next/dynamic';

const PostHogPageView = dynamic(
  () => import('@/components/providers/PostHogPageView').then((module) => module.PostHogPageView),
  { ssr: false }
);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PostHogPageView />
    </>
  );
}
