import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "creep", difficulty: "easy", bpm: 92,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 144, type: "chorus" },
    { startBeat: 144, endBeat: 192, type: "bridge" },
    { startBeat: 192, endBeat: 256, type: "chorus" },
    { startBeat: 256, endBeat: 288, type: "outro" },
  ],
});
