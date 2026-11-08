// Keyboard behaviour for a tree (the WAI-ARIA tree pattern), as pure functions.
import type { OutlineNode } from './outline';

export type FlatRow = { key: string; level: number; parentKey: string | null; expandable: boolean; expanded: boolean };
export type NavKey = 'ArrowDown' | 'ArrowUp' | 'ArrowRight' | 'ArrowLeft' | 'Home' | 'End';

/** The rows currently on screen, in order: a branch's children appear only while it is expanded. */
export function flattenRows(tree: OutlineNode[], expanded: Set<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (nodes: OutlineNode[], level: number, parentKey: string | null) => {
    for (const n of nodes) {
      const kids = n.kind === 'ref' ? [] : n.children;
      const open = expanded.has(n.key);
      rows.push({ key: n.key, level, parentKey, expandable: kids.length > 0, expanded: kids.length > 0 && open });
      if (kids.length > 0 && open) walk(kids, level + 1, n.key);
    }
  };
  walk(tree, 1, null);
  return rows;
}

export type NavResult = { focus: string | null; toggle?: { key: string; expand: boolean } };

export function navigate(rows: FlatRow[], current: string | null, key: NavKey): NavResult {
  if (rows.length === 0) return { focus: null };
  const i = current ? rows.findIndex((r) => r.key === current) : -1;
  const row = i >= 0 ? rows[i] : null;
  switch (key) {
    case 'Home':
      return { focus: rows[0].key };
    case 'End':
      return { focus: rows[rows.length - 1].key };
    case 'ArrowDown':
      return { focus: rows[Math.min(i + 1, rows.length - 1)].key };
    case 'ArrowUp':
      return { focus: rows[Math.max(i - 1, 0)].key };
    case 'ArrowRight':
      if (!row || !row.expandable) return { focus: current };
      if (!row.expanded) return { focus: current, toggle: { key: row.key, expand: true } };
      return { focus: rows[i + 1]?.parentKey === row.key ? rows[i + 1].key : current };
    case 'ArrowLeft':
      if (!row) return { focus: current };
      if (row.expandable && row.expanded) return { focus: current, toggle: { key: row.key, expand: false } };
      return { focus: row.parentKey ?? current };
  }
}

/** Every branch key, to start with everything expanded or to "expand all". */
export function allBranchKeys(tree: OutlineNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: OutlineNode[]) => {
    for (const n of nodes) if (n.kind !== 'ref' && n.children.length > 0) { out.push(n.key); walk(n.children); }
  };
  walk(tree);
  return out;
}

/** Branches that make up the outline's structure (subjects, courses, topics, groups of tasks): not the links under each item. */
export function structureKeys(tree: OutlineNode[]): string[] {
  const out: string[] = [];
  const walk = (nodes: OutlineNode[]) => {
    for (const n of nodes) {
      if (n.kind === 'item' || n.kind === 'ref' || n.kind === 'requires' || n.kind === 'leads') continue;
      out.push(n.key);
      walk(n.children);
    }
  };
  walk(tree);
  return out;
}

/** Keys that must be open for `key` to be visible (all its ancestors). */
export function ancestorKeys(parentOf: Map<string, string | null>, key: string): string[] {
  const out: string[] = [];
  for (let p = parentOf.get(key) ?? null; p; p = parentOf.get(p) ?? null) out.push(p);
  return out;
}
