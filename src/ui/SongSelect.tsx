// src/ui/SongSelect.tsx
import { useState, useEffect, useRef } from "react";
import { useGameState } from "./GameContext";
import { pollInput } from "../game/input";
import type { Song, Difficulty } from "../types";
import "./SongSelect.css";

interface Props {
  songs: Song[];
}

const DIFFS: Difficulty[] = ["easy", "normal", "hard"];

/** Filter songs that have at least one chart */
function songsWithCharts(songs: Song[]): Song[] {
  return songs.filter(s => s.charts.easy || s.charts.normal || s.charts.hard);
}

export function SongSelect({ songs }: Props) {
  const { selectSong, selectDifficulty, startGame, navigateTo } = useGameState();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const playable = songsWithCharts(songs);
  const selectedSong = playable[selectedIndex] ?? null;

  // Sync selected song to context whenever selection changes
  useEffect(() => {
    if (selectedSong) {
      selectSong(selectedSong);
      const chart = selectedSong.charts[difficulty];
      if (chart) selectDifficulty(chart);
    }
  }, [selectedIndex, difficulty]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDifficultyChange(diff: Difficulty) {
    setDifficulty(diff);
  }

  function handleStart() {
    if (selectedSong?.charts[difficulty]) {
      startGame();
    }
  }

  function goBack() {
    navigateTo("menu");
  }

  // Gamepad / keyboard navigation
  const lastMoveRef = useRef(0);
  useEffect(() => {
    let animId: number;
    function poll() {
      const input = pollInput();
      const now = Date.now();

      // Throttle navigation to ~150ms between moves
      if (now - lastMoveRef.current > 150) {
        if (input.upJustPressed) {
          setSelectedIndex(i => (i - 1 + playable.length) % playable.length);
          lastMoveRef.current = now;
        }
        if (input.downJustPressed) {
          setSelectedIndex(i => (i + 1) % playable.length);
          lastMoveRef.current = now;
        }
        if (input.leftJustPressed) {
          const idx = DIFFS.indexOf(difficulty);
          // Find previous available difficulty
          for (let i = idx - 1; i >= 0; i--) {
            if (selectedSong?.charts[DIFFS[i]]) {
              setDifficulty(DIFFS[i]);
              break;
            }
          }
          lastMoveRef.current = now;
        }
        if (input.rightJustPressed) {
          const idx = DIFFS.indexOf(difficulty);
          for (let i = idx + 1; i < DIFFS.length; i++) {
            if (selectedSong?.charts[DIFFS[i]]) {
              setDifficulty(DIFFS[i]);
              break;
            }
          }
          lastMoveRef.current = now;
        }
      }

      if (input.confirmJustPressed) {
        handleStart();
      }
      if (input.backJustPressed) {
        goBack();
      }

      animId = requestAnimationFrame(poll);
    }
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }); // intentionally runs every render for polling

  return (
    <div className="song-select">
      <h2>SELECT SONG</h2>
      {playable.length === 0 && (
        <p style={{ color: "#666" }}>No songs with charts available. Add charts to src/charts/</p>
      )}
      <div className="song-list">
        {playable.map((song, i) => (
          <div
            key={song.id}
            className={`song-item ${i === selectedIndex ? "selected" : ""}`}
            onClick={() => { setSelectedIndex(i); }}
          >
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist}</span>
          </div>
        ))}
      </div>

      {selectedSong && (
        <div className="difficulty-select">
          {DIFFS.map(diff => (
            <button
              key={diff}
              className={`diff-btn ${difficulty === diff ? "selected" : ""}`}
              onClick={() => handleDifficultyChange(diff)}
              disabled={!selectedSong.charts[diff]}
            >
              {diff.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {selectedSong && (
        <button className="diff-btn" style={{ marginTop: 24 }} onClick={handleStart}>
          START (X / Enter)
        </button>
      )}

      <p className="result-hint" style={{ position: "static", marginTop: 30 }}>
        D-pad / Arrow keys: navigate | X / Enter: start | B / Esc: back
      </p>
    </div>
  );
}
