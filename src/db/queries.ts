import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { World } from '../types';
import { getDb } from './client';
import { users, courses, topics, nodes, edges, deadlines, documents, aiUsage } from './schema';
import { rowsToWorld, worldToRows } from './world';
import type { NodePatch } from '../lib/nodePatch';
import type { DeadlinePatch } from '../lib/deadlinePatch';
import { slug } from '../lib/ingest/commit';
import { renameDomain, yearsFor } from '../lib/manage';
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

/** Delete the AI suggested links that touch one node (kept links are left alone). Returns how many were removed. */
export async function deleteSuggestedEdgesForNode(userId: string, nodeId: string): Promise<number> {
  const res = await getDb()
    .delete(edges)
    .where(and(eq(edges.userId, userId), eq(edges.status, 'suggested'), or(eq(edges.fromId, nodeId), eq(edges.toId, nodeId))))
    .returning({ id: edges.id });
  return res.length;
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

// ---------------------------------------------------------------------------
// Nodes and topics: edit, mastery, topic manager (prompt 4B follow-up)
// ---------------------------------------------------------------------------
const toNode = (r: typeof nodes.$inferSelect): import('../types').GraphNode => ({
  id: r.id, label: r.label, type: r.type as import('../types').GraphNode['type'], courseIds: r.courseIds, domains: r.domains,
  years: r.years, topicId: r.topicId, summary: r.summary, mastery: r.mastery,
});

/** Edit one node. 'bad_topic' means the topicId (or course) does not exist for this user. */
export async function updateNode(userId: string, id: string, patch: NodePatch) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), eq(nodes.id, id)));
    if (!row) return { status: 'missing' as const };
    if (patch.topicId) {
      const [t] = await tx.select({ id: topics.id }).from(topics).where(and(eq(topics.userId, userId), eq(topics.id, patch.topicId)));
      if (!t) return { status: 'bad_topic' as const };
    }
    const set: Partial<typeof nodes.$inferInsert> = {};
    if (patch.label !== undefined) set.label = patch.label;
    if (patch.summary !== undefined) set.summary = patch.summary;
    if (patch.topicId !== undefined) set.topicId = patch.topicId;
    if (patch.mastery !== undefined) set.mastery = patch.mastery;
    const [updated] = await tx.update(nodes).set(set).where(and(eq(nodes.userId, userId), eq(nodes.id, id))).returning();
    return { status: 'ok' as const, node: toNode(updated) };
  });
}

/** Save mastery scores (0 to 1) for many nodes. Unknown ids are skipped. Returns how many were updated. */
export async function updateMastery(userId: string, updates: { id: string; mastery: number | null }[]): Promise<number> {
  return getDb().transaction(async (tx) => {
    let n = 0;
    for (const u of updates) {
      const res = await tx.update(nodes).set({ mastery: u.mastery }).where(and(eq(nodes.userId, userId), eq(nodes.id, u.id))).returning({ id: nodes.id });
      n += res.length;
    }
    return n;
  });
}

async function courseExists(tx: Pick<ReturnType<typeof getDb>, 'select'>, userId: string, courseId: string) {
  const [c] = await tx.select({ id: courses.id }).from(courses).where(and(eq(courses.userId, userId), eq(courses.id, courseId)));
  return !!c;
}

export async function createTopic(userId: string, name: string, courseId: string | null) {
  return getDb().transaction(async (tx) => {
    if (courseId && !(await courseExists(tx, userId, courseId))) return { status: 'bad_course' as const };
    const existing = new Set((await tx.select({ id: topics.id }).from(topics).where(eq(topics.userId, userId))).map((t) => t.id));
    const base = `${courseId ?? 'general'}-${slug(name)}`;
    let id = base;
    for (let i = 2; existing.has(id); i++) id = `${base}-${i}`;
    await tx.insert(users).values({ id: userId }).onConflictDoNothing();
    await tx.insert(topics).values({ userId, id, name, courseId });
    return { status: 'ok' as const, topic: { id, name, courseId } };
  });
}

export async function updateTopic(userId: string, id: string, patch: { name?: string; courseId?: string | null }) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(topics).where(and(eq(topics.userId, userId), eq(topics.id, id)));
    if (!row) return { status: 'missing' as const };
    if (patch.courseId && !(await courseExists(tx, userId, patch.courseId))) return { status: 'bad_course' as const };
    const set: Partial<typeof topics.$inferInsert> = {};
    if (patch.name !== undefined) set.name = patch.name;
    if (patch.courseId !== undefined) set.courseId = patch.courseId;
    const [u] = await tx.update(topics).set(set).where(and(eq(topics.userId, userId), eq(topics.id, id))).returning();
    return { status: 'ok' as const, topic: { id: u.id, name: u.name, courseId: u.courseId } };
  });
}

/** Delete a topic. Its nodes stay, just without a topic. */
export async function deleteTopic(userId: string, id: string): Promise<'ok' | 'missing'> {
  return getDb().transaction(async (tx) => {
    const gone = await tx.delete(topics).where(and(eq(topics.userId, userId), eq(topics.id, id))).returning({ id: topics.id });
    if (gone.length === 0) return 'missing' as const;
    await tx.update(nodes).set({ topicId: null }).where(and(eq(nodes.userId, userId), eq(nodes.topicId, id)));
    return 'ok' as const;
  });
}

