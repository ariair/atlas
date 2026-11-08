import { describe, expect, it } from 'vitest';
import { MasteryBatchSchema, NodePatchSchema, TopicCreateSchema, TopicMergeSchema, TopicPatchSchema } from './nodePatch';

describe('NodePatchSchema', () => {
  it('accepts any single field', () => {
    for (const p of [{ label: 'New name' }, { summary: '' }, { topicId: null }, { topicId: 'csci101-t0' }, { mastery: 0 }, { mastery: 1 }, { mastery: null }]) {
      expect(NodePatchSchema.safeParse(p).success, JSON.stringify(p)).toBe(true);
    }
  });
  it('trims the label and rejects blank, empty and unknown fields', () => {
    expect(NodePatchSchema.parse({ label: '  Trees  ' }).label).toBe('Trees');
    for (const p of [{}, { label: '   ' }, { mastery: 1.5 }, { mastery: -0.1 }, { mastery: '0.5' }, { type: 'exam' }, { label: 'x'.repeat(201) }]) {
      expect(NodePatchSchema.safeParse(p).success, JSON.stringify(p)).toBe(false);
    }
    expect(NodePatchSchema.safeParse(null).success).toBe(false);
  });
});

describe('MasteryBatchSchema', () => {
  it('accepts 1 to 100 updates', () => {
    expect(MasteryBatchSchema.safeParse({ updates: [{ id: 'a', mastery: 0.5 }, { id: 'b', mastery: null }] }).success).toBe(true);
    expect(MasteryBatchSchema.safeParse({ updates: Array.from({ length: 100 }, (_, i) => ({ id: `n${i}`, mastery: 1 })) }).success).toBe(true);
  });
  it('rejects empty, oversized and invalid batches', () => {
    expect(MasteryBatchSchema.safeParse({ updates: [] }).success).toBe(false);
    expect(MasteryBatchSchema.safeParse({ updates: Array.from({ length: 101 }, (_, i) => ({ id: `n${i}`, mastery: 1 })) }).success).toBe(false);
    expect(MasteryBatchSchema.safeParse({ updates: [{ id: 'a', mastery: 2 }] }).success).toBe(false);
    expect(MasteryBatchSchema.safeParse({ updates: [{ id: 'a' }] }).success).toBe(false);
  });
});

describe('topic schemas', () => {
  it('create needs a name', () => {
    expect(TopicCreateSchema.safeParse({ name: 'Graphs', courseId: 'csci201' }).success).toBe(true);
    expect(TopicCreateSchema.safeParse({ name: 'Graphs' }).success).toBe(true);
    expect(TopicCreateSchema.safeParse({ name: ' ' }).success).toBe(false);
  });
  it('patch needs at least one field', () => {
    expect(TopicPatchSchema.safeParse({ name: 'Renamed' }).success).toBe(true);
    expect(TopicPatchSchema.safeParse({ courseId: null }).success).toBe(true);
    expect(TopicPatchSchema.safeParse({}).success).toBe(false);
  });
  it('merge needs two different ids', () => {
    expect(TopicMergeSchema.safeParse({ keepId: 'a', mergeId: 'b' }).success).toBe(true);
    expect(TopicMergeSchema.safeParse({ keepId: 'a', mergeId: 'a' }).success).toBe(false);
  });
});
