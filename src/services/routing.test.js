import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('routing service', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('returns null for missing points', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', '');
    const { getRoute } = await import('./routing');
    expect(await getRoute(null, [5, -1])).toBeNull();
    expect(await getRoute([5, -1], null)).toBeNull();
  });

  it('returns straight line when no API key', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', '');
    const { getRoute } = await import('./routing');
    const from = [5.6, -0.19];
    const to = [6.7, -1.6];
    const result = await getRoute(from, to);
    expect(result).toEqual([from, to]);
  });

  it('fetches route from ORS when key exists', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'test-key');
    const coords = [[-0.19, 5.6], [-1.0, 6.0], [-1.6, 6.7]];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: coords } }] }),
    });

    const { getRoute } = await import('./routing');
    const result = await getRoute([5.6, -0.19], [6.7, -1.6]);
    expect(result).toEqual([[5.6, -0.19], [6.0, -1.0], [6.7, -1.6]]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('returns cached result on second call', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'test-key');
    const coords = [[-0.19, 5.6], [-1.6, 6.7]];
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [{ geometry: { coordinates: coords } }] }),
    });

    const { getRoute } = await import('./routing');
    await getRoute([5.6, -0.19], [6.7, -1.6]);
    await getRoute([5.6, -0.19], [6.7, -1.6]);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('falls back to straight line on fetch error', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'test-key');
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { getRoute } = await import('./routing');
    const from = [5.6, -0.19];
    const to = [6.7, -1.6];
    const result = await getRoute(from, to);
    expect(result).toEqual([from, to]);
  });

  it('falls back on network failure', async () => {
    vi.stubEnv('VITE_ORS_API_KEY', 'test-key');
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { getRoute } = await import('./routing');
    const from = [5.6, -0.19];
    const to = [6.7, -1.6];
    const result = await getRoute(from, to);
    expect(result).toEqual([from, to]);
  });
});
