// src/game/score.ts
import type { Judgment, GameResult, Difficulty } from "../types";

const BASE_SCORE = 100;
const JUDGMENT_MULTIPLIER: Record<Judgment, number> = {
  perfect: 1.0,
  good: 0.7,
  miss: 0,
};

const COMBO_TABLE = [
  { threshold: 50, multiplier: 4 },
  { threshold: 30, multiplier: 3 },
  { threshold: 10, multiplier: 2 },
  { threshold: 0,  multiplier: 1 },
];

let score = 0;
let combo = 0;
let maxCombo = 0;
let perfects = 0;
let goods = 0;
let misses = 0;

export function resetScore() {
  score = 0;
  combo = 0;
  maxCombo = 0;
  perfects = 0;
  goods = 0;
  misses = 0;
}

export function addJudgment(j: Judgment) {
  switch (j) {
    case "perfect":
      perfects++;
      combo++;
      break;
    case "good":
      goods++;
      combo++;
      break;
    case "miss":
      misses++;
      combo = 0;
      return; // No points for miss
  }

  if (combo > maxCombo) maxCombo = combo;

  const comboMult = getComboMultiplier(combo);
  const judgeMult = JUDGMENT_MULTIPLIER[j];
  const puMult = getPowerUpMultiplier();
  score += BASE_SCORE * judgeMult * comboMult * puMult;
}

function getComboMultiplier(combo: number): number {
  for (const entry of COMBO_TABLE) {
    if (combo >= entry.threshold) return entry.multiplier;
  }
  return 1;
}

export function addPenalty() {
  score = Math.max(0, score - 100);
}

// ─── Power-up multiplier ───
let powerUpEndTime = 0;
const POWER_UP_MULTIPLIER = 5;
const POWER_UP_DURATION = 8; // seconds

export function activatePowerUp() {
  powerUpEndTime = performance.now() / 1000 + POWER_UP_DURATION;
}

export function getPowerUpMultiplier(): number {
  return performance.now() / 1000 < powerUpEndTime ? POWER_UP_MULTIPLIER : 1;
}

export function getPowerUpRemaining(): number {
  return Math.max(0, powerUpEndTime - performance.now() / 1000);
}

export function getScore(): number {
  return score;
}

export function getCombo(): number {
  return combo;
}

export function getAccuracy(): number {
  const total = perfects + goods + misses;
  if (total === 0) return 0;
  return (perfects + goods * 0.5) / total;
}

export function getStats() {
  return { score, combo, perfects, goods, misses, maxCombo };
}

export function getGrade(): GameResult["grade"] {
  const acc = getAccuracy();
  if (acc >= 0.95) return "S";
  if (acc >= 0.85) return "A";
  if (acc >= 0.70) return "B";
  if (acc >= 0.55) return "C";
  return "D";
}

export function buildResult(songId: string, difficulty: Difficulty): GameResult {
  return {
    songId,
    difficulty,
    score,
    maxCombo,
    perfects,
    goods,
    misses,
    accuracy: getAccuracy(),
    grade: getGrade(),
  };
}
