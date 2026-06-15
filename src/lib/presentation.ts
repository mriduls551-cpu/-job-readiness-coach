import type { Locale, LocalizedText } from '@/lib/product';

export function getFirstName(name: string | null | undefined, fallback = 'there') {
  const normalized = name?.trim().replace(/\s+/g, ' ');
  return normalized ? normalized.split(' ')[0] : fallback;
}

export function localize(value: LocalizedText, locale: Locale) {
  return value[locale];
}

