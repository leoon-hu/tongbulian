/**
 * 对战音效（需求 B38）：用 WebAudio 振荡器与噪声现场合成——不要音频文件、没有授权问题、离线可用。
 * 用 engine/audio 的共享 AudioContext（首次触摸已解锁）；静音开关（engine/voice）关着时什么都不放。
 */
import { audioContext } from '@/engine/audio'
import { isVoiceEnabled } from '@/engine/voice'
import type { SkinKind } from './skins'

export type Sfx =
  | 'ding' // 得分
  | 'dingSoft' // 别人得分（小声）
  | 'dong' // 答错
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
  | 'launch' // 火箭：点火升空的轰鸣
  | 'fireworks' // 烟花：三声啪
  | 'burner' // 热气球：烧嘴呼的一下
  | 'heave' // 拔河：嘿哟一使劲
  | 'drip' // 融冰：水滴
  | 'stroke' // 游泳：哗啦一划
  | 'rung' // 爬梯子：手脚踩上横档的两下
  | 'pick' // 挖宝：镐刨进土里的一下
  | 'sting' // 反超：上行三音
  | 'alert' // 还差一分：嘀嘀 — 嘀

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
  dingSoft: { notes: [{ f: 880, at: 0, d: 0.1, gain: 0.35 }, { f: 1320, at: 0.09, d: 0.18, gain: 0.35 }] },
  dong: { notes: [{ f: 180, at: 0, d: 0.35, type: 'triangle', gain: 0.9, to: 120 }] },
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
}

/** 一种皮肤的音效：得分、连对、胜利各放哪几声（B38，按游戏各不一样） */
export interface SkinSounds {
  score: Sfx[]
  streak: Sfx[]
  win: Sfx[]
}

const KIND_SOUNDS: Record<SkinKind, SkinSounds> = {
  race: { score: ['whoosh'], streak: ['whoosh'], win: ['cheer'] },
  tug: { score: ['heave'], streak: ['heave', 'whoosh'], win: ['splash', 'cheer'] },
  consume: { score: ['crack'], streak: ['crack'], win: ['splash', 'cheer'] },
  grow: { score: ['thud'], streak: ['thud'], win: ['fireworks', 'cheer'] },
}

const SKIN_SOUNDS: Record<string, Partial<SkinSounds>> = {
  race: { score: ['patter'], streak: ['patter', 'whoosh'] },
  car: { score: ['vroom'], streak: ['nitro'] },
  rocket: { score: ['launch'], streak: ['launch'], win: ['fireworks', 'cheer'] },
  balloon: { score: ['burner'], streak: ['burner'] },
  swim: { score: ['stroke'], streak: ['stroke', 'whoosh'], win: ['splash', 'cheer'] },
  ladder: { score: ['rung'], streak: ['rung', 'whoosh'], win: ['fireworks', 'cheer'] },
  dig: { score: ['pick'], streak: ['pick', 'whoosh'], win: ['fireworks', 'cheer'] },
  tower: { score: ['thud'], streak: ['thud'], win: ['fireworks', 'cheer'] },
  tug: { score: ['heave'], streak: ['heave', 'whoosh'] },
  ice: { score: ['crack', 'drip'], streak: ['crack', 'drip'], win: ['splash', 'cheer'] },
}

/** 某种皮肤的音效表：先按类别给一套，再按皮肤覆盖 */
export function skinSfx(skinId: string, kind: SkinKind = 'race'): SkinSounds {
  return { ...KIND_SOUNDS[kind], ...(SKIN_SOUNDS[skinId] ?? {}) }
}

/** 弹出提示配的一声：反超上行三音、还差一分嘀嘀嘀、其它「啵」 */
export function calloutSfx(type: 'lead' | 'nearWin' | 'streak' | 'half'): Sfx {
  return type === 'lead' ? 'sting' : type === 'nearWin' ? 'alert' : 'pop'
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

/** 播一个音效；pitch 是音高倍率（连对时「叮」逐级升高，1 = 原样） */
export function playSfx(kind: Sfx, pitch = 1): void {
  if (!isVoiceEnabled()) return
  const ac = audioContext()
  if (!ac) return
  try {
    const t0 = ac.currentTime
    const pattern = PATTERNS[kind]
    for (const n of pattern.notes ?? []) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = n.type ?? 'sine'
      const start = t0 + n.at
      osc.frequency.setValueAtTime(n.f * pitch, start)
      if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to * pitch, start + n.d)
      const peak = (n.gain ?? 0.6) * 0.5
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      osc.connect(g)
      g.connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.d + 0.02)
    }
    for (const n of pattern.noise ?? []) {
      const src = ac.createBufferSource()
      src.buffer = noise(ac)
      const g = ac.createGain()
      const start = t0 + n.at
      const peak = (n.gain ?? 0.4) * 0.5
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
      g.connect(ac.destination)
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
