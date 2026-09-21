/**
 * 挖宝场景的道具与角色：土层与里面的装饰（石子、树根、骨头、宝石）、井口的滑轮架与绳子、竖井、头灯的光、蚯蚓、宝箱，
 * 以及戴安全帽拿镐的鼹鼠（红队）/ 獾（蓝队），面朝观众。角色原点在脚下正中；s 是身高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

export type DiggerKind = 'mole' | 'badger'

const SKIN: Record<DiggerKind, { fur: string; face: string; nose: string }> = {
  mole: { fur: '#7a7f93', face: '#b8bccc', nose: '#f7a1b8' },
  badger: { fur: '#8e949c', face: '#f4f4f4', nose: '#2b2b2b' },
}

/** 土层颜色（从上往下，越深越暗） */
export const STRATA = ['#a5713d', '#ad7a42', '#b9874c', '#c39055', '#a4825f', '#8f7668', '#7f6b70', '#6e5f75']

export const GEM_COLORS = ['#ffd54a', '#ff6b6b', '#4aa3ff', '#3ecf8e', '#a78bfa', '#ff9f43']

export function drawStratum(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, i: number): void {
  ctx.fillStyle = STRATA[Math.min(STRATA.length - 1, i)]!
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fillRect(x, y, w, Math.max(1, h * 0.06))
}

export function drawPebble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ellipse(ctx, x, y, r, r * 0.7)
  ctx.fill()
}

/** 树根：一段弯弯的粗线 */
export function drawRoot(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.strokeStyle = 'rgba(80,45,20,0.45)'
  ctx.lineWidth = Math.max(1, s * 0.12)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + s * 0.3, y + s * 0.6, x - s * 0.1, y + s)
  ctx.moveTo(x + s * 0.12, y + s * 0.35)
  ctx.lineTo(x + s * 0.5, y + s * 0.55)
  ctx.stroke()
}

/** 骨头化石 */
export function drawBone(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number): void {
  withTransform(ctx, x, y, rot, 1, 1, () => {
    ctx.fillStyle = 'rgba(245,238,220,0.8)'
    ctx.fillRect(-s * 0.5, -s * 0.09, s, s * 0.18)
    for (const d of [-1, 1]) {
      circle(ctx, d * s * 0.5, -s * 0.12, s * 0.14)
      ctx.fill()
      circle(ctx, d * s * 0.5, s * 0.12, s * 0.14)
      ctx.fill()
    }
  })
}

/** 宝石：菱形 + 一点高光 */
export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y - r)
    ctx.lineTo(x + r * 0.8, y)
    ctx.lineTo(x, y + r)
    ctx.lineTo(x - r * 0.8, y)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.25, y - r * 0.15)
    ctx.lineTo(x, y - r * 0.6)
    ctx.lineTo(x + r * 0.1, y - r * 0.2)
    ctx.closePath()
    ctx.fill()
  })
}

/** 井口的木架滑轮：两根斜杆 + 顶上一个轮子；y 是地面 */
export function drawPulley(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.strokeStyle = '#a8743f'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.5, s * 0.09)
  ctx.beginPath()
  ctx.moveTo(x - s * 0.42, y)
  ctx.lineTo(x, y - s * 0.9)
  ctx.lineTo(x + s * 0.42, y)
  ctx.moveTo(x - s * 0.24, y - s * 0.4)
  ctx.lineTo(x + s * 0.24, y - s * 0.4)
  ctx.stroke()
  ctx.fillStyle = '#6b6b78'
  circle(ctx, x, y - s * 0.88, s * 0.14)
  ctx.fill()
  ctx.fillStyle = '#c9c9d4'
  circle(ctx, x, y - s * 0.88, s * 0.06)
  ctx.fill()
}

export function drawRope(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, k: number): void {
  ctx.strokeStyle = '#d3aa73'
  ctx.lineWidth = Math.max(1, 1.5 * k)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y0)
  ctx.lineTo(x, y1)
  ctx.stroke()
}

/** 挖开的竖井：深色的洞，两侧一点毛边 */
export function drawShaft(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, w: number, k: number): void {
  if (bottom - top < 1) return
  ctx.fillStyle = '#3b2a20'
  ctx.beginPath()
  ctx.roundRect(x - w / 2, top, w, bottom - top, Math.min(4 * k, w * 0.2))
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(x - w / 2, top, Math.max(1, 2 * k), bottom - top)
  ctx.fillRect(x + w / 2 - Math.max(1, 2 * k), top, Math.max(1, 2 * k), bottom - top)
}

