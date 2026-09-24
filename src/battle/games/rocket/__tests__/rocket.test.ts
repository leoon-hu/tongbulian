import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createRocketGame } from '..'
import { RISE_TIME, RocketModel, layoutRocket } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: RocketModel, seconds = RISE_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('火箭升空 · 模型（B36b）', () => {
  it('0…8 × 0…8 每个比分：y 随分数单调上升、都在发射台与目标星之间；8 分抵达目标星', () => {
    const m = new RocketModel(createRng(1))
    m.layout(150, 700, false)
    const g = m.geo
    let prevRedY = Infinity
    for (let red = 0; red <= 8; red++) {
      let prevBlueY = Infinity
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        const [r, b] = m.rockets
        for (const y of [r.y.value, b.y.value]) {
          expect(y).toBeLessThanOrEqual(g.padY + 0.01)
          expect(y).toBeGreaterThanOrEqual(g.goalY - g.size * 0.15 - 0.01)
        }
        if (won === 'red') expect(r.y.value).toBeLessThan(g.goalY)
        if (won === 'blue') expect(b.y.value).toBeLessThan(g.goalY)
        else {
          expect(b.y.value).toBeLessThan(prevBlueY)
          prevBlueY = b.y.value
        }
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.rockets[0].y.value).toBeLessThan(prevRedY)
        prevRedY = m.rockets[0].y.value
      }
    }
  })

  it('倒数在台上抖、台下冒烟；开始喷火 + 台面闪光；得分喷大火冒烟；反超晃；还差一分星星脉动；结束烟花三轮、负方断火下沉', () => {
    const m = new RocketModel(createRng(7))
    m.layout(150, 700, false)
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.rockets.map((r) => r.mood)).toEqual(['ready', 'ready'])
    settle(m, 0.5)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(Math.abs(m.xOffset(m.rockets[0]))).toBeGreaterThanOrEqual(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.padGlow.value).toBe(1)
    expect(m.flameOf(m.rockets[0])).toBeGreaterThan(1)
    settle(m, 1.5)
    expect(m.rockets.map((r) => r.mood)).toEqual(['idle', 'idle'])

    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    m.step(0.1)
    m.step(0.1)
    expect(m.rockets[0].mood).toBe('run')
    expect(m.rockets[0].moving).toBeGreaterThan(0.5)
    expect(m.flameOf(m.rockets[0])).toBeGreaterThan(0.8)
    const y0 = m.rockets[0].y.value
    settle(m)
    expect(m.rockets[0].y.value).toBeLessThan(y0)
    expect(m.rockets[0].moving).toBeLessThan(0.05)

    m.setState(snap(1, 2))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.rockets[0].shake.value).toBe(1)
    m.onEvent({ type: 'nearWin', team: 'blue' })
    expect(m.goalPulse.value).toBe(1)
    settle(m)
    m.setState(snap(1, 8, 'ended', 'blue'))
    m.onEvent({ type: 'finished', winner: 'blue' })
    expect(m.rockets.map((r) => r.mood)).toEqual(['lose', 'win'])
    const afterFirst = m.particles.count
    expect(afterFirst).toBeGreaterThan(10)
    settle(m, 0.55)
    // 第二轮烟花又补了粒子（池有上限，只看不为 0）
    expect(m.particles.count).toBeGreaterThan(0)
    settle(m, 3)
    expect(m.rockets[1].y.value).toBeLessThan(m.geo.goalY)
    expect(m.yOf(m.rockets[0])).toBeGreaterThan(m.rockets[0].y.value) // 输了下沉
    expect(m.tiltOf(m.rockets[0])).toBeGreaterThan(0)
    expect(m.rays).toBeGreaterThan(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；流星会出现又消失；模型 10000 步很快', () => {
    const quiet = new RocketModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.geo.size).toBeLessThanOrEqual(28)
    expect(quiet.planet).toBeNull()
    expect(quiet.stars.length).toBeLessThanOrEqual(12)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    quiet.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 2 })
    settle(quiet)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.xOffset(quiet.rockets[0])).toBe(0)
    const m = new RocketModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    let seen = false
    for (let t = 0; t < 12; t += 1 / 30) {
      m.step(1 / 30)
      if (m.shooting) seen = true
    }
    expect(seen).toBe(true)
    m.degrade(2)
    expect(m.shooting).toBeNull()
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
    expect(layoutRocket(150, 700, false).goalY).toBeLessThan(layoutRocket(150, 700, false).padY)
  })
})

