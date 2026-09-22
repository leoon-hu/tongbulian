import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BPM, LOOKAHEAD_S, MUSIC_DUCK, MUSIC_VOLUME, MusicPlayer, SPRINT_BPM, STEPS, TUNES, type MusicContext } from '../music'

/** 假 AudioContext：记下排上去的音符（时刻、频率） */
function fakeContext() {
  const scheduled: { at: number; freq: number; type: string }[] = []
  const gains: { value: number; targets: number[] }[] = []
  const ac = {
    currentTime: 0,
    destination: {},
    createOscillator: () => {
      const osc = {
        type: 'sine',
        frequency: { value: 0 },
        connect() {},
        start(at: number) {
          scheduled.push({ at, freq: osc.frequency.value, type: osc.type })
        },
        stop() {},
      }
      return osc
    },
    createGain: () => {
      const g = { value: 0, targets: [] as number[] }
      gains.push(g)
      return {
        gain: {
          get value() {
            return g.value
          },
          set value(v: number) {
            g.value = v
          },
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
          setTargetAtTime(v: number) {
            g.targets.push(v)
          },
        },
        connect() {},
      }
    },
  }
  return { ac: ac as unknown as MusicContext, scheduled, gains, tick: (s: number) => (ac.currentTime += s) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('背景音乐（B68）', () => {
  it('四种类别各一段 16 步的旋律与低音，音高都在合理范围', () => {
    for (const t of Object.values(TUNES)) {
      expect(t.melody).toHaveLength(STEPS)
      expect(t.bass).toHaveLength(STEPS)
      expect(t.melody.some((n) => n > 0)).toBe(true)
      for (const n of [...t.melody, ...t.bass]) expect(n === 0 || (n >= 36 && n <= 96)).toBe(true)
    }
  })

  it('开始后按节拍提前排音符，时钟走了继续排；冲刺后步长变短；停了不再排；压低只改增益', () => {
    const f = fakeContext()
    const p = new MusicPlayer(f.ac)
    expect(p.playing).toBe(false)
    p.start('race')
    expect(p.playing).toBe(true)
    // 第一次 tick 就把 LOOKAHEAD_S 内的排上（至少第一步）
    const first = f.scheduled.length
    expect(first).toBeGreaterThan(0)
    const step = 60 / BPM / 2
    // 时钟走 1 秒：再排后面的，相邻两步隔一个八分音符，排到的不超过 LOOKAHEAD_S + 一步
    f.tick(1)
    vi.advanceTimersByTime(200)
    expect(f.scheduled.length).toBeGreaterThan(first)
    const ats = [...new Set(f.scheduled.map((s) => s.at))].sort((a, b) => a - b)
    expect(ats[1]! - ats[0]!).toBeCloseTo(step, 5)
    expect(ats.at(-1)!).toBeLessThan(1 + LOOKAHEAD_S + step)
    // 冲刺：新排的步长按 SPRINT_BPM
    p.setSprint(true)
    const before = f.scheduled.length
    f.tick(1)
    vi.advanceTimersByTime(200)
    const later = [...new Set(f.scheduled.slice(before).map((s) => s.at))].sort((a, b) => a - b)
    expect(later[1]! - later[0]!).toBeCloseTo(60 / SPRINT_BPM / 2, 5)
    // 主增益：开始是 MUSIC_VOLUME，压低后目标是 MUSIC_VOLUME × MUSIC_DUCK
    expect(f.gains[0]!.value).toBeCloseTo(MUSIC_VOLUME, 5)
    p.duck(true)
    expect(f.gains[0]!.targets.at(-1)).toBeCloseTo(MUSIC_VOLUME * MUSIC_DUCK, 5)
    p.duck(false)
    expect(f.gains[0]!.targets.at(-1)).toBeCloseTo(MUSIC_VOLUME, 5)
    p.stop()
    expect(p.playing).toBe(false)
    const n = f.scheduled.length
    f.tick(2)
    vi.advanceTimersByTime(500)
    expect(f.scheduled.length).toBe(n)
    // 再开始：从头
    p.start('tug', true)
    expect(p.playing).toBe(true)
    expect(f.scheduled.length).toBeGreaterThan(n)
    p.stop()
  })
})
