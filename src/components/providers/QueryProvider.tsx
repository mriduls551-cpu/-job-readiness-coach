'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useRef ensures a single QueryClient instance per component tree
  const queryClient = useRef(
    new QueryClient({
      defaultOptions: {
        queries: {
          // Don't refetch when the window regains focus in dev (reduces noise)
          refetchOnWindowFocus: false,
          // 5 minutes stale time — plan and applications don't change behind your back
          staleTime: 5 * 60 * 1000,
          retry: 1,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient.current}>{children}</QueryClientProvider>
  );
}
