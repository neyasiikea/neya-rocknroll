import "./PauseOverlay.css";

export function PauseOverlay() {
  return (
    <div className="pause-overlay">
      <h2>PAUSED</h2>
      <p>Press START to resume</p>
      <p>Press B to quit</p>
    </div>
  );
}
