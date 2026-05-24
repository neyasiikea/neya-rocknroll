// Sound effects — short synthesized sounds played alongside main audio
// Uses Web Audio API oscillator for zero-latency, no file dependencies

let sfxCtx: AudioContext | null = null;
let sfxGain: GainNode | null = null;

function ensureCtx() {
  if (!sfxCtx) {
    sfxCtx = new AudioContext();
    sfxGain = sfxCtx.createGain();
    sfxGain.gain.value = 0.22;
    sfxGain.connect(sfxCtx.destination);
  }
  if (sfxCtx.state === "suspended") sfxCtx.resume();
}

/** Play a cheerful ascending chime for combo */
export function playComboSFX() {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  [523.25, 659.25].forEach((freq, i) => {
    const osc = sfxCtx!.createOscillator();
    const g = sfxCtx!.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, now + i * 0.05);
    g.gain.linearRampToValueAtTime(1, now + i * 0.05 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);
    osc.connect(g);
    g.connect(sfxGain!);
    osc.start(now + i * 0.05);
    osc.stop(now + i * 0.05 + 0.14);
  });
}

/** Play a harsh error buzz — like Guitar Hero miss / security door wrong code */
export function playMissSFX() {
  ensureCtx();
  if (!sfxCtx || !sfxGain) return;
  const now = sfxCtx.currentTime;

  // Layer of detuned sawtooths for a thick, angry buzz
  [95, 105, 400].forEach((freq) => {
    const osc = sfxCtx!.createOscillator();
    const g = sfxCtx!.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq;
    const vol = freq < 200 ? 0.8 : 0.25; // low end carries the weight
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  });

  // White noise burst for the "guitar chunk" texture
  const bufferSize = sfxCtx.sampleRate * 0.2;
  const noiseBuffer = sfxCtx.createBuffer(1, bufferSize, sfxCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.4;
  }
  const noise = sfxCtx.createBufferSource();
  noise.buffer = noiseBuffer;

  // Bandpass filter to shape noise into a "buzz" (like a door buzzer)
  const filter = sfxCtx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 400;
  filter.Q.value = 1.5;

  const noiseGain = sfxCtx.createGain();
  noiseGain.gain.setValueAtTime(0, now);
  noiseGain.gain.linearRampToValueAtTime(0.5, now + 0.005);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(sfxGain!);
  noise.start(now);
  noise.stop(now + 0.18);
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
