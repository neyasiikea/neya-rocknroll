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
  currentTime: number,
  activeHoldKeys?: Set<string>
) {
  const { lanes, canvasWidth, canvasHeight, laneWidth, noteHeight } = config;
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
      const holdLength = note.holdDuration * config.noteSpeed;
      const holdTop = y - holdLength;
      const key = `${note.time.toFixed(4)}_${note.lane}`;
      const isHeld = activeHoldKeys?.has(key) ?? false;
      drawHoldNote(ctx, x, holdTop, laneWidth, holdLength + noteHeight, laneColor, isHeld, note.holdDuration);
    } else {
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
  x: number, y: number, w: number, h: number, color: string,
  isHeld = false, holdDurationSec = 1.0
) {
  const padding = 4;
  const nx = x + padding;
  const nw = w - padding * 2;
  const t = performance.now() / 1000;

  // Tier classification (5/12/24 beat lengths)
  const tier = holdDurationSec >= 7 ? 3 : holdDurationSec >= 3 ? 2 : 1;
  const isLong = tier >= 3;
  const isMed = tier === 2;

  if (isHeld) {
    ctx.fillStyle = isLong ? `${color}cc` : isMed ? `${color}aa` : `${color}88`;
    ctx.shadowColor = color;
    ctx.shadowBlur = isLong ? 40 : isMed ? 28 : 20;
  } else {
    ctx.fillStyle = isLong ? `${color}55` : isMed ? `${color}44` : `${color}33`;
    ctx.shadowBlur = 0;
  }
  ctx.fillRect(nx, y, nw, h);

  // Hold borders
  ctx.strokeStyle = isHeld ? `${color}` : `${color}66`;
  ctx.lineWidth = isHeld ? (isLong ? 4 : isMed ? 3 : 2) : 1;
  ctx.strokeRect(nx, y, nw, h);
  ctx.shadowBlur = 0;

  // Hold head (bottom) — brighter for longer holds
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = isHeld ? (isLong ? 40 : isMed ? 28 : 20) : 10;
  const headH = isLong ? 14 : isMed ? 10 : 8;
  ctx.fillRect(nx, y + h - headH, nw, headH);
  ctx.shadowBlur = 0;

  // Side glow lines for active holds
  if (isHeld) {
    ctx.strokeStyle = isLong ? `${color}88` : isMed ? `${color}66` : `${color}44`;
    ctx.lineWidth = isLong ? 5 : isMed ? 4 : 3;
    ctx.beginPath(); ctx.moveTo(nx, y); ctx.lineTo(nx, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(nx + nw, y); ctx.lineTo(nx + nw, y + h); ctx.stroke();
  }

  // ── Tier-specific sparkle effects ──
  if (isHeld && (isMed || isLong)) {
    const sparkCount = isLong ? 20 : isMed ? 10 : 0;
    for (let i = 0; i < sparkCount; i++) {
      const sy = y + (h * (i + 0.5)) / sparkCount;
      const sx = nx + nw / 2 + Math.sin(t * 15 + i * 2.5) * (nw * 0.35);
      const alpha = 0.5 + Math.sin(t * 10 + i * 3) * 0.4;
      const size = isLong ? 2.5 : 2;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = color;
      ctx.shadowBlur = isLong ? 10 : 6;
      ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
    }
    // Pulsing center glow
    const glowAlpha = (isLong ? 0.3 : 0.18) + Math.sin(t * (isLong ? 8 : 6)) * (isLong ? 0.15 : 0.08);
    ctx.strokeStyle = `${color}${Math.round(glowAlpha * 255).toString(16).padStart(2,'0')}`;
    ctx.lineWidth = isLong ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(nx + nw/2, y); ctx.lineTo(nx + nw/2, y + h); ctx.stroke();
    // Side spark trails for long holds
    if (isLong) {
      for (let s = 0; s < 3; s++) {
        const sx2 = nx + (s + 1) * nw / 4;
        const trailAlpha = 0.15 + Math.sin(t * 12 + s) * 0.1;
        ctx.strokeStyle = `${color}${Math.round(trailAlpha * 255).toString(16).padStart(2,'0')}`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx2, y); ctx.lineTo(sx2, y + h); ctx.stroke();
      }
    }
  }
  ctx.shadowBlur = 0;
}

export { noteTimeToY };
export type { NotesConfig };
