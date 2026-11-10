// The running Claude API spend, kept in one database row, and the lock that follows from it (cap: src/lib/spendCap.ts).
// Once an instance sees the cap reached it stays locked; an unlocked answer is re-checked at most every 20 seconds.
import { sql } from 'drizzle-orm';
import { getDb } from './client';
import { aiSpend } from './schema';
import { capUsd, isOverCap } from '../lib/spendCap';

const ROW = 'total';
const RECHECK_MS = 20_000;
let locked = false;
let checkedAt = 0;

/** Adds the estimated cost of one Claude call to the running total. */
export async function addSpend(usd: number): Promise<void> {
  if (!(usd > 0) || !process.env.DATABASE_URL) return;
  const [row] = await getDb()
    .insert(aiSpend)
    .values({ id: ROW, usd })
    .onConflictDoUpdate({ target: aiSpend.id, set: { usd: sql`${aiSpend.usd} + ${usd}` } })
    .returning({ usd: aiSpend.usd });
  if (row && isOverCap(row.usd)) locked = true;
}

export async function getSpendUsd(): Promise<number> {
  const rows = await getDb().select({ usd: aiSpend.usd }).from(aiSpend).where(sql`${aiSpend.id} = ${ROW}`);
  return rows[0]?.usd ?? 0;
}

/** True once the cap is reached. Without a database (demo, local) it is never locked, and a failed lookup never locks. */
export async function spendLocked(): Promise<boolean> {
  if (locked) return true;
  if (!process.env.DATABASE_URL || Date.now() - checkedAt < RECHECK_MS) return false;
  checkedAt = Date.now();
  try {
    locked = isOverCap(await getSpendUsd(), capUsd());
  } catch {
    /* keep going unlocked */
  }
  return locked;
}
