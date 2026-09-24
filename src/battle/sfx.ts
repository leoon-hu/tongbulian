/**
 * 对战音效（需求 B38 / B73）：用 WebAudio 振荡器与噪声现场合成——不要音频文件、没有授权问题。
 * 每个游戏一整套（skinSfx）：得分、连对、胜利、答错（这个游戏的「哎呀」）、开始、按键。
 * 用 engine/audio 的共享 AudioContext（首次触摸已解锁）；静音开关（engine/voice）关着时什么都不放。
 */
import { audioContext } from '@/engine/audio'
import { isVoiceEnabled } from '@/engine/voice'
import type { Team } from './protocol'
import type { SkinKind } from './skins'

export type Sfx =
  | 'ding' // 得分
  | 'tick' // 倒数
  | 'go' // 开始
  | 'pop' // 弹出提示
  | 'fanfare' // 胜利小号
  | 'cheer' // 欢呼（噪声）
  | 'whoosh' // 跑 / 拉：呼啸
  | 'thud' // 盖：砖落地
  | 'crack' // 化：冰裂
  | 'splash' // 掉进水里
  | 'patter' // 赛跑：哒哒哒的脚步
  | 'vroom' // 赛车：发动机轰一下
  | 'nitro' // 赛车连对：氮气
  | 'chug' // 开火车：哐当哐当开一段 + 蒸汽
  | 'whistle' // 开火车：呜——的汽笛
  | 'launch' // 火箭：点火升空的轰鸣
  | 'fireworks' // 烟花：三声啪
  | 'burner' // 热气球：烧嘴呼的一下
  | 'heave' // 拔河：嘿哟一使劲
  | 'drip' // 融冰：水滴
  | 'stroke' // 游泳：哗啦一划
  | 'rung' // 爬梯子：手脚踩上横档的两下
  | 'pick' // 挖宝：镐刨进土里的一下
  | 'reel' // 钓鱼：绕线轮咔啦啦转几下
  | 'sprout' // 种花：噗地冒出一截
  | 'peep' // 孵蛋：小鸡叽叽两声
  | 'bloop' // 吹泡泡：噗噜一声
  | 'plop' // 摘果子：果子落进篮子噗通一下
  | 'twinkle' // 点亮星星：叮铃两声
  | 'snap' // 拼图：咔哒扣上
  | 'clunk' // 跷跷板：砝码落板咚一下
  | 'hup' // 抢旗：旗子蹦一格
  | 'boom' // 拆城堡：开炮 + 砖碎
  | 'boing' // 表情飞出去：啵嘤
  | 'sting' // 反超：上行三音
  | 'alert' // 还差一分：嘀嘀 — 嘀
  | 'heartbeat' // 决胜题：咚咚、咚咚、咚咚（B62）
  | 'brake' // 答错（开火车 / 赛车）：刹车吱——（B70）
  | 'hiss' // 答错（热气球 / 吹泡泡）：漏气嘶——（B70）
  | 'fizzle' // 答错（火箭）：哑火噗——（B70）
  // ── B73：连对、开始、按键、各游戏的「哎呀」──
  | 'sparkle' // 连对 / 亮晶晶：一串上行的叮叮叮
  | 'oops' // 答错（默认）：「哎—哟」两个轻轻的下行音
  | 'stall' // 答错（赛车）：熄火噗噗噗
  | 'steam' // 按键（开火车）：嚓地喷一口蒸汽
  | 'flame' // 按键（火箭）：火苗呼一下
  | 'puff' // 按键（热气球）：烧嘴呼一下（小）
  | 'rev' // 按键 / 开始（赛车）：踩一脚油门
  | 'pistol' // 开始（赛跑 / 游泳）：发令枪啪
  | 'drop' // 按键（游泳 / 种花）：一滴水
  | 'gulp' // 答错（游泳）：呛水咕嘟咕嘟
  | 'slip' // 答错（爬梯子）：往下一溜嗖——
  | 'clink' // 答错（挖宝）：镐碰到石头叮
  | 'twang' // 答错（钓鱼）：竿子一弹嘣
  | 'wobble' // 答错（盖楼）：晃一晃咿呜咿呜
  | 'wilt' // 答错（种花）：耷拉一下的轻滑音
  | 'bawk' // 答错（孵蛋）：咯咯哒一惊
  | 'cluck' // 按键 / 开始（孵蛋）：咯
  | 'burst' // 答错（吹泡泡）：小泡泡啪地破
  | 'rustle' // 开始 / 答错（摘果子）：树叶沙沙
  | 'pff' // 答错（点亮星星）：魔法棒噗
  | 'hmm' // 答错（拼图）：「嗯？」
  | 'skid' // 答错（拔河 / 融冰）：脚下一滑吱溜
  | 'creak' // 答错（跷跷板）：吱呀一晃
  | 'trip' // 答错（抢旗）：一绊「哎——哟」
  | 'poof' // 答错（拆城堡）：大炮噗地一小团烟
  | 'bugle' // 开始（抢旗）：小号嗒嗒嗒——
  | 'horn' // 开始（拆城堡）：号角嘟——
  | 'cast' // 开始（钓鱼）：甩竿嗖—噗通
  | 'hammer' // 按键 / 开始（盖楼）：小锤嗒
  | 'tap' // 按键（默认）：很轻的一下
  | 'tink' // 按键（融冰）：冰叮

