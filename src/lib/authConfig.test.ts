import { describe, expect, it } from 'vitest';
import { authConfigured, hasSessionCookie } from './authConfig';

const full = { AUTH0_DOMAIN: 'x.auth0.com', AUTH0_CLIENT_ID: 'id', AUTH0_CLIENT_SECRET: 'secret', AUTH0_SECRET: 'abc' };
const req = (cookie?: string) => new Request('http://x/', { headers: cookie ? { cookie } : {} });

describe('authConfigured', () => {
  it('is on only when all four settings are present and non-blank', () => {
    expect(authConfigured(full)).toBe(true);
    expect(authConfigured({})).toBe(false);
    for (const k of Object.keys(full)) {
      expect(authConfigured({ ...full, [k]: undefined }), `without ${k}`).toBe(false);
      expect(authConfigured({ ...full, [k]: '   ' }), `blank ${k}`).toBe(false);
    }
  });
});

describe('authConfigured with DEMO=1', () => {
  it('turns login off even when all four settings exist', () => {
    expect(authConfigured({ ...full, DEMO: '1' })).toBe(false);
    expect(authConfigured({ ...full, DEMO: '0' })).toBe(true);
  });
});

describe('hasSessionCookie', () => {
  it('sees the session cookie, including split chunks', () => {
    expect(hasSessionCookie(req('__session=abc'))).toBe(true);
    expect(hasSessionCookie(req('a=b; __session=abc'))).toBe(true);
    expect(hasSessionCookie(req('__session__0=abc; __session__1=def'))).toBe(true);
  });
  it('ignores lookalikes and missing cookies', () => {
    expect(hasSessionCookie(req())).toBe(false);
    expect(hasSessionCookie(req('atlas_session=abc'))).toBe(false);
    expect(hasSessionCookie(req('my__session=abc'))).toBe(false);
    expect(hasSessionCookie(req('__sessionx=abc'))).toBe(false);
  });
});
