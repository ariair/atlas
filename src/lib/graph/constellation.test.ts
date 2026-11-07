import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { buildConstellation, dotRadius } from './constellation';

describe('buildConstellation', () => {
  const world = getDemoWorld(new Date('2026-11-07T12:00:00Z'));
  const c = buildConstellation(world, { width: 800, height: 520, pad: 24, focusLabel: 'Neural networks' });

  it('keeps every dot inside the box', () => {
    expect(c.dots.length).toBe(world.nodes.length);
    for (const d of c.dots) {
      expect(d.x).toBeGreaterThanOrEqual(24 - 0.01);
      expect(d.x).toBeLessThanOrEqual(800 - 24 + 0.01);
      expect(d.y).toBeGreaterThanOrEqual(24 - 0.01);
      expect(d.y).toBeLessThanOrEqual(520 - 24 + 0.01);
    }
  });

  it('lights only the focused concept and its direct neighbours', () => {
    expect(c.focus?.label).toBe('Neural networks');
    const lit = c.dots.filter((d) => d.lit);
    expect(lit.length).toBeGreaterThan(1);
    expect(lit.length).toBeLessThan(c.dots.length);
    expect(c.lines.some((l) => l.lit)).toBe(true);
  });

  it('lights everything when nothing is focused', () => {
    const plain = buildConstellation(world, { width: 400, height: 300 });
    expect(plain.focus).toBeNull();
    expect(plain.dots.every((d) => d.lit)).toBe(true);
  });

  it('sizes dots by connections, capped', () => {
    expect(dotRadius(0, false)).toBeLessThan(dotRadius(9, false));
    expect(dotRadius(100, false)).toBe(6);
    expect(dotRadius(1, true)).toBe(4.5);
  });
});
