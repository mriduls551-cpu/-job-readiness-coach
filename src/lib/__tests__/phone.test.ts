import { describe, expect, it } from '@jest/globals';
import {
  formatIndianPhoneInput,
  isValidIndianPhoneNumberOrEmpty,
  normalizeIndianPhoneNumber,
} from '@/lib/phone';

describe('Indian phone helpers', () => {
  it('accepts an empty phone field', () => {
    expect(isValidIndianPhoneNumberOrEmpty('')).toBe(true);
  });

  it('accepts a valid Indian mobile number', () => {
    expect(isValidIndianPhoneNumberOrEmpty('98765 43210')).toBe(true);
  });

  it('rejects an invalid short number', () => {
    expect(isValidIndianPhoneNumberOrEmpty('12345')).toBe(false);
  });

  it('normalizes a valid number for storage', () => {
    expect(normalizeIndianPhoneNumber('9876543210')).toBe('+91 98765 43210');
  });

  it('formats an incomplete number without dropping digits', () => {
    expect(formatIndianPhoneInput('9876543')).toContain('98765');
  });
});
