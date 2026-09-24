/**
 * 背景音乐（需求 B68 / B73）：竞技场里一首合成的小曲子——WebAudio 振荡器与噪声现场发声，没有音频文件。
 * 每个游戏一首：调、调式、速度、拍子、主旋律音色、低音走法、铺底和弦、鼓点各不相同；8 小节一轮，每小节一个和弦，
 * 旋律按调内级数写（强拍落在和弦音上，测试查着），低音 / 铺底 / 鼓点按风格从和弦生成。冲刺时换成这首的快速度、空拍加镲；
 * 朗读、语音时压低；只在比赛中放。
 * 调度用「提前排」的老办法：每 TICK_MS 看一次，把 LOOKAHEAD_S 内的音符按 AudioContext 的时钟排上去，不受 setTimeout 抖动影响。
 * AudioContext 可注入（测试用假的）；静音开关（engine/sound）关着时不放。
 */
import { audioContext, subscribeDuck } from '@/engine/audio'
import { soundOn } from '@/engine/sound'

/** 音量：很轻，别盖住读题；压低（朗读 / 语音时）的倍数 */
export const MUSIC_VOLUME = 0.09
export const MUSIC_DUCK = 0.35
export const LOOKAHEAD_S = 0.3
export const TICK_MS = 100
/** 一轮几小节 */
export const BARS = 8

export type ScaleName = 'major' | 'minor' | 'dorian'
export const SCALES: Record<ScaleName, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
}

/** 主旋律的音色：振荡器波形 + 包络（跳音 / 长音 / 钟琴 / 柔和），可选颤音 */
export interface Voice {
  type: OscillatorType
  env: 'pluck' | 'hold' | 'bell' | 'soft'
  /** 相对各层默认音量的倍数 */
  gain?: number
  /** 颤音深度（音分） */
  vibrato?: number
}

/**
 * 低音走法（每小节按和弦根音生成）：root 根音 + 小节中间的五度；oompah 根五的短音；walk 四分音符 根-三-五-六；
 * pulse 八分音符的根音推进；boogie 根-五-六-五；waltz 每小节第一拍一个根音；drone 整小节的根音 + 五度（空五度）
 */
export type BassStyle = 'root' | 'oompah' | 'walk' | 'pulse' | 'boogie' | 'waltz' | 'drone'
/** 铺底和弦：hold 整小节长音；stab 反拍上的短和弦；arp 每步一个和弦音的分解和弦；none 没有 */
export type PadStyle = 'hold' | 'stab' | 'arp' | 'none'

/**
 * 一首曲子。melody 每小节一组、每组 meter × 2 步（八分音符）：数字是调内级数（1 = 主音，8 = 高八度的主音，
 * 负数是低一个八度的那一级，−5 = 低音 sol），null 是休止；chords 每小节一个和弦的级数（1 = I … 7 = VII）。
 * drums 是每小节的鼓点，一步一个字符：k 大鼓、s 小鼓、h 镲、b 刷子、w 木鱼、c 拍手、p 水滴、. 空
 */
export interface Tune {
  bpm: number
  sprintBpm: number
  meter: 3 | 4
  /** 主音（MIDI） */
  key: number
  scale: ScaleName
  /** 主旋律比主音高几个半音（让旋律落在 60–90 之间） */
  octave: number
  chords: readonly number[]
  melody: readonly (readonly (number | null)[])[]
  lead: Voice
  bass: BassStyle
  pad: PadStyle
  drums: string
  /** 摇摆：反拍往后推多少（一步的比例，0…0.3） */
  swing?: number
  /** 整首的音量倍数：按离线渲染量出的响度（滤掉低音后的 RMS）拉平，各首听着差不多响 */
  level: number
}

const _ = null

