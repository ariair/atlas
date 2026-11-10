import { describe, expect, it } from 'vitest';
import { capUsd, isOverCap } from './spendCap';

describe('capUsd', () => {
  it('defaults to $2 and accepts a positive override', () => {
    expect(capUsd({})).toBe(2);
    expect(capUsd({ AI_SPEND_CAP_USD: '5' })).toBe(5);
    expect(capUsd({ AI_SPEND_CAP_USD: '0.5' })).toBe(0.5);
  });
  it('ignores junk, zero and negative values', () => {
    for (const v of ['', 'abc', '0', '-3', 'NaN']) expect(capUsd({ AI_SPEND_CAP_USD: v }), v).toBe(2);
  });
});

describe('isOverCap', () => {
  it('locks at the cap, not just above it', () => {
    expect(isOverCap(1.99, 2)).toBe(false);
    expect(isOverCap(2, 2)).toBe(true);
    expect(isOverCap(2.5, 2)).toBe(true);
  });
});
