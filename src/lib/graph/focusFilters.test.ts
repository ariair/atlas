import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '../../fixtures/demoWorld';
import { connectedIds, focusVisibleIds, intersectVisible } from './focus';
import { NO_FILTERS, activeFilterCount, applyFilters, filterOptions, isUnfiltered, nodePasses, toggle } from './filters';

const world = getDemoWorld(new Date('2026-11-09T12:00:00Z'));

describe('focus / connections', () => {
  it('direct: the item and its direct links, both directions', () => {
    const ids = connectedIds(world, 'nn', 'direct');
    expect(ids.has('nn')).toBe(true);
    expect(ids.has('backprop')).toBe(true); // requires
    expect(ids.has('cnn')).toBe(true); // leads to
    expect(ids.has('chainrule')).toBe(false); // two hops away
  });
  it('2 hops reaches further', () => {
    const two = connectedIds(world, 'nn', 'two');
    expect(two.has('chainrule')).toBe(true);
    expect(two.size).toBeGreaterThan(connectedIds(world, 'nn', 'direct').size);
  });
  it('whole chain follows prerequisites back to Year 1 maths and forward to what needs it', () => {
    const all = connectedIds(world, 'nn', 'all');
    for (const id of ['backprop', 'chainrule', 'derivatives', 'limits', 'cnn', 'cs301_final', 'proteinpred']) expect(all.has(id), id).toBe(true);
    expect(all.has('hashtables')).toBe(false); // unrelated
  });
  it('can leave out suggested links', () => {
    const withS = connectedIds(world, 'blast', 'direct', true);
    const withoutS = connectedIds(world, 'blast', 'direct', false);
    expect(withoutS.has('hashtables')).toBe(false); // only linked by a suggested edge
    expect(withS.has('hashtables')).toBe(true);
    expect(withoutS.size).toBeLessThan(withS.size);
  });
  it('is null (show everything) unless Focus is on and an item is found', () => {
    expect(focusVisibleIds(world, 'nn', { focus: false, depth: 'direct', includeSuggested: true })).toBeNull();
    expect(focusVisibleIds(world, null, { focus: true, depth: 'direct', includeSuggested: true })).toBeNull();
    expect(focusVisibleIds(world, 'ghost', { focus: true, depth: 'direct', includeSuggested: true })).toBeNull();
    expect(focusVisibleIds(world, 'nn', { focus: true, depth: 'direct', includeSuggested: true })?.has('nn')).toBe(true);
  });
  it('an isolated item shows just itself', () => {
    const w = { ...world, edges: [] };
    expect([...connectedIds(w, 'nn', 'all')]).toEqual(['nn']);
  });
  it('intersects visible sets, treating null as everything', () => {
    expect(intersectVisible(null, null)).toBeNull();
    expect([...intersectVisible(new Set(['a', 'b']), null)!]).toEqual(['a', 'b']);
    expect([...intersectVisible(new Set(['a', 'b']), new Set(['b', 'c']))!]).toEqual(['b']);
  });
});

describe('filters', () => {
  it('no filters shows everything', () => {
    const r = applyFilters(world, NO_FILTERS);
    expect(r.nodeIds.size).toBe(world.nodes.length);
    expect(r.edgeIds.size).toBe(world.edges.length);
    expect(isUnfiltered(NO_FILTERS)).toBe(true);
  });
  it('OR within a group', () => {
    const y1 = applyFilters(world, { ...NO_FILTERS, years: [1] }).nodeIds.size;
    const y12 = applyFilters(world, { ...NO_FILTERS, years: [1, 2] }).nodeIds.size;
    expect(y12).toBeGreaterThan(y1);
  });
  it('AND across groups', () => {
    const r = applyFilters(world, { ...NO_FILTERS, years: [3], subjects: ['Computer Science'], types: ['concept'] });
    expect(r.nodeIds.size).toBeGreaterThan(0);
    for (const id of r.nodeIds) {
      const n = world.nodes.find((x) => x.id === id)!;
      expect(n.years).toContain(3);
      expect(n.domains).toContain('Computer Science');
      expect(n.type).toBe('concept');
    }
  });
  it('a bridge item matches any of its subjects', () => {
    const bridge = world.nodes.find((n) => n.id === 'seqalign')!;
    expect(nodePasses(bridge, { ...NO_FILTERS, subjects: ['Biology'] })).toBe(true);
    expect(nodePasses(bridge, { ...NO_FILTERS, subjects: ['Computer Science'] })).toBe(true);
    expect(nodePasses(bridge, { ...NO_FILTERS, subjects: ['Mathematics'] })).toBe(false);
  });
  it('keeps only links between visible items and can hide suggested links', () => {
    const r = applyFilters(world, { ...NO_FILTERS, years: [1] });
    for (const id of r.edgeIds) {
      const e = world.edges.find((x) => x.id === id)!;
      expect(r.nodeIds.has(e.from) && r.nodeIds.has(e.to)).toBe(true);
    }
    const noSug = applyFilters(world, { ...NO_FILTERS, showSuggested: false });
    expect(noSug.edgeIds.size).toBe(world.edges.filter((e) => e.status !== 'suggested').length);
  });
  it('counts active filters and toggles values', () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, years: [1, 2], showSuggested: false })).toBe(3);
    expect(toggle([1, 2], 2)).toEqual([1]);
    expect(toggle([1], 3)).toEqual([1, 3]);
  });
  it('lists the choices with counts', () => {
    const o = filterOptions(world);
    expect(o.years.map((y) => y.value)).toEqual([1, 2, 3]);
    expect(o.subjects.map((s) => s.value).sort()).toEqual(['Biology', 'Computer Science', 'Mathematics']);
    expect(o.courses).toHaveLength(7);
    expect(o.types.map((t) => t.value).sort()).toEqual(['assignment', 'concept', 'exam']);
    expect(o.years.reduce((s, y) => s + y.count, 0)).toBeGreaterThanOrEqual(world.nodes.length);
  });
});
