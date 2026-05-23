// src/ui/MainMenu.tsx
import "./MainMenu.css";

export function MainMenu() {
  return (
    <div className="menu-container">
      <h1 className="menu-title">NEON RIFF</h1>
      <p className="menu-subtitle">Press START to play</p>
      <p className="menu-hint">Connect your gamepad and press Start</p>
    </div>
  );
}
