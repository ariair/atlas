// Pure helpers the Review screen uses to edit a draft without breaking links.
// Edges and deadline nodeIds point to node labels, so renaming or deleting a node updates them.
import type { ExtractionDraft } from '../../types';

export function renameNode(draft: ExtractionDraft, index: number, newLabel: string): ExtractionDraft {
  const old = draft.nodes[index]?.label;
  if (old === undefined || old === newLabel) return draft;
  const swap = (l: string) => (l === old ? newLabel : l);
  return {
    ...draft,
    nodes: draft.nodes.map((n, i) => (i === index ? { ...n, label: newLabel } : n)),
    edges: draft.edges.map((e) => ({ ...e, from: swap(e.from), to: swap(e.to) })),
    deadlines: draft.deadlines.map((d) => ({ ...d, title: d.title === old ? newLabel : d.title, nodeIds: d.nodeIds.map(swap) })),
  };
}

export function updateNode(draft: ExtractionDraft, index: number, patch: Partial<ExtractionDraft['nodes'][number]>): ExtractionDraft {
  return { ...draft, nodes: draft.nodes.map((n, i) => (i === index ? { ...n, ...patch } : n)) };
}

export function deleteNode(draft: ExtractionDraft, index: number): ExtractionDraft {
  const label = draft.nodes[index]?.label;
  if (label === undefined) return draft;
  return {
    ...draft,
    nodes: draft.nodes.filter((_, i) => i !== index),
    edges: draft.edges.filter((e) => e.from !== label && e.to !== label),
    deadlines: draft.deadlines.map((d) => ({ ...d, nodeIds: d.nodeIds.filter((l) => l !== label) })),
  };
}

export function updateDeadline(
  draft: ExtractionDraft,
  index: number,
  patch: Partial<ExtractionDraft['deadlines'][number]>,
): ExtractionDraft {
  return {
    ...draft,
    deadlines: draft.deadlines.map((d, i) => {
      if (i !== index) return d;
      const next = { ...d, ...patch };
      next.status = next.dueAt ? 'confirmed' : 'needs_review';
      return next;
    }),
  };
}

export function deleteDeadline(draft: ExtractionDraft, index: number): ExtractionDraft {
  return { ...draft, deadlines: draft.deadlines.filter((_, i) => i !== index) };
}