interface Note {
  /** 频率（Hz） */
  f: number
  /** 起点（秒，相对本次播放） */
  at: number
  /** 时长（秒） */
  d: number
  type?: OscillatorType
  gain?: number
  /** 结束时滑到的频率（下滑 = 咚，上滑 = 嗖） */
  to?: number
}

interface Noise {
  at: number
  d: number
  gain?: number
  /** 带通中心频率；不填就是白噪声 */
  f?: number
  q?: number
}

interface Pattern {
  notes?: Note[]
  noise?: Noise[]
}

const PATTERNS: Record<Sfx, Pattern> = {
  ding: { notes: [{ f: 880, at: 0, d: 0.12 }, { f: 1320, at: 0.1, d: 0.22 }] },
  tick: { notes: [{ f: 660, at: 0, d: 0.09, type: 'square', gain: 0.45 }] },
  go: { notes: [{ f: 990, at: 0, d: 0.32, type: 'square', gain: 0.5 }] },
  pop: { notes: [{ f: 520, at: 0, d: 0.1, type: 'triangle', gain: 0.6, to: 1040 }] },
  fanfare: {
    notes: [
      { f: 523, at: 0, d: 0.16 },
      { f: 659, at: 0.16, d: 0.16 },
      { f: 784, at: 0.32, d: 0.16 },
      { f: 1047, at: 0.48, d: 0.55 },
    ],
  },
  cheer: {
    noise: [
      { at: 0, d: 1.4, gain: 0.35, f: 1800, q: 0.6 },
      { at: 0.2, d: 1.0, gain: 0.25, f: 900, q: 0.8 },
    ],
  },
  whoosh: { noise: [{ at: 0, d: 0.3, gain: 0.45, f: 1400, q: 1.2 }] },
  thud: { notes: [{ f: 140, at: 0, d: 0.18, type: 'triangle', gain: 0.9, to: 60 }], noise: [{ at: 0, d: 0.08, gain: 0.3, f: 600, q: 1 }] },
  crack: { noise: [{ at: 0, d: 0.06, gain: 0.7, f: 3200, q: 2 }, { at: 0.07, d: 0.1, gain: 0.5, f: 2200, q: 1.5 }] },
  splash: { noise: [{ at: 0, d: 0.4, gain: 0.5, f: 2400, q: 0.7 }], notes: [{ f: 320, at: 0, d: 0.25, type: 'sine', gain: 0.4, to: 90 }] },
  patter: {
    noise: [
      { at: 0, d: 0.05, gain: 0.5, f: 1200, q: 1.5 },
      { at: 0.11, d: 0.05, gain: 0.45, f: 1000, q: 1.5 },
      { at: 0.22, d: 0.05, gain: 0.4, f: 1200, q: 1.5 },
    ],
  },
  vroom: { notes: [{ f: 110, at: 0, d: 0.4, type: 'sawtooth', gain: 0.5, to: 330 }], noise: [{ at: 0, d: 0.3, gain: 0.15, f: 500, q: 0.8 }] },
  nitro: { notes: [{ f: 220, at: 0, d: 0.35, type: 'sawtooth', gain: 0.5, to: 880 }], noise: [{ at: 0, d: 0.4, gain: 0.4, f: 2600, q: 0.9 }] },
  chug: {
    noise: [
      { at: 0, d: 0.07, gain: 0.55, f: 260, q: 1.2 },
      { at: 0.13, d: 0.07, gain: 0.45, f: 320, q: 1.2 },
      { at: 0.26, d: 0.07, gain: 0.55, f: 260, q: 1.2 },
      { at: 0.39, d: 0.07, gain: 0.45, f: 320, q: 1.2 },
      { at: 0.52, d: 0.07, gain: 0.5, f: 260, q: 1.2 },
      { at: 0.65, d: 0.07, gain: 0.4, f: 320, q: 1.2 },
      { at: 0, d: 0.75, gain: 0.12, f: 2400, q: 0.6 },
    ],
    notes: [{ f: 90, at: 0, d: 0.75, type: 'triangle', gain: 0.25 }],
  },
  whistle: {
    notes: [
      { f: 560, at: 0, d: 0.55, type: 'triangle', gain: 0.4, to: 640 },
      { f: 760, at: 0, d: 0.55, type: 'triangle', gain: 0.32, to: 860 },
      { f: 950, at: 0.02, d: 0.5, type: 'sine', gain: 0.2, to: 1070 },
    ],
    noise: [{ at: 0, d: 0.5, gain: 0.14, f: 3200, q: 0.7 }],
  },
  launch: {
    notes: [{ f: 70, at: 0, d: 0.6, type: 'triangle', gain: 0.8, to: 160 }],
    noise: [
      { at: 0, d: 0.6, gain: 0.45, f: 400, q: 0.5 },
      { at: 0.1, d: 0.5, gain: 0.3, f: 1600, q: 0.8 },
    ],
  },
  fireworks: {
    noise: [
      { at: 0, d: 0.12, gain: 0.7, f: 1500, q: 0.7 },
      { at: 0.35, d: 0.12, gain: 0.6, f: 1200, q: 0.7 },
      { at: 0.7, d: 0.14, gain: 0.7, f: 1800, q: 0.7 },
    ],
    notes: [
      { f: 1600, at: 0.02, d: 0.25, gain: 0.3, to: 400 },
      { f: 1900, at: 0.37, d: 0.25, gain: 0.3, to: 500 },
      { f: 1500, at: 0.72, d: 0.3, gain: 0.3, to: 350 },
    ],
  },
  burner: {
    noise: [
      { at: 0, d: 0.45, gain: 0.5, f: 700, q: 0.6 },
      { at: 0.05, d: 0.35, gain: 0.25, f: 2200, q: 1 },
    ],
  },
  heave: { notes: [{ f: 160, at: 0, d: 0.3, type: 'triangle', gain: 0.7, to: 110 }], noise: [{ at: 0.05, d: 0.25, gain: 0.3, f: 900, q: 1 }] },
  drip: {
    notes: [
      { f: 1400, at: 0, d: 0.12, type: 'sine', gain: 0.5, to: 700 },
      { f: 1800, at: 0.16, d: 0.14, type: 'sine', gain: 0.4, to: 800 },
    ],
  },
  boom: { noise: [{ at: 0, d: 0.12, gain: 0.7, f: 300, q: 0.6 }, { at: 0.3, d: 0.1, gain: 0.5, f: 1800, q: 1.2 }], notes: [{ f: 90, at: 0, d: 0.3, type: 'triangle', gain: 0.7, to: 50 }] },
  hup: { notes: [{ f: 440, at: 0, d: 0.08, type: 'triangle', gain: 0.45, to: 660 }, { f: 660, at: 0.1, d: 0.12, type: 'triangle', gain: 0.4, to: 880 }] },
  clunk: { notes: [{ f: 200, at: 0, d: 0.14, type: 'triangle', gain: 0.7, to: 120 }, { f: 320, at: 0.16, d: 0.08, type: 'triangle', gain: 0.35, to: 200 }], noise: [{ at: 0, d: 0.05, gain: 0.3, f: 900, q: 1 }] },
  snap: { notes: [{ f: 720, at: 0, d: 0.07, type: 'triangle', gain: 0.5, to: 480 }], noise: [{ at: 0, d: 0.03, gain: 0.5, f: 2400, q: 1.5 }] },
  twinkle: { notes: [{ f: 1320, at: 0, d: 0.1, type: 'sine', gain: 0.4, to: 1760 }, { f: 1760, at: 0.11, d: 0.16, type: 'sine', gain: 0.4, to: 2200 }] },
  plop: { notes: [{ f: 260, at: 0, d: 0.1, type: 'triangle', gain: 0.6, to: 170 }, { f: 420, at: 0.13, d: 0.08, type: 'triangle', gain: 0.4, to: 300 }], noise: [{ at: 0, d: 0.05, gain: 0.2, f: 800, q: 1 }] },
  bloop: { notes: [{ f: 380, at: 0, d: 0.16, type: 'sine', gain: 0.45, to: 760 }, { f: 900, at: 0.14, d: 0.06, type: 'sine', gain: 0.25, to: 600 }] },
  peep: {
    notes: [
      { f: 1900, at: 0, d: 0.08, type: 'sine', gain: 0.45, to: 2400 },
      { f: 2000, at: 0.12, d: 0.1, type: 'sine', gain: 0.45, to: 2600 },
    ],
  },
  sprout: { notes: [{ f: 260, at: 0, d: 0.22, type: 'sine', gain: 0.5, to: 640 }], noise: [{ at: 0, d: 0.1, gain: 0.15, f: 1200, q: 1 }] },
  reel: {
    noise: [
      { at: 0, d: 0.04, gain: 0.45, f: 2400, q: 2 },
      { at: 0.07, d: 0.04, gain: 0.45, f: 2200, q: 2 },
      { at: 0.14, d: 0.04, gain: 0.45, f: 2000, q: 2 },
      { at: 0.21, d: 0.04, gain: 0.4, f: 1800, q: 2 },
    ],
    notes: [{ f: 520, at: 0, d: 0.28, type: 'triangle', gain: 0.18, to: 380 }],
  },
  pick: { notes: [{ f: 1500, at: 0, d: 0.05, type: 'triangle', gain: 0.35, to: 900 }], noise: [{ at: 0, d: 0.07, gain: 0.6, f: 900, q: 0.8 }, { at: 0.05, d: 0.16, gain: 0.35, f: 350, q: 0.7 }] },
  rung: {
    notes: [
      { f: 330, at: 0, d: 0.07, type: 'triangle', gain: 0.55, to: 300 },
      { f: 440, at: 0.1, d: 0.08, type: 'triangle', gain: 0.55, to: 400 },
    ],
    noise: [
      { at: 0, d: 0.04, gain: 0.25, f: 1600, q: 1 },
      { at: 0.1, d: 0.04, gain: 0.25, f: 1800, q: 1 },
    ],
  },
  stroke: { noise: [{ at: 0, d: 0.16, gain: 0.5, f: 2600, q: 0.8 }, { at: 0.14, d: 0.12, gain: 0.3, f: 1800, q: 1 }], notes: [{ f: 420, at: 0, d: 0.12, type: 'sine', gain: 0.25, to: 180 }] },
  boing: {
    notes: [
      { f: 520, at: 0, d: 0.12, type: 'triangle', gain: 0.5, to: 980 },
      { f: 780, at: 0.13, d: 0.16, type: 'sine', gain: 0.35, to: 1180 },
    ],
  },
  sting: {
    notes: [
      { f: 660, at: 0, d: 0.12, type: 'triangle', gain: 0.5 },
      { f: 880, at: 0.12, d: 0.12, type: 'triangle', gain: 0.5 },
      { f: 1320, at: 0.24, d: 0.3, type: 'triangle', gain: 0.5 },
    ],
  },
  alert: {
    notes: [
      { f: 1046, at: 0, d: 0.1, type: 'square', gain: 0.4 },
      { f: 1046, at: 0.18, d: 0.1, type: 'square', gain: 0.4 },
      { f: 1318, at: 0.36, d: 0.2, type: 'square', gain: 0.4 },
    ],
  },
  heartbeat: {
    notes: [0, 0.75, 1.5].flatMap((at) => [
      { f: 78, at, d: 0.16, type: 'triangle' as const, gain: 0.95, to: 48 },
      { f: 70, at: at + 0.2, d: 0.18, type: 'triangle' as const, gain: 0.75, to: 45 },
    ]),
  },
  brake: { noise: [{ at: 0, d: 0.45, gain: 0.45, f: 3400, q: 3 }], notes: [{ f: 2400, at: 0, d: 0.45, type: 'sawtooth', gain: 0.12, to: 1500 }] },
  hiss: { noise: [{ at: 0, d: 0.5, gain: 0.4, f: 5200, q: 0.8 }], notes: [{ f: 420, at: 0, d: 0.45, type: 'sine', gain: 0.3, to: 160 }] },
  fizzle: { noise: [{ at: 0, d: 0.35, gain: 0.5, f: 900, q: 0.7 }], notes: [{ f: 220, at: 0, d: 0.4, type: 'triangle', gain: 0.6, to: 70 }] },
  sparkle: { notes: [1320, 1660, 1980, 2640].map((f, i) => ({ f, at: i * 0.05, d: 0.14, type: 'sine' as const, gain: 0.3 })) },
  oops: {
    notes: [
      { f: 587, at: 0, d: 0.13, type: 'triangle', gain: 0.45 },
      { f: 440, at: 0.14, d: 0.24, type: 'triangle', gain: 0.4, to: 415 },
    ],
  },
  stall: {
    notes: [0, 0.12, 0.24].map((at, i) => ({ f: 75 - i * 6, at, d: 0.08, type: 'sawtooth' as const, gain: 0.3 - i * 0.06, to: 55 })),
    noise: [{ at: 0.02, d: 0.35, gain: 0.25, f: 400, q: 0.5 }],
  },
  steam: { noise: [{ at: 0, d: 0.18, gain: 0.35, f: 4200, q: 0.7 }] },
  flame: { noise: [{ at: 0, d: 0.16, gain: 0.4, f: 700, q: 0.6 }], notes: [{ f: 110, at: 0, d: 0.15, type: 'triangle', gain: 0.25, to: 180 }] },
  puff: { noise: [{ at: 0, d: 0.2, gain: 0.35, f: 900, q: 0.6 }] },
  rev: { notes: [{ f: 95, at: 0, d: 0.16, type: 'sawtooth', gain: 0.22, to: 190 }], noise: [{ at: 0, d: 0.12, gain: 0.12, f: 400, q: 0.8 }] },
  pistol: { noise: [{ at: 0, d: 0.06, gain: 0.8, f: 2200, q: 0.4 }], notes: [{ f: 200, at: 0, d: 0.12, type: 'triangle', gain: 0.5, to: 70 }] },
  drop: { notes: [{ f: 1500, at: 0, d: 0.07, type: 'sine', gain: 0.3, to: 900 }] },
  gulp: {
    notes: [
      { f: 320, at: 0, d: 0.1, type: 'sine', gain: 0.45, to: 160 },
      { f: 360, at: 0.16, d: 0.1, type: 'sine', gain: 0.4, to: 170 },
    ],
    noise: [{ at: 0.05, d: 0.15, gain: 0.15, f: 900, q: 1 }],
  },
  slip: {
    notes: [
      { f: 900, at: 0, d: 0.32, type: 'triangle', gain: 0.35, to: 260 },
      { f: 180, at: 0.34, d: 0.08, type: 'triangle', gain: 0.4, to: 120 },
    ],
    noise: [{ at: 0, d: 0.3, gain: 0.15, f: 2500, q: 0.8 }],
  },
  clink: {
    notes: [
      { f: 2400, at: 0, d: 0.12, type: 'sine', gain: 0.35 },
      { f: 3150, at: 0.005, d: 0.18, type: 'sine', gain: 0.25 },
      { f: 700, at: 0.02, d: 0.08, type: 'triangle', gain: 0.2, to: 500 },
    ],
  },
  twang: {
    notes: [
      { f: 240, at: 0, d: 0.25, type: 'triangle', gain: 0.45, to: 180 },
      { f: 480, at: 0, d: 0.2, type: 'sine', gain: 0.2, to: 360 },
    ],
  },
  wobble: { notes: [0, 0.1, 0.2, 0.3].map((at, i) => ({ f: i % 2 ? 392 : 330, at, d: 0.1, type: 'triangle' as const, gain: 0.3, to: i % 2 ? 330 : 392 })) },
  wilt: { notes: [{ f: 660, at: 0, d: 0.45, type: 'sine', gain: 0.3, to: 330 }] },
  bawk: {
    notes: [
      { f: 880, at: 0, d: 0.06, type: 'square', gain: 0.25, to: 660 },
      { f: 900, at: 0.09, d: 0.06, type: 'square', gain: 0.25, to: 640 },
      { f: 1100, at: 0.2, d: 0.14, type: 'square', gain: 0.3, to: 700 },
    ],
    noise: [{ at: 0.05, d: 0.3, gain: 0.15, f: 1500, q: 0.8 }],
  },
  cluck: { notes: [{ f: 800, at: 0, d: 0.05, type: 'square', gain: 0.22, to: 600 }] },
  burst: { noise: [{ at: 0, d: 0.03, gain: 0.5, f: 4000, q: 1 }], notes: [{ f: 1400, at: 0, d: 0.05, type: 'sine', gain: 0.25, to: 500 }] },
  rustle: {
    noise: [
      { at: 0, d: 0.3, gain: 0.25, f: 3200, q: 0.6 },
      { at: 0.12, d: 0.2, gain: 0.18, f: 2500, q: 0.6 },
    ],
  },
  pff: { noise: [{ at: 0, d: 0.22, gain: 0.3, f: 700, q: 0.5 }], notes: [{ f: 260, at: 0, d: 0.15, type: 'triangle', gain: 0.2, to: 140 }] },
  hmm: {
    notes: [
      { f: 330, at: 0, d: 0.14, type: 'triangle', gain: 0.35 },
      { f: 330, at: 0.18, d: 0.2, type: 'triangle', gain: 0.35, to: 415 },
    ],
  },
  skid: { noise: [{ at: 0, d: 0.3, gain: 0.3, f: 3000, q: 3 }], notes: [{ f: 700, at: 0, d: 0.3, type: 'sawtooth', gain: 0.08, to: 500 }] },
  creak: {
    notes: [
      { f: 160, at: 0, d: 0.22, type: 'sawtooth', gain: 0.1, to: 230 },
      { f: 230, at: 0.22, d: 0.2, type: 'triangle', gain: 0.12, to: 170 },
    ],
  },
  trip: {
    notes: [
      { f: 520, at: 0.02, d: 0.1, type: 'triangle', gain: 0.3, to: 700 },
      { f: 700, at: 0.13, d: 0.22, type: 'triangle', gain: 0.3, to: 350 },
    ],
    noise: [{ at: 0, d: 0.06, gain: 0.4, f: 300, q: 0.8 }],
  },
  poof: { noise: [{ at: 0, d: 0.3, gain: 0.35, f: 500, q: 0.5 }], notes: [{ f: 150, at: 0, d: 0.2, type: 'sine', gain: 0.25, to: 90 }] },
  bugle: {
    notes: [
      { f: 523, at: 0, d: 0.12, type: 'square', gain: 0.3 },
      { f: 523, at: 0.14, d: 0.12, type: 'square', gain: 0.3 },
      { f: 659, at: 0.28, d: 0.12, type: 'square', gain: 0.3 },
      { f: 784, at: 0.42, d: 0.35, type: 'square', gain: 0.3 },
    ],
  },
  horn: {
    notes: [
      { f: 196, at: 0, d: 0.15, type: 'sawtooth', gain: 0.25 },
      { f: 262, at: 0.15, d: 0.45, type: 'sawtooth', gain: 0.25 },
    ],
  },
  cast: {
    noise: [
      { at: 0, d: 0.2, gain: 0.3, f: 2800, q: 0.8 },
      { at: 0.3, d: 0.1, gain: 0.2, f: 900, q: 1 },
    ],
    notes: [{ f: 600, at: 0.3, d: 0.1, type: 'sine', gain: 0.35, to: 200 }],
  },
  hammer: { notes: [{ f: 1000, at: 0, d: 0.04, type: 'triangle', gain: 0.3, to: 700 }], noise: [{ at: 0, d: 0.03, gain: 0.2, f: 2500, q: 1 }] },
  tap: { notes: [{ f: 1100, at: 0, d: 0.03, type: 'triangle', gain: 0.25, to: 900 }] },
  tink: { notes: [{ f: 2600, at: 0, d: 0.08, type: 'sine', gain: 0.2 }] },
}

