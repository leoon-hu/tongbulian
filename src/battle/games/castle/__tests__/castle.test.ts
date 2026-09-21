import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createCastleGame } from '..'
import { COLLAPSE_TIME, CRACK_TIME, CastleModel, DROP_TIME, SHOT_TIME, STAGGER, layoutCastle } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

/** 一发炮弹从开炮到砖碎、塔顶落稳 */
const ROUND = SHOT_TIME + CRACK_TIME + DROP_TIME + 0.3

function settle(m: CastleModel, seconds = ROUND + STAGGER * 8 + COLLAPSE_TIME): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('拆城堡 · 模型（B36u）', () => {
  it('0…8 × 0…8 每个比分落稳后：每边剩下的砖 = 8 − 对方的分、塔顶在最高那块砖上、剩 0 块时塔顶在地上', () => {
    const m = new CastleModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        expect(m.left(0)).toBe(8 - blue)
        expect(m.left(1)).toBe(8 - red)
        expect(m.shots).toHaveLength(0)
        for (let i = 0; i < 2; i++) {
          expect(m.topY[i]!.value).toBeCloseTo(m.topFor(i), 2)
          if (m.left(i) === 0) expect(m.topY[i]!.value).toBeCloseTo(g.groundY, 2)
          else expect(m.topY[i]!.value).toBeCloseTo(m.brickTop(m.left(i) - 1), 2)
        }
        if (won) expect(m.collapsed[won === 'red' ? 1 : 0]).toBe(true)
      }
      m.setState(snap(red, 0))
      settle(m)
    }
  })

  it('倒数塔顶蹦；开始放空炮；得分开炮后坐冒烟、炮弹飞过去、对方最上面那块先裂再碎、塔顶落一层；一次几块错开；反超回头；对方只剩一块砖闪；结束塔塌扬尘、烟花三轮、负方头顶转星星', () => {
    const m = new CastleModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.guards.map((gd) => gd.mood)).toEqual(['ready', 'ready'])
    expect(m.left(0)).toBe(8)
    m.step(0.3)
    expect(m.liftOf(m.guards[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.smoke[0].value).toBeGreaterThan(0.5)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.recoil[0].value).toBe(1)
    expect(m.shots).toHaveLength(1)
    expect(m.shots[0]!.target).toBe(1)
    expect(m.left(1)).toBe(8) // 炮弹还没到
    let flew = false
    for (let t = 0; t < SHOT_TIME * 0.6; t += 1 / 60) {
      m.step(1 / 60)
      const p = m.shotAt(m.shots[0]!)
      if (p.y < m.shots[0]!.y0 - 5) flew = true
    }
    expect(flew).toBe(true)
    settle(m, SHOT_TIME * 0.6)
    expect(m.shots).toHaveLength(0)
    expect(m.bricks[1][7]!.state).not.toBe('solid')
    settle(m, CRACK_TIME + DROP_TIME + 0.5)
    expect(m.left(1)).toBe(7)
    expect(m.bricks[1][7]!.state).toBe('gone')
    expect(m.topY[1].value).toBeCloseTo(m.brickTop(6), 2)
    expect(m.particles.count).toBeGreaterThanOrEqual(0)
    // 一次三分：三发错开
    m.setState(snap(4, 0))
    expect(m.shots).toHaveLength(3)
    expect(m.shots[1]!.delay).toBeCloseTo(STAGGER, 5)
    expect(m.shots[2]!.delay).toBeCloseTo(STAGGER * 2, 5)
    settle(m)
    expect(m.left(1)).toBe(4)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.smoke[0].value).toBe(1.5)
    m.setState(snap(4, 5))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.guards[0].look.value).toBe(1)
    settle(m)
    expect(m.left(0)).toBe(3)
    m.setState(snap(7, 5))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.left(1)).toBe(1)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.alarm[1].value).toBe(1)
    let blinked = false
    for (let i = 0; i < 20; i++) {
      m.step(1 / 60)
      if (m.alarmOf(1, 0) > 0.3) blinked = true
    }
    expect(blinked).toBe(true)
    expect(m.alarmOf(0, 0)).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 5, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.guards.map((gd) => gd.mood)).toEqual(['win', 'lose'])
    settle(m, SHOT_TIME + CRACK_TIME + 0.2)
    expect(m.left(1)).toBe(0)
    expect(m.collapsed[1]).toBe(true)
    expect(m.particles.count).toBeGreaterThan(0) // 尘土
    settle(m, COLLAPSE_TIME + 1.2)
    expect(m.topY[1].value).toBeCloseTo(g.groundY, 2)
    expect(m.dizzyOf(1)).toBe(1)
    expect(m.dizzyOf(0)).toBe(0)
    expect(m.particles.count).toBeGreaterThan(0) // 烟花
    m.setState(snap(0, 0, 'countdown'))
    expect(m.left(0)).toBe(8)
    expect(m.left(1)).toBe(8)
    expect(m.collapsed[1]).toBe(false)
    expect(m.topY[1].value).toBeCloseTo(m.brickTop(7), 2)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，负方的塔已经塌在地上', () => {
    const m = new CastleModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m)
    expect(m.left(0)).toBe(0)
    expect(m.left(1)).toBe(5)
    expect(m.collapsed[0]).toBe(true)
    expect(m.topY[0].value).toBeCloseTo(m.geo.groundY, 2)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；小鸟会飞过；模型 10000 步很快', () => {
    const quiet = new CastleModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet, 2)
    expect(quiet.left(1)).toBe(5)
    expect(quiet.left(0)).toBe(6)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.guards[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 3)
    expect(quiet.left(1)).toBe(0)
    expect(quiet.topY[1].value).toBeCloseTo(quiet.geo.groundY, 2)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutCastle(W, H, compact)
      expect(g.brickH).toBeGreaterThan(0)
      expect(g.groundY - 8 * g.brickH - g.topH - g.size * 1.3).toBeGreaterThanOrEqual(0)
      expect(g.towerX[0] + g.brickW / 2).toBeLessThan(g.towerX[1] - g.brickW / 2)
    }
    const m = new CastleModel(createRng(5))
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
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('拆城堡 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new CastleModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(100)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1500)
    const mid = new CastleModel(createRng(2))
    mid.layout(150, 700, false)
    mid.setState(snap(3, 2))
    mid.step(0.2)
    const d2 = stubCtx()
    renderDynamic(d2, mid)
    expect(d2.calls.length).toBeGreaterThan(50)
    const compact = new CastleModel(createRng(2))
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
    const g = createCastleGame()
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
    const mute = createCastleGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
