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
