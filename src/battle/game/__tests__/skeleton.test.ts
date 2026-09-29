import { describe, expect, it } from 'vitest'
import { Animator, addPose, clip, mixPose, sampleClip } from '../engine/skeleton'
import { ease } from '../engine/tween'

const REST = { a: 0, b: 10, c: 1 }

describe('骨骼姿势片段（M13）', () => {
  it('采样：关键帧之间按缓动插值，没写的通道取静止姿势，开头之前停在第一帧、结尾之后停在最后一帧', () => {
    const c = clip(1, [
      { t: 0, p: { a: 0 } },
      { t: 0.5, p: { a: 1, b: 20 } },
      { t: 1, p: { a: 3 }, e: ease.outQuad },
    ])
    expect(c.chans).toEqual(['a', 'b'])
    expect(sampleClip(c, 0.25, REST)).toEqual({ a: 0.5, b: 15, c: 1 })
    // 0.5 → 1 用 outQuad：一半时刻走了 3/4
    expect(sampleClip(c, 0.75, REST).a).toBeCloseTo(1 + 2 * 0.75, 6)
    // b 在最后一帧没写 = 静止姿势 10
    expect(sampleClip(c, 1, REST).b).toBe(10)
    expect(sampleClip(c, -1, REST).a).toBe(0)
    expect(sampleClip(c, 5, REST)).toEqual({ a: 3, b: 10, c: 1 })
    // 关键帧顺序随便写，clip() 排好
    const d = clip(1, [
      { t: 1, p: { a: 2 } },
      { t: 0, p: { a: 0 } },
    ])
    expect(sampleClip(d, 0.5, REST).a).toBe(1)
  })

  it('循环：按时长取模，最后一帧到结尾接回第一帧；同一时刻两帧 = 一步跳过去', () => {
    const loop = clip(
      1,
      [
        { t: 0, p: { a: 0 } },
        { t: 0.5, p: { a: 2 } },
      ],
      true,
    )
    expect(sampleClip(loop, 0.25, REST).a).toBeCloseTo(1, 6)
    // 0.5 → 1.0 从 2 回到第一帧的 0
    expect(sampleClip(loop, 0.75, REST).a).toBeCloseTo(1, 6)
    expect(sampleClip(loop, 1.25, REST).a).toBeCloseTo(1, 6)
    expect(sampleClip(loop, -0.25, REST).a).toBeCloseTo(1, 6)
    const step = clip(1, [
      { t: 0, p: { a: 0 } },
      { t: 0.5, p: { a: 1 } },
      { t: 0.5, p: { a: 0 } },
      { t: 1, p: { a: 0 } },
    ])
    expect(sampleClip(step, 0.49, REST).a).toBeCloseTo(0.98, 6)
    expect(sampleClip(step, 0.5, REST).a).toBe(0)
    expect(sampleClip(step, 0.7, REST).a).toBe(0)
  })

  it('混合与叠加：mixPose 按权重、只在一边有的通道原样留下；addPose 按权重加增量', () => {
    expect(mixPose({ a: 0, b: 10 }, { a: 4, c: 3 }, 0.25)).toEqual({ a: 1, b: 10, c: 3 })
    expect(mixPose({ a: 0 }, { a: 4 }, 0)).toEqual({ a: 0 })
    expect(mixPose({ a: 0 }, { a: 4 }, 1)).toEqual({ a: 4 })
    const out = { a: 1, b: 2 }
    expect(addPose(out, { a: 2, z: 1 }, 0.5)).toEqual({ a: 2, b: 2, z: 0.5 })
  })

  it('播放器：换片段时从换的那一刻的姿势交叉淡入（两头慢），淡完全是新片段；同一片段不重来，restart 才从头放', () => {
    const up = clip(1, [{ t: 0, p: { a: 10 } }])
    const down = clip(1, [{ t: 0, p: { a: -10 } }])
    const anim = new Animator(REST)
    expect(anim.pose()).toEqual(REST)
    anim.play(up, 0)
    expect(anim.pose().a).toBe(10)
    expect(anim.blend).toBe(1)
    anim.play(down, 0.2)
    expect(anim.blend).toBe(0)
    expect(anim.pose().a).toBe(10)
    anim.step(0.1)
    // smoothstep(0.5) = 0.5
    expect(anim.blend).toBeCloseTo(0.5, 6)
    expect(anim.pose().a).toBeCloseTo(0, 6)
    anim.step(0.05)
    expect(anim.pose().a).toBeLessThan(-6)
    anim.step(0.1)
    expect(anim.pose().a).toBe(-10)
    // 淡入到一半又换：从当时混合出来的姿势接着淡（不跳）
    anim.play(up, 0.2)
    anim.step(0.1)
    const mid = anim.pose().a!
    anim.play(down, 0.2)
    expect(anim.pose().a).toBeCloseTo(mid, 6)
    // 同一片段不重来
    anim.step(0.5)
    const t = anim.t
    anim.play(down, 0.2)
    expect(anim.t).toBe(t)
    anim.play(down, 0, 1, true)
    expect(anim.t).toBe(0)
    // 不循环的片段放完了
    expect(anim.done).toBe(false)
    anim.step(1.01)
    expect(anim.done).toBe(true)
    // 倍速
    anim.play(up, 0, 2, true)
    anim.step(0.25)
    expect(anim.t).toBeCloseTo(0.5, 6)
  })

  it('叠加层：按权重把增量加上去（没写的通道当 0）；trigger 从头放一遍、放完自己撤掉；setLayer(null) 撤掉', () => {
    const anim = new Animator(REST)
    anim.play(clip(1, [{ t: 0, p: { a: 1 } }], true), 0)
    const lean = clip(1, [{ t: 0, p: { b: -4 } }], true)
    anim.setLayer('lean', lean, 0.5)
    expect(anim.pose()).toEqual({ a: 1, b: 8, c: 1 })
    anim.setLayer('lean', lean, 0)
    expect(anim.pose().b).toBe(10)
    expect(anim.layerWeight('lean')).toBe(0)
    const shake = clip(0.1, [
      { t: 0, p: { a: 1 } },
      { t: 0.1, p: { a: 0 } },
    ])
    anim.trigger('shake', shake, 1)
    expect(anim.pose().a).toBe(2)
    anim.step(0.05)
    expect(anim.pose().a).toBeCloseTo(1.5, 6)
    anim.trigger('shake', shake, 1)
    expect(anim.pose().a).toBe(2)
    anim.step(0.2)
    expect(anim.layerWeight('shake')).toBe(0)
    expect(anim.pose().a).toBe(1)
    anim.setLayer('lean', lean, 1)
    anim.setLayer('lean', null, 1)
    expect(anim.pose().b).toBe(10)
    // 叠加层带进来的、静止姿势里没有的通道不会留到下一次
    anim.setLayer('odd', clip(1, [{ t: 0, p: { zz: 3 } }], true), 1)
    expect(anim.pose().zz).toBe(3)
    anim.setLayer('odd', null, 0)
    expect('zz' in anim.pose()).toBe(false)
  })
})
