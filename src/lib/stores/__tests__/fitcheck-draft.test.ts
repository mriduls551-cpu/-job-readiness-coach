/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  FITCHECK_DRAFT_STORAGE_KEY,
  createEmptyFitCheckDraft,
  useFitCheckDraftStore,
} from '@/lib/stores/fitcheck-draft';

describe('fit-check draft store', () => {
  beforeEach(async () => {
    localStorage.clear();
    useFitCheckDraftStore.setState({
      ...createEmptyFitCheckDraft(),
      hydrated: true,
    });
    await useFitCheckDraftStore.persist.clearStorage();
  });

  it('persists draft answers, profile fields, and locale to localStorage', () => {
    useFitCheckDraftStore.getState().setDraft({
      responses: { r1: 'r1_a', r2: 'r2_b' },
      currentIndex: 2,
      locale: 'hi',
      profile: {
        fullName: 'Asha',
        city: 'Indore',
        degreeName: 'BCom',
      },
    });

    const state = useFitCheckDraftStore.getState();
    expect(state.responses).toEqual({ r1: 'r1_a', r2: 'r2_b' });
    expect(state.currentIndex).toBe(2);
    expect(state.locale).toBe('hi');
    expect(state.profile).toMatchObject({
      fullName: 'Asha',
      city: 'Indore',
      degreeName: 'BCom',
    });
    expect(state.updatedAt).toEqual(expect.any(Number));

    const persisted = JSON.parse(localStorage.getItem(FITCHECK_DRAFT_STORAGE_KEY) || '{}');
    expect(persisted.state.responses).toEqual({ r1: 'r1_a', r2: 'r2_b' });
    expect(persisted.state.currentIndex).toBe(2);
    expect(persisted.state.locale).toBe('hi');
    expect(persisted.state.profile.city).toBe('Indore');
  });

  it('rehydrates a saved draft snapshot from localStorage', async () => {
    localStorage.setItem(
      FITCHECK_DRAFT_STORAGE_KEY,
      JSON.stringify({
        state: {
          responses: { r1: 'r1_c' },
          profile: { city: 'Nagpur', educationStream: 'commerce' },
          currentIndex: 1,
          locale: 'hi',
          updatedAt: 123456,
        },
        version: 0,
      })
    );

    jest.resetModules();
    const freshModule = await import('@/lib/stores/fitcheck-draft');

    expect(freshModule.useFitCheckDraftStore.getState()).toMatchObject({
      responses: { r1: 'r1_c' },
      profile: { city: 'Nagpur', educationStream: 'commerce' },
      currentIndex: 1,
      locale: 'hi',
      updatedAt: 123456,
      hydrated: true,
    });
  });

  it('clears the draft back to an empty state after submit', () => {
    useFitCheckDraftStore.getState().setDraft({
      responses: { r1: 'r1_d' },
      currentIndex: 3,
      locale: 'hi',
      profile: { city: 'Jaipur' },
    });

    useFitCheckDraftStore.getState().clearDraft();

    expect(useFitCheckDraftStore.getState()).toMatchObject({
      ...createEmptyFitCheckDraft(),
      hydrated: true,
    });

    const persisted = JSON.parse(localStorage.getItem(FITCHECK_DRAFT_STORAGE_KEY) || '{}');
    expect(persisted.state.responses).toEqual({});
    expect(persisted.state.currentIndex).toBe(0);
    expect(persisted.state.updatedAt).toBeNull();
  });
});
