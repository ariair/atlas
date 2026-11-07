import { describe, it, expect } from 'vitest';
import { getDemoWorld } from './demoWorld';
import { WorldSchema } from '../lib/schemas';

const NOW = new Date('2026-11-09T12:00:00Z');
const world = getDemoWorld(NOW);

describe('demo world fixture', () => {
  it('validates against the World schema', () => {
    expect(WorldSchema.safeParse(world).success).toBe(true);
  });

  it('has the expected size', () => {
    expect(world.courses).toHaveLength(7);
    expect(world.topics).toHaveLength(21);
    expect(world.nodes.filter((n) => n.type === 'concept')).toHaveLength(70);
    expect(world.nodes.filter((n) => n.type === 'assignment' || n.type === 'exam')).toHaveLength(8);
    expect(world.deadlines).toHaveLength(12);
    expect(world.edges.length).toBeGreaterThanOrEqual(100);
  });

  it('has unique ids', () => {
    for (const list of [world.courses, world.topics, world.nodes, world.edges, world.deadlines]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('has no edge pointing to a missing node', () => {
    const ids = new Set(world.nodes.map((n) => n.id));
    for (const e of world.edges) {
      expect(ids.has(e.from), `edge ${e.id} from`).toBe(true);
      expect(ids.has(e.to), `edge ${e.id} to`).toBe(true);
    }
  });

  it('only references courses, topics and nodes that exist', () => {
    const courseIds = new Set(world.courses.map((c) => c.id));
    const topicIds = new Set(world.topics.map((t) => t.id));
    const nodeIds = new Set(world.nodes.map((n) => n.id));
    for (const n of world.nodes) {
      n.courseIds.forEach((c) => expect(courseIds.has(c)).toBe(true));
      if (n.topicId) expect(topicIds.has(n.topicId)).toBe(true);
    }
    for (const d of world.deadlines) {
      expect(courseIds.has(d.courseId)).toBe(true);
      d.nodeIds.forEach((id) => expect(nodeIds.has(id), `deadline ${d.id} node ${id}`).toBe(true));
    }
    for (const t of world.topics) expect(courseIds.has(t.courseId!)).toBe(true);
  });

  it('has 3 topics per course', () => {
    for (const c of world.courses) {
      expect(world.topics.filter((t) => t.courseId === c.id)).toHaveLength(3);
    }
  });

  it('has about 10 suggested edges and at least 6 cross-domain bridges', () => {
    const suggested = world.edges.filter((e) => e.status === 'suggested');
    expect(suggested.length).toBeGreaterThanOrEqual(8);
    expect(suggested.length).toBeLessThanOrEqual(12);
    const byId = new Map(world.nodes.map((n) => [n.id, n]));
    const crossDomain = world.edges.filter((e) => {
      const a = byId.get(e.from)!.domains;
      const b = byId.get(e.to)!.domains;
      return !a.some((d) => b.includes(d));
    });
    expect(crossDomain.length).toBeGreaterThanOrEqual(6);
  });

  it('has bridge nodes in two domains', () => {
    expect(world.nodes.filter((n) => n.domains.length === 2).length).toBeGreaterThanOrEqual(5);
  });

  it('has a prerequisite chain from Neural networks back to Year 1 math', () => {
    const byId = new Map(world.nodes.map((n) => [n.id, n]));
    const incoming = new Map<string, string[]>();
    for (const e of world.edges.filter((e) => e.type === 'prerequisite' && e.status === 'accepted')) {
      incoming.set(e.to, [...(incoming.get(e.to) ?? []), e.from]);
    }
    const seen = new Set<string>();
    const stack = ['nn'];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      stack.push(...(incoming.get(id) ?? []));
    }
    const year1Math = [...seen].filter((id) => {
      const n = byId.get(id)!;
      return n.years.includes(1) && n.domains.includes('Mathematics');
    });
    expect(year1Math.length).toBeGreaterThanOrEqual(3);
  });

  it('computes deadlines relative to now, never in the past', () => {
    const dated = world.deadlines.filter((d) => d.dueAt);
    expect(dated.length).toBeGreaterThan(0);
    for (const d of dated) expect(new Date(d.dueAt!).getTime()).toBeGreaterThan(NOW.getTime());
    const soon = dated.filter((d) => new Date(d.dueAt!).getTime() - NOW.getTime() < 7 * 864e5);
    expect(soon.length).toBeGreaterThanOrEqual(3);
  });

  it('flags undated deadlines as needs_review', () => {
    for (const d of world.deadlines) {
      expect(d.status).toBe(d.dueAt === null ? 'needs_review' : 'confirmed');
    }
    expect(world.deadlines.some((d) => d.status === 'needs_review')).toBe(true);
  });

  it('shifts deadlines when now changes', () => {
    const later = getDemoWorld(new Date(NOW.getTime() + 30 * 864e5));
    expect(later.deadlines[0].dueAt).not.toBe(world.deadlines[0].dueAt);
  });
});
