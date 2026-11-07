// Server-side size checks for a draft the browser sends back (never trust the browser).
import type { ExtractionDraft } from '../../types';

export const DRAFT_LIMITS = { nodes: 200, edges: 400, deadlines: 100, label: 200, summary: 1000, title: 200, code: 40, courseTitle: 160, term: 40, domain: 60 };

/** Returns a friendly error message, or null if the draft is fine. */
export function checkDraftLimits(d: ExtractionDraft): string | null {
  const L = DRAFT_LIMITS;
  if (d.nodes.length > L.nodes || d.edges.length > L.edges || d.deadlines.length > L.deadlines) return 'That draft is too large to save.';
  if (d.course.code.length > L.code || d.course.title.length > L.courseTitle || d.course.term.length > L.term || d.course.domain.length > L.domain) {
    return 'The course details are too long.';
  }
  if (!d.course.code.trim() || !d.course.term.trim() || !d.course.domain.trim()) return 'The course code, term and department are required.';
  if (d.nodes.some((n) => !n.label.trim() || n.label.length > L.label || n.summary.length > L.summary)) return 'An item name or summary is empty or too long.';
  if (d.deadlines.some((x) => !x.title.trim() || x.title.length > L.title)) return 'A deadline title is empty or too long.';
  return null;
}
