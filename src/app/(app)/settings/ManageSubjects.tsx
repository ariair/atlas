'use client';

import { useState } from 'react';
import type { Course, Topic, World } from '@/types';
import { call, json } from './api';
import { Section } from './controls';

type Say = (message: string, kind?: 'ok' | 'error') => void;
type Props = { world: World; demo: boolean; onChanged: () => void; say: Say };

export default function ManageSubjects({ world, demo, onChanged, say }: Props) {
  const subjects = [...new Set(world.courses.map((c) => c.domain))].sort((a, b) => a.localeCompare(b));
  return (
    <Section
      id="subjects"
      title="Subjects and courses"
      intro="A subject is a department, like Biology. Each subject is an island on the map. You can rename subjects, edit or delete courses, and tidy up topics."
    >
      {demo && (
        <p role="note" className="rounded-lg border border-rule-strong bg-surface p-3">
          Demo mode is read-only, so these controls are turned off. Exit demo mode to manage your own courses.
        </p>
      )}
      {subjects.length === 0 && <p className="text-ink-muted">No courses yet. <a className="underline" href="/upload">Add a course</a> to get started.</p>}
      {subjects.map((name) => (
        <SubjectBlock key={name} name={name} world={world} subjects={subjects} demo={demo} onChanged={onChanged} say={say} />
      ))}
    </Section>
  );
}

function SubjectBlock({ name, world, subjects, demo, onChanged, say }: Props & { name: string; subjects: string[] }) {
  const [renaming, setRenaming] = useState(false);
  const [next, setNext] = useState(name);
  const [busy, setBusy] = useState(false);
  const courses = world.courses.filter((c) => c.domain === name);
  const merging = subjects.includes(next.trim()) && next.trim() !== name;

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    const to = next.trim();
    if (!to || to === name) return setRenaming(false);
    setBusy(true);
    const r = await call('/api/subjects/rename', json('POST', { from: name, to }));
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say(merging ? `Merged “${name}” into “${to}”.` : `Renamed “${name}” to “${to}”.`);
    setRenaming(false);
    onChanged();
  }

  return (
    <article aria-label={`Subject: ${name}`} className="rounded-xl border border-rule bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">{name}</h3>
        {!renaming && (
          <button type="button" className="btn" disabled={demo} onClick={() => { setNext(name); setRenaming(true); }} aria-label={`Rename subject ${name}`}>
            Rename
          </button>
        )}
      </div>
      {renaming && (
        <form onSubmit={rename} className="mt-3 space-y-2">
          <label className="block font-medium" htmlFor={`rn-${name}`}>New name for this subject</label>
          <input id={`rn-${name}`} className="field max-w-sm" list="subject-names" value={next} maxLength={60} onChange={(e) => setNext(e.target.value)} />
          <datalist id="subject-names">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          {merging && <p className="text-ink-muted">“{next.trim()}” already exists. Saving will merge these two subjects into one island.</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{merging ? 'Merge subjects' : 'Save name'}</button>
            <button type="button" className="btn" onClick={() => setRenaming(false)}>Cancel</button>
          </div>
        </form>
      )}
      <ul className="mt-4 space-y-3">
        {courses.map((c) => (
          <CourseRow key={c.id} course={c} world={world} subjects={subjects} demo={demo} onChanged={onChanged} say={say} />
        ))}
      </ul>
    </article>
  );
}

