import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { PICKER_HEAD } from '@/battle/game/sprites/fruit'
import { knobsOf } from '@/battle/game/sprites/puzzle'
import { createPuzzleGame } from '..'
import { COLS, FLY_TIME, LIT_TIME, PuzzleModel, ROWS, STAGGER, layoutPuzzle } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: PuzzleModel, seconds = FLY_TIME + STAGGER * 8 + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('拼图 · 模型（B36r）', () => {
  it('0…8 × 0…8 每个比分落稳后：拼上的块数 = 分数、块都在自己的格子里；8 分赢了整图亮起', () => {
    const m = new PuzzleModel(createRng(1))
    m.layout(150, 700, false)
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, FLY_TIME + STAGGER * 8 + LIT_TIME + 0.5)
        const scores = [red, blue]
        for (let i = 0; i < 2; i++) {
          expect(m.placed(i)).toBe(scores[i])
          m.pieces[i]!.forEach((p, n) => {
            if (p.state !== 'placed') return
            const slot = m.slotOf(i, n)
            expect(p.x.value).toBeCloseTo(slot.x, 3)
            expect(p.y.value).toBeCloseTo(slot.y, 3)
          })
        }
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(m.lit[i]!.value).toBeCloseTo(1, 1)
          expect(m.lit[1 - i]!.value).toBe(0)
          expect(m.brightOf(i)).toBeCloseTo(1, 1)
        } else {
          expect(m.lit.every((l) => l.value === 0)).toBe(true)
          for (let i = 0; i < 2; i++) expect(m.brightOf(i)).toBeLessThan(0.9)
        }
      }
      m.setState(snap(red, 0))
      settle(m)
    }
  })

  it('倒数块都在外面、角色蹦；得分块飞进来扣上亮一圈迸亮片、角色跳一下；一次跳几块逐块错开；反超回头；还差一分最后一格闪；结束整图亮起三轮亮片；输了挠头', () => {
    const m = new PuzzleModel(createRng(7))
    m.layout(150, 700, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.kids.map((k) => k.mood)).toEqual(['ready', 'ready'])
    expect(m.pieces[0].every((p) => p.state === 'out')).toBe(true)
    m.step(0.3)
    expect(m.liftOf(m.kids[0])).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    settle(m, 1)
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.kids[0].mood).toBe('run')
    expect(m.pieces[0][0]!.state).toBe('flying')
    expect(m.pieces[0][0]!.x.value).toBeLessThan(0) // 从左边画面外飞进来
    m.step(0.1)
    expect(m.liftOf(m.kids[0])).toBeGreaterThan(0)
    expect(m.pieces[0][0]!.scale.value).toBeGreaterThan(1)
    settle(m, FLY_TIME + 0.2)
    expect(m.placed(0)).toBe(1)
    expect(m.snapPiece[0]).toBe(0)
    expect(m.particles.count).toBeGreaterThan(0)
    // 一次跳三块：逐块错开飞
    m.setState(snap(4, 0))
    expect(m.pieces[0].slice(1, 4).every((p) => p.state === 'flying')).toBe(true)
    expect(m.pieces[0][1]!.delay).toBe(0)
    expect(m.pieces[0][2]!.delay).toBeCloseTo(STAGGER, 5)
    expect(m.pieces[0][3]!.delay).toBeCloseTo(STAGGER * 2, 5)
    settle(m)
    expect(m.placed(0)).toBe(4)
    m.setState(snap(4, 5))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.kids[0].look.value).toBe(1)
    settle(m)
    expect(m.placed(1)).toBe(5)
    expect(m.pieces[1][0]!.x.value).toBeCloseTo(m.slotOf(1, 0).x, 3)
    m.setState(snap(7, 5))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.slotGlow[0].value).toBe(1)
    let pulsed = false
    for (let i = 0; i < 20; i++) {
      m.step(1 / 60)
      if (m.slotPulse(0, 7) > 0.3) pulsed = true
    }
    expect(pulsed).toBe(true)
    expect(m.slotPulse(0, 6)).toBe(0)
    m.particles.clear()
    m.setState(snap(8, 5, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.kids.map((k) => k.mood)).toEqual(['win', 'lose'])
    expect(m.lit[0].target).toBe(0) // 最后一块还在飞
    settle(m, FLY_TIME + 0.2)
    expect(m.placed(0)).toBe(8)
    expect(m.lit[0].target).toBe(1)
    m.particles.clear()
    settle(m, 0.4)
    expect(m.particles.count).toBeGreaterThan(0) // 第二轮亮片（结束后 1 秒那轮）
    settle(m, LIT_TIME + 0.2)
    expect(m.lit[0].value).toBeCloseTo(1, 1)
    expect(m.frameGlow(0)).toBeGreaterThan(0)
    expect(m.scratchOf(m.kids[1])).toBe(1)
    expect(g.size).toBeGreaterThan(0)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.pieces[0].every((p) => p.state === 'out')).toBe(true)
    expect(m.pieces[1].every((p) => p.state === 'out')).toBe(true)
    expect(m.lit[0].value).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('晚进来的观战者：直接给一个已结束的快照，胜方的图也是拼好并亮着的', () => {
    const m = new PuzzleModel(createRng(9))
    m.layout(150, 700, false)
    m.setState(snap(3, 8, 'ended', 'blue'))
    settle(m, FLY_TIME + STAGGER * 8 + LIT_TIME + 0.5)
    expect(m.placed(1)).toBe(8)
    expect(m.placed(0)).toBe(3)
    expect(m.lit[1].value).toBeCloseTo(1, 1)
    expect(m.lit[0].value).toBe(0)
  })

  it('凸凹扣两两相合；紧凑版布局、reduced-motion、降级都不抛错；几何自洽；模型 10000 步很快', () => {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const k = knobsOf(r, c, ROWS, COLS)
        if (c < COLS - 1) expect(k.right).toBe(-knobsOf(r, c + 1, ROWS, COLS).left)
        if (r < ROWS - 1) expect(k.bottom).toBe(-knobsOf(r + 1, c, ROWS, COLS).top)
        if (c === 0) expect(k.left).toBe(0)
        if (r === 0) expect(k.top).toBe(0)
      }
    }
    const quiet = new PuzzleModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.geo.size).toBe(0)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet, 1)
    expect(quiet.placed(0)).toBe(3)
    expect(quiet.placed(1)).toBe(2)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.liftOf(quiet.kids[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1.5)
    expect(quiet.placed(0)).toBe(8)
    expect(quiet.lit[0].value).toBe(1)
    for (const [W, H, compact] of [
      [150, 700, false],
      [96, 350, true],
      [150, 400, false],
    ] as const) {
      const g = layoutPuzzle(W, H, compact)
      expect(g.boardX).toBeGreaterThanOrEqual(0)
      expect(g.boardX + g.boardW).toBeLessThanOrEqual(W)
      expect(g.boardTop[1] + g.boardH).toBeLessThanOrEqual(H)
      expect(g.boardTop[1] + g.boardH).toBeGreaterThan(H * 0.9) // 蓝板贴底
      expect(g.boardTop[1] - (g.boardTop[0] + g.boardH)).toBeGreaterThanOrEqual(10) // 中间空开
      if (!compact) {
        expect(g.kidY[0]).toBeLessThan(g.boardTop[1])
        expect(g.kidY[1] - g.size).toBeGreaterThan(g.boardTop[0] + g.boardH)
      }
      expect(g.pieceH).toBeGreaterThan(0)
      if (!compact) expect(g.kidY[1]).toBeLessThanOrEqual(H)
    }
    const m = new PuzzleModel(createRng(5))
    m.layout(150, 700, false)
    m.setState(snap(4, 4))
    settle(m)
    m.degrade(2)
    m.setState(snap(8, 4, 'ended', 'red'))
    settle(m, 2)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('拼图 · 一题里的表演（B72）', () => {
  it('红队的角色站得离红板够远，答对跳起来头不撞板；等久了托下巴、按键只亮自己那一队的灯泡；红队答对跳起来欢呼、蓝队答错挠挠头冒汗；画得出来', () => {
    for (const [W, H] of [
      [150, 700],
      [300, 1424],
    ] as const) {
      const g = layoutPuzzle(W, H, false)
      expect(g.kidY[0] - (0.7 + PICKER_HEAD) * g.size).toBeGreaterThan(g.boardTop[0] + g.boardH)
    }
    const m = new PuzzleModel(createRng(3))
    m.layout(150, 700, false)
    m.setState(snap(3, 2))
    settle(m, 5)
    const [r, b] = m.kids
    expect(r.act.pose().think).toBeGreaterThan(0.9)
    m.setState({ ...snap(3, 2), inputs: { blue: '2' } })
    expect(b.act.bulbT).toBe(0)
    expect(r.act.bulbT).toBe(-1)
    m.onEvent({ type: 'answered', playerId: 'r', team: 'red', index: 0, correct: true, given: '1' })
    m.onEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '9' })
    m.setState(snap(4, 2))
    m.onEvent({ type: 'point', team: 'red', playerId: 'r', streak: 1 })
    let maxLift = 0
    let maxArms = 0
    let maxScratch = 0
    let maxSweat = 0
    const ctx = stubCtx()
    for (let i = 0; i < 50; i++) {
      m.step(1 / 60)
      maxLift = Math.max(maxLift, r.act.pose().lift)
      maxArms = Math.max(maxArms, r.act.pose().arms)
      maxScratch = Math.max(maxScratch, m.scratchOf(b))
      maxSweat = Math.max(maxSweat, b.act.pose().sweat)
      expect(m.liftOf(r)).toBe(0) // 跳交给表演：蓄力 → 跳 → 落地
      expect(m.scratchOf(r)).toBe(0)
      if (i % 10 === 0) renderDynamic(ctx, m)
    }
    expect(maxLift).toBeGreaterThan(0.3)
    expect(maxArms).toBeGreaterThan(0.9)
    expect(maxScratch).toBeGreaterThan(0.9)
    expect(maxSweat).toBe(1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    settle(m, 1)
    expect(m.scratchOf(b)).toBe(0)
  })
})

describe('拼图 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错', () => {
    const m = new PuzzleModel(createRng(2))
    m.layout(150, 700, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(100)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'nearWin', team: 'red' })
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 2.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.calls.length).toBeGreaterThan(50)
    expect(dyn.calls.length).toBeLessThan(2500)
    const compact = new PuzzleModel(createRng(2))
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
    const g = createPuzzleGame()
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
    const mute = createPuzzleGame()
    mute.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
