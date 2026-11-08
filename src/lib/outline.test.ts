import { describe, expect, it } from 'vitest';
import { getDemoWorld } from '../fixtures/demoWorld';
import { buildOutline, indexItems, type OutlineGroup, type OutlineNode } from './outline';
import { allBranchKeys, ancestorKeys, flattenRows, navigate } from './treeNav';

const world = getDemoWorld(new Date('2026-11-09T12:00:00Z'));
const tree = buildOutline(world);
const find = (nodes: OutlineNode[], pred: (n: OutlineNode) => boolean): OutlineNode | undefined => {
  for (const n of nodes) {
    if (pred(n)) return n;
    if (n.kind !== 'ref') {
      const r = find(n.children, pred);
      if (r) return r;
    }
  }
};

describe('buildOutline', () => {
  it('is Subject > Course > Topic > Item', () => {
    expect(tree.map((s) => s.label)).toEqual(['Biology', 'Computer Science', 'Mathematics']);
    const cs = tree.find((s) => s.label === 'Computer Science')!;
    expect(cs.kind).toBe('subject');
    const courses = cs.children as OutlineGroup[];
    expect(courses.map((c) => c.kind)).toEqual(Array(courses.length).fill('course'));
    expect(courses[0].detail).toMatch(/^Year 1/);
    const topic = (courses[0].children as OutlineGroup[]).find((g) => g.kind === 'topic')!;
    expect(topic.children[0].kind).toBe('item');
  });
  it('counts every item exactly once per course it belongs to', () => {
    const { total } = indexItems(tree);
    const placements = world.nodes.reduce((s, n) => s + n.courseIds.length, 0);
    expect(total).toBe(placements);
  });
  it('lists Requires and Leads to for an item', () => {
    const nn = find(tree, (n) => n.kind === 'item' && n.id === 'nn') as Extract<OutlineNode, { kind: 'item' }>;
    const req = nn.children.find((g) => g.kind === 'requires')!;
    const leads = nn.children.find((g) => g.kind === 'leads')!;
    expect(req.children.map((r) => (r.kind === 'ref' ? r.id : ''))).toEqual(expect.arrayContaining(['backprop', 'perceptron']));
    expect(leads.children.map((r) => (r.kind === 'ref' ? r.id : ''))).toContain('cnn');
    expect(req.label).toMatch(/^Requires \(\d+\)$/);
  });
  it('puts assignments and exams in their own group, with their deadlines', () => {
    const task = find(tree, (n) => n.kind === 'item' && n.id === 'cs201_a2') as Extract<OutlineNode, { kind: 'item' }>;
    expect(task.deadlines.length).toBeGreaterThan(0);
    const group = find(tree, (n) => n.kind === 'assessments' && n.key === 'a:csci201');
    expect(group?.kind).toBe('assessments');
  });
  it('shows a bridge item under every course it belongs to', () => {
    const rows = indexItems(tree);
    const keys = [...rows.parentOf.keys()].filter((k) => /^i:[^:]+:gradientdescent$/.test(k));
    expect(keys.length).toBe(world.nodes.find((n) => n.id === 'gradientdescent')!.courseIds.length);
  });
  it('shows only the visible items and drops empty branches', () => {
    const visible = new Set(['nn', 'backprop']);
    const small = buildOutline(world, { visible });
    expect(indexItems(small).total).toBe(2);
    expect(small.map((s) => s.label)).toEqual(['Computer Science']);
    const nn = find(small, (n) => n.kind === 'item' && n.id === 'nn') as Extract<OutlineNode, { kind: 'item' }>;
    const req = nn.children.find((g) => g.kind === 'requires')!;
    expect(req.children.map((r) => (r.kind === 'ref' ? r.id : ''))).toEqual(['backprop']); // links to hidden items are left out
  });
  it('marks search matches', () => {
    const t = buildOutline(world, { matches: new Set(['nn']) });
    expect((find(t, (n) => n.kind === 'item' && n.id === 'nn') as Extract<OutlineNode, { kind: 'item' }>).match).toBe(true);
    expect((find(t, (n) => n.kind === 'item' && n.id === 'cnn') as Extract<OutlineNode, { kind: 'item' }>).match).toBe(false);
  });
  it('an empty world is an empty outline', () => {
    expect(buildOutline({ courses: [], topics: [], nodes: [], edges: [], deadlines: [] })).toEqual([]);
  });
  it('has unique keys', () => {
    const keys: string[] = [];
    const walk = (ns: OutlineNode[]) => ns.forEach((n) => { keys.push(n.key); if (n.kind !== 'ref') walk(n.children); });
    walk(tree);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('tree keyboard navigation', () => {
  const rowsOf = (open: string[]) => flattenRows(tree, new Set(open));
  it('shows only top-level rows when nothing is expanded', () => {
    const rows = rowsOf([]);
    expect(rows).toHaveLength(tree.length);
    expect(rows.every((r) => r.level === 1 && r.expandable && !r.expanded)).toBe(true);
  });
  it('shows children of expanded branches, at the next level', () => {
    const rows = rowsOf(['s:Biology']);
    expect(rows.length).toBeGreaterThan(tree.length);
    expect(rows.find((r) => r.key.startsWith('c:'))?.level).toBe(2);
  });
  it('Down/Up/Home/End move between visible rows and stop at the ends', () => {
    const rows = rowsOf([]);
    expect(navigate(rows, rows[0].key, 'ArrowDown').focus).toBe(rows[1].key);
    expect(navigate(rows, rows[1].key, 'ArrowUp').focus).toBe(rows[0].key);
    expect(navigate(rows, rows[0].key, 'ArrowUp').focus).toBe(rows[0].key);
    expect(navigate(rows, rows[rows.length - 1].key, 'ArrowDown').focus).toBe(rows[rows.length - 1].key);
    expect(navigate(rows, rows[1].key, 'Home').focus).toBe(rows[0].key);
    expect(navigate(rows, rows[0].key, 'End').focus).toBe(rows[rows.length - 1].key);
  });
  it('Right opens a closed branch, then enters it; Left closes it, then goes to the parent', () => {
    let rows = rowsOf([]);
    const first = rows[0].key;
    expect(navigate(rows, first, 'ArrowRight')).toEqual({ focus: first, toggle: { key: first, expand: true } });
    rows = rowsOf([first]);
    const child = navigate(rows, first, 'ArrowRight').focus!;
    expect(rows.find((r) => r.key === child)?.parentKey).toBe(first);
    expect(navigate(rows, child, 'ArrowLeft').focus).toBe(first);
    expect(navigate(rows, first, 'ArrowLeft')).toEqual({ focus: first, toggle: { key: first, expand: false } });
  });
  it('Right on a leaf and Left at the top do nothing', () => {
    const open = allBranchKeys(tree);
    const rows = rowsOf(open);
    const leaf = rows.find((r) => !r.expandable)!;
    expect(navigate(rows, leaf.key, 'ArrowRight')).toEqual({ focus: leaf.key });
    const closed = rowsOf([]);
    expect(navigate(closed, closed[0].key, 'ArrowLeft')).toEqual({ focus: closed[0].key });
  });
  it('finds the ancestors to open before jumping to a row', () => {
    const { firstKeyOf, parentOf } = indexItems(tree);
    const key = firstKeyOf.get('nn')!;
    const anc = ancestorKeys(parentOf, key);
    expect(anc.length).toBe(3); // topic, course and subject
    const rows = flattenRows(tree, new Set(anc));
    expect(rows.some((r) => r.key === key)).toBe(true);
  });
  it('handles an empty tree', () => {
    expect(navigate([], null, 'ArrowDown')).toEqual({ focus: null });
  });
});

import { structureKeys } from './treeNav';
describe('structureKeys', () => {
  it('opens subjects, courses, topics and task groups, but not the links under each item', () => {
    const keys = structureKeys(tree);
    expect(keys.some((k) => k.startsWith('s:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('c:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('t:'))).toBe(true);
    expect(keys.some((k) => k.startsWith('i:'))).toBe(false);
    expect(keys.length).toBeLessThan(allBranchKeys(tree).length);
  });
});
