// All server code gets the current user through getUserId().
// Returns a fixed demo user until Auth0 is added, so auth never blocks the core build.
export const DEMO_USER_ID = 'demo-user';

export async function getUserId(): Promise<string> {
  return DEMO_USER_ID;
}
