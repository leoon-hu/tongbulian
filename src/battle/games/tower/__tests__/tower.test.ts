import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createTowerGame } from '..'
import { FALL_TIME, STAGGER, TowerModel, layoutTower } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: TowerModel, seconds = FALL_TIME + STAGGER * 8 + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('盖楼 · 模型（B36c）', () => {
  it('0…8 × 0…8 每个比分：落稳后砖数 = 分数、楼顶在地基与封顶线之间；8 分屋顶到位', () => {
    const m = new TowerModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        const [r, b] = m.towers
        expect(m.landedCount(r)).toBe(red)
        expect(m.landedCount(b)).toBe(blue)
        for (const t of m.towers) {
          const top = m.topOf(m.landedCount(t))
          expect(top).toBeLessThanOrEqual(g.groundY - g.foundH + 0.01)
          expect(top).toBeGreaterThanOrEqual(m.brickTop(8) - 0.01)
          expect(t.builderY.value).toBeCloseTo(t.roof ? m.brickTop(8) - g.roofH : top, 3)
          for (const brick of t.bricks) expect(brick.y.value).toBeCloseTo(m.brickTop(brick.level), 3)
        }
        if (won) {
          const w = m.tower(won)
          expect(w.roof).not.toBeNull()
          expect(w.roof!.value).toBeCloseTo(m.brickTop(8), 3)
          expect(w.lit).toBe(8)
        }
      }
    }
  })

  it('比分一次跳多层时砖块逐块错开落下；倒数清空；开始工人跳；反超挠头；结束烟花三轮、负方坐下', () => {
    const m = new TowerModel(createRng(7))
    m.layout(150, 700, false)
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.towers.map((t) => t.mood)).toEqual(['ready', 'ready'])
    expect(m.liftOf(m.towers[0])).toBeGreaterThanOrEqual(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.towers[0].hop.value).toBe(1)
    expect(m.towers[0].cheer.value).toBe(1)
    settle(m, 1)
    expect(m.towers.map((t) => t.mood)).toEqual(['idle', 'idle'])

    m.setState(snap(3, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 3 })
    expect(m.towers[0].bricks.map((b) => b.delay)).toEqual([0, STAGGER, STAGGER * 2])
    m.step(0.3)
    m.step(0.3)
    const landedEarly = m.landedCount(m.towers[0])
    expect(landedEarly).toBeLessThan(3)
    settle(m)
    expect(m.landedCount(m.towers[0])).toBe(3)
    // 连对的劲头：紧接着的砖掉得更急
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    m.setState(snap(4, 0))
    const rushed = m.towers[0].bricks[3]!
    let ticks = 0
    while (!rushed.landed && ticks < 200) {
      m.step(1 / 60)
      ticks++
    }
    expect(ticks / 60).toBeLessThan(FALL_TIME)
    settle(m)
    m.setState(snap(3, 0))
    expect(m.towers[0].bricks).toHaveLength(3)

    m.setState(snap(3, 4))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.towers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 4))
    settle(m)
    expect(m.sprint).toBe(true)
    m.setState(snap(8, 4, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.towers.map((t) => t.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10)
    settle(m, 3)
    expect(m.towers[0].roof!.done).toBe(true)
    expect(m.towers[0].lit).toBe(8)
    expect(m.liftOf(m.towers[0])).toBeGreaterThanOrEqual(0)
    expect(m.towers[1].mood).toBe('lose')
    // 再来一局：倒数把两座楼清空
    m.setState(snap(0, 0, 'countdown'))
    expect(m.towers.every((t) => t.bricks.length === 0 && t.roof === null && t.lit === 0)).toBe(true)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；小鸟会飞过；模型 10000 步很快', () => {
    const quiet = new TowerModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.landedCount(quiet.towers[0])).toBe(3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.towers[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.towers[0].lit).toBe(8)
    const m = new TowerModel(createRng(5))
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
    const g = layoutTower(150, 700, false)
    expect(g.blockH * 8).toBeLessThan(g.groundY)
  })
})

describe('盖楼 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new TowerModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(900)
    const compact = new TowerModel(createRng(2))
    compact.layout(96, 350, true)
    compact.setState(snap(4, 2))
    settle(compact)
    const c = stubCtx()
    renderBackground(c, compact.geo)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(20)
  })

  it('GameModule：全流程不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createTowerGame()
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
    const mute = createTowerGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
