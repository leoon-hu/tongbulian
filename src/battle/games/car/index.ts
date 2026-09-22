/**
 * 赛车（需求 B36g）：把模型与渲染组装成 GameModule。
 * 背景层缓存到离屏 canvas（尺寸变了才重画），每帧只画会动的部分；降级 3 级时像素比降到 1。
 */
import { createRng } from '@/engine'
import type { GameHostInfo, GameModule, GameState } from '@/battle/game/contract'
import { fitCanvas } from '@/battle/game/engine/canvas'
import { CarModel } from './model'
import { renderBackground, renderDynamic } from './render'

export function createCarGame(): GameModule {
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let bg: HTMLCanvasElement | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let compact = false
  let quality = 0
  let model: CarModel | null = null

  function effectiveDpr(): number {
    return quality >= 3 ? 1 : dpr
  }

  function makeBackground(): void {
    bg = null
    if (!model || typeof document === 'undefined') return
    try {
      const off = document.createElement('canvas')
      const octx = fitCanvas(off, width, height, effectiveDpr())
      if (!octx) return
      renderBackground(octx, model.geo)
      bg = off
    } catch {
      bg = null
    }
  }

  function relayout(): void {
    if (!canvas || !model) return
    ctx = fitCanvas(canvas, width, height, effectiveDpr())
    model.layout(width, height, compact)
    makeBackground()
  }

  return {
    meta: { id: 'car' },
    mount(host: GameHostInfo) {
      canvas = host.canvas
      width = host.width
      height = host.height
      dpr = host.dpr
      compact = host.compact
      model = new CarModel(createRng(), { reducedMotion: host.reducedMotion })
      relayout()
    },
    setState(s: GameState) {
      model?.setState(s)
    },
    onEvent(e) {
      model?.onEvent(e)
    },
    poke(_x, _y, team) {
      model?.poke(team)
    },
    resize(w, h, d) {
      width = w
      height = h
      dpr = d
      compact = h < 80
      relayout()
    },
    tick(dt) {
      if (!model) return
      model.step(dt)
      if (!ctx) return
      ctx.clearRect(0, 0, width, height)
      if (bg) ctx.drawImage(bg, 0, 0, width, height)
      else renderBackground(ctx, model.geo)
      renderDynamic(ctx, model)
    },
    pause() {},
    resume() {},
    degrade(level) {
      quality = level
      model?.degrade(level)
      if (level >= 3) relayout()
    },
    destroy() {
      ctx = null
      canvas = null
      bg = null
      model = null
    },
  }
}
