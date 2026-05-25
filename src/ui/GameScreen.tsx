// src/ui/GameScreen.tsx
import { useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { startEngine, stopEngine } from "../game/engine";
import { loadAudio, playAudio, stopAudio, getPlaybackTime, getBassIntensity, getIsPlaying, suspendAudio, resumeAudio, getCalibration, setCalibration, hasAudioEnded, setMainGain } from "../game/audio";
import { pollInput, resetInputState } from "../game/input";
import { loadChart, getTimingWindow, getJudgableNotes, markNoteJudged, findNoteIndex, autoMissPastNotes, getTotalNotes, getHitCount, getMissCount, getRuntimeNotes } from "../game/chart";
import { judgeHit } from "../game/judge";
import { resetScore, addJudgment, buildResult, getCombo } from "../game/score";
import { initHighway, renderHighway } from "../game/renderer/highway";
import { initNotes, renderNotes } from "../game/renderer/notes";
import { spawnHitEffect, updateParticles, renderParticles, clearParticles } from "../game/renderer/particles";
import { renderHUD, pushJudgment, renderJudgmentPopups, updateJudgmentPopups } from "../game/renderer/hud";
import { playMissSFX, playComboMilestoneSFX, vibrateGamepad } from "../game/sfx";

const CANVAS_W = 800;
const CANVAS_H = 600;
const HIT_LINE_Y = 520;
const LANE_WIDTH = 80;
const NOTE_HEIGHT = 20;
const MAX_SONG_DURATION = 210; // 3:30 cap
const FADE_OUT_DURATION = 5;   // last 5s fade
const READY_BUFFER = 2;        // 2s empty highway before first note
const GO_DURATION = 0.5;       // "GO!" display duration

function getNoteSpeed(difficulty: string): number {
  switch (difficulty) { case "easy": return 150; case "normal": return 260; case "hard": return 340; default: return 300; }
}

export function GameScreen() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { selectedSong, selectedChart, endGame, navigateTo } = useGameState();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSong || !selectedChart) return;
    const ctx = canvas.getContext("2d")!;

    const laneCount = selectedChart.lanes;
    const noteSpeed = getNoteSpeed(selectedChart.difficulty);
    let audioBuffer: AudioBuffer | null = null;
    let started = false;       // countdown complete, game running
    let countdownPhase = 0;    // 0=loading, 1-3=countdown numbers, 4=GO
    let countdownTimer = 0;
    let paused = false;
    let finished = false;
    let resultTransition = 0;
    let fallbackStartTime = 0;
    let audioStartTime = 0;    // audioContext.currentTime when audio actually starts
    let pauseTime = 0;
    let lastLanePressed: boolean[] = [];
    let pauseThrottle = 0;
    let lastCombo = 0;
    let effectiveDuration = MAX_SONG_DURATION; // actual song cap
    const activeHolds = new Map<number, { noteIndex: number; holdEndTime: number; lastTick: number }>();

    resetScore();
    clearParticles();
    loadChart(selectedChart);
    initHighway({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed });
    initNotes({ lanes: laneCount, canvasWidth: CANVAS_W, canvasHeight: CANVAS_H, hitLineY: HIT_LINE_Y, laneWidth: LANE_WIDTH, noteSpeed, noteHeight: NOTE_HEIGHT });
    resetInputState();

    let audioFailed = false;
    loadAudio(selectedSong.audioPath)
      .then(buf => {
        audioBuffer = buf;
        effectiveDuration = Math.min(buf.duration, MAX_SONG_DURATION);
      })
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
      markNoteJudged(hold.noteIndex);
      if (gameTime >= hold.holdEndTime - 0.05) {
        pushJudgment("perfect", lane);
        addJudgment("perfect");
      } else {
        pushJudgment("miss", lane);
        addJudgment("miss");
        playMissSFX();
        vibrateGamepad(0.2, 60);
      }
    }

    function update(_dt: number) {
      const input = pollInput();

      // ── Phase: Loading → Countdown ──
      if (!started && countdownPhase === 0) {
        if (audioBuffer || audioFailed) {
          countdownPhase = 1;
          countdownTimer = 0;
        }
      }

      // ── Countdown (3-2-1) ──
      if (countdownPhase >= 1 && countdownPhase <= 3) {
        countdownTimer += _dt || 0.016;
        if (countdownTimer >= 1.0) {
          countdownTimer = 0;
          countdownPhase++;
        }
        return;
      }

      // ── GO! ──
      if (countdownPhase === 4) {
        countdownTimer += _dt || 0.016;
        if (countdownTimer >= GO_DURATION) {
          countdownPhase = 5;
          countdownTimer = 0;
          // Start audio now — notes won't appear for READY_BUFFER seconds
          if (audioBuffer) { playAudio(audioBuffer); }
          else { fallbackStartTime = performance.now() / 1000; }
        }
        return;
      }

      // ── Ready buffer (empty highway, audio playing, no notes judged) ──
      if (countdownPhase === 5) {
        countdownTimer += _dt || 0.016;
        if (countdownTimer >= READY_BUFFER) {
          started = true;
          countdownPhase = 0;
        }
        // Render highway but don't process notes
        lastLanePressed = input.lanePressed;
        return;
      }

      // ── Pause ──
      if (started && input.startJustPressed && !finished && pauseThrottle <= 0) {
        paused = !paused;
        if (paused) { pauseTime = getGameTime(); suspendAudio(); }
        else { resumeAudio(); }
        pauseThrottle = 0.3;
        return;
      }
      pauseThrottle = Math.max(0, pauseThrottle - (_dt || 0.016));

      if (paused) {
        if (input.leftJustPressed) setCalibration(getCalibration() - 5);
        if (input.rightJustPressed) setCalibration(getCalibration() + 5);
      }

      if (input.backJustPressed) {
        if (paused || !started) { stopAudio(); stopEngine(); navigateTo("menu"); return; }
      }

      if (!started || paused) return;

      const gameTime = getGameTime();
      const window = getTimingWindow();
      lastLanePressed = input.lanePressed;

      // ── Lane presses ──
      for (let lane = 0; lane < laneCount; lane++) {
        if (input.laneJustPressed[lane]) {
          // Step 1: get all unjudged notes near the hit line (within good window)
          const notes = getJudgableNotes(gameTime, window.good);
          // Step 2: find closest note in THIS lane
          let bestMatch: typeof notes[0] | null = null;
          let bestDist = Infinity;
          for (const note of notes) {
            if (note.lane === lane) {
              const dist = Math.abs(note.time - gameTime);
              if (dist < bestDist) { bestDist = dist; bestMatch = note; }
            }
          }
          if (bestMatch) {
            // Step 3: confirm the note still exists in runtime array (index lookup)
            const idx = findNoteIndex(bestMatch.time, bestMatch.lane, window.good / 1000);
            if (idx >= 0) {
              // Step 4: judge timing — perfect(≤perf ms), good(≤good ms), miss(>good)
              const result = judgeHit(bestMatch.time, gameTime, window);
              if (result) {
                if (bestMatch.holdDuration > 0) {
                  activeHolds.set(lane, { noteIndex: idx, holdEndTime: bestMatch.holdEndTime, lastTick: gameTime });
                } else {
                  markNoteJudged(idx);
                }
                addJudgment(result.judgment);
                pushJudgment(result.judgment, lane);
                const tw = laneCount * LANE_WIDTH;
                const sx = (CANVAS_W - tw) / 2;
                spawnHitEffect(sx + lane * LANE_WIDTH + LANE_WIDTH / 2, HIT_LINE_Y, lane, result.judgment);
              }
            }
          }
        }
        if (input.laneJustReleased[lane] && activeHolds.has(lane)) {
          completeHold(lane, gameTime);
        }
      }

      // ── Hold ticks ──
      for (const [lane, hold] of activeHolds) {
        if (input.lanePressed[lane] && gameTime - hold.lastTick >= 0.25) {
          hold.lastTick = gameTime;
          pushJudgment("perfect", lane);
        }
        if (gameTime >= hold.holdEndTime) completeHold(lane, gameTime);
      }

      // ── Auto-miss ──
      const heldIndices = new Set(Array.from(activeHolds.values()).map(h => h.noteIndex));
      const missedCount = autoMissPastNotes(gameTime, window.good, heldIndices);
      for (let i = 0; i < missedCount; i++) {
        pushJudgment("miss", -1);
        addJudgment("miss");
        if (i === 0) { playMissSFX(); vibrateGamepad(0.2, 60); }
      }

      updateParticles(_dt);
      updateJudgmentPopups(_dt);

      // ── Combo milestone SFX ──
      const combo = getCombo();
      if (combo > lastCombo) {
        if ((lastCombo < 10 && combo >= 10) || (lastCombo < 30 && combo >= 30) || (lastCombo < 50 && combo >= 50)) {
          playComboMilestoneSFX(combo);
          vibrateGamepad(0.7, 120);
        }
      }
      lastCombo = combo;

      // ── Song end: audio finished or time cap ──
      const allJudged = (getHitCount() + getMissCount()) >= getTotalNotes() && getTotalNotes() > 0;
      const audioDone = hasAudioEnded() || (audioFailed && fallbackStartTime > 0);
      const timeUp = gameTime >= effectiveDuration;
      // Time cap forces end regardless of remaining notes
      // Also end when chart is done (all notes judged, past last note) regardless of audio
      const lastNoteTime = selectedChart.notes.length > 0 ? selectedChart.notes[selectedChart.notes.length - 1].time : 0;
      const pastLastNote = allJudged && gameTime > lastNoteTime + 2;
      const shouldEnd = timeUp || (audioDone && allJudged) || pastLastNote;

      if (shouldEnd && !finished) {
        finished = true;
      }

      if (finished) {
        resultTransition += _dt || 0.016;
        if (resultTransition >= 1.5) {
          const result = buildResult(selectedSong.id, selectedChart.difficulty);
          stopEngine();
          stopAudio();
          // Defer to ensure React processes after rAF
          setTimeout(() => endGame(result), 50);
        }
      }

      // ── Audio gain fade-out in last 5 seconds ──
      if (started && !finished && gameTime >= effectiveDuration - FADE_OUT_DURATION) {
        const remaining = Math.max(0, effectiveDuration - gameTime);
        const vol = (remaining / FADE_OUT_DURATION) * 0.8;
        setMainGain(vol);
        // Auto-miss all remaining notes in final 5s
        const forceMiss = autoMissPastNotes(gameTime, 999, heldIndices);
        for (let i = 0; i < forceMiss; i++) addJudgment("miss");
      }
    }

    function render(_dt: number) {
      if (!ctx) return;
      const bass = getBassIntensity();
      const gameTime = getGameTime();
      const rtNotes = getRuntimeNotes();
      const activeHoldKeys = new Set<string>();
      for (const hold of activeHolds.values()) {
        const n = rtNotes[hold.noteIndex];
        if (n) activeHoldKeys.add(`${n.time.toFixed(4)}_${n.lane}`);
      }

      // Combo celebration: enhanced glow when combo > 20
      const combo = getCombo();
      const celebrationMode = combo >= 20;
      const boostedBass = celebrationMode ? Math.min(1, bass + 0.15) : bass;
      renderHighway(ctx, boostedBass, lastLanePressed, celebrationMode);

      // ── Countdown display ──
      if (countdownPhase >= 1 && countdownPhase <= 3) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 80px monospace";
        ctx.textAlign = "center";
        const num = 4 - countdownPhase;
        ctx.fillText(`${num}`, CANVAS_W / 2, CANVAS_H / 2);
        return;
      }
      if (countdownPhase === 4) {
        ctx.fillStyle = "#00FF88";
        ctx.font = "bold 60px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GO!", CANVAS_W / 2, CANVAS_H / 2);
        return;
      }
      if (countdownPhase === 5) {
        // Ready buffer — show highway, no notes, countdown to start
        const remaining = Math.ceil(READY_BUFFER - countdownTimer);
        ctx.fillStyle = "#ffffff88";
        ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`Get Ready...`, CANVAS_W / 2, CANVAS_H / 2 - 20);
        return;
      }

      if (!started) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 20px monospace";
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
        ctx.font = "14px monospace"; ctx.fillStyle = "#888";
        ctx.fillText("START: Resume  |  B: Quit  |  ◄► Calibrate", CANVAS_W / 2, CANVAS_H / 2 + 30);
        return;
      }

      const lookAhead = (CANVAS_H / noteSpeed) + 1;
      const allRuntimeNotes = getJudgableNotes(gameTime, lookAhead * 1000);
      const holdIndices = new Set(Array.from(activeHolds.values()).map(h => h.noteIndex));
      const holdNotesInProgress = rtNotes.filter((_, i) =>
        holdIndices.has(i) && !allRuntimeNotes.some(a => a.time === rtNotes[i].time && a.lane === rtNotes[i].lane));
      const combinedNotes = [...allRuntimeNotes, ...holdNotesInProgress];
      const visibleNotes = combinedNotes.filter(n => n.time >= gameTime - 0.5 && n.time <= gameTime + lookAhead);

      renderNotes(ctx, visibleNotes, gameTime, activeHoldKeys);
      renderParticles(ctx);
      renderJudgmentPopups(ctx, CANVAS_W, CANVAS_H);
      renderHUD(ctx, CANVAS_W, CANVAS_H);

      // Fade-out
      if (finished) {
        const alpha = Math.min(1, resultTransition / 1.0);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.85})`;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        if (resultTransition > 0.4) {
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = Math.min(1, (resultTransition - 0.4) / 0.8);
          ctx.font = "bold 28px monospace";
          ctx.textAlign = "center";
          ctx.fillText("SONG COMPLETE", CANVAS_W / 2, CANVAS_H / 2);
          ctx.globalAlpha = 1;
        }
      }

      const gp = navigator.getGamepads()[0] ? "GP:OK" : "GP:none";
      ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.font = "10px monospace"; ctx.textAlign = "left";
      ctx.fillText(`time: ${gameTime.toFixed(1)}/${effectiveDuration.toFixed(0)}s  ${gp}  cal: ${getCalibration().toFixed(0)}ms`, 10, CANVAS_H - 6);
    }

    startEngine({ update, render });

    return () => { stopEngine(); stopAudio(); };
  }, [selectedSong, selectedChart]);

  return <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ display: "block", margin: "0 auto", background: "#000" }} />;
}
