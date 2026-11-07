// Runs the linking pass for a course that was just saved and stores the suggested edges.
import { AIError } from '../lib/ai/client';
import { suggestLinks } from '../lib/ingest/link';
import { consumeAiCall, getEdgeIds, getWorldForUser, insertSuggestedEdges } from './queries';

export type LinkingResult = { added: number; skipped?: string };

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 30);

/** Never throws: linking is a bonus, so any failure just means "no suggestions this time". */
export async function linkNewCourse(userId: string, courseId: string): Promise<LinkingResult> {
  try {
    if (process.env.AI_ENABLED === 'false') return { added: 0, skipped: 'AI is turned off.' };
    const world = await getWorldForUser(userId);
    const code = new Map(world.courses.map((c) => [c.id, c.code]));
    const compact = (n: (typeof world.nodes)[number]) => ({
      id: n.id, label: n.label, course: code.get(n.courseIds[0]) ?? '', domain: n.domains.join(' + '),
    });
    const concepts = world.nodes.filter((n) => n.type === 'concept');
    const fresh = concepts.filter((n) => n.courseIds.includes(courseId)).map(compact);
    const existing = concepts.filter((n) => !n.courseIds.includes(courseId)).map(compact);
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
