// Counts AI calls against the user's daily limit before a tutor route spends them. Returns an error Response, or null if fine.
import { consumeAiCall } from '@/db/queries';
import { dailyAiLimit } from '@/lib/aiLimit';
import { getUserId } from '@/lib/user';

export async function spendAiCalls(n: number): Promise<Response | null> {
  if (process.env.AI_ENABLED === 'false') {
    return Response.json({ error: 'AI is turned off right now. Try demo mode (?demo=1), or try again later.' }, { status: 503 });
  }
  const userId = await getUserId();
  const limit = dailyAiLimit();
  for (let i = 0; i < n; i++) {
    if (!(await consumeAiCall(userId, limit))) {
      return Response.json({ error: "You have reached today's AI limit. Try again tomorrow, or use demo mode (?demo=1)." }, { status: 429 });
    }
  }
  return null;
}
