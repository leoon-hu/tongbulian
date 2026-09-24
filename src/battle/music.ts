/**
 * 背景音乐（需求 B68）：竞技场里一段合成的小循环——WebAudio 振荡器现场发声，没有音频文件、离线可用。
 * 按游戏类别（并行 / 拉锯 / 消耗 / 成长）各一段 16 步的旋律 + 低音，冲刺时加快；朗读、语音时压低；结果页停。
 * 调度用「提前排」的老办法：每 TICK_MS 看一次，把 LOOKAHEAD_S 内的音符按 AudioContext 的时钟排上去，不受 setTimeout 抖动影响。
 * AudioContext 可注入（测试用假的）；静音开关（engine/sound）关着时不放。
 */
import { audioContext, subscribeDuck } from '@/engine/audio'
import { soundOn } from '@/engine/sound'
import type { SkinKind } from './skins'

/** 音量：很轻，别盖住读题；压低（朗读 / 语音时）的倍数 */
export const MUSIC_VOLUME = 0.09
export const MUSIC_DUCK = 0.35
export const BPM = 108
export const SPRINT_BPM = 138
export const LOOKAHEAD_S = 0.3
export const TICK_MS = 100
/** 每段几步（八分音符） */
export const STEPS = 16

/** MIDI 音高，0 = 休止 */
type Note = number
export interface Tune {
  melody: Note[]
  bass: Note[]
  lead: OscillatorType
}

/** 四种类别各一段：都是五声音阶，孩子听着不腻 */
export const TUNES: Record<SkinKind, Tune> = {
  // 并行推进：轻快的跑跳
  race: {
    melody: [72, 74, 76, 0, 79, 76, 74, 0, 72, 74, 76, 79, 81, 79, 76, 0],
    bass: [48, 0, 55, 0, 48, 0, 55, 0, 53, 0, 60, 0, 55, 0, 52, 0],
    lead: 'triangle',
  },
  // 拉锯：一二一二的进行曲
  tug: {
    melody: [67, 67, 71, 0, 74, 0, 71, 67, 69, 69, 72, 0, 74, 0, 72, 69],
    bass: [43, 0, 43, 0, 50, 0, 50, 0, 45, 0, 45, 0, 50, 0, 50, 0],
    lead: 'square',
  },
  // 消耗：一点点神秘
  consume: {
    melody: [69, 0, 72, 74, 0, 76, 74, 72, 69, 0, 67, 69, 0, 64, 67, 69],
    bass: [45, 0, 0, 0, 52, 0, 0, 0, 43, 0, 0, 0, 47, 0, 0, 0],
    lead: 'triangle',
  },
  // 成长 / 建造 / 收集：轻轻的摇摆
  grow: {
    melody: [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 72, 74, 72, 0],
    bass: [48, 0, 0, 52, 0, 0, 55, 0, 50, 0, 0, 53, 0, 0, 55, 0],
    lead: 'sine',
  },
}

const midiHz = (n: number): number => 440 * 2 ** ((n - 69) / 12)

/** 只用到 AudioContext 的这几样（测试用假的） */
export type MusicContext = Pick<AudioContext, 'currentTime' | 'destination' | 'createOscillator' | 'createGain'>

export class MusicPlayer {
  private timer: ReturnType<typeof setInterval> | null = null
  private gain: GainNode | null = null
  private next = 0
  private step = 0
  private kind: SkinKind = 'race'
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

  private volume(): number {
    return MUSIC_VOLUME * (this.ducked ? MUSIC_DUCK : 1)
  }

  private ensureGain(): GainNode {
    if (!this.gain) {
      this.gain = this.ac.createGain()
      this.gain.gain.value = this.volume()
      this.gain.connect(this.ac.destination)
    }
    return this.gain
  }

  start(kind: SkinKind, sprint = false): void {
    this.kind = kind
    this.sprint = sprint
    if (this.timer) return
    this.ensureGain()
    this.step = 0
    this.next = this.ac.currentTime + 0.05
    this.tick()
    this.timer = this.setIntervalFn(() => this.tick(), TICK_MS)
  }

  /** 冲刺（到 6 分起）：加快；下一步起就按新节奏 */
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

  private stepDur(): number {
    return 60 / (this.sprint ? SPRINT_BPM : BPM) / 2
  }

  private tick(): void {
    const horizon = this.ac.currentTime + LOOKAHEAD_S
    while (this.next < horizon) {
      this.schedule(this.step, this.next)
      this.next += this.stepDur()
      this.step = (this.step + 1) % STEPS
    }
  }

  private note(freq: number, at: number, dur: number, type: OscillatorType, peak: number): void {
    const osc = this.ac.createOscillator()
    const env = this.ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0.0001, at)
    env.gain.exponentialRampToValueAtTime(peak, at + 0.012)
    env.gain.exponentialRampToValueAtTime(0.0001, at + dur)
    osc.connect(env)
    env.connect(this.ensureGain())
    osc.start(at)
    osc.stop(at + dur + 0.02)
  }

  private schedule(step: number, at: number): void {
    const tune = TUNES[this.kind]
    const dur = this.stepDur()
    const m = tune.melody[step] ?? 0
    const b = tune.bass[step] ?? 0
    if (m > 0) this.note(midiHz(m), at, dur * 0.9, tune.lead, 0.6)
    if (b > 0) this.note(midiHz(b), at, dur * 1.6, 'sine', 0.9)
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

/** 开始放这种类别的曲子（已经在放就只换类别 / 节奏）；静音时什么都不做 */
export function startMusic(kind: SkinKind, sprint = false): void {
  if (!soundOn.value) return
  const p = ensurePlayer()
  if (!p) return
  if (p.playing) {
    p.stop()
  }
  p.start(kind, sprint)
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
