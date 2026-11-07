import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { estimateCostUsd } from './models';

const DEFAULT_MAX_TOKENS = 4096;
const FRIENDLY_ERROR = 'The AI could not produce a usable answer. Please try again, or use demo mode.';

export class AIError extends Error {}

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (process.env.AI_ENABLED === 'false') throw new AIError('AI is turned off.');
  if (!process.env.ANTHROPIC_API_KEY) throw new AIError('AI is not configured.');
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }));
}

type UserContent = string | Anthropic.Messages.ContentBlockParam[];

/**
 * Calls Claude and returns output validated by a Zod schema (server only).
 * Uses a forced tool call so the model returns structured JSON. On a validation failure it retries
 * once, telling the model what was wrong; after that it throws a friendly error.
 * Logs token counts and estimated cost, never content.
 */
export async function callClaudeJson<T extends z.ZodType>(
  schema: T,
  system: string,
  user: UserContent,
  model: string,
  maxTokens: number = DEFAULT_MAX_TOKENS,
): Promise<z.infer<T>> {
  const client = getClient();
  const inputSchema = z.toJSONSchema(schema) as Anthropic.Messages.Tool.InputSchema;
  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: user }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      tools: [{ name: 'respond', description: 'Return the final answer.', input_schema: inputSchema }],
      tool_choice: { type: 'tool', name: 'respond' },
    });

    console.log(
      `[ai] model=${model} in=${res.usage.input_tokens} out=${res.usage.output_tokens} ` +
        `cost~$${estimateCostUsd(model, res.usage.input_tokens, res.usage.output_tokens).toFixed(4)}`,
    );

    const block = res.content.find((b) => b.type === 'tool_use');
    const parsed = schema.safeParse(block && block.type === 'tool_use' ? block.input : undefined);
    if (parsed.success) return parsed.data;

    // Repair retry: show the model its own output and the validation error.
    messages.push({ role: 'assistant', content: res.content });
    if (block && block.type === 'tool_use') {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: block.id,
            is_error: true,
            content: `Output failed validation: ${z.prettifyError(parsed.error)}. Call respond again with a corrected answer.`,
          },
        ],
      });
    } else {
      messages.push({ role: 'user', content: 'You must call the respond tool with valid output.' });
    }
  }
  throw new AIError(FRIENDLY_ERROR);
}

/** Plain text call (used by the health/test route). */
export async function callClaudeText(system: string, user: string, model: string, maxTokens = 64): Promise<string> {
  const client = getClient();
  const res = await client.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
  console.log(`[ai] model=${model} in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}
