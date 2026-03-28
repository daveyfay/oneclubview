import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { HubDataProvider } from '../HubDataContext';
import { useHubData } from '../../hooks/useHubData';

// ── Mock lib/supabase ──
vi.mock('../../lib/supabase', () => ({
  db: vi.fn(),
  rpc: vi.fn(),
  SB: 'https://mock.supabase.co',
}));

// ── Mock lib/utils ──
vi.mock('../../lib/utils', () => ({
  getAge: vi.fn(() => 8),
  weekDates: vi.fn(() => {
    const dates = [];
    const start = new Date('2026-03-23'); // Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }),
  showToast: vi.fn(),
  track: vi.fn(),
}));

// ── Mock lib/constants ──
vi.mock('../../lib/constants', () => ({
  COLS: ['#2d7cb5', '#2d5a3f', '#c4960c', '#9b4dca'],
  COUNTRY_CONFIG: { IE: { currency: '€' } },
  USER_COUNTRY: 'IE',
  CC: { currency: '€' },
  DAYF: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  CT: {},
  CAT_NAMES: {},
}));

// ── Mock global.fetch ──
global.fetch = vi.fn();

// ── Mock navigator.geolocation ──
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success, _error, _opts) => {
      // Don't call success by default — keeps tests simple
    }),
  },
  configurable: true,
});

// ── Test data ──
const mockUser = { id: 'user-123', email: 'test@test.com' };
const mockProfile = { family_id: 'fam-1', family_role: 'admin', first_name: 'Dave' };

// ── TestConsumer component ──
function TestConsumer() {
  const data = useHubData();
  return (
    <div>
      <span data-testid="loading">{data.loading ? 'true' : 'false'}</span>
      <span data-testid="kids">{JSON.stringify(data.kids)}</span>
      <span data-testid="has-load">{typeof data.load === 'function' ? 'yes' : 'no'}</span>
      <span data-testid="has-weekEvts">{Array.isArray(data.weekEvts) ? 'yes' : 'no'}</span>
      <span data-testid="is-admin">{data.isAdmin ? 'yes' : 'no'}</span>
    </div>
  );
}

// ── Helper: set up db mock to return minimal data ──
function setupDbMock(db) {
  db.mockImplementation(async (table) => {
    if (table === 'profiles') return [{ id: 'user-123', family_id: 'fam-1', family_role: 'admin', first_name: 'Dave' }];
    if (table === 'inbound_messages') return [];
    return [];
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default fetch mock — resolves to avoid unhandled promise rejections
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ status: 'success' }),
    text: async () => '[]',
  });
});

describe('HubDataContext', () => {
  it('provides data to child components', async () => {
    const { db } = await import('../../lib/supabase');
    setupDbMock(db);

    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );

    // has-load should be 'yes' immediately (load is a function set by useCallback)
    expect(screen.getByTestId('has-load').textContent).toBe('yes');
  });

  it('throws when useHubData is used outside provider', () => {
    // Suppress expected React error output
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<TestConsumer />)).toThrow(
      'useHubData must be used within HubDataProvider'
    );

    consoleError.mockRestore();
  });

  it('calls load on mount and sets loading to false after', async () => {
    const { db } = await import('../../lib/supabase');
    const { rpc } = await import('../../lib/supabase');
    setupDbMock(db);
    rpc.mockResolvedValue(false); // needs_scrape returns false — no fetch needed

    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );

    // loading starts true
    expect(screen.getByTestId('loading').textContent).toBe('true');

    // After load() resolves, loading becomes false
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // db was called (at minimum for profiles)
    expect(db).toHaveBeenCalled();
  });

  it('exposes isAdmin as true when profile.family_role is admin', async () => {
    const { db } = await import('../../lib/supabase');
    setupDbMock(db);

    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('is-admin').textContent).toBe('yes');
  });

  it('exposes weekEvts as an array', async () => {
    const { db } = await import('../../lib/supabase');
    setupDbMock(db);

    render(
      <HubDataProvider user={mockUser} profile={mockProfile}>
        <TestConsumer />
      </HubDataProvider>
    );

    // weekEvts is computed via useMemo — available immediately
    expect(screen.getByTestId('has-weekEvts').textContent).toBe('yes');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // still an array after load
    expect(screen.getByTestId('has-weekEvts').textContent).toBe('yes');
  });
});