/** 头灯照出的一圈光 */
export function drawLampGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha < 0.02) return
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(255,236,150,${0.55 * alpha})`)
  g.addColorStop(1, 'rgba(255,236,150,0)')
  ctx.fillStyle = g
  circle(ctx, x, y, r)
  ctx.fill()
}

/** 从土里探出头的蚯蚓：out 0…1 是探出的程度，t 是扭动相位 */
export function drawWorm(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, out: number): void {
  if (out < 0.02) return
  const h = s * out
  ctx.strokeStyle = '#f39ab0'
  ctx.lineWidth = Math.max(1.5, s * 0.22)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(x + Math.sin(t) * s * 0.25, y - h * 0.6, x + Math.sin(t * 1.3) * s * 0.15, y - h)
  ctx.stroke()
  ctx.fillStyle = '#2b2b2b'
  circle(ctx, x + Math.sin(t * 1.3) * s * 0.15 + s * 0.05, y - h - s * 0.02, Math.max(0.6, s * 0.035))
  ctx.fill()
}

/** 宝箱：箱体 + 金箍 + 锁，open 0…1 箱盖往后翻开露出金光与宝石；glow 是闪光 */
export function drawChest(ctx: CanvasRenderingContext2D, x: number, top: number, w: number, h: number, team: Team, open: number, glow: number): void {
  const lidH = h * 0.36
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#fff3b0'
      ellipse(ctx, x, top + h * 0.45, w * 0.95, h * 0.9)
      ctx.fill()
    })
  }
  // 箱体
  fillRoundRect(ctx, x - w / 2, top + lidH * (1 - open * 0.2), w, h - lidH * (1 - open * 0.2), h * 0.1, '#9a5b2c')
  ctx.fillStyle = '#ffd54a'
  ctx.fillRect(x - w * 0.38, top + lidH, w * 0.08, h - lidH)
  ctx.fillRect(x + w * 0.3, top + lidH, w * 0.08, h - lidH)
  if (open > 0.15) {
    // 打开后箱子里的金光与宝石
    ctx.fillStyle = '#ffe27a'
    ctx.fillRect(x - w * 0.42, top + lidH * (1 - open * 0.2), w * 0.84, h * 0.16)
    const gr = h * 0.14
    for (const [dx, c] of [
      [-0.25, GEM_COLORS[1]!],
      [0, GEM_COLORS[3]!],
      [0.25, GEM_COLORS[2]!],
    ] as const) drawGem(ctx, x + dx * w, top + lidH * (1 - open * 0.2) + h * 0.06, gr, c)
  }
  // 箱盖：绕后边翻开（正面看就是变矮、往上抬）
  const lift = open * lidH * 0.9
  const sq = 1 - open * 0.55
  withTransform(ctx, x, top + lidH - lift, -open * 0.15, 1, sq, () => {
    ctx.fillStyle = '#b06a34'
    ctx.beginPath()
    ctx.roundRect(-w / 2, -lidH, w, lidH, lidH * 0.5)
    ctx.fill()
    ctx.fillStyle = '#ffd54a'
    ctx.fillRect(-w * 0.38, -lidH * 0.9, w * 0.08, lidH * 0.9)
    ctx.fillRect(w * 0.3, -lidH * 0.9, w * 0.08, lidH * 0.9)
  })
  // 锁
  ctx.fillStyle = open > 0.15 ? '#e6b93a' : TEAM[team].main
  fillRoundRect(ctx, x - w * 0.09, top + lidH - h * 0.08 - lift * 0.3, w * 0.18, h * 0.18, w * 0.04, open > 0.15 ? '#e6b93a' : TEAM[team].main)
}

export interface DiggerPose {
  /** 镐的角度（弧度）：负数举起来，正数往下刨 */
  swing: number
  /** 离地高度（px） */
  lift: number
  /** 举镐欢呼 0…1 */
  cheer: number
  /** 坐下歇着 0…1 */
  sit: number
  /** 头灯亮度 0…1 */
  lamp: number
  blink: number
  /** 抬头看对面 0…1 */
  look: number
  /** 左右晃 −1…1 */
  sway: number
}

/** 鼹鼠 / 獾：戴安全帽 + 头灯、队色背心、拿镐；原点在脚下正中，面朝观众 */
export function drawDigger(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: DiggerKind, p: DiggerPose): void {
  const c = TEAM[team]
  const sk = SKIN[kind]
  const sit = p.sit
  withTransform(ctx, x + p.sway * s * 0.03, y - p.lift + sit * s * 0.2, p.sway * 0.03, 1, 1 - sit * 0.1, () => {
    ctx.lineCap = 'round'
    const hipY = -0.4 * s
    const shY = -0.64 * s
    // 腿（坐下时往前伸）
    ctx.strokeStyle = sk.fur
    ctx.lineWidth = Math.max(1.5, s * 0.13)
    for (const d of [-1, 1] as const) {
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s, hipY)
      ctx.lineTo(d * (0.14 + sit * 0.16) * s, -sit * 0.1 * s)
      ctx.stroke()
      ctx.fillStyle = sk.fur
      ellipse(ctx, d * (0.16 + sit * 0.18) * s, -sit * 0.1 * s, s * 0.08, s * 0.045)
      ctx.fill()
    }
    // 身体 + 背心
    ctx.fillStyle = sk.fur
    ellipse(ctx, 0, -0.5 * s, 0.24 * s, 0.28 * s)
    ctx.fill()
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.roundRect(-0.2 * s, shY, 0.4 * s, 0.3 * s, 0.07 * s)
    ctx.fill()
    ctx.fillStyle = '#ffd54a'
    ctx.fillRect(-0.2 * s, shY + 0.16 * s, 0.4 * s, 0.05 * s)
    // 左手（欢呼举起 / 挠头 / 扶着）
    ctx.strokeStyle = sk.fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    const leftUp = p.cheer > 0 ? 1 : 0
    ctx.beginPath()
    ctx.moveTo(-0.16 * s, shY + 0.05 * s)
    if (leftUp) ctx.lineTo(-0.34 * s, shY - 0.34 * s)
    else if (p.look > 0.3) ctx.lineTo(-0.2 * s, shY - 0.3 * s)
    else ctx.lineTo(-0.3 * s, shY + 0.3 * s)
    ctx.stroke()
    // 右手 + 镐（绕手转）
    const hx = 0.24 * s
    const hy = shY + 0.12 * s
    ctx.beginPath()
    ctx.moveTo(0.16 * s, shY + 0.05 * s)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    withTransform(ctx, hx, hy, p.cheer > 0 ? -1.5 + Math.sin(p.swing * 3) * 0.1 : p.swing, 1, 1, () => {
      ctx.strokeStyle = '#a8743f'
      ctx.lineWidth = Math.max(1.5, s * 0.07)
      ctx.beginPath()
      ctx.moveTo(-s * 0.1, 0)
      ctx.lineTo(s * 0.55, 0)
      ctx.stroke()
      ctx.strokeStyle = '#7a7a8a'
      ctx.lineWidth = Math.max(2, s * 0.1)
      ctx.beginPath()
      ctx.moveTo(s * 0.55, -s * 0.22)
      ctx.quadraticCurveTo(s * 0.68, 0, s * 0.55, s * 0.22)
      ctx.stroke()
    })
    ctx.fillStyle = sk.fur
    circle(ctx, hx, hy, s * 0.065)
    ctx.fill()
    // 头
    withTransform(ctx, 0, -0.86 * s, -p.look * 0.3, 1, 1, () => {
      ctx.fillStyle = sk.fur
      circle(ctx, 0, 0, 0.26 * s)
      ctx.fill()
      if (kind === 'mole') {
        // 尖尖的嘴 + 粉鼻子 + 小眼睛
        ctx.fillStyle = sk.face
        ellipse(ctx, 0, 0.08 * s, 0.17 * s, 0.13 * s)
        ctx.fill()
        ctx.fillStyle = sk.nose
        circle(ctx, 0, 0.13 * s, 0.05 * s)
        ctx.fill()
      } else {
        // 白脸 + 两道黑纹
        ctx.fillStyle = sk.face
        ellipse(ctx, 0, 0.02 * s, 0.2 * s, 0.22 * s)
        ctx.fill()
        ctx.fillStyle = '#2b2b2b'
        for (const d of [-1, 1] as const) {
          ellipse(ctx, d * 0.1 * s, -0.02 * s, 0.05 * s, 0.14 * s)
          ctx.fill()
        }
        ctx.fillStyle = sk.nose
        circle(ctx, 0, 0.14 * s, 0.04 * s)
        ctx.fill()
      }
      ctx.fillStyle = kind === 'badger' ? '#ffffff' : '#2b2b2b'
      const er = kind === 'mole' ? 0.025 * s : 0.035 * s
      for (const d of [-1, 1] as const) {
        if (p.blink > 0.5) ctx.fillRect(d * 0.1 * s - er, -0.03 * s, er * 2, Math.max(1, 0.02 * s))
        else {
          circle(ctx, d * 0.1 * s, -0.03 * s, er)
          ctx.fill()
        }
      }
      // 嘴
      ctx.strokeStyle = '#5a3a2a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0) ctx.arc(0, 0.16 * s, 0.05 * s, 0, Math.PI)
      else ctx.arc(0, 0.17 * s, 0.05 * s, 0.2, Math.PI - 0.2)
      ctx.stroke()
      // 安全帽 + 头灯
      ctx.fillStyle = c.main
      ctx.beginPath()
      ctx.arc(0, -0.08 * s, 0.27 * s, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      fillRoundRect(ctx, -0.32 * s, -0.11 * s, 0.64 * s, 0.07 * s, 0.035 * s, c.dark)
      ctx.fillStyle = p.lamp > 0.5 ? '#ffe27a' : '#b8a860'
      circle(ctx, 0, -0.2 * s, 0.06 * s)
      ctx.fill()
    })
  })
}
