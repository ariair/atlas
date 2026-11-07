import { z } from 'zod';
import { ExtractionDraftSchema } from '@/lib/schemas';
import { getUserId } from '@/lib/user';
import { AIError } from '@/lib/ai/client';
import { consumeAiCall, getCachedDraft, saveCachedDraft } from '@/db/queries';
import { LIMITS, contentHash, countPdfPages, extractDraft } from '@/lib/ingest/extract';
import { findSampleByText, isDemoRequest } from '@/lib/demo';
import { buildDraft } from '@/lib/ingest/buildDraft';
import { AiExtractionSchema } from '@/lib/ingest/prompt';

export const maxDuration = 120;

const FormSchema = z.object({
  code: z.string().trim().min(1).max(20),
  title: z.string().trim().min(1).max(120),
  domain: z.string().trim().min(1).max(60),
  term: z.string().trim().min(1).max(40),
  year: z.coerce.number().int().min(1).max(4),
});

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 30);
const fail = (error: string, status: number) => Response.json({ error }, { status });

// POST multipart form: course fields + either `text` or a PDF in `file`. Returns an ExtractionDraft (NOT saved).
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail('We could not read that upload. Try again.', 400);
  }

  const parsed = FormSchema.safeParse(Object.fromEntries(['code', 'title', 'domain', 'term', 'year'].map((k) => [k, form.get(k)])));
  if (!parsed.success) return fail('Please fill in the course code, title, department, term and year.', 400);
  const course = { ...parsed.data, year: parsed.data.year as 1 | 2 | 3 | 4 };

  // Demo mode: replay the recorded response for a sample syllabus. No database, no AI.
  if (isDemoRequest(request)) {
    const pasted = form.get('text');
    const sample = typeof pasted === 'string' ? findSampleByText(pasted) : undefined;
    if (!sample) return fail('Demo mode can only read the three sample syllabi. Choose one with "Use a sample syllabus".', 400);
    return Response.json({ draft: buildDraft(AiExtractionSchema.parse(sample.ai), course), cached: false, demo: true, sampleId: sample.id });
  }

  const file = form.get('file');
  const textField = form.get('text');
  let text: string | undefined;
  let pdf: Buffer | undefined;
  let filename = 'pasted text';

  if (file instanceof File && file.size > 0) {
    if (file.size > LIMITS.maxPdfBytes) return fail('That PDF is too large. The limit is 5 MB.', 413);
    pdf = Buffer.from(await file.arrayBuffer());
    if (pdf.subarray(0, 5).toString('latin1') !== '%PDF-') return fail('That file is not a PDF. Upload a PDF or paste the text.', 400);
    if (countPdfPages(pdf) > LIMITS.maxPdfPages) return fail(`That PDF has more than ${LIMITS.maxPdfPages} pages. Upload a shorter one or paste the text.`, 413);
    filename = file.name.slice(0, 120);
  } else if (typeof textField === 'string' && textField.trim()) {
    text = textField.trim();
    if (text.length > LIMITS.maxTextChars) return fail('That text is too long. Paste up to about 60,000 characters.', 413);
  } else {
    return fail('Paste your syllabus text or choose a PDF.', 400);
  }

  const userId = await getUserId();
  const hash = contentHash({ course, text, pdf });

  try {
    // Repeat upload: reuse the saved structure, no AI call.
    const cached = ExtractionDraftSchema.safeParse(await getCachedDraft(userId, hash));
    if (cached.success) return Response.json({ draft: cached.data, cached: true });

    if (process.env.AI_ENABLED === 'false') {
      return fail('AI is turned off right now. Try demo mode (?demo=1), or try again later.', 503);
    }
    if (!(await consumeAiCall(userId, DAILY_LIMIT))) {
      return fail('You have reached today\'s AI limit. Try again tomorrow, or use demo mode (?demo=1).', 429);
    }

    const draft = await extractDraft({ course, text, pdf });
    await saveCachedDraft(userId, hash, filename, draft); // structure only, never the file
    return Response.json({ draft, cached: false });
  } catch (err) {
    if (err instanceof AIError) return fail(err.message, 502);
    console.error('[ingest] failed:', err instanceof Error ? err.message : 'unknown');
    return fail('Something went wrong reading that document. Try again, or paste the text instead.', 500);
  }
}
