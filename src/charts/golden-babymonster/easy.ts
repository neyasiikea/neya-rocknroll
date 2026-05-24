import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "golden-babymonster", difficulty: "easy", bpm: 128,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 128, type: "prechorus" },
    { startBeat: 128, endBeat: 208, type: "chorus" },
    { startBeat: 208, endBeat: 272, type: "verse" },
    { startBeat: 272, endBeat: 304, type: "prechorus" },
    { startBeat: 304, endBeat: 384, type: "chorus" },
    { startBeat: 384, endBeat: 416, type: "bridge" },
    { startBeat: 416, endBeat: 448, type: "outro" },
  ],
});
