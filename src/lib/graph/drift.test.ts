import { describe, expect, it } from 'vitest';
import { captureHomes, makeDriftForce } from './forces';
import type { CanvasNode } from './layout';

const node = (id: string, x: number, y: number) => ({ id, x, y, vx: 0, vy: 0 }) as unknown as CanvasNode;

// Step positions the way d3 does: apply forces, damp velocity, move.
function run(nodes: CanvasNode[], force: ReturnType<typeof makeDriftForce>, clock: { t: number }, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    clock.t += 16;
    force();
    for (const n of nodes) {
      n.vx! *= 0.6;
      n.vy! *= 0.6;
      n.x! += n.vx!;
      n.y! += n.vy!;
    }
  }
}

describe('drift force', () => {
  it('leaves nodes alone until they have a home', () => {
    const clock = { t: 0 };
    const a = node('a', 10, 20);
    const f = makeDriftForce(() => clock.t);
    f.initialize([a]);
    run([a], f, clock, 200);
    expect(a.x).toBe(10);
    expect(a.y).toBe(20);
  });

  it('keeps a settled node moving, but always close to its home', () => {
    const clock = { t: 0 };
    const a = node('a', 100, 50);
    captureHomes([a]);
    const f = makeDriftForce(() => clock.t, { amp: 4 });
    f.initialize([a]);
    let maxDist = 0;
    let moved = 0;
    let prev = { x: a.x!, y: a.y! };
    for (let i = 0; i < 60; i++) {
      run([a], f, clock, 10);
      maxDist = Math.max(maxDist, Math.hypot(a.x! - 100, a.y! - 50));
      moved += Math.hypot(a.x! - prev.x, a.y! - prev.y);
      prev = { x: a.x!, y: a.y! };
    }
    expect(moved).toBeGreaterThan(1); // it does sway
    expect(maxDist).toBeLessThan(4 * 1.5 + 1); // but never wanders off
  });

  it('moves near neighbours together, like a current', () => {
    const clock = { t: 0 };
    const a = node('a', 0, 0);
    const b = node('b', 3, 2);
    captureHomes([a, b]);
    const f = makeDriftForce(() => clock.t);
    f.initialize([a, b]);
    run([a, b], f, clock, 300);
    expect(Math.hypot(a.x! - b.x! - -3, a.y! - b.y! - -2)).toBeLessThan(1);
  });
});
