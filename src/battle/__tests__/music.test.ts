import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SKINS } from '../skins'
import {
  BARS,
  LOOKAHEAD_S,
  MUSIC_DUCK,
  MUSIC_VOLUME,
  MusicPlayer,
  TUNES,
  chordTones,
  degreeClass,
  degreeMidi,
  strongSteps,
  tuneOf,
  type MusicContext,
} from '../music'

/** 假 AudioContext：记下排上去的音（时刻、频率、波形） */
function fakeContext() {
  const scheduled: { at: number; freq: number; type: string }[] = []
  const gains: { value: number; targets: number[] }[] = []
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} })
  const ac = {
    currentTime: 0,
    sampleRate: 8000,
    destination: {},
    createOscillator: () => {
      const osc = {
        type: 'sine',
        frequency: param(),
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
    createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }),
    createBufferSource: () => ({
      buffer: null,
      connect() {},
      start(at: number) {
        scheduled.push({ at, freq: 0, type: 'noise' })
      },
      stop() {},
    }),
    createBiquadFilter: () => ({ type: 'bandpass', frequency: { value: 0 }, Q: { value: 0 }, connect() {} }),
  }
  return { ac: ac as unknown as MusicContext, scheduled, gains, tick: (s: number) => (ac.currentTime += s) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const DRUM_CHARS = /^[kshbwcp.]+$/

describe('背景音乐（B68 / B73）', () => {
  it('每个游戏一首（不同游戏的旋律都不一样）；没登记的皮肤用赛跑那首', () => {
    for (const s of SKINS) expect(TUNES[s.id], s.id).toBeDefined()
    const heads = SKINS.map((s) => JSON.stringify([TUNES[s.id]!.key, TUNES[s.id]!.melody]))
    expect(new Set(heads).size).toBe(SKINS.length)
    expect(tuneOf('nope')).toBe(TUNES.race)
  })

  it('每首 8 小节、每小节一个和弦、一组 meter × 2 步的旋律；鼓点一小节一个模板；速度合理、冲刺更快', () => {
    for (const [id, t] of Object.entries(TUNES)) {
      const per = t.meter * 2
      expect(t.chords, id).toHaveLength(BARS)
      expect(t.melody, id).toHaveLength(BARS)
      for (const bar of t.melody) expect(bar, id).toHaveLength(per)
      expect(t.drums, id).toHaveLength(per)
      expect(t.drums, id).toMatch(DRUM_CHARS)
      expect(t.bpm, id).toBeGreaterThanOrEqual(80)
      expect(t.bpm, id).toBeLessThanOrEqual(132)
      expect(t.sprintBpm, id).toBeGreaterThan(t.bpm)
      expect(t.swing ?? 0, id).toBeLessThanOrEqual(0.3)
      expect(t.level >= 0.5 && t.level <= 1.5, id).toBe(true)
      for (const c of t.chords) expect(c >= 1 && c <= 7, id).toBe(true)
    }
  })

  it('旋律的强拍都落在这一小节的和弦音上（听着不别扭）；音高在 55–92 之间；每首都有旋律', () => {
    for (const [id, t] of Object.entries(TUNES)) {
      let notes = 0
      t.melody.forEach((bar, b) => {
        const tones = chordTones(t.chords[b]!)
        for (const i of strongSteps(t.meter)) {
          const d = bar[i]
          if (d === null || d === undefined) continue
          expect(tones, `${id} 第 ${b + 1} 小节第 ${i} 步的 ${d}`).toContain(degreeClass(d))
        }
        for (const d of bar) {
          if (d === null) continue
          notes++
          const m = degreeMidi(t, d)
          expect(m >= 55 && m <= 92, `${id} ${d} → ${m}`).toBe(true)
        }
      })
      expect(notes, id).toBeGreaterThan(BARS)
    }
  })

  it('级数换算：1 是主音、8 高八度、−5 是低一个八度的 sol；小调、多利亚按各自的音阶', () => {
    const c = { ...TUNES.race!, key: 60, octave: 0, scale: 'major' as const }
    expect(degreeMidi(c, 1)).toBe(60)
    expect(degreeMidi(c, 3)).toBe(64)
    expect(degreeMidi(c, 8)).toBe(72)
    expect(degreeMidi(c, -5)).toBe(55)
    expect(degreeMidi(c, -7)).toBe(59)
    expect(degreeMidi({ ...c, scale: 'minor' }, 3)).toBe(63)
    expect(degreeMidi({ ...c, scale: 'dorian' }, 6)).toBe(69)
    expect(chordTones(5)).toEqual([4, 6, 1])
    expect(degreeClass(10)).toBe(2)
  })

  it('默认定时器：原生 setInterval / clearInterval 不能当别的对象的方法调（浏览器抛 Illegal invocation）', () => {
    const strict = <T,>(ret: T) =>
      function (this: unknown): T {
        if (this !== undefined && this !== globalThis) throw new TypeError('Illegal invocation')
        return ret
      }
    const set = vi.spyOn(globalThis, 'setInterval').mockImplementation(strict(7 as unknown as ReturnType<typeof setInterval>) as unknown as typeof setInterval)
    const clear = vi.spyOn(globalThis, 'clearInterval').mockImplementation(strict(undefined) as unknown as typeof clearInterval)
    try {
      const p = new MusicPlayer(fakeContext().ac)
      expect(() => p.start('race')).not.toThrow()
      expect(p.playing).toBe(true)
      expect(() => p.stop()).not.toThrow()
      expect(set).toHaveBeenCalledOnce()
      expect(clear).toHaveBeenCalledWith(7)
    } finally {
      set.mockRestore()
      clear.mockRestore()
    }
  })

  it('开始后按这首的节拍提前排音，时钟走了继续排；冲刺后步长按这首的快速度；停了不再排；压低只改增益', () => {
    const f = fakeContext()
    const p = new MusicPlayer(f.ac)
    expect(p.playing).toBe(false)
    p.start('race')
    expect(p.playing).toBe(true)
    const first = f.scheduled.length
    expect(first).toBeGreaterThan(0)
    const step = 60 / TUNES.race!.bpm / 2
    expect(p.stepDur()).toBeCloseTo(step, 6)
    f.tick(1)
    vi.advanceTimersByTime(200)
    expect(f.scheduled.length).toBeGreaterThan(first)
    // 每个音都落在「第一步 + 整数步」上（有的步是空的，所以只查整数倍）
    const ats = [...new Set(f.scheduled.map((s) => s.at))].sort((a, b) => a - b)
    for (const at of ats) expect(Math.abs((at - ats[0]!) / step - Math.round((at - ats[0]!) / step))).toBeLessThan(1e-6)
    expect(ats.at(-1)!).toBeLessThan(1 + LOOKAHEAD_S + step)
    // 鼓点也排上了（赛跑有大鼓和木鱼）
    expect(f.scheduled.some((s) => s.type === 'sine' && s.freq === 0)).toBe(true)
    // 冲刺：新排的步长按这首的 sprintBpm，空拍加镲（噪声）
    p.setSprint(true)
    const before = f.scheduled.length
    f.tick(1)
    vi.advanceTimersByTime(200)
    const fast = 60 / TUNES.race!.sprintBpm / 2
    expect(p.stepDur()).toBeCloseTo(fast, 6)
    const later = [...new Set(f.scheduled.slice(before).map((s) => s.at))].sort((a, b) => a - b)
    for (const at of later) expect(Math.abs((at - later[0]!) / fast - Math.round((at - later[0]!) / fast))).toBeLessThan(1e-6)
    expect(f.scheduled.slice(before).some((s) => s.type === 'noise')).toBe(true)
    // 主增益：开始是 MUSIC_VOLUME × 这首的 level，压低后再乘 MUSIC_DUCK
    const lv = TUNES.race!.level
    expect(f.gains[0]!.value).toBeCloseTo(MUSIC_VOLUME * lv, 5)
    p.duck(true)
    expect(f.gains[0]!.targets.at(-1)).toBeCloseTo(MUSIC_VOLUME * lv * MUSIC_DUCK, 5)
    p.duck(false)
    expect(f.gains[0]!.targets.at(-1)).toBeCloseTo(MUSIC_VOLUME * lv, 5)
    p.stop()
    expect(p.playing).toBe(false)
    const n = f.scheduled.length
    f.tick(2)
    vi.advanceTimersByTime(500)
    expect(f.scheduled.length).toBe(n)
    // 再开始：换成另一首
    p.start('stars', true)
    expect(p.playing).toBe(true)
    expect(p.tune).toBe(TUNES.stars)
    expect(f.scheduled.length).toBeGreaterThan(n)
    p.stop()
  })

  it('每首从头放一整轮都不抛错；不同游戏开头的旋律音不一样；火车带摇摆（反拍往后推）', () => {
    const firstMelody = new Map<string, number[]>()
    for (const s of SKINS) {
      const f = fakeContext()
      const p = new MusicPlayer(f.ac)
      p.start(s.id)
      const t = TUNES[s.id]!
      const loop = (60 / t.bpm / 2) * t.meter * 2 * BARS
      for (let x = 0; x < loop + 1; x += 0.2) {
        f.tick(0.2)
        vi.advanceTimersByTime(100)
      }
      p.stop()
      firstMelody.set(s.id, f.scheduled.filter((n) => n.type === t.lead.type && n.freq > 200).slice(0, 6).map((n) => Math.round(n.freq)))
      expect(f.scheduled.length, s.id).toBeGreaterThan(BARS * 4)
    }
    expect(new Set([...firstMelody.values()].map((v) => v.join())).size).toBeGreaterThan(SKINS.length * 0.8)
    // 摇摆：火车第 1 步（反拍）比均分的时刻晚
    const f = fakeContext()
    const p = new MusicPlayer(f.ac)
    p.start('train')
    f.tick(1)
    vi.advanceTimersByTime(200)
    const t = TUNES.train!
    const sd = 60 / t.bpm / 2
    const ats = [...new Set(f.scheduled.map((n) => n.at))].sort((a, b) => a - b)
    // 第 1 步（反拍，刷子鼓）比均分的时刻晚 swing 步
    expect(ats[1]! - ats[0]!).toBeCloseTo(sd * (1 + t.swing!), 5)
    p.stop()
  })
})
