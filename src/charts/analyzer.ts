// Audio-based chart generator — analyzes waveform to produce musical note charts
import type { Chart, Note, Difficulty } from "../types";

interface AnalysisResult {
  onsets: { time: number; energy: number; band: number }[];
  sections: { start: number; end: number; energy: number }[];
  bpm: number;
}

/** Simple energy-based onset detection on raw PCM */
function detectOnsets(
  data: Float32Array,
  sampleRate: number,
  frameSize: number,
  hopSize: number
): { time: number; energy: number; spectralCentroid: number }[] {
  const frames: { time: number; energy: number; centroid: number }[] = [];
  const numFrames = Math.floor((data.length - frameSize) / hopSize);

  // Compute per-frame energy
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    let energy = 0;
    let weightedSum = 0;
    let totalAmp = 0;

    // Simple spectral centroid approximation using zero-crossing density
    let prevSign = data[start] >= 0 ? 1 : -1;
    let zeroCrossings = 0;
    for (let j = 1; j < frameSize; j++) {
      const idx = start + j;
      const amp = Math.abs(data[idx]);
      energy += amp * amp;
      weightedSum += amp * j;
      totalAmp += amp;

      const sign = data[idx] >= 0 ? 1 : -1;
      if (sign !== prevSign) zeroCrossings++;
      prevSign = sign;
    }
    const rms = Math.sqrt(energy / frameSize);
    const centroid = totalAmp > 0 ? weightedSum / totalAmp / frameSize : 0;
    frames.push({ time: (start + frameSize / 2) / sampleRate, energy: rms, centroid });
  }

  return frames;
}

/** Detect tempo using autocorrelation of energy envelope */
function detectBPM(frames: { energy: number }[], sampleRate: number, hopSize: number): number {
  const energies = frames.map(f => f.energy);
  // Find peaks in energy autocorrelation
  const maxLag = Math.min(Math.floor(2 * sampleRate / hopSize), energies.length / 2); // ~2 seconds max
  const correlations: number[] = [];
  for (let lag = Math.floor(0.3 * sampleRate / hopSize); lag < maxLag; lag++) {
    let corr = 0;
    const n = energies.length - lag;
    for (let i = 0; i < n; i++) corr += energies[i] * energies[i + lag];
    correlations.push(corr / n);
  }
  // Find strongest peak
  let bestLag = Math.floor(0.5 * sampleRate / hopSize); // default ~120 BPM
  let bestVal = 0;
  for (let i = 1; i < correlations.length - 1; i++) {
    if (correlations[i] > correlations[i - 1] && correlations[i] > correlations[i + 1] && correlations[i] > bestVal) {
      bestVal = correlations[i];
      bestLag = i + Math.floor(0.3 * sampleRate / hopSize);
    }
  }
  const periodSec = bestLag * hopSize / sampleRate;
  return Math.round(60 / periodSec);
}

/** Split audio into frequency bands using overlapping bandpass approximations */
function analyzeBands(data: Float32Array, sampleRate: number, time: number, windowSize: number) {
  const start = Math.floor(time * sampleRate);
  const end = Math.min(start + windowSize, data.length);
  const len = end - start;
  if (len <= 0) return { low: 0, midLow: 0, midHigh: 0, high: 0 };

  // Simple filter-bank energy using running averages at different resolutions
  let low = 0, midLow = 0, midHigh = 0, high = 0;
  // Use adjacent-sample differences as a crude high-pass
  for (let i = 0; i < len; i++) {
    const idx = start + i;
    const raw = data[idx];
    const smoothed = i > 0 ? (raw + data[idx - 1]) / 2 : raw; // low-pass
    const detail = raw - smoothed; // high-pass
    const absRaw = Math.abs(raw);
    const absSmoothed = Math.abs(smoothed);
    const absDetail = Math.abs(detail);

    low += absSmoothed;
    midLow += absRaw * 0.6;
    midHigh += absDetail * 0.8;
    high += absDetail;
  }

  const scale = 1 / Math.max(1, len);
  return {
    low: low * scale,
    midLow: midLow * scale * 0.7,
    midHigh: midHigh * scale * 0.9,
    high: high * scale,
  };
}

/** Assign lane based on which frequency band dominates */
function bandToLane(bands: { low: number; midLow: number; midHigh: number; high: number }, laneCount: number): number {
  const { low, midLow, midHigh, high } = bands;
  const maxVal = Math.max(low, midLow, midHigh, high);
  if (laneCount <= 3) {
    if (maxVal === low || maxVal === midLow) return 0;
    if (maxVal === midHigh) return 1;
    return 2;
  }
  if (laneCount === 4) {
    if (maxVal === low) return 0;
    if (maxVal === midLow) return 1;
    if (maxVal === midHigh) return 2;
    return 3;
  }
  // 5 lanes
  if (maxVal === low) return 0;
  if (maxVal === midLow) return 1;
  if (maxVal === midHigh) return 2;
  if (high > midHigh * 1.5) return 4;
  return 3;
}

/** Detect energy-based sections in the song */
function detectSections(frames: { time: number; energy: number }[], duration: number) {
  // Smooth energy
  const smoothed: number[] = [];
  const window = 8;
  for (let i = 0; i < frames.length; i++) {
    let sum = 0, count = 0;
    for (let j = Math.max(0, i - window); j < Math.min(frames.length, i + window); j++) {
      sum += frames[j].energy; count++;
    }
    smoothed.push(sum / count);
  }
  const avgEnergy = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  // Split into high/low energy sections
  const sections: { start: number; end: number; energy: number }[] = [];
  let secStart = 0;
  let currentEnergy = smoothed[0];
  for (let i = 1; i < smoothed.length; i++) {
    const isHigh = smoothed[i] > avgEnergy * 1.2;
    const wasHigh = currentEnergy > avgEnergy * 1.2;
    if (isHigh !== wasHigh || smoothed[i] < avgEnergy * 0.3 !== currentEnergy < avgEnergy * 0.3) {
      sections.push({ start: frames[secStart]?.time ?? 0, end: frames[i - 1]?.time ?? 0, energy: currentEnergy / avgEnergy });
      secStart = i;
      currentEnergy = smoothed[i];
    }
  }
  sections.push({ start: frames[secStart]?.time ?? 0, end: duration, energy: currentEnergy / avgEnergy });
  return sections;
}

