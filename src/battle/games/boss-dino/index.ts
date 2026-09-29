/**
 * 捣蛋龙（需求 M8–M10）：把模型与渲染组装成打怪兽的 Boss 游戏（boss-contract.ts）。
 * 背景层缓存到离屏 canvas（尺寸、排版或灯光色变了才重画），每帧只画会动的部分；降级 3 级时像素比降到 1。
 * 宿主换尺寸（resize）时不传紧凑版标记，沿用挂载时的；舞台很小的时候模型自己去掉装饰。
 */
import { createRng } from '@/engine'
import type { GameHostInfo } from '@/battle/game/contract'
import type { BossGameModule, BossGameState } from '@/battle/game/boss-contract'
import { fitCanvas } from '@/battle/game/engine/canvas'
import { DinoModel } from './model'
import { renderBackground, renderDynamic } from './render'

export function createDinoGame(): BossGameModule {
  let canvas: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null
  let bg: HTMLCanvasElement | null = null
  let bgKey = ''
  let width = 1
  let height = 1
  let dpr = 1
  let compact = false
  let quality = 0
  let model: DinoModel | null = null

  function effectiveDpr(): number {
    return quality >= 3 ? 1 : dpr
  }

  function makeBackground(): void {
    bg = null
    bgKey = ''
    if (!model || typeof document === 'undefined') return
    try {
      const off = document.createElement('canvas')
      const octx = fitCanvas(off, width, height, effectiveDpr())
      if (!octx) return
      renderBackground(octx, model)
      bg = off
      bgKey = model.bgKey()
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
    meta: { id: 'boss-dino' },
    mount(host: GameHostInfo) {
      canvas = host.canvas
      width = host.width
      height = host.height
      dpr = host.dpr
      compact = host.compact
      model = new DinoModel(createRng(), { reducedMotion: host.reducedMotion })
      relayout()
    },
    setState(s: BossGameState) {
      model?.setState(s)
    },
    onEvent(e) {
      model?.onEvent(e)
    },
    poke(x, y, team) {
      return model?.poke(x, y, team)
    },
    focus(team) {
      return model?.focus(team) ?? null
    },
    resize(w, h, d) {
      width = w
      height = h
      dpr = d
      relayout()
    },
    tick(dt) {
      if (!model) return
      model.step(dt)
      if (!ctx) return
      // 换了一只 Boss（灯光色变了）或上台的人变了（重新排版）：背景重画一次
      if (bg && model.bgKey() !== bgKey) makeBackground()
      ctx.clearRect(0, 0, width, height)
      renderDynamic(ctx, model, bg)
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