/** 每个游戏一首（B73）；没登记的皮肤用赛跑那首 */
export const TUNES: Record<string, Tune> = {
  // 🐢🐇 赛跑：蹦跳小曲，木鱼「嘚嘚」
  race: {
    bpm: 112,
    sprintBpm: 140,
    meter: 4,
    key: 60,
    scale: 'major',
    octave: 12,
    chords: [1, 6, 4, 5, 1, 4, 5, 1],
    melody: [
      [5, _, 3, 5, 8, _, 5, 3],
      [6, _, 5, 6, 8, _, 6, 5],
      [4, 5, 6, _, 8, _, 6, 4],
      [5, _, 7, _, 9, _, 7, 5],
      [8, _, 5, 8, 10, _, 8, 5],
      [6, _, 4, 6, 8, 6, 4, _],
      [7, _, 5, 7, 9, 7, 5, 4],
      [3, 5, 3, 2, 1, _, _, _],
    ],
    lead: { type: 'triangle', env: 'pluck' },
    bass: 'oompah',
    pad: 'stab',
    drums: 'k.w.k.w.',
    level: 1.25,
  },
  // 🏎️ 赛车：八分音符推进的小摇滚
  car: {
    bpm: 126,
    sprintBpm: 152,
    meter: 4,
    key: 57,
    scale: 'minor',
    octave: 12,
    chords: [1, 6, 7, 1, 1, 6, 4, 5],
    melody: [
      [1, 1, 3, 1, 5, _, 3, 1],
      [6, 6, 8, 6, 10, _, 8, 6],
      [7, 7, 9, 7, 11, _, 9, 7],
      [8, _, 5, _, 8, 7, 5, 3],
      [1, 1, 3, 5, 8, _, 5, 3],
      [3, 3, 6, 8, 10, _, 8, 6],
      [4, 4, 6, 8, 6, _, 4, 6],
      [5, _, 7, _, 9, 7, 5, 7],
    ],
    lead: { type: 'square', env: 'pluck', gain: 0.6 },
    bass: 'pulse',
    pad: 'none',
    drums: 'k.hsk.hs',
    level: 1.2,
  },
  // 🚂 开火车：摇摆的「哐当哐当」
  train: {
    bpm: 116,
    sprintBpm: 144,
    meter: 4,
    key: 55,
    scale: 'major',
    octave: 12,
    chords: [1, 4, 1, 5, 1, 4, 5, 1],
    melody: [
      [1, _, 3, _, 5, _, 5, _],
      [6, _, 6, 5, 4, _, 4, _],
      [3, _, 5, 3, 1, _, 3, 5],
      [5, _, 5, 4, 2, _, _, _],
      [8, _, 8, 7, 5, _, 3, _],
      [4, _, 6, _, 8, _, 6, _],
      [7, _, 5, _, 2, 3, 4, _],
      [3, _, 2, _, 1, _, _, _],
    ],
    lead: { type: 'triangle', env: 'soft' },
    bass: 'boogie',
    pad: 'stab',
    drums: 'kbsbkbsb',
    level: 1.05,
    swing: 0.18,
  },
  // 🚀 火箭：钟琴的太空旋律 + 长音铺底
  rocket: {
    bpm: 96,
    sprintBpm: 120,
    meter: 4,
    key: 62,
    scale: 'minor',
    octave: 0,
    chords: [1, 6, 3, 7, 1, 6, 4, 5],
    melody: [
      [5, _, _, 8, 10, _, _, _],
      [8, _, _, 10, 6, _, _, _],
      [7, _, _, 5, 10, _, _, _],
      [9, _, _, 11, 7, _, _, _],
      [8, _, 5, _, 10, _, 8, _],
      [6, _, 8, _, 10, _, 8, _],
      [4, _, 6, _, 8, _, 6, _],
      [5, _, 7, _, 9, _, _, _],
    ],
    lead: { type: 'sine', env: 'bell' },
    bass: 'drone',
    pad: 'hold',
    drums: 'k...h...',
    level: 0.85,
  },
  // 🎈 热气球：飘着的华尔兹
  balloon: {
    bpm: 120,
    sprintBpm: 150,
    meter: 3,
    key: 65,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 5, 1, 1, 4, 5, 1],
    melody: [
      [5, _, 3, 4, 5, _],
      [6, _, 4, 5, 6, _],
      [7, _, _, 5, 9, _],
      [8, _, _, _, 5, _],
      [3, _, 5, _, 8, _],
      [8, _, 6, _, 4, _],
      [5, _, 7, _, 9, 7],
      [8, _, _, _, _, _],
    ],
    lead: { type: 'sine', env: 'soft', vibrato: 12 },
    bass: 'waltz',
    pad: 'stab',
    drums: 'k.b.b.',
    level: 1.05,
  },
  // 🏊 游泳：正弦波小跳音 + 水滴
  swim: {
    bpm: 112,
    sprintBpm: 140,
    meter: 4,
    key: 64,
    scale: 'major',
    octave: 0,
    chords: [1, 5, 6, 4, 1, 5, 4, 1],
    melody: [
      [3, 3, 5, _, 8, _, 5, _],
      [7, 7, 9, _, 5, _, 7, _],
      [8, 8, 6, _, 3, _, 6, _],
      [6, 6, 4, _, 8, _, 6, _],
      [5, _, 8, 7, 8, _, 10, _],
      [9, _, 7, 5, 7, _, 5, _],
      [4, _, 6, 8, 6, _, 4, 3],
      [5, _, 3, _, 1, _, _, _],
    ],
    lead: { type: 'sine', env: 'pluck' },
    bass: 'root',
    pad: 'stab',
    drums: 'k.p.k.pp',
    level: 0.9,
  },
  // 🪜 爬梯子：一级一级往上走
  ladder: {
    bpm: 108,
    sprintBpm: 136,
    meter: 4,
    key: 67,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 5, 1, 6, 4, 5, 1],
    melody: [
      [1, 2, 3, 4, 5, _, 5, _],
      [4, 5, 6, 7, 8, _, 8, _],
      [5, 6, 7, 8, 9, _, 7, _],
      [8, _, 5, _, 3, _, _, _],
      [3, 4, 5, 7, 8, _, 6, _],
      [6, 7, 8, 9, 8, _, 6, _],
      [7, 8, 9, 10, 9, _, 7, _],
      [8, _, 5, _, 8, _, _, _],
    ],
    lead: { type: 'square', env: 'pluck', gain: 0.55 },
    bass: 'walk',
    pad: 'none',
    drums: 'k.w.s.w.',
    level: 1.0,
  },
  // ⛏️ 挖宝：低一点的调皮跳音
  dig: {
    bpm: 104,
    sprintBpm: 130,
    meter: 4,
    key: 57,
    scale: 'minor',
    octave: 12,
    chords: [1, 4, 1, 5, 6, 4, 5, 1],
    melody: [
      [1, _, 1, 3, 5, _, 3, _],
      [4, _, 4, 6, 8, _, 6, _],
      [5, _, 3, 1, 3, _, 5, _],
      [5, _, 5, 7, 9, _, 7, 5],
      [6, _, 8, 6, 3, _, 6, _],
      [4, _, 6, 4, 1, _, 4, _],
      [2, _, 5, 7, 5, _, 2, _],
      [1, _, 3, _, 1, _, _, _],
    ],
    lead: { type: 'square', env: 'pluck', gain: 0.55 },
    bass: 'root',
    pad: 'none',
    drums: 'k.w.k.ww',
    level: 1.15,
  },
  // 🎣 钓鱼：慢悠悠的湖边小调
  fish: {
    bpm: 88,
    sprintBpm: 112,
    meter: 4,
    key: 67,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 1, 5, 1, 4, 5, 1],
    melody: [
      [3, _, _, 2, 1, _, _, _],
      [6, _, 5, _, 4, _, _, _],
      [5, _, 6, 5, 3, _, _, _],
      [2, _, _, _, 5, _, _, _],
      [3, _, 5, _, 8, _, _, _],
      [8, _, 6, _, 4, _, _, _],
      [5, _, 6, 5, 2, _, _, _],
      [1, _, _, _, _, _, _, _],
    ],
    lead: { type: 'triangle', env: 'soft' },
    bass: 'root',
    pad: 'hold',
    drums: '..b...b.',
    level: 0.85,
    swing: 0.2,
  },
  // 🏗️ 盖楼：叮叮当当的重复音
  tower: {
    bpm: 112,
    sprintBpm: 140,
    meter: 4,
    key: 65,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 1, 5, 1, 4, 5, 1],
    melody: [
      [1, 1, 1, _, 3, 3, 3, _],
      [4, 4, 4, _, 6, 6, 6, _],
      [5, 5, 5, _, 8, _, 5, _],
      [7, _, 5, _, 2, _, _, _],
      [3, 3, 5, _, 8, 8, 5, _],
      [6, 6, 8, _, 6, 6, 4, _],
      [5, 5, 7, _, 9, 7, 5, _],
      [8, _, 5, _, 1, _, _, _],
    ],
    lead: { type: 'square', env: 'pluck', gain: 0.5 },
    bass: 'oompah',
    pad: 'none',
    drums: 'k.w.s.w.',
    level: 1.45,
  },
  // 🌱 种花：轻轻的田园小调 + 分解和弦
  flower: {
    bpm: 92,
    sprintBpm: 116,
    meter: 4,
    key: 60,
    scale: 'major',
    octave: 12,
    chords: [1, 6, 4, 5, 1, 6, 2, 5],
    melody: [
      [5, _, _, 6, 5, _, 3, _],
      [8, _, _, 9, 8, _, 6, _],
      [6, _, _, 5, 4, _, 6, _],
      [5, _, _, 4, 2, _, _, _],
      [3, _, 5, _, 8, _, 7, _],
      [6, _, 8, _, 10, _, 8, _],
      [6, _, 5, _, 4, _, 2, _],
      [5, _, _, _, 7, _, _, _],
    ],
    lead: { type: 'sine', env: 'soft' },
    bass: 'root',
    pad: 'arp',
    drums: '........',
    level: 0.85,
  },
  // 🐣 孵蛋：「咯咯哒」的方波跳音
  egg: {
    bpm: 116,
    sprintBpm: 144,
    meter: 4,
    key: 62,
    scale: 'major',
    octave: 12,
    chords: [1, 4, 5, 1, 1, 4, 5, 1],
    melody: [
      [5, 5, 5, 3, 1, _, _, _],
      [4, 4, 4, 6, 8, _, _, _],
      [7, 7, 7, 5, 2, _, 5, _],
      [3, _, 1, _, 1, _, _, _],
      [8, _, 7, 6, 5, _, 3, _],
      [6, _, 5, 4, 4, _, 6, _],
      [5, _, 6, 7, 9, _, 7, _],
      [8, _, 5, _, 3, _, 1, _],
    ],
    lead: { type: 'square', env: 'pluck', gain: 0.5 },
    bass: 'oompah',
    pad: 'none',
    drums: 'k.wwk.w.',
    level: 1.45,
  },
  // 🫧 吹泡泡：往上跳的泡泡旋律
  bubble: {
    bpm: 104,
    sprintBpm: 130,
    meter: 4,
    key: 69,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 6, 5, 1, 4, 5, 1],
    melody: [
      [1, _, 5, _, 8, _, _, _],
      [6, _, 8, _, 11, _, _, _],
      [6, _, 8, _, 10, _, 8, _],
      [9, _, 7, _, 5, _, _, _],
      [3, _, 5, 8, 10, _, 8, _],
      [4, _, 6, 8, 11, _, 8, _],
      [5, _, 7, 9, 12, _, 9, _],
      [8, _, 5, _, 8, _, _, _],
    ],
    lead: { type: 'sine', env: 'pluck' },
    bass: 'root',
    pad: 'hold',
    drums: 'k.p...p.',
    level: 0.8,
  },
  // 🍎 摘果子：带摇摆的乡村小调
  fruit: {
    bpm: 108,
    sprintBpm: 134,
    meter: 4,
    key: 67,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 1, 5, 1, 4, 5, 1],
    melody: [
      [5, _, 5, 6, 5, _, 3, _],
      [4, _, 4, 5, 6, _, 4, _],
      [3, _, 3, 4, 5, _, 8, _],
      [7, _, 6, _, 5, _, _, _],
      [8, _, 8, 7, 8, _, 5, _],
      [6, _, 6, 5, 4, _, 6, _],
      [5, _, 5, 6, 7, _, 2, _],
      [3, _, 2, _, 1, _, _, _],
    ],
    lead: { type: 'triangle', env: 'pluck' },
    bass: 'oompah',
    pad: 'stab',
    drums: 'k.b.k.bb',
    level: 1.15,
    swing: 0.2,
  },
  // ⭐ 点亮星星：八音盒一样的钟琴，没有鼓
  stars: {
    bpm: 84,
    sprintBpm: 104,
    meter: 3,
    key: 63,
    scale: 'major',
    octave: 12,
    chords: [1, 4, 1, 5, 1, 4, 5, 1],
    melody: [
      [1, _, 5, _, 8, _],
      [6, _, 8, _, 6, _],
      [5, _, 3, _, 5, _],
      [9, _, 7, _, 5, _],
      [8, _, 10, _, 8, _],
      [8, _, 6, _, 4, _],
      [7, _, 9, _, 7, _],
      [8, _, _, _, _, _],
    ],
    lead: { type: 'sine', env: 'bell' },
    bass: 'waltz',
    pad: 'hold',
    drums: '......',
    level: 1.0,
  },
  // 🧩 拼图：想一想的轻旋律 + 分解和弦
  puzzle: {
    bpm: 96,
    sprintBpm: 120,
    meter: 4,
    key: 62,
    scale: 'major',
    octave: 12,
    chords: [1, 6, 2, 5, 1, 4, 5, 1],
    melody: [
      [3, _, 2, 3, 5, _, 3, _],
      [8, _, 7, 8, 6, _, _, _],
      [4, _, 3, 4, 6, _, 4, _],
      [5, _, 4, 3, 2, _, _, _],
      [3, _, 5, _, 8, _, 7, _],
      [6, _, 8, _, 6, _, 4, _],
      [5, _, 7, _, 9, _, 7, _],
      [8, _, _, _, _, _, _, _],
    ],
    lead: { type: 'triangle', env: 'soft' },
    bass: 'walk',
    pad: 'arp',
    drums: '..w...w.',
    level: 0.95,
  },
  // 🪢 拔河：「嘿哟嘿哟」的进行曲
  tug: {
    bpm: 104,
    sprintBpm: 130,
    meter: 4,
    key: 58,
    scale: 'major',
    octave: 12,
    chords: [1, 5, 1, 5, 4, 1, 5, 1],
    melody: [
      [1, _, 5, _, 1, _, 5, _],
      [5, _, 2, _, 5, _, 7, _],
      [3, _, 3, 5, 8, _, 5, _],
      [9, _, 7, _, 5, _, _, _],
      [4, _, 6, _, 8, _, 6, _],
      [5, _, 3, _, 8, _, 5, _],
      [7, _, 9, _, 5, _, 2, _],
      [1, _, _, _, 1, _, _, _],
    ],
    lead: { type: 'square', env: 'hold', gain: 0.5 },
    bass: 'oompah',
    pad: 'none',
    drums: 'k.s.k.ss',
    level: 0.6,
  },
  // ⚖️ 跷跷板：一高一低来回跳
  seesaw: {
    bpm: 100,
    sprintBpm: 124,
    meter: 4,
    key: 65,
    scale: 'major',
    octave: 0,
    chords: [1, 4, 5, 1, 1, 4, 5, 1],
    melody: [
      [1, _, 8, _, 3, _, 8, _],
      [4, _, 8, _, 6, _, 8, _],
      [5, _, 9, _, 7, _, 9, _],
      [8, _, 5, _, 3, _, 1, _],
      [3, _, 10, _, 5, _, 10, _],
      [6, _, 11, _, 8, _, 11, _],
      [7, _, 9, _, 5, _, 9, _],
      [8, _, _, _, 1, _, _, _],
    ],
    lead: { type: 'triangle', env: 'pluck' },
    bass: 'root',
    pad: 'stab',
    drums: 'k.w.k.w.',
    level: 0.95,
  },
  // 🚩 抢旗：号角一样的进行曲
  flag: {
    bpm: 116,
    sprintBpm: 144,
    meter: 4,
    key: 60,
    scale: 'major',
    octave: 12,
    chords: [1, 1, 5, 1, 4, 1, 5, 1],
    melody: [
      [5, _, 5, 8, 10, _, 8, _],
      [5, _, 3, 5, 8, _, _, _],
      [7, _, 7, 9, 12, _, 9, _],
      [8, _, 5, _, 3, _, _, _],
      [4, _, 6, 8, 6, _, 4, _],
      [5, _, 8, _, 10, _, 8, _],
      [9, _, 7, _, 5, _, 7, _],
      [8, _, _, _, _, _, _, _],
    ],
    lead: { type: 'sawtooth', env: 'hold', gain: 0.4 },
    bass: 'oompah',
    pad: 'none',
    drums: 'k.s.kss.',
    level: 1.2,
  },
  // 🧊 融冰：冰晶一样的钟琴
  ice: {
    bpm: 92,
    sprintBpm: 116,
    meter: 4,
    key: 59,
    scale: 'minor',
    octave: 12,
    chords: [1, 6, 3, 7, 1, 6, 4, 5],
    melody: [
      [8, _, 5, _, 3, _, 5, _],
      [6, _, 8, _, 10, _, 8, _],
      [7, _, 5, _, 3, _, 5, _],
      [9, _, 7, _, 4, _, _, _],
      [5, _, 8, _, 10, _, 12, _],
      [10, _, 8, _, 6, _, 8, _],
      [6, _, 4, _, 8, _, 6, _],
      [5, _, 7, _, 9, _, _, _],
    ],
    lead: { type: 'sine', env: 'bell' },
    bass: 'drone',
    pad: 'hold',
    drums: '..h...h.',
    level: 0.9,
  },
  // 🏰 拆城堡：中世纪风，空五度持续低音 + 手鼓
  castle: {
    bpm: 108,
    sprintBpm: 134,
    meter: 4,
    key: 62,
    scale: 'dorian',
    octave: 0,
    chords: [1, 7, 1, 4, 1, 7, 5, 1],
    melody: [
      [1, 2, 3, 5, 3, _, 1, _],
      [2, 3, 4, _, 2, _, -7, _],
      [3, 4, 5, _, 8, _, 5, _],
      [6, _, 4, 5, 8, _, 6, _],
      [5, _, 8, _, 5, _, 3, _],
      [4, _, 2, 3, 7, _, _, _],
      [5, _, 7, _, 9, _, 7, _],
      [8, _, 5, _, 1, _, _, _],
    ],
    lead: { type: 'square', env: 'hold', gain: 0.45 },
    bass: 'drone',
    pad: 'none',
    drums: 'k.w.k.ww',
    level: 0.65,
  },
}

