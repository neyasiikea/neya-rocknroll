import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "zhongnanhai", difficulty: "normal", bpm: 130,
  sections: [
    { startBeat: 0, endBeat: 32, type: "intro" },
    { startBeat: 32, endBeat: 96, type: "verse" },
    { startBeat: 96, endBeat: 160, type: "chorus" },
    { startBeat: 160, endBeat: 224, type: "verse" },
    { startBeat: 224, endBeat: 288, type: "chorus" },
    { startBeat: 288, endBeat: 320, type: "outro" },
  ],
});
