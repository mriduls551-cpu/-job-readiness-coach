'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { captureProductPageView } from '@/lib/analytics';

export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ''}`;
    void captureProductPageView(url);
  }, [pathname, searchParams]);

  return null;
}
