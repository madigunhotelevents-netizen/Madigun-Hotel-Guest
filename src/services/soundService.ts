/**
 * Synthesizes clear, elegant hotel concierge chimes and alert sounds using Web Audio API.
 * No external MP3 downloads required, zero latency, works reliably offline.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Two-tone crystal hotel desk bell chime (e.g. 880Hz -> 1320Hz harmonic ring)
 */
export function playConciergeBell(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Harmonic tones for high-end bronze desk bell
    const frequencies = [880, 1760, 2640];
    const gains = [0.25, 0.12, 0.04];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gains[idx], now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 1.6);
    });

    // Secondary subtle chime at +0.12s for rich double-tap bell feel
    setTimeout(() => {
      try {
        const ctx2 = getAudioContext();
        if (!ctx2) return;
        const t2 = ctx2.currentTime;
        const osc2 = ctx2.createOscillator();
        const gain2 = ctx2.createGain();

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, t2);

        gain2.gain.setValueAtTime(0.18, t2);
        gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 1.4);

        osc2.connect(gain2);
        gain2.connect(ctx2.destination);

        osc2.start(t2);
        osc2.stop(t2 + 1.4);
      } catch {
        // ignore audio errors
      }
    }, 120);
  } catch (err) {
    console.warn('Audio playback not permitted or unavailable:', err);
  }
}

/**
 * Urgent two-tone alert for emergency front desk assistance
 */
export function playUrgentAlert(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [659.25, 880, 659.25, 880];

    notes.forEach((note, index) => {
      const startTime = now + index * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.17);
    });
  } catch (err) {
    console.warn('Emergency audio playback failed:', err);
  }
}

/**
 * Gentle completion confirmation chime
 */
export function playSuccessChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const startTime = now + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (err) {
    console.warn('Success chime failed:', err);
  }
}
