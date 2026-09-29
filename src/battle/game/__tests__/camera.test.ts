import { describe, expect, it } from 'vitest'
import { Camera, MAX_PUNCH, MAX_SHAKE } from '../engine/camera'
import { stubCtx } from './stub'

describe('镜头（M10）', () => {
  it('震一下：偏移不超过幅度、按时衰减到 0', () => {
    const cam = new Camera(1.3)
    cam.shake(4, 0.3)
    let max = 0
    let moved = false
    for (let t = 0; t < 0.3; t += 1 / 60) {
      cam.step(1 / 60)
      max = Math.max(max, Math.hypot(cam.x, cam.y))
      if (cam.x !== 0 || cam.y !== 0) moved = true
    }
    expect(moved).toBe(true)
    expect(max).toBeLessThanOrEqual(4 * 1.01)
    cam.step(1 / 60)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
    // 幅度封顶
    cam.shake(100, 0.2)
    cam.step(0.001)
    expect(Math.hypot(cam.x, cam.y)).toBeLessThanOrEqual(MAX_SHAKE * 1.01)
  })

  it('推近：放大到 1 + amount 左右再弹回 1，不会缩到 1 以下；apply 按焦点缩放', () => {
    const cam = new Camera()
    cam.punch(0.06, 500, 150)
    let peak = 1
    let min = 1
    for (let t = 0; t < 1.5; t += 1 / 120) {
      cam.step(1 / 120)
      peak = Math.max(peak, cam.zoom.value)
      min = Math.min(min, cam.zoom.value)
    }
    expect(peak).toBeGreaterThan(1.05)
    expect(peak).toBeLessThan(1.07)
    expect(min).toBeGreaterThanOrEqual(1)
    expect(cam.zoom.value).toBe(1)
    expect(cam.active).toBe(false)
    cam.punch(1, 0, 0)
    let big = 1
    for (let t = 0; t < 0.5; t += 1 / 120) {
      cam.step(1 / 120)
      big = Math.max(big, cam.zoom.value)
    }
    expect(big).toBeLessThan(1 + MAX_PUNCH * 1.1)
    const ctx = stubCtx()
    const c2 = new Camera()
    c2.punch(0.05, 100, 50)
    c2.shake(3, 0.2)
    c2.step(0.03)
    c2.apply(ctx)
    expect(ctx.count('scale')).toBe(1)
    expect(ctx.count('translate')).toBe(3)
  })

  it('减少动画：什么都不做', () => {
    const cam = new Camera()
    cam.enabled = false
    cam.shake(4, 0.3)
    cam.punch(0.08, 10, 10)
    cam.step(0.05)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
    expect(cam.zoom.value).toBe(1)
    const ctx = stubCtx()
    cam.apply(ctx)
    expect(ctx.calls).toHaveLength(0)
  })
})
