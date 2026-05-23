// src/ui/GameScreen.tsx
import { useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { startEngine, stopEngine } from "../game/engine";
import { loadAudio, playAudio, stopAudio, getPlaybackTime, getBassIntensity, getIsPlaying, suspendAudio, resumeAudio, getCalibration, setCalibration } from "../game/audio";
import { pollInput, resetInputState } from "../game/input";
import { loadChart, getTimingWindow, getJudgableNotes, markNoteJudged, findNoteIndex, autoMissPastNotes, getTotalNotes, getHitCount, getMissCount, getRuntimeNotes } from "../game/chart";
import { judgeHit } from "../game/judge";
import { resetScore, addJudgment, buildResult, getScore, getCombo, getAccuracy, getGrade, getStats } from "../game/score";
import { initHighway, renderHighway } from "../game/renderer/highway";
import { initNotes, renderNotes } from "../game/renderer/notes";
import { spawnHitEffect, updateParticles, renderParticles, clearParticles } from "../game/renderer/particles";
import { renderHUD, pushJudgment, renderJudgmentPopups, updateJudgmentPopups } from "../game/renderer/hud";

const CANVAS_W = 800;
const CANVAS_H = 600;
const HIT_LINE_Y = 520;
const LANE_WIDTH = 80;
const NOTE_SPEED = 350;
const NOTE_HEIGHT = 20;

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedSong, selectedChart, endGame, navigateTo } = useGameState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSong || !selectedChart) return;
    const ctx = canvas.getContext("2d")!;

    const laneCount = selectedChart.lanes;
    let audioBuffer: AudioBuffer | null = null;
    let started = false;
    let paused = false;
    let finished = false;
    let fallbackStartTime = 0;
    let pauseTime = 0;
    let lastLanePressed: boolean[] = [];
    let pauseThrottle = 0; // prevent rapid pause toggling
    /** Track which note indices are being actively held (for render pass-through) */
    const activeHolds = new Map<number, { noteIndex: number; holdEndTime: number; lastTick: number }>();

    // Init subsystems
    resetScore();
    clearParticles();
    loadChart(selectedChart);
    initHighway({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED });
    initNotes({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED, noteHeight: NOTE_HEIGHT });
    resetInputState();

    let audioFailed = false;
    loadAudio(selectedSong.audioPath)
      .then(buf => { audioBuffer = buf; })
      .catch(err => {
        console.error("Audio load failed:", selectedSong.audioPath, err);
        audioFailed = true;
        audioBuffer = null;
      });

    function getGameTime(): number {
      if (paused) return pauseTime;
      if (getIsPlaying()) return getPlaybackTime();
      if (fallbackStartTime > 0) return performance.now() / 1000 - fallbackStartTime;
      return 0;
    }

    function completeHold(lane: number, gameTime: number) {
      const hold = activeHolds.get(lane);
      if (!hold) return;
      activeHolds.delete(lane);
      // Mark the hold note as judged so it counts toward song completion
      markNoteJudged(hold.noteIndex);
      if (gameTime >= hold.holdEndTime - 0.05) {
        pushJudgment("perfect", lane);
        addJudgment("perfect");
      } else {
        pushJudgment("miss", lane);
        addJudgment("miss");
      }
    }

    function update(_dt: number) {
      const input = pollInput();

      // Auto-start when audio loaded or failed
      if (!getIsPlaying() && !started) {
        if (audioBuffer) { playAudio(audioBuffer); started = true; }
        else if (audioFailed) { started = true; fallbackStartTime = performance.now() / 1000; }
      }

      // Pause / resume (with throttle to prevent flicker)
      if (started && input.startJustPressed && !finished && pauseThrottle <= 0) {
        if (paused) {
          paused = false;
          resumeAudio();
        } else {
          paused = true;
          pauseTime = getGameTime();
          suspendAudio();
        }
        pauseThrottle = 0.3; // 300ms cooldown
        return;
      }
      pauseThrottle = Math.max(0, pauseThrottle - (_dt || 0.016));

      // Calibration adjustment when paused (Left/Right changes offset)
      if (paused) {
        if (input.leftJustPressed) setCalibration(getCalibration() - 5);
        if (input.rightJustPressed) setCalibration(getCalibration() + 5);
      }

      // Exit to menu (when paused or before start)
      if (input.backJustPressed) {
        if (paused) {
          stopAudio();
          stopEngine();
          navigateTo("menu");
          return;
        }
        if (!started) {
          stopEngine();
          navigateTo("menu");
          return;
        }
      }

      if (!started || paused) return;

      const gameTime = getGameTime();
      const window = getTimingWindow();
      lastLanePressed = input.lanePressed;

      // Handle lane presses (tap + hold start)
      for (let lane = 0; lane < laneCount; lane++) {
        if (input.laneJustPressed[lane]) {
          const notes = getJudgableNotes(gameTime, window.good);
          let bestMatch: typeof notes[0] | null = null;
          let bestDist = Infinity;
          for (const note of notes) {
            if (note.lane === lane) {
              const dist = Math.abs(note.time - gameTime);
              if (dist < bestDist) { bestDist = dist; bestMatch = note; }
            }
          }

          if (bestMatch) {
            const idx = findNoteIndex(bestMatch.time, bestMatch.lane, window.good / 1000);
            if (idx >= 0) {
              const result = judgeHit(bestMatch.time, gameTime, window);
              if (result) {
                const isHold = bestMatch.holdDuration > 0;
                if (isHold) {
                  activeHolds.set(lane, { noteIndex: idx, holdEndTime: bestMatch.holdEndTime, lastTick: gameTime });
                } else {
                  markNoteJudged(idx);
                }
                addJudgment(result.judgment);
                pushJudgment(result.judgment, lane);

                const totalWidth = laneCount * LANE_WIDTH;
                const startX = (CANVAS_W - totalWidth) / 2;
                spawnHitEffect(startX + lane * LANE_WIDTH + LANE_WIDTH / 2, HIT_LINE_Y, lane, result.judgment);
              }
            }
          }
        }

        // Handle hold release
        if (input.laneJustReleased[lane] && activeHolds.has(lane)) {
          completeHold(lane, gameTime);
        }
      }

      // Hold note ticks every 250ms of sustained hold
      for (const [lane, hold] of activeHolds) {
        if (input.lanePressed[lane] && gameTime - hold.lastTick >= 0.25) {
          hold.lastTick = gameTime;
          pushJudgment("perfect", lane);
        }
        // Auto-complete hold that reached its end time
        if (gameTime >= hold.holdEndTime) {
          completeHold(lane, gameTime);
        }
      }

      // Auto-miss expired notes (skip actively-held hold notes)
      const heldIndices = new Set(Array.from(activeHolds.values()).map(h => h.noteIndex));
      const missedCount = autoMissPastNotes(gameTime, window.good, heldIndices);
      for (let i = 0; i < missedCount; i++) {
        pushJudgment("miss", -1);
        addJudgment("miss");
      }

      updateParticles(_dt);
      updateJudgmentPopups(_dt);

      // Song end: all notes either hit or missed
      const judged = getHitCount() + getMissCount();
      if (judged >= getTotalNotes() && getTotalNotes() > 0) {
        if (!finished) {
          finished = true;
          stopEngine();
          (window as any).__lastResult = buildResult(selectedSong.id, selectedChart.difficulty);
          // Brief delay so player sees final state
          setTimeout(() => endGame(), 600);
        }
      }
    }

    function render(_dt: number) {
      if (!ctx) return;
      const bass = getBassIntensity();
      const gameTime = getGameTime();

      // Build set of active hold keys (time_lane) for the renderer
      const rtNotes = getRuntimeNotes();
      const activeHoldKeys = new Set<string>();
      for (const hold of activeHolds.values()) {
        const n = rtNotes[hold.noteIndex];
        if (n) activeHoldKeys.add(`${n.time.toFixed(4)}_${n.lane}`);
      }

      renderHighway(ctx, bass, lastLanePressed);

      if (!started) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LOADING...", CANVAS_W / 2, CANVAS_H / 2);
        return;
      }

      if (paused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 36px monospace";
        ctx.textAlign = "center";
        ctx.fillText("PAUSED", CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.font = "14px monospace";
        ctx.fillStyle = "#888";
        ctx.fillText("START: Resume  |  B: Quit to Menu", CANVAS_W / 2, CANVAS_H / 2 + 30);
        // Still render highway behind
        return;
      }

      // Build visible notes
      const lookAhead = (CANVAS_H / NOTE_SPEED) + 1;
      const allRuntimeNotes = getJudgableNotes(gameTime, lookAhead * 1000);
      // Also include actively held notes (not in getJudgableNotes because !hit fails)
      const holdIndices = new Set(Array.from(activeHolds.values()).map(h => h.noteIndex));
      const holdNotesInProgress = rtNotes.filter((_, i) => holdIndices.has(i) && !allRuntimeNotes.some(a => a.time === rtNotes[i].time && a.lane === rtNotes[i].lane));
      const combinedNotes = [...allRuntimeNotes, ...holdNotesInProgress];

      const visibleNotes = combinedNotes.filter(n => {
        if (n.time < gameTime - 0.5) return false;
        if (n.time > gameTime + lookAhead) return false;
        return true;
      });

      renderNotes(ctx, visibleNotes, gameTime, activeHoldKeys);
      renderParticles(ctx);
      renderJudgmentPopups(ctx, CANVAS_W, CANVAS_H);
      renderHUD(ctx, CANVAS_W, CANVAS_H);

      // Debug line
      const hasGamepad = navigator.getGamepads()[0] ? "GP:OK" : "GP:none";
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`notes: ${visibleNotes.length}  time: ${gameTime.toFixed(1)}s  ${hasGamepad}  cal: ${getCalibration().toFixed(0)}ms`, 10, CANVAS_H - 6);
    }

    startEngine({ update, render });

    return () => {
      stopEngine();
      stopAudio();
    };
  }, [selectedSong, selectedChart]);

  return (
    <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
      style={{ display: "block", margin: "0 auto", background: "#000" }} />
  );
}
