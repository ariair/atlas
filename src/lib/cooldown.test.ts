import { describe, expect, it } from 'vitest';
import { allowAction } from './cooldown';

describe('allowAction', () => {
  it('blocks a repeat inside the wait, allows it after, and keys are separate', () => {
    expect(allowAction('a:x', 60, 1000)).toBe(true);
    expect(allowAction('a:x', 60, 30_000)).toBe(false);
    expect(allowAction('a:y', 60, 30_000)).toBe(true);
    expect(allowAction('a:x', 60, 62_000)).toBe(true);
  });
});
