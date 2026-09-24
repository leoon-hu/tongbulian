import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '../contract'
import {
  Actor,
  BULB_TIME,
  GESTURE_GAP,
  RIGHT_TIME,
  THINK_AFTER,
  WRONG_TIME,
  actEvent,
  actState,
  drawActFx,
  withActBody,
  type ActPose,
} from '../engine/act'
import { stubCtx } from './stub'

const STATE: GameState = { red: 0, blue: 0, target: 8, phase: 'playing', winner: null, lastPoint: null }

function run(a: Actor, seconds: number, dt = 1 / 60): void {
  for (let t = 0; t < seconds; t += dt) a.step(dt)
}

/** 一段时间里每帧的姿势 */
function poses(a: Actor, seconds: number, dt = 1 / 60): ActPose[] {
  const out: ActPose[] = []
  for (let t = 0; t < seconds; t += dt) {
    a.step(dt)
    out.push(a.pose())
  }
  return out
}

const max = (xs: number[]) => Math.max(...xs)
const min = (xs: number[]) => Math.min(...xs)

describe('角色表演（B72）', () => {
  it('等答题：一直在呼吸晃动，隔几秒做一个小动作，等久了冒「想」的泡泡；没开打不做', () => {
    const a = new Actor(createRng(1))
    a.sync('countdown', '')
    run(a, 10)
    expect(a.gesture).toBeNull()
    expect(a.think).toBe(0)
    a.sync('playing', '')
    const ps = poses(a, GESTURE_GAP[1] + 0.1)
    // 呼吸：压扁拉长看得出来（原来待机几乎不动）
    expect(max(ps.map((p) => p.sy)) - min(ps.map((p) => p.sy))).toBeGreaterThan(0.05)
    expect(max(ps.map((p) => Math.abs(p.shake)))).toBeGreaterThan(0.02)
    // 最迟 GESTURE_GAP[1] 秒开始一个小动作
    expect(a.gesture !== null || ps.some((p) => p.look > 0.5 || p.scratch > 0.5 || p.wave > 0.5 || p.arms > 0.3 || p.lift > 0.05)).toBe(true)
    run(a, THINK_AFTER)
    expect(a.think).toBeGreaterThan(0.9)
    expect(a.pose().think).toBeGreaterThan(0.9)
  })

  it('开始按键：灯泡亮一下、泡泡收掉、身子前倾，每按一下压一下；按键时不做小动作', () => {
    const a = new Actor(createRng(2))
    a.sync('playing', '')
    run(a, THINK_AFTER + 1)
    expect(a.think).toBeGreaterThan(0.9)
    a.sync('playing', '3')
    expect(a.bulbT).toBe(0)
    run(a, 0.3)
    const p = a.pose()
    expect(p.bulb).toBe(1)
    expect(p.lean).toBeGreaterThan(0.08)
    expect(a.think).toBeLessThan(0.3)
    expect(a.gesture).toBeNull()
    // 再按一下：不重新亮灯泡，但压一下
    const before = a.pose().sy
    a.sync('playing', '35')
    expect(a.pose().sy).toBeLessThan(before)
    run(a, BULB_TIME)
    expect(a.pose().bulb).toBe(0)
    run(a, 10)
    expect(a.gesture).toBeNull()
  })

  it('答对：蓄力压扁 → 跳起来 → 落地 → 举手欢呼，头上迸亮片；连对翻个跟头', () => {
    const a = new Actor(createRng(3))
    a.sync('playing', '')
    a.answered(true)
    const ps = poses(a, RIGHT_TIME)
    expect(min(ps.slice(0, 6).map((p) => p.sy))).toBeLessThan(0.9)
    expect(max(ps.map((p) => p.lift))).toBeGreaterThan(0.4)
    expect(max(ps.map((p) => p.arms))).toBeGreaterThan(0.9)
    expect(max(ps.map((p) => p.sparkle))).toBeGreaterThan(0.5)
    expect(max(ps.map((p) => p.spin))).toBe(0)
    expect(a.rightT).toBe(-1)
    expect(a.pose().arms).toBe(0)
    a.answered(true)
    a.streak()
    const big = poses(a, RIGHT_TIME)
    expect(max(big.map((p) => p.spin))).toBeGreaterThan(Math.PI * 1.8)
    expect(max(big.map((p) => p.lift))).toBeGreaterThan(max(ps.map((p) => p.lift)))
  })

  it('答错：往后一仰、瞪眼、冒汗、摇头，然后站好；不跳、不举手，下一题出来前做完', () => {
    const a = new Actor(createRng(4))
    a.sync('playing', '')
    a.answered(false)
    const ps = poses(a, WRONG_TIME)
    expect(min(ps.map((p) => p.lean))).toBeLessThan(-0.15)
    expect(max(ps.map((p) => p.wide))).toBe(1)
    expect(max(ps.map((p) => p.sweat))).toBe(1)
    const shakes = ps.map((p) => p.shake)
    expect(max(shakes)).toBeGreaterThan(0.12)
    expect(min(shakes)).toBeLessThan(-0.12)
    expect(max(ps.map((p) => p.arms))).toBe(0)
    expect(max(ps.map((p) => p.lift))).toBeLessThan(0.2)
    expect(a.wrongT).toBe(-1)
    const p = a.pose()
    expect(p.sweat).toBe(0)
    expect(p.wide).toBe(0)
  })

  it('减少动画：不跳不晃不翻跟头、不做小动作，只留举手 / 表情 / 头顶图标', () => {
    const a = new Actor(createRng(5), undefined, false)
    a.sync('playing', '')
    const idle = poses(a, 8)
    expect(idle.every((p) => p.lift === 0 && p.shake === 0 && p.sy === 1 && p.sx === 1)).toBe(true)
    expect(a.gesture).toBeNull()
    expect(a.think).toBeGreaterThan(0.9)
    a.answered(true)
    a.streak()
    const right = poses(a, RIGHT_TIME)
    expect(right.every((p) => p.lift === 0 && p.spin === 0 && p.sparkle === 0)).toBe(true)
    expect(max(right.map((p) => p.arms))).toBeGreaterThan(0.9)
    a.answered(false)
    const wrong = poses(a, WRONG_TIME)
    expect(wrong.every((p) => p.shake === 0 && p.lean === 0)).toBe(true)
    expect(max(wrong.map((p) => p.sweat))).toBe(1)
  })

  it('比赛外的答题不算；结束 / 倒数时各拍收掉', () => {
    const a = new Actor(createRng(6))
    a.sync('countdown', '')
    a.answered(true)
    expect(a.rightT).toBe(-1)
    a.sync('playing', '')
    a.answered(true)
    a.sync('ended', '')
    expect(a.rightT).toBe(-1)
    expect(a.pose().arms).toBe(0)
  })

  it('actEvent / actState：按 team 分给那一队；没有 inputs 当没在按', () => {
    const acts = { red: new Actor(createRng(7)), blue: new Actor(createRng(8)) }
    actState({ ...STATE, inputs: { red: '4' } }, (t) => acts[t])
    expect(acts.red.bulbT).toBe(0)
    expect(acts.blue.bulbT).toBe(-1)
    actEvent({ type: 'answered', playerId: 'b', team: 'blue', index: 0, correct: false, given: '1' }, (t) => acts[t])
    expect(acts.blue.wrongT).toBe(0)
    expect(acts.red.wrongT).toBe(-1)
    actEvent({ type: 'answered', playerId: 'a', team: 'red', index: 0, correct: true, given: '4' }, (t) => acts[t])
    actEvent({ type: 'streak', playerId: 'a', team: 'red', n: 3 }, (t) => acts[t])
    expect(acts.red.big).toBe(true)
  })

  it('withActBody / drawActFx：画得出来，调用有数', () => {
    const ctx = stubCtx()
    const a = new Actor(createRng(9))
    a.sync('playing', '')
    a.answered(true)
    a.streak()
    run(a, 0.3)
    let drew = 0
    withActBody(ctx, 10, 20, 30, a.pose(), -1, () => {
      drew++
    })
    expect(drew).toBe(1)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    const busy: ActPose = { ...a.pose(), think: 1, bulb: 1, sweat: 1, sparkle: 0.5 }
    drawActFx(ctx, 10, 20, 12, busy, { side: 1, quality: 0 })
    expect(ctx.count('fill')).toBeGreaterThan(10)
    expect(ctx.calls.length).toBeLessThan(200)
    const before = ctx.calls.length
    drawActFx(ctx, 10, 20, 12, { ...busy, think: 0, bulb: 0, sweat: 0 }, { side: 1, quality: 2 })
    expect(ctx.calls.length).toBe(before)
  })
})
