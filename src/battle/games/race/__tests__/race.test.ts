import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createRaceGame } from '..'
import { RUN_TIME, RaceModel, WIN_EXTRA, layoutRace } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

/** 推进到位移结束 */
function settle(m: RaceModel, seconds = RUN_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('龟兔赛跑 · 模型（B36a）', () => {
  it('0…8 × 0…8 每个比分：x 随分数单调递增、在赛道内；8 分时冲过终点线', () => {
    const m = new RaceModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    let prevRedX = -Infinity
    for (let red = 0; red <= 8; red++) {
      let prevBlueX = -Infinity
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        const [r, b] = m.runners
        for (const x of [r.x.value, b.x.value]) {
          expect(x).toBeGreaterThanOrEqual(g.runFrom - 0.01)
          expect(x).toBeLessThanOrEqual(g.finishX + WIN_EXTRA + 0.01)
        }
        if (won === 'red') expect(r.x.value).toBeGreaterThan(g.finishX)
        if (won === 'blue') expect(b.x.value).toBeGreaterThan(g.finishX)
        else {
          expect(b.x.value).toBeGreaterThan(prevBlueX)
          prevBlueX = b.x.value
        }
      }
      // 红队：每多一分（0…7）都在上一分前面；8 分冲过终点
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.runners[0].x.value).toBeGreaterThan(prevRedX)
        prevRedX = m.runners[0].x.value
      }
    }
  })

  it('倒数回到起点原地蹦；开始落旗迸彩纸；得分跑起来扬尘；连对加速；反超回头；结束观众跳 + 彩纸', () => {
    const m = new RaceModel(createRng(7))
    m.layout(1000, 120, false)
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.runners.map((r) => r.mood)).toEqual(['ready', 'ready'])
    m.step(0.2)
    expect(m.lift(m.runners[1])).toBeGreaterThanOrEqual(0)
    expect(m.starter.value).toBe(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 1)
    expect(m.starter.value).toBeCloseTo(1, 2)
    expect(m.runners.map((r) => r.mood)).toEqual(['idle', 'idle'])

    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    m.step(0.1)
    m.step(0.1)
    expect(m.runners[0].mood).toBe('run')
    expect(m.runners[0].moving).toBeGreaterThan(0.5)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(m.crowdWave[0]).toBeGreaterThan(0.5)
    settle(m)
    expect(m.runners[0].moving).toBeLessThan(0.05)

    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.runners[0].boost.value).toBe(1)
    m.setState(snap(1, 2))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.runners[0].look.value).toBe(1)
    m.onEvent({ type: 'nearWin', team: 'blue' })
    expect(m.bannerGlow.value).toBe(1)
    settle(m)
    m.setState(snap(1, 8, 'ended', 'blue'))
    m.onEvent({ type: 'finished', winner: 'blue' })
    expect(m.runners.map((r) => r.mood)).toEqual(['lose', 'win'])
    expect(m.crowdJump).toBeGreaterThan(0)
    expect(m.particles.count).toBeGreaterThan(10)
    settle(m, 3)
    expect(m.runners[1].x.value).toBeGreaterThan(m.geo.finishX)
    expect(m.lift(m.runners[1])).toBeGreaterThanOrEqual(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；模型 10000 步很快', () => {
    const quiet = new RaceModel(createRng(3), { reducedMotion: true })
    quiet.layout(840, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.geo.size).toBeLessThanOrEqual(20)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    quiet.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 2 })
    settle(quiet)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.lift(quiet.runners[0])).toBe(0)
    const m = new RaceModel(createRng(5))
    m.setState(snap(4, 4))
    m.degrade(2)
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
    expect(layoutRace(1000, 120, false).finishX).toBeLessThan(1000)
  })
})

describe('龟兔赛跑 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new RaceModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo, 8)
    expect(bg.calls.length).toBeLessThan(1000) // 背景只在尺寸变化时画一次（缓存到离屏 canvas）
    m.setState(snap(6, 5))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 3 })
    m.onEvent({ type: 'finished', winner: 'red' })
    m.step(0.1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(900)
    const compact = new RaceModel(createRng(2))
    compact.layout(840, 56, true)
    compact.setState(snap(4, 2))
    const c = stubCtx()
    renderBackground(c, compact.geo, 8)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(20)
  })

  it('GameModule：mount / setState / event / tick / resize / degrade / destroy 都不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createRaceGame()
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
    g.resize(840, 56, 3)
    g.tick(0.016)
    g.degrade?.(3)
    g.tick(0.016)
    g.pause()
    g.resume()
    g.destroy()
    const mute = createRaceGame()
    mute.mount({ canvas: stubCanvas(null), width: 400, height: 100, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
