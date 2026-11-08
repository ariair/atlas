# Auth0 login: setup guide

Login is OFF until all four Auth0 settings exist. With them, visitors who are not logged in only ever see the demo (sample world, recorded AI, nothing saved). Real data, uploads and AI need an account. Everything below is for Person B.

## STATUS (2026-11-07)
- Done via the Auth0 MCP: tenant `dev-ju4rkrovlfade6kq` (us), application **Atlas** (Regular Web Application, client id `YFC8vrTPhy4vrd8dIQUsNeiFyXBprcEm`) with callback, logout and web-origin URLs for localhost:3000, www.myatlas.study and atlas-three-neon.vercel.app. The client id and domain are not secret.
- Done: the four login settings (plus APP_BASE_URL=http://localhost:3000) were written to the local `.env.local` by the Auth0 MCP; the secret never passed through chat. Local login is configured.
- To do (Person B): add AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET and AUTH0_SECRET to Vercel Production, then redeploy. Do NOT add APP_BASE_URL on Vercel.
- To do: log in once locally, copy the Account id from Settings > Account, run `npm run db:claim -- "<id>"` (dry run), then with `--yes`.
- The MCP's own files (.mcp.json, .auth0-mcp-writes.log) are gitignored and hold no secrets.

## What the code does
- `src/proxy.ts`: first the site access gate (SITE_ACCESS_KEY), then Auth0's middleware, which serves /auth/login, /auth/logout, /auth/callback and /auth/profile and keeps the session cookie fresh.
- `src/lib/user.ts`: `getUserId()` returns the Auth0 account id ("sub", for example `google-oauth2|123`). No session means `AuthRequiredError`, which routes turn into a clean 401. It never falls back to the demo user while login is on.
- `src/lib/demo.ts`: `isDemoRequest()` is true for anyone without a session cookie while login is on, so logged-out visitors cannot touch real data or spend AI budget.
- `src/db/loadWorld.ts`: a new account starts with an EMPTY map (the map page invites them to add a course).
- Per-user data: every table row has `user_id`, so accounts cannot see each other. The daily AI limit is per account.
- UI: log in / sign up / log out in the top bar, an Account section in Settings, a demo banner with login links.

## 1. Auth0 dashboard (about 5 minutes)
1. Create a free tenant if you don't have one (Region: pick the closest).
2. Applications > Applications > Create Application. Name: `Atlas`. Type: **Regular Web Applications**. Create.
3. Open the application's **Settings** tab and set (comma-separated, no spaces needed):
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback, https://www.myatlas.study/auth/callback, https://atlas-three-neon.vercel.app/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000, https://www.myatlas.study, https://atlas-three-neon.vercel.app`
   - **Allowed Web Origins**: `http://localhost:3000, https://www.myatlas.study, https://atlas-three-neon.vercel.app`
   - Save Changes.
4. Same tab, top: copy **Domain**, **Client ID** and **Client Secret**.
5. Application > Connections: leave "Username-Password-Authentication" on and turn on **google-oauth2** (the default Google sign-in works for development).
6. Optional, to control who can sign up: Authentication > Database > Username-Password-Authentication > Settings > turn on **Disable Sign Ups**, then create the few users you want (yourself, your teammate) under User Management > Users. Judges use the demo, which needs no account.

## 2. Local `.env.local` (never paste secrets into chat or git)
```
AUTH0_DOMAIN=your-tenant.us.auth0.com      (no https://)
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_SECRET=<64 hex characters>
```
Make AUTH0_SECRET with: `echo "AUTH0_SECRET=$(openssl rand -hex 32)" >> .env.local`
Restart `npm run dev`. If you ever change AUTH0_SECRET, clear the site's cookies for localhost (otherwise: JWEDecryptionFailed).
Do NOT set APP_BASE_URL unless you need to: the SDK works out the address from the request, which is why every URL above is listed.

## 3. Vercel
Project > Settings > Environment Variables: add the same four (Production), then redeploy. The site gate (SITE_ACCESS_KEY) still applies until you delete it.

## 4. First login and moving your existing data
Everything saved so far (the sample world and your real uploads, such as CPSC 213) belongs to the shared demo user. After you first log in:
1. Open Settings > Account and copy your **Account id**.
2. `npm run db:claim -- "<your account id>"` shows what would move (dry run).
3. `npm run db:claim -- "<your account id>" --yes` moves it. It refuses if that account already has data.

## 5. Going public (judging)
With login on, the lockdown holds: logged-out visitors are demo-only. To open the site, delete SITE_ACCESS_KEY in Vercel and redeploy. Sign-ups are open unless you did step 1.6; each account gets AI_DAILY_LIMIT calls per day (default 30).

## Facts checked against the installed SDK (@auth0/nextjs-auth0 4.33.0)
Session cookie is `__session` (split into `__session__0`, `__session__1` when large). `session.user.sub` is the account id. `auth0.middleware(request)` takes a Request and returns the response. Login accepts `returnTo` and `screen_hint=signup`.
