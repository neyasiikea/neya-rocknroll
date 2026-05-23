// src/ui/GameScreen.tsx
import { useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { startEngine, stopEngine } from "../game/engine";
import { loadAudio, playAudio, stopAudio, getPlaybackTime, getBassIntensity, getIsPlaying } from "../game/audio";
import { pollInput } from "../game/input";
import { loadChart, getTimingWindow, getJudgableNotes, markNoteJudged, autoMissPastNotes, getTotalNotes, getHitCount, getMissCount } from "../game/chart";
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

    // Init subsystems
    resetScore();
    clearParticles();
    loadChart(selectedChart);
    initHighway({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED });
    initNotes({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed: NOTE_SPEED, noteHeight: NOTE_HEIGHT });

    // Preload audio
    loadAudio(selectedSong.audioPath).then(buf => { audioBuffer = buf; });

    function update(_dt: number) {
      const input = pollInput();
      const currentTime = getPlaybackTime();
      const window = getTimingWindow();

      // Auto-start when audio loaded
      if (!getIsPlaying() && audioBuffer) {
        playAudio(audioBuffer);
        started = true;
      }

      if (!started) return;

      // Handle lane presses
      for (let lane = 0; lane < laneCount; lane++) {
        if (input.laneJustPressed[lane]) {
          const notes = getJudgableNotes(currentTime, window.good);
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
            const result = judgeHit(bestMatch.time, currentTime, window);
            if (result) {
              // Mark the note as judged — find it by iterating over chart notes
              const chartNotes = selectedChart.notes;
              for (let i = 0; i < chartNotes.length; i++) {
                const cn = chartNotes[i];
                if (cn.time === bestMatch.time && cn.lane === bestMatch.lane) {
                  markNoteJudged(i);
                  break;
                }
              }
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

      // Auto-miss expired notes
      const missed = autoMissPastNotes(currentTime, window.good);
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

      renderHighway(ctx, bass);

      // Build visible notes list
      const lookAhead = (CANVAS_H / NOTE_SPEED) + 1;
      const visibleNotes = selectedChart!.notes
        .map(n => ({
          time: n.time,
          lane: n.lane,
          holdDuration: n.hold ?? 0,
          holdEndTime: n.time + (n.hold ?? 0),
          hit: false,
          missed: false,
        }))
        .filter(n => {
          if (n.time < currentTime - 0.2) return false;
          if (n.time > currentTime + lookAhead) return false;
          return true;
        });

      renderNotes(ctx, visibleNotes, currentTime);
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
