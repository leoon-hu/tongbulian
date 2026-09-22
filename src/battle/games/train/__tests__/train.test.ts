import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { createTrainGame } from '..'
import { OUT_TIME, RUN_TIME, TrainModel, WIN_TIME, layoutTrain } from '../model'
import { renderBackground, renderDynamic } from '../render'

const snap = (red: number, blue: number, phase: GameState['phase'] = 'playing', winner: GameState['winner'] = null): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner,
  lastPoint: null,
})

function settle(m: TrainModel, seconds = RUN_TIME + 0.5): void {
  for (let t = 0; t < seconds; t += 1 / 60) m.step(1 / 60)
}

describe('开火车 · 模型（B36v）', () => {
  it('0…8 × 0…8 每个比分：车头位置随分数单调、正好开出 score 节车厢；8 分一路开到对面的车站；轮子随位移转', () => {
    const m = new TrainModel(createRng(1))
    m.layout(1000, 120, false)
    const g = m.geo
    let prevRed = -Infinity
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        const w0 = m.wheel[1]
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        settle(m, WIN_TIME + 0.6)
        m.trains.forEach((c, idx) => {
          const i = idx as 0 | 1
          const score = i === 0 ? red : blue
          expect(c.pos.value).toBeGreaterThanOrEqual(g.mouthX + g.size - 0.01)
          expect(c.pos.value).toBeLessThanOrEqual(g.stationX + 0.01)
          if (c.team === won) {
            expect(c.pos.value).toBeCloseTo(g.stationX, 3)
            expect(m.carsOut(i)).toBe(8)
            expect(m.arrived[i]).toBe(true)
          } else {
            expect(c.pos.value).toBeCloseTo(m.headFor(score), 3)
            expect(m.carsOut(i)).toBe(score)
            // 第 score 节车厢的车尾正好在隧道口
            if (score > 0) expect(m.wagonX(i, score) - g.carLen).toBeCloseTo(g.mouthX, 3)
          }
        })
        if (blue > 0 && blue < 8 && red < 8) expect(m.wheel[1]).not.toBe(w0)
      }
      m.setState(snap(red, 0))
      settle(m)
      if (red < 8) {
        expect(m.trains[0].pos.value).toBeGreaterThan(prevRed)
        prevRed = m.trains[0].pos.value
      }
    }
    // 整列（车头 + 8 节）开到车站后车尾仍在隧道外
    expect(m.wagonX(0, 8) - g.carLen).toBeGreaterThan(g.mouthX)
  })

  it('倒数藏在隧道里只亮车灯、洞口冒烟；开始信号变绿、鸣笛开出来；得分冒烟乘客挥手；连对汽笛；反超回头；还差一分钟发光铃响；到站蒸汽彩纸乘客跳站长举旗；输了冒黑烟；倒数归位', () => {
    const m = new TrainModel(createRng(7))
    m.layout(1000, 120, false)
    const g = m.geo
    m.setState(snap(0, 0, 'countdown'))
    m.onEvent({ type: 'countdown' })
    expect(m.trains.map((c) => c.mood)).toEqual(['ready', 'ready'])
    expect(m.trains[0].pos.value).toBeLessThan(g.mouthX)
    expect(m.light(m.trains[0])).toBe(1)
    expect(m.signal.value).toBe(0)
    settle(m, 1.2)
    expect(m.particles.count).toBeGreaterThan(0) // 隧道口漏出来的一小口烟
    for (const p of m.particles.items) expect(p.x).toBeGreaterThanOrEqual(g.mouthX)
    m.setState(snap(0, 0, 'playing'))
    m.onEvent({ type: 'go' })
    expect(m.signal.target).toBe(1)
    expect(m.whistle[0].value).toBe(1)
    expect(m.trains[0].pos.target).toBeCloseTo(m.headFor(0), 3)
    settle(m, OUT_TIME + 0.3)
    expect(m.trains[0].pos.value).toBeCloseTo(m.headFor(0), 3)
    expect(m.carsOut(0)).toBe(0)
    expect(m.signal.value).toBeCloseTo(1, 3)
    m.particles.clear()
    m.setState(snap(1, 0))
    m.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 1 })
    expect(m.trains[0].mood).toBe('run')
    expect(m.crowdWave).toEqual([1, 0, 1])
    for (let i = 0; i < 20; i++) m.step(1 / 60)
    expect(m.particles.count).toBeGreaterThan(3) // 跑的时候烟囱一直冒
    expect(m.roll[0]).toBeGreaterThan(0.3)
    expect(m.lift(m.trains[0])).toBeGreaterThanOrEqual(0)
    settle(m)
    expect(m.carsOut(0)).toBe(1)
    m.onEvent({ type: 'streak', team: 'red', playerId: 'a', n: 3 })
    expect(m.trains[0].boost.value).toBe(1)
    expect(m.whistle[0].value).toBe(1)
    m.setState(snap(2, 0))
    settle(m)
    m.setState(snap(2, 3))
    m.onEvent({ type: 'lead', team: 'blue' })
    expect(m.trains[0].look.value).toBe(1)
    settle(m)
    m.setState(snap(6, 3))
    settle(m)
    expect(m.sprint).toBe(true)
    m.onEvent({ type: 'nearWin', team: 'red' })
    expect(m.signGlow.value).toBe(1)
    expect(m.bell.value).toBeGreaterThan(0)
    m.setState(snap(8, 3, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    expect(m.trains.map((c) => c.mood)).toEqual(['win', 'lose'])
    expect(m.trains[0].pos.target).toBeCloseTo(g.stationX, 3)
    expect(m.arrived[0]).toBe(false)
    settle(m, WIN_TIME * 0.5)
    expect(m.arrived[0]).toBe(false) // 还在路上
    expect(m.roll[0]).toBeGreaterThan(0.5) // 冲向车站时轮子在转、烟在冒
    m.particles.clear()
    settle(m, WIN_TIME * 0.6)
    expect(m.arrived[0]).toBe(true)
    expect(m.trains[0].pos.value).toBeCloseTo(g.stationX, 3)
    expect(m.greet.target).toBe(1)
    expect(m.crowdJump).toBeGreaterThan(0)
    expect(m.particles.count).toBeGreaterThan(10) // 蒸汽 + 彩纸
    expect(m.light(m.trains[1])).toBeLessThan(0.2)
    expect(m.sad(m.trains[1])).toBeGreaterThan(0)
    m.particles.clear()
    settle(m, 1.2)
    expect(m.particles.count).toBeGreaterThan(0) // 输的熄火冒黑烟
    expect(m.particles.items.some((p) => p.color === '#5f5f66' || p.color === '#7a7a82')).toBe(true)
    m.setState(snap(0, 0, 'countdown'))
    expect(m.trains.every((c) => c.mood === 'ready' && c.pos.value < g.mouthX)).toBe(true)
    expect(m.particles.count).toBe(0)
    expect(m.signal.value).toBe(0)
    expect(m.greet.value).toBe(0)
  })

  it('点一下（B59）：那列火车鸣笛喷汽、烟囱冒一团烟、车身颠一下，分数不变', () => {
    const m = new TrainModel(createRng(4))
    m.layout(1000, 120, false)
    m.setState(snap(2, 3))
    settle(m)
    m.particles.clear()
    m.poke('blue')
    expect(m.whistle[1].value).toBe(1)
    expect(m.whistle[0].value).toBeLessThan(0.2) // 开局那一声早衰减下去了
    expect(m.particles.count).toBeGreaterThan(0)
    m.step(1 / 60)
    expect(m.lift(m.trains[1])).toBeGreaterThan(m.lift(m.trains[0]) + 1)
    expect(m.carsOut(1)).toBe(3)
    expect(m.trains[1].pos.target).toBeCloseTo(m.headFor(3), 3)
  })

  it('到一半（B70）：那一队做一下点一下的小动作——鸣笛喷汽', () => {
    const m = new TrainModel(createRng(4))
    m.layout(1000, 120, false)
    m.setState(snap(4, 1))
    settle(m)
    m.onEvent({ type: 'half', team: 'red' })
    expect(m.whistle[0].value).toBe(1)
    expect(m.whistle[1].value).toBeLessThan(0.2)
  })

  it('晚进来的观战者：第一份快照就是比赛中 / 已结束，火车也开出来到该在的位置；结束态换了胜方也对', () => {
    const m = new TrainModel(createRng(2))
    m.layout(1000, 120, false)
    m.setState(snap(0, 0, 'lobby'))
    expect(m.trains[0].pos.value).toBeLessThan(m.geo.mouthX)
    m.setState(snap(0, 4, 'playing'))
    settle(m, OUT_TIME + 0.3)
    expect(m.trains[0].pos.value).toBeCloseTo(m.headFor(0), 3)
    expect(m.trains[1].pos.value).toBeCloseTo(m.headFor(4), 3)
    expect(m.signal.value).toBeCloseTo(1, 3)
    const late = new TrainModel(createRng(3))
    late.layout(1000, 120, false)
    late.setState(snap(2, 8, 'ended', 'blue'))
    settle(late, WIN_TIME + 0.5)
    expect(late.trains[1].pos.value).toBeCloseTo(late.geo.stationX, 3)
    expect(late.arrived[1]).toBe(true)
    expect(late.trains[0].pos.value).toBeCloseTo(late.headFor(2), 3)
    late.setState(snap(8, 2, 'ended', 'red'))
    settle(late, WIN_TIME + 0.5)
    expect(late.trains[0].pos.value).toBeCloseTo(late.geo.stationX, 3)
    expect(late.arrived[0]).toBe(true)
    expect(late.trains[1].mood).toBe('lose')
  })

  it('紧凑版布局、reduced-motion、降级都不抛错；四种盒子尺寸 8 节都放得下还留冲刺的路；模型 10000 步很快', () => {
    const quiet = new TrainModel(createRng(3), { reducedMotion: true })
    quiet.layout(820, 56, true)
    expect(quiet.geo.compact).toBe(true)
    expect(quiet.clouds).toHaveLength(1)
    quiet.setState(snap(0, 0, 'countdown'))
    quiet.setState(snap(0, 0, 'playing'))
    quiet.setState(snap(3, 2))
    settle(quiet)
    expect(quiet.trains[0].pos.value).toBeCloseTo(quiet.headFor(3), 3)
    expect(quiet.carsOut(0)).toBe(3)
    expect(quiet.particles.count).toBe(0)
    expect(quiet.lift(quiet.trains[0])).toBe(0)
    quiet.setState(snap(8, 2, 'ended', 'red'))
    settle(quiet, 1)
    expect(quiet.trains[0].pos.value).toBeCloseTo(quiet.geo.stationX, 3)
    expect(quiet.arrived[0]).toBe(true)
    for (const [W, H, compact] of [
      [1000, 120, false],
      [700, 120, false],
      [820, 56, true],
      [560, 56, true],
    ] as const) {
      const g = layoutTrain(W, H, compact)
      expect(g.pitch).toBeGreaterThan(g.gap)
      expect(g.carLen).toBeGreaterThan(0)
      const head8 = g.mouthX + g.size + 8 * g.pitch
      expect(head8 + g.size * 2).toBeLessThanOrEqual(g.stationX + 0.01)
      expect(g.stationX - (g.size + 8 * g.pitch)).toBeGreaterThan(g.mouthX) // 整列停在车站时车尾在隧道外
      expect(g.laneY[0]).toBeLessThan(g.laneY[1])
      expect(g.laneY[1]).toBeLessThanOrEqual(H)
      expect(g.hiddenX).toBeLessThan(g.mouthX)
    }
    const m = new TrainModel(createRng(5))
    m.layout(1000, 120, false)
    m.setState(snap(4, 4))
    m.degrade(2)
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, 1)
    expect(m.particles.count).toBe(0)
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) m.step(1 / 60)
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('开火车 · 渲染冒烟', () => {
  it('假 ctx 下背景与每帧动态各自的绘制调用有上限，不抛错；火车裁在隧道口右边', () => {
    const m = new TrainModel(createRng(2))
    m.layout(1000, 120, false)
    const bg = stubCtx()
    renderBackground(bg, m.geo)
    expect(bg.calls.length).toBeLessThan(1500)
    m.setState(snap(8, 7, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    settle(m, WIN_TIME + 0.5)
    const dyn = stubCtx()
    renderDynamic(dyn, m)
    expect(dyn.count('clip')).toBe(1)
    expect(dyn.calls.length).toBeGreaterThan(80)
    expect(dyn.calls.length).toBeLessThan(2600) // 两列各 8 节车厢 + 车头
    const compact = new TrainModel(createRng(2))
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
    const g = createTrainGame()
    g.mount({ canvas: stubCanvas(ctx), width: 1000, height: 120, dpr: 2, compact: false, reducedMotion: false })
    expect(g.meta.id).toBe('train')
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
    const mute = createTrainGame()
    mute.mount({ canvas: stubCanvas(null), width: 1000, height: 120, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap(2, 2))
      mute.tick(0.016)
      mute.destroy()
    }).not.toThrow()
  })
})
