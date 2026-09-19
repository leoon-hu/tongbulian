/**
 * 对战音效（需求 B38）：用 WebAudio 振荡器与噪声现场合成——不要音频文件、没有授权问题、离线可用。
 * 用 engine/audio 的共享 AudioContext（首次触摸已解锁）；静音开关（engine/voice）关着时什么都不放。
 */
import { audioContext } from '@/engine/audio'
import { isVoiceEnabled } from '@/engine/voice'

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
