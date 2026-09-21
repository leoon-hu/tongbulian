import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createSeesawGame } from '..'
import { DROP_TIME, SeesawModel, STAGGER, TILT_TIME, layoutSeesaw } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: SeesawModel, seconds = TILT_TIME + DROP_TIME + STAGGER * 8 + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('跷跷板 · 模型（B36s）', () => {
  it('0…8 × 0…8 每个比分落稳后：倾角只由比分差决定、随红 − 蓝单调、板头不低于地面、砝码数 = 分数；赢家那头压到底', () => {
    const m = new SeesawModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    const byDiff = new Map<number, number>()
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, 2.5)
        expect(m.weightCount(0)).toBe(red)
        expect(m.weightCount(1)).toBe(blue)
        for (const w of [...m.weights[0], ...m.weights[1]]) expect(w.drop.value).toBeCloseTo(0, 3)
        for (let i = 0; i < 2; i++) expect(m.endPoint(i).y).toBeLessThanOrEqual(g.groundY + 0.5)
        if (won) {
          expect(Math.abs(m.tilt.value)).toBeCloseTo(g.maxAngle, 3)
          const wi = won === 'red' ? 0 : 1
          expect(m.endPoint(wi).y).toBeGreaterThan(m.endPoint(1 - wi).y)
        } else {
          expect(m.tilt.value).toBeCloseTo(m.tiltFor(red, blue, null), 3)
          const seen = byDiff.get(red - blue)
          if (seen !== undefined) expect(m.tilt.value).toBeCloseTo(seen, 3)
          byDiff.set(red - blue, m.tilt.value)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
    }
    for (let d = -7; d < 7; d++) expect(byDiff.get(d + 1)!).toBeLessThan(byDiff.get(d)!) // 红多一分板往左（角更负）
  })

  it('倒数板平、原地颠；开始两头颠；得分砝码掉下来、板倾过去、沉那头颠一下；连对板抖；反超回头；还差一分扶手发光；结束压到底扬尘彩纸；输了被翘高瞪眼', () => {
    const m = new SeesawModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.riders.map((r) => r.mood)).toEqual(['ready', 'ready'])
    expect(m.tilt.value).toBe(0)
    m.step(0.3)
    expect(m.liftOf(m.riders[0], 0)).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.bump[0].value).toBeGreaterThan(0.5)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.weightCount(0)).toBe(1)
    expect(m.weights[0][0]!.drop.value).toBeLessThan(0) // 还在天上
    expect(m.tilt.target).toBeLessThan(0)
    settle(m)
    expect(m.weights[0][0]!.drop.value).toBeCloseTo(0, 3)
    expect(m.tilt.value).toBeCloseTo(m.tiltFor(1, 0, null), 3)
    expect(m.endPoint(0).y).toBeGreaterThan(m.endPoint(1).y)
    expect(m.dangleOf(1)).toBeGreaterThan(0)
    expect(m.dangleOf(0)).toBe(0)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.shake.value).toBe(1)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.riders[0].look.value).toBe(1)
    settle(m)
    expect(m.tilt.value).toBeGreaterThan(0)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.waveOf(m.riders[0])).toBe(1)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.glow[0].value).toBe(1)
    expect(m.glow[1].value).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.riders.map((r) => r.mood)).toEqual(['win', 'lose'])
    let dusted = false
    for (let t = 0; t < 2; t += 1 / 60) {
      m.step(1 / 60)
      if (m.particles.count > 0) dusted = true
    }
    expect(dusted).toBe(true)
    expect(m.tilt.value).toBeCloseTo(-g.maxAngle, 3)
    expect(m.endPoint(0).y).toBeGreaterThanOrEqual(g.groundY - g.thick * 1.5)
    expect(m.scaredOf(m.riders[1])).toBe(1)
    expect(m.dangleOf(1)).toBeCloseTo(1, 3)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.tilt.value).toBe(0)
    expect(m.weightCount(0)).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    const quiet = new SeesawModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.tilt.value).toBeCloseTo(quiet.tiltFor(3, 2, null), 3)
    expect(quiet.weightCount(0)).toBe(3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.riders[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.tilt.value).toBeCloseTo(-quiet.geo.maxAngle, 3)
    for (const [W, H, compact] of [
      [1000, 120, false],
      [820, 56, true],
      [600, 120, false],
    ] as const) {
      const g = layoutSeesaw(W, H, compact)
      expect(g.maxAngle).toBeGreaterThan(0)
      expect(g.pivotY + Math.sin(g.maxAngle) * g.half).toBeLessThanOrEqual(g.groundY)
      expect(g.pivotX - g.half).toBeGreaterThan(0)
      expect(g.pivotX + g.half).toBeLessThan(W)
      for (const s of g.slots) for (let n = 1; n < 8; n++) expect(Math.abs(s[n]!)).toBeLessThan(Math.abs(s[n - 1]!))
    }
    const m = new SeesawModel(createRng(5))
    m.layout(1000, 120, false)
    m.setState(snap(4, 4))
    m.degrade(2)
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('跷跷板 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new SeesawModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(300)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new SeesawModel(createRng(2))
    compact.layout(820, 56, true)
    compact.setState(snap(4, 2))
    settle(compact)
    const c = stubCtx()
    renderBackground(c, compact.geo)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(40)
  })

  it('GameModule：全流程不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createSeesawGame()
    g.mount({ canvas: stubCanvas(ctx), width: 1000, height: 120, dpr: 2, compact: false, reducedMotion: false })
    g.setState(snap(0, 0, 'countdown'))
    g.onEvent({ type: 'countdown' })
    g.tick(0.016)
    g.setState(snap(0, 0, 'playing'))
    g.onEvent({ type: 'go' })
    g.setState(snap(1, 0))
    g.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    for (let i = 0; i < 30; i++) g.tick(0.016)
    expect(ctx.count('clearRect')).toBe(31)
    g.resize(820, 56, 3)
    g.tick(0.016)
    g.degrade?.(3)
    g.tick(0.016)
    g.pause()
    g.resume()
    g.destroy()
    const mute = createSeesawGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
