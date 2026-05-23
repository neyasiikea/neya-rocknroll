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
