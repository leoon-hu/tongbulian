import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createFishGame } from '..'
import { CAST_TIME, FishModel, REEL_TIME, layoutFish } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: FishModel, seconds = REEL_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('钓鱼 · 模型（B36l）', () => {
  it('0…8 × 0…8 每个比分：鱼的高度随分数单调上升、在水底与水面之间；8 分鱼上岸在钓鱼人手里', () => {
    const m = new FishModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRed = Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        m.fishes.forEach((f, i) => {
          if (f.mood === 'win') {
            expect(f.pos.value).toBeCloseTo(g.handY, 3)
            expect(Math.abs(m.xOf(f, i) - g.anglerX[i]!)).toBeLessThan(g.size * 0.1)
          } else {
            expect(f.pos.value).toBeLessThanOrEqual(g.y0 + 0.01)
            expect(f.pos.value).toBeGreaterThanOrEqual(g.y8 - 0.01)
            expect(Math.abs(m.xOf(f, i) - g.laneX[i]!)).toBeLessThan(g.fishS * 0.3)
          }
        })
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.fishes[0].pos.value).toBeLessThan(prevRed)
        prevRed = m.fishes[0].pos.value
      }
    }
  })

  it('倒数鱼在水底横着游、钓鱼人蹦；开始甩线；得分竿弯轮转、鱼头朝上挣扎冒泡；连对更猛；反超回头；还差一分浮漂发光；结束水花 + 彩纸三轮、鱼飞到手里；输了挠头', () => {
    const m = new FishModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.fishes.map((f) => f.mood)).toEqual(['ready', 'ready'])
    expect(m.fishes[0].pos.value).toBeCloseTo(g.y0, 3)
    expect(m.cast[0].value).toBe(0)
    m.step(0.3)
    expect(m.liftOf(m.fishes[0])).toBeGreaterThan(0)
    expect(m.up[0]).toBe(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.cast[0].target).toBe(1)
    settle(m, CAST_TIME + 0.2)
    expect(m.cast[0].value).toBeCloseTo(1, 3)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.fishes[0].mood).toBe('run')
    expect(m.bend[0].value).toBeGreaterThan(0.5)
    expect(m.thrash[0].value).toBeGreaterThan(0.5)
    expect(m.particles.count).toBeGreaterThan(0)
    const r0 = m.reel[0]
    for (let i = 0; i < 20; i++) m.step(1 / 60)
    expect(m.reel[0]).toBeGreaterThan(r0)
    expect(Math.abs(m.thrashOf(m.fishes[0], 0))).toBeGreaterThanOrEqual(0)
    settle(m)
    expect(m.fishes[0].pos.value).toBeCloseTo(m.yFor(1), 3)
    expect(m.up[0]).toBeGreaterThan(0.9)
    expect(m.up[1]).toBeLessThan(0.1)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.thrash[0].value).toBe(1.4)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.fishes[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.bobberGlow[0].value).toBe(1)
    expect(m.bobberGlow[1].value).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.fishes.map((f) => f.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10) // 水花 + 第一轮彩纸
    m.particles.clear()
    settle(m, REEL_TIME + 0.3)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮彩纸
    expect(m.fishes[0].pos.value).toBeCloseTo(g.handY, 3)
    expect(Math.abs(m.xOf(m.fishes[0], 0) - g.anglerX[0])).toBeLessThan(g.size * 0.1)
    expect(m.laidOf(m.fishes[0])).toBe(1)
    expect(m.scratchOf(m.fishes[1])).toBe(1)
    settle(m, 1)
    expect(m.up[1]).toBeLessThan(0.1) // 输了的鱼又横着游
    expect(m.mouthOf(m.fishes[0], 0)).toBe(0.6)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.fishes.every((f) => f.mood === 'ready' && Math.abs(f.pos.value - g.y0) < 0.01)).toBe(true)
    expect(m.cast.every((c) => c.value === 0)).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion（不甩线动画）、降级都不抛错；几何自洽；气泡与杂鱼会动；模型 10000 步很快', () => {
    const quiet = new FishModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.bubbles).toHaveLength(0)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.onEvent({ type: 'go' })
    expect(quiet.cast[0].value).toBe(1)
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.fishes[0].pos.value).toBeCloseTo(quiet.yFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.fishes[0])).toBe(0)
    expect(quiet.xOf(quiet.fishes[0], 0)).toBe(quiet.geo.laneX[0])
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.fishes[0].pos.value).toBeCloseTo(quiet.geo.handY, 3)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutFish(W, H, compact)
      expect(g.pitch).toBeGreaterThan(0)
      expect(g.y8).toBeGreaterThan(g.waterY)
      expect(g.y0).toBeLessThan(g.bottomY)
      expect(g.anglerX[0] - g.size * 0.3).toBeGreaterThanOrEqual(-1)
      expect(g.anglerX[1] + g.size * 0.3).toBeLessThanOrEqual(W + 1)
      expect(g.dockEnd[0]).toBeGreaterThan(g.anglerX[0])
      expect(g.dockEnd[1]).toBeLessThan(g.anglerX[1])
      expect(g.handY).toBeGreaterThan(0)
      const rod = quiet.rodOf(0)
      expect(rod.tipY).toBeLessThan(rod.pivotY)
    }
    const m = new FishModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    const y0 = m.bubbles.map((b) => b.y)
    let seen = false
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.minnow) seen = true
    }
    expect(seen).toBe(true)
    expect(m.bubbles.some((b, i) => b.y !== y0[i])).toBe(true)
    m.degrade(2)
    expect(m.minnow).toBeNull()
    m.setState(snap(8, 4, 'ended', 'red'))
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('钓鱼 · 一题里的表演（B72）', () => {
  it('等久了腿晃得更欢、冒泡泡，按键亮灯泡往水那边探身；红队答对往后一拽竿子举手、蓝队答错竿子一弹鱼挣一下；竿尖跟着人走；只演自己那一队；画得出来', () => {
    const m = new FishModel(createRng(3))
    m.layout(150, 700, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.fishes
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    expect(m.waitOf(r)).toBe(1)
    const tip0 = m.rodOf(0)
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    expect(r.act.bulbT).toBe(0)
    expect(b.act.bulbT).toBe(-1)
    settle(m, 0.4)
    expect(m.bodyOf(0).rot).toBeGreaterThan(0.08) // 往水那边（红队朝右）探身
    expect(Math.abs(m.bodyOf(1).rot)).toBeLessThan(0.08)
    expect(m.rodOf(0).tipX).toBeGreaterThan(tip0.tipX) // 竿子跟着探出去
    m.setState(snap(3, 2))
    settle(m, 0.3)
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    expect(m.thrash[1].value).toBeGreaterThan(0.8) // 鱼挣了一下
    expect(m.thrash[0].value).toBeLessThan(0.1)
    let maxYank = 0
    let maxRaise = 0
    let maxHop = 0
    let minBend = Infinity
    let maxSweat = 0
    const ctx = stubCtx()
    for (let i = 0; i < 70; i++) {
      m.step(1 / 60)
      const pr = r.act.pose()
      const pb = b.act.pose()
      maxYank = Math.max(maxYank, m.yankOf(r))
      maxRaise = Math.max(maxRaise, pr.arms)
      maxHop = Math.max(maxHop, m.geo.dockY - m.bodyOf(0).y)
      minBend = Math.min(minBend, m.rodBend(1))
      maxSweat = Math.max(maxSweat, pb.sweat)
      expect(m.yankOf(b)).toBe(0)
      expect(pb.arms).toBe(0)
      // 竿尖一直在握竿的手上方，鱼线接在竿尖上
      const rod = m.rodOf(0)
      expect(rod.tipY).toBeLessThan(rod.pivotY)
      if (i % 10 === 0) renderDynamic(ctx, m)
    }
    expect(maxYank).toBeGreaterThan(0.9)
    expect(maxRaise).toBeGreaterThan(0.9)
    expect(maxHop).toBeGreaterThan(m.geo.size * 0.1)
    expect(minBend).toBeLessThan(-0.2) // 竿子往上一弹
    expect(maxSweat).toBe(1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    // 紧凑版：跳起来帽顶也不出盒子
    const small = new FishModel(createRng(5))
    small.layout(96, 350, true)
    small.setState(snap(3, 2))
    settle(small, 1)
    small.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    for (let i = 0; i < 40; i++) {
      small.step(1 / 60)
      expect(small.bodyOf(0).y - small.liftOf(small.fishes[0]) - small.geo.size * 1.3 * small.fishes[0].act.pose().sy).toBeGreaterThanOrEqual(0)
    }
    // 减少动画：不探身、不拽、竿子不弹
    const quiet = new FishModel(createRng(4), { reducedMotion: true })
    quiet.layout(96, 350, true)
    quiet.setState(snap(3, 2))
    settle(quiet, 1)
    quiet.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    quiet.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    for (let i = 0; i < 30; i++) {
      quiet.step(1 / 60)
      expect(quiet.yankOf(quiet.fishes[0])).toBe(0)
      expect(quiet.bodyOf(0).y).toBe(quiet.geo.dockY)
      expect(quiet.bodyOf(0).rot).toBe(0)
      expect(quiet.rodBend(1)).toBe(quiet.bend[1].value)
    }
    const c = stubCtx()
    renderDynamic(c, quiet)
    expect(c.count('save')).toBe(c.count('restore'))
  })
})

describe('钓鱼 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new FishModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(300)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const compact = new FishModel(createRng(2))
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
    const g = createFishGame()
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
    const mute = createFishGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
