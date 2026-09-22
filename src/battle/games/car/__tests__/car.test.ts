import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createCarGame } from '..'
import { CarModel, DRIVERS, RUN_TIME, WIN_EXTRA, layoutCar } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: CarModel, seconds = RUN_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('赛车 · 模型（B36g）', () => {
  it('0…8 × 0…8 每个比分：位置随分数单调、在道内；8 分冲过终点；轮子随位移转', () => {
    const m = new CarModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    let prevRed = -Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        const w0 = m.wheel[1]
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        for (const c of m.cars) {
          expect(c.pos.value).toBeGreaterThanOrEqual(g.runFrom - 0.01)
          expect(c.pos.value).toBeLessThanOrEqual(g.finishX + WIN_EXTRA + 0.01)
        }
        if (won === 'red') expect(m.cars[0].pos.value).toBeGreaterThan(g.finishX)
        if (won === 'blue') expect(m.cars[1].pos.value).toBeGreaterThan(g.finishX)
        if (blue > 0 && blue < 8 && red < 8) expect(m.wheel[1]).not.toBe(w0)
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.cars[0].pos.value).toBeGreaterThan(prevRed)
        prevRed = m.cars[0].pos.value
      }
    }
  })

  it('倒数回起点抖动；开始落旗扬尘；得分冒尾气；连对氮气；反超司机回头；还差一分旗猛挥；结束观众跳 + 彩纸；输了冒黑烟', () => {
    const m = new CarModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.cars.map((c) => c.mood)).toEqual(['ready', 'ready'])
    expect(m.cars[0].pos.value).toBeCloseTo(g.runFrom, 3)
    m.step(0.1)
    expect(m.wheel[0]).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.starter.target).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.cars[0].mood).toBe('run')
    expect(m.crowdWave).toEqual([1, 0, 1, 0])
    for (let i = 0; i < 20; i++) m.step(1 / 60)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(m.nitro(m.cars[0])).toBeGreaterThanOrEqual(0)
    settle(m)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.cars[0].boost.value).toBe(1)
    m.setState(snap(2, 0))
    expect(m.nitro(m.cars[0])).toBeGreaterThan(0.5)
    expect(m.tilt(m.cars[0])).toBeLessThanOrEqual(0)
    settle(m)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.cars[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.flagRush.value).toBe(1)
    const f0 = m.flagWave
    m.step(0.1)
    expect(m.flagWave - f0).toBeGreaterThan(1.2)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.cars.map((c) => c.mood)).toEqual(['win', 'lose'])
    expect(m.crowdJump).toBeGreaterThan(0)
    expect(m.particles.count).toBeGreaterThan(10)
    settle(m, 2)
    expect(m.cars[0].pos.value).toBeGreaterThan(g.finishX)
    expect(m.lift(m.cars[0])).toBeGreaterThanOrEqual(0)
    expect(m.nitro(m.cars[1])).toBe(0)
    m.particles.clear()
    settle(m, 1)
    expect(m.particles.count).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.cars.every((c) => c.mood === 'ready' && Math.abs(c.pos.value - g.runFrom) < 0.01)).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；模型 10000 步很快', () => {
    const quiet = new CarModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.cars[0].pos.value).toBeCloseTo(quiet.xFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.lift(quiet.cars[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.cars[0].pos.value).toBeGreaterThan(quiet.geo.finishX)
    const g = layoutCar(820, 56, true)
    expect(g.runTo).toBeGreaterThan(g.runFrom)
    const m = new CarModel(createRng(5))
    m.layout(1000, 120, false)
    m.setState(snap(4, 4))
    m.degrade(2)
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('赛车 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new CarModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(1500)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new CarModel(createRng(2))
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
    const g = createCarGame()
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
    const mute = createCarGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})

describe('赛车 · 司机换脸（B66）', () => {
  it('快照里两队的小动物换成司机，没有的用默认；渲染不抛错', () => {
    const m = new CarModel(createRng(1))
    m.layout(1000, 120, false)
    m.setState({ ...snap(1, 0), avatars: { red: 'rabbit' } })
    expect(m.kinds).toEqual(['rabbit', DRIVERS[1]])
    m.setState({ ...snap(1, 0), avatars: { red: 'cat', blue: 'panda' } })
    expect(m.kinds).toEqual(['cat', 'panda'])
    m.setState(snap(1, 0))
    expect(m.kinds).toEqual(DRIVERS)
    const ctx = stubCtx()
    renderDynamic(ctx, m)
    expect(ctx.calls.length).toBeGreaterThan(50)
  })
})
