import {
  formatIncompletePhoneNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';

export function formatIndianPhoneInput(value: string): string {
  return formatIncompletePhoneNumber(value, 'IN');
}

export function isValidIndianPhoneNumberOrEmpty(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;

  const phoneNumber = parsePhoneNumberFromString(trimmed, 'IN');
  return Boolean(phoneNumber?.isValid());
}

export function normalizeIndianPhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const phoneNumber = parsePhoneNumberFromString(trimmed, 'IN');
  return phoneNumber?.isValid() ? phoneNumber.formatInternational() : trimmed;
}
