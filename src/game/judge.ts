// src/game/judge.ts
import type { Judgment, TimingWindow } from "../types";

export interface JudgeResult {
  judgment: Judgment;
  timingMs: number;
}

export function judgeHit(
  noteTime: number,
  pressTime: number,
  window: TimingWindow
): JudgeResult | null {
  const diffMs = (pressTime - noteTime) * 1000;
  const absDiff = Math.abs(diffMs);

  if (absDiff <= window.perfect) {
    return { judgment: "perfect", timingMs: diffMs };
  }
  if (absDiff <= window.good) {
    return { judgment: "good", timingMs: diffMs };
  }
  return null;
}
