// src/game/renderer/hud.ts
import { getScore, getCombo, getStats } from "../score";
import { LANE_COLORS } from "./highway";
import type { Judgment } from "../../types";

const JUDGMENT_COLORS: Record<string, string> = {
  perfect: "#00FF88",
  good: "#FFCC00",
  miss: "#FF3366",
  bad: "#CC66FF",
};

const JUDGMENT_TEXT: Record<string, string> = {
  perfect: "PERFECT",
  good: "GOOD",
  miss: "MISS",
  bad: "BAD",
};

interface Popup {
  judgment: string;
  lane: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

const popups: Popup[] = [];
let lastCombo = 0;
let comboTimer = 0;
let lastHitType: Judgment | null = null;
let hitFlashTimer = 0;

export function pushBadStrum(lane: number) {
  lastHitType = "bad";
  hitFlashTimer = 0.1;
  popups.push({
    judgment: "bad",
    lane,
    x: 0,
    y: 500,
    life: 0.5,
    maxLife: 0.5,
  });
}

export function pushJudgment(judgment: string, lane: number) {
  lastHitType = (judgment === "perfect" ? "perfect" : judgment === "good" ? "good" : "miss") as Judgment;
  hitFlashTimer = 0.15;
  popups.push({
    judgment,
    lane,
    x: 0,
    y: 500,
    life: 0.7,
    maxLife: 0.7,
  });
}

export function updateJudgmentPopups(dt: number) {
  for (const p of popups) {
    p.life -= dt;
    p.y -= 60 * dt; // float upward
  }
  // Remove dead popups
  for (let i = popups.length - 1; i >= 0; i--) {
    if (popups[i].life <= 0) popups.splice(i, 1);
  }
  if (hitFlashTimer > 0) hitFlashTimer -= dt;
}

export function renderJudgmentPopups(ctx: CanvasRenderingContext2D, canvasWidth: number, _canvasHeight: number) {
  const combo = getCombo();
  const celebration = combo >= 20;
  const { lanes } = { lanes: 5 };
  const laneWidth = 80;
  const totalWidth = lanes * laneWidth;
  const startX = (canvasWidth - totalWidth) / 2;
  for (const p of popups) {
    const alpha = Math.max(0, p.life / p.maxLife);
    const x = p.lane >= 0 ? startX + p.lane * laneWidth + laneWidth / 2 : canvasWidth / 2;
    ctx.globalAlpha = alpha;
    if (celebration && p.judgment !== "miss" && p.judgment !== "bad") {
      const t = performance.now() / 1000;
      const hue = (t * 100 + p.lane * 40) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 18 * alpha;
    } else {
      ctx.fillStyle = JUDGMENT_COLORS[p.judgment];
      ctx.shadowColor = JUDGMENT_COLORS[p.judgment];
      ctx.shadowBlur = 12 * alpha;
    }
    ctx.font = `bold ${18 + (1 - alpha) * 8}px monospace`;
    ctx.textAlign = "center";
    ctx.fillText(JUDGMENT_TEXT[p.judgment], x, p.y);
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

export function renderHUD(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
  const score = getScore();
  const combo = getCombo();
  const stats = getStats();

  // Combo change animation
  if (combo !== lastCombo) { comboTimer = 0.15; lastCombo = combo; }
  comboTimer = Math.max(0, comboTimer - 1 / 60);

  // Hit flash — brief glow when hitting a note
  if (hitFlashTimer > 0 && lastHitType) {
    if (lastHitType === "bad") {
      ctx.fillStyle = `rgba(180, 100, 255, ${Math.round(hitFlashTimer * 30).toString(16).padStart(2, "0")})`;
    } else {
      ctx.fillStyle = `${JUDGMENT_COLORS[lastHitType]}${Math.round(hitFlashTimer * 40).toString(16).padStart(2, "0")}`;
    }
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Score — top center
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(score).toLocaleString()}`, canvasWidth / 2, 50);

  // Stats — top left (perfect/good/miss counters)
  ctx.font = "14px monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = JUDGMENT_COLORS.perfect;
  ctx.fillText(`PERFECT ${stats.perfects}`, 14, 30);
  ctx.fillStyle = JUDGMENT_COLORS.good;
  ctx.fillText(`GOOD ${stats.goods}`, 14, 48);
  ctx.fillStyle = JUDGMENT_COLORS.miss;
  ctx.fillText(`MISS ${stats.misses}`, 14, 66);

  // Accuracy — top right
  const acc = stats.perfects + stats.goods + stats.misses > 0
    ? ((stats.perfects + stats.goods * 0.5) / (stats.perfects + stats.goods + stats.misses) * 100).toFixed(1)
    : "0.0";
  ctx.fillStyle = "#ffffff88";
  ctx.textAlign = "right";
  ctx.fillText(`${acc}%`, canvasWidth - 14, 30);

  // Combo — center (large, pulsing)
  const celebration = combo >= 20;
  if (combo >= 5) {
    const scale = 1 + comboTimer * 0.3;
    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight * 0.78);
    ctx.scale(scale, scale);
    const alpha = (celebration ? 0.8 : 0.5) + comboTimer * (celebration ? 0.2 : 0.5);
    if (celebration) {
      const t = performance.now() / 1000;
      const hue = (t * 80 + combo * 3) % 360;
      ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${alpha})`;
      ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.6)`;
      ctx.shadowBlur = 20;
    } else {
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.shadowBlur = 0;
    }
    ctx.font = "bold 42px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${combo}`, 0, 0);
    ctx.font = celebration ? "bold 13px monospace" : "12px monospace";
    ctx.fillStyle = celebration ? "#ffffff88" : "#ffffff44";
    ctx.fillText(celebration ? "COMBO 🔥" : "COMBO", 0, 18);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