export function tuneOf(skinId: string): Tune {
  return TUNES[skinId] ?? TUNES.race!
}

/** 调内级数 → MIDI：1 = 主音，8 = 高八度；负数是低一个八度的那一级 */
export function degreeMidi(t: Tune, degree: number, octave = t.octave): number {
  const idx = degree > 0 ? degree - 1 : -degree - 1 - 7
  const sc = SCALES[t.scale]
  const oct = Math.floor(idx / 7)
  const n = ((idx % 7) + 7) % 7
  return t.key + octave + 12 * oct + sc[n]!
}

/** 和弦（以级数 root 为根）里的三个音在调内的位置 0…6 */
export function chordTones(root: number): number[] {
  return [0, 2, 4].map((k) => (((root - 1 + k) % 7) + 7) % 7)
}

/** 级数在调内的位置 0…6（不论八度） */
export function degreeClass(degree: number): number {
  const idx = degree > 0 ? degree - 1 : -degree - 1
  return ((idx % 7) + 7) % 7
}

/** 强拍：4/4 的第 1、3 拍（第 0、4 步），3/4 的第 1 拍（第 0 步） */
export function strongSteps(meter: 3 | 4): number[] {
  return meter === 4 ? [0, 4] : [0]
}

const midiHz = (n: number): number => 440 * 2 ** ((n - 69) / 12)

