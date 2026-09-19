import * as THREE from 'three'
import { describe, expect, it, vi } from 'vitest'
import { createRng } from '@/engine'
import type { GameState } from '@/battle/game/contract'
import { stubCanvas } from '@/battle/game/__tests__/stub'
import { createRocketGame } from '../../rocket'
import { RISE_TIME, RocketModel } from '../../rocket/model'
import { createRocket3dGame, load, webglAvailable, type Renderer3d } from '..'
import { createRocketScene } from '../scene'

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

function fakeRenderer(): Renderer3d & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    setPixelRatio: (v) => calls.push(`dpr:${v}`),
    setSize: (w, h) => calls.push(`size:${w}x${h}`),
    render: () => calls.push('render'),
    dispose: () => calls.push('dispose'),
    forceContextLoss: () => calls.push('loss'),
  }
}

describe('火箭升空 3D 试点 · 加载器（B36f）', () => {
  it('没有 WebGL 就用 2D 版、不拉 Three.js；有 WebGL 才拉，拉不到（离线）也退回 2D', async () => {
    const three = vi.fn(async () => THREE)
    const f2d = await load({ webgl: () => false, three, fallback: async () => createRocketGame })
    expect(f2d().meta.renderer).toBe('2d')
    expect(three).not.toHaveBeenCalled()
    const f3d = await load({ webgl: () => true, three, fallback: async () => createRocketGame })
    expect(f3d().meta).toEqual({ id: 'rocket3d', renderer: 'webgl' })
    expect(three).toHaveBeenCalledTimes(1)
    const offline = await load({ webgl: () => true, three: async () => Promise.reject(new Error('offline')), fallback: async () => createRocketGame })
    expect(offline().meta.renderer).toBe('2d')
    const broken = await load({ webgl: () => { throw new Error('no canvas') }, three, fallback: async () => createRocketGame })
    expect(broken().meta.renderer).toBe('2d')
    // 默认探测：node / 测试环境没有 WebGL → 2D 版
    expect(webglAvailable()).toBe(false)
    expect((await load())().meta.renderer).toBe('2d')
  })
})

describe('火箭升空 3D 试点 · 场景', () => {
  it('0…8 × 0…8 每个比分：火箭组的位置 / 倾斜 / 尾焰跟着模型走；赢了目标星放大；粒子数一致', () => {
    const m = new RocketModel(createRng(1))
    m.layout(150, 700, false)
    const view = createRocketScene(THREE, m)
    view.layout()
    expect(view.camera.aspect).toBeCloseTo(150 / 700, 6)
    expect(view.parts.planet?.visible).toBe(true)
    expect(view.parts.moon?.visible).toBe(true)
    for (let red = 0; red <= 8; red++) {
      for (let blue = 0; blue <= 8; blue++) {
        const won = red >= 8 ? 'red' : blue >= 8 ? 'blue' : null
        m.setState(snap(red, blue, won ? 'ended' : 'playing', won))
        if (won) m.onEvent({ type: 'finished', winner: won })
        settle(m)
        view.sync(2)
        m.rockets.forEach((r, i) => {
          const grp = view.parts.rockets[i]!
          expect(grp.position.y).toBeCloseTo(-m.yOf(r), 3)
          expect(grp.position.x).toBeCloseTo(m.geo.colX[i]! + m.xOffset(r), 3)
          expect(grp.rotation.z).toBeCloseTo(-m.tiltOf(r), 6)
          const flame = m.flameOf(r)
          expect(view.parts.flames[i]!.visible).toBe(flame > 0.02)
        })
        const drawn = view.parts.particles.geometry.drawRange.count
        expect(drawn).toBe(Math.min(64, m.particles.count))
        if (won) {
          const i = won === 'red' ? 0 : 1
          expect(view.parts.goals[i]!.scale.x).toBeGreaterThan(view.parts.goals[1 - i]!.scale.x)
        }
      }
    }
    view.dispose()
    expect(view.scene.children).toHaveLength(0)
  })

  it('紧凑版没有行星 / 月亮；reduced-motion 火箭不转；改尺寸后相机跟着变；流星与粒子缓冲区不越界', () => {
    const quiet = new RocketModel(createRng(3), { reducedMotion: true })
    quiet.layout(96, 350, true)
    const v = createRocketScene(THREE, quiet)
    v.layout()
    expect(v.parts.planet?.visible).toBe(false)
    expect(v.parts.moon?.visible).toBe(false)
    quiet.setState(snap(3, 2))
    settle(quiet)
    v.sync(1)
    expect(v.parts.rockets[0]!.rotation.y).toBeCloseTo(0.4, 6)
    quiet.layout(150, 700, false)
    v.layout()
    expect(v.camera.aspect).toBeCloseTo(150 / 700, 6)
    expect(v.parts.planet?.visible).toBe(true)
    const m = new RocketModel(createRng(5))
    m.layout(150, 700, false)
    const view = createRocketScene(THREE, m)
    view.layout()
    m.setState(snap(8, 4, 'ended', 'red'))
    m.onEvent({ type: 'finished', winner: 'red' })
    for (let i = 0; i < 4; i++) m.onEvent({ type: 'finished', winner: 'red' })
    m.step(1 / 60)
    expect(m.particles.count).toBeLessThanOrEqual(64)
    view.sync(2)
    expect(view.parts.particles.geometry.drawRange.count).toBe(m.particles.count)
    let seen = false
    for (let t = 0; t < 12; t += 1 / 30) {
      m.step(1 / 30)
      view.sync(2)
      if (view.parts.shooting.visible) seen = true
    }
    expect(seen).toBe(true)
    const t0 = performance.now()
    for (let i = 0; i < 600; i++) {
      m.step(1 / 60)
      view.sync(2)
    }
    expect(performance.now() - t0).toBeLessThan(600)
    view.dispose()
    v.dispose()
  })
})

describe('火箭升空 3D 试点 · GameModule', () => {
  it('全流程：挂载建渲染器、每帧 render、改尺寸、降 3 级像素比降到 1、销毁释放；渲染器建不出来就抛错让宿主兜底', () => {
    const r = fakeRenderer()
    const g = createRocket3dGame(THREE, { makeRenderer: () => r })
    expect(g.meta).toEqual({ id: 'rocket3d', renderer: 'webgl' })
    g.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 2, compact: false, reducedMotion: false })
    expect(r.calls).toContain('dpr:2')
    expect(r.calls).toContain('size:150x700')
    g.setState(snap(0, 0, 'countdown'))
    g.onEvent({ type: 'countdown' })
    g.setState(snap(0, 0, 'playing'))
    g.onEvent({ type: 'go' })
    g.setState(snap(2, 1))
    g.onEvent({ type: 'point', team: 'red', playerId: 'a', streak: 2 })
    for (let i = 0; i < 30; i++) g.tick(0.016)
    expect(r.calls.filter((c) => c === 'render')).toHaveLength(30)
    g.resize(96, 350, 3)
    expect(r.calls).toContain('size:96x350')
    g.degrade?.(3)
    expect(r.calls.at(-2)).toBe('dpr:1')
    g.pause()
    g.resume()
    g.tick(0.016)
    g.destroy()
    expect(r.calls).toContain('dispose')
    expect(r.calls).toContain('loss')
    g.tick(0.016)
    const broken = createRocket3dGame(THREE, {
      makeRenderer: () => {
        throw new Error('no webgl')
      },
    })
    expect(() => broken.mount({ canvas: stubCanvas(null), width: 150, height: 700, dpr: 1, compact: false, reducedMotion: false })).toThrow()
  })
})
