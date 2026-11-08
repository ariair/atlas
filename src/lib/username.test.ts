import { describe, expect, it } from 'vitest';
import { checkUsername } from './username';

describe('checkUsername', () => {
  it('lowercases and strips a leading @', () => {
    expect(checkUsername('  @Ana_01 ')).toEqual({ ok: true, username: 'ana_01' });
  });
  it('rejects bad names', () => {
    for (const bad of ['ab', 'a'.repeat(21), 'has space', 'dot.name', 'admin', '', 5]) {
      expect(checkUsername(bad).ok).toBe(false);
    }
  });
});
