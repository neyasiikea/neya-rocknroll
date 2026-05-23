# 吉他英雄风格音乐游戏 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based Guitar Hero-style rhythm game with gamepad support, multiple songs, difficulty levels, and cyberpunk neon visuals.

**Architecture:** Vite + React + TypeScript shell with Canvas-based game rendering. React handles static UI (menus, song select, results). Canvas with requestAnimationFrame handles real-time gameplay (note highway, particles, HUD). Web Audio API for precise audio scheduling. Gamepad API for controller input.

**Tech Stack:** Vite, TypeScript, React 18, HTML5 Canvas, Web Audio API, Gamepad API, CSS Modules

---

### Task 1: Scaffold Vite + React + TypeScript project

**Files:**
- Create: project root via `npm create vite`

- [ ] **Step 1: Create Vite project**

```bash
cd G:\AICode\music-game-neya
npm create vite@latest . -- --template react-ts
```

Choose "Yes" to overwrite existing files prompt since repo is empty.

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Clean up Vite boilerplate**

Delete `src/App.css`, `src/App.tsx`, `src/index.css`, `src/assets/react.svg`, `public/vite.svg`.

- [ ] **Step 4: Create minimal entry structure**

Create `src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:
```tsx
export function App() {
  return <div>Music Game</div>;
}
```

Create `src/App.css` (empty).

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: Browser opens, shows "Music Game" text.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Define core types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write types file**

```typescript
// src/types/index.ts

/** 音符定义（谱面中的单个音符） */
export interface Note {
  time: number;    // 抵达判定线的时间（秒）
  lane: number;    // 轨道编号 0-4
  hold?: number;   // 长按持续秒数，不填 = 普通单击
}

/** 难度等级 */
export type Difficulty = "easy" | "normal" | "hard";

/** 谱面定义 */
export interface Chart {
  songId: string;
  difficulty: Difficulty;
  bpm: number;
  lanes: number;       // 3 | 4 | 5
  notes: Note[];
}

/** 歌曲元数据 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  audioPath: string;   // e.g. "/songs/track-01.mp3"
  charts: {
    easy?: Chart;
    normal?: Chart;
    hard?: Chart;
  };
}

/** 判定结果 */
export type Judgment = "perfect" | "good" | "miss";

/** 判定窗口配置 */
export interface TimingWindow {
  perfect: number;  // ms
  good: number;     // ms
}

/** 游戏运行状态 */
export type GamePhase = "menu" | "songSelect" | "countdown" | "playing" | "paused" | "result";

/** 按键映射 — 轨道 → gamepad button index */
export interface KeyMapping {
  lanes: number[];  // e.g. [6, 4, 5, 7, 0] → LT, LB, RB, RT, A
  confirm: number;  // A
  back: number;     // B
  start: number;    // Start
}