function CourseRow({ course, world, subjects, demo, onChanged, say }: Props & { course: Course; subjects: string[] }) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view');
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ code: course.code, title: course.title, domain: course.domain, year: String(course.year), term: course.term });
  const items = world.nodes.filter((n) => n.courseIds.includes(course.id));
  const onlyHere = items.filter((n) => n.courseIds.length === 1).length;
  const deadlines = world.deadlines.filter((d) => d.courseId === course.id).length;
  const topics = world.topics.filter((t) => t.courseId === course.id);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await call(`/api/courses/${encodeURIComponent(course.id)}`, json('PATCH', { code: f.code, title: f.title, domain: f.domain, year: Number(f.year), term: f.term }));
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say(`Saved ${f.code}.`);
    setMode('view');
    onChanged();
  }

  async function remove() {
    setBusy(true);
    const r = await call(`/api/courses/${encodeURIComponent(course.id)}`, { method: 'DELETE' });
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say(`Deleted ${course.code} and everything that belonged only to it.`);
    onChanged();
  }

  return (
    <li className="rounded-lg border border-rule p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">{course.code}: {course.title}</p>
          <p className="text-ink-muted">Year {course.year} · {course.term} · {items.length} items · {deadlines} deadlines</p>
        </div>
        {mode === 'view' && (
          <div className="flex gap-2">
            <button type="button" className="btn" disabled={demo} onClick={() => setMode('edit')} aria-label={`Edit ${course.code}`}>Edit</button>
            <button type="button" className="btn btn-danger" disabled={demo} onClick={() => setMode('delete')} aria-label={`Delete ${course.code}`}>Delete</button>
          </div>
        )}
      </div>

      {mode === 'edit' && (
        <form onSubmit={save} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">Course code<input className="field" required maxLength={40} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></label>
          <label className="block">Course title<input className="field" required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="block">Subject<input className="field" required maxLength={60} list="subject-names-edit" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} /></label>
          <datalist id="subject-names-edit">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          <label className="block">Term<input className="field" required maxLength={40} value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} /></label>
          <label className="block">Year of study
            <select className="field" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })}>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>Save changes</button>
            <button type="button" className="btn" onClick={() => setMode('view')}>Cancel</button>
          </div>
        </form>
      )}

      {mode === 'delete' && (
        <div role="alertdialog" aria-label={`Confirm deleting ${course.code}`} className="mt-3 rounded-lg border border-[var(--danger)] p-3">
          <p className="font-medium">Delete {course.code}?</p>
          <p className="mt-1 max-w-prose">
            This removes the course, its {deadlines} deadlines, its topics and {onlyHere} items that belong only to this course. Items shared with another course stay. It cannot be undone. You can export your map first.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-danger" disabled={busy} onClick={remove}>Yes, delete {course.code}</button>
            <button type="button" className="btn" onClick={() => setMode('view')}>Keep it</button>
          </div>
        </div>
      )}

      {topics.length > 0 && mode === 'view' && (
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">Topics ({topics.length})</summary>
          <ul className="mt-1 space-y-2">
            {topics.map((t) => (
              <TopicRow key={t.id} topic={t} siblings={topics.filter((x) => x.id !== t.id)} demo={demo} onChanged={onChanged} say={say} />
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

function TopicRow({ topic, siblings, demo, onChanged, say }: { topic: Topic; siblings: Topic[]; demo: boolean; onChanged: () => void; say: Say }) {
  const [name, setName] = useState(topic.name);
  const [mergeInto, setMergeInto] = useState('');
  const [busy, setBusy] = useState(false);

  async function act(path: string, init: RequestInit, done: string) {
    setBusy(true);
    const r = await call(path, init);
    setBusy(false);
    if (!r.ok) return say(r.error, 'error');
    say(done);
    onChanged();
  }

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border border-rule p-2">
      <label className="sr-only" htmlFor={`t-${topic.id}`}>Name of topic {topic.name}</label>
      <input id={`t-${topic.id}`} className="field max-w-xs flex-1" value={name} maxLength={80} disabled={demo} onChange={(e) => setName(e.target.value)} />
      <button type="button" className="btn" disabled={demo || busy || !name.trim() || name.trim() === topic.name} onClick={() => act(`/api/topics/${encodeURIComponent(topic.id)}`, json('PATCH', { name }), `Renamed topic to “${name.trim()}”.`)} aria-label={`Save name for topic ${topic.name}`}>
        Rename
      </button>
      {siblings.length > 0 && (
        <>
          <label className="sr-only" htmlFor={`m-${topic.id}`}>Merge topic {topic.name} into</label>
          <select id={`m-${topic.id}`} className="field w-auto" value={mergeInto} disabled={demo} onChange={(e) => setMergeInto(e.target.value)}>
            <option value="">Merge into…</option>
            {siblings.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button type="button" className="btn" disabled={demo || busy || !mergeInto} onClick={() => act('/api/topics/merge', json('POST', { keepId: mergeInto, mergeId: topic.id }), `Merged topic “${topic.name}”.`)} aria-label={`Merge topic ${topic.name}`}>
            Merge
          </button>
        </>
      )}
      <button type="button" className="btn btn-danger" disabled={demo || busy} onClick={() => act(`/api/topics/${encodeURIComponent(topic.id)}`, { method: 'DELETE' }, `Deleted topic “${topic.name}”. Its items stay.`)} aria-label={`Delete topic ${topic.name}`}>
        Delete
      </button>
    </li>
  );
}
