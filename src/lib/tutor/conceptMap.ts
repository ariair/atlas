// A concept map made by code (no AI) as a Mermaid flowchart. Reliable and instant.
import type { TutorContext } from './context';

/** Labels go inside "…" in Mermaid. Remove anything that could break out of the label or inject markup. */
export function mermaidLabel(text: string): string {
  return text.replace(/["`<>\\{}\[\]|;#&]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'item';
}

export function buildConceptMap(ctx: TutorContext): { mermaid: string; altText: string; nodeCount: number } {
  const nodes = [...ctx.selected, ...ctx.prerequisites];
  const key = new Map(nodes.map((n, i) => [n.id, `n${i}`]));
  const selectedIds = new Set(ctx.selected.map((n) => n.id));

  const lines = ['flowchart LR'];
  for (const n of nodes) lines.push(`  ${key.get(n.id)}["${mermaidLabel(n.label)}"]`);
  for (const e of ctx.edges) {
    const a = key.get(e.from);
    const b = key.get(e.to);
    if (!a || !b) continue;
    lines.push(e.type === 'prerequisite' ? `  ${a} --> ${b}` : `  ${a} -.- ${b}`);
  }
  const bg = nodes.filter((n) => !selectedIds.has(n.id)).map((n) => key.get(n.id));
  if (bg.length) lines.push('  classDef background stroke-dasharray: 4 3', `  class ${bg.join(',')} background`);

  const name = new Map(nodes.map((n) => [n.id, n.label]));
  const links = ctx.edges
    .filter((e) => e.type === 'prerequisite')
    .map((e) => `${name.get(e.from)} comes before ${name.get(e.to)}`);
  const altText =
    `Concept map of ${nodes.length} ideas: ${nodes.map((n) => n.label).join(', ')}.` +
    (links.length ? ` Order of learning: ${links.join('; ')}.` : ' No prerequisite links between them.');
  return { mermaid: lines.join('\n'), altText, nodeCount: nodes.length };
}
