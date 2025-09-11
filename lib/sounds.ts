type SoundKey =
  | 'connect'
  | 'joined'
  | 'peer_join'
  | 'peer_leave'
  | 'mute'
  | 'muted_speaking'
  | 'reconnect'
  | 'reconnect_failed';

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let lastMutedWarnAt = 0;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(ctx.destination);
    } catch {}
  }
  return ctx;
}

function beep(frequency: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.3) {
  const c = ensureCtx();
  if (!c || !masterGain) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const now = c.currentTime;
  const dur = Math.max(0.01, durationMs / 1000);
  gain.gain.value = volume;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain).connect(masterGain);
  osc.start(now);
  osc.stop(now + dur);
}

export function playSound(key: SoundKey) {
  switch (key) {
    case 'connect':
      // rising two-tone
      beep(440, 90, 'sine', 0.25);
      setTimeout(() => beep(660, 120, 'sine', 0.25), 90);
      break;
    case 'joined':
      beep(660, 120, 'triangle', 0.3);
      setTimeout(() => beep(880, 120, 'triangle', 0.25), 120);
      break;
    case 'peer_join':
      beep(740, 80, 'triangle', 0.25);
      break;
    case 'peer_leave':
      beep(360, 140, 'sawtooth', 0.2);
      break;
    case 'mute':
      beep(220, 120, 'square', 0.2);
      break;
    case 'muted_speaking': {
      const now = Date.now();
      if (now - lastMutedWarnAt < 4000) return; // rate-limit
      lastMutedWarnAt = now;
      beep(300, 60, 'square', 0.25);
      setTimeout(() => beep(300, 60, 'square', 0.25), 120);
      break;
    }
    case 'reconnect':
      beep(520, 90, 'sine', 0.25);
      break;
    case 'reconnect_failed':
      beep(200, 200, 'sine', 0.25);
      break;
  }
}

export function setSoundVolume(volume: number) {
  ensureCtx();
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, volume));
}

