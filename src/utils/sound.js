// Lightweight UI sounds via the Web Audio API — no audio files, works offline.
// The AudioContext is created lazily and resumed on use; call primeAudio() from
// a user gesture (e.g. the online toggle) so later sounds (an incoming request
// that arrives on a timer) can play on mobile, where audio needs a prior touch.

let ctx;

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

export const primeAudio = () => { getCtx(); };

const tone = (c, freq, start, dur, peak = 0.16, type = 'sine') => {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(c.destination);
  const t0 = c.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
};

// Attention chime for an incoming ride request — two rising notes.
export const playIncoming = () => {
  const c = getCtx();
  if (!c) return;
  tone(c, 880, 0, 0.18, 0.16, 'triangle');
  tone(c, 1175, 0.19, 0.24, 0.16, 'triangle');
};

// Confirmation ding for a successful ticket scan — a bright major step up.
export const playScanSuccess = () => {
  const c = getCtx();
  if (!c) return;
  tone(c, 784, 0, 0.12, 0.18, 'sine'); // G5
  tone(c, 1047, 0.1, 0.18, 0.18, 'sine'); // C6
};

// Error buzz/tone for an invalid ticket scan.
export const playScanError = () => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate([200, 100, 200]); // Two quick vibration pulses
  }
  const c = getCtx();
  if (!c) return;
  tone(c, 330, 0, 0.15, 0.2, 'square'); // Low buzz
  tone(c, 277, 0.16, 0.2, 0.2, 'square'); // Step down
};
