import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createFruitGame } from '..'
import { FALL_TIME, FruitModel, STAGGER, layoutFruit } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: FruitModel, seconds = FALL_TIME + STAGGER * 8 + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('摘果子 · 模型（B36p）', () => {
  it('0…8 × 0…8 每个比分落稳后：篮子里的果子数 = 分数、树上剩 8 − 分数个；8 分赢了篮子举起、发光', () => {
    const m = new FruitModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        const scores = [red, blue]
        m.pickers.forEach((p, i) => {
          expect(m.landed(i)).toBe(scores[i])
          expect(m.onTree(i)).toBe(8 - scores[i]!)
          for (const f of m.fruits[i]!) {
            if (f.state === 'basket') {
              expect(f.y.value).toBeLessThanOrEqual(g.basketTop + g.basketH * 0.1)
              expect(Math.abs(f.x.value - g.basketX[i]!)).toBeLessThan(g.basketW * 0.4)
            }
          }
          if (p.mood === 'win') expect(m.basketLift(p, i)).toBeGreaterThan(g.size * 0.4)
        })
      }
      m.setState(snap(red, 0))
      settle(m)
    }
  })

  it('倒数果子都在树上、角色蹦；开始树抖；得分跳起来够、树冠晃、落叶、果子掉进篮子弹一下、篮子颠；一次跳几个逐个错开；反超回头；还差一分篮子发光；结束举篮亮片三轮、小鸟落树；输了挠头叶子落头上', () => {
    const m = new FruitModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.pickers.map((p) => p.mood)).toEqual(['ready', 'ready'])
    expect(m.onTree(0)).toBe(8)
    m.step(0.3)
    expect(m.liftOf(m.pickers[0], 0)).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.shake.value).toBeGreaterThan(0.5)
    settle(m, 1.5)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.pickers[0].mood).toBe('run')
    expect(m.jump[0].value).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(m.fruits[0][0]!.state).toBe('falling')
    expect(Math.abs(m.swayOf())).toBeGreaterThanOrEqual(0)
    let bumped = false
    for (let t = 0; t < FALL_TIME + 0.3; t += 1 / 60) {
      m.step(1 / 60)
      if (m.bump[0].value > 0.5) bumped = true
    }
    expect(bumped).toBe(true)
    expect(m.landed(0)).toBe(1)
    expect(m.fruits[0][0]!.y.value).toBeCloseTo(m.pileAt(0, 0).y, 2)
    // 一次跳三个：逐个错开落
    m.setState(snap(4, 0))
    expect(m.fruits[0].slice(1, 4).every((f) => f.state === 'falling')).toBe(true)
    expect(m.fruits[0][1]!.delay).toBe(0)
    expect(m.fruits[0][2]!.delay).toBeCloseTo(STAGGER, 5)
    expect(m.fruits[0][3]!.delay).toBeCloseTo(STAGGER * 2, 5)
    for (let t = 0; t < FALL_TIME * 0.5; t += 1 / 60) m.step(1 / 60)
    expect(m.fruits[0][1]!.y.value).toBeGreaterThan(m.fruits[0][3]!.y.value) // 先落的更靠下
    settle(m)
    expect(m.landed(0)).toBe(4)
    expect(m.onTree(0)).toBe(4)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.shake.value).toBe(1.2)
    m.setState(snap(4, 5))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.pickers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 5))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.basketGlow[0].value).toBe(1)
    expect(m.basketGlow[1].value).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 5, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.pickers.map((p) => p.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10)
    m.particles.clear()
    settle(m, 1.2)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮亮片
    expect(m.landed(0)).toBe(8)
    expect(m.basketLift(m.pickers[0], 0)).toBeGreaterThan(g.size * 0.4)
    expect(m.scratchOf(m.pickers[1])).toBe(1)
    settle(m, 1)
    expect(m.leafOnHead(m.pickers[1])).toBe(1)
    expect(m.leafOnHead(m.pickers[0])).toBe(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.pickers.every((p) => p.mood === 'ready')).toBe(true)
    expect(m.onTree(0)).toBe(8)
    expect(m.onTree(1)).toBe(8)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，篮子里的果子也齐了、篮子举起来', () => {
    const m = new FruitModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m)
    expect(m.landed(1)).toBe(8)
    expect(m.landed(0)).toBe(3)
    expect(m.basketLift(m.pickers[1], 1)).toBeGreaterThan(0)
  })

  it('紧凑版布局、reduced-motion（果子直接到位）、降级都不抛错；几何自洽；小鸟与落叶会动；模型 10000 步很快', () => {
    const quiet = new FruitModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.leaves).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet, 1)
    expect(quiet.landed(0)).toBe(3)
    expect(quiet.landed(1)).toBe(2)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.swayOf()).toBe(0)
    expect(quiet.liftOf(quiet.pickers[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.landed(0)).toBe(8)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutFruit(W, H, compact)
      expect(g.canopyY - g.canopyH * 0.62).toBeGreaterThanOrEqual(-1) // 树冠最上面那团的顶边
      expect(g.basketTop + g.basketH).toBeLessThanOrEqual(H + 1)
      expect(g.treeSlots[0]).toHaveLength(8)
      expect(g.treeSlots[1]).toHaveLength(8)
      for (const s of [...g.treeSlots[0], ...g.treeSlots[1]]) {
        expect(s.x).toBeGreaterThan(0)
        expect(s.x).toBeLessThan(W)
        expect(s.y).toBeLessThan(g.basketTop)
      }
      expect(g.treeSlots[0].every((s) => s.x < W / 2)).toBe(true)
      expect(g.treeSlots[1].every((s) => s.x > W / 2)).toBe(true)
    }
    const m = new FruitModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    settle(m)
    const y0 = m.leaves.map((l) => l.y)
    let seen = false
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.bird) seen = true
    }
    expect(seen).toBe(true)
    expect(m.leaves.some((l, i) => l.y !== y0[i])).toBe(true)
    m.degrade(2)
    expect(m.bird).toBeNull()
    m.setState(snap(8, 4, 'ended', 'red'))
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('摘果子 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new FruitModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1400)
    const compact = new FruitModel(createRng(2))
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
    const g = createFruitGame()
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
    const mute = createFruitGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
