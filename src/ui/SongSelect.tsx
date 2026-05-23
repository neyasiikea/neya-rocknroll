// src/ui/SongSelect.tsx
import { useState } from "react";
import { useGameState } from "./GameContext";
import type { Song, Difficulty } from "../types";
import "./SongSelect.css";

interface Props {
  songs: Song[];
}

export function SongSelect({ songs }: Props) {
  const { selectSong, selectDifficulty, startGame } = useGameState();
  const [selectedSong, setSelected] = useState<Song | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  function handleSongClick(song: Song) {
    setSelected(song);
    selectSong(song);
  }

  function handleDifficultyClick(diff: Difficulty) {
    setDifficulty(diff);
    if (selectedSong) {
      const chart = selectedSong.charts[diff];
      if (chart) selectDifficulty(chart);
    }
  }

  function handleStart() {
    if (selectedSong?.charts[difficulty]) {
      startGame();
    }
  }

  return (
    <div className="song-select">
      <h2>SELECT SONG</h2>
      <div className="song-list">
        {songs.map(song => (
          <div
            key={song.id}
            className={`song-item ${selectedSong?.id === song.id ? "selected" : ""}`}
            onClick={() => handleSongClick(song)}
          >
            <span className="song-title">{song.title}</span>
            <span className="song-artist">{song.artist}</span>
          </div>
        ))}
      </div>

      {selectedSong && (
        <div className="difficulty-select">
          {(["easy", "normal", "hard"] as Difficulty[]).map(diff => (
            <button
              key={diff}
              className={`diff-btn ${difficulty === diff ? "selected" : ""}`}
              onClick={() => handleDifficultyClick(diff)}
              disabled={!selectedSong.charts[diff]}
            >
              {diff.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {selectedSong && (
        <button className="diff-btn" style={{ marginTop: 24 }} onClick={handleStart}>
          START (A)
        </button>
      )}
    </div>
  );
}
