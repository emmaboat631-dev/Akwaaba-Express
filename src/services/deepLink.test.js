import { describe, it, expect, vi, beforeEach } from 'vitest';

const isNativePlatform = vi.fn();
const addListener = vi.fn();
const setSession = vi.fn();

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => isNativePlatform() } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: (...a) => addListener(...a) } }));
vi.mock('../lib/supabase', () => ({ supabase: { auth: { setSession: (...a) => setSession(...a) } } }));

// OAUTH_REDIRECT is computed at import time, so each test re-imports after
// setting the platform.
const load = async () => {
  vi.resetModules();
  return import('./deepLink');
};

describe('deepLink', () => {
  beforeEach(() => {
    addListener.mockClear();
    setSession.mockClear();
  });

  describe('OAUTH_REDIRECT', () => {
    it('uses the app scheme on a native platform', async () => {
      isNativePlatform.mockReturnValue(true);
      const { OAUTH_REDIRECT } = await load();
      expect(OAUTH_REDIRECT).toBe('com.akwaabaexpress.app://callback');
    });

    it('uses the page origin on the web', async () => {
      isNativePlatform.mockReturnValue(false);
      const { OAUTH_REDIRECT } = await load();
      expect(OAUTH_REDIRECT).toBe(window.location.origin);
    });
  });

  describe('setupDeepLinkListener', () => {
    it('does nothing on the web', async () => {
      isNativePlatform.mockReturnValue(false);
      const { setupDeepLinkListener } = await load();
      setupDeepLinkListener();
      expect(addListener).not.toHaveBeenCalled();
    });

    it('registers an appUrlOpen listener on a native platform', async () => {
      isNativePlatform.mockReturnValue(true);
      const { setupDeepLinkListener } = await load();
      setupDeepLinkListener();
      expect(addListener).toHaveBeenCalledWith('appUrlOpen', expect.any(Function));
    });
  });

  describe('appUrlOpen handling', () => {
    let handler;

    beforeEach(async () => {
      isNativePlatform.mockReturnValue(true);
      const { setupDeepLinkListener } = await load();
      setupDeepLinkListener();
      handler = addListener.mock.calls[0][1];
    });

    it('sets the session from a callback url carrying both tokens', async () => {
      await handler({ url: 'com.akwaabaexpress.app://callback#access_token=abc&refresh_token=xyz' });
      expect(setSession).toHaveBeenCalledWith({ access_token: 'abc', refresh_token: 'xyz' });
    });

    it('ignores a url with no tokens', async () => {
      await handler({ url: 'com.akwaabaexpress.app://callback' });
      expect(setSession).not.toHaveBeenCalled();
    });

    it('ignores a token url with no hash fragment', async () => {
      await handler({ url: 'com.akwaabaexpress.app://callback?access_token=abc' });
      expect(setSession).not.toHaveBeenCalled();
    });

    it('ignores a fragment missing the refresh token', async () => {
      await handler({ url: 'com.akwaabaexpress.app://callback#access_token=abc' });
      expect(setSession).not.toHaveBeenCalled();
    });

    it('ignores a fragment missing the access token', async () => {
      await handler({ url: 'com.akwaabaexpress.app://callback#refresh_token=xyz' });
      expect(setSession).not.toHaveBeenCalled();
    });

    it('reads tokens alongside other fragment params', async () => {
      await handler({
        url: 'com.akwaabaexpress.app://callback#expires_in=3600&access_token=abc&token_type=bearer&refresh_token=xyz',
      });
      expect(setSession).toHaveBeenCalledWith({ access_token: 'abc', refresh_token: 'xyz' });
    });
  });
});