/**
 * 一种皮肤的音效（B38 / B70 / B73，按游戏各不一样）：得分、连对（得分声之外再加的；得分声照样放）、胜利、答错、
 * 开始（倒数到「开始」时，代替通用的「嘟」）、按键（本设备的真人每按一下数字键，很轻）
 */
export interface SkinSounds {
  score: Sfx[]
  streak: Sfx[]
  win: Sfx[]
  wrong: Sfx[]
  go: Sfx[]
  key: Sfx[]
}

const KIND_SOUNDS: Record<SkinKind, SkinSounds> = {
  race: { score: ['whoosh'], streak: ['sparkle'], win: ['cheer'], wrong: ['oops'], go: ['go'], key: ['tap'] },
  tug: { score: ['heave'], streak: ['sparkle'], win: ['splash', 'cheer'], wrong: ['oops'], go: ['go'], key: ['tap'] },
  consume: { score: ['crack'], streak: ['sparkle'], win: ['splash', 'cheer'], wrong: ['oops'], go: ['go'], key: ['tap'] },
  grow: { score: ['thud'], streak: ['sparkle'], win: ['fireworks', 'cheer'], wrong: ['oops'], go: ['go'], key: ['tap'] },
}

/** 每个游戏一整套（B73）；按键没写的都是很轻的「嗒」 */
const SKIN_SOUNDS: Record<string, Partial<SkinSounds>> = {
  race: { score: ['patter'], win: ['cheer'], wrong: ['oops'], go: ['pistol'] },
  car: { score: ['vroom'], streak: ['nitro', 'sparkle'], win: ['nitro', 'cheer'], wrong: ['stall'], go: ['vroom'], key: ['rev'] },
  train: { score: ['chug'], streak: ['whistle'], win: ['whistle', 'cheer'], wrong: ['hiss'], go: ['whistle'], key: ['steam'] },
  rocket: { score: ['launch'], win: ['fireworks', 'cheer'], wrong: ['fizzle'], go: ['launch'], key: ['flame'] },
  balloon: { score: ['burner'], win: ['burner', 'cheer'], wrong: ['hiss'], go: ['burner'], key: ['puff'] },
  swim: { score: ['stroke'], win: ['splash', 'cheer'], wrong: ['gulp'], go: ['pistol'], key: ['drop'] },
  ladder: { score: ['rung'], win: ['fireworks', 'cheer'], wrong: ['slip'], go: ['hup'] },
  dig: { score: ['pick'], win: ['sparkle', 'cheer'], wrong: ['clink'], go: ['pick'] },
  fish: { score: ['reel'], win: ['splash', 'cheer'], wrong: ['twang'], go: ['cast'] },
  tower: { score: ['thud'], win: ['fireworks', 'cheer'], wrong: ['wobble'], go: ['hammer'], key: ['hammer'] },
  flower: { score: ['sprout'], win: ['sparkle', 'cheer'], wrong: ['wilt'], go: ['sprout'], key: ['drop'] },
  egg: { score: ['crack'], win: ['peep', 'cheer'], wrong: ['bawk'], go: ['cluck'], key: ['cluck'] },
  bubble: { score: ['bloop'], win: ['sparkle', 'cheer'], wrong: ['burst'], go: ['bloop'], key: ['bloop'] },
  fruit: { score: ['plop'], win: ['fireworks', 'cheer'], wrong: ['rustle', 'oops'], go: ['rustle'] },
  stars: { score: ['twinkle'], win: ['sparkle', 'twinkle', 'cheer'], wrong: ['pff'], go: ['sparkle'], key: ['twinkle'] },
  puzzle: { score: ['snap'], win: ['fireworks', 'cheer'], wrong: ['hmm'], go: ['snap'], key: ['snap'] },
  tug: { score: ['heave'], win: ['splash', 'cheer'], wrong: ['skid'], go: ['heave'] },
  seesaw: { score: ['clunk'], win: ['thud', 'cheer'], wrong: ['creak'], go: ['boing'] },
  flag: { score: ['hup'], win: ['fireworks', 'cheer'], wrong: ['trip'], go: ['bugle'] },
  ice: { score: ['crack', 'drip'], win: ['splash', 'cheer'], wrong: ['skid'], go: ['crack'], key: ['tink'] },
  castle: { score: ['boom'], win: ['thud', 'fireworks', 'cheer'], wrong: ['poof'], go: ['horn'] },
}