/** 只用到 AudioContext 的这几样（测试用假的） */
export type MusicContext = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'> &
  Partial<Pick<AudioContext, 'createBuffer' | 'createBufferSource' | 'createBiquadFilter' | 'sampleRate'>>

/** 各层的音量（乘在 MUSIC_VOLUME 上） */
const MIX = { lead: 0.55, bass: 0.75, pad: 0.12, arp: 0.2 }
const DRUM: Record<string, { gain: number; f?: number; q?: number; d: number; tone?: [number, number] }> = {
  k: { gain: 0.75, d: 0.16, tone: [120, 45] },
  s: { gain: 0.32, d: 0.12, f: 1800, q: 0.7 },
  h: { gain: 0.12, d: 0.04, f: 8000, q: 0.8 },
  b: { gain: 0.14, d: 0.09, f: 5000, q: 0.5 },
  w: { gain: 0.3, d: 0.05, tone: [900, 700] },
  c: { gain: 0.25, d: 0.08, f: 1500, q: 1.2 },
  p: { gain: 0.26, d: 0.08, tone: [1400, 700] },
}

export class MusicPlayer {
  private timer: ReturnType<typeof setInterval> | null = null
  private gain: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private next = 0
  private step = 0
  private skin = 'race'
  private sprint = false
  private ducked = false

