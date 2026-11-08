import { beforeEach, describe, expect, it, vi } from 'vitest';

const getAuth0 = vi.fn();
vi.mock('./auth0', () => ({ getAuth0: () => getAuth0() }));

import { AuthRequiredError, DEMO_USER_ID, authFailure, getSessionUser, getUserId } from './user';

beforeEach(() => getAuth0.mockReset());

describe('getUserId', () => {
  it('is the fixed demo user when login is not configured', async () => {
    getAuth0.mockReturnValue(null);
    expect(await getUserId()).toBe(DEMO_USER_ID);
  });
  it('is the account id of the logged-in user', async () => {
    getAuth0.mockReturnValue({ getSession: async () => ({ user: { sub: 'auth0|abc123' } }) });
    expect(await getUserId()).toBe('auth0|abc123');
  });
  it('refuses when login is on and there is no (valid) session', async () => {
    getAuth0.mockReturnValue({ getSession: async () => null });
    await expect(getUserId()).rejects.toBeInstanceOf(AuthRequiredError);
    getAuth0.mockReturnValue({ getSession: async () => ({ user: {} }) });
    await expect(getUserId()).rejects.toBeInstanceOf(AuthRequiredError);
  });
  it('never falls back to the demo user when login is on', async () => {
    getAuth0.mockReturnValue({ getSession: async () => null });
    await expect(getUserId()).rejects.not.toBe(DEMO_USER_ID);
  });
});

describe('getSessionUser', () => {
  it('returns public details, or null, and never throws', async () => {
    getAuth0.mockReturnValue({ getSession: async () => ({ user: { sub: 'auth0|1', name: 'Sam', email: 's@x.com', secretField: 'nope' } }) });
    expect(await getSessionUser()).toEqual({ sub: 'auth0|1', name: 'Sam', email: 's@x.com', emailVerified: null });
    getAuth0.mockReturnValue({ getSession: async () => null });
    expect(await getSessionUser()).toBeNull();
    getAuth0.mockReturnValue({ getSession: async () => { throw new Error('boom'); } });
    expect(await getSessionUser()).toBeNull();
    getAuth0.mockReturnValue(null);
    expect(await getSessionUser()).toBeNull();
  });
});

describe('authFailure', () => {
  it('turns "not logged in" into a clean 401 and ignores other errors', async () => {
    const res = authFailure(new AuthRequiredError());
    expect(res?.status).toBe(401);
    expect(await res?.json()).toMatchObject({ login: true });
    expect(authFailure(new Error('db down'))).toBeNull();
    expect(authFailure('string')).toBeNull();
  });
});
