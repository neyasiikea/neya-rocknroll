// Chart pattern generator — produces Note arrays from musical patterns
import type { Note, Chart, Difficulty } from "../types";

interface Section {
  startBeat: number;    // starting beat number
  endBeat: number;      // ending beat number
  type: SectionType;
}

type SectionType =
  | "intro"      // sparse, alternating lanes
  | "verse"      // quarter notes, varied lanes
  | "prechorus"  // building, some chords
  | "chorus"     // dense, chords, holds
  | "bridge"     // varied, mix of holds and taps
  | "outro";     // winding down, long holds at end

interface ChartParams {
  songId: string;
  difficulty: Difficulty;
  bpm: number;
  sections: Section[];
}

function pickLane(lanes: number, prev: number, spread: number): number {
  let lane = Math.floor(Math.random() * Math.min(lanes, spread + 1));
  if (lane === prev) lane = (lane + 1 + Math.floor(Math.random() * (spread - 1))) % lanes;
  return lane % lanes;
}

/** Quarter note per beat, ~0-2 chords every 4 beats */
function generateVerse(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd; b += 1) {
    const lane = pickLane(lanes, prev, lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    // occasional chord every 4 beats
    if (b % 4 === 0 && lanes >= 3) {
      const chordLane = pickLane(lanes, lane, lanes);
      if (chordLane !== lane) {
        notes.push({ time: b * bps, lane: chordLane });
      }
    }
  }
}

/** Eight notes, more chord density */
function generateChorus(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd; b += 0.5) {
    const lane = pickLane(lanes, prev, lanes >= 4 ? 4 : lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    // chords every 2 beats
    if (Math.abs(b % 2) < 0.01 && lanes >= 3) {
      for (let c = 0; c < (lanes >= 5 ? 2 : 1); c++) {
        const cl = pickLane(lanes, lane, lanes);
        if (cl !== lane) notes.push({ time: b * bps, lane: cl });
      }
    }
    // hold every 8 beats
    if (Math.abs(b % 8) < 0.01 && b > beatStart + 2) {
      const last = notes[notes.length - 1];
      if (last && !last.hold) last.hold = bps * 2;
    }
  }
}

/** Sparse half notes, simple alternating */
function generateIntro(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd; b += 2) {
    const lane = (prev + 1 + Math.floor(Math.random() * (lanes - 1))) % lanes;
    notes.push({ time: b * bps, lane });
    prev = lane;
  }
}

/** Building intensity, more chords than verse, less than chorus */
function generatePrechorus(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd; b += 1) {
    const lane = pickLane(lanes, prev, lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    if (b % 2 === 0 && lanes >= 3) {
      const cl = pickLane(lanes, lane, lanes);
      if (cl !== lane) notes.push({ time: b * bps, lane: cl });
    }
  }
  // Hold at end of prechorus
  const last = notes[notes.length - 1];
  if (last) last.hold = bps * 3;
}

/** Mixed patterns, more holds */
function generateBridge(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd; b += 1) {
    if (b % 3 === 0) {
      // Hold every 3 beats
      const lane = pickLane(lanes, prev, lanes);
      notes.push({ time: b * bps, lane, hold: bps * 1.5 });
      prev = lane;
    } else {
      const lane = pickLane(lanes, prev, lanes);
      notes.push({ time: b * bps, lane });
      prev = lane;
    }
  }
}

/** Winding down with long final hold */
function generateOutro(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number) {
  let prev = 0;
  for (let b = beatStart; b < beatEnd - 4; b += 2) {
    const lane = (prev + 1) % lanes;
    notes.push({ time: b * bps, lane });
    prev = lane;
  }
  // Long final hold
  notes.push({ time: (beatEnd - 4) * bps, lane: 0, hold: bps * 4 });
}

const GENERATORS: Record<SectionType, (notes: Note[], bs: number, be: number, bps: number, lanes: number) => void> = {
  intro: generateIntro,
  verse: generateVerse,
  prechorus: generatePrechorus,
  chorus: generateChorus,
  bridge: generateBridge,
  outro: generateOutro,
};

export function generateChart(params: ChartParams): Chart {
  const bps = 60 / params.bpm;
  const laneCount = params.difficulty === "easy" ? 3 : params.difficulty === "normal" ? 4 : 5;
  const notes: Note[] = [];

  for (const section of params.sections) {
    const gen = GENERATORS[section.type];
    gen(notes, section.startBeat, section.endBeat, bps, laneCount);
  }

  // Remove duplicate time+lane entries
  const seen = new Set<string>();
  const deduped = notes.filter(n => {
    const key = `${n.time.toFixed(4)}_${n.lane}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => a.time - b.time);

  return {
    songId: params.songId,
    difficulty: params.difficulty,
    bpm: params.bpm,
    lanes: laneCount,
    notes: deduped,
  };
}
