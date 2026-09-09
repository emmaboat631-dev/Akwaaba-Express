import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// sound.js caches its AudioContext in module scope, so each test re-imports the
// module fresh to get a clean cache.
const loadSound = async () => {
  vi.resetModules();
  return import('./sound');
};

const makeCtx = (state = 'running') => {
  const osc = () => ({
    type: '',
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  });
  const gain = () => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  });
  return {
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    createOscillator: vi.fn(osc),
    createGain: vi.fn(gain),
  };
};

// `new AC()` needs a real constructor, so the mock must not be an arrow fn.
const ctorFor = (instance) => vi.fn(function () { return instance; });

describe('sound', () => {
  let ctx;

  beforeEach(() => {
    ctx = makeCtx();
    window.AudioContext = ctorFor(ctx);
  });

  afterEach(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
  });

  describe('primeAudio', () => {
    it('creates an AudioContext', async () => {
      const { primeAudio } = await loadSound();
      primeAudio();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('reuses the same context across calls', async () => {
      const { primeAudio } = await loadSound();
      primeAudio();
      primeAudio();
      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('resumes a suspended context', async () => {
      ctx = makeCtx('suspended');
      window.AudioContext = ctorFor(ctx);
      const { primeAudio } = await loadSound();
      primeAudio();
      expect(ctx.resume).toHaveBeenCalled();
    });

    it('does not throw when AudioContext is unavailable', async () => {
      delete window.AudioContext;
      const { primeAudio } = await loadSound();
      expect(() => primeAudio()).not.toThrow();
    });

    it('falls back to webkitAudioContext', async () => {
      delete window.AudioContext;
      window.webkitAudioContext = ctorFor(ctx);
      const { primeAudio } = await loadSound();
      primeAudio();
      expect(window.webkitAudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('playIncoming', () => {
    it('plays two tones', async () => {
      const { playIncoming } = await loadSound();
      playIncoming();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
      expect(ctx.createGain).toHaveBeenCalledTimes(2);
    });

    it('no-ops without an AudioContext', async () => {
      delete window.AudioContext;
      const { playIncoming } = await loadSound();
      expect(() => playIncoming()).not.toThrow();
    });
  });

  describe('playScanSuccess', () => {
    it('plays two tones', async () => {
      const { playScanSuccess } = await loadSound();
      playScanSuccess();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('starts and stops each oscillator', async () => {
      const created = [];
      ctx.createOscillator = vi.fn(() => {
        const o = {
          type: '', frequency: { value: 0 },
          connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
        };
        created.push(o);
        return o;
      });
      const { playScanSuccess } = await loadSound();
      playScanSuccess();
      created.forEach((o) => {
        expect(o.start).toHaveBeenCalled();
        expect(o.stop).toHaveBeenCalled();
      });
    });

    it('no-ops without an AudioContext', async () => {
      delete window.AudioContext;
      const { playScanSuccess } = await loadSound();
      expect(() => playScanSuccess()).not.toThrow();
    });
  });

  describe('playScanError', () => {
    it('plays two tones', async () => {
      const { playScanError } = await loadSound();
      playScanError();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('vibrates when the device supports it', async () => {
      const vibrate = vi.fn();
      navigator.vibrate = vibrate;
      const { playScanError } = await loadSound();
      playScanError();
      expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
      delete navigator.vibrate;
    });

    it('still plays audio when vibrate is unavailable', async () => {
      delete navigator.vibrate;
      const { playScanError } = await loadSound();
      playScanError();
      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('no-ops without an AudioContext', async () => {
      delete window.AudioContext;
      const { playScanError } = await loadSound();
      expect(() => playScanError()).not.toThrow();
    });
  });
});
