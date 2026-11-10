import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { estimateCostUsd } from './models';
import { addSpend, spendLocked } from '../../db/spend'; // [spend] the $2 cap: count every call, refuse once the cap is reached

const LOCKED_ERROR = 'AI is turned off: the spending limit was reached. Try demo mode (?demo=1).';
const recordSpend = (model: string, i: number, o: number) => void addSpend(estimateCostUsd(model, i, o)).catch(() => {});

const DEFAULT_MAX_TOKENS = 4096;
const FRIENDLY_ERROR = 'The AI could not produce a usable answer. Please try again, or use demo mode.';

export class AIError extends Error {}

// Newer models (Sonnet 5.5, Opus 5.5, Fable, Mythos) reject a FORCED tool choice with a 400
// ("tool_choice: type tool and any are not supported for this model"). For those we use tool_choice "auto"
// plus an explicit instruction to call the tool; the Zod check and repair retry below still apply.
const NO_FORCED_TOOL = /^claude-(sonnet-5-5|opus-5-5|fable|mythos)/;
const learnedNoForced = new Set<string>(); // models that rejected forcing at runtime
export function supportsForcedToolChoice(model: string): boolean {
  return !NO_FORCED_TOOL.test(model) && !learnedNoForced.has(model);
}
const CALL_TOOL_RULE = '\n\nYou MUST answer by calling the respond tool exactly once with your complete answer. Do not write any other text.';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (process.env.AI_ENABLED === 'false') throw new AIError('AI is turned off.');
  if (!process.env.ANTHROPIC_API_KEY) throw new AIError('AI is not configured.');
  return (_client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 100_000, maxRetries: 1 }));
}

type UserContent = string | Anthropic.Messages.ContentBlockParam[];


type RespondTool = Anthropic.Messages.Tool.InputSchema;

/** One Messages call that returns tool output. Forces the tool when the model allows it, otherwise asks nicely. */
async function request(
  client: Anthropic,
  model: string,
  system: string,
  messages: Anthropic.Messages.MessageParam[],
  inputSchema: RespondTool,
  maxTokens: number,
) {
  const tools = [{ name: 'respond', description: 'Return the final answer.', input_schema: inputSchema }];
  const send = (forced: boolean) =>
    client.messages.create({
      model,
      // Newer models may spend part of the budget on thinking, so give the auto path more room.
      max_tokens: forced ? maxTokens : Math.min(maxTokens * 2, 16000),
      system: forced ? system : system + CALL_TOOL_RULE,
      messages,
      tools,
      tool_choice: forced ? { type: 'tool', name: 'respond' } : { type: 'auto' },
    });

  if (supportsForcedToolChoice(model)) {
    try {
      return await send(true);
    } catch (err) {
      if (!(err instanceof Anthropic.BadRequestError && /tool_choice/i.test(err.message))) throw err;
      learnedNoForced.add(model); // remember, so later calls skip the failing request
    }
  }
  return send(false);
}

/**
 * Calls Claude and returns output validated by a Zod schema (server only).
 * Uses a tool call so the model returns structured JSON (forced where the model allows it). On a validation failure it retries
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
  if (await spendLocked()) throw new AIError(LOCKED_ERROR);
  const inputSchema = z.toJSONSchema(schema) as Anthropic.Messages.Tool.InputSchema;
  const messages: Anthropic.Messages.MessageParam[] = [{ role: 'user', content: user }];

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await request(client, model, system, messages, inputSchema, maxTokens);

    console.log(
      `[ai] model=${model} in=${res.usage.input_tokens} out=${res.usage.output_tokens} ` +
        `cost~$${estimateCostUsd(model, res.usage.input_tokens, res.usage.output_tokens).toFixed(4)}`,
    );

    recordSpend(model, res.usage.input_tokens, res.usage.output_tokens);

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
  if (await spendLocked()) throw new AIError(LOCKED_ERROR);
  const res = await client.messages.create({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] });
  console.log(`[ai] model=${model} in=${res.usage.input_tokens} out=${res.usage.output_tokens}`);
  recordSpend(model, res.usage.input_tokens, res.usage.output_tokens);
  return res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
}
