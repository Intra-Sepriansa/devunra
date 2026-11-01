// Tiny synthesized tarsier sounds, the same recipes the app uses. They only play
// after the visitor has clicked something, stay quiet, and are off under reduced motion.
export type SoundName = 'blink' | 'boop' | 'peek' | 'yay' | 'dizzy' | 'wake' | 'yawn' | 'uhoh' | 'tick';

interface Tone {
  type?: OscillatorType;
  from: number;
  to: number;
  dur: number;
  start?: number;
  gain?: number;
  vibrato?: { rate: number; depth: number };
}

let ctx: AudioContext | null = null;
const last = new Map<SoundName, number>();

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, spec: Tone): void {
  const t0 = c.currentTime + (spec.start ?? 0);
  const end = t0 + spec.dur;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = spec.type ?? 'sine';
  osc.frequency.setValueAtTime(spec.from, t0);
  osc.frequency.exponentialRampToValueAtTime(spec.to, end);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(spec.gain ?? 0.06, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, end);
  if (spec.vibrato) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = spec.vibrato.rate;
    depth.gain.value = spec.vibrato.depth;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(end + 0.02);
  }
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(end + 0.02);
}

const RECIPES: Record<SoundName, (c: AudioContext) => void> = {
  blink: (c) => tone(c, { from: 1400, to: 1900, dur: 0.07, gain: 0.04 }),
  boop: (c) => {
    tone(c, { from: 520, to: 250, dur: 0.17, gain: 0.07 });
    tone(c, { type: 'triangle', from: 1040, to: 500, dur: 0.1, gain: 0.02 });
  },
  peek: (c) => {
    tone(c, { from: 420, to: 600, dur: 0.12, gain: 0.05 });
    tone(c, { from: 600, to: 900, dur: 0.13, start: 0.13, gain: 0.05 });
  },
  yay: (c) =>
    [880, 1108.73, 1318.51].forEach((f, i) =>
      tone(c, { type: 'triangle', from: f, to: f * 1.03, dur: 0.12, start: i * 0.075, gain: 0.05 })
    ),
  dizzy: (c) => tone(c, { from: 760, to: 260, dur: 0.65, gain: 0.05, vibrato: { rate: 13, depth: 45 } }),
  wake: (c) => {
    tone(c, { from: 380, to: 740, dur: 0.18, gain: 0.05 });
    tone(c, { from: 740, to: 1110, dur: 0.12, start: 0.17, gain: 0.04 });
  },
  yawn: (c) => tone(c, { from: 540, to: 190, dur: 0.75, gain: 0.035, vibrato: { rate: 5, depth: 14 } }),
  uhoh: (c) => {
    tone(c, { type: 'triangle', from: 660, to: 640, dur: 0.14, gain: 0.06 });
    tone(c, { type: 'triangle', from: 500, to: 430, dur: 0.24, start: 0.16, gain: 0.06 });
  },
  tick: (c) => tone(c, { type: 'square', from: 2200, to: 1800, dur: 0.025, gain: 0.012 }),
};

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const activated = () => (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false;

export function playSound(name: SoundName): void {
  if (reduced() || !activated()) return;
  const now = performance.now();
  if (now - (last.get(name) ?? 0) < 70) return;
  last.set(name, now);
  try {
    RECIPES[name](audio());
  } catch {
    // No audio device: stay silent.
  }
}
