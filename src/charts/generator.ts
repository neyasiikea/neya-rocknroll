// Chart pattern generator — difficulty-aware note generation
import type { Note, Chart, Difficulty } from "../types";

interface Section {
  startBeat: number;
  endBeat: number;
  type: SectionType;
}

type SectionType = "intro" | "verse" | "prechorus" | "chorus" | "bridge" | "outro";

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

/** Density step based on difficulty */
function step(bps: number, diff: Difficulty, baseBeats: number): number {
  const mul: Record<Difficulty, number> = { easy: 2.5, normal: 1.5, hard: 1.0 };
  return baseBeats * mul[diff] * bps;
}

/** Whether to add chords at this beat */
function doChord(diff: Difficulty, beatInterval: number): boolean {
  const odds: Record<Difficulty, number> = { easy: 0, normal: 0.25, hard: 0.5 };
  return Math.random() < odds[diff] && beatInterval >= 4;
}

/** Whether to add a hold at this beat */
function doHold(diff: Difficulty): boolean {
  return diff !== "easy" && Math.random() < 0.3;
}

function generateIntro(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 4 : diff === "normal" ? 3 : 2;
  for (let b = beatStart; b < beatEnd; b += spacing) {
    const lane = (prev + 1 + Math.floor(Math.random() * (lanes - 1))) % lanes;
    notes.push({ time: b * bps, lane });
    prev = lane;
  }
}

function generateVerse(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 2 : diff === "normal" ? 1 : 1;
  for (let b = beatStart; b < beatEnd; b += spacing) {
    const lane = pickLane(lanes, prev, lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    // occasional chord
    if (diff !== "easy" && b % 8 === 0 && lanes >= 3) {
      const cl = pickLane(lanes, lane, lanes);
      if (cl !== lane) notes.push({ time: b * bps, lane: cl });
    }
  }
}

function generatePrechorus(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 2 : 1;
  for (let b = beatStart; b < beatEnd; b += spacing) {
    const lane = pickLane(lanes, prev, lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    if (diff !== "easy" && b % 4 === 0 && lanes >= 3) {
      const cl = pickLane(lanes, lane, lanes);
      if (cl !== lane) notes.push({ time: b * bps, lane: cl });
    }
  }
  // Hold at end of prechorus (normal+ only)
  if (diff !== "easy") {
    const last = notes[notes.length - 1];
    if (last) last.hold = bps * 2;
  }
}

function generateChorus(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 1 : diff === "normal" ? 0.75 : 0.5;
  const chordEvery = diff === "easy" ? 999 : diff === "normal" ? 4 : 2;
  for (let b = beatStart; b < beatEnd; b += spacing) {
    const lane = pickLane(lanes, prev, lanes >= 4 ? 4 : lanes);
    notes.push({ time: b * bps, lane });
    prev = lane;
    // chords
    if (Math.abs(b % chordEvery) < 0.01 && lanes >= 3) {
      const count = diff === "hard" ? 2 : 1;
      for (let c = 0; c < count; c++) {
        const cl = pickLane(lanes, lane, lanes);
        if (cl !== lane) notes.push({ time: b * bps, lane: cl });
      }
    }
    // hold (normal+ only)
    if (diff !== "easy" && Math.abs(b % 8) < 0.01 && b > beatStart + 4) {
      const last = notes[notes.length - 1];
      if (last && !last.hold) last.hold = bps * 2;
    }
  }
}

function generateBridge(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 3 : 1;
  for (let b = beatStart; b < beatEnd; b += spacing) {
    if (diff !== "easy" && b % 4 === 0) {
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

function generateOutro(notes: Note[], beatStart: number, beatEnd: number, bps: number, lanes: number, diff: Difficulty) {
  let prev = 0;
  const spacing = diff === "easy" ? 4 : 2;
  for (let b = beatStart; b < beatEnd - 4; b += spacing) {
    const lane = (prev + 1) % lanes;
    notes.push({ time: b * bps, lane });
    prev = lane;
  }
  // Long final hold
  notes.push({ time: (beatEnd - 4) * bps, lane: 0, hold: bps * 4 });
}

type GenFn = (notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) => void;
const GENERATORS: Record<SectionType, GenFn> = {
  intro: generateIntro, verse: generateVerse, prechorus: generatePrechorus,
  chorus: generateChorus, bridge: generateBridge, outro: generateOutro,
};

export function generateChart(params: ChartParams): Chart {
  const bps = 60 / params.bpm;
  const laneCount = params.difficulty === "easy" ? 3 : params.difficulty === "normal" ? 4 : 5;
  const notes: Note[] = [];

  for (const section of params.sections) {
    const gen = GENERATORS[section.type];
    gen(notes, section.startBeat, section.endBeat, bps, laneCount, params.difficulty);
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
