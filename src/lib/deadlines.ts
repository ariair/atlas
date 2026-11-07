// Grouping and "due soon" helpers for deadlines (pure).
import type { Course, Deadline } from '../types';

export type DeadlineGroupKey = 'past' | 'this_week' | 'next_two_weeks' | 'later' | 'needs_review';
export const GROUP_LABELS: Record<DeadlineGroupKey, string> = {
  this_week: 'This week',
  next_two_weeks: 'Next 2 weeks',
  later: 'Later',
  needs_review: 'Needs review',
  past: 'Past',
};
export const GROUP_ORDER: DeadlineGroupKey[] = ['this_week', 'next_two_weeks', 'later', 'needs_review', 'past'];

const DAY = 86_400_000;

export function groupKey(d: Deadline, now: Date): DeadlineGroupKey {
  if (!d.dueAt || d.status === 'needs_review') return 'needs_review';
  const diff = new Date(d.dueAt).getTime() - now.getTime();
  if (diff < 0) return 'past';
  if (diff <= 7 * DAY) return 'this_week';
  if (diff <= 14 * DAY) return 'next_two_weeks';
  return 'later';
}

/** Deadlines sorted by date inside each group; empty groups are left out. */
export function groupDeadlines(deadlines: Deadline[], now: Date): { key: DeadlineGroupKey; label: string; items: Deadline[] }[] {
  const buckets = new Map<DeadlineGroupKey, Deadline[]>();
  for (const d of deadlines) {
    const k = groupKey(d, now);
    buckets.set(k, [...(buckets.get(k) ?? []), d]);
  }
  const byDate = (a: Deadline, b: Deadline) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9') || a.title.localeCompare(b.title);
  return GROUP_ORDER.filter((k) => buckets.has(k)).map((key) => ({
    key,
    label: GROUP_LABELS[key],
    // Past items show newest first; everything else soonest first.
    items: buckets.get(key)!.sort(key === 'past' ? (a, b) => byDate(b, a) : byDate),
  }));
}

export type DueItem = { id: string; title: string; courseCode: string; dueAt: string; dueText: string; weightPct: number | null };

/** Confirmed deadlines due from now until `days` days ahead, soonest first. */
export function dueWithin(deadlines: Deadline[], courses: Course[], now: Date, days: number): DueItem[] {
  const code = new Map(courses.map((c) => [c.id, c.code]));
  const end = now.getTime() + days * DAY;
  return deadlines
    .filter((d): d is Deadline & { dueAt: string } => !!d.dueAt && d.status === 'confirmed')
    .filter((d) => {
      const t = new Date(d.dueAt).getTime();
      return t >= now.getTime() && t <= end;
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .map((d) => ({ id: d.id, title: d.title, courseCode: code.get(d.courseId) ?? '', dueAt: d.dueAt, dueText: d.dueText, weightPct: d.weightPct }));
}
