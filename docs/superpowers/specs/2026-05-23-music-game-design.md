# 吉他英雄风格音乐游戏 — 设计文档

> 日期：2026-05-23 | 状态：待审批

## Context

用户想开发一个在电脑浏览器上运行、用手柄控制的音乐节奏游戏，类似"吉他英雄"。目标是做成完整体验版——多首歌曲、选歌界面、分数排行、多种难度，可以拿出来给朋友玩。

技术方案选用 Canvas + Web Audio API + React 外壳（Vite + TypeScript），手柄为飞智 Vader 2 Pro。

---

## 一、整体架构

```
src/
├── main.ts                    # 入口，挂载 React 到 DOM
├── game/
│   ├── engine.ts              # Canvas 游戏循环 (rAF)
│   ├── input.ts               # Gamepad API 轮询 + 按键映射
│   ├── audio.ts               # Web Audio API 播放 + 调度
│   ├── judge.ts               # 命中判定 (Perfect/Good/Miss)
│   ├── renderer/
│   │   ├── highway.ts         # 音符轨道渲染
│   │   ├── notes.ts           # 音符绘制 + 动画
│   │   ├── particles.ts       # 粒子特效（命中反馈）
│   │   └── hud.ts             # 连击数、分数、血条
│   ├── chart.ts               # 谱面加载 + 运行时管理
│   └── score.ts               # 计分逻辑
├── ui/                        # React 组件（非对局画面）
│   ├── MainMenu.tsx           # 主菜单
│   ├── SongSelect.tsx         # 选歌界面
│   ├── GameScreen.tsx         # 对局容器（挂载 Canvas）
│   ├── PauseOverlay.tsx       # 暂停菜单
│   └── ResultScreen.tsx       # 结算画面
├── charts/                    # 谱面数据文件
│   └── <song-id>/
│       ├── easy.ts
│       ├── normal.ts
│       └── hard.ts
├── types/
│   └── index.ts               # 全局类型定义
└── assets/
    └── songs/                 # 音频文件 (.mp3 / .ogg)
```

**核心原则**：Canvas 负责一切对局中的实时渲染，React 只负责静态/半静态 UI 画面。两者通过 GameScreen 组件桥接——React 渲染容器 DOM，Canvas 接管内部。

---

## 二、谱面数据格式

每首歌 × 每档难度一个 `.ts` 文件，导出纯数据：

```typescript
// charts/track-01/normal.ts
export const chart: Chart = {
  songId: "track-01",
  difficulty: "normal",
  bpm: 140,
  lanes: 4,
  notes: [
    { time: 2.00, lane: 1 },
    { time: 2.50, lane: 3 },
    { time: 2.50, lane: 2 },         // 和弦：同时间多轨道
    { time: 3.00, lane: 0, hold: 1.0 }, // 长按：持续1秒
    // ...
  ],
};
```

| 字段 | 说明 |
|------|------|
| `time` | 音符抵达判定线的时间（秒），游戏唯一时序基准 |
| `lane` | 轨道编号 0-4（easy 只用 0-2，normal 0-3，hard 0-4） |
| `hold` | 可选，长按持续秒数。不填就是普通单击音符 |

**为什么不用节拍/小节？** 音频播放以秒为精确单位，用秒直接对应 `audioContext.currentTime`，减少换算误差。

---

## 三、判定系统（核心技术参考）

### 3.1 判定窗口

| 难度 | Perfect | Good | BAD 阈值 (3×Good) |
|------|------|------|------|
| Easy | ±100ms | ±200ms | 600ms |
| Normal | ±70ms | ±140ms | 420ms |
| Hard | ±50ms | ±100ms | 300ms |

### 3.2 命中判定流程（`judgeHit` + `GameScreen.update()`）

每帧对每个按下(`laneJustPressed`)的轨道执行：

```
Step 1: getJudgableNotes(gameTime, window.good)
        → 筛选 ±good 窗口内未判定音符

Step 2: 在该轨道的候选音符中找距离 gameTime 最近的 (bestMatch)

Step 3: findNoteIndex(bestMatch.time, bestMatch.lane, tolerance)
        → 反查 runtimeNotes 索引，确认音符未被其他轨处理

Step 4: judgeHit(bestMatch.time, gameTime, window)
        → diffMs = |gameTime - noteTime| × 1000
        → diffMs ≤ perfect → "perfect"
        → diffMs ≤ good    → "good"
        → 否则 → null（不会走到，Step1 已过滤）
```

| 判定 | 条件 | 分数 | 特效 |
|------|------|------|------|
| **Perfect** | diffMs ≤ perfect 窗口 | 100 × 连击倍率 | 绿色弹出 + 大粒子 |
| **Good** | diffMs ≤ good 窗口 | 70 × 连击倍率 | 黄色弹出 + 小粒子 |
| **Miss（漏判）** | 音符过期未按 | 0，连击归零 | 红色弹出 + 闷音 SFX |

### 3.3 BAD 误触判定（单向，仅前向）

```
按键按下 → 该轨道在 good 窗口内无匹配音符
  → 查该轨道前方（n.time ≥ gameTime）最近音符距离
  → closestFutureDist > 3×good 窗口 或 无未来音符
  → BAD
```

