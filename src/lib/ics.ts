// Calendar export (RFC 5545 .ics) and "Add to Google Calendar" links. Pure functions, no network.
import type { Course, Deadline } from '../types';
import { INGEST_TIMEZONE } from './ingest/dates';

const CRLF = '\r\n';

/** Escape TEXT values: backslash, semicolon, comma and newlines (RFC 5545 section 3.3.11). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a line to at most 75 octets, never splitting a multi-byte character (RFC 5545 section 3.1). */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join(CRLF + ' ');
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');
export function formatUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** The calendar date and time of an instant in a timezone. */
function localParts(d: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)!.value);
  return { y: g('year'), m: g('month'), d: g('day'), h: g('hour'), min: g('minute') };
}

const ymd = (y: number, m: number, d: number) => `${y}${pad(m)}${pad(d)}`;

/** Date-only deadlines are stored as 11:59 PM; those become all-day events. */
export function isAllDay(dueAt: string, timeZone: string = INGEST_TIMEZONE): boolean {
  const p = localParts(new Date(dueAt), timeZone);
  return p.h === 23 && p.min === 59;
}

function allDayRange(dueAt: string, timeZone: string) {
  const p = localParts(new Date(dueAt), timeZone);
  const next = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
  return { start: ymd(p.y, p.m, p.d), end: ymd(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()) };
}

function durationMs(kind: Deadline['kind']): number {
  return (kind === 'midterm' || kind === 'final' ? 2 : 1) * 3600_000;
}

export function eventTitle(d: Deadline, course?: Course): string {
  return course ? `[${course.code}] ${d.title}` : d.title;
}

function eventDetails(d: Deadline, course?: Course): string {
  const lines = [];
  if (course) lines.push(`Course: ${course.code} ${course.title}`);
  if (d.weightPct !== null) lines.push(`Worth: ${d.weightPct}% of the grade`);
  if (d.dueText) lines.push(`Syllabus says: ${d.dueText}`);
  lines.push('Added from Atlas. Check the date against your syllabus.');
  return lines.join('\n');
}

export function generateIcs(deadlines: Deadline[], courses: Course[], now: Date = new Date(), timeZone: string = INGEST_TIMEZONE): string {
  const byId = new Map(courses.map((c) => [c.id, c]));
  const lines: string[] = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atlas//Deadlines//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Atlas deadlines'];
  const dated = deadlines.filter((d): d is Deadline & { dueAt: string } => !!d.dueAt).sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  for (const d of dated) {
    const course = byId.get(d.courseId);
    const summary = eventTitle(d, course);
    lines.push('BEGIN:VEVENT', `UID:${d.id}@atlas`, `DTSTAMP:${formatUtc(now)}`);
    if (isAllDay(d.dueAt, timeZone)) {
      const r = allDayRange(d.dueAt, timeZone);
      lines.push(`DTSTART;VALUE=DATE:${r.start}`, `DTEND;VALUE=DATE:${r.end}`);
    } else {
      const start = new Date(d.dueAt);
      lines.push(`DTSTART:${formatUtc(start)}`, `DTEND:${formatUtc(new Date(start.getTime() + durationMs(d.kind)))}`);
    }
    lines.push(
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(eventDetails(d, course))}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(`Tomorrow: ${summary}`)}`, 'TRIGGER:-P1D', 'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** "Add to Google Calendar" link built from Google's public event template (no sign-in or API needed). */
export function googleCalendarUrl(d: Deadline, course?: Course, timeZone: string = INGEST_TIMEZONE): string | null {
  if (!d.dueAt) return null;
  let dates: string;
  if (isAllDay(d.dueAt, timeZone)) {
    const r = allDayRange(d.dueAt, timeZone);
    dates = `${r.start}/${r.end}`;
  } else {
    const start = new Date(d.dueAt);
    dates = `${formatUtc(start)}/${formatUtc(new Date(start.getTime() + durationMs(d.kind)))}`;
  }
  const q = new URLSearchParams({ action: 'TEMPLATE', text: eventTitle(d, course), dates, details: eventDetails(d, course) });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
