/**
 * 对战音效（需求 B38）：用 WebAudio 振荡器现场合成——不要音频文件、没有授权问题、离线可用。
 * 用 engine/audio 的共享 AudioContext（首次触摸已解锁）；静音开关（engine/voice）关着时什么都不放。
 */
import { audioContext } from '@/engine/audio'
import { isVoiceEnabled } from '@/engine/voice'

export type Sfx = 'ding' | 'dingSoft' | 'dong' | 'tick' | 'go' | 'fanfare'

interface Note {
  /** 频率（Hz） */
  f: number
  /** 起点（秒，相对本次播放） */
  at: number
  /** 时长（秒） */
  d: number
  type?: OscillatorType
  gain?: number
}

const PATTERNS: Record<Sfx, Note[]> = {
  ding: [
    { f: 880, at: 0, d: 0.12 },
    { f: 1320, at: 0.1, d: 0.22 },
  ],
  dingSoft: [
    { f: 880, at: 0, d: 0.1, gain: 0.35 },
    { f: 1320, at: 0.09, d: 0.18, gain: 0.35 },
  ],
  dong: [{ f: 160, at: 0, d: 0.35, type: 'triangle', gain: 0.9 }],
  tick: [{ f: 660, at: 0, d: 0.09, type: 'square', gain: 0.45 }],
  go: [{ f: 990, at: 0, d: 0.32, type: 'square', gain: 0.5 }],
  fanfare: [
    { f: 523, at: 0, d: 0.16 },
    { f: 659, at: 0.16, d: 0.16 },
    { f: 784, at: 0.32, d: 0.16 },
    { f: 1047, at: 0.48, d: 0.5 },
  ],
}

export function playSfx(kind: Sfx): void {
  if (!isVoiceEnabled()) return
  const ac = audioContext()
  if (!ac) return
  try {
    const t0 = ac.currentTime
    for (const n of PATTERNS[kind]) {
      const osc = ac.createOscillator()
      const g = ac.createGain()
      osc.type = n.type ?? 'sine'
      osc.frequency.value = n.f
      const peak = (n.gain ?? 0.6) * 0.5
      const start = t0 + n.at
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(peak, start + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, start + n.d)
      osc.connect(g)
      g.connect(ac.destination)
      osc.start(start)
      osc.stop(start + n.d + 0.02)
    }
  } catch {
    // 上下文没就绪 / 环境不支持：音效不是必需的
  }
}