  /**
   * 默认的定时器要包一层：原生 setInterval / clearInterval 存成字段再用 this.xxx() 调，浏览器按「方法」调用、this 是本实例，
   * 直接抛 Illegal invocation（续排一直失败，音乐只在状态变化时响一小段；单测注入的是普通函数，没测出来）
   */
  constructor(
    private readonly ac: MusicContext,
    private readonly setIntervalFn: (fn: () => void, ms: number) => ReturnType<typeof setInterval> = (fn, ms) => setInterval(fn, ms),
    private readonly clearIntervalFn: (id: ReturnType<typeof setInterval>) => void = (id) => clearInterval(id),
  ) {}

  get playing(): boolean {
    return this.timer !== null
  }

  get tune(): Tune {
    return tuneOf(this.skin)
  }

  private volume(): number {
    return MUSIC_VOLUME * this.tune.level * (this.ducked ? MUSIC_DUCK : 1)
  }

  private ensureGain(): GainNode {
    if (!this.gain) {
      this.gain = this.ac.createGain()
      this.gain.gain.value = this.volume()
      this.gain.connect(this.ac.destination)
    }
    return this.gain
  }

  start(skinId: string, sprint = false): void {
    this.skin = skinId
    this.sprint = sprint
    if (this.timer) return
    this.ensureGain().gain.value = this.volume()
    this.step = 0
    this.next = this.ac.currentTime + 0.05
    this.tick()
    this.timer = this.setIntervalFn(() => this.tick(), TICK_MS)
  }

