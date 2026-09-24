import { afterEach, describe, expect, it, vi } from 'vitest'
import { SKINS } from '../skins'
import { KEY_GAIN, PAN_AMOUNT, calloutSfx, panOf, playSfx, skinSfx, type Sfx } from '../sfx'

const KINDS = ['score', 'streak', 'win', 'wrong', 'go', 'key'] as const

describe('音效表（B38 / B70 / B73）', () => {
  it('每种皮肤都有得分 / 连对 / 胜利 / 答错 / 开始 / 按键六组；答错不再有「咚」，都是这个游戏自己的「哎呀」', () => {
    for (const s of SKINS) {
      const sounds = skinSfx(s.id, s.kind)
      for (const k of KINDS) expect(sounds[k].length, `${s.id}.${k}`).toBeGreaterThan(0)
      expect(sounds.wrong, s.id).not.toContain('dong' as Sfx)
    }
    // 答错各不一样：21 个游戏至少 15 种
    expect(new Set(SKINS.map((s) => skinSfx(s.id, s.kind).wrong.join())).size).toBeGreaterThanOrEqual(15)
    // 开始各不一样，而且都不是通用的「嘟」
    for (const s of SKINS) expect(skinSfx(s.id, s.kind).go, s.id).not.toEqual(['go'])
    expect(skinSfx('car', 'race').wrong).toEqual(['stall'])
    expect(skinSfx('train', 'race').wrong).toEqual(['hiss'])
    expect(skinSfx('rocket', 'race').wrong).toEqual(['fizzle'])
    expect(skinSfx('swim', 'race').wrong).toEqual(['gulp'])
    expect(skinSfx('race', 'race').go).toEqual(['pistol'])
    expect(skinSfx('car', 'race').key).toEqual(['rev'])
    // 没登记的皮肤按类别：通用的「哎哟」「嘟」「嗒」
    expect(skinSfx('nope', 'tug')).toMatchObject({ wrong: ['oops'], go: ['go'], key: ['tap'] })
  })

  it('连对在得分声之外加一串亮晶晶（赛车是氮气、火车是汽笛），不再只是「呼」', () => {
    for (const s of SKINS) {
      const streak = skinSfx(s.id, s.kind).streak
      expect(streak.includes('sparkle') || streak.includes('whistle'), s.id).toBe(true)
      expect(streak, s.id).not.toContain('whoosh')
    }
  })

  it('得分音的左右：红队偏左、蓝队偏右、没有队居中；弹出提示的声音', () => {
    expect(panOf('red')).toBe(-PAN_AMOUNT)
    expect(panOf('blue')).toBe(PAN_AMOUNT)
    expect(panOf(null)).toBe(0)
    expect(calloutSfx('lead')).toBe('sting')
    expect(calloutSfx('nearWin')).toBe('alert')
    expect(calloutSfx('deuce')).toBe('heartbeat')
    expect(calloutSfx('streak')).toBe('pop')
    expect(KEY_GAIN).toBeLessThan(0.5)
  })
})

describe('播放（B73 用到的每一声都能合成）', () => {
  afterEach(() => vi.resetModules())

  it('表里的每一声在假上下文上都排得出振荡器或噪声，不抛错', async () => {
    vi.resetModules()
    const started: number[] = []
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} })
    const ac = {
      currentTime: 0,
      sampleRate: 8000,
      destination: {},
      createOscillator: () => ({ type: 'sine', frequency: param(), connect() {}, start: () => started.push(1), stop() {} }),
      createGain: () => ({ gain: param(), connect() {} }),
      createBuffer: (_c: number, len: number) => ({ sampleRate: 8000, getChannelData: () => new Float32Array(len) }),
      createBufferSource: () => ({ buffer: null, connect() {}, start: () => started.push(1), stop() {} }),
      createBiquadFilter: () => ({ type: '', frequency: { value: 0 }, Q: { value: 0 }, connect() {} }),
      createStereoPanner: () => ({ pan: { value: 0 }, connect() {} }),
    }
    vi.doMock('@/engine/audio', () => ({ audioContext: () => ac }))
    vi.doMock('@/engine/voice', () => ({ isVoiceEnabled: () => true }))
    const mod = await import('../sfx')
    const all = new Set<Sfx>()
    for (const s of SKINS) for (const k of KINDS) for (const x of mod.skinSfx(s.id, s.kind)[k]) all.add(x)
    for (const x of all) {
      const before = started.length
      mod.playSfx(x, 1, 1, 0.5)
      expect(started.length, x).toBeGreaterThan(before)
    }
    expect(typeof playSfx).toBe('function')
  })
})
