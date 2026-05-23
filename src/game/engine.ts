// src/game/engine.ts

interface EngineCallbacks {
  update: (dt: number) => void;  // dt in seconds
  render: (dt: number) => void;
}

let animFrameId = 0;
let lastTime = 0;
let running = false;
let callbacks: EngineCallbacks | null = null;

export function startEngine(cb: EngineCallbacks) {
  callbacks = cb;
  running = true;
  lastTime = performance.now();
  animFrameId = requestAnimationFrame(loop);
}

function loop(now: number) {
  if (!running || !callbacks) return;
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  callbacks.update(dt);
  callbacks.render(dt);

  animFrameId = requestAnimationFrame(loop);
}

export function stopEngine() {
  running = false;
  cancelAnimationFrame(animFrameId);
  callbacks = null;
}
