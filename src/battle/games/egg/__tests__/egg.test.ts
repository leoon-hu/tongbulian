import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createEggGame } from '..'
import { CRACK_TIME, EggModel, HATCH_TIME, layoutEgg } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: EggModel, seconds = CRACK_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('孵蛋 · 模型（B36n）', () => {
  it('0…8 × 0…8 每个比分：裂缝数 = min(分数, 8)、4 分起有嘴、6 分起壳盖抬起；8 分赢了小鸡在窝边', () => {
    const m = new EggModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, CRACK_TIME + HATCH_TIME + 0.5)
        const scores = [red, blue]
        m.eggs.forEach((e, i) => {
          const sc = scores[i]!
          expect(m.cracksOf(e)).toBe(Math.min(sc, 8))
          expect(m.beakOf(e) > 0).toBe(sc >= 4)
          expect(m.holeOf(e) > 0).toBe(sc >= 4)
          expect(m.liftOf(e) > 0).toBe(sc >= 6)
          if (sc >= 7) expect(m.liftOf(e)).toBe(1)
        })
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(m.hatch[i]!.value).toBeCloseTo(1, 1)
          expect(m.hatch[1 - i]!.value).toBe(0)
          const at = m.chickAt(i)
          expect(at.x).toBeCloseTo(g.chickX[i]!, 0)
          expect(at.y).toBeCloseTo(g.chickY, 0)
        } else {
          expect(m.hatch.every((h) => h.value === 0)).toBe(true)
        }
      }
    }
  })

  it('倒数蛋轻轻摇、母鸡蹦；开始扑翅膀；得分蛋晃、碎壳、裂缝多一条；连对晃更凶；反超歪头；还差一分蛋亮；结束小鸡跳出来羽毛三轮；输了小鸡只探头', () => {
    const m = new EggModel(createRng(7))
    m.layout(150, 700, false)
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.eggs.map((e) => e.mood)).toEqual(['ready', 'ready'])
    expect(m.cracksOf(m.eggs[0])).toBe(0)
    m.step(0.3)
    expect(m.henLift(m.eggs[0])).toBeGreaterThan(0)
    expect(Math.abs(m.rotOf(m.eggs[0], 0))).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.flap[0].value).toBe(1)
    settle(m, 1.5)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.eggs[0].mood).toBe('run')
    expect(m.wobble[0].value).toBeGreaterThanOrEqual(1)
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m)
    expect(m.cracksOf(m.eggs[0])).toBe(1)
    expect(m.cracksOf(m.eggs[1])).toBe(0)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.wobble[0].value).toBe(1.6)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.henTilt(m.eggs[0])).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.liftOf(m.eggs[0])).toBeCloseTo(0.5, 3)
    expect(m.henFlap(m.eggs[0], 0)).toBeGreaterThan(0)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.eggGlow[0].value).toBe(1)
    expect(m.eggGlow[1].value).toBe(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.eggs.map((e) => e.mood)).toEqual(['win', 'lose'])
    expect(m.hatch[0].value).toBe(0) // 最后一步还在孵
    settle(m, CRACK_TIME + 0.1)
    expect(m.hatch[0].target).toBe(1)
    m.particles.clear()
    settle(m, HATCH_TIME + 0.6)
    expect(m.hatch[0].value).toBeCloseTo(1, 1)
    expect(m.particles.count).toBeGreaterThan(0) // 后两轮羽毛
    expect(m.chickAt(0).lift).toBeGreaterThanOrEqual(0)
    expect(m.henFlap(m.eggs[0], 0)).toBeGreaterThan(0.2)
    expect(m.hatch[1].value).toBe(0)
    expect(m.liftOf(m.eggs[1])).toBe(0) // 3 分：还没到探头那一步
    expect(m.henTilt(m.eggs[1])).toBe(1)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.eggs.every((e) => e.mood === 'ready' && e.pos.value === 0)).toBe(true)
    expect(m.hatch[0].value).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的小鸡也在窝边', () => {
    const m = new EggModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, CRACK_TIME + HATCH_TIME + 0.5)
    expect(m.hatch[1].value).toBeCloseTo(1, 1)
    expect(m.hatch[0].value).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；小鸟会飞过；模型 10000 步很快', () => {
    const quiet = new EggModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.cracksOf(quiet.eggs[0])).toBe(3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.rotOf(quiet.eggs[0], 0)).toBe(0)
    expect(quiet.henLift(quiet.eggs[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.hatch[0].value).toBe(1)
    expect(quiet.chickAt(0).lift).toBe(0)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutEgg(W, H, compact)
      expect(g.eggY - g.eggH / 2).toBeGreaterThan(0)
      expect(g.nestY + g.nestH).toBeLessThanOrEqual(H + 1)
      expect(g.strawTop).toBeLessThan(g.nestY)
      expect(g.henX[0] - g.henS * 0.45).toBeGreaterThanOrEqual(-1)
      expect(g.henX[1] + g.henS * 0.45).toBeLessThanOrEqual(W + 1)
      expect(g.chickX[0]).toBeLessThan(g.chickX[1])
    }
    const m = new EggModel(createRng(5))
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
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('孵蛋 · 一题里的表演（B72）', () => {
  it('等久了冒泡泡、按键亮灯泡；红队答对母鸡扑翅膀跳、蛋跟着晃；蓝队答错一惊扑腾、掉羽毛、冒汗、蛋抖一抖；只演自己那一队；画得出来', () => {
    const m = new EggModel(createRng(3))
    m.layout(150, 700, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.eggs
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    expect(r.act.bulbT).toBe(0)
    expect(b.act.bulbT).toBe(-1)
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    expect(m.wobble[0].value).toBeGreaterThan(0.5)
    expect(m.wobble[1].value).toBeGreaterThan(0.5)
    expect(m.flap[1].value).toBeGreaterThan(1)
    expect(m.feathersDown.length).toBeGreaterThanOrEqual(1)
    expect(m.feathersDown.length).toBeLessThanOrEqual(2)
    let maxLift = 0
    let maxArms = 0
    let maxSweat = 0
    let maxShake = 0
    const ctx = stubCtx()
    for (let i = 0; i < 40; i++) {
      m.step(1 / 60)
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
    expect(maxArms).toBeGreaterThan(0.5)
    expect(maxSweat).toBe(1)
    expect(maxShake).toBeGreaterThan(0.1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    // 羽毛飘一会儿就没了；啄地是等答题时的小动作
    settle(m, 2)
    expect(m.feathersDown).toHaveLength(0)
    b.act.forceGesture('nod')
    let peck = 0
    for (let i = 0; i < 60; i++) {
      m.step(1 / 60)
      peck = Math.max(peck, m.peckOf(b))
    }
    expect(peck).toBeGreaterThan(0.5)
    // 减少动画 / 降级 2 级：不掉羽毛
    const quiet = new EggModel(createRng(3), { reducedMotion: true })
    quiet.setState(snap(3, 2))
    quiet.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    expect(quiet.feathersDown).toHaveLength(0)
    m.degrade(2)
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 1, correct: false, given: '9' })
    expect(m.feathersDown).toHaveLength(0)
  })
})

describe('孵蛋 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new EggModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(300)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(1200)
    const mid = new EggModel(createRng(2))
    mid.layout(150, 700, false)
    mid.setState(snap(6, 4))
    settle(mid)
    const d2 = stubCtx()
    renderDynamic(d2, mid)
    expect(d2.calls.length).toBeGreaterThan(50)
    const compact = new EggModel(createRng(2))
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
    const g = createEggGame()
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
    const mute = createEggGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
