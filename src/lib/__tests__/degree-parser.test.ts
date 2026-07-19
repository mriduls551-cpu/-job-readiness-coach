import { describe, expect, it } from '@jest/globals';
import { parseDegree } from '@/lib/matcher/degree-parser';
import { buildPersonEvidence } from '@/lib/matcher/quiz-to-vector';

describe('parseDegree', () => {
  it.each([
    ['10th pass', 'open', 'secondary'],
    ['Class 12', 'open', 'secondary'],
    ['ITI fitter', 'open', 'diploma'],
    ['Diploma in Mechanical', 'open', 'diploma'],
    ['BA English', 'arts-humanities', 'undergraduate'],
    ['B.Com (Hons)', 'commerce', 'undergraduate'],
    ['b com', 'commerce', 'undergraduate'],
    ['BBA', 'management', 'undergraduate'],
    ['B.Sc Physics', 'science', 'undergraduate'],
    ['BCA', 'science', 'undergraduate'],
    ['btech CSE', 'science', 'undergraduate'],
    ['BE Mechanical', 'science', 'undergraduate'],
    ['M.B.B.S', 'healthcare', 'professional'],
    ['BDS', 'healthcare', 'professional'],
    ['BAMS', 'healthcare', 'professional'],
    ['B.Pharm', 'healthcare', 'undergraduate'],
    ['GNM Nursing', 'healthcare', 'undergraduate'],
    ['LLB', 'law', 'professional'],
    ['CA Inter', 'commerce', 'professional'],
    ['MBA / PGDM', 'management', 'postgraduate'],
    ['M.Tech', 'science', 'postgraduate'],
    ['MD Medicine', 'healthcare', 'professional'],
    ['LLM', 'law', 'professional'],
    ['PhD', null, 'professional'],
  ])('parses %s', (input, stream, level) => {
    expect(parseDegree(input)).toEqual({ stream, level });
  });

  it.each([
    ['बीकॉम', 'commerce', 'undergraduate'],
    ['एमबीबीएस', 'healthcare', 'professional'],
    ['एलएलबी', 'law', 'professional'],
    ['डिप्लोमा', 'open', 'diploma'],
  ])('parses Hindi degree text %s', (input, stream, level) => {
    expect(parseDegree(input)).toEqual({ stream, level });
  });

  it.each(['', 'job ready', 'doctor dream', 'commerce student', 'engineering interest'])(
    'does not guess ambiguous degree text %s',
    (input) => {
      expect(parseDegree(input)).toEqual({ stream: null, level: null });
    }
  );

  it('lets an explicit education stream beat the parsed degree stream', () => {
    const evidence = buildPersonEvidence(
      [{ id: 'rf_customer-support', vector: [1, 1, 1, 1, 1, 1], roleScores: { 'customer-support': 24 } }],
      { educationStream: 'law', degreeName: 'MBBS' },
      1
    );

    expect(evidence.educationStream).toBe('law');
    expect(evidence.educationLevel).toBe('professional');
    expect(evidence.directRolePreference).toBe('customer-support');
  });
});
