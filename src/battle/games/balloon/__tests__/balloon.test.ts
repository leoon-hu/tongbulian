import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createBalloonGame } from '..'
import { BalloonModel, RISE_TIME, layoutBalloon } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: BalloonModel, seconds = RISE_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('热气球 · 模型（B36h）', () => {
  it('0…8 × 0…8 每个比分：高度随分数单调上升、在地面与云层之间；8 分飞到云上', () => {
    const m = new BalloonModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRed = Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        for (const b of m.balloons) {
          expect(b.pos.value).toBeLessThanOrEqual(g.groundY + 0.01)
          expect(b.pos.value).toBeGreaterThanOrEqual(g.goalY - g.size * 0.2)
        }
        if (won) expect(m.balloon(won).pos.value).toBeLessThan(g.goalY)
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.balloons[0].pos.value).toBeLessThan(prevRed)
        prevRed = m.balloons[0].pos.value
      }
    }
  })

  it('倒数落地烧嘴小火；开始爆燃 + 火星；得分爆燃上升、乘客挥手；连对更旺；反超回头；还差一分云层发光；结束彩纸三轮、输了瘪掉下沉', () => {
    const m = new BalloonModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.balloons.map((b) => b.mood)).toEqual(['ready', 'ready'])
    expect(m.balloons[0].pos.value).toBeCloseTo(g.groundY, 3)
    expect(m.flameOf(m.balloons[0], 0)).toBeGreaterThan(0.1)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.burst[0].value).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.balloons[0].mood).toBe('run')
    expect(m.wave[0].value).toBe(1)
    expect(m.flameOf(m.balloons[0], 0)).toBeGreaterThan(0.8)
    settle(m)
    expect(m.balloons[0].pos.value).toBeCloseTo(m.yFor(1), 3)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.burst[0].value).toBe(1.5)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.balloons[0].look.value).toBe(1)
    expect(Math.abs(m.swayOf(m.balloons[0]))).toBeGreaterThanOrEqual(0)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.cloudGlow.value).toBe(1)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.balloons.map((b) => b.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10)
    settle(m, 2)
    expect(m.balloons[0].pos.value).toBeLessThan(g.goalY)
    expect(m.deflateOf(m.balloons[1])).toBeCloseTo(1, 3)
    expect(m.yOf(m.balloons[1])).toBeGreaterThan(m.balloons[1].pos.value)
    expect(m.flameOf(m.balloons[1], 1)).toBe(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.balloons.every((b) => b.mood === 'ready' && Math.abs(b.pos.value - g.groundY) < 0.01)).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；小鸟会飞过；模型 10000 步很快', () => {
    const quiet = new BalloonModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.balloons[0].pos.value).toBeCloseTo(quiet.yFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.swayOf(quiet.balloons[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.balloons[0].pos.value).toBeLessThan(quiet.geo.goalY)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutBalloon(W, H, compact)
      expect(g.goalY - g.size).toBeGreaterThanOrEqual(0)
      expect(g.groundY).toBeGreaterThan(g.goalY)
    }
    const m = new BalloonModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let seen = false
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.bird) seen = true
    }
    expect(seen).toBe(true)
    m.degrade(2)
    expect(m.bird).toBeNull()
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('热气球 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new BalloonModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new BalloonModel(createRng(2))
    compact.layout(96, 350, true)
    compact.setState(snap(4, 2))
    settle(compact)
    const c = stubCtx()
    renderBackground(c, compact.geo)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(40)
  })

  it('GameModule：全流程不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createBalloonGame()
    g.mount({ canvas: stubCanvas(ctx), width: 150, height: 700, dpr: 2, compact: false, reducedMotion: false })
    g.setState(snap(0, 0, 'countdown'))
    g.onEvent({ type: 'countdown' })
    g.tick(0.016)
    g.setState(snap(0, 0, 'playing'))
    g.onEvent({ type: 'go' })
    g.setState(snap(1, 0))
    g.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    for (let i = 0; i < 30; i++) g.tick(0.016)
    expect(ctx.count('clearRect')).toBe(31)
    g.resize(96, 350, 3)
    g.tick(0.016)
    g.degrade?.(3)
    g.tick(0.016)
    g.pause()
    g.resume()
    g.destroy()
    const mute = createBalloonGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
