import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createTugGame } from '..'
import { DRAG_TIME, TugModel, layoutTug } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

/** 推进到位移、摔倒、松手都结束 */
function settle(m: TugModel, seconds = DRAG_TIME + 0.9): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('拔河 · 模型（B36d）', () => {
  it('0…8 × 0…8 每个比分：蝴蝶结只由比分差决定、随红 − 蓝单调、不超最大偏移；四只都在画面里；赢家那局负方在水坑里', () => {
    const m = new TugModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    for (let d = -7; d < 7; d++) expect(m.bowXFor(d + 1, 0)).toBeLessThan(m.bowXFor(d, 0))
    expect(m.bowXFor(3, 1)).toBeCloseTo(m.bowXFor(7, 5), 6)
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m)
        for (const side of m.sides) {
          for (const p of side.members) {
            expect(p.x.value).toBeGreaterThanOrEqual(g.size * 0.5)
            expect(p.x.value).toBeLessThanOrEqual(g.W - g.size * 0.5)
          }
        }
        if (!won) {
          expect(m.bow.value).toBeCloseTo(m.bowXFor(red, blue), 3)
          expect(Math.abs(m.bow.value - g.centerX)).toBeLessThanOrEqual(g.maxShift + 0.01)
          expect(m.sides.every((s) => s.mood === 'idle' && s.release.value === 0)).toBe(true)
          continue
        }
        const win = m.side(won)
        const lose = m.side(won === 'red' ? 'blue' : 'red')
        for (const p of lose.members) {
          expect(Math.abs(p.x.value - g.centerX)).toBeLessThan(g.puddleRx)
          expect(p.fallen.value).toBeCloseTo(1, 3)
          expect(p.splashed).toBe(true)
        }
        for (const p of win.members) expect(won === 'red' ? p.x.value < g.centerX : p.x.value > g.centerX).toBe(true)
        expect(won === 'red' ? m.bow.value < g.centerX : m.bow.value > g.centerX).toBe(true)
        expect(win.release.value).toBeCloseTo(1, 3)
        expect(m.cheerOf(win)).toBeCloseTo(1, 3)
      }
    }
  })

  it('倒数原地蹦、绳子松垮；开始绷直；得分拉动 + 被拉打滑扬尘 + 粉丝挥手；反超冒汗；冲刺发抖；还差一分发光；结束溅水、涟漪、彩纸、观众跳', () => {
    const m = new TugModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.sides.map((s) => s.mood)).toEqual(['ready', 'ready'])
    expect(m.sagOf()).toBeGreaterThan(g.size * 0.3)
    m.step(0.2)
    expect(Math.max(m.liftOf(m.sides[0], 0), m.liftOf(m.sides[0], 1))).toBeGreaterThan(0)
    expect(m.bow.value).toBeCloseTo(g.centerX, 3)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.sides.every((s) => s.mood === 'idle' && s.strain.value > 0.5)).toBe(true)
    expect(m.sagOf()).toBeLessThan(g.size * 0.1)
    settle(m, 1)

    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.sides[0].strain.value).toBeGreaterThan(0.6)
    expect(m.sides[1].stumble.value).toBeGreaterThan(0.6)
    expect(m.leanOf(m.sides[0])).toBeGreaterThan(m.leanOf(m.sides[1]))
    expect(m.crowdWave).toEqual([1, 1, 0, 0])
    for (let i = 0; i < 12; i++) m.step(1 / 60)
    expect(m.particles.count).toBeGreaterThan(0)
    expect(m.bowKick.value).toBeGreaterThan(0)
    settle(m)
    expect(m.bow.value).toBeLessThan(g.centerX)

    m.setState(snap(1, 2))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.sides[0].sweat.value).toBe(1)
    settle(m)
    expect(m.bow.value).toBeGreaterThan(g.centerX)

    m.setState(snap(6, 2))
    settle(m)
    expect(m.sprint).toBe(true)
    expect(m.crowdWave.every((w) => w >= 0.5)).toBe(true)
    const a1 = m.anchors()
    m.step(0.02)
    const a2 = m.anchors()
    expect(a1.bow.y).not.toBeCloseTo(a2.bow.y, 3)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.bowGlow.value).toBe(1)

    m.setState(snap(8, 2, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.sides.map((s) => s.mood)).toEqual(['win', 'lose'])
    expect(m.crowdJump).toBeGreaterThan(0)
    expect(m.particles.count).toBeGreaterThan(10)
    expect(m.leanOf(m.sides[0])).toBeGreaterThan(0.8)
    expect(m.leanOf(m.sides[1])).toBeLessThan(0)
    let ripple = false
    for (let t = 0; t < DRAG_TIME + 0.6; t += 1 / 60) {
      m.step(1 / 60)
      if (m.rippleT >= 0) ripple = true
    }
    expect(ripple).toBe(true)
    expect(m.sides[1].members.every((p) => p.splashed)).toBe(true)
    settle(m)
    expect(m.sides[0].release.value).toBeCloseTo(1, 3)
    expect(m.liftOf(m.sides[0], 0) + m.liftOf(m.sides[0], 1)).toBeGreaterThan(0)
    const ended = m.anchors()
    expect(ended.bow.y).toBeGreaterThan(g.ropeY)
    // 再来一局：倒数把一切归位
    m.setState(snap(0, 0, 'countdown'))
    expect(m.bow.value).toBeCloseTo(g.centerX, 3)
    expect(m.sides.every((s) => s.release.value === 0 && s.members.every((p) => p.fallen.value === 0 && !p.splashed))).toBe(true)
    expect(m.particles.count).toBe(0)
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    const quiet = new TugModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    expect(quiet.geo.crowdX).toHaveLength(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.bow.value).toBeCloseTo(quiet.bowXFor(3, 2), 3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.sides[0], 0)).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.sides[1].members.every((p) => p.fallen.value === 1)).toBe(true)
    expect(quiet.particles.count).toBe(0)
    for (const [W, H, compact] of [
      [1000, 120, false],
      [820, 56, true],
      [600, 120, false],
      [400, 56, true],
    ] as const) {
      const g = layoutTug(W, H, compact)
      expect(g.ropeHalf).toBeGreaterThanOrEqual(g.size)
      expect(g.maxShift).toBeGreaterThanOrEqual(0)
      const probe = new TugModel(createRng(1))
      probe.layout(W, H, compact)
      for (const winner of ['red', 'blue'] as const) {
        const tg = probe.targets(8, 0, winner)
        for (const x of [...tg.red, ...tg.blue, tg.bow]) {
          expect(x).toBeGreaterThanOrEqual(g.size * 0.5 - 0.01)
          expect(x).toBeLessThanOrEqual(W - g.size * 0.5 + 0.01)
        }
      }
    }
    const m = new TugModel(createRng(5))
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

