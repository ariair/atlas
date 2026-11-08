import { describe, expect, it } from 'vitest';
import { accountCapabilities, providerOf } from './accountInfo';

describe('accountCapabilities', () => {
  it('password accounts can change their password and must verify their email', () => {
    expect(providerOf('auth0|abc')).toBe('password');
    expect(accountCapabilities('auth0|abc')).toEqual({ provider: 'password', canChangePassword: true, needsEmailVerification: true });
  });
  it('google accounts have neither', () => {
    expect(accountCapabilities('google-oauth2|1')).toEqual({ provider: 'google', canChangePassword: false, needsEmailVerification: false });
  });
  it('unknown providers are treated as not password accounts', () => {
    expect(accountCapabilities('github|9').canChangePassword).toBe(false);
  });
});
