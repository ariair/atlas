import { describe, expect, it } from 'vitest';
import type { GraphEdge, GraphNode } from '@/types';
import { relatedTopics } from './related';

const node = (id: string, type: GraphNode['type'] = 'concept'): GraphNode => ({ id, label: id.toUpperCase(), type, courseIds: [], domains: [], years: [], topicId: null, summary: '', mastery: null });
const edge = (id: string, from: string, to: string, type: GraphEdge['type'], status: GraphEdge['status'] = 'accepted'): GraphEdge => ({ id, from, to, type, label: null, status, confidence: 1 });

const nodes = [node('a'), node('b'), node('c'), node('d'), node('e'), node('x', 'assignment')];
const edges = [
  edge('1', 'a', 'b', 'prerequisite'), // a is needed for b
  edge('2', 'b', 'c', 'prerequisite'), // b is needed for c
  edge('3', 'c', 'd', 'related'),
  edge('4', 'e', 'c', 'applies'),
  edge('5', 'x', 'c', 'prerequisite'), // not a concept
];

describe('relatedTopics', () => {
  it('finds what the picked topics build on, several steps back', () => {
    expect(relatedTopics({ nodes, edges }, ['c']).prerequisites.map((n) => n.id)).toEqual(['a', 'b']);
  });
  it('finds related and applied topics in either direction', () => {
    expect(relatedTopics({ nodes, edges }, ['c']).associated.map((n) => n.id)).toEqual(['d', 'e']);
  });
  it('leaves out picked topics, suggested links and non-concepts', () => {
    const r = relatedTopics({ nodes, edges: [...edges, edge('6', 'c', 'a', 'related', 'suggested')] }, ['b', 'c']);
    expect(r.prerequisites.map((n) => n.id)).toEqual(['a']);
    expect(r.associated.map((n) => n.id)).toEqual(['d', 'e']);
  });
  it('is empty when nothing is picked', () => {
    expect(relatedTopics({ nodes, edges }, [])).toEqual({ prerequisites: [], associated: [] });
  });
});
