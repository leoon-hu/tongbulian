import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createDigGame } from '..'
import { DIG_TIME, DigModel, OPEN_TIME, layoutDig } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: DigModel, seconds = DIG_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('挖宝 · 模型（B36k）', () => {
  it('0…8 × 0…8 每个比分：深度随分数单调、脚在地面与宝箱之间；8 分挖到宝箱且箱盖打开', () => {
    const m = new DigModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRed = -Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, DIG_TIME + OPEN_TIME + 0.5)
        for (const d of m.diggers) {
          expect(d.pos.value).toBeGreaterThanOrEqual(g.surfaceY - 0.01)
          expect(d.pos.value).toBeLessThanOrEqual(g.chestTop + 0.01)
        }
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(m.digger(won).pos.value).toBeCloseTo(g.chestTop, 3)
          expect(m.chestOpen[i].value).toBeCloseTo(1, 1)
          expect(m.chestOpen[1 - i].value).toBe(0)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.diggers[0].pos.value).toBeGreaterThan(prevRed)
        prevRed = m.diggers[0].pos.value
      }
    }
  })

  it('倒数站在草地上蹦、镐扛肩上；开始迸土；得分抡镐迸土、井加深；连对更急；反超抬头；还差一分宝箱闪光；结束箱盖弹开、宝石三轮；输了坐下头灯闪', () => {
    const m = new DigModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.diggers.map((d) => d.mood)).toEqual(['ready', 'ready'])
    expect(m.diggers[0].pos.value).toBeCloseTo(g.surfaceY, 3)
    expect(m.swingOf(m.diggers[0])).toBeLessThan(-1)
    m.step(0.3)
    expect(m.liftOf(m.diggers[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 1.5)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.diggers[0].mood).toBe('run')
    expect(m.particles.count).toBeGreaterThan(0)
    let swung = false
    for (let i = 0; i < 30; i++) {
      m.step(1 / 60)
      if (m.swingOf(m.diggers[0]) > 0.2) swung = true
    }
    expect(swung).toBe(true)
    settle(m)
    expect(m.diggers[0].pos.value).toBeCloseTo(m.yFor(1), 3)
    expect(m.diggers[0].pos.value).toBeGreaterThan(g.surfaceY)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.diggers[0].boost.value).toBe(1)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.diggers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.chestGlow[0].value).toBe(1)
    expect(m.chestGlow[1].value).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.diggers.map((d) => d.mood)).toEqual(['win', 'lose'])
    expect(m.chestOpen[0].value).toBe(0) // 还在往下挖最后一层
    settle(m, DIG_TIME + 0.1)
    expect(m.chestOpen[0].target).toBe(1) // 挖到底了，箱盖开始弹开
    m.particles.clear()
    settle(m, OPEN_TIME + 0.6)
    expect(m.chestOpen[0].value).toBeCloseTo(1, 1)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮宝石
    expect(m.sitOf(m.diggers[1])).toBe(1)
    expect(m.swingOf(m.diggers[1])).toBe(0.5)
    let dark = false
    for (let i = 0; i < 60; i++) {
      m.step(1 / 60)
      if (m.lampOf(m.diggers[1]) < 0.5) dark = true
    }
    expect(dark).toBe(true)
    expect(m.lampOf(m.diggers[0])).toBe(1)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.diggers.every((d) => d.mood === 'ready' && Math.abs(d.pos.value - g.surfaceY) < 0.01)).toBe(true)
    expect(m.chestOpen[0].value).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的宝箱也是开着的', () => {
    const m = new DigModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, DIG_TIME + OPEN_TIME + 0.5)
    expect(m.chestOpen[1].value).toBeCloseTo(1, 1)
    expect(m.chestOpen[0].value).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；蚯蚓会探头、宝石会闪；模型 10000 步很快', () => {
    const quiet = new DigModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.glints).toHaveLength(0)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.diggers[0].pos.value).toBeCloseTo(quiet.yFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.diggers[0])).toBe(0)
    expect(quiet.swayOf(quiet.diggers[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.chestOpen[0].value).toBe(1)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutDig(W, H, compact)
      expect(g.pitch).toBeGreaterThan(0)
      expect(g.chestTop + g.chestH).toBeLessThanOrEqual(H)
      expect(g.shaftX[0] + g.shaftW / 2).toBeLessThan(g.shaftX[1] - g.shaftW / 2)
      expect(g.surfaceY).toBeGreaterThan(0)
    }
    const m = new DigModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let peeked = false
    const a0 = m.glintOf(m.glints[0]!)
    let twinkled = false
    for (let t = 0; t < 12; t += 1 / 30) {
      m.step(1 / 30)
      if (m.worm.out > 0.5) peeked = true
      if (Math.abs(m.glintOf(m.glints[0]!) - a0) > 0.2) twinkled = true
    }
    expect(peeked).toBe(true)
    expect(twinkled).toBe(true)
    m.degrade(2)
    expect(m.glintOf(m.glints[0]!)).toBe(0.7)
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('挖宝 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new DigModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(600)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new DigModel(createRng(2))
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
    const g = createDigGame()
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
    const mute = createDigGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