export async function analyzeAudio(audioPath: string): Promise<AnalysisResult> {
  const response = await fetch(audioPath);
  const arrayBuffer = await response.arrayBuffer();
  const audioCtx = new OfflineAudioContext(1, 44100, 44100);
  // We need a proper decode — use real context
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);
  ctx.close();

  const sampleRate = buffer.sampleRate;
  const data = buffer.getChannelData(0);
  const duration = buffer.duration;
  const frameSize = 2048;
  const hopSize = 512;

  const frames = detectOnsets(data, sampleRate, frameSize, hopSize);
  const bpm = detectBPM(frames, sampleRate, hopSize);

  // Compute onset function (difference in energy)
  const energyDiffs: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    energyDiffs.push(Math.max(0, frames[i].energy - frames[i - 1].energy));
  }

  // Adaptive threshold for peak detection
  const sortedDiffs = [...energyDiffs].sort((a, b) => b - a);
  const threshold = sortedDiffs[Math.floor(sortedDiffs.length * 0.15)] * 0.6;

  // Pick peaks
  const onsets: { time: number; energy: number; band: number }[] = [];
  for (let i = 2; i < energyDiffs.length - 2; i++) {
    if (energyDiffs[i] > threshold &&
        energyDiffs[i] > energyDiffs[i - 1] &&
        energyDiffs[i] > energyDiffs[i - 2] &&
        energyDiffs[i] > energyDiffs[i + 1] &&
        energyDiffs[i] > energyDiffs[i + 2]) {
      const frameIdx = i + 1;
      const time = frames[frameIdx].time;
      const bands = analyzeBands(data, sampleRate, time, frameSize);
      const energy = frames[frameIdx].energy;
      onsets.push({ time, energy, band: 0 }); // band assigned later per difficulty
    }
  }

  const sections = detectSections(frames, duration);
  return { onsets, sections, bpm };
}

/** Generate chart from audio analysis */
export function chartFromAnalysis(
  songId: string,
  difficulty: Difficulty,
  analysis: AnalysisResult
): Chart {
  const laneCount = difficulty === "easy" ? 3 : difficulty === "normal" ? 4 : 5;
  const notes: Note[] = [];
  const minGap = difficulty === "easy" ? 0.4 : difficulty === "normal" ? 0.25 : 0.15;

  // Energy thresholds per difficulty
  const energyThreshold = difficulty === "easy" ? 0.5 : difficulty === "normal" ? 0.35 : 0.2;

  let lastTime = -minGap;
  let lastLane = 0;

  for (const onset of analysis.onsets) {
    // Skip if too close to previous note
    if (onset.time - lastTime < minGap) continue;
    // Skip low-energy onsets for higher difficulties
    if (onset.energy < energyThreshold) continue;

    // Determine lane based on section energy
    const section = analysis.sections.find(s => onset.time >= s.start && onset.time < s.end);
    const sectionEnergy = section?.energy ?? 1;
    const isHighEnergy = sectionEnergy > 1.2;
    const isLowEnergy = sectionEnergy < 0.7;

    let lane: number;
    if (isHighEnergy && laneCount >= 4) {
      // High energy: spread across all lanes, use more right lanes
      const r = Math.random();
      if (r < 0.3) lane = 0;
      else if (r < 0.5) lane = 1;
      else if (r < 0.7) lane = 2;
      else if (laneCount >= 5 && r < 0.9) lane = 3;
      else lane = Math.min(laneCount - 1, 3 + Math.floor(Math.random() * 2));
    } else if (isLowEnergy || difficulty === "easy") {
      // Low energy: mostly left lanes (main beat)
      lane = Math.random() < 0.6 ? 0 : Math.random() < 0.7 ? 1 : 2;
    } else {
      // Normal: mix
      lane = Math.floor(Math.random() * Math.min(laneCount, 3 + Math.floor(Math.random() * 2)));
    }

    // Avoid same lane consecutively
    if (lane === lastLane && laneCount > 2) {
      lane = (lane + 1 + Math.floor(Math.random() * (laneCount - 1))) % laneCount;
    }

    notes.push({ time: onset.time, lane });
    lastTime = onset.time;
    lastLane = lane;

    // Add chord for very high energy moments
    if (isHighEnergy && difficulty !== "easy" && Math.random() < 0.3 && laneCount >= 3) {
      const chordLane = (lane + 2 + Math.floor(Math.random() * (laneCount - 2))) % laneCount;
      if (chordLane !== lane) {
        notes.push({ time: onset.time, lane: chordLane });
      }
    }

    // Add hold for sustained energy (long duration high-energy sections)
    if (isHighEnergy && difficulty !== "easy" && Math.random() < 0.12) {
      const last = notes[notes.length - 1];
      if (last && !last.hold) {
        last.hold = Math.min(0.8, analysis.bpm > 0 ? 60 / analysis.bpm * 2 : 0.6);
      }
    }
  }

  // Sort by time
  notes.sort((a, b) => a.time - b.time);

  return {
    songId,
    difficulty,
    bpm: analysis.bpm,
    lanes: laneCount,
    notes,
  };
}
