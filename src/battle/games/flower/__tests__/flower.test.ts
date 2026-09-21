import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createFlowerGame } from '..'
import { BLOOM_TIME, FlowerModel, GROW_TIME, LEAVES, layoutFlower } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: FlowerModel, seconds = GROW_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

function leaves(m: FlowerModel, i: number): number {
  let n = 0
  for (let k = 1; k <= LEAVES; k++) if (m.leafScale(m.plants[i]!, k) >= 0.99) n++
  return n
}

describe('种花 · 模型（B36m）', () => {
  it('0…8 × 0…8 每个比分：茎高随分数单调、叶子数 = min(分数, 6)、7 分有花苞；8 分赢了开花、有蝴蝶', () => {
    const m = new FlowerModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRed = -Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, GROW_TIME + BLOOM_TIME + 0.5)
        const scores = [red, blue]
        m.plants.forEach((p, i) => {
          expect(m.stemH(p)).toBeCloseTo(g.pitch * scores[i]!, 2)
          expect(m.tip(i).y).toBeGreaterThanOrEqual(g.tipMax - 1)
          expect(leaves(m, i)).toBe(Math.min(scores[i]!, LEAVES))
          if (scores[i]! >= 7) expect(m.budScale(p, i) + m.bloom[i]!.value).toBeGreaterThan(0.9)
          else expect(m.budScale(p, i)).toBe(0)
        })
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(m.bloom[i]!.value).toBeCloseTo(1, 1)
          expect(m.butterflies).toHaveLength(2)
          expect(m.bloom[1 - i]!.value).toBe(0)
        } else {
          expect(m.butterflies).toHaveLength(0)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.stemH(m.plants[0])).toBeGreaterThan(prevRed)
        prevRed = m.stemH(m.plants[0])
      }
    }
  })

  it('倒数花盆蹦、小芽晃；开始浇水；得分洒水壶浇、水滴落下、茎长高叶子弹出；连对浇更多；反超晃；还差一分花苞亮；结束开花亮片三轮蝴蝶来；输了垂头', () => {
    const m = new FlowerModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.plants.map((p) => p.mood)).toEqual(['ready', 'ready'])
    expect(m.stemH(m.plants[0])).toBe(0)
    m.step(0.3)
    expect(m.liftOf(m.plants[0])).toBeGreaterThan(0)
    expect(Math.abs(m.wiggleOf(m.plants[0]))).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.water[0].value).toBeGreaterThan(0.5)
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 2)
    expect(m.water[0].value).toBeLessThan(0.1)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.plants[0].mood).toBe('run')
    expect(m.water[0].value).toBeGreaterThanOrEqual(1)
    expect(m.canPos(0).dir).toBe(1)
    expect(m.canPos(1).dir).toBe(-1)
    for (let i = 0; i < 12; i++) m.step(1 / 60)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(m.leafScale(m.plants[0], 1)).toBeGreaterThan(0)
    expect(m.leafScale(m.plants[0], 2)).toBe(0)
    settle(m)
    expect(m.stemH(m.plants[0])).toBeCloseTo(g.pitch, 2)
    expect(leaves(m, 0)).toBe(1)
    const pt = m.stemPoint(0, m.leafH(1))
    expect(pt.y).toBeLessThan(g.soilY)
    expect(pt.y).toBeGreaterThan(m.tip(0).y)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.water[0].value).toBe(1.5)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.plants[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(7, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.budScale(m.plants[0], 0)).toBe(1)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.budGlow[0].value).toBe(1)
    expect(m.budGlow[1].value).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.plants.map((p) => p.mood)).toEqual(['win', 'lose'])
    expect(m.bloom[0].value).toBe(0) // 最后一截还在长
    settle(m, GROW_TIME + 0.1)
    expect(m.bloom[0].target).toBe(1)
    expect(m.butterflies).toHaveLength(2)
    m.particles.clear()
    settle(m, BLOOM_TIME + 0.6)
    expect(m.bloom[0].value).toBeCloseTo(1, 1)
    expect(m.budScale(m.plants[0], 0)).toBeLessThan(0.05)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮亮片
    expect(m.wiltOf(m.plants[1])).toBe(1)
    const tip1 = m.tip(1)
    expect(tip1.y).toBeGreaterThan(g.soilY - m.stemH(m.plants[1])) // 垂头：茎尖比原来低
    const b = m.butterflyAt(m.butterflies[0]!)
    expect(Math.abs(b.x - m.tip(0).x)).toBeLessThan(g.bloomR * 3)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.plants.every((p) => p.mood === 'ready' && p.pos.value === 0)).toBe(true)
    expect(m.bloom[0].value).toBe(0)
    expect(m.butterflies).toHaveLength(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的花也是开的', () => {
    const m = new FlowerModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, GROW_TIME + BLOOM_TIME + 0.5)
    expect(m.bloom[1].value).toBeCloseTo(1, 1)
    expect(m.bloom[0].value).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；蜜蜂会飞过；模型 10000 步很快', () => {
    const quiet = new FlowerModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.stemH(quiet.plants[0])).toBeCloseTo(quiet.geo.pitch * 3, 2)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.plants[0])).toBe(0)
    expect(quiet.swayOf(quiet.plants[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.bloom[0].value).toBe(1)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutFlower(W, H, compact)
      expect(g.pitch).toBeGreaterThan(0)
      expect(g.tipMax - g.bloomR).toBeGreaterThanOrEqual(0)
      expect(g.soilY).toBeGreaterThan(g.tipMax)
      expect(g.potTop + g.potH).toBeLessThanOrEqual(H)
    }
    const m = new FlowerModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let seen = false
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.bee) seen = true
    }
    expect(seen).toBe(true)
    m.degrade(2)
    expect(m.bee).toBeNull()
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('种花 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new FlowerModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(400)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new FlowerModel(createRng(2))
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
    const g = createFlowerGame()
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
    const mute = createFlowerGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