  /** 冲刺（到 6 分起）：换成这首的快速度、空拍加镲；下一步起生效 */
  setSprint(on: boolean): void {
    this.sprint = on
  }

  /** 朗读 / 语音时压低 */
  duck(on: boolean): void {
    this.ducked = on
    if (!this.gain) return
    const g = this.gain.gain
    if (typeof g.setTargetAtTime === 'function') g.setTargetAtTime(this.volume(), this.ac.currentTime, 0.08)
    else g.value = this.volume()
  }

  stop(): void {
    if (this.timer) this.clearIntervalFn(this.timer)
    this.timer = null
  }

  /** 一步（八分音符）多长 */
  stepDur(): number {
    const t = this.tune
    return 60 / (this.sprint ? t.sprintBpm : t.bpm) / 2
  }

  private tick(): void {
    const horizon = this.ac.currentTime + LOOKAHEAD_S
    const perBar = this.tune.meter * 2
    const total = perBar * BARS
    while (this.next < horizon) {
      const swing = this.step % 2 === 1 ? (this.tune.swing ?? 0) * this.stepDur() : 0
      this.schedule(this.step, this.next + swing)
      this.next += this.stepDur()
      this.step = (this.step + 1) % total
    }
  }

  private note(freq: number, at: number, dur: number, voice: Voice, peak: number): void {
    const osc = this.ac.createOscillator()
    const env = this.ac.createGain()
    osc.type = voice.type
    osc.frequency.value = freq
    const g = env.gain
    g.setValueAtTime(0.0001, at)
    switch (voice.env) {
      case 'pluck':
        g.exponentialRampToValueAtTime(peak, at + 0.006)
        g.exponentialRampToValueAtTime(0.0001, at + Math.max(0.12, dur))
        break
      case 'hold':
        g.exponentialRampToValueAtTime(peak, at + 0.015)
        g.setValueAtTime(peak * 0.8, at + dur * 0.75)
        g.exponentialRampToValueAtTime(0.0001, at + dur)
        break
      case 'soft':
        g.exponentialRampToValueAtTime(peak, at + 0.05)
        g.exponentialRampToValueAtTime(0.0001, at + dur * 1.2)
        break
      case 'bell':
        g.exponentialRampToValueAtTime(peak, at + 0.004)
        g.exponentialRampToValueAtTime(0.0001, at + Math.max(0.9, dur))
        break
    }
    osc.connect(env)
    env.connect(this.ensureGain())
    const end = at + (voice.env === 'bell' ? Math.max(0.9, dur) : voice.env === 'soft' ? dur * 1.2 : dur) + 0.02
    // 颤音：一个慢振荡器接到 detune 上（假上下文没有 detune 就算了）
    if (voice.vibrato && osc.detune) {
      const lfo = this.ac.createOscillator()
      const depth = this.ac.createGain()
      lfo.frequency.value = 5.5
      depth.gain.value = voice.vibrato
      lfo.connect(depth)
      depth.connect(osc.detune)
      lfo.start(at)
      lfo.stop(end)
    }
    osc.start(at)
    osc.stop(end)
    // 钟琴：再叠一个高八度的泛音，亮一点
    if (voice.env === 'bell') this.note(freq * 2, at, dur * 0.5, { type: 'sine', env: 'pluck' }, peak * 0.3)
  }

