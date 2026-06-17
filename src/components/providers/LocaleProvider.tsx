'use client';

import { NextIntlClientProvider } from 'next-intl';
import { i18nMessages } from '@/lib/i18n/messages';
import { useAppStore } from '@/lib/store';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useAppStore((state) => state.locale);

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={i18nMessages[locale]}
      timeZone={process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Kolkata'}
    >
      {children}
    </NextIntlClientProvider>
  );
}
