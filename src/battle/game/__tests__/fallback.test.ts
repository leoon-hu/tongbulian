import { describe, expect, it } from 'vitest'
import type { GameState } from '../contract'
import { createFallbackGame } from '../fallback'
import { stubCanvas, stubCtx } from './stub'

const state = (red: number, blue: number, phase: GameState['phase'] = 'playing'): GameState => ({
  red,
  blue,
  target: 8,
  phase,
  winner: null,
  lastPoint: null,
})

describe('保底画面', () => {
  it('横盒子画两条横条，竖盒子画两条竖条，比分变了会重画', () => {
    const ctx = stubCtx()
    const g = createFallbackGame()
    g.mount({ canvas: stubCanvas(ctx), width: 400, height: 100, dpr: 2, compact: false, reducedMotion: false })
    g.setState(state(3, 2))
    g.tick(0.016)
    expect(ctx.count('clearRect')).toBe(1)
    // 两条轨道 + 两条填充 = 4 个圆角矩形，再加 7 × 2 条刻度
    expect(ctx.count('fill')).toBe(4)
    expect(ctx.count('fillRect')).toBe(14)
    // 没变化就不重画（补间结束后）
    for (let i = 0; i < 60; i++) g.tick(0.016)
    const fills = ctx.count('fill')
    g.tick(0.016)
    expect(ctx.count('fill')).toBe(fills)
    g.setState(state(4, 2))
    g.tick(0.016)
    expect(ctx.count('fill')).toBeGreaterThan(fills)
    g.resize(100, 400, 1)
    g.tick(0.016)
    expect(ctx.count('setTransform')).toBe(2)
    g.destroy()
  })

  it('倒数阶段两条都归零；没有 2D 上下文时静默', () => {
    const ctx = stubCtx()
    const g = createFallbackGame()
    g.mount({ canvas: stubCanvas(ctx), width: 200, height: 50, dpr: 1, compact: true, reducedMotion: true })
    g.setState(state(5, 5))
    g.tick(1)
    g.setState(state(0, 0, 'countdown'))
    g.tick(0.016)
    expect(ctx.calls.length).toBeGreaterThan(0)
    const mute = createFallbackGame()
    mute.mount({ canvas: stubCanvas(null), width: 200, height: 50, dpr: 1, compact: false, reducedMotion: false })
    expect(() => {
      mute.setState(state(1, 0))
      mute.tick(0.016)
      mute.onEvent({ type: 'go' })
      mute.pause()
      mute.resume()
      mute.destroy()
    }).not.toThrow()
  })
})
