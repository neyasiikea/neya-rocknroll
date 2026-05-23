// src/ui/GameContext.tsx
import React, { createContext, useContext, useState, useCallback } from "react";
import type { GamePhase, Song, Chart } from "../types";

interface GameState {
  phase: GamePhase;
  selectedSong: Song | null;
  selectedChart: Chart | null;
  navigateTo: (phase: GamePhase) => void;
  selectSong: (song: Song) => void;
  selectDifficulty: (chart: Chart) => void;
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
}

const GameContext = createContext<GameState | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null);

  const navigateTo = useCallback((p: GamePhase) => setPhase(p), []);
  const selectSong = useCallback((song: Song) => {
    setSelectedSong(song);
    setPhase("songSelect");
  }, []);
  const selectDifficulty = useCallback((chart: Chart) => {
    setSelectedChart(chart);
  }, []);
  const startGame = useCallback(() => setPhase("playing"), []);
  const pauseGame = useCallback(() => setPhase("paused"), []);
  const resumeGame = useCallback(() => setPhase("playing"), []);
  const endGame = useCallback(() => setPhase("result"), []);

  return (
    <GameContext.Provider value={{
      phase, selectedSong, selectedChart,
      navigateTo, selectSong, selectDifficulty,
      startGame, pauseGame, resumeGame, endGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGameState() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGameState must be used within GameProvider");
  return ctx;
}
