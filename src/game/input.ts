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
