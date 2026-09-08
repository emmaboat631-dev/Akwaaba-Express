import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { supabase } from '../lib/supabase';

export const OAUTH_REDIRECT = Capacitor.isNativePlatform()
  ? 'com.akwaabaexpress.app://callback'
  : window.location.origin;

export function setupDeepLinkListener() {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.includes('access_token') && !url.includes('refresh_token')) return;

    const hashPart = url.includes('#') ? url.split('#')[1] : '';
    if (!hashPart) return;

    const params = new URLSearchParams(hashPart);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    }
  });
}
