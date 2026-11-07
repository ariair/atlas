// Postgres tables (PRD section 6). Every row has user_id; ids are unique per user,
// so the primary key is (user_id, id). No uploaded file contents are ever stored.
import { pgTable, text, integer, real, timestamp, primaryKey, index, jsonb, date } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

const userId = () => text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' });

export const courses = pgTable(
  'courses',
  {
    userId: userId(),
    id: text('id').notNull(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    domain: text('domain').notNull(),
    year: integer('year').notNull(),
    term: text('term').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const topics = pgTable(
  'topics',
  {
    userId: userId(),
    id: text('id').notNull(),
    name: text('name').notNull(),
    courseId: text('course_id'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const nodes = pgTable(
  'nodes',
  {
    userId: userId(),
    id: text('id').notNull(),
    label: text('label').notNull(),
    type: text('type').notNull(), // concept | assignment | exam | course
    courseIds: text('course_ids').array().notNull(),
    domains: text('domains').array().notNull(),
    years: integer('years').array().notNull(),
    topicId: text('topic_id'),
    summary: text('summary').notNull(),
    mastery: real('mastery'), // 0-1 from quizzes
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const edges = pgTable(
  'edges',
  {
    userId: userId(),
    id: text('id').notNull(),
    fromId: text('from_id').notNull(),
    toId: text('to_id').notNull(),
    type: text('type').notNull(), // prerequisite | related | applies
    label: text('label'),
    status: text('status').notNull(), // accepted | suggested
    confidence: real('confidence').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] }), index('edges_user_idx').on(t.userId)],
);

export const deadlines = pgTable(
  'deadlines',
  {
    userId: userId(),
    id: text('id').notNull(),
    courseId: text('course_id').notNull(),
    title: text('title').notNull(),
    kind: text('kind').notNull(),
    dueAt: timestamp('due_at', { withTimezone: true }),
    dueText: text('due_text').notNull(),
    weightPct: real('weight_pct'),
    nodeIds: text('node_ids').array().notNull(),
    status: text('status').notNull(), // confirmed | needs_review
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

// Only a content hash and filename are kept so repeat uploads can be cached. Never file contents.
export const documents = pgTable(
  'documents',
  {
    userId: userId(),
    hash: text('hash').notNull(),
    filename: text('filename').notNull(),
    draft: jsonb('draft'), // the extracted structure (ExtractionDraft), cached by hash
    extractedAt: timestamp('extracted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.hash] })],
);

// Per-user daily AI call counter (cost and abuse control).
export const aiUsage = pgTable(
  'ai_usage',
  {
    userId: userId(),
    day: date('day').notNull(),
    calls: integer('calls').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);
