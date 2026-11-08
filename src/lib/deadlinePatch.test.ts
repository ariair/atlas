import { describe, expect, it } from 'vitest';
import { DeadlinePatchSchema } from './deadlinePatch';

describe('DeadlinePatchSchema', () => {
  it('accepts a partial change', () => {
    expect(DeadlinePatchSchema.safeParse({ title: ' Quiz 3 ', weightPct: 7.5 }).success).toBe(true);
  });
  it('accepts clearing the date and the weight', () => {
    expect(DeadlinePatchSchema.safeParse({ dueAt: null, weightPct: null }).success).toBe(true);
  });
  it('rejects an empty change, a blank title, a weight over 100 and unknown fields', () => {
    expect(DeadlinePatchSchema.safeParse({}).success).toBe(false);
    expect(DeadlinePatchSchema.safeParse({ title: '  ' }).success).toBe(false);
    expect(DeadlinePatchSchema.safeParse({ weightPct: 120 }).success).toBe(false);
    expect(DeadlinePatchSchema.safeParse({ status: 'confirmed' }).success).toBe(false);
  });
  it('rejects a date that is not an ISO date-time', () => {
    expect(DeadlinePatchSchema.safeParse({ dueAt: 'next Friday' }).success).toBe(false);
  });
});
