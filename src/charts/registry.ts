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
import { chart as goldenBMEasy } from "./golden-babymonster/easy";
import { chart as goldenBMNormal } from "./golden-babymonster/normal";
import { chart as goldenBMHard } from "./golden-babymonster/hard";
import { chart as howDoneEasy } from "./how-its-done/easy";
import { chart as howDoneNormal } from "./how-its-done/normal";
import { chart as howDoneHard } from "./how-its-done/hard";
import { chart as takedownEasy } from "./takedown/easy";
import { chart as takedownNormal } from "./takedown/normal";
import { chart as takedownHard } from "./takedown/hard";
import { chart as twoTigersEasy } from "./two-tigers/easy";
import { chart as twoTigersNormal } from "./two-tigers/normal";
import { chart as twoTigersHard } from "./two-tigers/hard";
import { chart as whiteRabbitEasy } from "./white-rabbit/easy";
import { chart as whiteRabbitNormal } from "./white-rabbit/normal";
import { chart as whiteRabbitHard } from "./white-rabbit/hard";

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
  {
    id: "golden-babymonster",
    title: "Golden BabyMonster",
    artist: "KPop Demon Hunters",
    audioPath: "/songs/KPop_Demon_Hunters_-_Golden_BabyMonster.mp3",
    charts: { easy: goldenBMEasy, normal: goldenBMNormal, hard: goldenBMHard },
  },
  {
    id: "how-its-done",
    title: "How It's Done",
    artist: "KPop Demon Hunters",
    audioPath: "/songs/KPop_Demon_Hunters_-_How_It_s_Done.mp3",
    charts: { easy: howDoneEasy, normal: howDoneNormal, hard: howDoneHard },
  },
  {
    id: "takedown",
    title: "Takedown",
    artist: "KPop Demon Hunters",
    audioPath: "/songs/KPop_Demon_Hunters_-_Takedown.mp3",
    charts: { easy: takedownEasy, normal: takedownNormal, hard: takedownHard },
  },
  {
    id: "two-tigers",
    title: "两只老虎",
    artist: "Traditional",
    audioPath: "/songs/两只老虎.mp3",
    charts: { easy: twoTigersEasy, normal: twoTigersNormal, hard: twoTigersHard },
  },
  {
    id: "white-rabbit",
    title: "小白兔白又白",
    artist: "Traditional",
    audioPath: "/songs/小白兔白又白.mp4",
    charts: { easy: whiteRabbitEasy, normal: whiteRabbitNormal, hard: whiteRabbitHard },
  },
];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}
