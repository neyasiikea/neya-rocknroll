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
}
