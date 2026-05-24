// src/game/audio.ts

let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let analyserNode: AnalyserNode | null = null;
let startOffset = 0;           // audioContext.currentTime when playback started
let calibrationOffset = 0;     // user-adjustable audio delay (seconds)
let isPlaying = false;
let audioDuration = 0;         // loaded buffer duration in seconds
let audioEnded = false;        // true when sourceNode naturally ends
let onEndedCallback: (() => void) | null = null;

/** Pre-decode audio file */
export async function loadAudio(url: string): Promise<AudioBuffer> {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

/** Start playback */
export function playAudio(buffer: AudioBuffer) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  // Create nodes
  sourceNode = audioCtx.createBufferSource();
  sourceNode.buffer = buffer;

  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0.8;

  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 256;

  sourceNode.connect(gainNode);
  gainNode.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  audioDuration = buffer.duration;
  audioEnded = false;
  startOffset = audioCtx.currentTime + 0.05;
  sourceNode.start(startOffset);
  sourceNode.onended = () => {
    audioEnded = true;
    if (onEndedCallback) onEndedCallback();
  };
  isPlaying = true;
}

export function getAudioDuration(): number { return audioDuration; }
export function hasAudioEnded(): boolean { return audioEnded; }
export function onAudioEnded(cb: () => void) { onEndedCallback = cb; }

/** Get current playback position (seconds), accounting for calibration offset */
export function getPlaybackTime(): number {
  if (!audioCtx || !isPlaying) return 0;
  return audioCtx.currentTime - startOffset + calibrationOffset;
}

/** Get spectrum data (for background rhythm visualization) */
export function getSpectrumData(): Uint8Array {
  if (!analyserNode) return new Uint8Array(0);
  const data = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(data);
  return data;
}

/** Get low-frequency energy (0-1), used for driving background glow */
export function getBassIntensity(): number {
  const data = getSpectrumData();
  if (data.length < 8) return 0;
  // Average first 8 bins (low frequencies)
  const sum = data.slice(0, 8).reduce((a, b) => a + b, 0);
  return sum / (8 * 255);
}

/** Pause / Resume */
export function suspendAudio() {
  audioCtx?.suspend();
}

export function resumeAudio() {
  audioCtx?.resume();
}

/** Stop and clean up */
export function stopAudio() {
  try { sourceNode?.stop(); } catch (_) { /* already stopped */ }
  sourceNode?.disconnect();
  gainNode?.disconnect();
  analyserNode?.disconnect();
  sourceNode = null;
  gainNode = null;
  analyserNode = null;
  isPlaying = false;
}

export function setCalibration(ms: number) {
  calibrationOffset = ms / 1000;
}

export function getCalibration(): number {
  return calibrationOffset * 1000;
}

export function getIsPlaying() {
  return isPlaying;
}
