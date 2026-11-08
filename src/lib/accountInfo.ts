// What kind of login an account uses, decided from the Auth0 account id ("sub", for example "google-oauth2|123" or "auth0|abc").
export type Provider = 'password' | 'google' | 'other';

export function providerOf(sub: string): Provider {
  if (sub.startsWith('auth0|')) return 'password'; // email + password account made on Atlas's own sign-up
  if (sub.startsWith('google-oauth2|')) return 'google';
  return 'other';
}

/** Only password accounts have a password to change, and only they need to prove their email (Google already did). */
export function accountCapabilities(sub: string) {
  const provider = providerOf(sub);
  return { provider, canChangePassword: provider === 'password', needsEmailVerification: provider === 'password' };
}
