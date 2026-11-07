import { and, eq, inArray, sql } from 'drizzle-orm';
import type { World } from '../types';
import { getDb } from './client';
import { users, courses, topics, nodes, edges, deadlines, documents, aiUsage } from './schema';
import { rowsToWorld, worldToRows } from './world';
import { mergeNodeFields, rewriteDeadlineNodeIds, rewriteEdgesForMerge } from '../lib/merge';

/** The whole World for one user (empty arrays if they have no data yet). */
export async function getWorldForUser(userId: string): Promise<World> {
  const db = getDb();
  const [c, t, n, e, d] = await Promise.all([
    db.select().from(courses).where(eq(courses.userId, userId)),
    db.select().from(topics).where(eq(topics.userId, userId)),
    db.select().from(nodes).where(eq(nodes.userId, userId)),
    db.select().from(edges).where(eq(edges.userId, userId)),
    db.select().from(deadlines).where(eq(deadlines.userId, userId)),
  ]);
  return rowsToWorld({ courses: c, topics: t, nodes: n, edges: e, deadlines: d });
}

/** Delete every row for one user (used by DELETE /api/me and the seed script). */
async function clearUserRows(tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0], userId: string) {
  await tx.delete(deadlines).where(eq(deadlines.userId, userId));
  await tx.delete(edges).where(eq(edges.userId, userId));
  await tx.delete(nodes).where(eq(nodes.userId, userId));
  await tx.delete(topics).where(eq(topics.userId, userId));
  await tx.delete(courses).where(eq(courses.userId, userId));
  await tx.delete(documents).where(eq(documents.userId, userId));
}

/** Replace a user's whole world (seeding). */
export async function replaceWorld(userId: string, world: World): Promise<void> {
  const rows = worldToRows(userId, world);
  await getDb().transaction(async (tx) => {
    await tx.insert(users).values({ id: userId }).onConflictDoNothing();
    await clearUserRows(tx, userId);
    if (rows.courses.length) await tx.insert(courses).values(rows.courses);
    if (rows.topics.length) await tx.insert(topics).values(rows.topics);
    if (rows.nodes.length) await tx.insert(nodes).values(rows.nodes);
    if (rows.edges.length) await tx.insert(edges).values(rows.edges);
    if (rows.deadlines.length) await tx.insert(deadlines).values(rows.deadlines);
  });
}

/** Delete all of a user's data, including the user row. */
export async function deleteUserData(userId: string): Promise<void> {
  await getDb().transaction(async (tx) => {
    await clearUserRows(tx, userId);
    await tx.delete(users).where(eq(users.id, userId));
  });
}

/** True if this user already has a course with this id. */
export async function getCourseIds(userId: string): Promise<Set<string>> {
  const rows = await getDb().select({ id: courses.id }).from(courses).where(eq(courses.userId, userId));
  return new Set(rows.map((r) => r.id));
}

/** Add new courses/topics/nodes/edges/deadlines to a user's world without touching existing rows. */
export async function appendToWorld(userId: string, additions: World): Promise<void> {
  const rows = worldToRows(userId, additions);
  await getDb().transaction(async (tx) => {
    await tx.insert(users).values({ id: userId }).onConflictDoNothing();
    if (rows.courses.length) await tx.insert(courses).values(rows.courses);
    if (rows.topics.length) await tx.insert(topics).values(rows.topics);
    if (rows.nodes.length) await tx.insert(nodes).values(rows.nodes);
    if (rows.edges.length) await tx.insert(edges).values(rows.edges);
    if (rows.deadlines.length) await tx.insert(deadlines).values(rows.deadlines);
  });
}

/** Cached extraction for this content hash (we keep structure only, never the file). */
export async function getCachedDraft(userId: string, hash: string): Promise<unknown | null> {
  const [row] = await getDb()
    .select({ draft: documents.draft })
    .from(documents)
    .where(and(eq(documents.userId, userId), eq(documents.hash, hash)));
  return row?.draft ?? null;
}

export async function saveCachedDraft(userId: string, hash: string, filename: string, draft: unknown): Promise<void> {
  const db = getDb();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
  await db
    .insert(documents)
    .values({ userId, hash, filename, draft })
    .onConflictDoUpdate({ target: [documents.userId, documents.hash], set: { draft, filename } });
}

