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
      drawHoldNote(ctx, x, holdTop, laneWidth, holdLength + noteHeight, laneColor, isHeld);
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
  isHeld = false
) {
  const padding = 4;
  const nx = x + padding;
  const nw = w - padding * 2;

  if (isHeld) {
    // Active hold — bright fill pulsing, full glow
    ctx.fillStyle = `${color}88`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  } else {
    // Inactive hold — dim body
    ctx.fillStyle = `${color}33`;
    ctx.shadowBlur = 0;
  }
  ctx.fillRect(nx, y, nw, h);

  // Hold borders
  ctx.strokeStyle = isHeld ? `${color}` : `${color}66`;
  ctx.lineWidth = isHeld ? 2 : 1;
  ctx.strokeRect(nx, y, nw, h);
  ctx.shadowBlur = 0;

  // Hold head (bottom) — always bright
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = isHeld ? 20 : 10;
  ctx.fillRect(nx, y + h - 8, nw, 8);
  ctx.shadowBlur = 0;

  // Side glow lines for active holds
  if (isHeld) {
    ctx.strokeStyle = `${color}44`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(nx, y);
    ctx.lineTo(nx, y + h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(nx + nw, y);
    ctx.lineTo(nx + nw, y + h);
    ctx.stroke();
  }
}

export { noteTimeToY };
export type { NotesConfig };
