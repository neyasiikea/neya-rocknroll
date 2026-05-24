// Sound effects — synthesized sounds, zero file dependencies
let sfxCtx: AudioContext | null = null;
let sfxGain: GainNode | null = null;

function ensureCtx() {
  if (!sfxCtx) {
    sfxCtx = new AudioContext();
    sfxGain = sfxCtx.createGain();
    sfxGain.gain.value = 0.3;
    sfxGain.connect(sfxCtx.destination);
  }
  if (sfxCtx.state === "suspended") sfxCtx.resume();
}

/** Loud error buzz — like Guitar Hero miss / security door wrong code */
export function playMissSFX() {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  // Thick detuned sawtooths
  [90, 108, 420].forEach((freq) => {
    const osc = sfxCtx!.createOscillator();
    const g = sfxCtx!.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(freq < 200 ? 1.0 : 0.4, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(g);
    g.connect(sfxGain!);
    osc.start(now);
    osc.stop(now + 0.25);
  });

  // Noise burst via bandpass
  const len = Math.floor(sfxCtx.sampleRate * 0.25);
  const buf = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = sfxCtx.createBufferSource(); noise.buffer = buf;
  const filter = sfxCtx.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = 400; filter.Q.value = 1.5;
  const ng = sfxCtx.createGain();
  ng.gain.setValueAtTime(0, now);
  ng.gain.linearRampToValueAtTime(0.7, now + 0.005);
  ng.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
  noise.connect(filter); filter.connect(ng); ng.connect(sfxGain!);
  noise.start(now); noise.stop(now + 0.2);
}

/** Rising arpeggio for combo milestones (10/30/50) */
export function playComboMilestoneSFX(level: number) {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  // Rising pitch based on combo level
  const baseFreq = level >= 50 ? 660 : level >= 30 ? 523 : 392;
  const notes = level >= 50 ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2]
    : level >= 30 ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5]
    : [baseFreq, baseFreq * 1.25];

  notes.forEach((freq, i) => {
    const osc = sfxCtx!.createOscillator();
    const g = sfxCtx!.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const t = now + i * 0.06;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(g); g.connect(sfxGain!);
    osc.start(t); osc.stop(t + 0.16);
  });
}

/** Vibrate gamepad */
export function vibrateGamepad(intensity: number, durationMs = 150) {
  const gp = navigator.getGamepads()[0];
  if (!gp) return;
  try {
    if ((gp as any).vibrationActuator?.playEffect) {
      (gp as any).vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0, duration: durationMs,
        weakMagnitude: intensity * 0.6, strongMagnitude: intensity,
      });
    }
  } catch (_) { /* not supported */ }
}
