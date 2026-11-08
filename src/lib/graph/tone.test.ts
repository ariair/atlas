import { describe, expect, it } from 'vitest';
import { darken, shortLabel, toneFor } from './tone';

describe('darken / toneFor', () => {
  it('darkens each channel and keeps a valid hex colour', () => {
    expect(darken('#FFFFFF', 0.5)).toBe('#808080');
    expect(darken('#56B4E9')).toMatch(/^#[0-9a-f]{6}$/);
    expect(parseInt(darken('#56B4E9').slice(1, 3), 16)).toBeLessThan(0x56);
  });
  it('leaves things that are not 6-digit hex alone', () => {
    expect(darken('red')).toBe('red');
    expect(darken('#fff')).toBe('#fff');
  });
  it('only changes colours on the light theme', () => {
    expect(toneFor('#56B4E9', false)).toBe('#56B4E9');
    expect(toneFor('#56B4E9', true)).not.toBe('#56B4E9');
  });
});

describe('shortLabel', () => {
  it('keeps short labels and shortens long ones with an ellipsis', () => {
    expect(shortLabel('Trees')).toBe('Trees');
    const long = shortLabel('Conditional probability and Bayes rule explained', 26);
    expect(long.length).toBeLessThanOrEqual(26);
    expect(long.endsWith('…')).toBe(true);
  });
});
