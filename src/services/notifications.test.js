import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPermission, isEnabled, setEnabled, send } from './notifications';

describe('notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('Notification', class {
      static permission = 'default';
      static requestPermission = vi.fn().mockResolvedValue('granted');
      constructor(title, options) {
        this.title = title;
        this.options = options;
        this.onclick = null;
        this.close = vi.fn();
      }
    });
  });

  describe('requestPermission', () => {
    it('returns true when already granted', async () => {
      Notification.permission = 'granted';
      expect(await requestPermission()).toBe(true);
    });

    it('returns false when denied', async () => {
      Notification.permission = 'denied';
      expect(await requestPermission()).toBe(false);
    });

    it('requests permission when default', async () => {
      Notification.permission = 'default';
      Notification.requestPermission.mockResolvedValue('granted');
      expect(await requestPermission()).toBe(true);
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    it('stores enabled state in localStorage', async () => {
      Notification.permission = 'granted';
      await requestPermission();
      expect(localStorage.getItem('notif_enabled')).toBe('true');
    });
  });

  describe('isEnabled', () => {
    it('returns false when Notification not supported', () => {
      const orig = window.Notification;
      delete window.Notification;
      expect(isEnabled()).toBe(false);
      window.Notification = orig;
    });

    it('returns true when granted and not disabled', () => {
      Notification.permission = 'granted';
      localStorage.setItem('notif_enabled', 'true');
      expect(isEnabled()).toBe(true);
    });

    it('returns false when user disabled via setEnabled', () => {
      Notification.permission = 'granted';
      setEnabled(false);
      expect(isEnabled()).toBe(false);
    });
  });

  describe('setEnabled', () => {
    it('sets localStorage flag', () => {
      setEnabled(true);
      expect(localStorage.getItem('notif_enabled')).toBe('true');
      setEnabled(false);
      expect(localStorage.getItem('notif_enabled')).toBe('false');
    });
  });

  describe('send', () => {
    it('creates notification when enabled', () => {
      Notification.permission = 'granted';
      localStorage.setItem('notif_enabled', 'true');
      send('Test', { body: 'hello' });
    });

    it('does nothing when disabled', () => {
      Notification.permission = 'granted';
      setEnabled(false);
      send('Test', { body: 'hello' });
    });
  });
});
