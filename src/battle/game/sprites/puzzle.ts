/**
 * 拼图场景的道具：带凸凹扣的拼图块（按行列奇偶决定哪边凸哪边凹）、板上的空格、两幅整图（太阳笑脸与山丘 / 水里的大鱼）。
 * 拼图块 = 先走一遍拼图形状的路径做 clip，再把整幅图画进去（图跟着块一起挪），所以飞进来的块上也是它那一小块画面。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, gradient, withAlpha } from '../engine/draw'
import { drawTeamBadge } from './scenery'

export type PictureKind = 'sun' | 'fish'

export interface Knobs {
  top: -1 | 0 | 1
  right: -1 | 0 | 1
  bottom: -1 | 0 | 1
  left: -1 | 0 | 1
}

/** 第 r 行第 c 列（共 rows × cols）的四边：1 凸、−1 凹、0 平（板的外边） */
export function knobsOf(r: number, c: number, rows: number, cols: number): Knobs {
  const rightOf = (rr: number, cc: number): -1 | 1 => ((rr + cc) % 2 === 0 ? 1 : -1)
  const bottomOf = (rr: number, cc: number): -1 | 1 => ((rr + cc) % 2 === 0 ? -1 : 1)
  return {
    top: r === 0 ? 0 : (-bottomOf(r - 1, c) as -1 | 1),
    right: c === cols - 1 ? 0 : rightOf(r, c),
    bottom: r === rows - 1 ? 0 : bottomOf(r, c),
    left: c === 0 ? 0 : (-rightOf(r, c - 1) as -1 | 1),
  }
}

