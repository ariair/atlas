'use client';

// Deadlines: a filter bar (search, course, type, priority, when), two views (a timeline grouped by
// when it is due, and a compact list), and calendar export of exactly what the filters show.
// Dots use each course's subject colour, always next to the course code (never colour alone).
import { useEffect, useMemo, useState } from 'react';
import type { Course, Deadline, World } from '@/types';
import { GROUP_LABELS, GROUP_ORDER, groupDeadlines, groupKey, type DeadlineGroupKey } from '@/lib/deadlines';
import { generateIcs, googleCalendarUrl, isAllDay } from '@/lib/ics';
import { courseColors } from '@/lib/graph/layout';
import { priorityOf } from '@/lib/priority';

const KINDS = ['assignment', 'quiz', 'midterm', 'final', 'project', 'other'] as const;
const PRIORITIES = ['high', 'medium', 'low', 'not set'] as const;
const DAY = 86_400_000;

const card = 'rise rounded-2xl border border-white/10 bg-surface/60 p-4 backdrop-blur-md sm:p-5';
const control =
  'min-h-11 rounded-lg border border-rule-strong bg-ground/60 px-3 text-lg text-ink transition-colors duration-150 hover:border-ink-muted focus:border-ink-muted';
const delay = (i: number) => ({ '--i': i }) as React.CSSProperties;

