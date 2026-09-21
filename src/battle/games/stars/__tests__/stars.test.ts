import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createStarsGame } from '..'
import { LIGHT_TIME, LINE_TIME, StarsModel, layoutStars } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: StarsModel, seconds = LIGHT_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('点亮星星 · 模型（B36q）', () => {
  it('0…8 × 0…8 每个比分落稳后：亮的星星数 = 分数、火花不在飞；8 分赢了连线连好', () => {
    const m = new StarsModel(createRng(1))
    m.layout(1000, 120, false)
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, LIGHT_TIME + LINE_TIME + 0.5)
        const scores = [red, blue]
        for (let i = 0; i < 2; i++) {
          expect(m.litCount(i)).toBe(scores[i])
          expect(m.sparkOf(i)).toBeNull()
          for (let n = 0; n < 8; n++) expect(m.litOf(i, n)).toBe(n < scores[i]! ? 1 : 0)
        }
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(m.lines[i]!.value).toBeCloseTo(1, 1)
          expect(m.lines[1 - i]!.value).toBe(0)
        } else {
          expect(m.lines.every((l) => l.value === 0)).toBe(true)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
    }
  })

  it('倒数在云上蹦、棒举着；开始挥棒；得分火花从上一颗飞到下一颗、星星亮起弹一下迸亮片；连对更猛；反超回头；还差一分下一颗闪；结束连线三轮亮片；输了睡着', () => {
    const m = new StarsModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.kids.map((k) => k.mood)).toEqual(['ready', 'ready'])
    expect(m.litCount(0)).toBe(0)
    m.step(0.3)
    expect(m.liftOf(m.kids[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.wave[0].value).toBe(1)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.kids[0].mood).toBe('run')
    expect(m.wave[0].value).toBeGreaterThanOrEqual(1)
    let sawSpark = false
    let sparkX = -Infinity
    for (let i = 0; i < 20; i++) {
      m.step(1 / 60)
      const s = m.sparkOf(0)
      if (s) {
        sawSpark = true
        expect(s.x).toBeGreaterThanOrEqual(sparkX - 0.01)
        sparkX = s.x
        expect(s.x).toBeGreaterThanOrEqual(g.wand[0].x - 0.01)
        expect(s.x).toBeLessThanOrEqual(g.stars[0][0]!.x + 0.01)
      }
    }
    expect(sawSpark).toBe(true)
    expect(m.litCount(0)).toBeLessThanOrEqual(1) // outBack 过冲时可能已经亮了
    let burst = false
    for (let t = 0; t < LIGHT_TIME + 0.5; t += 1 / 60) {
      m.step(1 / 60)
      if (m.particles.count > 0) burst = true
    }
    expect(m.litCount(0)).toBe(1)
    expect(m.popStar[0]).toBe(0)
    expect(burst).toBe(true) // 亮起时迸的亮片
    expect(m.sparkOf(0)).toBeNull()
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.wave[0].value).toBe(1.5)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.kids[0].look.value).toBe(1)
    settle(m)
    expect(m.litCount(1)).toBe(3)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.waveOf(m.kids[0], 0)).toBeGreaterThan(0.2)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.nextGlow[0].value).toBe(1)
    let pulsed = false
    for (let i = 0; i < 20; i++) {
      m.step(1 / 60)
      if (m.pulseOf(0, 6) > 0.3) pulsed = true
    }
    expect(pulsed).toBe(true)
    expect(m.pulseOf(0, 5)).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.kids.map((k) => k.mood)).toEqual(['win', 'lose'])
    expect(m.lines[0].value).toBe(0) // 最后一颗还在亮
    settle(m, LIGHT_TIME + 0.1)
    expect(m.lines[0].target).toBe(1)
    m.particles.clear()
    settle(m, LINE_TIME + 0.6)
    expect(m.lines[0].value).toBeCloseTo(1, 1)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮亮片 / 睡觉的小星星
    expect(m.sleepyOf(m.kids[1])).toBe(1)
    expect(m.scaleOf(0, 3)).toBeGreaterThanOrEqual(1)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.kids.every((k) => k.mood === 'ready' && k.pos.value === 0)).toBe(true)
    expect(m.lines[0].value).toBe(0)
    expect(m.litCount(0)).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的连线也是连好的', () => {
    const m = new StarsModel(createRng(9))
    m.layout(1000, 120, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, LIGHT_TIME + LINE_TIME + 0.5)
    expect(m.lines[1].value).toBeCloseTo(1, 1)
    expect(m.lines[0].value).toBe(0)
    expect(m.litCount(1)).toBe(8)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；小星星会闪；模型 10000 步很快', () => {
    const quiet = new StarsModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.twinkles.length).toBeLessThan(12)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.litCount(0)).toBe(3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.scaleOf(0, 2)).toBe(1)
    expect(quiet.liftOf(quiet.kids[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.lines[0].value).toBe(1)
    for (const [W, H, compact] of [
      [1000, 120, false],
      [820, 56, true],
      [600, 120, false],
    ] as const) {
      const g = layoutStars(W, H, compact)
      for (const row of g.stars) {
        expect(row).toHaveLength(8)
        for (let n = 1; n < 8; n++) expect(row[n]!.x).toBeGreaterThan(row[n - 1]!.x)
        for (const p of row) {
          expect(p.x - g.starR).toBeGreaterThan(g.kidX + g.size * 0.6)
          expect(p.x + g.starR).toBeLessThanOrEqual(W)
          expect(p.y - g.starR).toBeGreaterThanOrEqual(0)
          expect(p.y + g.starR).toBeLessThanOrEqual(H)
        }
      }
      expect(g.stars[1]![0]!.y).toBeGreaterThan(g.stars[0]![0]!.y)
    }
    const m = new StarsModel(createRng(5))
    m.layout(1000, 120, false)
    m.setState(snap(4, 4))
    const a0 = m.twinkleOf(m.twinkles[0]!)
    let twinkled = false
    for (let t = 0; t < 3; t += 1 / 30) {
      m.step(1 / 30)
      if (Math.abs(m.twinkleOf(m.twinkles[0]!) - a0) > 0.2) twinkled = true
    }
    expect(twinkled).toBe(true)
    m.degrade(2)
    expect(m.twinkleOf(m.twinkles[0]!)).toBe(0.6)
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('点亮星星 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new StarsModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1500)
    const compact = new StarsModel(createRng(2))
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
    const g = createStarsGame()
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
    const mute = createStarsGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
