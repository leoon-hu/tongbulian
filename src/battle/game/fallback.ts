/**
 * 保底画面（B34 / B34a ⑤）：游戏加载失败或运行时抛错时换上的两条队色进度条。
 * 永远可用：不依赖任何素材，canvas 拿不到 2D 上下文时也静默。横盒子（上方横条）两条横着叠放，竖盒子并排竖着涨。
 */
import type { GameHostInfo, GameModule, GameState } from './contract'
import { fitCanvas } from './engine/canvas'
import { fillRoundRect } from './engine/draw'
import { ease, Tween } from './engine/tween'

const RED = '#ff6b6b'
const BLUE = '#4aa3ff'
const TRACK = '#f0e6d8'
const TICK = 'rgba(61, 44, 30, 0.12)'

export function createFallbackGame(): GameModule {
  let ctx: CanvasRenderingContext2D | null = null
  let canvas: HTMLCanvasElement | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let target = 8
  let dirty = true
  const red = new Tween(0, ease.outCubic)
  const blue = new Tween(0, ease.outCubic)

  function layout(): void {
    if (canvas) ctx = fitCanvas(canvas, width, height, dpr)
    dirty = true
  }

  function bar(x: number, y: number, w: number, h: number, ratio: number, color: string, vertical: boolean): void {
    if (!ctx) return
    const r = Math.min(w, h) / 2
    fillRoundRect(ctx, x, y, w, h, r, TRACK)
    // 8 格刻度
    ctx.fillStyle = TICK
    for (let i = 1; i < target; i++) {
      if (vertical) ctx.fillRect(x, y + h - (h * i) / target, w, 1)
      else ctx.fillRect(x + (w * i) / target, y, 1, h)
    }
    if (ratio <= 0) return
    if (vertical) {
      const fh = Math.max(r * 2, h * ratio)
      fillRoundRect(ctx, x, y + h - fh, w, fh, r, color)
    } else {
      fillRoundRect(ctx, x, y, Math.max(r * 2, w * ratio), h, r, color)
    }
  }

  function draw(): void {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    const pad = Math.max(6, Math.min(width, height) * 0.12)
    const vertical = height > width
    const rRatio = Math.min(1, red.value / target)
    const bRatio = Math.min(1, blue.value / target)
    if (vertical) {
      const w = (width - pad * 3) / 2
      bar(pad, pad, w, height - pad * 2, rRatio, RED, true)
      bar(pad * 2 + w, pad, w, height - pad * 2, bRatio, BLUE, true)
    } else {
      const h = (height - pad * 3) / 2
      bar(pad, pad, width - pad * 2, h, rRatio, RED, false)
      bar(pad, pad * 2 + h, width - pad * 2, h, bRatio, BLUE, false)
    }
  }

  return {
    meta: { id: 'fallback' },
    mount(host: GameHostInfo) {
      canvas = host.canvas
      width = host.width
      height = host.height
      dpr = host.dpr
      layout()
    },
    setState(s: GameState) {
      target = Math.max(1, s.target)
      if (s.phase === 'countdown' || s.phase === 'lobby') {
        red.set(0)
        blue.set(0)
      } else {
        if (red.target !== s.red) red.to(s.red, 0.5)
        if (blue.target !== s.blue) blue.to(s.blue, 0.5)
      }
      dirty = true
    },
    onEvent() {
      /* 保底画面不做事件动画 */
    },
    resize(w, h, d) {
      width = w
      height = h
      dpr = d
      layout()
    },
    tick(dt) {
      red.step(dt)
      blue.step(dt)
      if (dirty || !red.done || !blue.done) {
        draw()
        dirty = false
      }
    },
    pause() {},
    resume() {
      dirty = true
    },
    destroy() {
      ctx = null
      canvas = null
    },
  }
}
