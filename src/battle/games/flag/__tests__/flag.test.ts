import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createFlagGame } from '..'
import { FLY_TIME, FlagModel, MOVE_TIME, layoutFlag } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: FlagModel, seconds = MOVE_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('抢旗 · 模型（B36t）', () => {
  it('0…8 × 0…8 每个比分落稳后：旗子位置只由比分差决定、随红 − 蓝单调、不出赛场；赢家那局旗子在胜方塔顶', () => {
    const m = new FlagModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    const byDiff = new Map<number, number>()
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, MOVE_TIME + FLY_TIME + 0.5)
        expect(m.flag.value).toBeCloseTo(m.flagFor(red, blue), 3)
        expect(m.flag.value).toBeGreaterThanOrEqual(g.center - 8 * g.cell - 0.01)
        expect(m.flag.value).toBeLessThanOrEqual(g.center + 8 * g.cell + 0.01)
        const f = m.flagAt()
        if (won) {
          const top = g.towerTop[won === 'red' ? 0 : 1]!
          expect(f.x).toBeCloseTo(top.x, 2)
          expect(f.y).toBeCloseTo(top.y, 2)
          expect(f.team).toBe(won)
          expect(m.gate[won === 'red' ? 1 : 0]!.value).toBeCloseTo(1, 2)
        } else {
          expect(f.team).toBeNull()
          expect(f.y).toBeCloseTo(g.groundY, 3)
          const seen = byDiff.get(red - blue)
          if (seen !== undefined) expect(f.x).toBeCloseTo(seen, 3)
          byDiff.set(red - blue, f.x)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
    }
    for (let d = -7; d < 7; d++) expect(byDiff.get(d + 1)!).toBeLessThan(byDiff.get(d)!) // 红多一分旗子往左
  })

  it('倒数旗在正中、原地蹦；开始一起跳；得分跳一下、旗子蹦一格走小弧、城堡旗帜挥；连对更猛；反超回头；还差一分城堡发光；结束旗子飞到塔顶变队色、烟花三轮、负方城门放下', () => {
    const m = new FlagModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.kids.map((k) => k.mood)).toEqual(['ready', 'ready'])
    expect(m.flag.value).toBeCloseTo(g.center, 3)
    m.step(0.3)
    expect(m.liftOf(m.kids[0], 0)).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.jump[0].value).toBeGreaterThan(0.5)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.kids[0].mood).toBe('run')
    expect(m.jump[0].value).toBe(1)
    expect(m.banner[0].value).toBeGreaterThanOrEqual(1)
    expect(m.flag.target).toBeCloseTo(g.center - g.cell, 3)
    let hopped = false
    for (let i = 0; i < 20; i++) {
      m.step(1 / 60)
      if (m.flagAt().y < g.groundY - 1) hopped = true
    }
    expect(hopped).toBe(true)
    settle(m)
    expect(m.flagAt().y).toBeCloseTo(g.groundY, 3)
    expect(m.flag.value).toBeCloseTo(g.center - g.cell, 3)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.banner[0].value).toBe(1.5)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.kids[0].look.value).toBe(1)
    settle(m)
    expect(m.flag.value).toBeCloseTo(g.center + g.cell, 3)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    const w0 = m.bannerWave
    m.step(0.1)
    expect(m.bannerWave - w0).toBeGreaterThan(1)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.glow[0].value).toBe(1)
    expect(m.glow[1].value).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.kids.map((k) => k.mood)).toEqual(['win', 'lose'])
    expect(m.planted.target).toBe(1)
    m.step(FLY_TIME * 0.5)
    const mid = m.flagAt()
    expect(mid.y).toBeLessThan(g.groundY) // 飞在半空
    expect(mid.team).toBeNull()
    settle(m, FLY_TIME)
    const f = m.flagAt()
    expect(f.team).toBe('red')
    expect(f.x).toBeCloseTo(g.towerTop[0].x, 2)
    expect(m.particles.count).toBeGreaterThan(0) // 烟花
    expect(m.gate[1].target).toBe(1)
    expect(m.scratchOf(m.kids[1])).toBe(1)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.flag.value).toBeCloseTo(g.center, 3)
    expect(m.planted.value).toBe(0)
    expect(m.gate[1].value).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，旗子也在胜方塔顶', () => {
    const m = new FlagModel(createRng(9))
    m.layout(1000, 120, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, MOVE_TIME + FLY_TIME + 0.5)
    const f = m.flagAt()
    expect(f.team).toBe('blue')
    expect(f.x).toBeCloseTo(m.geo.towerTop[1].x, 2)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    const quiet = new FlagModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.flag.value).toBeCloseTo(quiet.flagFor(3, 2), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.kids[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.flagAt().team).toBe('red')
    for (const [W, H, compact] of [
      [1000, 120, false],
      [820, 56, true],
      [600, 120, false],
    ] as const) {
      const g = layoutFlag(W, H, compact)
      expect(g.cell).toBeGreaterThan(0)
      expect(g.center - 8 * g.cell).toBeGreaterThan(g.kidX[0])
      expect(g.center + 8 * g.cell).toBeLessThan(g.kidX[1])
      expect(g.castleX[0] - g.castleW / 2).toBeGreaterThanOrEqual(0)
      expect(g.castleX[1] + g.castleW / 2).toBeLessThanOrEqual(W)
      for (const t of g.towerTop) expect(t.y).toBeGreaterThan(0)
    }
    const m = new FlagModel(createRng(5))
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

describe('抢旗 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new FlagModel(createRng(2))
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
    const compact = new FlagModel(createRng(2))
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
    const g = createFlagGame()
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
    const mute = createFlagGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
