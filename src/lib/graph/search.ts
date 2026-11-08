// Fuzzy search over a world's items (PRD 5A): matches names first, then topic, course code/title, subject and summary.
// Pure and testable: build the index once per world, then call search(query) as the user types.
import Fuse from 'fuse.js';
import type { GraphNode, World } from '../../types';

export type SearchHit = { node: GraphNode; score: number }; // lower score = better match
export type SearchFn = (query: string, limit?: number) => SearchHit[];

export const MIN_QUERY = 2;

export function buildSearch(world: World): SearchFn {
  const course = new Map(world.courses.map((c) => [c.id, c]));
  const topic = new Map(world.topics.map((t) => [t.id, t.name]));
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const docs = world.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    summary: n.summary,
    topic: n.topicId ? (topic.get(n.topicId) ?? '') : '',
    courses: n.courseIds
      .map((id) => course.get(id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => `${c.code} ${c.title}`)
      .join(' '),
    domains: n.domains.join(' '),
  }));
  const fuse = new Fuse(docs, {
    includeScore: true,
    threshold: 0.38, // 0 = exact only, 1 = anything; this tolerates small typos
    ignoreLocation: true,
    minMatchCharLength: MIN_QUERY,
    keys: [
      { name: 'label', weight: 3 },
      { name: 'courses', weight: 1.2 },
      { name: 'topic', weight: 1 },
      { name: 'domains', weight: 0.8 },
      { name: 'summary', weight: 0.5 },
    ],
  });

  return (query, limit = 10) => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return [];
    const lower = q.toLowerCase();
    return fuse
      .search(q, { limit: limit * 3 })
      .map((r) => ({ node: byId.get(r.item.id)!, score: r.score ?? 0 }))
      // Exact names first, then names that start with what was typed, then the fuzzy ranking.
      .sort((a, b) => rank(a.node.label, lower) - rank(b.node.label, lower) || a.score - b.score)
      .slice(0, limit);
  };
}

function rank(label: string, q: string): number {
  const l = label.toLowerCase();
  if (l === q) return 0;
  if (l.startsWith(q)) return 1;
  if (l.includes(q)) return 2;
  return 3;
}
