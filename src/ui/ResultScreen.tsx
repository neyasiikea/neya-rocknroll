// src/ui/ResultScreen.tsx
import type { GameResult } from "../types";
import "./ResultScreen.css";

interface Props {
  result: GameResult | null;
}

export function ResultScreen({ result }: Props) {
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
