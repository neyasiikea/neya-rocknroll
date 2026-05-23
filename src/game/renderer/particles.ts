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
