// Runs the linking pass for a course that was just saved and stores the suggested edges.
import { AIError } from '../lib/ai/client';
import { suggestLinks } from '../lib/ingest/link';
import { consumeAiCall, deleteSuggestedEdgesForNode, getEdgeIds, getWorldForUser, insertSuggestedEdges, updateNode } from './queries';

export type LinkingResult = { added: number; skipped?: string };

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 30);

type WorldNode = Awaited<ReturnType<typeof getWorldForUser>>['nodes'][number];
const compactNode = (n: WorldNode, code: Map<string, string>) => ({
  id: n.id, label: n.label, course: code.get(n.courseIds[0]) ?? '', domain: n.domains.join(' + '), kind: n.type, summary: n.summary,
});

/** Never throws: linking is a bonus, so any failure just means "no suggestions this time". */
export async function linkNewCourse(userId: string, courseId: string, onlyNodeIds?: Set<string>): Promise<LinkingResult> {
  try {
    if (process.env.AI_ENABLED === 'false') return { added: 0, skipped: 'AI is turned off.' };
    const world = await getWorldForUser(userId);
    const code = new Map(world.courses.map((c) => [c.id, c.code]));
    // Concepts, plus quizzes, assignments and exams (with their descriptions) so they get linked too.
    const items = world.nodes.filter((n) => n.type === 'concept' || n.type === 'assignment' || n.type === 'exam');
    const fresh = items.filter((n) => n.courseIds.includes(courseId) && (!onlyNodeIds || onlyNodeIds.has(n.id))).map((n) => compactNode(n, code));
    const existing = items.filter((n) => !n.courseIds.includes(courseId)).map((n) => compactNode(n, code));
    if (fresh.length === 0 || existing.length === 0) return { added: 0, skipped: 'No other courses to link to yet.' };

    if (!(await consumeAiCall(userId, DAILY_LIMIT))) return { added: 0, skipped: 'Daily AI limit reached.' };
    const suggestions = await suggestLinks(fresh, existing, await getEdgeIds(userId));
    await insertSuggestedEdges(userId, suggestions);
    return { added: suggestions.length };
  } catch (err) {
    console.error('[linking] failed:', err instanceof AIError ? err.message : err instanceof Error ? err.message : 'unknown');
    return { added: 0, skipped: 'Could not look for links this time.' };
  }
}

export type RelinkResult =
  | { status: 'ok'; added: number; removed: number; summary: string }
  | { status: 'missing' | 'limit' | 'off' | 'failed' };

/** Longest note the student can add; the node's summary field holds 1000 characters in all. */
export const MAX_NOTE = 600;

/**
 * The student tells Atlas more about one item (say, what a quiz covers once the course says so).
 * The note is saved on the item's description, its old AI suggestions are replaced, and Claude looks again.
 * The note is untrusted data: it only ever reaches the model as part of the item's description.
 */
export async function relinkNode(userId: string, nodeId: string, note: string): Promise<RelinkResult> {
  try {
    if (process.env.AI_ENABLED === 'false') return { status: 'off' };
    const world = await getWorldForUser(userId);
    const node = world.nodes.find((n) => n.id === nodeId);
    if (!node) return { status: 'missing' };
    if (!(await consumeAiCall(userId, DAILY_LIMIT))) return { status: 'limit' };

    // Keep what was already known and add the new note after it (summary holds up to 1000 characters).
    const clean = note.replace(/\s+/g, ' ').trim().slice(0, MAX_NOTE);
    const summary = [node.summary.trim(), clean].filter(Boolean).join(' ').slice(-1000);
    if (clean) await updateNode(userId, nodeId, { summary });

    const code = new Map(world.courses.map((c) => [c.id, c.code]));
    const items = world.nodes.filter((n) => n.type === 'concept' || n.type === 'assignment' || n.type === 'exam');
    const target = compactNode({ ...node, summary }, code);
    const others = items.filter((n) => n.id !== nodeId).map((n) => compactNode(n, code));
    const removed = await deleteSuggestedEdgesForNode(userId, nodeId);
    const suggestions = await suggestLinks([target], others, await getEdgeIds(userId));
    await insertSuggestedEdges(userId, suggestions);
    return { status: 'ok', added: suggestions.length, removed, summary };
  } catch (err) {
    console.error('[relink] failed:', err instanceof AIError ? err.message : err instanceof Error ? err.message : 'unknown');
    return { status: 'failed' };
  }
}
