// Recorded real Claude responses for the three sample syllabi (made by `npm run demo:record`).
// Demo mode plays these back so the whole loop works with no network.
import type { CourseInfo } from '../../lib/ingest/buildDraft';
import type { AiExtraction } from '../../lib/ingest/prompt';
import type { AiLinks } from '../../lib/ingest/link';
import csci220 from './csci220.json';
import biol210 from './biol210.json';
import math230 from './math230.json';

export type RecordedSample = {
  id: string;
  title: string;
  course: CourseInfo;
  text: string; // the sample syllabus text (fictional)
  ai: AiExtraction; // what the model returned for extraction
  links: AiLinks; // what the model returned for the linking pass against the demo world
  model: string;
  recordedAt: string;
};

export const RECORDED: RecordedSample[] = [csci220, biol210, math230] as unknown as RecordedSample[];
