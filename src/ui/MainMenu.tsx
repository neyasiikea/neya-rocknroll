// src/ui/MainMenu.tsx
import "./MainMenu.css";

export function MainMenu() {
  return (
    <div className="menu-container">
      <h1 className="menu-title">NEYA ROCKNROLL</h1>
      <p className="menu-subtitle">Press START to play</p>
      <p className="menu-hint">Gamepad: START to begin | Keyboard: SPACE to begin</p>
    </div>
  );
}