/** Merge topic `goneId` into `keepId`: its nodes move over, then it is deleted. */
export async function mergeTopics(userId: string, keepId: string, goneId: string): Promise<'ok' | 'missing'> {
  return getDb().transaction(async (tx) => {
    const found = await tx.select({ id: topics.id }).from(topics).where(and(eq(topics.userId, userId), inArray(topics.id, [keepId, goneId])));
    if (found.length !== 2) return 'missing' as const;
    await tx.update(nodes).set({ topicId: keepId }).where(and(eq(nodes.userId, userId), eq(nodes.topicId, goneId)));
    await tx.delete(topics).where(and(eq(topics.userId, userId), eq(topics.id, goneId)));
    return 'ok' as const;
  });
}

// ---------------------------------------------------------------------------
// Managing subjects, courses and items (Settings page)
// ---------------------------------------------------------------------------

export type CoursePatch = { code?: string; title?: string; domain?: string; year?: 1 | 2 | 3 | 4; term?: string };

/** Edit a course. Changing its subject or year also updates the items that belong to it. */
export async function updateCourse(userId: string, id: string, patch: CoursePatch) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(courses).where(and(eq(courses.userId, userId), eq(courses.id, id)));
    if (!row) return { status: 'missing' as const };
    const set: Partial<typeof courses.$inferInsert> = {};
    for (const k of ['code', 'title', 'domain', 'year', 'term'] as const) if (patch[k] !== undefined) (set as Record<string, unknown>)[k] = patch[k];
    const [updated] = await tx.update(courses).set(set).where(and(eq(courses.userId, userId), eq(courses.id, id))).returning();

    if (patch.domain !== undefined && patch.domain !== row.domain) {
      const mine = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), sql`${id} = ANY(${nodes.courseIds})`));
      for (const n of mine) {
        await tx.update(nodes).set({ domains: renameDomain(n.domains, row.domain, patch.domain) }).where(and(eq(nodes.userId, userId), eq(nodes.id, n.id)));
      }
    }
    if (patch.year !== undefined && patch.year !== row.year) {
      const yearByCourse = new Map((await tx.select({ id: courses.id, year: courses.year }).from(courses).where(eq(courses.userId, userId))).map((c) => [c.id, c.year]));
      const mine = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), sql`${id} = ANY(${nodes.courseIds})`));
      for (const n of mine) {
        await tx.update(nodes).set({ years: yearsFor(n.courseIds, yearByCourse) }).where(and(eq(nodes.userId, userId), eq(nodes.id, n.id)));
      }
    }
    return { status: 'ok' as const, course: { id: updated.id, code: updated.code, title: updated.title, domain: updated.domain, year: updated.year, term: updated.term } };
  });
}

/** Delete a course and everything that only belongs to it. Items shared with another course just lose this course. */
export async function deleteCourse(userId: string, id: string) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(courses).where(and(eq(courses.userId, userId), eq(courses.id, id)));
    if (!row) return { status: 'missing' as const };
    const yearByCourse = new Map((await tx.select({ id: courses.id, year: courses.year }).from(courses).where(eq(courses.userId, userId))).map((c) => [c.id, c.year]));
    const mine = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), sql`${id} = ANY(${nodes.courseIds})`));
    const goneIds: string[] = [];
    for (const n of mine) {
      const rest = n.courseIds.filter((c) => c !== id);
      if (rest.length === 0) goneIds.push(n.id);
      else await tx.update(nodes).set({ courseIds: rest, years: yearsFor(rest, yearByCourse) }).where(and(eq(nodes.userId, userId), eq(nodes.id, n.id)));
    }
    if (goneIds.length) {
      await tx.delete(edges).where(and(eq(edges.userId, userId), or(inArray(edges.fromId, goneIds), inArray(edges.toId, goneIds))));
      const refs = (await tx.select().from(deadlines).where(eq(deadlines.userId, userId))).filter((d) => d.nodeIds.some((x) => goneIds.includes(x)));
      for (const d of refs) {
        await tx.update(deadlines).set({ nodeIds: d.nodeIds.filter((x) => !goneIds.includes(x)) }).where(and(eq(deadlines.userId, userId), eq(deadlines.id, d.id)));
      }
      await tx.delete(nodes).where(and(eq(nodes.userId, userId), inArray(nodes.id, goneIds)));
    }
    const removedDeadlines = await tx.delete(deadlines).where(and(eq(deadlines.userId, userId), eq(deadlines.courseId, id))).returning({ id: deadlines.id });
    await tx.delete(topics).where(and(eq(topics.userId, userId), eq(topics.courseId, id)));
    await tx.delete(courses).where(and(eq(courses.userId, userId), eq(courses.id, id)));
    // Forget the saved reading of this course's document, so adding it again starts fresh.
    await tx.execute(sql`delete from documents where user_id = ${userId} and draft->'course'->>'code' = ${row.code} and draft->'course'->>'term' = ${row.term}`);
    return { status: 'ok' as const, removed: { items: goneIds.length, deadlines: removedDeadlines.length } };
  });
}

