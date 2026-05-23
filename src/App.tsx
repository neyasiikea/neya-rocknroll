import { useEffect } from "react";
import { GameProvider, useGameState } from "./ui/GameContext";
import { MainMenu } from "./ui/MainMenu";
import { SongSelect } from "./ui/SongSelect";
import { GameScreen } from "./ui/GameScreen";
import { PauseOverlay } from "./ui/PauseOverlay";
import { ResultScreen } from "./ui/ResultScreen";
import { getAllSongs } from "./charts/registry";
import { pollInput, initKeyboardListener } from "./game/input";
import type { GameResult } from "./types";
import "./App.css";

function getLastResult(): GameResult | null {
  return (window as any).__lastResult ?? null;
}

function GameRouter() {
  const { phase, navigateTo, resumeGame, pauseGame } = useGameState();

  // Init keyboard listener for fallback input
  useEffect(() => {
    initKeyboardListener();
  }, []);

  // Handle tab visibility change — pause when tab loses focus
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && phase === "playing") {
        pauseGame();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [phase, pauseGame]);

  // Poll gamepad/keyboard for menu navigation
  useEffect(() => {
    let animId: number;
    function poll() {
      const input = pollInput();

      if (input.startJustPressed) {
        if (phase === "menu") {
          const songs = getAllSongs();
          if (songs.length > 0) {
            navigateTo("songSelect");
          }
        } else if (phase === "paused") {
          resumeGame();
        } else if (phase === "result") {
          navigateTo("menu");
        }
      }

      if (input.backJustPressed) {
        if (phase === "paused") {
          navigateTo("menu");
        } else if (phase === "songSelect") {
          navigateTo("menu");
        }
      }

      animId = requestAnimationFrame(poll);
    }
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [phase, navigateTo, resumeGame]);

  switch (phase) {
    case "menu":
      return <MainMenu />;
    case "songSelect":
      return <SongSelect songs={getAllSongs()} />;
    case "countdown":
    case "playing":
      return <GameScreen />;
    case "paused":
      return (
        <>
          <GameScreen />
          <PauseOverlay />
        </>
      );
    case "result":
      return <ResultScreen result={getLastResult()} />;
    default:
      return <MainMenu />;
  }
}

export function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
