# gotchas
- 2026-11-07 DNS: new Tiger Cloud hostnames can fail on 1.1.1.1 for a while; use 8.8.8.8. The Tiger MCP uses the same DNS.
- 2026-11-07 Next 16 + cacheComponents: request-reading GET routes must call await connection() BEFORE any try/catch, else the prerender bail-out is swallowed and a static error response is built. Do not use export const dynamic.
- 2026-11-07 Never re-run db:seed once real uploads exist: it deletes ALL the demo user's rows, including real uploads.
- 2026-11-07 Browser cookies are shared across localhost ports; the demo cookie set on one dev server also applies to another. Use Exit demo mode (or clear atlas_demo) if /world looks like sample data unexpectedly.
- 2026-11-07 ~/Documents is synced by iCloud Drive, which creates duplicate files named like 'routes.d 2.ts' inside .next and can confuse tsc. Delete them with: find .next/types -name '* [0-9]*' -delete. Better: keep the project outside iCloud (for example ~/Developer/atlas).
