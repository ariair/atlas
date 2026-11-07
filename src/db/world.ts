// Pure conversion between database rows and the World type. No database access here,
// so it is easy to test.
import { WorldSchema } from '../lib/schemas';
import type { World } from '../types';
import type { courses, topics, nodes, edges, deadlines } from './schema';

export type WorldRows = {
  courses: (typeof courses.$inferSelect)[];
  topics: (typeof topics.$inferSelect)[];
  nodes: (typeof nodes.$inferSelect)[];
  edges: (typeof edges.$inferSelect)[];
  deadlines: (typeof deadlines.$inferSelect)[];
};

export type WorldInsertRows = {
  courses: (typeof courses.$inferInsert)[];
  topics: (typeof topics.$inferInsert)[];
  nodes: (typeof nodes.$inferInsert)[];
  edges: (typeof edges.$inferInsert)[];
  deadlines: (typeof deadlines.$inferInsert)[];
};

/** Rows -> World. Sorted so the output is stable. */
export function rowsToWorld(rows: WorldRows): World {
  const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);
  return WorldSchema.parse({
    courses: rows.courses
      .map((r) => ({ id: r.id, code: r.code, title: r.title, domain: r.domain, year: r.year, term: r.term }))
      .sort((a, b) => a.year - b.year || a.code.localeCompare(b.code)),
    topics: rows.topics.map((r) => ({ id: r.id, name: r.name, courseId: r.courseId })).sort(byId),
    nodes: rows.nodes
      .map((r) => ({
        id: r.id, label: r.label, type: r.type, courseIds: r.courseIds, domains: r.domains,
        years: r.years, topicId: r.topicId, summary: r.summary, mastery: r.mastery,
      }))
      .sort(byId),
    edges: rows.edges
      .map((r) => ({
        id: r.id, from: r.fromId, to: r.toId, type: r.type, label: r.label,
        status: r.status, confidence: r.confidence,
      }))
      .sort(byId),
    deadlines: rows.deadlines
      .map((r) => ({
        id: r.id, courseId: r.courseId, title: r.title, kind: r.kind,
        dueAt: r.dueAt ? r.dueAt.toISOString() : null, dueText: r.dueText,
        weightPct: r.weightPct, nodeIds: r.nodeIds, status: r.status,
      }))
      .sort((a, b) => {
        if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return a.id.localeCompare(b.id);
      }),
  });
}

/** World -> rows to insert for one user. */
export function worldToRows(userId: string, world: World): WorldInsertRows {
  return {
    courses: world.courses.map((c) => ({ userId, ...c })),
    topics: world.topics.map((t) => ({ userId, ...t })),
    nodes: world.nodes.map((n) => ({ userId, ...n })),
    edges: world.edges.map((e) => ({
      userId, id: e.id, fromId: e.from, toId: e.to, type: e.type,
      label: e.label, status: e.status, confidence: e.confidence,
    })),
    deadlines: world.deadlines.map((d) => ({
      userId, id: d.id, courseId: d.courseId, title: d.title, kind: d.kind,
      dueAt: d.dueAt ? new Date(d.dueAt) : null, dueText: d.dueText,
      weightPct: d.weightPct, nodeIds: d.nodeIds, status: d.status,
    })),
  };
}