/** 拼图块的路径（顺时针：上 → 右 → 下 → 左），原点在块的左上角 */
export function piecePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: Knobs): void {
  const r = Math.min(w, h) * 0.16
  ctx.beginPath()
  ctx.moveTo(x, y)
  // 上边：向右
  if (k.top === 0) ctx.lineTo(x + w, y)
  else {
    ctx.lineTo(x + w / 2 - r, y)
    ctx.arc(x + w / 2, y, r, Math.PI, 0, k.top < 0)
    ctx.lineTo(x + w, y)
  }
  // 右边：向下
  if (k.right === 0) ctx.lineTo(x + w, y + h)
  else {
    ctx.lineTo(x + w, y + h / 2 - r)
    ctx.arc(x + w, y + h / 2, r, -Math.PI / 2, Math.PI / 2, k.right < 0)
    ctx.lineTo(x + w, y + h)
  }
  // 下边：向左
  if (k.bottom === 0) ctx.lineTo(x, y + h)
  else {
    ctx.lineTo(x + w / 2 + r, y + h)
    ctx.arc(x + w / 2, y + h, r, 0, Math.PI, k.bottom < 0)
    ctx.lineTo(x, y + h)
  }
  // 左边：向上
  if (k.left === 0) ctx.lineTo(x, y)
  else {
    ctx.lineTo(x, y + h / 2 + r)
    ctx.arc(x, y + h / 2, r, Math.PI / 2, -Math.PI / 2, k.left < 0)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/** 整幅图：画在 (x, y, w, h) 的板面上；bright 0…1 是亮度（没拼完时暗一点） */
export function drawPicture(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, kind: PictureKind, bright: number): void {
  if (kind === 'sun') {
    ctx.fillStyle = gradient(ctx, 0, y, 0, y + h, [
      [0, '#7cc4ff'],
      [1, '#dff1ff'],
    ])
    ctx.fillRect(x, y, w, h)
    // 太阳
    const sx = x + w * 0.5
    const sy = y + h * 0.34
    const sr = w * 0.2
    ctx.strokeStyle = '#ffd54a'
    ctx.lineWidth = Math.max(2, w * 0.035)
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4
      ctx.moveTo(sx + Math.cos(a) * sr * 1.3, sy + Math.sin(a) * sr * 1.3)
      ctx.lineTo(sx + Math.cos(a) * sr * 1.7, sy + Math.sin(a) * sr * 1.7)
    }
    ctx.stroke()
    ctx.fillStyle = '#ffd54a'
    circle(ctx, sx, sy, sr)
    ctx.fill()
    ctx.fillStyle = '#2b2b2b'
    circle(ctx, sx - sr * 0.35, sy - sr * 0.15, sr * 0.1)
    ctx.fill()
    circle(ctx, sx + sr * 0.35, sy - sr * 0.15, sr * 0.1)
    ctx.fill()
    ctx.strokeStyle = '#c0392b'
    ctx.lineWidth = Math.max(1.5, sr * 0.1)
    ctx.beginPath()
    ctx.arc(sx, sy + sr * 0.15, sr * 0.4, 0.2, Math.PI - 0.2)
    ctx.stroke()
    ctx.fillStyle = '#ffb3b3'
    circle(ctx, sx - sr * 0.6, sy + sr * 0.2, sr * 0.14)
    ctx.fill()
    circle(ctx, sx + sr * 0.6, sy + sr * 0.2, sr * 0.14)
    ctx.fill()
    // 云 + 山丘
    ctx.fillStyle = '#ffffff'
    ellipse(ctx, x + w * 0.22, y + h * 0.16, w * 0.14, h * 0.045)
    ctx.fill()
    ctx.fillStyle = '#a8dd8b'
    ellipse(ctx, x + w * 0.3, y + h * 0.98, w * 0.5, h * 0.24)
    ctx.fill()
    ctx.fillStyle = '#74c95e'
    ellipse(ctx, x + w * 0.78, y + h * 1.02, w * 0.5, h * 0.28)
    ctx.fill()
  } else {
    ctx.fillStyle = gradient(ctx, 0, y, 0, y + h, [
      [0, '#6fd3ee'],
      [1, '#1f6fa3'],
    ])
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = '#e8d6a0'
    ctx.fillRect(x, y + h * 0.9, w, h * 0.1)
    // 水草
    ctx.strokeStyle = '#3ea36b'
    ctx.lineWidth = Math.max(2, w * 0.03)
    ctx.lineCap = 'round'
    for (const [fx, fh] of [
      [0.12, 0.3],
      [0.88, 0.25],
    ] as const) {
      ctx.beginPath()
      ctx.moveTo(x + w * fx, y + h * 0.92)
      ctx.quadraticCurveTo(x + w * (fx + 0.08), y + h * (0.92 - fh * 0.6), x + w * fx, y + h * (0.92 - fh))
      ctx.stroke()
    }
    // 大鱼
    const fx = x + w * 0.5
    const fy = y + h * 0.5
    const fs = w * 0.74
    ctx.fillStyle = '#ff9f43'
    ctx.beginPath()
    ctx.moveTo(fx - fs * 0.35, fy)
    ctx.lineTo(fx - fs * 0.6, fy - fs * 0.22)
    ctx.lineTo(fx - fs * 0.6, fy + fs * 0.22)
    ctx.closePath()
    ctx.fill()
    ellipse(ctx, fx, fy, fs * 0.42, fs * 0.26)
    ctx.fill()
    ctx.fillStyle = '#ffd27a'
    ellipse(ctx, fx + fs * 0.05, fy + fs * 0.08, fs * 0.26, fs * 0.1)
    ctx.fill()
    ctx.fillStyle = '#e07b2a'
    for (const sx2 of [-0.12, 0.05]) {
      ctx.beginPath()
      ctx.ellipse(fx + sx2 * fs, fy, fs * 0.04, fs * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#ffffff'
    circle(ctx, fx + fs * 0.24, fy - fs * 0.07, fs * 0.08)
    ctx.fill()
    ctx.fillStyle = '#2b2f3a'
    circle(ctx, fx + fs * 0.26, fy - fs * 0.07, fs * 0.04)
    ctx.fill()
    // 泡泡
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = Math.max(1, w * 0.015)
    for (const [bx, by, br] of [
      [0.8, 0.22, 0.04],
      [0.86, 0.12, 0.025],
      [0.2, 0.7, 0.03],
    ] as const) {
      circle(ctx, x + w * bx, y + h * by, w * br)
      ctx.stroke()
    }
  }
  if (bright < 0.98) {
    withAlpha(ctx, (1 - bright) * 0.3, () => {
      ctx.fillStyle = '#1b1f45'
      ctx.fillRect(x, y, w, h)
    })
  }
}

/** 板上的空格：灰底 + 虚线轮廓；glow 是还差一分时的闪 */
export function drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: Knobs, glow: number): void {
  piecePath(ctx, x, y, w, h, k)
  ctx.fillStyle = glow > 0.02 ? `rgba(255,236,150,${0.25 + glow * 0.45})` : 'rgba(255,255,255,0.5)'
  ctx.fill()
  ctx.save()
  ctx.setLineDash([Math.max(2, w * 0.06), Math.max(2, w * 0.05)])
  ctx.strokeStyle = glow > 0.02 ? '#e6b93a' : 'rgba(90,100,140,0.5)'
  ctx.lineWidth = Math.max(1, w * 0.02)
  ctx.stroke()
  ctx.restore()
}

/**
 * 一块拼图：块在 (px, py)（左上角，可能还在飞），它在板上的格子是 (sx, sy)；整幅图画在板面 (bx, by, bw, bh)，跟着块的偏移一起挪。
 * scale 绕块心缩放（扣进去时压一下）；glow 是刚扣上时边上的亮圈。
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  sx: number,
  sy: number,
  w: number,
  h: number,
  k: Knobs,
  board: { x: number; y: number; w: number; h: number; kind: PictureKind; bright: number },
  scale: number,
  glow: number,
): void {
  ctx.save()
  ctx.translate(px + w / 2, py + h / 2)
  ctx.scale(scale, scale)
  ctx.translate(-(sx + w / 2), -(sy + h / 2))
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.8, () => {
      piecePath(ctx, sx, sy, w, h, k)
      ctx.strokeStyle = '#fff3b0'
      ctx.lineWidth = Math.max(2, w * 0.08)
      ctx.stroke()
    })
  }
  piecePath(ctx, sx, sy, w, h, k)
  ctx.clip()
  drawPicture(ctx, board.x, board.y, board.w, board.h, board.kind, board.bright)
  ctx.restore()
  ctx.save()
  ctx.translate(px + w / 2, py + h / 2)
  ctx.scale(scale, scale)
  ctx.translate(-(sx + w / 2), -(sy + h / 2))
  piecePath(ctx, sx, sy, w, h, k)
  ctx.strokeStyle = 'rgba(40,50,90,0.45)'
  ctx.lineWidth = Math.max(1, w * 0.02)
  ctx.stroke()
  ctx.restore()
}

const TEAM: Record<Team, { main: string; dark: string; soft: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', soft: '#ffe3e3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', soft: '#dfeeff' },
}

/** 板框：队色的边 + 淡队色板面，左上角一个队色圆牌（B32：一眼看出哪块板是谁的）；glow 是拼完时的光 */
export function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border: number, team: Team, glow: number): void {
  const c = TEAM[team]
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.roundRect(x - border * 2.5, y - border * 2.5, w + border * 5, h + border * 5, border * 2)
      ctx.fill()
    })
  }
  ctx.fillStyle = c.dark
  ctx.beginPath()
  ctx.roundRect(x - border * 1.6, y - border * 1.6, w + border * 3.2, h + border * 3.2, border * 1.4)
  ctx.fill()
  ctx.fillStyle = c.main
  ctx.beginPath()
  ctx.roundRect(x - border, y - border, w + border * 2, h + border * 2, border)
  ctx.fill()
  ctx.fillStyle = c.soft
  ctx.fillRect(x, y, w, h)
  drawTeamBadge(ctx, x - border * 0.2, y - border * 0.2, Math.max(4, border * 1.6), team)
}
