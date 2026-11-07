import type { z } from 'zod';
import type {
  NodeTypeSchema,
  EdgeTypeSchema,
  EdgeStatusSchema,
  CourseSchema,
  TopicSchema,
  GraphNodeSchema,
  GraphEdgeSchema,
  DeadlineSchema,
  WorldSchema,
  ExtractionDraftSchema,
} from '@/lib/schemas';

export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;
export type EdgeStatus = z.infer<typeof EdgeStatusSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type GraphNode = z.infer<typeof GraphNodeSchema>;
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;
export type Deadline = z.infer<typeof DeadlineSchema>;
export type World = z.infer<typeof WorldSchema>;
export type ExtractionDraft = z.infer<typeof ExtractionDraftSchema>;
