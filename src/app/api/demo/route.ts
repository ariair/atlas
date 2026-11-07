import { connection } from 'next/server';
import { isDemoRequest } from '@/lib/demo';
import { RECORDED } from '@/fixtures/recorded';

// GET /api/demo: is demo mode on, and which sample syllabi can be "uploaded" in it?
export async function GET(request: Request) {
  await connection();
  const demo = isDemoRequest(request);
  return Response.json({
    demo,
    forced: process.env.DEMO === '1', // can't be switched off from the browser
    samples: demo ? RECORDED.map((s) => ({ id: s.id, title: s.title, course: s.course, text: s.text })) : [],
  });
}
