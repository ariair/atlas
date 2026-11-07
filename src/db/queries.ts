import { eq } from 'drizzle-orm';
import type { World } from '../types';
import { getDb } from './client';
import { users, courses, topics, nodes, edges, deadlines, documents } from './schema';
import { rowsToWorld, worldToRows } from './world';

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
