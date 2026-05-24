// Sound effects — short synthesized sounds played alongside main audio
// Uses Web Audio API oscillator for zero-latency, no file dependencies

let sfxCtx: AudioContext | null = null;
let sfxGain: GainNode | null = null;

function ensureCtx() {
  if (!sfxCtx) {
    sfxCtx = new AudioContext();
    sfxGain = sfxCtx.createGain();
    sfxGain.gain.value = 0.15; // quiet — don't overpower music
    sfxGain.connect(sfxCtx.destination);
  }
  if (sfxCtx.state === "suspended") sfxCtx.resume();
}

/** Play a cheerful ascending chime for combo */
export function playComboSFX() {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  // Two quick ascending notes: C6 → E6
  [523.25, 659.25].forEach((freq, i) => {
    const osc = sfxCtx!.createOscillator();
    const g = sfxCtx!.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.05);
    g.gain.linearRampToValueAtTime(1, now + i * 0.05 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
    osc.connect(g);
    g.connect(sfxGain!);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.12);
  });
}

/** Play a low buzz for miss */
export function playMissSFX() {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  const osc = sfxCtx.createOscillator();
  const g = sfxCtx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 80;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.6, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.connect(g);
  g.connect(sfxGain!);
  osc.start(now);
  osc.stop(now + 0.15);
}

/** Vibrate gamepad: 0=none, 0.3=light, 0.8=medium, 1.0=strong */
export function vibrateGamepad(intensity: number, durationMs = 150) {
  const gp = navigator.getGamepads()[0];
  if (!gp) return;
  try {
    // Chrome 68+ Gamepad vibration API
    if ((gp as any).vibrationActuator?.playEffect) {
      (gp as any).vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: durationMs,
        weakMagnitude: intensity * 0.6,
        strongMagnitude: intensity,
      });
    }
  } catch (_) {
    // Vibration not supported — silently ignore
  }
}
