// The Auth0 client (server only). Created on first use, and only if login is configured.
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { authConfigured } from './authConfig';

// 'v2': log out goes straight back to Atlas. The default (OIDC) can stop on an Auth0 "do you want to log out?" page.
let client: Auth0Client | null = null;

export function getAuth0(): Auth0Client | null {
  if (!authConfigured()) return null;
  return (client ??= new Auth0Client({ logoutStrategy: 'v2' }));
}
