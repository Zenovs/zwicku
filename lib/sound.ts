// Kleine, synthetisierte Soundeffekte (Web Audio) – keine Audiodateien nötig.

let ctx: AudioContext | null = null;
let enabled = false;

export function setSound(on: boolean) {
  enabled = on;
  if (on) ensureCtx();
}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  gain = 0.07,
  delay = 0,
) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, gain = 0.05, delay = 0) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.buffer = buf;
  src.connect(g).connect(c.destination);
  src.start(t);
}

export const sfx = {
  card: () => noise(0.08, 0.06),
  deal: () => noise(0.05, 0.045),
  coin: () => {
    tone(1180, 0.06, "square", 0.05);
    tone(1660, 0.09, "square", 0.04, 0.04);
  },
  win: () => {
    tone(523, 0.12, "sine", 0.07);
    tone(659, 0.12, "sine", 0.07, 0.1);
    tone(784, 0.2, "sine", 0.07, 0.2);
  },
  lose: () => {
    tone(300, 0.18, "sawtooth", 0.05);
    tone(196, 0.26, "sawtooth", 0.05, 0.12);
  },
};