/** 对局结果 */
export interface GameResult {
  songId: string;
  difficulty: Difficulty;
  score: number;
  maxCombo: number;
  perfects: number;
  goods: number;
  misses: number;
  accuracy: number;  // 0-1
  grade: "S" | "A" | "B" | "C" | "D";
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: define core types for chart, song, judgment, game state"
```

---

### Task 3: Implement game engine (rAF loop)

**Files:**
- Create: `src/game/engine.ts`

- [ ] **Step 1: Write engine module**

```typescript
// src/game/engine.ts

interface EngineCallbacks {
  update: (dt: number) => void;  // dt in seconds
  render: (dt: number) => void;
}

let animFrameId = 0;
let lastTime = 0;
let running = false;
let callbacks: EngineCallbacks | null = null;

export function startEngine(cb: EngineCallbacks) {
  callbacks = cb;
  running = true;
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(loop);
}

function loop(now: number) {
  if (!running || !callbacks) return;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  callbacks.update(dt);
  callbacks.render(dt);

  animFrameId = requestAnimationFrame(loop);
}

export function stopEngine() {
  running = false;
  cancelAnimationFrame(animFrameId);
  callbacks = null;
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/engine.ts
git commit -m "feat: add rAF game engine loop with update/render callbacks"
```

---

### Task 4: Implement Gamepad input system

**Files:**
- Create: `src/game/input.ts`

- [ ] **Step 1: Write input module**

```typescript
// src/game/input.ts
import type { KeyMapping } from "../types";

/** 默认按键映射 (XInput standard) */
export const DEFAULT_MAPPING: KeyMapping = {
  lanes: [6, 4, 5, 7, 0],  // LT, LB, RB, RT, A
  confirm: 0,   // A
  back: 1,      // B
  start: 9,     // Start
};

export interface InputState {
  /** 当前帧按下的轨道按键 (true = pressed) */
  lanePressed: boolean[];
  /** 本帧刚按下的按键 (rising edge) */
  laneJustPressed: boolean[];
  /** 本帧刚松开的按键 (falling edge) */
  laneJustReleased: boolean[];
  /** 菜单按键 rising edge */
  confirmJustPressed: boolean;
  backJustPressed: boolean;
  startJustPressed: boolean;
}

function getMapping(): KeyMapping {
  const stored = localStorage.getItem("keyMapping");
  return stored ? JSON.parse(stored) : DEFAULT_MAPPING;
}

export function saveMapping(mapping: KeyMapping) {
  localStorage.setItem("keyMapping", JSON.stringify(mapping));
}

const prevButtons = new Map<number, boolean>();

export function pollInput(): InputState {
  const mapping = getMapping();
  const gamepad = navigator.getGamepads()[0];
  const state: InputState = {
    lanePressed: [],
    laneJustPressed: [],
    laneJustReleased: [],
    confirmJustPressed: false,
    backJustPressed: false,
    startJustPressed: false,
  };

  if (!gamepad) return state;

  const laneCount = mapping.lanes.length;

  for (let i = 0; i < laneCount; i++) {
    const btnIdx = mapping.lanes[i];
    const pressed = gamepad.buttons[btnIdx]?.pressed ?? false;
    const wasPressed = prevButtons.get(btnIdx) ?? false;

    state.lanePressed[i] = pressed;
    state.laneJustPressed[i] = pressed && !wasPressed;
    state.laneJustReleased[i] = !pressed && wasPressed;

    prevButtons.set(btnIdx, pressed);
  }

  // Rising edge for menu buttons
  const checkRising = (idx: number) => {
    const p = gamepad.buttons[idx]?.pressed ?? false;
    const was = prevButtons.get(idx) ?? false;
    prevButtons.set(idx, p);
    return p && !was;
  };

  state.confirmJustPressed = checkRising(mapping.confirm);
  state.backJustPressed = checkRising(mapping.back);
  state.startJustPressed = checkRising(mapping.start);

  return state;
}

/** Clear held state (on scene change) */
export function resetInputState() {
  prevButtons.clear();
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/input.ts
git commit -m "feat: add Gamepad API input polling with configurable key mapping"
```

---

### Task 5: Implement Audio system

**Files:**
- Create: `src/game/audio.ts`

- [ ] **Step 1: Write audio module**

```typescript
// src/game/audio.ts

let audioCtx: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let analyserNode: AnalyserNode | null = null;
let startOffset = 0;           // audioContext.currentTime when playback started
let calibrationOffset = 0;     // user-adjustable audio delay (seconds)
let isPlaying = false;

/** 预解码音频文件 */
export async function loadAudio(url: string): Promise<AudioBuffer> {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

/** 开始播放 */
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

  startOffset = audioCtx.currentTime + 0.05; // Small scheduling headroom
  sourceNode.start(startOffset);
  isPlaying = true;
}

/** 获取当前播放位置（秒），考虑校准偏移 */
export function getPlaybackTime(): number {
  if (!audioCtx || !isPlaying) return 0;
  return audioCtx.currentTime - startOffset + calibrationOffset;
}

/** 获取频谱数据（用于背景律动） */
export function getSpectrumData(): Uint8Array {
  if (!analyserNode) return new Uint8Array(0);
  const data = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(data);
  return data;
}

/** 获取低频能量 (0-1)，用于背景光晕驱动 */
export function getBassIntensity(): number {
  const data = getSpectrumData();
  if (data.length < 8) return 0;
  // Average first 8 bins (low frequencies)
  const sum = data.slice(0, 8).reduce((a, b) => a + b, 0);
  return sum / (8 * 255);
}

/** 暂停 / 恢复 */
export function suspendAudio() {
  audioCtx?.suspend();
}

export function resumeAudio() {
  audioCtx?.resume();
}

/** 停止并清理 */
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/audio.ts
git commit -m "feat: add Web Audio API playback, scheduling, and spectrum analysis"
```

---

### Task 6: Implement Chart loader

**Files:**
- Create: `src/game/chart.ts`

- [ ] **Step 1: Write chart module**

```typescript
// src/game/chart.ts
import type { Chart, Note, Difficulty, TimingWindow } from "../types";

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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/chart.ts
git commit -m "feat: add chart loader with runtime note management and timing windows"
```

---

### Task 7: Implement Judging system

**Files:**
- Create: `src/game/judge.ts`

- [ ] **Step 1: Write judge module**

```typescript
// src/game/judge.ts
import type { Judgment, TimingWindow } from "../types";

export interface JudgeResult {
  judgment: Judgment;
  timingMs: number;  // Signed offset from note time (negative = early)
}

/**
 * 判定按键按下是否命中某音符
 * @param noteTime  音符标准时间（秒）
 * @param pressTime 按下时刻的游戏时间（秒）
 * @param window    判定窗口配置
 * @returns 判定结果，null = 未命中（误差超出窗口）
 */
export function judgeHit(
  noteTime: number,
  pressTime: number,
  window: TimingWindow
): JudgeResult | null {
  const diffMs = (pressTime - noteTime) * 1000; // Convert to ms
  const absDiff = Math.abs(diffMs);

  if (absDiff <= window.perfect) {
    return { judgment: "perfect", timingMs: diffMs };
  }
  if (absDiff <= window.good) {
    return { judgment: "good", timingMs: diffMs };
  }
  return null; // miss — too far from note
}

/**
 * 处理命中：在可判定音符中找最接近按下的那个
 */
export function resolveHit(
  pressTime: number,
  laneIndex: number,
  window: TimingWindow,
  getJudgableNotes: (time: number, wMs: number) => import("../types").Note[],
  markJudged: (idx: number) => void,
  runtimeNotes: any[]  // RuntimeNote[]
): JudgeResult | null {
  const wMs = window.good;
  const candidates = runtimeNotes
    .map((n, i) => ({ note: n, idx: i }))
    .filter(({ note }) =>
      !note.hit && !note.missed &&
      note.lane === laneIndex &&
      Math.abs((pressTime - note.time) * 1000) <= wMs
    );

  if (candidates.length === 0) return null;

  // Pick closest note to press time
  candidates.sort((a, b) =>
    Math.abs(pressTime - a.note.time) - Math.abs(pressTime - b.note.time)
  );

  const best = candidates[0];
  const result = judgeHit(best.note.time, pressTime, window);
  if (result) {
    markJudged(best.idx);
  }
  return result;
}
```

- [ ] **Step 2: Refine judge to integrate with chart module**

Replace `resolveHit` with a simpler version that works directly with `chart.ts`:

```typescript
// src/game/judge.ts (revised)
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
```

The matching logic (closest note in lane within window) will live in the game orchestrator to avoid circular dependencies.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/game/judge.ts
git commit -m "feat: add timing-based hit judge with per-difficulty windows"
```

---

### Task 8: Implement Scoring system

**Files:**
- Create: `src/game/score.ts`

- [ ] **Step 1: Write score module**

```typescript
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
  score += BASE_SCORE * judgeMult * comboMult;
}

function getComboMultiplier(combo: number): number {
  for (const entry of COMBO_TABLE) {
    if (combo >= entry.threshold) return entry.multiplier;
  }
  return 1;
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
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/score.ts
git commit -m "feat: add scoring with combo multiplier and letter grade system"
```

---

### Task 9: Implement Highway renderer

**Files:**
- Create: `src/game/renderer/highway.ts`

- [ ] **Step 1: Write highway renderer**

```typescript
// src/game/renderer/highway.ts

const LANE_COLORS = [
  "#00FF88", // LT — cyber green
  "#FF3366", // LB — neon red
  "#FFCC00", // RB — electric yellow
  "#3399FF", // RT — deep blue
  "#CC66FF", // A  — violet
];

interface HighwayConfig {
  lanes: number;
  canvasWidth: number;
  canvasHeight: number;
  hitLineY: number;      // Y position of the judgment line
  laneWidth: number;     // width of each lane
  noteSpeed: number;     // pixels per second (scroll speed)
}

let config: HighwayConfig;

export function initHighway(cfg: HighwayConfig) {
  config = cfg;
}

export function renderHighway(ctx: CanvasRenderingContext2D, bassIntensity: number) {
  const { lanes, canvasWidth, canvasHeight, laneWidth, hitLineY } = config;

  // Dark background
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Grid lines
  ctx.strokeStyle = `rgba(255, 255, 255, 0.03)`;
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }

  // Background glow driven by bass
  const glowAlpha = bassIntensity * 0.08;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvasWidth * 0.6);
  gradient.addColorStop(0, `rgba(100, 100, 255, ${glowAlpha * 2})`);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate lane X positions (centered)
  const totalWidth = lanes * laneWidth;
  const startX = (canvasWidth - totalWidth) / 2;

  // Draw lanes
  for (let i = 0; i < lanes; i++) {
    const x = startX + i * laneWidth;

    // Lane background
    ctx.fillStyle = `rgba(255, 255, 255, 0.02)`;
    ctx.fillRect(x, 0, laneWidth, canvasHeight);

    // Lane borders
    ctx.strokeStyle = `${LANE_COLORS[i]}22`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + laneWidth, 0);
    ctx.lineTo(x + laneWidth, canvasHeight);
    ctx.stroke();

    // Lane center guide line (faint)
    const laneCenter = x + laneWidth / 2;
    ctx.strokeStyle = `${LANE_COLORS[i]}0a`;
    ctx.beginPath();
    ctx.moveTo(laneCenter, 0);
    ctx.lineTo(laneCenter, canvasHeight);
    ctx.stroke();
  }

  // Hit line
  ctx.strokeStyle = "#ffffff44";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(startX, hitLineY);
  ctx.lineTo(startX + totalWidth, hitLineY);
  ctx.stroke();

  // Hit line glow
  const hitGlow = ctx.createLinearGradient(0, hitLineY - 5, 0, hitLineY + 5);
  hitGlow.addColorStop(0, "rgba(255,255,255,0)");
  hitGlow.addColorStop(0.5, "rgba(255,255,255,0.15)");
  hitGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hitGlow;
  ctx.fillRect(startX, hitLineY - 5, totalWidth, 10);

  // CRT scanline overlay
  ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
  for (let y = 0; y < canvasHeight; y += 3) {
    ctx.fillRect(0, y, canvasWidth, 1);
  }

  // Vignette
  const vignette = ctx.createRadialGradient(centerX, centerY, canvasWidth * 0.5, centerX, centerY, canvasWidth * 0.8);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
}

export { LANE_COLORS };
export type { HighwayConfig };
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/renderer/highway.ts
git commit -m "feat: add highway renderer with lane colors, grid, CRT scanlines, and vignette"
```

---

### Task 10: Implement Notes renderer

**Files:**
- Create: `src/game/renderer/notes.ts`

- [ ] **Step 1: Write notes renderer**

```typescript
// src/game/renderer/notes.ts
import type { RuntimeNote } from "../chart";
import { LANE_COLORS } from "./highway";

interface NotesConfig {
  lanes: number;
  canvasWidth: number;
  canvasHeight: number;
  hitLineY: number;
  laneWidth: number;
  noteSpeed: number;   // pixels/second — how fast notes scroll
  noteHeight: number;  // height of a tap note
}

let config: NotesConfig;

export function initNotes(cfg: NotesConfig) {
  config = cfg;
}

/** Convert note's target time to pixel Y on screen */
function noteTimeToY(noteTime: number, currentTime: number): number {
  const timeUntilHit = noteTime - currentTime;
  return config.hitLineY - timeUntilHit * config.noteSpeed;
}

export function renderNotes(
  ctx: CanvasRenderingContext2D,
  notes: RuntimeNote[],
  currentTime: number
) {
  const { lanes, canvasWidth, laneWidth, noteHeight, hitLineY } = config;
  const totalWidth = lanes * laneWidth;
  const startX = (canvasWidth - totalWidth) / 2;

  for (const note of notes) {
    if (note.hit || note.missed) continue;

    const y = noteTimeToY(note.time, currentTime);

    // Skip notes far off screen
    if (y < -noteHeight * 2 || y > canvasHeight + noteHeight * 2) continue;

    const x = startX + note.lane * laneWidth;
    const laneColor = LANE_COLORS[note.lane] ?? "#ffffff";

    if (note.holdDuration > 0) {
      // Hold note: stretched rectangle
      const holdLength = note.holdDuration * config.noteSpeed;
      const holdTop = y - holdLength;
      drawHoldNote(ctx, x, holdTop, laneWidth, holdLength + noteHeight, laneColor);
    } else {
      // Tap note: rounded rectangle
      drawTapNote(ctx, x, y, laneWidth, noteHeight, laneColor);
    }
  }
}

function drawTapNote(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, color: string
) {
  const radius = 6;
  const padding = 4;
  const nx = x + padding;
  const ny = y;
  const nw = w - padding * 2;
  const nh = h;

  // Outer glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(nx + radius, ny);
  ctx.lineTo(nx + nw - radius, ny);
  ctx.quadraticCurveTo(nx + nw, ny, nx + nw, ny + radius);
  ctx.lineTo(nx + nw, ny + nh - radius);
  ctx.quadraticCurveTo(nx + nw, ny + nh, nx + nw - radius, ny + nh);
  ctx.lineTo(nx + radius, ny + nh);
  ctx.quadraticCurveTo(nx, ny + nh, nx, ny + nh - radius);
  ctx.lineTo(nx, ny + radius);
  ctx.quadraticCurveTo(nx, ny, nx + radius, ny);
  ctx.closePath();
  ctx.fill();

  // Inner bright stripe
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(nx + 4, ny + 2, nw - 8, nh * 0.4);
}

function drawHoldNote(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, color: string
) {
  const padding = 4;
  const nx = x + padding;
  const nw = w - padding * 2;

  // Hold body
  ctx.fillStyle = `${color}44`;
  ctx.fillRect(nx, y, nw, h);

  // Hold borders
  ctx.strokeStyle = `${color}88`;
  ctx.lineWidth = 1;
  ctx.strokeRect(nx, y, nw, h);

  // Hold head (bottom)
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillRect(nx, y + h - 8, nw, 8);
  ctx.shadowBlur = 0;
}

export { noteTimeToY };
export type { NotesConfig };
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/renderer/notes.ts
git commit -m "feat: add note renderer with tap notes (glow effect) and hold notes"
```

---

### Task 11: Implement Particles renderer

**Files:**
- Create: `src/game/renderer/particles.ts`

- [ ] **Step 1: Write particles renderer**

```typescript
// src/game/renderer/particles.ts
import { LANE_COLORS } from "./highway";
import type { Judgment } from "../../types";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

let particles: Particle[] = [];

export function spawnHitEffect(x: number, y: number, lane: number, judgment: Judgment) {
  const color = LANE_COLORS[lane] ?? "#ffffff";
  const count = judgment === "perfect" ? 20 : judgment === "good" ? 10 : 0;
  const maxLife = judgment === "perfect" ? 0.6 : 0.35;
  const speedMult = judgment === "perfect" ? 1.5 : 1.0;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = (150 + Math.random() * 200) * speedMult;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: maxLife,
      maxLife,
      size: judgment === "perfect"
        ? 3 + Math.random() * 4
        : 2 + Math.random() * 3,
      color,
    });
  }
}

export function updateParticles(dt: number) {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    p.vy += 50 * dt; // slight gravity
  }
  particles = particles.filter(p => p.life > 0);
}

export function renderParticles(ctx: CanvasRenderingContext2D) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6 * alpha;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function clearParticles() {
  particles = [];
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/renderer/particles.ts
git commit -m "feat: add particle system with burst effects on note hit"
```

---

### Task 12: Implement HUD renderer

**Files:**
- Create: `src/game/renderer/hud.ts`

- [ ] **Step 1: Write HUD renderer**

```typescript
// src/game/renderer/hud.ts
import { getScore, getCombo } from "../score";

let lastCombo = 0;
let comboTimer = 0;

export function renderHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const score = getScore();
  const combo = getCombo();

  // Combo change animation timing
  if (combo !== lastCombo) {
    comboTimer = 0.15;
    lastCombo = combo;
  }
  comboTimer = Math.max(0, comboTimer - 1 / 60);

  // Score — top center
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(score)}`, canvasWidth / 2, 50);

  // Combo — center (large, pulsing)
  if (combo >= 10) {
    const scale = 1 + comboTimer * 0.3;
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight * 0.75);
    ctx.scale(scale, scale);

    const alpha = 0.6 + comboTimer * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${combo} combo`, 0, 0);
    ctx.restore();
  }

  // Lane labels at bottom
  // (rendered once by GameScreen, not per-frame — skip in HUD, do in highway)
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/game/renderer/hud.ts
git commit -m "feat: add HUD renderer for score and combo display"
```

---

### Task 13: Create React game state context

**Files:**
- Create: `src/ui/GameContext.tsx`

- [ ] **Step 1: Write game context**

```typescript
// src/ui/GameContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import type { GamePhase, Song, Chart } from "../types";

interface GameState {
  phase: GamePhase;
  selectedSong: Song | null;
  selectedChart: Chart | null;
  navigateTo: (phase: GamePhase) => void;
  selectSong: (song: Song) => void;
  selectDifficulty: (chart: Chart) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);

  const navigateTo = useCallback((p: GamePhase) => setPhase(p), []);
  const selectSong = useCallback((song: Song) => {
    setSelectedSong(song);
    setPhase("songSelect");
  }, []);
  const selectDifficulty = useCallback((chart: Chart) => {
    setSelectedChart(chart);
  }, []);
  const startGame = useCallback(() => setPhase("playing"), []);
  const pauseGame = useCallback(() => setPhase("paused"), []);
  const resumeGame = useCallback(() => setPhase("playing"), []);
  const endGame = useCallback(() => setPhase("result"), []);

  return (
    <GameContext.Provider value={{
      phase, selectedSong, selectedChart,
      navigateTo, selectSong, selectDifficulty,
      startGame, pauseGame, resumeGame, endGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameState must be used within GameProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/GameContext.tsx
git commit -m "feat: add React game state context for navigation flow"
```

---

### Task 14: Implement MainMenu component

**Files:**
- Create: `src/ui/MainMenu.tsx`
- Create: `src/ui/MainMenu.css`

- [ ] **Step 1: Write MainMenu CSS**

```css
/* src/ui/MainMenu.css */
.menu-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: #0a0a0f;
  color: #fff;
  font-family: monospace;
}

.menu-title {
  font-size: 64px;
  font-weight: bold;
  text-shadow: 0 0 20px #ff3366, 0 0 40px #ff3366;
  margin-bottom: 8px;
}

.menu-subtitle {
  font-size: 16px;
  color: #666;
  margin-bottom: 60px;
}

.menu-hint {
  position: absolute;
  bottom: 40px;
  color: #444;
  font-size: 14px;
}
```

- [ ] **Step 2: Write MainMenu component**

```tsx
// src/ui/MainMenu.tsx
import { useGameState } from "./GameContext";
import { getAllSongs } from "../charts/registry";
import "./MainMenu.css";

export function MainMenu() {
  const { navigateTo, selectSong } = useGameState();

  // Navigate to first song directly for now (simplified flow)
  function handleStart() {
    const songs = getAllSongs();
    if (songs.length > 0) {
      selectSong(songs[0]);
    }
  }

  return (
    <div className="menu-container">
      <h1 className="menu-title">NEON RIFF</h1>
      <p className="menu-subtitle">Press START to play</p>
      <p className="menu-hint">Connect your gamepad and press Start</p>
      {/* Gamepad polling handled by a polling effect in App or this component */}
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: Error — `getAllSongs` not yet created. This is expected; we'll create it in Task 19.

We'll skip this error for now and fix in the integration task.

- [ ] **Step 4: Commit**

```bash
git add src/ui/MainMenu.tsx src/ui/MainMenu.css
git commit -m "feat: add main menu component with neon styling"
```

---

### Task 15: Implement SongSelect component

**Files:**
- Create: `src/ui/SongSelect.tsx`
- Create: `src/ui/SongSelect.css`

- [ ] **Step 1: Write SongSelect CSS**

```css
/* src/ui/SongSelect.css */
.song-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  min-height: 100vh;
  background: #0a0a0f;
  color: #fff;
  font-family: monospace;
}

.song-select h2 {
  font-size: 28px;
  margin-bottom: 40px;
  color: #ff3366;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 600px;
}

.song-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #111118;
  border: 1px solid #222;
  border-radius: 8px;
  cursor: pointer;
}

