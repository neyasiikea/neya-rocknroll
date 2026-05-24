import { useEffect } from "react";
import { GameProvider, useGameState } from "./ui/GameContext";
import { MainMenu } from "./ui/MainMenu";
import { SongSelect } from "./ui/SongSelect";
import { GameScreen } from "./ui/GameScreen";
import { ResultScreen } from "./ui/ResultScreen";
import { getAllSongs } from "./charts/registry";
import { pollInput, initKeyboardListener } from "./game/input";
import "./App.css";

function GameRouter() {
  const { phase, lastResult, navigateTo } = useGameState();

  useEffect(() => { initKeyboardListener(); }, []);

  useEffect(() => {
    let animId: number;
    function poll() {
      const input = pollInput();
      if (input.startJustPressed) {
        if (phase === "menu") { navigateTo("songSelect"); }
        else if (phase === "result") { navigateTo("menu"); }
      }
      if (input.backJustPressed && phase === "songSelect") { navigateTo("menu"); }
      animId = requestAnimationFrame(poll);
    }
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, [phase, navigateTo]);

  switch (phase) {
    case "menu": return <MainMenu />;
    case "songSelect": return <SongSelect songs={getAllSongs()} />;
    case "countdown":
    case "playing": return <GameScreen />;
    case "result": return <ResultScreen result={lastResult} />;
    default: return <MainMenu />;
  }
}

export function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
