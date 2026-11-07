'use client';

import { useEffect, useState } from 'react';
import type { Course, Deadline, World } from '@/types';
import { groupDeadlines } from '@/lib/deadlines';
import { googleCalendarUrl, isAllDay } from '@/lib/ics';

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';
const linkButton = `inline-flex min-h-11 items-center rounded-md border border-zinc-500 px-4 py-2 font-medium ${focus}`;

function formatDue(d: Deadline): string {
  if (!d.dueAt) return d.dueText ? `Date not found. Document says: “${d.dueText}”` : 'Date not found';
  const date = new Date(d.dueAt);
  const day = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  return isAllDay(d.dueAt) ? `${day} (end of day)` : `${day}, ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

export default function DeadlinesView() {
  const [world, setWorld] = useState<World | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState<Date | null>(null);

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

  if (error) return <p role="alert" className="mt-6 rounded-md border-2 border-red-700 p-3">{error}</p>;
  if (!world || !now) return <p role="status" className="mt-6">Loading your deadlines…</p>;

  const courses = new Map<string, Course>(world.courses.map((c) => [c.id, c]));
  const groups = groupDeadlines(world.deadlines, now);

  return (
    <div className="mt-4 space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <a href="/api/deadlines.ics" download="atlas-deadlines.ics" className={`${linkButton} bg-blue-700 text-white`}>
          Download calendar file (.ics)
        </a>
        <p className="max-w-prose">Every deadline with a date, with a reminder one day before.</p>
      </div>
      <details className="rounded-md border border-zinc-500 p-3">
        <summary className={`min-h-11 cursor-pointer font-medium ${focus}`}>How do I import the calendar file?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li><strong>Google Calendar:</strong> open calendar.google.com, then Settings, then Import &amp; export, choose the file, and press Import.</li>
          <li><strong>Apple Calendar:</strong> double-click the downloaded file, or choose File, then Import.</li>
          <li><strong>Outlook:</strong> Add calendar, then Upload from file.</li>
          <li>Or use the “Add to Google Calendar” button on a single deadline.</li>
        </ul>
      </details>

      {groups.length === 0 && <p>No deadlines yet. <a className="underline" href="/upload">Add a course</a> to see its deadlines here.</p>}

      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`g-${g.key}`}>
          <h2 id={`g-${g.key}`} className="text-2xl font-semibold">{g.label} ({g.items.length})</h2>
          {g.key === 'needs_review' && <p>These dates were not clear in the syllabus. Check them against your course.</p>}
          <ul className="mt-3 space-y-3">
            {g.items.map((d) => {
              const course = courses.get(d.courseId);
              const gcal = googleCalendarUrl(d, course);
              return (
                <li key={d.id} className="rounded-md border border-zinc-500 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold">{d.title}</p>
                      <p>{course ? `${course.code}: ${course.title}` : 'Course'} · {d.kind}{d.weightPct !== null ? ` · ${d.weightPct}% of grade` : ''}</p>
                      <p>{d.status === 'needs_review' ? <><span aria-hidden="true">⚠ </span><strong>Needs review.</strong> </> : null}{formatDue(d)}</p>
                    </div>
                    {gcal && (
                      <a href={gcal} target="_blank" rel="noopener noreferrer" className={linkButton} aria-label={`Add ${d.title} to Google Calendar (opens in a new tab)`}>
                        Add to Google Calendar
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