function formatDue(d: Deadline): string {
  if (!d.dueAt) return d.dueText ? `Date not found. Document says: “${d.dueText}”` : 'Date not found';
  const date = new Date(d.dueAt);
  const day = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return isAllDay(d.dueAt) ? `${day} (end of day)` : `${day}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function shortDue(d: Deadline): string {
  if (!d.dueAt) return 'no date';
  const date = new Date(d.dueAt);
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return isAllDay(d.dueAt) ? day : `${day}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

/** "in 3 days", "today", "2 days ago" for a dated deadline. */
function relative(d: Deadline, now: Date): string {
  if (!d.dueAt) return '';
  const days = Math.ceil((new Date(d.dueAt).getTime() - now.getTime()) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days > 1) return `in ${days} days`;
  if (days === -1) return 'yesterday';
  return `${-days} days ago`;
}

export default function DeadlinesView() {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState<Date | null>(null);
  const [view, setView] = useState<'timeline' | 'list'>('timeline');
  const [q, setQ] = useState('');
  const [courseId, setCourseId] = useState('all');
  const [kind, setKind] = useState('all');
  const [priority, setPriority] = useState('all');
  const [when, setWhen] = useState<'all' | DeadlineGroupKey>('all');
  const [sort, setSort] = useState<'date' | 'weight' | 'course'>('date');
  const [hidePast, setHidePast] = useState(true);

  useEffect(() => {
    // Demo mode is remembered in a cookie by the demo badge, so no query string is needed.
    fetch('/api/world')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((w) => {
        setWorld(w);
        setNow(new Date());
      })
      .catch(() => setError('We could not load your deadlines. Refresh the page, or add ?demo=1 to the address to use demo mode.'));
  }, []);

  const courses = useMemo(() => new Map<string, Course>((world?.courses ?? []).map((c) => [c.id, c])), [world]);
  const colorOfCourse = useMemo(() => (world ? courseColors(world) : new Map<string, string>()), [world]);

  const filtered = useMemo(() => {
    if (!world || !now) return [];
    const needle = q.trim().toLowerCase();
    const list = world.deadlines.filter((d) => {
      const c = courses.get(d.courseId);
      if (courseId !== 'all' && d.courseId !== courseId) return false;
      if (kind !== 'all' && d.kind !== kind) return false;
      if (priority !== 'all' && priorityOf(d.weightPct) !== priority) return false;
      const g = groupKey(d, now);
      if (when !== 'all' && g !== when) return false;
      if (when === 'all' && hidePast && g === 'past') return false;
      if (needle && !`${d.title} ${c?.code ?? ''} ${c?.title ?? ''} ${d.kind}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const byDate = (a: Deadline, b: Deadline) => (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9') || a.title.localeCompare(b.title);
    if (sort === 'weight') list.sort((a, b) => (b.weightPct ?? -1) - (a.weightPct ?? -1) || byDate(a, b));
    else if (sort === 'course') list.sort((a, b) => (courses.get(a.courseId)?.code ?? '').localeCompare(courses.get(b.courseId)?.code ?? '') || byDate(a, b));
    else list.sort(byDate);
    return list;
  }, [world, now, courses, q, courseId, kind, priority, when, sort, hidePast]);

  if (error) return <p role="alert" className="mt-8 rounded-xl border-2 border-[#D67A48] bg-[#D67A48]/10 p-4">{error}</p>;
  if (!world || !now) return <p role="status" className="map-loading mt-8 text-ink-muted">loading your deadlines…</p>;

  const filtersOn = q !== '' || courseId !== 'all' || kind !== 'all' || priority !== 'all' || when !== 'all' || sort !== 'date' || !hidePast;
  const groups = groupDeadlines(filtered, now);
  const total = world.deadlines.length;

  function clearFilters() {
    setQ('');
    setCourseId('all');
    setKind('all');
    setPriority('all');
    setWhen('all');
    setSort('date');
    setHidePast(true);
  }

  // Export exactly what the filters show, as a calendar file made in the browser.
  function exportIcs() {
    const dated = filtered.filter((d) => d.dueAt);
    const blob = new Blob([generateIcs(dated, world!.courses, new Date())], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'atlas-deadlines.ics';
    a.click();
    URL.revokeObjectURL(url);
  }
  const datedCount = filtered.filter((d) => d.dueAt).length;

  const label = 'flex flex-col gap-1.5 text-ink-muted lowercase';
  const meta = (d: Deadline) => {
    const c = courses.get(d.courseId);
    return (
      <>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: colorOfCourse.get(d.courseId) ?? '#CFCFCF' }} />
          {c ? c.code : 'Course'}
        </span>
        <span>{d.kind}</span>
        <span>{d.weightPct !== null ? `${d.weightPct}% of grade` : 'weight not set'}</span>
        <span>priority: {priorityOf(d.weightPct)}</span>
      </>
    );
  };
  const gcalLink = (d: Deadline) => {
    const gcal = googleCalendarUrl(d, courses.get(d.courseId));
    return gcal ? (
      <a href={gcal} target="_blank" rel="noopener noreferrer" className="btn rounded-full" aria-label={`Add ${d.title} to Google Calendar (opens in a new tab)`}>
        Add to Google Calendar
      </a>
    ) : null;
  };

  return (
    <div className="mt-8 space-y-5">
      {/* Filters */}
      <section aria-label="Filters" className={card} style={delay(1)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className={`${label} sm:col-span-2`}>
            search
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Title, course or type" className={`${control} normal-case placeholder:text-ink-muted/60`} />
          </label>
          <label className={label}>
            course
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={`${control} normal-case`}>
              <option value="all">All courses</option>
              {world.courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
          </label>
          <label className={label}>
            type
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${control} normal-case`}>
              <option value="all">All types</option>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
          <label className={label}>
            priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${control} normal-case`}>
              <option value="all">Any priority</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className={label}>
            due
            <select value={when} onChange={(e) => setWhen(e.target.value as 'all' | DeadlineGroupKey)} className={`${control} normal-case`}>
              <option value="all">Any time</option>
              {GROUP_ORDER.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
            </select>
          </label>
          <label className={label}>
            sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'weight' | 'course')} className={`${control} normal-case`}>
              <option value="date">Due date</option>
              <option value="weight">Weight (highest first)</option>
              <option value="course">Course</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2.5 self-end lowercase text-ink-muted">
            <input type="checkbox" checked={hidePast} onChange={(e) => setHidePast(e.target.checked)} disabled={when !== 'all'} className="size-5 accent-[#CFCFCF]" />
            hide past deadlines
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p role="status" aria-live="polite" className="text-ink-muted">
            showing {filtered.length} of {total} {total === 1 ? 'deadline' : 'deadlines'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {filtersOn && <button type="button" onClick={clearFilters} className="btn rounded-full border-transparent bg-transparent">clear filters</button>}
            <div role="group" aria-label="View" className="flex rounded-full border border-rule p-1">
              {(['timeline', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={`min-h-9 min-w-11 rounded-full px-4 lowercase transition-colors duration-150 ${view === v ? 'bg-white/15 font-medium text-ink' : 'text-ink-muted hover:text-ink'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button type="button" onClick={exportIcs} disabled={datedCount === 0} className="btn btn-primary rounded-full">
              Export {datedCount} to calendar (.ics)
            </button>
          </div>
        </div>
      </section>

      <details className={`${card} !py-0`} style={delay(2)}>
        <summary className="min-h-11 cursor-pointer py-3 font-medium lowercase">how do i import the calendar file?</summary>
        <ul className="list-disc space-y-1 pb-4 pl-6 text-ink-muted">
          <li><strong className="text-ink">Google Calendar:</strong> open calendar.google.com, then Settings, then Import &amp; export, choose the file, and press Import.</li>
          <li><strong className="text-ink">Apple Calendar:</strong> double-click the downloaded file, or choose File, then Import.</li>
          <li><strong className="text-ink">Outlook:</strong> Add calendar, then Upload from file.</li>
          <li>Every deadline with a date gets a reminder one day before. You can also use “Add to Google Calendar” on a single deadline.</li>
        </ul>
      </details>

      {total === 0 && (
        <p className={card}>
          No deadlines yet. <a className="underline" href="/upload">Add a course</a> to see its deadlines here.
        </p>
      )}
      {total > 0 && filtered.length === 0 && (
        <p className={card}>
          Nothing matches these filters.{' '}
          <button type="button" onClick={clearFilters} className="underline">Clear filters</button>
        </p>
      )}

      {/* Timeline: grouped by when it is due */}
      {view === 'timeline' &&
        groups.map((g, gi) => (
          <section key={g.key} aria-labelledby={`g-${g.key}`} className="rise" style={delay(3 + gi)}>
            <h2 id={`g-${g.key}`} className="mb-3 flex items-baseline gap-3 text-2xl font-medium lowercase tracking-[-0.01em]">
              {g.label}
              <span className="text-lg text-ink-muted">{g.items.length}</span>
            </h2>
            {g.key === 'needs_review' && <p className="-mt-1 mb-3 text-ink-muted">These dates were not clear in the syllabus. Check them against your course.</p>}
            <ul className="space-y-3">
              {g.items.map((d) => (
                <li key={d.id} className="rounded-2xl border border-white/10 bg-surface/60 p-4 backdrop-blur-md transition-colors duration-150 hover:border-white/20 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xl font-medium">{d.title}</p>
                      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-ink-muted">{meta(d)}</p>
                      <p className="mt-2">
                        {d.status === 'needs_review' ? (
                          <>
                            <span aria-hidden="true">⚠ </span>
                            <strong>Needs review.</strong>{' '}
                          </>
                        ) : null}
                        {formatDue(d)}
                        {d.dueAt && g.key !== 'needs_review' && <span className="text-ink-muted"> · {relative(d, now)}</span>}
                      </p>
                    </div>
                    {gcalLink(d)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

      {/* List: one compact table sorted the way the filters say */}
      {view === 'list' && filtered.length > 0 && (
        <div className={`${card} overflow-x-auto !p-0`} style={delay(3)}>
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <caption className="sr-only">Deadlines</caption>
            <thead>
              <tr className="border-b border-rule-strong text-ink-muted">
                <th scope="col" className="p-3 font-normal lowercase">due</th>
                <th scope="col" className="p-3 font-normal lowercase">deadline</th>
                <th scope="col" className="p-3 font-normal lowercase">course</th>
                <th scope="col" className="p-3 font-normal lowercase">type</th>
                <th scope="col" className="p-3 font-normal lowercase">weight</th>
                <th scope="col" className="p-3 font-normal lowercase">priority</th>
                <th scope="col" className="p-3"><span className="sr-only">Calendar</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const c = courses.get(d.courseId);
                const gcal = googleCalendarUrl(d, c);
                return (
                  <tr key={d.id} className="border-b border-rule align-top last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {d.status === 'needs_review' && <span aria-hidden="true">⚠ </span>}
                      {shortDue(d)}
                      {d.status === 'needs_review' && <span className="block text-base text-ink-muted">needs review</span>}
                      {d.dueAt && d.status !== 'needs_review' && <span className="block text-base text-ink-muted">{relative(d, now)}</span>}
                    </td>
                    <td className="p-3 font-medium">{d.title}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2 whitespace-nowrap">
                        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: colorOfCourse.get(d.courseId) ?? '#CFCFCF' }} />
                        {c?.code ?? 'Course'}
                      </span>
                    </td>
                    <td className="p-3">{d.kind}</td>
                    <td className="p-3 whitespace-nowrap">{d.weightPct !== null ? `${d.weightPct}%` : 'not set'}</td>
                    <td className="p-3">{priorityOf(d.weightPct)}</td>
                    <td className="p-3 text-right">
                      {gcal && (
                        <a href={gcal} target="_blank" rel="noopener noreferrer" className="btn rounded-full whitespace-nowrap" aria-label={`Add ${d.title} to Google Calendar (opens in a new tab)`}>
                          Add to Google
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
