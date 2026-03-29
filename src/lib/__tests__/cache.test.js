import { describe, it, expect, beforeEach } from 'vitest';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache';

describe('cache', () => {
  beforeEach(() => {
    cacheInvalidate();
  });

  it('returns null for missing key', () => {
    expect(cacheGet('nope')).toBeNull();
  });

  it('stores and retrieves data', () => {
    cacheSet('users', [{ id: 1 }], 60000);
    expect(cacheGet('users')).toEqual([{ id: 1 }]);
  });

  it('returns null for expired data', async () => {
    cacheSet('old', 'data', 1);
    await new Promise(r => setTimeout(r, 10));
    expect(cacheGet('old')).toBeNull();
  });

  it('invalidates specific key', () => {
    cacheSet('a', 1, 60000);
    cacheSet('b', 2, 60000);
    cacheInvalidate('a');
    expect(cacheGet('a')).toBeNull();
    expect(cacheGet('b')).toBe(2);
  });

  it('invalidates all keys', () => {
    cacheSet('a', 1, 60000);
    cacheSet('b', 2, 60000);
    cacheInvalidate();
    expect(cacheGet('a')).toBeNull();
    expect(cacheGet('b')).toBeNull();
  });
});
