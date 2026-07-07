import { describe, expect, it } from '@jest/globals';
import { generatePlanTasks } from '@/lib/product';

describe('generatePlanTasks', () => {
  it('uses skill, project, and assessment categories for starter tasks', () => {
    const tasks = generatePlanTasks('customer-support', { locale: 'en' }, 1);

    expect(tasks).toHaveLength(3);
    expect(tasks[0]?.category).toBe('skill');
    expect(tasks[1]?.category).toBe('project');
    expect(tasks[2]?.category).toBe('assessment');
  });

  it('preserves networking for the apply-first task when no applications exist', () => {
    const tasks = generatePlanTasks('customer-support', { locale: 'en', city: 'Indore' }, 0);

    expect(tasks[0]?.category).toBe('networking');
    expect(tasks[1]?.category).toBe('skill');
  });
});
