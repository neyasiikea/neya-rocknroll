import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "takedown", difficulty: "hard", bpm: 135,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 128, type: "prechorus" },
    { startBeat: 128, endBeat: 208, type: "chorus" },
    { startBeat: 208, endBeat: 240, type: "bridge" },
    { startBeat: 240, endBeat: 304, type: "verse" },
    { startBeat: 304, endBeat: 336, type: "prechorus" },
    { startBeat: 336, endBeat: 416, type: "chorus" },
    { startBeat: 416, endBeat: 448, type: "outro" },
  ],
});
