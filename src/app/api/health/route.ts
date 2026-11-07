export async function GET() {
  return Response.json({
    ok: true,
    aiEnabled: process.env.AI_ENABLED !== 'false',
    hasApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
  });
}