describe('火箭升空 · 一题里的表演（B72）', () => {
  const answered = (team: 'red' | 'blue', correct: boolean) => ({ type: 'answered' as const, playerId: team[0]!, team, index: 0, correct, given: '1' })

  it('得过分之后停稳了照样悬停起伏、等久了冒泡泡；按键亮灯泡、火苗蹿一下；红队答对往上一蹿、喷大火；蓝队答错火苗哑了、冒灰烟、晃；只演自己那一队；画得出来', () => {
    const m = new RocketModel(createRng(3))
    m.layout(150, 700, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.rockets
    expect(r.mood).toBe('run')
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < 120; i++) {
      m.step(1 / 60)
      lo = Math.min(lo, m.yOf(r))
      hi = Math.max(hi, m.yOf(r))
    }
    expect(hi - lo).toBeGreaterThan(m.geo.size * 0.05) // 悬停起伏
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    expect(r.act.bulbT).toBe(0)
    expect(b.act.bulbT).toBe(-1)
    expect(m.flameAct(r, 0.4)).toBeGreaterThan(1) // 按一下火苗蹿一下
    expect(m.flameAct(b, 0.4)).toBeLessThan(0.7)
    settle(m, 0.5)
    m.particles.clear()
    m.onEvent(answered('red', true))
    m.onEvent(answered('blue', false))
    expect(m.particles.items.some((p) => ['#a4a4b4', '#c2c2ce', '#8a8a9a'].includes(p.color))).toBe(true) // 一口灰烟
    let maxLift = 0
    let maxFlame = 0
    let minFlame = Infinity
    let maxShake = 0
    let maxSweat = 0
    const ctx = stubCtx()
    for (let i = 0; i < 40; i++) {
      m.step(1 / 60)
      const pr = r.act.pose()
      const pb = b.act.pose()
      maxLift = Math.max(maxLift, pr.lift)
      maxFlame = Math.max(maxFlame, m.flameAct(r, m.flameOf(r)))
      minFlame = Math.min(minFlame, m.flameAct(b, m.flameOf(b)))
      maxShake = Math.max(maxShake, Math.abs(pb.shake))
      maxSweat = Math.max(maxSweat, pb.sweat)
      expect(pb.lift).toBeLessThan(0.2)
      if (i % 10 === 0) renderDynamic(ctx, m)
    }
    expect(maxLift).toBeGreaterThan(0.3)
    expect(maxFlame).toBeGreaterThan(1.2)
    expect(maxFlame).toBeLessThanOrEqual(2.2)
    expect(minFlame).toBeLessThan(0.25)
    expect(maxShake).toBeGreaterThan(0.1)
    expect(maxSweat).toBe(1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    settle(m, 1.5)
    expect(m.flameAct(b, 0.4)).toBeGreaterThan(0.2) // 火又旺回来
  })

  it('减少动画时尾焰不跟着表演变、没有烟，只留头顶图标', () => {
    const quiet = new RocketModel(createRng(4), { reducedMotion: true })
    quiet.layout(150, 700, false)
    quiet.setState(snap(2, 2))
    settle(quiet, 2)
    quiet.setState({ ...snap(2, 2), inputs: { red: '3' } })
    quiet.onEvent(answered('blue', false))
    expect(quiet.flameAct(quiet.rockets[0], 0.4)).toBe(0.4)
    expect(quiet.flameAct(quiet.rockets[1], 0.4)).toBe(0.4)
    expect(quiet.rockets[0].act.pose().bulb).toBeGreaterThan(0.9)
    expect(quiet.rockets[1].act.pose().lift).toBe(0)
    expect(quiet.particles.count).toBe(0)
  })
})

describe('火箭升空 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new RocketModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(200)
    m.setState(snap(6, 5))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 3 })
    m.onEvent({ type: 'finished', winner: 'red' })
    m.step(0.1)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(900)
    const compact = new RocketModel(createRng(2))
    compact.layout(96, 350, true)
    compact.setState(snap(4, 2))
    const c = stubCtx()
    renderBackground(c, compact.geo)
    renderDynamic(c, compact)
    expect(c.calls.length).toBeGreaterThan(20)
  })

  it('GameModule：全流程不抛错，没有 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const g = createRocketGame()
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
    const mute = createRocketGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
