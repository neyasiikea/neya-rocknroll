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

export function renderHighway(ctx: CanvasRenderingContext2D, bassIntensity: number, lanePressed?: boolean[], celebration?: boolean, powerUpActive?: boolean) {
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
  const glowAlpha = bassIntensity * (celebration ? 0.15 : 0.08);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, canvasWidth * 0.6);
  if (celebration) {
    const t = performance.now() / 1000;
    const hue = (t * 40) % 360;
    gradient.addColorStop(0, `hsla(${hue}, 80%, 50%, ${glowAlpha * 2})`);
  } else {
    gradient.addColorStop(0, `rgba(100, 100, 255, ${glowAlpha * 2})`);
  }
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
  if (celebration) {
    // Rainbow cycling hit line
    const t = performance.now() / 1000;
    const hue = (t * 60) % 360;
    ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.6)`;
    ctx.lineWidth = 3;
    ctx.shadowColor = `hsla(${hue}, 100%, 60%, 0.4)`;
    ctx.shadowBlur = 12;
  } else {
    ctx.strokeStyle = "#ffffff44";
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
  }
  ctx.beginPath();
  ctx.moveTo(startX, hitLineY);
  ctx.lineTo(startX + totalWidth, hitLineY);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Hit line glow
  const hitGlow = ctx.createLinearGradient(0, hitLineY - 5, 0, hitLineY + 5);
  hitGlow.addColorStop(0, "rgba(255,255,255,0)");
  if (celebration) {
    const t = performance.now() / 1000;
    const hue = (t * 60) % 360;
    hitGlow.addColorStop(0.5, `hsla(${hue}, 100%, 60%, 0.3)`);
  } else {
    hitGlow.addColorStop(0.5, "rgba(255,255,255,0.15)");
  }
  hitGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hitGlow;
  ctx.fillRect(startX, hitLineY - 5, totalWidth, 10);

  // CRT scanline overlay
  ctx.fillStyle = `rgba(0, 0, 0, 0.05)`;
  for (let y = 0; y < canvasHeight; y += 3) {
    ctx.fillRect(0, y, canvasWidth, 1);
  }

  // Lane press feedback indicators (below hit line)
  if (lanePressed) {
    const indicatorY = hitLineY + 8;
    const indicatorH = canvasHeight - indicatorY - 2;
    for (let i = 0; i < lanes; i++) {
      const x = startX + i * laneWidth;
      const pressed = lanePressed[i] ?? false;
      if (pressed) {
        // Pressed: bright glow
        ctx.fillStyle = `${LANE_COLORS[i]}cc`;
        ctx.shadowColor = LANE_COLORS[i];
        ctx.shadowBlur = 20;
      } else {
        // Not pressed: dim indicator
        ctx.fillStyle = `${LANE_COLORS[i]}22`;
        ctx.shadowBlur = 0;
      }
      ctx.fillRect(x + 4, indicatorY, laneWidth - 8, indicatorH);
    }
    ctx.shadowBlur = 0;

    // Key labels below indicators
    const labels = ["LT", "LB", "RB", "RT", "A"];
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    for (let i = 0; i < lanes; i++) {
      const x = startX + i * laneWidth + laneWidth / 2;
      const pressed = lanePressed[i] ?? false;
      ctx.fillStyle = pressed ? "#ffffff" : "#ffffff44";
      ctx.fillText(labels[i] ?? "", x, indicatorY + indicatorH + 16);
    }
  }

  // Power-up edge glow (rainbow pulsing border)
  if (powerUpActive) {
    const t = performance.now() / 1000;
    const hue = (t * 60) % 360;
    const w = 15;
    // Top
    const topGrad = ctx.createLinearGradient(0, 0, 0, w);
    topGrad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.25)`);
    topGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = topGrad; ctx.fillRect(0, 0, canvasWidth, w);
    // Bottom
    const botGrad = ctx.createLinearGradient(0, canvasHeight - w, 0, canvasHeight);
    botGrad.addColorStop(0, "rgba(0,0,0,0)");
    botGrad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0.25)`);
    ctx.fillStyle = botGrad; ctx.fillRect(0, canvasHeight - w, canvasWidth, w);
    // Left
    const leftGrad = ctx.createLinearGradient(0, 0, w, 0);
    leftGrad.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.25)`);
    leftGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = leftGrad; ctx.fillRect(0, 0, w, canvasHeight);
    // Right
    const rightGrad = ctx.createLinearGradient(canvasWidth - w, 0, canvasWidth, 0);
    rightGrad.addColorStop(0, "rgba(0,0,0,0)");
    rightGrad.addColorStop(1, `hsla(${hue}, 100%, 60%, 0.25)`);
    ctx.fillStyle = rightGrad; ctx.fillRect(canvasWidth - w, 0, w, canvasHeight);
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
