import { describe, it, expect } from 'vitest';
import { escapeText, foldLine, generateIcs, googleCalendarUrl, isAllDay } from './ics';
import type { Course, Deadline } from '../types';

const courses: Course[] = [{ id: 'c1', code: 'CSCI 220', title: 'Operating Systems; Part, One', domain: 'Computer Science', year: 2, term: 'Fall 2026' }];
const base: Deadline = { id: 'd1', courseId: 'c1', title: 'Assignment 1', kind: 'assignment', dueAt: '2026-09-26T06:59:00.000Z', dueText: 'Fri Sept 25', weightPct: 10, nodeIds: [], status: 'confirmed' };
const NOW = new Date('2026-09-01T12:00:00Z');

describe('escapeText / foldLine', () => {
  it('escapes backslash, semicolon, comma and newline', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
  it('folds long lines at 75 octets and never splits a character', () => {
    const line = 'SUMMARY:' + 'é'.repeat(100);
    const folded = foldLine(line);
    for (const part of folded.split('\r\n')) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n ').join('')).toBe(line);
  });
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:hi')).toBe('SUMMARY:hi');
  });
});

describe('generateIcs', () => {
  const ics = generateIcs([base], courses, NOW);
  it('is a CRLF calendar with the required properties', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '').includes('\n')).toBe(false);
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it('puts the course code in the title and a 1-day alarm in each event', () => {
    const unfolded = ics.replace(/\r\n /g, '');
    expect(unfolded).toContain('SUMMARY:[CSCI 220] Assignment 1');
    expect(unfolded).toContain('BEGIN:VALARM');
    expect(unfolded).toContain('TRIGGER:-P1D');
    expect(unfolded).toContain('UID:d1@atlas');
    expect(unfolded).toContain('DTSTAMP:20260901T120000Z');
  });
  it('makes end-of-day deadlines all-day events (Vancouver 11:59 PM)', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260925');
    expect(ics).toContain('DTEND;VALUE=DATE:20260926');
  });
  it('makes other times timed events, 2 hours for exams', () => {
    const exam: Deadline = { ...base, id: 'd2', kind: 'midterm', dueAt: '2026-10-23T01:00:00.000Z' };
    const out = generateIcs([exam], courses, NOW);
    expect(out).toContain('DTSTART:20261023T010000Z');
    expect(out).toContain('DTEND:20261023T030000Z');
  });
  it('escapes commas and semicolons in text', () => {
    expect(ics.replace(/\r\n /g, '')).toContain('Operating Systems\\; Part\\, One');
  });
  it('skips deadlines without a date and sorts the rest', () => {
    const later: Deadline = { ...base, id: 'd3', title: 'Later', dueAt: '2026-12-01T10:00:00.000Z' };
    const undated: Deadline = { ...base, id: 'd4', dueAt: null, status: 'needs_review' };
    const out = generateIcs([later, undated, base], courses, NOW);
    expect(out.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(out.indexOf('UID:d1@atlas')).toBeLessThan(out.indexOf('UID:d3@atlas'));
    expect(out).not.toContain('UID:d4@atlas');
  });
  it('is still a valid empty calendar with no deadlines', () => {
    expect(generateIcs([], [], NOW)).toBe('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Atlas//Deadlines//EN\r\nCALSCALE:GREGORIAN\r\nX-WR-CALNAME:Atlas deadlines\r\nEND:VCALENDAR\r\n');
  });
});

describe('isAllDay / googleCalendarUrl', () => {
  it('detects end-of-day', () => {
    expect(isAllDay('2026-09-26T06:59:00.000Z')).toBe(true);
    expect(isAllDay('2026-10-23T01:00:00.000Z')).toBe(false);
  });
  it('builds a Google template link', () => {
    const url = new URL(googleCalendarUrl(base, courses[0])!);
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('[CSCI 220] Assignment 1');
    expect(url.searchParams.get('dates')).toBe('20260925/20260926');
  });
  it('uses UTC times for timed events and returns null without a date', () => {
    const exam: Deadline = { ...base, kind: 'final', dueAt: '2026-10-23T01:00:00.000Z' };
    expect(new URL(googleCalendarUrl(exam, courses[0])!).searchParams.get('dates')).toBe('20261023T010000Z/20261023T030000Z');
    expect(googleCalendarUrl({ ...base, dueAt: null }, courses[0])).toBeNull();
  });
});
