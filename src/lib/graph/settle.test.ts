import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '@/fixtures/demoWorld';
import { captureHomes, settleLayout } from './forces';
import { toGraphData } from './layout';

const positions = () => {
  const g = settleLayout(toGraphData(getDemoWorld(new Date(0))));
  return g.nodes.map((n) => [n.id, Math.round(n.x! * 100) / 100, Math.round(n.y! * 100) / 100]);
};

describe('settleLayout', () => {
  it('gives exactly the same map every time, so revisiting the map never reshapes it', () => {
    expect(positions()).toEqual(positions());
    expect(positions()).toEqual(positions());
  });

  it('keeps every dot, including unlinked ones, within reach of its own island', () => {
    const g = settleLayout(toGraphData(getDemoWorld(new Date(0))));
    for (const n of g.nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
      expect(Math.hypot(n.x! - n.anchorX, n.y! - n.anchorY)).toBeLessThan(450);
    }
  });

  it('keeps unlinked dots and tiny groups close beside their own island, not out at its far anchor', () => {
    const world = getDemoWorld(new Date(0));
    const g = settleLayout(toGraphData(world));
    const degree = new Map<string, number>();
    for (const e of world.edges) {
      degree.set(e.from, (degree.get(e.from) ?? 0) + 1);
      degree.set(e.to, (degree.get(e.to) ?? 0) + 1);
    }
    const single = g.nodes.filter((n) => n.domains.length === 1);
    let checked = 0;
    for (const n of single) {
      if ((degree.get(n.id) ?? 0) > 1) continue; // only dots with at most one link
      const mates = single.filter((m) => m.domains[0] === n.domains[0] && (degree.get(m.id) ?? 0) > 1);
      if (mates.length < 4) continue;
      const cx = mates.reduce((t, m) => t + m.x!, 0) / mates.length;
      const cy = mates.reduce((t, m) => t + m.y!, 0) / mates.length;
      expect(Math.hypot(n.x! - cx, n.y! - cy)).toBeLessThan(300);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('puts every dot back on its resting spot when the map page comes back', () => {
    const g = settleLayout(toGraphData(getDemoWorld(new Date(0))));
    captureHomes(g.nodes); // first time: remember where each dot rests
    const rest = g.nodes.map((n) => [n.x, n.y]);
    for (const n of g.nodes) { n.x! += 40; n.y! -= 25; n.vx = 3; n.vy = 3; } // a fresh engine's default forces shoved them
    captureHomes(g.nodes); // the map came back
    expect(g.nodes.map((n) => [n.x, n.y])).toEqual(rest);
    expect(g.nodes.every((n) => n.vx === 0 && n.vy === 0)).toBe(true);
  });
});
