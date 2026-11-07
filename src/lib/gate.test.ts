import { describe, expect, it } from 'vitest';
import { decideAccess, sha256Hex } from './gate';

describe('decideAccess', () => {
  it('is open when no key is configured', async () => {
    expect(await decideAccess({ key: undefined, cookie: undefined, queryKey: null })).toBe('open');
    expect(await decideAccess({ key: '   ', cookie: undefined, queryKey: null })).toBe('open');
  });
  it('denies visitors with nothing or the wrong thing', async () => {
    expect(await decideAccess({ key: 'secret', cookie: undefined, queryKey: null })).toBe('deny');
    expect(await decideAccess({ key: 'secret', cookie: 'nope', queryKey: 'wrong' })).toBe('deny');
    expect(await decideAccess({ key: 'secret', cookie: 'secret', queryKey: null })).toBe('deny'); // the raw key is not a valid cookie
  });
  it('grants access (and a cookie) for the right key in the address', async () => {
    expect(await decideAccess({ key: 'secret', cookie: undefined, queryKey: 'secret' })).toBe('grant');
  });
  it('allows a visitor who holds the hashed cookie', async () => {
    expect(await decideAccess({ key: 'secret', cookie: await sha256Hex('secret'), queryKey: null })).toBe('allow');
  });
  it('stops working when the key changes', async () => {
    const oldCookie = await sha256Hex('old-key');
    expect(await decideAccess({ key: 'new-key', cookie: oldCookie, queryKey: null })).toBe('deny');
  });
  it('hashes consistently', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
