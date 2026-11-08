// Request body for PATCH /api/deadlines/:id. Send only the fields you want to change.
import { z } from 'zod';
import { DeadlineKindSchema } from './schemas';

export const DeadlinePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    kind: DeadlineKindSchema.optional(),
    dueAt: z.string().datetime({ offset: true }).nullable().optional(), // null clears the date
    weightPct: z.number().min(0).max(100).nullable().optional(), // null clears the weight
  })
  .strict()
  .refine((p) => Object.keys(p).length > 0, 'Send at least one field to change.');
export type DeadlinePatch = z.infer<typeof DeadlinePatchSchema>;
