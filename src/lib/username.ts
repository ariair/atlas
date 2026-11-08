// Usernames: 3-20 characters, lowercase letters, digits and underscores. Stored lowercase, so "Ana" and "ana" are the same name.
const RESERVED = new Set(['admin', 'atlas', 'support', 'root', 'api', 'demo', 'settings', 'help', 'system', 'null', 'undefined']);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export type UsernameCheck = { ok: true; username: string } | { ok: false; error: string };

export function checkUsername(raw: unknown): UsernameCheck {
  if (typeof raw !== 'string') return { ok: false, error: 'enter a username.' };
  const username = normalizeUsername(raw);
  if (username.length < 3 || username.length > 20) return { ok: false, error: 'use 3 to 20 characters.' };
  if (!/^[a-z0-9_]+$/.test(username)) return { ok: false, error: 'use only letters, numbers and underscores.' };
  if (RESERVED.has(username)) return { ok: false, error: 'that name is reserved.' };
  return { ok: true, username };
}