describe('拔河 · 一题里的表演（B72）', () => {
  it('等答题一仰一回；按键亮灯泡、蹬地更往后仰；红队答对使劲一拽、蓝队答错脚下一滑往前一栽冒汗；绳子与蝴蝶结只看比分；画得出来', () => {
    const m = new TugModel(createRng(3))
    m.layout(1000, 120, false)
    m.setState(snap(0, 0, 'countdown'))
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.sides
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    // 一起一拉：后仰一直在变，同队后面那个慢半拍
    const leans: number[] = []
    for (let i = 0; i < 60; i++) {
      m.step(1 / 60)
      leans.push(m.leanOf(r))
    }
    expect(Math.max(...leans) - Math.min(...leans)).toBeGreaterThan(0.15)
    expect(m.leanOf(r, 1)).not.toBeCloseTo(m.leanOf(r, 0), 3)
    const bowX = m.bow.value
    const hands = m.anchors()
    const before = m.leanOf(r) - m.actLean(r)
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    expect(r.act.bulbT).toBe(0)
    expect(b.act.bulbT).toBe(-1)
    settle(m, 0.3)
    expect(r.act.typing).toBeGreaterThan(0.8)
    expect(m.actLean(r) - 0.16 * Math.sin(r.heave)).toBeGreaterThan(0.2) // 蹬地更往后仰
    expect(m.strainOf(r)).toBeGreaterThan(0.6)
    m.setState(snap(3, 2))
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    let maxYank = -Infinity
    let minBlue = Infinity
    let maxSlip = 0
    let maxSweat = 0
    const ctx = stubCtx()
    let dynMax = 0
    for (let i = 0; i < 70; i++) {
      m.step(1 / 60)
      maxYank = Math.max(maxYank, m.leanOf(r) - before)
      minBlue = Math.min(minBlue, m.leanOf(b))
      maxSlip = Math.max(maxSlip, m.slipOf(b))
      maxSweat = Math.max(maxSweat, b.act.pose().sweat)
      expect(m.slipOf(r)).toBe(0)
      if (i % 10 === 0) {
        const n = ctx.calls.length
        renderDynamic(ctx, m)
        dynMax = Math.max(dynMax, ctx.calls.length - n)
      }
    }
    expect(maxYank).toBeGreaterThan(0.4)
    expect(maxSlip).toBe(1)
    expect(minBlue).toBeLessThan(0)
    expect(maxSweat).toBe(1)
    // 比分没变：蝴蝶结与手抓绳的地方都不动（表演只落在身子上）
    expect(m.bow.value).toBeCloseTo(bowX, 6)
    const after = m.anchors()
    expect(after.redFront.x).toBeCloseTo(hands.redFront.x, 6)
    expect(after.blueFront.x).toBeCloseTo(hands.blueFront.x, 6)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    expect(dynMax).toBeLessThan(1400) // 表演的每一帧也在绘制调用上限内
    // 过了答错那一拍（1.2 秒）站回来
    settle(m, 1)
    expect(m.slipOf(b)).toBe(0)
  })

  it('点一下角色：蹦的是被点的那一队两个人，另一队不动（原来按第几个人算，两队各蹦一个）', () => {
    const m = new TugModel(createRng(4))
    m.layout(1000, 120, false)
    m.setState(snap(0, 0, 'countdown'))
    m.setState(snap(2, 2))
    settle(m, 1)
    m.poke('red')
    m.step(1 / 60)
    const [r, b] = m.sides
    expect(m.liftOf(r, 0)).toBeGreaterThan(m.geo.size * 0.2)
    expect(m.liftOf(r, 1)).toBeGreaterThan(m.geo.size * 0.2)
    expect(m.liftOf(b, 0)).toBe(0)
    expect(m.liftOf(b, 1)).toBe(0)
    // 抓绳的手跟着蹦
    expect(m.anchors().redBack.y).toBeLessThan(m.geo.ropeY - m.geo.size * 0.2)
    expect(m.anchors().blueBack.y).toBeCloseTo(m.geo.ropeY, 6)
  })

  it('减少动画：不仰不滑不跳，只留表情与头顶图标', () => {
    const m = new TugModel(createRng(5), { reducedMotion: true })
    m.layout(1000, 120, false)
    m.setState(snap(3, 2))
    m.setState({ ...snap(3, 2), inputs: { red: '1' } })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    for (let i = 0; i < 30; i++) {
      m.step(1 / 60)
      expect(m.actLean(m.sides[0])).toBe(0)
      expect(m.slipOf(m.sides[1])).toBe(0)
      expect(m.liftOf(m.sides[0], 0)).toBe(0)
    }
    expect(m.sides[0].act.pose().bulb).toBeGreaterThan(0)
    expect(m.sides[1].act.pose().wide).toBeGreaterThan(0.5)
  })
})

describe('拔河 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new TugModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(1000)
    m.setState(snap(6, 5))
    m.onEvent({ type: 'lead', team: 'red' })
    m.onEvent({ type: 'nearWin', team: 'red' })
    for (let i = 0; i < 10; i++) m.step(1 / 60)
    const mid = stubCtx()
    renderDynamic(mid, m)
    expect(mid.calls.length).toBeGreaterThan(80)
    expect(mid.calls.length).toBeLessThan(1400)
    m.setState(snap(8, 5, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, DRAG_TIME + 0.2)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(80)
    expect(dyn.calls.length).toBeLessThan(1400)
    const compact = new TugModel(createRng(2))
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
    const g = createTugGame()
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
    const mute = createTugGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
