import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "how-its-done", difficulty: "normal", bpm: 120,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 160, type: "chorus" },
    { startBeat: 160, endBeat: 224, type: "verse" },
    { startBeat: 224, endBeat: 256, type: "prechorus" },
    { startBeat: 256, endBeat: 320, type: "chorus" },
    { startBeat: 320, endBeat: 352, type: "bridge" },
    { startBeat: 352, endBeat: 384, type: "outro" },
  ],
});
