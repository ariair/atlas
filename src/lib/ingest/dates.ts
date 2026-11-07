// Turns a local date/time written by the AI ("2026-10-15" or "2026-10-15T14:30") into a UTC ISO string,
// reading it in a fixed timezone. Date-only values become 11:59 PM that day.
export const INGEST_TIMEZONE = 'America/Vancouver';

function tzOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Returns an ISO string, or null if the text is not a real date. */
export function zonedToIso(local: string | null | undefined, timeZone: string = INGEST_TIMEZONE): string | null {
  if (!local) return null;
  const m = local.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = m[4] === undefined ? 23 : Number(m[4]);
  const mi = m[5] === undefined ? 59 : Number(m[5]);
  const s = m[6] === undefined ? 0 : Number(m[6]);
  if (y < 2000 || y > 2100 || h > 23 || mi > 59 || s > 59) return null;
  const check = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null; // e.g. Feb 31
  const guess = check.getTime();
  let utc = guess - tzOffsetMs(guess, timeZone);
  utc = guess - tzOffsetMs(utc, timeZone); // second pass handles daylight-saving edges
  return new Date(utc).toISOString();
}
