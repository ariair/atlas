// Request bodies for PATCH /api/nodes/:id, PATCH /api/nodes (mastery batch) and the topic routes.
import { z } from 'zod';

const id = z.string().trim().min(1).max(200);

/** Change one node. Send only the fields you want to change. topicId: null removes the topic. mastery: 0 to 1, or null to clear. */
export const NodePatchSchema = z
  .object({
    label: z.string().trim().min(1).max(200).optional(),
    summary: z.string().max(1000).optional(),
    topicId: id.nullable().optional(),
    mastery: z.number().min(0).max(1).nullable().optional(),
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, 'Send at least one field to change.');
export type NodePatch = z.infer<typeof NodePatchSchema>;

/** Save quiz results for many nodes at once. */
export const MasteryBatchSchema = z
  .object({
    updates: z.array(z.object({ id, mastery: z.number().min(0).max(1).nullable() }).strict()).min(1).max(100),
  })
  .strict();

export const TopicCreateSchema = z.object({ name: z.string().trim().min(1).max(80), courseId: id.nullable().optional() }).strict();

export const TopicPatchSchema = z
  .object({ name: z.string().trim().min(1).max(80).optional(), courseId: id.nullable().optional() })
  .strict()
  .refine((p) => Object.keys(p).length > 0, 'Send at least one field to change.');

export const TopicMergeSchema = z
  .object({ keepId: id, mergeId: id })
  .strict()
  .refine((b) => b.keepId !== b.mergeId, 'Pick two different topics.');
