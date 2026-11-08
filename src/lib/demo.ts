// Demo mode: the Sample University world plus recorded AI responses. Needs no database, no AI and no login.
// Turned on by env DEMO=1, by ?demo=1 (the badge then remembers it in a cookie), by the atlas_demo cookie,
// or, when login is configured, for anyone who is not logged in.
// Server code that uses AI or the database should check isDemoRequest(request) first.
import { getDemoWorld } from '../fixtures/demoWorld';
import { authConfigured, hasSessionCookie } from './authConfig';
import { RECORDED, type RecordedSample } from '../fixtures/recorded';
import type { World } from '../types';
import { buildDraft } from './ingest/buildDraft';
import { draftToAdditions } from './ingest/commit';
import { AiLinksSchema, buildSuggestedEdges } from './ingest/link';
import { AiExtractionSchema } from './ingest/prompt';

export const DEMO_COOKIE = 'atlas_demo';
export const SAMPLES_COOKIE = 'atlas_demo_samples';

export function getCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

export function isDemoRequest(request: Request): boolean {
  if (process.env.DEMO === '1' || new URL(request.url).searchParams.get('demo') === '1' || getCookie(request, DEMO_COOKIE) === '1') return true;
  // With login switched on, visitors who are not logged in only ever see the demo. Real data needs an account.
  return authConfigured() && !hasSessionCookie(request);
}

/** Samples the visitor has "uploaded" so far in this demo session (kept in a small cookie). */
export function demoSampleIds(request: Request): string[] {
  const valid = new Set(RECORDED.map((s) => s.id));
  return (getCookie(request, SAMPLES_COOKIE) ?? '').split(',').filter((id) => valid.has(id));
}

export function samplesCookieHeader(ids: string[]): string {
  return `${SAMPLES_COOKIE}=${ids.join(',')}; Path=/; Max-Age=86400; SameSite=Lax`;
}

const squash = (t: string) => t.replace(/\s+/g, ' ').trim();
export function findSampleByText(text: string): RecordedSample | undefined {
  const key = squash(text);
  return RECORDED.find((s) => squash(s.text) === key);
}

export function getSample(id: string): RecordedSample | undefined {
  return RECORDED.find((s) => s.id === id);
}

/** What adding one sample does to a world: its new rows, plus pre-recorded suggested links. */
export function sampleAdditions(sample: RecordedSample, base: World): { additions: World; suggestions: number } | null {
  const draft = buildDraft(AiExtractionSchema.parse(sample.ai), sample.course);
  const result = draftToAdditions(draft, new Set(base.courses.map((c) => c.id)));
  if (!result.ok) return null;
  const newIds = new Set(result.additions.nodes.filter((n) => n.type === 'concept').map((n) => n.id));
  const existingIds = new Set(base.nodes.filter((n) => n.type === 'concept').map((n) => n.id));
  const suggested = buildSuggestedEdges(AiLinksSchema.parse(sample.links), newIds, existingIds, new Set(base.edges.map((e) => e.id)));
  return { additions: { ...result.additions, edges: [...result.additions.edges, ...suggested] }, suggestions: suggested.length };
}

/** The demo world, plus any samples the visitor has added. */
export function demoWorld(now: Date, sampleIds: string[] = []): World {
  let world = getDemoWorld(now);
  for (const id of sampleIds) {
    const sample = getSample(id);
    const add = sample && sampleAdditions(sample, world);
    if (!add) continue;
    const a = add.additions;
    world = {
      courses: [...world.courses, ...a.courses],
      topics: [...world.topics, ...a.topics],
      nodes: [...world.nodes, ...a.nodes],
      edges: [...world.edges, ...a.edges],
      deadlines: [...world.deadlines, ...a.deadlines],
    };
  }
  return world;
}
