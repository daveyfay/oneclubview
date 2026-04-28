import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

describe('supabase helpers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('module imports without error', async () => {
    const mod = await import('../supabase.js');
    expect(mod.db).toBeDefined();
    expect(mod.au).toBeDefined();
    expect(mod.rpc).toBeDefined();
    expect(mod.hd).toBeDefined();
  });

  it('hd() returns headers with apikey', async () => {
    const { hd } = await import('../supabase.js');
    const headers = hd();
    expect(headers.apikey).toBeTruthy();
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toContain('Bearer ');
  });

  it('db() blocks DELETE without filters', async () => {
    const { db } = await import('../supabase.js');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await db('test_table', 'DELETE');
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith('db() DELETE blocked — no filters');
    consoleSpy.mockRestore();
  });

  it('db() makes GET request with correct URL', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify([{ id: 1 }])),
    });

    const { db, SB } = await import('../supabase.js');
    const result = await db('profiles', 'GET', {
      filters: ['id=eq.123'],
      select: 'id,email',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const callUrl = global.fetch.mock.calls[0][0];
    expect(callUrl).toContain('/rest/v1/profiles');
    expect(callUrl).toContain('select=');
    expect(callUrl).toContain('id=eq.123');
    expect(result).toEqual([{ id: 1 }]);
  });

  it('db() encodes filter values safely', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve('[]'),
    });

    const { db } = await import('../supabase.js');
    await db('family_invites', 'GET', {
      filters: ['invited_email=eq.parent+one@example.com', 'note=eq.A&B'],
      order: 'created_at.desc',
      limit: 1,
    });

    const callUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(callUrl.searchParams.get('invited_email')).toBe('eq.parent+one@example.com');
    expect(callUrl.searchParams.get('note')).toBe('eq.A&B');
    expect(callUrl.searchParams.get('order')).toBe('created_at.desc');
    expect(callUrl.searchParams.get('limit')).toBe('1');
  });
});
