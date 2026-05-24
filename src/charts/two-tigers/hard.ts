import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "two-tigers", difficulty: "hard", bpm: 120,
  sections: [
    { startBeat: 0, endBeat: 16, type: "intro" },
    { startBeat: 16, endBeat: 48, type: "verse" },
    { startBeat: 48, endBeat: 64, type: "outro" },
  ],
});