  private noise(): AudioBuffer | null {
    if (this.noiseBuf) return this.noiseBuf
    if (!this.ac.createBuffer || !this.ac.sampleRate) return null
    const len = Math.floor(this.ac.sampleRate * 0.5)
    const buf = this.ac.createBuffer(1, len, this.ac.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuf = buf
    return buf
  }

  private drum(ch: string, at: number): void {
    const d = DRUM[ch]
    if (!d) return
    if (d.tone) {
      const osc = this.ac.createOscillator()
      const env = this.ac.createGain()
      osc.type = ch === 'k' ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(d.tone[0], at)
      osc.frequency.exponentialRampToValueAtTime(d.tone[1], at + d.d)
      env.gain.setValueAtTime(0.0001, at)
      env.gain.exponentialRampToValueAtTime(d.gain, at + 0.004)
      env.gain.exponentialRampToValueAtTime(0.0001, at + d.d)
      osc.connect(env)
      env.connect(this.ensureGain())
      osc.start(at)
      osc.stop(at + d.d + 0.02)
      return
    }
    const buf = this.noise()
    if (!buf || !this.ac.createBufferSource || !this.ac.createBiquadFilter) return
    const src = this.ac.createBufferSource()
    src.buffer = buf
    const bp = this.ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = d.f ?? 2000
    bp.Q.value = d.q ?? 1
    const env = this.ac.createGain()
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(d.gain, at + 0.003)
    env.gain.exponentialRampToValueAtTime(0.0001, at + d.d)
    src.connect(bp)
    bp.connect(env)
    env.connect(this.ensureGain())
    src.start(at)
    src.stop(at + d.d + 0.02)
  }

  /** 这一步旋律音能延续几步（到下一个音或小节末，最多 4 步） */
  private holdSteps(bar: readonly (number | null)[], i: number): number {
    let n = 1
    while (i + n < bar.length && bar[i + n] === null && n < 4) n++
    return n
  }

  private schedule(step: number, at: number): void {
    const t = this.tune
    const perBar = t.meter * 2
    const barIdx = Math.floor(step / perBar) % BARS
    const i = step % perBar
    const bar = t.melody[barIdx] ?? []
    const chord = t.chords[barIdx] ?? 1
    const sd = this.stepDur()
    // 主旋律
    const m = bar[i]
    if (m !== null && m !== undefined) this.note(midiHz(degreeMidi(t, m)), at, sd * this.holdSteps(bar, i) * 0.95, t.lead, MIX.lead * (t.lead.gain ?? 1))
    // 低音
    const root = (deg: number) => {
      let n = degreeMidi(t, deg, -24)
      while (n < 36) n += 12
      return n
    }
    const r = root(chord)
    const fifth = root(chord + 4)
    const third = root(chord + 2)
    const sixth = root(chord + 5)
    const bass = (n: number, steps: number, k = 1) => this.note(midiHz(n), at, sd * steps, { type: 'sine', env: 'soft' }, MIX.bass * k)
    switch (t.bass) {
      case 'root':
        if (i === 0) bass(r, perBar / 2)
        else if (i === perBar / 2 && t.meter === 4) bass(fifth, perBar / 2)
        break
      case 'oompah':
        if (i === 0) bass(r, 1.5)
        else if (i === (t.meter === 4 ? 4 : 2)) bass(fifth, 1.5)
        break
      case 'walk':
        if (i % 2 === 0) bass([r, third, fifth, sixth][i / 2] ?? r, 2)
        break
      case 'pulse':
        bass(r, 0.9)
        break
      case 'boogie':
        if (i % 2 === 0) bass([r, fifth, sixth, fifth][i / 2] ?? r, 2)
        break
      case 'waltz':
        if (i === 0) bass(r, 2)
        break
      case 'drone':
        // 整小节的长音两个一起响，比别的走法厚得多：各压低一些
        if (i === 0) {
          bass(r, perBar, 0.55)
          bass(r + 7, perBar, 0.4)
        }
        break
    }
    // 铺底和弦
    const tones = [chord, chord + 2, chord + 4].map((d) => degreeMidi(t, d, 0))
    const padVoice: Voice = { type: 'sine', env: 'soft' }
    switch (t.pad) {
      case 'hold':
        if (i === 0) for (const n of tones) this.note(midiHz(n), at, sd * perBar, padVoice, MIX.pad)
        break
      case 'stab':
        if (t.meter === 4 ? i === 2 || i === 6 : i === 2 || i === 4) for (const n of tones) this.note(midiHz(n), at, sd * 0.9, { type: 'triangle', env: 'pluck' }, MIX.pad * 1.4)
        break
      case 'arp': {
        const seq = [tones[0]!, tones[1]!, tones[2]!, tones[0]! + 12, tones[2]!, tones[1]!]
        this.note(midiHz(seq[i % seq.length]!), at, sd * 1.5, { type: 'sine', env: 'pluck' }, MIX.arp)
        break
      }
      case 'none':
        break
    }
    // 鼓点：冲刺时空的反拍加一下镲
    const ch = t.drums[i] ?? '.'
    if (ch !== '.') this.drum(ch, at)
    else if (this.sprint && i % 2 === 1) this.drum('h', at)
  }
}

let player: MusicPlayer | null = null
let unsubscribeDuck: (() => void) | null = null

function ensurePlayer(): MusicPlayer | null {
  if (player) return player
  const ac = audioContext()
  if (!ac) return null
  player = new MusicPlayer(ac)
  unsubscribeDuck = subscribeDuck((on) => player?.duck(on))
  return player
}

/** 开始放这个游戏的曲子（已经在放就从头换成这首）；静音时什么都不做 */
export function startMusic(skinId: string, sprint = false): void {
  if (!soundOn.value) return
  const p = ensurePlayer()
  if (!p) return
  if (p.playing) {
    p.stop()
  }
  p.start(skinId, sprint)
}

export function setMusicSprint(on: boolean): void {
  player?.setSprint(on)
}

export function stopMusic(): void {
  player?.stop()
}

export function musicPlaying(): boolean {
  return player?.playing ?? false
}

/** 给测试：换掉全局的播放器 */
export function _resetMusic(): void {
  player?.stop()
  unsubscribeDuck?.()
  unsubscribeDuck = null
  player = null
}