/** 按键的声音音量（很轻）与最密的间隔（毫秒） */
export const KEY_GAIN = 0.35
export const KEY_GAP_MS = 70

/** 某种皮肤的音效表：先按类别给一套，再按皮肤覆盖 */
export function skinSfx(skinId: string, kind: SkinKind = 'race'): SkinSounds {
  return { ...KIND_SOUNDS[kind], ...(SKIN_SOUNDS[skinId] ?? {}) }
}

/** 弹出提示配的一声：反超上行三音、还差一分嘀嘀嘀、决胜题心跳、其它「啵」 */
export function calloutSfx(type: 'lead' | 'nearWin' | 'streak' | 'half' | 'deuce'): Sfx {
  return type === 'lead' ? 'sting' : type === 'nearWin' ? 'alert' : type === 'deuce' ? 'heartbeat' : 'pop'
}

let noiseBuffer: AudioBuffer | null = null
function noise(ac: AudioContext): AudioBuffer {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    const len = ac.sampleRate * 2
    noiseBuffer = ac.createBuffer(1, len, ac.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuffer
}

/** 得分音的左右（B70）：红队偏左、蓝队偏右 */
export const PAN_AMOUNT = 0.5
export function panOf(team: Team | null | undefined): number {
  return team === 'red' ? -PAN_AMOUNT : team === 'blue' ? PAN_AMOUNT : 0
}

/**
 * 播一个音效；pitch 是音高倍率（连对时「叮」逐级升高，1 = 原样）；gain 是音量倍率（点游戏的反应小声一点，B59）；
 * pan 是左右（−1 左 … 1 右，B70：得分音红队偏左、蓝队偏右），浏览器没有 StereoPanner 就居中
 */
export function playSfx(kind: Sfx, pitch = 1, gain = 1, pan = 0): void {
  if (!isVoiceEnabled()) return
  const ac = audioContext()
  if (!ac) return
  try {
    const t0 = ac.currentTime
    const pattern = PATTERNS[kind]
    let out: AudioNode = ac.destination
    if (pan !== 0 && typeof ac.createStereoPanner === 'function') {
      const p = ac.createStereoPanner()
      p.pan.value = Math.max(-1, Math.min(1, pan))
      p.connect(ac.destination)
      out = p
    }
    for (const n of pattern.notes ?? []) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = n.type ?? 'sine'
      const start = t0 + n.at
      osc.frequency.setValueAtTime(n.f * pitch, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to * pitch, start + n.d)
      const peak = (n.gain ?? 0.6) * 0.5 * gain
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      osc.connect(g)
      g.connect(out)
      osc.start(start)
      osc.stop(start + n.d + 0.02)
    }
    for (const n of pattern.noise ?? []) {
      const src = ac.createBufferSource()
      src.buffer = noise(ac)
      const g = ac.createGain()
      const start = t0 + n.at
      const peak = (n.gain ?? 0.4) * 0.5 * gain
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      if (n.f) {
        const bp = ac.createBiquadFilter()
        bp.type = 'bandpass'
        bp.frequency.value = n.f
        bp.Q.value = n.q ?? 1
        src.connect(bp)
        bp.connect(g)
      } else src.connect(g)
      g.connect(out)
      src.start(start)
      src.stop(start + n.d + 0.02)
    }
  } catch {
    // 上下文没就绪 / 环境不支持：音效不是必需的
  }
}

/** 得分「叮」的音高倍率：连对越多越高，最多升到一个八度 */
export function streakPitch(streak: number): number {
  return Math.min(2, 1 + Math.max(0, streak - 1) * 0.12)
}
