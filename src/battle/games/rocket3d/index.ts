/**
 * 火箭升空 3D 试点（需求 B36f）：同一契约、同一份模型（games/rocket/model.ts），渲染换成 Three.js（renderer: 'webgl'）。
 * - load()：这台设备能用 WebGL 才按需拉 Three.js（独立 chunk，不进离线包）；不能用、拉不到（离线）都退回 2D 版；
 * - createRocket3dGame()：WebGLRenderer 画在宿主给的 canvas 上；建不出来就抛错，宿主会换成保底画面。
 */
import { createRng } from '@/engine'
import type { GameFactory, GameHostInfo, GameModule, GameState } from '@/battle/game/contract'
import { RocketModel } from '../rocket/model'
import { createRocketScene, type RocketScene, type Three } from './scene'

/** 渲染器只用到这几样（测试里可以注入假的） */
export interface Renderer3d {
  setPixelRatio(v: number): void
  setSize(w: number, h: number, updateStyle?: boolean): void
  render(scene: import('three').Scene, camera: import('three').Camera): void
  dispose(): void
  forceContextLoss?(): void
}

export interface Rocket3dDeps {
  makeRenderer?: (T: Three, canvas: HTMLCanvasElement) => Renderer3d
}

/** 这台设备能不能用 WebGL：用一块临时 canvas 探一下 */
export function webglAvailable(doc: Document | undefined = typeof document === 'undefined' ? undefined : document): boolean {
  if (!doc) return false
  try {
    const c = doc.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export interface LoadDeps {
  webgl?: () => boolean
  three?: () => Promise<Three>
  fallback?: () => Promise<GameFactory>
}

/** 注册表用的加载器：能用 WebGL 就出 3D 版，否则 / 拉不到 Three.js 就出 2D 版 */
export async function load(deps: LoadDeps = {}): Promise<GameFactory> {
  const fallback = deps.fallback ?? (() => import('../rocket').then((m) => m.createRocketGame))
  let ok = false
  try {
    ok = (deps.webgl ?? webglAvailable)()
  } catch {
    ok = false
  }
  if (!ok) return fallback()
  try {
    const T = await (deps.three ?? (() => import('three')))()
    return () => createRocket3dGame(T)
  } catch {
    return fallback()
  }
}

function defaultRenderer(T: Three, canvas: HTMLCanvasElement): Renderer3d {
  return new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' })
}

export function createRocket3dGame(T: Three, deps: Rocket3dDeps = {}): GameModule {
  let renderer: Renderer3d | null = null
  let model: RocketModel | null = null
  let view: RocketScene | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let compact = false
  let quality = 0

  function effectiveDpr(): number {
    return quality >= 3 ? 1 : dpr
  }

  function relayout(): void {
    if (!renderer || !model || !view) return
    renderer.setPixelRatio(effectiveDpr())
    renderer.setSize(width, height, false)
    model.layout(width, height, compact)
    view.layout()
  }

  return {
    meta: { id: 'rocket3d', renderer: 'webgl' },
    mount(host: GameHostInfo) {
      width = host.width
      height = host.height
      dpr = host.dpr
      compact = host.compact
      renderer = (deps.makeRenderer ?? defaultRenderer)(T, host.canvas)
      model = new RocketModel(createRng(), { reducedMotion: host.reducedMotion })
      view = createRocketScene(T, model)
      relayout()
    },
    setState(s: GameState) {
      model?.setState(s)
    },
    onEvent(e) {
      model?.onEvent(e)
    },
    resize(w, h, d) {
      width = w
      height = h
      dpr = d
      compact = w < 120
      relayout()
    },
    tick(dt) {
      if (!model || !view || !renderer) return
      model.step(dt)
      view.sync(effectiveDpr())
      renderer.render(view.scene, view.camera)
    },
    pause() {},
    resume() {},
    degrade(level) {
      quality = level
      model?.degrade(level)
      if (level >= 3) relayout()
    },
    destroy() {
      view?.dispose()
      view = null
      model = null
      try {
        renderer?.dispose()
        renderer?.forceContextLoss?.()
      } catch {
        /* 上下文可能已经没了 */
      }
      renderer = null
    },
  }
}
