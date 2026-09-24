import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createSwimGame } from '..'
import { DIVE_TIME, SPLASH_AT, SWIM_TIME, SwimModel, layoutSwim } from '../model'
import { RIGHT_TIME } from '@/battle/game/engine/act'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: SwimModel, seconds = SWIM_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('游泳 · 模型（B36i）', () => {
  it('0…8 × 0…8 每个比分：位置随分数单调、在道内；8 分手拍到触板', () => {
    const m = new SwimModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    let prevRed = -Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        m.swimmers.forEach((s, i) => {
          expect(s.pos.value).toBeGreaterThanOrEqual(g.runFrom - 0.01)
          expect(s.pos.value + g.size * 0.35).toBeLessThanOrEqual(g.finishX + 0.01)
          expect(m.xOf(s, i)).toBeCloseTo(s.pos.value, 3)
        })
        if (won) expect(m.swimmer(won).pos.value).toBeGreaterThan(g.runTo)
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.swimmers[0].pos.value).toBeGreaterThan(prevRed)
        prevRed = m.swimmers[0].pos.value
      }
    }
  })

  it('倒数蹲在出发台上；开始跳水入池溅水花；得分打水花、地砖亮、观众挥手；连对更急；反超回头；还差一分触板发光；结束拍板闪光 + 彩纸；输了仰面漂', () => {
    const m = new SwimModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.swimmers.map((s) => s.mood)).toEqual(['ready', 'ready'])
    expect(m.xOf(m.swimmers[0], 0)).toBeCloseTo(g.blockX, 3)
    expect(m.dive[0].value).toBe(0)
    m.step(0.1)
    expect(m.bobOf(m.swimmers[0], 0)).toBeLessThanOrEqual(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.starter.target).toBe(1)
    expect(m.swimmers[0].mood).toBe('idle')
    m.step(DIVE_TIME * 0.5)
    const mid = m.xOf(m.swimmers[0], 0)
    expect(mid).toBeGreaterThan(g.blockX)
    expect(mid).toBeLessThan(g.runFrom)
    expect(m.airOf(0)).toBeGreaterThan(0.5)
    settle(m, DIVE_TIME)
    expect(m.particles.count).toBeGreaterThan(0) // 入水的水花
    expect(m.xOf(m.swimmers[0], 0)).toBeCloseTo(g.runFrom, 3)
    expect(m.airOf(0)).toBe(0)
    settle(m, 1.5)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.swimmers[0].mood).toBe('run')
    expect(m.crowdWave).toEqual([1, 0, 1, 0])
    expect(m.particles.count).toBeGreaterThan(0)
    for (let i = 0; i < 20; i++) m.step(1 / 60)
    expect(m.bowOf(m.swimmers[0])).toBeGreaterThan(0.3)
    settle(m)
    expect(m.swimmers[0].pos.value).toBeCloseTo(m.xFor(1), 3)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.swimmers[0].boost.value).toBe(1)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.swimmers[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    const w0 = m.waveT
    m.step(0.1)
    expect(m.waveT - w0).toBeGreaterThan(0.2)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.padGlow.value).toBe(1)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.swimmers.map((s) => s.mood)).toEqual(['win', 'lose'])
    expect(m.padFlash.value).toBe(1)
    expect(m.crowdJump).toBeGreaterThan(0)
    expect(m.particles.count).toBeGreaterThan(20)
    settle(m, 2)
    expect(m.swimmers[0].pos.value).toBeGreaterThan(g.runTo)
    expect(m.floatOf(m.swimmers[1])).toBe(1)
    expect(m.bowOf(m.swimmers[1])).toBe(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.swimmers.every((s) => s.mood === 'ready' && Math.abs(s.pos.value - g.runFrom) < 0.01)).toBe(true)
    expect(m.dive.every((d) => d.value === 0)).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion（不跳水）、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    const quiet = new SwimModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.onEvent({ type: 'go' })
    expect(quiet.dive[0].value).toBe(1)
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.swimmers[0].pos.value).toBeCloseTo(quiet.xFor(3), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.bobOf(quiet.swimmers[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.swimmers[0].pos.value).toBeGreaterThan(quiet.geo.runTo)
    for (const [W, H, compact] of [
      [1000, 120, false],
      [820, 56, true],
      [600, 120, false],
    ] as const) {
      const g = layoutSwim(W, H, compact)
      expect(g.runTo).toBeGreaterThan(g.runFrom)
      expect(g.blockX).toBeLessThan(g.runFrom)
      expect(g.laneY[1] + g.laneH / 2).toBeLessThanOrEqual(g.poolBottom + 0.01)
      expect(g.poolTop).toBeGreaterThanOrEqual(g.deckY)
    }
    const m = new SwimModel(createRng(5))
    m.layout(1000, 120, false)
    m.setState(snap(4, 4))
    m.degrade(2)
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('游泳 · 一题里的表演（B72）', () => {
  it('等久了踩水冒泡泡、按键亮灯泡摆好架势；红队答对跃起拍起一大片水花、蓝队答错呛水吐一口；只演自己那一队；画得出来', () => {
    const m = new SwimModel(createRng(3))
    m.layout(1000, 120, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.swimmers
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    expect(m.treadOf(r)).toBeGreaterThan(0.9)
    m.particles.clear()
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    expect(r.act.bulbT).toBe(0)
    expect(b.act.bulbT).toBe(-1)
    expect(m.particles.count).toBeGreaterThan(0) // 按一下手往前划、溅两滴
    settle(m, 0.4)
    expect(r.act.typing).toBeGreaterThan(0.9)
    expect(m.treadOf(r)).toBeLessThan(0.3)
    m.setState(snap(3, 2))
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    m.particles.clear()
    let maxLift = 0
    let maxArms = 0
    let maxSweat = 0
    let maxShake = 0
    let splashed = false
    const ctx = stubCtx()
    for (let i = 0; i < 70; i++) {
      const before = m.particles.count
      m.step(1 / 60)
      if (r.act.rightT >= SPLASH_AT * RIGHT_TIME && m.particles.count > before + 8) splashed = true
      const pr = r.act.pose()
      const pb = b.act.pose()
      maxLift = Math.max(maxLift, pr.lift)
      maxArms = Math.max(maxArms, pr.arms)
      maxSweat = Math.max(maxSweat, pb.sweat)
      maxShake = Math.max(maxShake, Math.abs(pb.shake))
      expect(pb.arms).toBe(0)
      expect(pr.sweat).toBe(0)
      if (i % 10 === 0) renderDynamic(ctx, m)
    }
    expect(maxLift).toBeGreaterThan(0.3)
    expect(maxArms).toBeGreaterThan(0.9)
    expect(splashed).toBe(true)
    expect(maxSweat).toBe(1)
    expect(maxShake).toBeGreaterThan(0.1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    // 减少动画：不跳不晃、不溅水，只留表情
    const quiet = new SwimModel(createRng(4), { reducedMotion: true })
    quiet.layout(820, 56, true)
    quiet.setState(snap(3, 2))
    settle(quiet, 1)
    quiet.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    for (let i = 0; i < 40; i++) {
      quiet.step(1 / 60)
      expect(quiet.swimmers[0].act.pose().lift).toBe(0)
    }
    expect(quiet.particles.count).toBe(0)
    expect(quiet.treadOf(quiet.swimmers[0])).toBe(0)
    const c = stubCtx()
    renderDynamic(c, quiet)
    expect(c.count('save')).toBe(c.count('restore'))
  })
})

describe('游泳 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new SwimModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo, 8)
    expect(bg.calls.length).toBeLessThan(2500)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1500)
    const compact = new SwimModel(createRng(2))
    compact.layout(820, 56, true)
    compact.setState(snap(4, 2))
    settle(compact)
    const c = stubCtx()
    renderBackground(c, compact.geo, 8)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(40)
  })

  it('GameModule：全流程不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createSwimGame()
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
    const mute = createSwimGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