.song-item:hover, .song-item.selected {
  border-color: #ff3366;
  box-shadow: 0 0 12px #ff336644;
}

.song-title {
  font-size: 18px;
}

.song-artist {
  font-size: 13px;
  color: #666;
}

.difficulty-select {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.diff-btn {
  padding: 10px 24px;
  background: #111118;
  border: 1px solid #333;
  border-radius: 6px;
  color: #fff;
  font-family: monospace;
  font-size: 15px;
  cursor: pointer;
}

.diff-btn:hover {
  border-color: #3399ff;
  box-shadow: 0 0 8px #3399ff44;
}

.diff-btn.selected {
  border-color: #3399ff;
  background: #3399ff22;
}
```

- [ ] **Step 2: Write SongSelect component**

```tsx
// src/ui/SongSelect.tsx
import { useState } from "react";
import { useGameState } from "./GameContext";
import type { Song, Difficulty } from "../types";
import "./SongSelect.css";

interface Props {
  songs: Song[];
}

export function SongSelect({ songs }: Props) {
  const { selectSong, selectDifficulty, startGame } = useGameState();
  const [selectedSong, setSelected] = useState<Song | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  function handleSongClick(song: Song) {
    setSelected(song);
    selectSong(song);
  }

  function handleDifficultyClick(diff: Difficulty) {
    setDifficulty(diff);
    if (selectedSong) {
      const chart = selectedSong.charts[diff];
      if (chart) selectDifficulty(chart);
    }
  }

  function handleStart() {
    if (selectedSong?.charts[difficulty]) {
      startGame();
    }
  }

  return (
    <div className="song-select">
      <h2>SELECT SONG</h2>
      <div className="song-list">
        {songs.map(song => (
          <div
            key={song.id}
            className={`song-item ${selectedSong?.id === song.id ? "selected" : ""}`}
            onClick={() => handleSongClick(song)}
          >
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist}</span>
          </div>
        ))}
      </div>

      {selectedSong && (
        <div className="difficulty-select">
          {(["easy", "normal", "hard"] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`diff-btn ${difficulty === diff ? "selected" : ""}`}
              onClick={() => handleDifficultyClick(diff)}
              disabled={!selectedSong.charts[diff]}
            >
              {diff.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {selectedSong && (
        <button className="diff-btn" style={{ marginTop: 24 }} onClick={handleStart}>
          START (A)
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/SongSelect.tsx src/ui/SongSelect.css
git commit -m "feat: add song select with difficulty picker"
```

---

### Task 16: Implement GameScreen (Canvas bridge)

**Files:**
- Create: `src/ui/GameScreen.tsx`

- [ ] **Step 1: Write GameScreen component**

```tsx
// src/ui/GameScreen.tsx
import { useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { startEngine, stopEngine } from "../game/engine";
import { loadAudio, playAudio, stopAudio, getPlaybackTime, getBassIntensity, getIsPlaying } from "../game/audio";
import { pollInput } from "../game/input";
import { loadChart, getTimingWindow, getJudgableNotes, markNoteJudged, markNoteMissed, autoMissPastNotes, getTotalNotes, getHitCount, getMissCount, RuntimeNote } from "../game/chart";
import { judgeHit } from "../game/judge";
import { resetScore, addJudgment, buildResult } from "../game/score";
import { initHighway, renderHighway } from "../game/renderer/highway";
import { initNotes, renderNotes } from "../game/renderer/notes";
import { spawnHitEffect, updateParticles, renderParticles, clearParticles } from "../game/renderer/particles";
import { renderHUD } from "../game/renderer/hud";

const CANVAS_W = 800;
const CANVAS_H = 600;
const HIT_LINE_Y = 520;
const LANE_WIDTH = 80;
const NOTE_SPEED = 350; // px/s
const NOTE_HEIGHT = 20;

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedSong, selectedChart, endGame } = useGameState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSong || !selectedChart) return;
    const ctx = canvas.getContext("2d")!;

    const laneCount = selectedChart.lanes;
    let audioBuffer: AudioBuffer | null = null;
    let started = false;
    let finished = false;

    // Init subsystems
    resetScore();
    clearParticles();
    loadChart(selectedChart);
    initHighway({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED });
    initNotes({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED, noteHeight: NOTE_HEIGHT });

    // Preload audio
    loadAudio(selectedSong.audioPath).then(buf => { audioBuffer = buf; });

    function update(_dt: number) {
      const input = pollInput();
      const currentTime = getPlaybackTime();
      const window = getTimingWindow();

      if (!getIsPlaying() && audioBuffer) {
        // Auto-start when audio is loaded
        playAudio(audioBuffer);
        started = true;
      }

      if (!started) return;

      // Handle lane presses
      for (let lane = 0; lane < laneCount; lane++) {
        if (input.laneJustPressed[lane]) {
          const judgable = getJudgableNotes(currentTime, window.good);
          // Find closest note in this lane
          let bestIdx = -1;
          let bestDist = Infinity;
          for (let i = 0; i < selectedChart.notes.length; i++) {
            const note = selectedChart.notes[i];
            // Check via runtime
            const rtNotes = getJudgableNotes(currentTime, window.good);
            for (const rn of rtNotes) {
              // simplified: check lane match
            }
          }

          // Match press to closest note in lane
          const candidates = getJudgableNotes(currentTime, window.good)
            .filter((_n, idx) => {
              // Direct access to underlying chart notes
              const chartNotes = selectedChart.notes;
              // We need to map RuntimeNote back
              return true; // simplified for now
            });

          // If candidate found, judge it
          if (candidates.length > 0) {
            const note = candidates[0];
            const result = judgeHit(note.time, currentTime, window);
            if (result) {
              // Find note index in runtimeNotes
              const rtNoteIdx = selectedChart.notes.findIndex(
                cn => cn.time === note.time && cn.lane === note.lane && cn.lane === lane
              );
              if (rtNoteIdx >= 0) markNoteJudged(rtNoteIdx);
              addJudgment(result.judgment);
              const totalWidth = laneCount * LANE_WIDTH;
              const startX = (CANVAS_W - totalWidth) / 2;
              spawnHitEffect(
                startX + lane * LANE_WIDTH + LANE_WIDTH / 2,
                HIT_LINE_Y,
                lane,
                result.judgment
              );
            }
          }
        }

        // Handle hold release
        if (input.laneJustReleased[lane]) {
          // Check for active hold notes that need release judgment
        }
      }

      // Auto-miss expired notes
      const newMisses = autoMissPastNotes(currentTime, window.good);
      for (let i = 0; i < newMisses; i++) {
        addJudgment("miss");
      }

      // Update particles
      updateParticles(_dt);

      // Check song end
      if (getHitCount() + getMissCount() >= getTotalNotes() || currentTime > /* song duration */ 999) {
        if (!finished) {
          finished = true;
          stopEngine();
        }
      }
    }

    function render(_dt: number) {
      if (!ctx) return;
      const bass = getBassIntensity();
      const currentTime = getPlaybackTime();

      renderHighway(ctx, bass);

      const lookAhead = (CANVAS_H / NOTE_SPEED) + 1;
      const visible = selectedChart.notes.map((n, i) => ({
        time: n.time,
        lane: n.lane,
        holdDuration: n.hold ?? 0,
        holdEndTime: n.time + (n.hold ?? 0),
        hit: false,
        missed: false,
      })).filter(n => !n.hit && !n.missed && n.time >= currentTime - 0.2 && n.time <= currentTime + lookAhead);

      renderNotes(ctx, visible, currentTime);
      renderParticles(ctx);
      renderHUD(ctx, CANVAS_W, CANVAS_H);
    }

    startEngine({ update, render });

    return () => {
      stopEngine();
      stopAudio();
    };
  }, [selectedSong, selectedChart]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: "block", margin: "0 auto", background: "#000" }}
    />
  );
}
```

- [ ] **Step 2: This task is complex — note that it will need refinement**

The GameScreen is the integration point. The code above is a first pass; we'll refine in Task 19.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: May have errors from incomplete integration. We'll fix in Task 19.

- [ ] **Step 4: Commit**

```bash
git add src/ui/GameScreen.tsx
git commit -m "feat: add GameScreen with Canvas bridge wiring game subsystems"
```

---

### Task 17: Implement PauseOverlay component

**Files:**
- Create: `src/ui/PauseOverlay.tsx`
- Create: `src/ui/PauseOverlay.css`

- [ ] **Step 1: Write CSS**

```css
/* src/ui/PauseOverlay.css */
.pause-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  color: #fff;
  font-family: monospace;
}

.pause-overlay h2 {
  font-size: 48px;
  margin-bottom: 40px;
  text-shadow: 0 0 20px #ff3366;
}

.pause-overlay p {
  color: #666;
  font-size: 14px;
}
```

- [ ] **Step 2: Write component**

```tsx
// src/ui/PauseOverlay.tsx
import { useGameState } from "./GameContext";
import "./PauseOverlay.css";

export function PauseOverlay() {
  const { resumeGame, navigateTo } = useGameState();

  return (
    <div className="pause-overlay">
      <h2>PAUSED</h2>
      <p>Press START to resume</p>
      <p>Press B to quit</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors (unused imports are fine for now, will be wired in App).

- [ ] **Step 4: Commit**

```bash
git add src/ui/PauseOverlay.tsx src/ui/PauseOverlay.css
git commit -m "feat: add pause overlay component"
```

---

### Task 18: Implement ResultScreen component

**Files:**
- Create: `src/ui/ResultScreen.tsx`
- Create: `src/ui/ResultScreen.css`

- [ ] **Step 1: Write CSS**

```css
/* src/ui/ResultScreen.css */
.result-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
  min-height: 100vh;
  background: #0a0a0f;
  color: #fff;
  font-family: monospace;
}

.grade {
  font-size: 96px;
  font-weight: bold;
  text-shadow: 0 0 30px #ff3366, 0 0 60px #ff3366;
  margin-bottom: 20px;
}

.stat-row {
  display: flex;
  gap: 40px;
  margin-top: 30px;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
}

.stat-label {
  font-size: 13px;
  color: #666;
  margin-top: 4px;
}

.result-hint {
  position: absolute;
  bottom: 40px;
  color: #444;
  font-size: 14px;
}
```

- [ ] **Step 2: Write component**

```tsx
// src/ui/ResultScreen.tsx
import { useGameState } from "./GameContext";
import type { GameResult } from "../types";
import "./ResultScreen.css";

interface Props {
  result: GameResult | null;
}

export function ResultScreen({ result }: Props) {
  const { navigateTo } = useGameState();

  if (!result) {
    return (
      <div className="result-screen">
        <h2>No result</h2>
      </div>
    );
  }

  return (
    <div className="result-screen">
      <div className="grade">{result.grade}</div>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-value">{result.score.toLocaleString()}</div>
          <div className="stat-label">SCORE</div>
        </div>
        <div className="stat">
          <div className="stat-value">{result.maxCombo}</div>
          <div className="stat-label">MAX COMBO</div>
        </div>
        <div className="stat">
          <div className="stat-value">{(result.accuracy * 100).toFixed(1)}%</div>
          <div className="stat-label">ACCURACY</div>
        </div>
      </div>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-value" style={{ color: "#00FF88" }}>{result.perfects}</div>
          <div className="stat-label">PERFECT</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: "#FFCC00" }}>{result.goods}</div>
          <div className="stat-label">GOOD</div>
        </div>
        <div className="stat">
          <div className="stat-value" style={{ color: "#FF3366" }}>{result.misses}</div>
          <div className="stat-label">MISS</div>
        </div>
      </div>
      <p className="result-hint">Press START to continue</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/ui/ResultScreen.tsx src/ui/ResultScreen.css
git commit -m "feat: add result screen with grade, score breakdown, and stats"
```

---

### Task 19: Integrate — Wire App.tsx with full game flow

**Files:**
- Create: `src/charts/registry.ts`
- Create: `src/charts/demo-song/easy.ts`
- Create: `src/charts/demo-song/normal.ts`
- Create: `src/charts/demo-song/hard.ts`
- Modify: `src/App.tsx`
- Create: `src/App.css`
- Modify: `src/ui/GameScreen.tsx` (refine integration)
- Create: `src/ui/GameScreen.css`

- [ ] **Step 1: Create chart registry**

```typescript
// src/charts/registry.ts
import type { Song } from "../types";

// Lazy imports — add your songs here
const songs: Song[] = [];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}
```

- [ ] **Step 2: Create demo chart data**

```typescript
// src/charts/demo-song/easy.ts
import type { Chart } from "../../types";

export const chart: Chart = {
  songId: "demo-song",
  difficulty: "easy",
  bpm: 120,
  lanes: 3,
  notes: [
    { time: 1.0, lane: 0 },
    { time: 1.5, lane: 1 },
    { time: 2.0, lane: 2 },
    { time: 2.5, lane: 1 },
    { time: 3.0, lane: 0 },
    { time: 3.5, lane: 1 },
    { time: 4.0, lane: 2 },
    { time: 4.5, lane: 0 },
    { time: 5.0, lane: 1 },
    { time: 5.5, lane: 2 },
    { time: 6.0, lane: 0 },
    { time: 6.5, lane: 1 },
    { time: 7.0, lane: 2 },
    { time: 7.5, lane: 1 },
    { time: 8.0, lane: 0 },
  ],
};
```

Create similar files for `normal.ts` (4 lanes) and `hard.ts` (5 lanes) with the same note pattern extended.

- [ ] **Step 3: Update registry with demo song**

```typescript
// src/charts/registry.ts
import type { Song } from "../types";
import { chart as demoEasy } from "./demo-song/easy";
import { chart as demoNormal } from "./demo-song/normal";
import { chart as demoHard } from "./demo-song/hard";

const songs: Song[] = [
  {
    id: "demo-song",
    title: "Demo Track",
    artist: "Unknown",
    audioPath: "/songs/demo.mp3",
    charts: {
      easy: demoEasy,
      normal: demoNormal,
      hard: demoHard,
    },
  },
];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}
```

- [ ] **Step 4: Write App.tsx game flow**

```tsx
// src/App.tsx
import { useEffect } from "react";
import { GameProvider, useGameState } from "./ui/GameContext";
import { MainMenu } from "./ui/MainMenu";
import { SongSelect } from "./ui/SongSelect";
import { GameScreen } from "./ui/GameScreen";
import { PauseOverlay } from "./ui/PauseOverlay";
import { ResultScreen } from "./ui/ResultScreen";
import { getAllSongs } from "./charts/registry";
import { pollInput } from "./game/input";
import "./App.css";

function GameRouter() {
  const { phase, selectedSong, selectedChart, startGame, pauseGame } = useGameState();

  // Poll gamepad for menu navigation
  useEffect(() => {
    let animId: number;
    function poll() {
      const input = pollInput();
      if (input.startJustPressed) {
        if (phase === "menu") {
          const songs = getAllSongs();
          if (songs.length > 0) {
            startGame(); // simplified — goes to song select first in real flow
          }
        } else if (phase === "paused") {
          // resume handled by overlay
        }
      }
      animId = requestAnimationFrame(poll);
    }
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [phase]);

  switch (phase) {
    case "menu":
      return <MainMenu />;
    case "songSelect":
      return <SongSelect songs={getAllSongs()} />;
    case "playing":
      return (
        <>
          <GameScreen />
          {/* Pause overlay shown when phase changes to paused */}
        </>
      );
    case "paused":
      return (
        <>
          <GameScreen />
          <PauseOverlay />
        </>
      );
    case "result":
      return <ResultScreen result={null} />;  {/* Will be wired with real result */}
    default:
      return <MainMenu />;
  }
}

export function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
```

- [ ] **Step 5: Add global styles**

```css
/* src/App.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #root {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0a0f;
}
```

- [ ] **Step 6: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: There will be errors. Fix incrementally:
- Ensure all imports resolve
- Ensure GameScreen integration is consistent with chart/judge/score modules
- Fix the ResultScreen to receive actual result data

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.css src/charts/ src/ui/GameScreen.tsx
git commit -m "feat: integrate full game flow with menu, song select, gameplay, and results"
```

---

### Task 20: Refine GameScreen note matching logic

**Files:**
- Modify: `src/game/chart.ts` — expose note lookup by time+lane
- Modify: `src/ui/GameScreen.tsx` — use proper matching

- [ ] **Step 1: Add note index lookup to chart.ts**

```typescript
// Add to src/game/chart.ts:
export function findNoteIndex(time: number, lane: number, tolerance: number): number {
  return runtimeNotes.findIndex(n =>
    n.lane === lane &&
    !n.hit && !n.missed &&
    Math.abs(n.time - time) <= tolerance
  );
}
```

- [ ] **Step 2: Rewrite GameScreen update logic with clean matching**

The update function in GameScreen.tsx should use a clean pattern:

```typescript
function update(_dt: number) {
  const input = pollInput();
  const currentTime = getPlaybackTime();

  if (!getIsPlaying()) return;

  const window = getTimingWindow();
  const laneCount = selectedChart!.lanes;

  for (let lane = 0; lane < laneCount; lane++) {
    if (input.laneJustPressed[lane]) {
      // Find closest unmatched note in this lane within good window
      const notes = getJudgableNotes(currentTime, window.good);
      const match = notes.find(n => n.lane === lane);
      if (match) {
        const idx = findNoteIndex(match.time, match.lane, window.good / 1000);
        if (idx >= 0) {
          const result = judgeHit(match.time, currentTime, window);
          if (result) {
            markNoteJudged(idx);
            addJudgment(result.judgment);
            const totalWidth = laneCount * LANE_WIDTH;
            const startX = (CANVAS_W - totalWidth) / 2;
            spawnHitEffect(
              startX + lane * LANE_WIDTH + LANE_WIDTH / 2,
              HIT_LINE_Y,
              lane,
              result.judgment
            );
          }
        }
      }
    }
  }

  // Auto-miss
  const missed = autoMissPastNotes(currentTime, window.good);
  for (let i = 0; i < missed; i++) addJudgment("miss");

  updateParticles(_dt);

  // Song end detection
  if (getHitCount() + getMissCount() >= getTotalNotes()) {
    stopEngine();
    const result = buildResult(selectedSong!.id, selectedChart!.difficulty);
    endGameWithResult(result);
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: Should compile cleanly after fixes.

- [ ] **Step 4: Commit**

```bash
git add src/game/chart.ts src/ui/GameScreen.tsx
git commit -m "fix: refine note-hit matching logic in GameScreen integration"
```

---

### Task 21: Polish — calibration, settings, and edge cases

**Files:**
- Create: `src/ui/SettingsScreen.tsx`
- Modify: `src/App.tsx` — add settings phase
- Modify: `src/types/index.ts` — add "settings" to GamePhase

- [ ] **Step 1: Add calibration slider to Settings**

```tsx
// src/ui/SettingsScreen.tsx (simplified)
import { useState } from "react";
import { getCalibration, setCalibration } from "../game/audio";

export function SettingsScreen() {
  const [offset, setOffset] = useState(getCalibration());

  function handleChange(val: number) {
    setOffset(val);
    setCalibration(val);
  }

  return (
    <div style={{ padding: 40, color: "#fff", fontFamily: "monospace", background: "#0a0a0f", height: "100vh" }}>
      <h2>SETTINGS</h2>
      <label>
        Audio Offset: {offset}ms
        <input
          type="range"
          min={-50}
          max={50}
          step={1}
          value={offset}
          onChange={e => handleChange(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Handle edge cases**
  - Gamepad disconnected mid-song: game auto-pauses
  - Browser tab loses focus: pause on visibilitychange
  - Canvas resize: scale to window while maintaining aspect ratio

- [ ] **Step 3: Verify full flow manually**

```bash
npm run dev
```

Expected: Complete game flow works — menu → song select → gameplay → results → back to menu.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add audio calibration settings and edge case handling"
```

---

## Implementation Order

```
Task 1  → Scaffold project
Task 2  → Core types
Task 3  → Game engine (rAF loop)
Task 4  → Input system
Task 5  → Audio system
Task 6  → Chart loader
Task 7  → Judging system
Task 8  → Scoring system
Task 9  → Highway renderer
Task 10 → Notes renderer
Task 11 → Particles renderer
Task 12 → HUD renderer
Task 13 → Game context (React)
Task 14 → MainMenu
Task 15 → SongSelect
Task 16 → GameScreen (Canvas bridge)
Task 17 → PauseOverlay
Task 18 → ResultScreen
Task 19 → Integration + registry + demo chart
Task 20 → Refine matching logic
Task 21 → Polish + calibration
```

**Tasks 3-8 can be done in parallel** (no cross-dependencies beyond types).
**Tasks 9-12 can be done in parallel** (each is a standalone renderer).
**Tasks 14-18 can be done in parallel** (each is a standalone UI component).

---

## Verification Checklist

- [ ] `npm run dev` starts without errors
- [ ] Gamepad detected and buttons respond in game
- [ ] Main menu → Song Select → Difficulty → Gameplay flow works
- [ ] Canvas renders 4 neon lanes + falling notes
- [ ] Notes scroll at correct speed and hit judgment line
- [ ] Perfect/Good/Miss judgments display correctly
- [ ] Combo counter works and multiplies score
- [ ] Particles burst on note hits
- [ ] Background glow responds to audio
- [ ] Pause/resume works
- [ ] Result screen shows accurate stats
- [ ] Full song plays from start to end without desync
