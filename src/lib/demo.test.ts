import { afterEach, describe, expect, it } from 'vitest';
import { RECORDED } from '../fixtures/recorded';
import { WorldSchema } from './schemas';
import { AiExtractionSchema } from './ingest/prompt';
import { AiLinksSchema } from './ingest/link';
import { demoSampleIds, demoWorld, findSampleByText, getCookie, isDemoRequest, sampleAdditions, samplesCookieHeader } from './demo';

const NOW = new Date('2026-11-09T12:00:00Z');
const req = (url: string, cookie?: string) => new Request(url, { headers: cookie ? { cookie } : {} });

describe('recorded samples', () => {
  it('has the three samples, each matching its schemas', () => {
    expect(RECORDED.map((s) => s.id).sort()).toEqual(['biol210', 'csci220', 'math230']);
    for (const s of RECORDED) {
      expect(AiExtractionSchema.safeParse(s.ai).success).toBe(true);
      expect(AiLinksSchema.safeParse(s.links).success).toBe(true);
      expect(s.text.length).toBeGreaterThan(100);
    }
  });
  it('finds a sample by its text, ignoring whitespace differences', () => {
    const s = RECORDED[0];
    expect(findSampleByText(s.text)?.id).toBe(s.id);
    expect(findSampleByText('\n  ' + s.text.replace(/\n/g, '\r\n') + '  ')?.id).toBe(s.id);
    expect(findSampleByText('some other syllabus')).toBeUndefined();
  });
});

describe('demoWorld', () => {
  it('is just the Sample University world with no samples added', () => {
    const w = demoWorld(NOW);
    expect(w.courses).toHaveLength(7);
    expect(w.nodes).toHaveLength(78);
  });
  it('grows when samples are added, and stays valid with no dangling links', () => {
    const w = demoWorld(NOW, ['csci220', 'biol210', 'math230']);
    expect(WorldSchema.safeParse(w).success).toBe(true);
    expect(w.courses).toHaveLength(10);
    const ids = new Set(w.nodes.map((n) => n.id));
    for (const e of w.edges) {
      expect(ids.has(e.from), e.id).toBe(true);
      expect(ids.has(e.to), e.id).toBe(true);
    }
    for (const d of w.deadlines) d.nodeIds.forEach((id) => expect(ids.has(id), d.id).toBe(true));
    expect(new Set(w.edges.map((e) => e.id)).size).toBe(w.edges.length);
  });
  it('adds pre-recorded suggested links to the demo world', () => {
    for (const s of RECORDED) {
      const base = demoWorld(NOW);
      const add = sampleAdditions(s, base)!;
      expect(add.suggestions).toBeGreaterThan(0);
      expect(add.additions.edges.filter((e) => e.status === 'suggested')).toHaveLength(add.suggestions);
    }
  });
  it('ignores unknown samples and does not add one twice', () => {
    expect(demoWorld(NOW, ['nope']).courses).toHaveLength(7);
    expect(demoWorld(NOW, ['csci220', 'csci220']).courses).toHaveLength(8);
  });
});

describe('isDemoRequest and cookies', () => {
  afterEach(() => {
    delete process.env.DEMO;
  });
  it('is off by default', () => {
    expect(isDemoRequest(req('http://x/api/world'))).toBe(false);
  });
  it('turns on from the query, the cookie, or the env', () => {
    expect(isDemoRequest(req('http://x/api/world?demo=1'))).toBe(true);
    expect(isDemoRequest(req('http://x/api/world', 'a=b; atlas_demo=1'))).toBe(true);
    process.env.DEMO = '1';
    expect(isDemoRequest(req('http://x/api/world'))).toBe(true);
  });
  it('reads only valid sample ids from the cookie', () => {
    expect(demoSampleIds(req('http://x', 'atlas_demo_samples=csci220,evil,biol210'))).toEqual(['csci220', 'biol210']);
    expect(demoSampleIds(req('http://x'))).toEqual([]);
    expect(getCookie(req('http://x', 'k=a%20b'), 'k')).toBe('a b');
  });
  it('writes the samples cookie', () => {
    expect(samplesCookieHeader(['csci220'])).toContain('atlas_demo_samples=csci220;');
    expect(samplesCookieHeader([])).toContain('atlas_demo_samples=;');
  });
});
