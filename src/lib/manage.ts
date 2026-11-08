// Pure helpers for managing a world: renaming subjects, course years, and checking an imported file.
import { z } from 'zod';
import { WorldSchema } from './schemas';
import type { World } from '../types';

/** Replace a subject name inside a node's domains list (and remove duplicates, keeping order). */
export function renameDomain(domains: string[], from: string, to: string): string[] {
  const out: string[] = [];
  for (const d of domains) {
    const next = d === from ? to : d;
    if (!out.includes(next)) out.push(next);
  }
  return out;
}

/** The sorted, unique years of the courses a node belongs to. */
export function yearsFor(courseIds: string[], yearByCourse: Map<string, number>): number[] {
  return [...new Set(courseIds.map((c) => yearByCourse.get(c)).filter((y): y is number => y !== undefined))].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// Export / import file
// ---------------------------------------------------------------------------
export const EXPORT_APP = 'atlas';
export const EXPORT_VERSION = 1;

export const ExportFileSchema = z.object({
  app: z.literal(EXPORT_APP),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string().max(40),
  world: WorldSchema,
});
export type ExportFile = z.infer<typeof ExportFileSchema>;

export const IMPORT_LIMITS = { courses: 100, topics: 1000, nodes: 3000, edges: 8000, deadlines: 1000 };

export function makeExportFile(world: World, now: Date = new Date()): ExportFile {
  return { app: EXPORT_APP, version: EXPORT_VERSION, exportedAt: now.toISOString(), world };
}

/** Problems that would leave a world broken (dangling links, duplicate ids). Empty list = fine. */
export function worldProblems(w: World): string[] {
  const problems: string[] = [];
  const dup = (name: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) problems.push(`${name} have duplicate ids.`);
  };
  dup('Courses', w.courses.map((c) => c.id));
  dup('Topics', w.topics.map((t) => t.id));
  dup('Items', w.nodes.map((n) => n.id));
  dup('Links', w.edges.map((e) => e.id));
  dup('Deadlines', w.deadlines.map((d) => d.id));

  const courses = new Set(w.courses.map((c) => c.id));
  const topics = new Set(w.topics.map((t) => t.id));
  const nodes = new Set(w.nodes.map((n) => n.id));
  if (w.topics.some((t) => t.courseId !== null && !courses.has(t.courseId))) problems.push('A topic points to a course that is not in the file.');
  if (w.nodes.some((n) => n.courseIds.some((c) => !courses.has(c)))) problems.push('An item points to a course that is not in the file.');
  if (w.nodes.some((n) => n.topicId !== null && !topics.has(n.topicId))) problems.push('An item points to a topic that is not in the file.');
  if (w.edges.some((e) => !nodes.has(e.from) || !nodes.has(e.to))) problems.push('A link points to an item that is not in the file.');
  if (w.deadlines.some((d) => !courses.has(d.courseId))) problems.push('A deadline points to a course that is not in the file.');
  if (w.deadlines.some((d) => d.nodeIds.some((n) => !nodes.has(n)))) problems.push('A deadline points to an item that is not in the file.');
  return problems;
}

export type ImportCheck = { ok: true; world: World } | { ok: false; error: string };

/** Validates whatever was uploaded as a world file. Never throws. */
export function checkImport(raw: unknown): ImportCheck {
  const parsed = ExportFileSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'That is not an Atlas export file (or it is from a different version).' };
  const w = parsed.data.world;
  const L = IMPORT_LIMITS;
  if (w.courses.length > L.courses || w.topics.length > L.topics || w.nodes.length > L.nodes || w.edges.length > L.edges || w.deadlines.length > L.deadlines) {
    return { ok: false, error: 'That file is larger than Atlas can load.' };
  }
  const problems = worldProblems(w);
  if (problems.length) return { ok: false, error: `That file is damaged. ${problems[0]}` };
  return { ok: true, world: w };
}

// ---------------------------------------------------------------------------
// Request bodies for the Settings routes
// ---------------------------------------------------------------------------
export const CoursePatchSchema = z
  .object({
    code: z.string().trim().min(1).max(40).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    domain: z.string().trim().min(1).max(60).optional(),
    year: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    term: z.string().trim().min(1).max(40).optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, 'Send at least one field to change.');

export const SubjectRenameSchema = z
  .object({ from: z.string().trim().min(1).max(60), to: z.string().trim().min(1).max(60) })
  .strict()
  .refine((b) => b.from !== b.to, 'Pick a different name.');
