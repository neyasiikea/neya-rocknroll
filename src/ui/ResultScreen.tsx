// src/ui/ResultScreen.tsx
import { useState, useEffect, useRef } from "react";
import type { GameResult } from "../types";
import "./ResultScreen.css";

interface Props {
  result: GameResult | null;
}

function getMessage(acc: number, grade: string): string {
  if (acc >= 0.95) return "LEGENDARY!";
  if (acc >= 0.85) return "AMAZING!";
  if (acc >= 0.70) return "GREAT JOB!";
  if (acc >= 0.55) return "NOT BAD!";
  if (acc >= 0.40) return "KEEP PRACTICING!";
  return "DON'T GIVE UP!";
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case "S": return "#FFD700";
    case "A": return "#00FF88";
    case "B": return "#3399FF";
    case "C": return "#FFCC00";
    case "D": return "#FF3366";
    default: return "#fff";
  }
}

/** Canvas confetti for ≥80% accuracy */
function ConfettiCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; life: number }[] = [];
    const colors = ["#FFD700", "#FF3366", "#00FF88", "#3399FF", "#FFCC00", "#CC66FF", "#FF6600"];

    // Spawn initial burst
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 300,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 400,
        vy: -Math.random() * 500 - 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        life: 2 + Math.random() * 3,
      });
    }

    let animId: number;
    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vy += 200 * 0.016; // gravity
        p.life -= 0.016;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const alpha = Math.min(1, p.life / 1.5);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      // Continuous spawn
      if (particles.length < 60 && Math.random() < 0.3) {
        particles.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 400,
          y: -10,
          vx: (Math.random() - 0.5) * 200,
          vy: -Math.random() * 300 - 50,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 3 + Math.random() * 5,
          life: 1.5 + Math.random() * 2,
        });
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [active]);

  if (!active) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

export function ResultScreen({ result }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (!result) {
    return (
      <div className="result-screen">
        <h2>No result</h2>
      </div>
    );
  }

  const acc = result.accuracy;
  const isGreat = acc >= 0.80;
  const isPoor = acc < 0.50;

  return (
    <div className={`result-screen ${show ? "show" : ""} ${isGreat ? "great" : ""} ${isPoor ? "poor" : ""}`}>
      <ConfettiCanvas active={isGreat && show} />

      <div className="result-grade" style={{ color: getGradeColor(result.grade) }}>
        {result.grade}
      </div>
      <div className="result-message" style={{ color: getGradeColor(result.grade) }}>
        {getMessage(acc, result.grade)}
      </div>

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
          <div className="stat-value">{(acc * 100).toFixed(1)}%</div>
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
