// Chart pattern generator — musical lane-role aware
// Left lanes (0=green, 1=red) = main melody/rhythm (heavy beat)
// Right lanes (2=yellow, 3=blue, 4=violet) = solo/fills (accents)
import type { Note, Chart, Difficulty } from "../types";

interface Section { startBeat: number; endBeat: number; type: SectionType; }
type SectionType = "intro" | "verse" | "prechorus" | "chorus" | "bridge" | "outro";
interface ChartParams { songId: string; difficulty: Difficulty; bpm: number; sections: Section[]; }

// ─── helpers ───

function mainLanes(lanes: number): number[] {
  if (lanes <= 3) return [0, 1];       // easy: green & red
  return [0, 1];                        // normal/hard: green & red
}
function soloLanes(lanes: number): number[] {
  if (lanes <= 3) return [2];           // easy: only yellow for fills
  if (lanes === 4) return [2, 3];       // normal: yellow & blue
  return [2, 3, 4];                      // hard: all 3 right lanes
}
function pick(arr: number[]): number { return arr[Math.floor(Math.random() * arr.length)]; }

/** Alternating left-lane pattern: bounces between the two main lanes */
function altMain(i: number, lanes: number): number {
  const m = mainLanes(lanes);
  return m[i % m.length];
}

// ─── section generators ───

function addIntro(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 4 : diff === "normal" ? 3 : 2;
  let idx = 0;
  for (let b = bs; b < be; b += spacing) {
    notes.push({ time: b * bps, lane: altMain(idx, lanes) });
    idx++;
    // Sparse right-lane accent every 16 beats
    if (b - bs >= 16 && (b - bs) % 16 === 0 && soloLanes(lanes).length > 0) {
      notes.push({ time: b * bps, lane: pick(soloLanes(lanes)) });
    }
  }
}

function addVerse(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 2 : 1;
  let idx = 0;
  for (let b = bs; b < be; b += spacing) {
    // Main beat: left lanes, regular pattern
    notes.push({ time: b * bps, lane: altMain(idx, lanes) });
    idx++;
    // Solo accents: right lanes on backbeats (every 2 beats for normal+, every 4 for easy)
    const soloInterval = diff === "easy" ? 4 : 2;
    if (b > bs && Math.abs(b % soloInterval) < 0.01 && soloLanes(lanes).length > 0) {
      notes.push({ time: b * bps, lane: pick(soloLanes(lanes)) });
    }
  }
}

function addPrechorus(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 2 : 1;
  let idx = 0;
  for (let b = bs; b < be; b += spacing) {
    notes.push({ time: b * bps, lane: altMain(idx, lanes) });
    idx++;
    // More solo fills building up
    if (diff !== "easy" && b % 2 === 0 && soloLanes(lanes).length > 0) {
      notes.push({ time: b * bps, lane: pick(soloLanes(lanes)) });
    }
  }
  // End-of-section hold on left lane
  if (diff !== "easy") {
    const last = notes[notes.length - 1];
    if (last) last.hold = bps * 2;
  }
}

function addChorus(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 1 : diff === "normal" ? 0.75 : 0.5;
  let idx = 0;
  for (let b = bs; b < be; b += spacing) {
    // Main beat on left lanes
    notes.push({ time: b * bps, lane: altMain(idx, lanes) });
    idx++;
    // Solo fills on right lanes — dense and syncopated
    const soloOn = diff === "easy" ? 4 : diff === "normal" ? 2 : 1;
    if (Math.abs(b % soloOn) < 0.01 && soloLanes(lanes).length > 0) {
      const count = diff === "hard" ? 2 : 1;
      for (let c = 0; c < count; c++) {
        notes.push({ time: b * bps, lane: pick(soloLanes(lanes)) });
      }
    }
    // Hold on left lane every 8 beats
    if (diff !== "easy" && Math.abs(b % 8) < 0.01 && b > bs + 4) {
      const last = notes[notes.length - 1];
      if (last && !last.hold) last.hold = bps * 2;
    }
  }
}

function addBridge(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 3 : 1;
  let idx = 0;
  for (let b = bs; b < be; b += spacing) {
    if (diff !== "easy" && b % 4 === 0) {
      // Hold on main lane
      notes.push({ time: b * bps, lane: altMain(idx, lanes), hold: bps * 1.5 });
      idx++;
    } else {
      notes.push({ time: b * bps, lane: altMain(idx, lanes) });
      idx++;
    }
    // Solo fills more present in bridge
    if (diff !== "easy" && b % 2 === 0 && soloLanes(lanes).length > 0) {
      notes.push({ time: b * bps, lane: pick(soloLanes(lanes)) });
    }
  }
}

function addOutro(notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) {
  const spacing = diff === "easy" ? 4 : 2;
  let idx = 0;
  for (let b = bs; b < be - 4; b += spacing) {
    notes.push({ time: b * bps, lane: altMain(idx, lanes) });
    idx++;
  }
  // Final long hold on green
  notes.push({ time: (be - 4) * bps, lane: 0, hold: bps * 4 });
}

type GenFn = (notes: Note[], bs: number, be: number, bps: number, lanes: number, diff: Difficulty) => void;
const GENERATORS: Record<SectionType, GenFn> = {
  intro: addIntro, verse: addVerse, prechorus: addPrechorus,
  chorus: addChorus, bridge: addBridge, outro: addOutro,
};

export function generateChart(params: ChartParams): Chart {
  const bps = 60 / params.bpm;
  const laneCount = params.difficulty === "easy" ? 3 : params.difficulty === "normal" ? 4 : 5;
  const notes: Note[] = [];

  for (const section of params.sections) {
    const gen = GENERATORS[section.type];
    gen(notes, section.startBeat, section.endBeat, bps, laneCount, params.difficulty);
  }

  // Dedupe + sort
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
