// src/game/input.ts
import type { KeyMapping } from "../types";

/** 默认按键映射 (XInput standard) */
export const DEFAULT_MAPPING: KeyMapping = {
  lanes: [6, 4, 5, 7, 0],  // LT, LB, RB, RT, A
  confirm: 0,   // A
  back: 1,      // B
  start: 9,     // Start
};

export interface InputState {
  /** 当前帧按下的轨道按键 (true = pressed) */
  lanePressed: boolean[];
  /** 本帧刚按下的按键 (rising edge) */
  laneJustPressed: boolean[];
  /** 本帧刚松开的按键 (falling edge) */
  laneJustReleased: boolean[];
  /** 菜单按键 rising edge */
  confirmJustPressed: boolean;
  backJustPressed: boolean;
  startJustPressed: boolean;
}

function getMapping(): KeyMapping {
  const stored = localStorage.getItem("keyMapping");
  return stored ? JSON.parse(stored) : DEFAULT_MAPPING;
}

export function saveMapping(mapping: KeyMapping) {
  localStorage.setItem("keyMapping", JSON.stringify(mapping));
}

const prevButtons = new Map<number, boolean>();

// Keyboard state tracking
const keysDown = new Set<string>();
const keysJustDown = new Set<string>();
const keysJustUp = new Set<string>();

export function initKeyboardListener() {
  window.addEventListener("keydown", (e) => {
    if (!keysDown.has(e.key)) {
      keysJustDown.add(e.key);
    }
    keysDown.add(e.key);
    e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    keysDown.delete(e.key);
    keysJustUp.add(e.key);
    e.preventDefault();
  });
}

function consumeKeyJustDown(key: string): boolean {
  if (keysJustDown.has(key)) {
    keysJustDown.delete(key);
    return true;
  }
  return false;
}

function consumeKeyJustUp(key: string): boolean {
  if (keysJustUp.has(key)) {
    keysJustUp.delete(key);
    return true;
  }
  return false;
}

function isKeyDown(key: string): boolean {
  return keysDown.has(key);
}

/** Keyboard lane keys: D, F, J, K, L (5 lanes, common rhythm game layout) */
const KB_LANES = ["d", "f", "j", "k", "l"];

export function pollInput(): InputState {
  const mapping = getMapping();
  const gamepad = navigator.getGamepads()[0];
  const state: InputState = {
    lanePressed: [],
    laneJustPressed: [],
    laneJustReleased: [],
    confirmJustPressed: false,
    backJustPressed: false,
    startJustPressed: false,
  };

  // Keyboard fallback
  const laneCount = mapping.lanes.length;
  for (let i = 0; i < laneCount; i++) {
    const key = KB_LANES[i] ?? "";
    state.lanePressed[i] = isKeyDown(key);
    state.laneJustPressed[i] = consumeKeyJustDown(key);
    state.laneJustReleased[i] = consumeKeyJustUp(key);
  }
  state.confirmJustPressed = consumeKeyJustDown("Enter");
  state.backJustPressed = consumeKeyJustDown("Escape");
  state.startJustPressed = consumeKeyJustDown(" ");
  // Clear stale just-up events
  keysJustDown.clear();
  keysJustUp.clear();

  if (!gamepad) return state;

  const laneCount = mapping.lanes.length;

  for (let i = 0; i < laneCount; i++) {
    const btnIdx = mapping.lanes[i];
    const pressed = gamepad.buttons[btnIdx]?.pressed ?? false;
    const wasPressed = prevButtons.get(btnIdx) ?? false;

    state.lanePressed[i] = pressed;
    state.laneJustPressed[i] = pressed && !wasPressed;
    state.laneJustReleased[i] = !pressed && wasPressed;

    prevButtons.set(btnIdx, pressed);
  }

  // Rising edge for menu buttons
  const checkRising = (idx: number) => {
    const p = gamepad.buttons[idx]?.pressed ?? false;
    const was = prevButtons.get(idx) ?? false;
    prevButtons.set(idx, p);
    return p && !was;
  };

  state.confirmJustPressed = checkRising(mapping.confirm);
  state.backJustPressed = checkRising(mapping.back);
  state.startJustPressed = checkRising(mapping.start);

  return state;
}

/** Clear held state (on scene change) */
export function resetInputState() {
  prevButtons.clear();
}
