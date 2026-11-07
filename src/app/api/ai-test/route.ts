import { callClaudeText, AIError } from '@/lib/ai/client';
import { MODELS } from '@/lib/ai/models';

export async function GET() {
  try {
    const text = await callClaudeText('Reply with one short word.', 'Say hello.', MODELS.fast, 16);
    return Response.json({ ok: true, model: MODELS.fast, reply: text });
  } catch (e) {
    const msg = e instanceof AIError ? e.message : 'AI call failed.';
    return Response.json({ ok: false, error: msg }, { status: 502 });
  }
}
