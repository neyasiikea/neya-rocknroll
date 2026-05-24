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
import { chart as beyondEasy } from "./beyond/easy";
import { chart as beyondNormal } from "./beyond/normal";
import { chart as beyondHard } from "./beyond/hard";
import { chart as guns21Easy } from "./21guns/easy";
import { chart as guns21Normal } from "./21guns/normal";
import { chart as guns21Hard } from "./21guns/hard";
import { chart as comeAsYouAreEasy } from "./come-as-you-are/easy";
import { chart as comeAsYouAreNormal } from "./come-as-you-are/normal";
import { chart as comeAsYouAreHard } from "./come-as-you-are/hard";
import { chart as beautifulOnesEasy } from "./beautiful-ones/easy";
import { chart as beautifulOnesNormal } from "./beautiful-ones/normal";
import { chart as beautifulOnesHard } from "./beautiful-ones/hard";
import { chart as heyJudeEasy } from "./hey-jude/easy";
import { chart as heyJudeNormal } from "./hey-jude/normal";
import { chart as heyJudeHard } from "./hey-jude/hard";
import { chart as trainToCloudEasy } from "./train-to-cloud/easy";
import { chart as trainToCloudNormal } from "./train-to-cloud/normal";
import { chart as trainToCloudHard } from "./train-to-cloud/hard";
import { chart as buwannengEasy } from "./buwanneng/easy";
import { chart as buwannengNormal } from "./buwanneng/normal";
import { chart as buwannengHard } from "./buwanneng/hard";
import { chart as qinhuangdaoEasy } from "./qinhuangdao/easy";
import { chart as qinhuangdaoNormal } from "./qinhuangdao/normal";
import { chart as qinhuangdaoHard } from "./qinhuangdao/hard";

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
  {
    id: "beyond", title: "不再犹豫", artist: "Beyond",
    audioPath: "/songs/Beyond - 不再犹豫.mp3",
    charts: { easy: beyondEasy, normal: beyondNormal, hard: beyondHard },
  },
  {
    id: "21guns", title: "21 Guns", artist: "Green Day",
    audioPath: "/songs/Green Day - 21 Guns.mp3",
    charts: { easy: guns21Easy, normal: guns21Normal, hard: guns21Hard },
  },
  {
    id: "come-as-you-are", title: "Come As You Are", artist: "Nirvana",
    audioPath: "/songs/Nirvana - Come As You Are.mp3",
    charts: { easy: comeAsYouAreEasy, normal: comeAsYouAreNormal, hard: comeAsYouAreHard },
  },
  {
    id: "beautiful-ones", title: "Beautiful Ones", artist: "Suede",
    audioPath: "/songs/Suede - Beautiful Ones.mp3",
    charts: { easy: beautifulOnesEasy, normal: beautifulOnesNormal, hard: beautifulOnesHard },
  },
  {
    id: "hey-jude", title: "Hey Jude", artist: "The Beatles",
    audioPath: "/songs/The Beatles - Hey Jude.mp3",
    charts: { easy: heyJudeEasy, normal: heyJudeNormal, hard: heyJudeHard },
  },
  {
    id: "train-to-cloud", title: "火车驶向云外，梦安魂于九霄", artist: "刺猬",
    audioPath: "/songs/刺猬 - 火车驶向云外，梦安魂于九霄.mp3",
    charts: { easy: trainToCloudEasy, normal: trainToCloudNormal, hard: trainToCloudHard },
  },
  {
    id: "buwanneng", title: "不万能的喜剧", artist: "万能青年旅店",
    audioPath: "/songs/万能青年旅店 - 不万能的喜剧.mp3",
    charts: { easy: buwannengEasy, normal: buwannengNormal, hard: buwannengHard },
  },
  {
    id: "qinhuangdao", title: "秦皇岛", artist: "万能青年旅店",
    audioPath: "/songs/万能青年旅店 - 秦皇岛.mp3",
    charts: { easy: qinhuangdaoEasy, normal: qinhuangdaoNormal, hard: qinhuangdaoHard },
  },
];

export function getAllSongs(): Song[] {
  return songs;
}

export function getSongById(id: string): Song | undefined {
  return songs.find(s => s.id === id);
}