/** Counts one AI call for today. Returns false when the user is over their daily limit. */
export async function consumeAiCall(userId: string, dailyLimit: number): Promise<boolean> {
  const db = getDb();
  await db.insert(users).values({ id: userId }).onConflictDoNothing();
  const [row] = await db
    .insert(aiUsage)
    .values({ userId, day: sql`current_date`, calls: 1 })
    .onConflictDoUpdate({ target: [aiUsage.userId, aiUsage.day], set: { calls: sql`${aiUsage.calls} + 1` } })
    .returning({ calls: aiUsage.calls });
  return row.calls <= dailyLimit;
}

// ---------------------------------------------------------------------------
// Edges: suggested links, accept / reject, merge duplicates (prompt 4B)
// ---------------------------------------------------------------------------

export async function getEdgeIds(userId: string): Promise<Set<string>> {
  const rows = await getDb().select({ id: edges.id }).from(edges).where(eq(edges.userId, userId));
  return new Set(rows.map((r) => r.id));
}

export async function insertSuggestedEdges(userId: string, list: World['edges']): Promise<void> {
  if (list.length === 0) return;
  const rows = worldToRows(userId, { courses: [], topics: [], nodes: [], edges: list, deadlines: [] }).edges;
  await getDb().insert(edges).values(rows).onConflictDoNothing();
}

/** Accept a suggested edge. Returns false if the edge does not exist. Accepting twice is fine. */
export async function acceptEdge(userId: string, edgeId: string): Promise<boolean> {
  const res = await getDb()
    .update(edges)
    .set({ status: 'accepted' })
    .where(and(eq(edges.userId, userId), eq(edges.id, edgeId)))
    .returning({ id: edges.id });
  return res.length > 0;
}

/** Reject (delete) a suggested edge. Accepted edges are not touched. Returns 'deleted' | 'accepted' | 'missing'. */
export async function rejectEdge(userId: string, edgeId: string): Promise<'deleted' | 'accepted' | 'missing'> {
  const db = getDb();
  const [row] = await db.select({ status: edges.status }).from(edges).where(and(eq(edges.userId, userId), eq(edges.id, edgeId)));
  if (!row) return 'missing';
  if (row.status !== 'suggested') return 'accepted';
  await db.delete(edges).where(and(eq(edges.userId, userId), eq(edges.id, edgeId)));
  return 'deleted';
}

/** Merge node `goneId` into `keepId`: links, deadlines and fields move to the kept node. */
export async function mergeNodes(userId: string, keepId: string, goneId: string): Promise<'ok' | 'missing'> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const found = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), inArray(nodes.id, [keepId, goneId])));
    const keepRow = found.find((n) => n.id === keepId);
    const goneRow = found.find((n) => n.id === goneId);
    if (!keepRow || !goneRow) return 'missing';

    const toNode = (r: typeof keepRow) => ({ ...r, mastery: r.mastery } as unknown as import('../types').GraphNode);
    const merged = mergeNodeFields(toNode(keepRow), toNode(goneRow));
    await tx.update(nodes).set({ courseIds: merged.courseIds, domains: merged.domains, years: merged.years, summary: merged.summary })
      .where(and(eq(nodes.userId, userId), eq(nodes.id, keepId)));

    const allEdges = await tx.select().from(edges).where(eq(edges.userId, userId));
    const asEdges = allEdges.map((e) => ({ id: e.id, from: e.fromId, to: e.toId, type: e.type, label: e.label, status: e.status, confidence: e.confidence })) as World['edges'];
    const { removeIds, add } = rewriteEdgesForMerge(asEdges, keepId, goneId);
    if (removeIds.length) await tx.delete(edges).where(and(eq(edges.userId, userId), inArray(edges.id, removeIds)));
    if (add.length) {
      await tx.insert(edges).values(worldToRows(userId, { courses: [], topics: [], nodes: [], edges: add, deadlines: [] }).edges);
    }

    const dls = await tx.select().from(deadlines).where(and(eq(deadlines.userId, userId), sql`${goneId} = ANY(${deadlines.nodeIds})`));
    for (const d of dls) {
      await tx.update(deadlines).set({ nodeIds: rewriteDeadlineNodeIds(d.nodeIds, keepId, goneId) })
        .where(and(eq(deadlines.userId, userId), eq(deadlines.id, d.id)));
    }
    await tx.delete(nodes).where(and(eq(nodes.userId, userId), eq(nodes.id, goneId)));
    return 'ok';
  });
}