/** Rename a subject (department). If the new name already exists the two subjects become one. */
export async function renameSubject(userId: string, from: string, to: string) {
  return getDb().transaction(async (tx) => {
    const cs = await tx.update(courses).set({ domain: to }).where(and(eq(courses.userId, userId), eq(courses.domain, from))).returning({ id: courses.id });
    const mine = await tx.select().from(nodes).where(and(eq(nodes.userId, userId), sql`${from} = ANY(${nodes.domains})`));
    for (const n of mine) {
      await tx.update(nodes).set({ domains: renameDomain(n.domains, from, to) }).where(and(eq(nodes.userId, userId), eq(nodes.id, n.id)));
    }
    return { courses: cs.length, items: mine.length };
  });
}

/** Remove one item and its links. Deadlines that mentioned it just stop mentioning it. */
export async function deleteNode(userId: string, id: string): Promise<'ok' | 'missing'> {
  return getDb().transaction(async (tx) => {
    const gone = await tx.delete(nodes).where(and(eq(nodes.userId, userId), eq(nodes.id, id))).returning({ id: nodes.id });
    if (gone.length === 0) return 'missing' as const;
    await tx.delete(edges).where(and(eq(edges.userId, userId), sql`(${edges.fromId} = ${id} OR ${edges.toId} = ${id})`));
    const refs = await tx.select().from(deadlines).where(and(eq(deadlines.userId, userId), sql`${id} = ANY(${deadlines.nodeIds})`));
    for (const d of refs) {
      await tx.update(deadlines).set({ nodeIds: d.nodeIds.filter((x) => x !== id) }).where(and(eq(deadlines.userId, userId), eq(deadlines.id, d.id)));
    }
    return 'ok' as const;
  });
}

/** What is stored for this user, and how many AI calls they have used today. */
export async function getAccountSummary(userId: string) {
  const db = getDb();
  const count = (table: typeof courses | typeof topics | typeof nodes | typeof edges | typeof deadlines | typeof documents) =>
    db.select({ n: sql<number>`count(*)::int` }).from(table).where(eq(table.userId, userId)).then((r) => r[0].n);
  const [c, t, n, e, d, docs] = await Promise.all([count(courses), count(topics), count(nodes), count(edges), count(deadlines), count(documents)]);
  const suggested = await db.select({ n: sql<number>`count(*)::int` }).from(edges).where(and(eq(edges.userId, userId), eq(edges.status, 'suggested'))).then((r) => r[0].n);
  const used = await db
    .select({ calls: aiUsage.calls })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), sql`${aiUsage.day} = current_date`))
    .then((r) => r[0]?.calls ?? 0);
  return { courses: c, topics: t, items: n, links: e, suggestedLinks: suggested, deadlines: d, savedReadings: docs, aiCallsToday: used };
}

/** The user's chosen username, or null if they have not picked one yet. */
export async function getUsername(userId: string): Promise<string | null> {
  const [row] = await getDb().select({ username: users.username }).from(users).where(eq(users.id, userId));
  return row?.username ?? null;
}

/** Saves a (lowercase) username. Returns 'taken' when somebody else already has it. */
export async function setUsername(userId: string, username: string): Promise<'ok' | 'taken'> {
  try {
    await getDb()
      .insert(users)
      .values({ id: userId, username })
      .onConflictDoUpdate({ target: users.id, set: { username } });
    return 'ok';
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    if (e.code === '23505' || e.cause?.code === '23505') return 'taken';
    throw err;
  }
}

/** Edit one deadline. A date makes it "confirmed"; clearing the date marks it "needs_review" again. */
export async function updateDeadline(userId: string, id: string, patch: DeadlinePatch) {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(deadlines).where(and(eq(deadlines.userId, userId), eq(deadlines.id, id)));
    if (!row) return { status: 'missing' as const };
    const set: Partial<typeof deadlines.$inferInsert> = {};
    if (patch.title !== undefined) set.title = patch.title;
    if (patch.kind !== undefined) set.kind = patch.kind;
    if (patch.weightPct !== undefined) set.weightPct = patch.weightPct;
    if (patch.dueAt !== undefined) {
      set.dueAt = patch.dueAt ? new Date(patch.dueAt) : null;
      set.status = patch.dueAt ? 'confirmed' : 'needs_review';
    }
    const [updated] = await tx.update(deadlines).set(set).where(and(eq(deadlines.userId, userId), eq(deadlines.id, id))).returning();
    return {
      status: 'ok' as const,
      deadline: {
        id: updated.id, courseId: updated.courseId, title: updated.title, kind: updated.kind as import('../types').Deadline['kind'],
        dueAt: updated.dueAt ? updated.dueAt.toISOString() : null, dueText: updated.dueText, weightPct: updated.weightPct,
        nodeIds: updated.nodeIds, status: updated.status as import('../types').Deadline['status'],
      },
    };
  });
}
