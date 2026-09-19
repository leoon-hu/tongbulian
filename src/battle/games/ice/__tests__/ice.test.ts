import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createIceGame } from '..'
import { CRACK_TIME, IceModel, MELT_TIME, STAGGER, layoutIce } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

/** 推进到裂、化、掉水、松手都结束 */
function settle(m: IceModel, seconds = STAGGER * 8 + CRACK_TIME + MELT_TIME + 0.8): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

const solidCount = (m: IceModel, i: 0 | 1): number => m.sides[i].blocks.filter((b) => b.state !== 'gone').length

describe('融冰 · 模型（B36e）', () => {
  it('0…8 × 0…8 每个比分：落稳后每边剩下的冰 = 8 − 对方的分、企鹅站在最上面那块冰上；剩 0 块时企鹅在水里', () => {
    const m = new IceModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        const [r, b] = m.sides
        expect(r.left).toBe(Math.max(0, 8 - blue))
        expect(b.left).toBe(Math.max(0, 8 - red))
        expect(solidCount(m, 0)).toBe(r.left)
        expect(solidCount(m, 1)).toBe(b.left)
        for (const side of m.sides) {
          if (side.left > 0) {
            expect(m.penguinY(side)).toBeCloseTo(m.blockTop(side.left), 3)
            expect(side.splashed).toBe(false)
          } else {
            expect(side.splashed).toBe(true)
            expect(side.drop.value).toBeCloseTo(1, 3)
            expect(m.penguinY(side)).toBeGreaterThan(m.blockTop(1) + g.blockH * 0.5)
          }
        }
        if (won) {
          expect(m.side(won).mood).toBe('win')
          expect(m.other(m.side(won)).mood).toBe('lose')
        } else expect(m.sides.every((s) => s.mood === 'idle')).toBe(true)
      }
    }
  })

  it('倒数还原原地蹦；开始拍翅膀；得分对方的冰先裂再化、淌水、企鹅跟着沉；反超冒汗；只剩一块报警；结束掉水、涟漪、亮片、小鱼跳', () => {
    const m = new IceModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.sides.map((s) => s.mood)).toEqual(['ready', 'ready'])
    expect(solidCount(m, 0) + solidCount(m, 1)).toBe(16)
    m.step(0.2)
    expect(m.liftOf(m.sides[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.sides.every((s) => s.mood === 'idle' && s.flap.value === 1)).toBe(true)
    settle(m, 1)

    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    const top = m.sides[1].blocks[7]!
    expect(top.state).toBe('pending')
    expect(m.sides[0].flap.value).toBe(1)
    expect(m.sides[1].wobble.value).toBeGreaterThan(0.5)
    m.step(0.1)
    expect(top.state).toBe('cracking')
    expect(top.crack).toBeGreaterThan(0)
    expect(m.penguinY(m.sides[1])).toBeCloseTo(m.blockTop(8), 3)
    for (let i = 0; i < 20; i++) m.step(1 / 60)
    expect(top.state).toBe('melting')
    expect(m.penguinY(m.sides[1])).toBeGreaterThan(m.blockTop(8))
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m)
    expect(top.state).toBe('gone')
    expect(m.sides[1].left).toBe(7)
    expect(m.penguinY(m.sides[1])).toBeCloseTo(m.blockTop(7), 3)

    // 一次跳两分：从上往下错开
    m.setState(snap(3, 0))
    expect(m.sides[1].blocks[6]!.delay).toBe(0)
    expect(m.sides[1].blocks[5]!.delay).toBeCloseTo(STAGGER, 6)
    settle(m)
    expect(m.sides[1].left).toBe(5)

    m.setState(snap(3, 4))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.sides[0].worry.value).toBe(1)
    settle(m)
    expect(m.sides[0].left).toBe(4)
    // 连对：对方的冰化得更快
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.sides[1].rush.value).toBe(1)
    m.setState(snap(6, 4))
    const rushed = m.sides[1].blocks[4]!
    let ticks = 0
    while (rushed.state !== 'gone' && ticks < 300) {
      m.step(1 / 60)
      ticks++
    }
    expect(ticks / 60).toBeLessThan(STAGGER + CRACK_TIME + MELT_TIME)
    settle(m)
    expect(m.sprint).toBe(true)
    m.setState(snap(7, 4))
    settle(m)
    expect(m.sides[1].left).toBe(1)
    expect(m.alarmOf(m.sides[1], m.sides[1].blocks[0]!)).toBeGreaterThan(0)
    expect(m.alarmOf(m.sides[0], m.sides[0].blocks[0]!)).toBe(0)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.sides[0].flap.value).toBe(1)

    m.setState(snap(8, 4, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.sides.map((s) => s.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10)
    expect(m.fishJumpT).toBeGreaterThanOrEqual(0)
    let ripple = false
    for (let t = 0; t < 2; t += 1 / 60) {
      m.step(1 / 60)
      if (m.rippleT >= 0) ripple = true
    }
    expect(ripple).toBe(true)
    expect(m.sides[1].splashed).toBe(true)
    expect(m.sides[1].left).toBe(0)
    settle(m)
    expect(m.sides[1].drop.value).toBeCloseTo(1, 3)
    expect(m.penguinY(m.sides[1])).toBeGreaterThan(m.blockTop(1) + g.blockH * 0.5)
    expect(m.liftOf(m.sides[0])).toBeGreaterThanOrEqual(0)
    expect(m.penguinY(m.sides[0])).toBeCloseTo(m.blockTop(4), 3)
    // 再来一局：倒数把两摞冰还原
    m.setState(snap(0, 0, 'countdown'))
    expect(solidCount(m, 0) + solidCount(m, 1)).toBe(16)
    expect(m.sides.every((s) => !s.splashed && s.drop.value === 0)).toBe(true)
    expect(m.particles.count).toBe(0)
    expect(m.rippleT).toBe(-1)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    const quiet = new IceModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.flakes).toHaveLength(8)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.sides[0].left).toBe(6)
    expect(quiet.sides[1].left).toBe(5)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.sides[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.sides[1].splashed).toBe(true)
    expect(quiet.sides[1].drop.value).toBe(1)
    expect(quiet.particles.count).toBe(0)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
      [96, 200, true],
    ] as const) {
      const g = layoutIce(W, H, compact)
      expect(g.blockH).toBeGreaterThan(3)
      expect(g.base - 8 * g.pitch).toBeGreaterThanOrEqual(g.size * 1.5)
      expect(g.base).toBeLessThanOrEqual(H)
    }
    const m = new IceModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let moved = false
    const y0 = m.flakes[0]!.y
    for (let i = 0; i < 30; i++) m.step(1 / 30)
    if (m.flakes[0]!.y !== y0) moved = true
    expect(moved).toBe(true)
    m.degrade(2)
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    expect(m.fishJumpT).toBe(-1)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('融冰 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new IceModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(6, 5))
    m.onEvent({ type: 'lead', team: 'red' })
    m.setState(snap(7, 5))
    for (let i = 0; i < 12; i++) m.step(1 / 60)
    const mid = stubCtx()
    renderDynamic(mid, m)
    expect(mid.calls.length).toBeGreaterThan(80)
    expect(mid.calls.length).toBeLessThan(1400)
    m.setState(snap(8, 5, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(80)
    expect(dyn.calls.length).toBeLessThan(1400)
    const compact = new IceModel(createRng(2))
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
    const g = createIceGame()
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
    const mute = createIceGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
