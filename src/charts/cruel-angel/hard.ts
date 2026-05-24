import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "cruel-angel", difficulty: "hard", bpm: 155,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 128, type: "prechorus" },
    { startBeat: 128, endBeat: 224, type: "chorus" },
    { startBeat: 224, endBeat: 288, type: "verse" },
    { startBeat: 288, endBeat: 320, type: "prechorus" },
    { startBeat: 320, endBeat: 416, type: "chorus" },
    { startBeat: 416, endBeat: 448, type: "outro" },
  ],
});
