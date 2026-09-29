/**
 * 打怪兽的保底画面（M13，同 B34a ⑤）：Boss 游戏加载失败或运行时抛错时换上的血条——一起打一条、各打各的左红右蓝两条，
 * 每条前面几颗小圆点是已经打倒了几只（第几只 − 1）。永远可用：不依赖素材，拿不到 2D 上下文时静默。
 */
import type { GameHostInfo } from './contract'
import type { BossGameModule, BossGameState, BossStage } from './boss-contract'
import { fitCanvas } from './engine/canvas'
import { fillRoundRect } from './engine/draw'

const TRACK = '#f0e6d8'
const HP = { shared: '#7bc96f', red: '#ff6b6b', blue: '#4aa3ff' } as const
const DOT = '#f6b93b'

export function createBossFallback(): BossGameModule {
  let ctx: CanvasRenderingContext2D | null = null
  let canvas: HTMLCanvasElement | null = null
  let width = 1
  let height = 1
  let dpr = 1
  let bosses: BossStage[] = []
  let dirty = true

  function layout(): void {
    if (canvas) ctx = fitCanvas(canvas, width, height, dpr)
    dirty = true
  }

  function bar(x: number, y: number, w: number, h: number, b: BossStage): void {
    if (!ctx) return
    const r = h / 2
    const dots = Math.min(6, b.level - 1)
    const dotR = r * 0.6
    for (let i = 0; i < dots; i++) {
      ctx.fillStyle = DOT
      ctx.beginPath()
      ctx.arc(x + dotR + i * dotR * 2.6, y + r, dotR, 0, Math.PI * 2)
      ctx.fill()
    }
    const bx = x + (dots > 0 ? dots * dotR * 2.6 + dotR : 0)
    const bw = Math.max(h, w - (bx - x))
    fillRoundRect(ctx, bx, y, bw, h, r, TRACK)
    const ratio = b.max > 0 ? Math.max(0, Math.min(1, b.hp / b.max)) : 0
    if (ratio > 0) fillRoundRect(ctx, bx, y, Math.max(h, bw * ratio), h, r, HP[b.side])
  }

  function draw(): void {
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    const pad = Math.max(8, Math.min(width, height) * 0.1)
    const h = Math.max(10, Math.min(28, height * 0.12))
    const y = height / 2 - h / 2
    if (bosses.length <= 1) {
      if (bosses[0]) bar(pad, y, width - pad * 2, h, bosses[0])
      return
    }
    const w = (width - pad * 3) / 2
    const red = bosses.find((b) => b.side === 'red')
    const blue = bosses.find((b) => b.side === 'blue')
    if (red) bar(pad, y, w, h, red)
    if (blue) bar(pad * 2 + w, y, w, h, blue)
  }

  return {
    meta: { id: 'boss-fallback' },
    mount(host: GameHostInfo) {
      canvas = host.canvas
      width = host.width
      height = host.height
      dpr = host.dpr
      layout()
    },
    setState(s: BossGameState) {
      bosses = s.bosses.map((b) => ({ ...b }))
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
    tick() {
      if (!dirty) return
      draw()
      dirty = false
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
