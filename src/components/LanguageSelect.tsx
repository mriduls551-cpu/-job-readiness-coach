'use client';

import * as Select from '@radix-ui/react-select';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { setStoredLocale } from '@/lib/client-session';
import { captureProductEvent } from '@/lib/analytics';
import { useAppStore } from '@/lib/store';
import type { Locale } from '@/lib/product';

const LOCALES: Locale[] = ['en', 'hi'];

export function LanguageSelect({ surface = 'navigation' }: { surface?: string }) {
  const locale = useAppStore((state) => state.locale);
  const t = useTranslations('common');

  const handleValueChange = (value: string) => {
    const nextLocale = value as Locale;
    setStoredLocale(nextLocale);
    void captureProductEvent('language_changed', {
      locale: nextLocale,
      surface,
    });
  };

  return (
    <Tooltip.Provider delayDuration={250}>
      <Select.Root onValueChange={handleValueChange} value={locale}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Select.Trigger
              aria-label={t('language')}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/70 bg-white/85 px-3 py-2 text-sm font-semibold text-[var(--brand-ink)] shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-ink)]"
            >
              <Languages aria-hidden="true" size={15} />
              <Select.Value />
              <ChevronDown aria-hidden="true" size={14} />
            </Select.Trigger>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              className="z-50 rounded-lg bg-slate-950 px-3 py-2 text-xs text-white shadow-xl"
              sideOffset={8}
            >
              {t('languageTooltip')}
              <Tooltip.Arrow className="fill-slate-950" />
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>

        <Select.Portal>
          <Select.Content
            className="z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl"
            position="popper"
            sideOffset={8}
          >
            <Select.Viewport>
              {LOCALES.map((option) => (
                <Select.Item
                  className="relative flex cursor-pointer select-none items-center gap-2 rounded-xl px-8 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100"
                  key={option}
                  value={option}
                >
                  <Select.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <Check aria-hidden="true" size={14} />
                  </Select.ItemIndicator>
                  <Select.ItemText>
                    {option === 'en' ? t('english') : t('hindi')}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Tooltip.Provider>
  );
}
