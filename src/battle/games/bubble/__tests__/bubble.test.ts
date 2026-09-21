import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createBubbleGame } from '..'
import { BubbleModel, GROW_TIME, RAINBOW_TIME, layoutBubble } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: BubbleModel, seconds = GROW_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('吹泡泡 · 模型（B36o）', () => {
  it('0…8 × 0…8 每个比分：泡泡半径与高度随分数单调、泡泡顶不超过顶；8 分赢了碰到顶且是彩虹泡', () => {
    const m = new BubbleModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevR = -Infinity
    let prevY = Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, GROW_TIME + RAINBOW_TIME + 0.5)
        for (const b of m.blowers) {
          expect(m.cyOf(b) - m.rOf(b)).toBeGreaterThanOrEqual(g.topY - 0.01)
          expect(m.cyOf(b) + m.rOf(b)).toBeLessThanOrEqual(g.wandY + 0.01)
          expect(m.rOf(b)).toBeLessThanOrEqual(g.rMax + 0.01)
        }
        if (won) {
          const i = won === 'red' ? 0 : 1
          const b = m.blowers[i]!
          expect(m.cyOf(b) - m.rOf(b)).toBeCloseTo(g.topY, 2)
          expect(m.rainbow[i]!.value).toBeCloseTo(1, 1)
          expect(m.rainbow[1 - i]!.value).toBe(0)
        } else {
          expect(m.rainbow.every((r) => r.value === 0)).toBe(true)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.rOf(m.blowers[0])).toBeGreaterThan(prevR)
        expect(m.cyOf(m.blowers[0])).toBeLessThan(prevY)
        prevR = m.rOf(m.blowers[0])
        prevY = m.cyOf(m.blowers[0])
      }
    }
  })

  it('倒数原地蹦；开始吹一口冒小泡泡；得分鼓腮吹、泡泡颤着变大变高；连对更猛；反超回头；还差一分星星亮；结束彩虹泡亮片三轮；输了停在半空又吹小的', () => {
    const m = new BubbleModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.blowers.map((b) => b.mood)).toEqual(['ready', 'ready'])
    expect(m.rOf(m.blowers[0])).toBeCloseTo(g.rMin, 3)
    expect(m.cyOf(m.blowers[0])).toBeCloseTo(g.y0, 3)
    m.step(0.3)
    expect(m.liftOf(m.blowers[0])).toBeGreaterThan(0)
    expect(m.driftOf(m.blowers[0], 0)).toBe(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.puff[0].value).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 2)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.blowers[0].mood).toBe('run')
    expect(m.puff[0].value).toBeGreaterThanOrEqual(1)
    expect(m.wobble[0].value).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    for (let i = 0; i < 10; i++) m.step(1 / 60)
    const [sx, sy] = m.wobbleOf(0)
    expect(Math.abs(sx - 1)).toBeGreaterThan(0)
    expect(sx + sy).toBeCloseTo(2, 5)
    settle(m)
    expect(m.rOf(m.blowers[0])).toBeCloseTo(g.rMin + (g.rMax - g.rMin) / 8, 2)
    expect(m.cyOf(m.blowers[0])).toBeLessThan(g.y0)
    expect(m.rOf(m.blowers[1])).toBeCloseTo(g.rMin, 3)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.puff[0].value).toBe(1.5)
    expect(m.wobble[0].value).toBe(1.5)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.blowers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.starGlow[0].value).toBe(1)
    expect(m.starGlow[1].value).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.blowers.map((b) => b.mood)).toEqual(['win', 'lose'])
    expect(m.rainbow[0].value).toBe(0) // 最后一圈还在变大
    settle(m, GROW_TIME + 0.1)
    expect(m.rainbow[0].target).toBe(1)
    m.particles.clear()
    settle(m, RAINBOW_TIME + 0.6)
    expect(m.rainbow[0].value).toBeCloseTo(1, 1)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮亮片
    expect(m.rOf(m.blowers[1])).toBeCloseTo(g.rMin + ((g.rMax - g.rMin) * 3) / 8, 2)
    expect(m.loserBubble(m.blowers[1])).not.toBeNull()
    expect(m.loserBubble(m.blowers[0])).toBeNull()
    m.setState(snap(0, 0, 'countdown'))
    expect(m.blowers.every((b) => b.mood === 'ready' && b.pos.value === 0)).toBe(true)
    expect(m.rainbow[0].value).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的泡泡也是彩虹泡', () => {
    const m = new BubbleModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, GROW_TIME + RAINBOW_TIME + 0.5)
    expect(m.rainbow[1].value).toBeCloseTo(1, 1)
    expect(m.rainbow[0].value).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；空中的小泡泡与小鸟会动；模型 10000 步很快', () => {
    const quiet = new BubbleModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.motes).toHaveLength(0)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.rOf(quiet.blowers[0])).toBeCloseTo(quiet.geo.rMin + ((quiet.geo.rMax - quiet.geo.rMin) * 3) / 8, 2)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.wobbleOf(0)).toEqual([1, 1])
    expect(quiet.liftOf(quiet.blowers[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.rainbow[0].value).toBe(1)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutBubble(W, H, compact)
      expect(g.y8).toBeLessThan(g.y0)
      expect(g.rMax).toBeGreaterThan(g.rMin)
      expect(g.topY).toBeGreaterThan(g.starsY)
      expect(g.y0 + g.rMin).toBeLessThanOrEqual(g.wandY)
      expect(g.laneX[0] + g.rMax).toBeLessThanOrEqual(W)
    }
    const m = new BubbleModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    const y0 = m.motes.map((mo) => mo.y)
    let seen = false
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.bird) seen = true
    }
    expect(seen).toBe(true)
    expect(m.motes.some((mo, i) => mo.y !== y0[i])).toBe(true)
    m.degrade(2)
    expect(m.bird).toBeNull()
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('吹泡泡 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new BubbleModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(300)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new BubbleModel(createRng(2))
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
    const g = createBubbleGame()
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
    const mute = createBubbleGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
