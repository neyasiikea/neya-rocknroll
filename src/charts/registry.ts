import type { Song } from "../types";
import { chart as gurengeEasy } from "./gurenge/easy";
import { chart as gurengeNormal } from "./gurenge/normal";
import { chart as gurengeHard } from "./gurenge/hard";
import { chart as cruelAngelEasy } from "./cruel-angel/easy";
import { chart as cruelAngelNormal } from "./cruel-angel/normal";
import { chart as cruelAngelHard } from "./cruel-angel/hard";
import { chart as zhongnanhaiEasy } from "./zhongnanhai/easy";
import { chart as zhongnanhaiNormal } from "./zhongnanhai/normal";
import { chart as zhongnanhaiHard } from "./zhongnanhai/hard";
import { chart as radioGaGaEasy } from "./radio-ga-ga/easy";
import { chart as radioGaGaNormal } from "./radio-ga-ga/normal";
import { chart as radioGaGaHard } from "./radio-ga-ga/hard";
import { chart as creepEasy } from "./creep/easy";
import { chart as creepNormal } from "./creep/normal";
import { chart as creepHard } from "./creep/hard";

const songs: Song[] = [
  {
    id: "gurenge",
    title: "Gurenge",
    artist: "LiSA",
    audioPath: "/songs/LiSA_-_Gurenge_(mp3.pm).mp3",
    charts: { easy: gurengeEasy, normal: gurengeNormal, hard: gurengeHard },
  },
  {
    id: "cruel-angel",
    title: "A Cruel Angel's Thesis (Eurobeat Remix)",
    artist: "Eurobeat Remix",
    audioPath: "/songs/_A_Cruel_Angel_s_Thesis_Eurobeat_Remix.mp3",
    charts: { easy: cruelAngelEasy, normal: cruelAngelNormal, hard: cruelAngelHard },
  },
  {
    id: "zhongnanhai",
    title: "中南海",
    artist: "Carsick Cars",
    audioPath: "/songs/Carsick Cars - 中南海.mp3",
    charts: { easy: zhongnanhaiEasy, normal: zhongnanhaiNormal, hard: zhongnanhaiHard },
  },
  {
    id: "radio-ga-ga",
    title: "Radio Ga Ga",
    artist: "Queen",
    audioPath: "/songs/Queen - Radio Ga Ga.mp3",
    charts: { easy: radioGaGaEasy, normal: radioGaGaNormal, hard: radioGaGaHard },
  },
  {
    id: "creep",
    title: "Creep (Color Remix)",
    artist: "Radiohead",
    audioPath: "/songs/Radiohead_-_Creep_color_rmx_(mp3.pm).mp3",
    charts: { easy: creepEasy, normal: creepNormal, hard: creepHard },
  },
];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}