| 判定 | 条件 | 惩罚 | 特效 |
|------|------|------|------|
| **BAD** | 按键时该轨前方最近音符 > 3×good | **-100 分** | 深红 BAD 弹出 + 闷音 bass pluck + 震动 0.5/80ms |

**关键约束**：
- BAD 仅对**该帧未命中任何音符的轨道**生效（`hitLanes` Set 守卫）
- BAD **不检查已过期的音符**（`n.time >= gameTime` 单向过滤）
- React StrictMode 防护：`updateGuard` 计数器，偶数次 `update()` 调用直接跳过

### 3.4 连击与长按

- 连续 Perfect/Good 累计 combo，Miss/BAD 不中断 combo（仅 Miss 归零）
- 长按：首次命中加入 `activeHolds` 追踪，按住期间不标记 judged
- 长按释放：达到 holdEndTime 判 Perfect，提前释放判 Miss
- 长按每 250ms 给一次判定 tick

---

## 四、难度与按键映射

| 难度 | 轨道数 | 使用按键 |
|------|------|------|
| Easy | 3 轨 | LT, LB, RB |
| Normal | 4 轨 | LT, LB, RB, RT |
| Hard | 5 轨 | LT, LB, RB, RT, A（默认，可配置） |

辅助按键（菜单）：A 确认、B 返回、Start 暂停。所有轨道按键可自定义映射。

---

## 五、音频系统

```
AudioContext.currentTime  ← 唯一时间源
       ↓
SourceNode (解码后的音频)
       ↓  ┌── GainNode (主音量)
       └──┼── AnalyserNode (频谱数据，背景律动)
          └── destination
```

- 音频用 `sourceNode.start(0)` 在 `audioContext.currentTime` 精确调度
- 谱面 `time` 直接对应音频播放时间线
- 判定检测在游戏循环每帧计算，不在音频线程
- 音频全部 `fetch` → `decodeAudioData` 预解码，对局中不再 IO
- 提供 ±50ms 手动偏移滑块校准延迟

---

## 六、视觉设计（赛博霓虹）

4-5 条垂直轨道，轨道色：

| 轨道 | 按键 | 颜色 |
|------|------|------|
| 0 | LT | #00FF88 赛博绿 |
| 1 | LB | #FF3366 霓虹红 |
| 2 | RB | #FFCC00 电子黄 |
| 3 | RT | #3399FF 深蓝 |
| 4 | A | #CC66FF 紫罗兰 |

命中特效：粒子从判定线爆开、轨道短暂 glow pulse、屏幕边缘暗角 + CRT 扫描线、Combo 数字中央闪烁。背景为暗黑底 + 微弱网格线 + AnalyserNode 低频驱动背景光晕。

---

## 七、游戏流程（状态机）

```
MAIN_MENU → SONG_SELECT → (3-2-1 倒计时) → PLAYING
                                    ↓
                              PAUSED ←→ PLAYING
                                    ↓
                              RESULT_SCREEN → SONG_SELECT / MAIN_MENU
```

React 负责：MAIN_MENU、SONG_SELECT、PAUSED 覆盖层、RESULT_SCREEN。Canvas 独占 PLAYING。

---

## 八、计分规则

```
单音得分 = 100 × 判定倍率 × 连击倍率
```

| Combo | 倍率 |
|------|------|
| 0-9 | ×1.0 |
| 10-29 | ×2.0 |
| 30-49 | ×3.0 |
| 50+ | ×4.0 |

**最终评级**（按准确率，Perfect = 全中、Good = 半中）：

| 准确率 | 评级 |
|------|------|
| ≥ 95% | S |
| ≥ 85% | A |
| ≥ 70% | B |
| ≥ 55% | C |
| < 55% | D |

结算画面：总分、最大连击、Perfect/Good/Miss 统计、准确率、评级。

---

## 九、歌曲资源

- 音频文件放 `public/songs/`，Web 直接 fetch
- 谱面放 `src/charts/<song-id>/`，三个难度各一个 `.ts`
- 第一版 1-2 首歌：一首免版权验证技术链路 + 一首用户自选熟悉做谱流程

---

## 十、技术选型

| 层 | 技术 |
|------|------|
| 构建工具 | Vite + TypeScript |
| UI 框架 | React（仅菜单/UI 画面） |
| 游戏渲染 | 纯 HTML5 Canvas + requestAnimationFrame |
| 音频 | Web Audio API（AudioContext） |
| 手柄输入 | Gamepad API（XInput 模式，轮询） |
| 样式 | Vanilla CSS / CSS Modules |

---

## 验证方案

1. `npm run dev` 启动后浏览器打开，手柄连接确认 Gamepad API 能读取到按钮
2. 主菜单 → 选歌 → 选择难度 → 进入对局，确认 Canvas 渲染 4 轨 + 音符滚动动画
3. 播放一首完整歌曲，验证音画同步（肉眼 + 感觉）
4. 所有判定打出 Perfect/Good/Miss，验证计分和 combo 逻辑
5. 结算画面统计数据与对局中表现一致
6. 暂停/继续/返回菜单流程无死循环
