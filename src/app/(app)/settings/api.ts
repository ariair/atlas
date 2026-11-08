// One small helper for calling our own API from the Settings page.
export type ApiResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; error: string };

export async function call<T = Record<string, unknown>>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, { cache: 'no-store', ...init });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as { error?: string }).error ?? `Something went wrong (${res.status}).` };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'We could not reach the server. Check your connection and try again.' };
  }
}

export const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
