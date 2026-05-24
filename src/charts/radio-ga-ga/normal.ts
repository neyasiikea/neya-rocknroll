import { generateChart } from "../generator";
export const chart = generateChart({
  songId: "radio-ga-ga", difficulty: "normal", bpm: 112,
  sections: [
    { startBeat: 0, endBeat: 48, type: "intro" },
    { startBeat: 48, endBeat: 128, type: "verse" },
    { startBeat: 128, endBeat: 208, type: "chorus" },
    { startBeat: 208, endBeat: 288, type: "verse" },
    { startBeat: 288, endBeat: 368, type: "chorus" },
    { startBeat: 368, endBeat: 416, type: "bridge" },
    { startBeat: 416, endBeat: 464, type: "outro" },
  ],
});
