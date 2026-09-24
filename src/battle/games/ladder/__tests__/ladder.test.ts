import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createLadderGame } from '..'
import { CLIMB_TIME, LadderModel, WIN_WALK, layoutLadder } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: LadderModel, seconds = CLIMB_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('爬梯子 · 模型（B36j）', () => {
  it('0…8 × 0…8 每个比分：高度随分数单调上升、脚在地面与平台之间；8 分站在平台上举旗、走到旗子旁边', () => {
    const m = new LadderModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRed = Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        m.climbers.forEach((c, i) => {
          expect(c.pos.value).toBeLessThanOrEqual(g.groundY + 0.01)
          expect(c.pos.value).toBeGreaterThanOrEqual(g.platformY - 0.01)
          if (c.mood !== 'win') expect(m.xOf(c, i)).toBeCloseTo(g.ladderX[i]!, 0)
        })
        if (won) {
          const w = m.climber(won)
          const i = won === 'red' ? 0 : 1
          expect(w.pos.value).toBeCloseTo(g.platformY, 3)
          expect(m.flagOf(w)).toBe(1)
          expect(Math.abs(m.xOf(w, i) - g.flagX[i]!)).toBeLessThan(g.size * 0.3)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.climbers[0].pos.value).toBeLessThan(prevRed)
        prevRed = m.climbers[0].pos.value
      }
    }
  })

  it('倒数站在地上蹦；开始抓梯；得分横档弯、梯子晃、掉碎叶、手脚交替；连对更晃；反超回头；还差一分旗子发光；结束彩纸三轮、举旗；输了挂着晃腿', () => {
    const m = new LadderModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.climbers.map((c) => c.mood)).toEqual(['ready', 'ready'])
    expect(m.climbers[0].pos.value).toBeCloseTo(g.groundY, 3)
    m.step(0.3)
    expect(m.liftOf(m.climbers[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.shake[0].value).toBeGreaterThan(0)
    settle(m, 1.5)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.climbers[0].mood).toBe('run')
    expect(m.flex[0].value).toBe(1)
    expect(m.flexRung[0]).toBe(1)
    expect(m.particles.count).toBeGreaterThan(0)
    let alternated = false
    for (let i = 0; i < 30; i++) {
      m.step(1 / 60)
      if (Math.abs(m.climbOf(m.climbers[0])) > 0.3) alternated = true
    }
    expect(alternated).toBe(true)
    settle(m)
    expect(m.climbers[0].pos.value).toBeCloseTo(m.rungY(1), 3)
    expect(m.climbOf(m.climbers[0])).toBeCloseTo(0, 1)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.shake[0].value).toBe(1)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.climbers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    const f0 = m.flagWave
    m.step(0.1)
    expect(m.flagWave - f0).toBeGreaterThan(1)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.flagGlow[0].value).toBe(1)
    expect(m.flagGlow[1].value).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.climbers.map((c) => c.mood)).toEqual(['win', 'lose'])
    expect(m.particles.count).toBeGreaterThan(10)
    expect(m.flagOf(m.climbers[0])).toBe(0) // 还没走到旗子旁边
    m.particles.clear()
    settle(m, WIN_WALK + 0.1)
    expect(m.particles.count).toBeGreaterThan(0) // 第二轮彩纸
    expect(m.flagOf(m.climbers[0])).toBe(1)
    expect(m.hangOf(m.climbers[1])).toBeGreaterThan(0.5)
    settle(m, 0.5)
    expect(m.hangOf(m.climbers[1])).toBe(1)
    expect(m.liftOf(m.climbers[0])).toBeGreaterThanOrEqual(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.climbers.every((c) => c.mood === 'ready' && Math.abs(c.pos.value - g.groundY) < 0.01)).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；小鸟与落叶会动；模型 10000 步很快', () => {
    const quiet = new LadderModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.leaves).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.climbers[0].pos.value).toBeCloseTo(quiet.yFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.shakeX(0)).toBe(0)
    expect(quiet.swayOf(quiet.climbers[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.climbers[0].pos.value).toBeCloseTo(quiet.geo.platformY, 3)
    expect(quiet.xOf(quiet.climbers[0], 0)).toBe(quiet.geo.ladderX[0]) // 紧凑版不走到旗子旁边
    expect(quiet.flagOf(quiet.climbers[0])).toBe(1)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutLadder(W, H, compact)
      expect(g.platformY - g.size * 1.35).toBeGreaterThanOrEqual(0)
      expect(g.groundY).toBeGreaterThan(g.platformY)
      expect(g.pitch).toBeGreaterThan(0)
      expect(g.plankX0).toBeGreaterThanOrEqual(0)
      expect(g.plankX1).toBeLessThanOrEqual(W)
      expect(g.flagX[0]).toBeGreaterThan(g.ladderX[0] + g.railGap / 2)
      expect(g.flagX[1]).toBeLessThan(g.ladderX[1] - g.railGap / 2)
    }
    const m = new LadderModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let seen = false
    const y0 = m.leaves.map((l) => l.y)
    for (let t = 0; t < 14; t += 1 / 30) {
      m.step(1 / 30)
      if (m.bird) seen = true
    }
    expect(seen).toBe(true)
    expect(m.leaves.some((l, i) => l.y !== y0[i])).toBe(true)
    m.degrade(2)
    expect(m.bird).toBeNull()
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('爬梯子 · 一题里的表演（B72）', () => {
  it('等久了两腿晃、冒泡泡，按键亮灯泡往上够；红队答对握拳欢呼、蓝队答错手一滑往下出溜再爬回原处；只演自己那一队；画得出来', () => {
    const m = new LadderModel(createRng(3))
    m.layout(150, 700, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.climbers
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    expect(m.legsOf(r)).toBeGreaterThan(0.5)
    m.setState({ ...snap(3, 2), inputs: { blue: '1' } })
    expect(b.act.bulbT).toBe(0)
    expect(r.act.bulbT).toBe(-1)
    settle(m, 0.4)
    expect(b.act.typing).toBeGreaterThan(0.9)
    expect(m.legsOf(b)).toBeLessThan(0.1)
    m.setState(snap(3, 2))
    const home = b.pos.value
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    expect(m.shake[1].value).toBeGreaterThan(0.4) // 手一滑，梯子晃一下
    expect(m.shake[0].value).toBe(0)
    let maxArms = 0
    let maxSlip = 0
    let maxSweat = 0
    const ctx = stubCtx()
    for (let i = 0; i < 80; i++) {
      m.step(1 / 60)
      const pr = r.act.pose()
      const pb = b.act.pose()
      maxArms = Math.max(maxArms, pr.arms)
      maxSlip = Math.max(maxSlip, m.slipOf(b))
      maxSweat = Math.max(maxSweat, pb.sweat)
      expect(m.slipOf(r)).toBe(0)
      expect(pb.arms).toBe(0)
      expect(b.pos.value).toBe(home) // 不后退：分数对应的位置不动，只是表演里往下出溜一点
      if (i % 10 === 0) renderDynamic(ctx, m)
    }
    expect(maxArms).toBeGreaterThan(0.9)
    expect(maxSlip).toBeGreaterThan(m.geo.size * 0.15)
    expect(maxSlip).toBeLessThan(m.geo.size * 0.3)
    expect(maxSweat).toBe(1)
    expect(m.slipOf(b)).toBe(0) // 1.3 秒后已经爬回原处
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    // 减少动画：不出溜、不晃腿
    const quiet = new LadderModel(createRng(4), { reducedMotion: true })
    quiet.layout(96, 350, true)
    quiet.setState(snap(3, 2))
    settle(quiet, 1)
    expect(quiet.legsOf(quiet.climbers[0])).toBe(0)
    quiet.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    for (let i = 0; i < 30; i++) {
      quiet.step(1 / 60)
      expect(quiet.slipOf(quiet.climbers[1])).toBe(0)
      expect(quiet.climbers[1].act.pose().wide).toBeGreaterThan(0)
    }
    const c = stubCtx()
    renderDynamic(c, quiet)
    expect(c.count('save')).toBe(c.count('restore'))
  })
})

describe('爬梯子 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new LadderModel(createRng(2))
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
    const compact = new LadderModel(createRng(2))
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
    const g = createLadderGame()
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
    const mute = createLadderGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
