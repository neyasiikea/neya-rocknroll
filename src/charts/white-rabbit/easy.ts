import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "white-rabbit", difficulty: "easy", bpm: 100,
  sections: [
    { startBeat: 0, endBeat: 16, type: "intro" },
    { startBeat: 16, endBeat: 64, type: "verse" },
    { startBeat: 64, endBeat: 112, type: "chorus" },
    { startBeat: 112, endBeat: 160, type: "verse" },
    { startBeat: 160, endBeat: 192, type: "outro" },
  ],
});
