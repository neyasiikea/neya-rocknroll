// src/ui/GameScreen.tsx
import { useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { startEngine, stopEngine } from "../game/engine";
import { loadAudio, playAudio, stopAudio, getPlaybackTime, getBassIntensity, getIsPlaying } from "../game/audio";
import { pollInput } from "../game/input";
import { loadChart, getTimingWindow, getJudgableNotes, markNoteJudged, findNoteIndex, autoMissPastNotes, getTotalNotes, getHitCount, getMissCount } from "../game/chart";
import { judgeHit } from "../game/judge";
import { resetScore, addJudgment, buildResult } from "../game/score";
import { initHighway, renderHighway } from "../game/renderer/highway";
import { initNotes, renderNotes } from "../game/renderer/notes";
import { spawnHitEffect, updateParticles, renderParticles, clearParticles } from "../game/renderer/particles";
import { renderHUD } from "../game/renderer/hud";

const CANVAS_W = 800;
const CANVAS_H = 600;
const HIT_LINE_Y = 520;
const LANE_WIDTH = 80;
const NOTE_SPEED = 350;
const NOTE_HEIGHT = 20;

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedSong, selectedChart, endGame } = useGameState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSong || !selectedChart) return;
    const ctx = canvas.getContext("2d")!;

    const laneCount = selectedChart.lanes;
    let audioBuffer: AudioBuffer | null = null;
    let started = false;
    let finished = false;
    let fallbackStartTime = 0;

    // Init subsystems
    resetScore();
    clearParticles();
    loadChart(selectedChart);
    initHighway({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED });
    initNotes({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED, noteHeight: NOTE_HEIGHT });

    // Preload audio
    let audioFailed = false;
    loadAudio(selectedSong.audioPath)
      .then(buf => { audioBuffer = buf; })
      .catch(err => {
        console.error("Audio load failed:", selectedSong.audioPath, err);
        audioFailed = true;
        // Start without audio so the game is at least visually testable
        audioBuffer = null;
      });

    function update(_dt: number) {
      const input = pollInput();
      const currentTime = getPlaybackTime();
      const window = getTimingWindow();

      // Auto-start when audio loaded (or failed)
      if (!getIsPlaying() && !started) {
        if (audioBuffer) {
          playAudio(audioBuffer);
          started = true;
        } else if (audioFailed) {
          // No audio — use fallback timer for visual testing
          started = true;
          fallbackStartTime = performance.now() / 1000;
        }
      }

      if (!started) return;

      // Fallback timer when no audio
      const gameTime = getIsPlaying()
        ? currentTime
        : (performance.now() / 1000 - fallbackStartTime);

      // Handle lane presses (use gameTime instead of currentTime)
      for (let lane = 0; lane < laneCount; lane++) {
        if (input.laneJustPressed[lane]) {
          const notes = getJudgableNotes(gameTime, window.good);
          // Find closest unmatched note in this lane
          let bestMatch: typeof notes[0] | null = null;
          let bestDist = Infinity;
          for (const note of notes) {
            if (note.lane === lane) {
              const dist = Math.abs(note.time - currentTime);
              if (dist < bestDist) {
                bestDist = dist;
                bestMatch = note;
              }
            }
          }

          if (bestMatch) {
            const idx = findNoteIndex(bestMatch.time, bestMatch.lane, window.good / 1000);
            if (idx >= 0) {
              const result = judgeHit(bestMatch.time, gameTime, window);
              if (result) {
                markNoteJudged(idx);
                addJudgment(result.judgment);
                const totalWidth = laneCount * LANE_WIDTH;
                const startX = (CANVAS_W - totalWidth) / 2;
                spawnHitEffect(
                  startX + lane * LANE_WIDTH + LANE_WIDTH / 2,
                  HIT_LINE_Y,
                  lane,
                  result.judgment
                );
              }
            }
          }
        }
      }

      // Auto-miss expired notes
      const missed = autoMissPastNotes(gameTime, window.good);
      for (let i = 0; i < missed; i++) {
        addJudgment("miss");
      }

      updateParticles(_dt);

      // Song end detection
      if (getHitCount() + getMissCount() >= getTotalNotes()) {
        if (!finished) {
          finished = true;
          stopEngine();
          const result = buildResult(selectedSong.id, selectedChart.difficulty);
          // Store result for the next screen
          (window as any).__lastResult = result;
          endGame();
        }
      }
    }

    function render(_dt: number) {
      if (!ctx) return;
      const bass = getBassIntensity();
      const currentTime = getPlaybackTime();
      const gameTime = getIsPlaying()
        ? currentTime
        : (fallbackStartTime > 0 ? performance.now() / 1000 - fallbackStartTime : 0);

      renderHighway(ctx, bass);

      // Show loading indicator
      if (!started) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LOADING...", CANVAS_W / 2, CANVAS_H / 2);
        if (audioFailed) {
          ctx.fillStyle = "#ff3366";
          ctx.font = "14px monospace";
          ctx.fillText("Audio failed — playing without sound", CANVAS_W / 2, CANVAS_H / 2 + 30);
        }
        return;
      }

      // Build visible notes list from runtime notes (reflects hit/miss state)
      const lookAhead = (CANVAS_H / NOTE_SPEED) + 1;
      const allRuntimeNotes = getJudgableNotes(gameTime, lookAhead * 1000);
      const visibleNotes = allRuntimeNotes.filter(n => {
        if (n.time < gameTime - 0.2) return false;
        if (n.time > gameTime + lookAhead) return false;
        return true;
      });

      renderNotes(ctx, visibleNotes, gameTime);
      renderParticles(ctx);
      renderHUD(ctx, CANVAS_W, CANVAS_H);
    }

    startEngine({ update, render });

    return () => {
      stopEngine();
      stopAudio();
    };
  }, [selectedSong, selectedChart]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ display: "block", margin: "0 auto", background: "#000" }}
    />
  );
}
