import { describe, expect, it } from 'vitest';
import { supportsForcedToolChoice } from './client';

describe('supportsForcedToolChoice', () => {
  it('allows forcing on Haiku', () => {
    expect(supportsForcedToolChoice('claude-haiku-5-5')).toBe(true);
  });
  it('does not force on the newer models that reject it', () => {
    for (const m of ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1', 'claude-fable-5', 'claude-mythos-5-1']) {
      expect(supportsForcedToolChoice(m), m).toBe(false);
    }
  });
});
