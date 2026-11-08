// "Study for this": which topics are related to a deadline, and the /study link that opens with them already chosen.
// Related = the concepts the deadline names, plus any concept linked (kept or AI suggested) to the deadline's assignment/exam dot.
// If that finds nothing (a final that does not say what it covers), the course's own topics are used instead.
import type { Deadline, World } from '../types';

const MAX_TOPICS = 25; // the study screen's limit

export function relatedTopicIds(world: World, deadline: Deadline): string[] {
  const byId = new Map(world.nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  const add = (id: string) => {
    if (byId.get(id)?.type === 'concept' && !out.includes(id)) out.push(id);
  };
  deadline.nodeIds.forEach(add); // the deadline's own course topics first, so the study screen opens on the right class
  const assessments = new Set(deadline.nodeIds.filter((id) => byId.has(id) && byId.get(id)!.type !== 'concept'));
  for (const e of world.edges) {
    if (assessments.has(e.from)) add(e.to);
    else if (assessments.has(e.to)) add(e.from);
  }
  // A final or midterm often says nothing about what it covers. Then it is fair to offer the whole course's topics.
  if (out.length === 0) {
    for (const n of world.nodes) if (n.type === 'concept' && n.courseIds.includes(deadline.courseId)) out.push(n.id);
  }
  return out.slice(0, MAX_TOPICS);
}

export function studyHref(ids: string[]): string {
  return ids.length ? `/study?nodes=${ids.map(encodeURIComponent).join(',')}` : '/study';
}
