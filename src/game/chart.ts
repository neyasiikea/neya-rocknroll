// src/game/chart.ts
import type { Chart, Difficulty, TimingWindow } from "../types";

/** 各难度的判定窗口 */
const TIMING_WINDOWS: Record<Difficulty, TimingWindow> = {
  easy:   { perfect: 60,  good: 120 },
  normal: { perfect: 50,  good: 100 },
  hard:   { perfect: 43,  good: 77 },
};

export interface RuntimeNote {
  time: number;
  lane: number;
  holdDuration: number;       // 0 = normal note
  holdEndTime: number;        // time + holdDuration
  hit: boolean;               // has been judged
  missed: boolean;
}

let currentChart: Chart | null = null;
let runtimeNotes: RuntimeNote[] = [];
let nextNoteIndex = 0;

export function loadChart(chart: Chart) {
  currentChart = chart;
  runtimeNotes = chart.notes.map(n => ({
    time: n.time,
    lane: n.lane,
    holdDuration: n.hold ?? 0,
    holdEndTime: n.time + (n.hold ?? 0),
    hit: false,
    missed: false,
  }));
  nextNoteIndex = 0;
}

export function getTimingWindow(): TimingWindow {
  if (!currentChart) return TIMING_WINDOWS.easy;
  return TIMING_WINDOWS[currentChart.difficulty];
}

/** 获取接下来在屏幕可见范围内的音符 */
export function getVisibleNotes(lookAhead: number): RuntimeNote[] {
  return runtimeNotes.filter(n => n.time <= lookAhead && !n.hit && !n.missed);
}

/** 获取判定线附近可判定的音符 */
export function getJudgableNotes(currentTime: number, windowMs: number): RuntimeNote[] {
  const windowSec = windowMs / 1000;
  return runtimeNotes.filter(n =>
    !n.hit && !n.missed &&
    Math.abs(n.time - currentTime) <= windowSec
  );
}

/** 标记音符为已判定 */
export function markNoteJudged(index: number) {
  if (runtimeNotes[index]) {
    runtimeNotes[index].hit = true;
  }
}

export function markNoteMissed(index: number) {
  if (runtimeNotes[index]) {
    runtimeNotes[index].missed = true;
  }
}

/** 标记已过判定窗口仍未击中的音符为 miss */
export function autoMissPastNotes(currentTime: number, windowMs: number) {
  const windowSec = windowMs / 1000;
  let missedCount = 0;
  for (const note of runtimeNotes) {
    if (!note.hit && !note.missed && currentTime - note.time > windowSec) {
      note.missed = true;
      missedCount++;
    }
  }
  return missedCount;
}

export function getTotalNotes(): number {
  return runtimeNotes.length;
}

export function getHitCount(): number {
  return runtimeNotes.filter(n => n.hit).length;
}

export function getMissCount(): number {
  return runtimeNotes.filter(n => n.missed).length;
}

export function getCurrentChart() {
  return currentChart;
}

export function resetChart() {
  currentChart = null;
  runtimeNotes = [];
  nextNoteIndex = 0;
}
