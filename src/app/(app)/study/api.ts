import type { z } from 'zod';

/** POST JSON to one of the tutor routes and check the answer with its Zod schema. Never throws. */
export async function postJson<S extends z.ZodType>(url: string, body: unknown, schema: S): Promise<{ data: z.infer<S> } | { error: string }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = json && typeof json === 'object' && 'error' in json && typeof json.error === 'string' ? json.error : `The server answered ${res.status}.`;
      return { error: msg };
    }
    const parsed = schema.safeParse(json);
    return parsed.success ? { data: parsed.data } : { error: 'The answer was not in the expected shape. Try again.' };
  } catch {
    return { error: 'Could not reach the server. Check your connection and try again.' };
  }
}
