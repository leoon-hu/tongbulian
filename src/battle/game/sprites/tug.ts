/** 拔河场景的道具与角色：抓绳后仰的小动物、绳子、蝴蝶结、水坑与涟漪、汗珠。 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

/** 毛色与口鼻 / 眼圈色（与观众小动物同一套） */
export const FUR: Record<CritterKind, [string, string]> = {
  bear: ['#b98a5c', '#e9c9a3'],
  pig: ['#f6a5b5', '#fbd0da'],
  panda: ['#ffffff', '#2b2b2b'],
  monkey: ['#b07a45', '#e8c39e'],
  rabbit: ['#f4f4f4', '#ffc7d3'],
  cat: ['#f4b860', '#fff0d6'],
}

export interface PullerPose {
  /** 朝向：1 朝右（红队）、-1 朝左（蓝队） */
  facing: 1 | -1
  /** 后仰程度 -0.5…1（负数是被拉得前倾） */
  lean: number
  /** 离地高度 */
  lift: number
  /** 手抓绳的高度（相对脚下，负数向上） */
  handY: number
  /** 举双手欢呼 0…1 */
  cheer: number
  /** 摔进水坑 0…1 */
  fallen: number
  /** 用力 0…1（眯眼咬牙） */
  strain: number
  /** 眼皮 0…1 */
  blink: number
  /** 以下是一题里的表演（B72），都可选 */
  /** 手抓绳处离脚下的水平距离（本地朝右；身子往前滑出去时手还在绳上，默认 0.5 个身高） */
  handX?: number
  /** 脚跟蹬地 0…1（前脚往前蹬、后脚往后撑） */
  dig?: number
  /** 答错脚下一滑 0…1（前脚滑出去） */
  slip?: number
  /** 脚下挪一挪 0…1 与相位（两只脚轮流抬） */
  shuffle?: number
  step?: number
  /** 重新握一下绳 0…1（前面那只手抬起来往前挪） */
  regrip?: number
  /** 回头张望 0…1 */
  look?: number
  /** 笑眯眯 0…1（答对拽完）/ 瞪大眼、嘴成 o（答错一愣） */
  happy?: number
  wide?: number
}

/** 抓绳的小动物：原点在脚下正中，本地坐标朝右，蓝队用 facing = -1 镜像。 */
export function drawPuller(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: CritterKind, team: Team, p: PullerPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  const fallen = p.fallen
  const happy = (p.happy ?? 0) * (1 - fallen)
  const wide = (p.wide ?? 0) * (1 - fallen)
  withTransform(ctx, x, y - p.lift + fallen * s * 0.3, fallen * 0.55 * p.facing, p.facing, 1, () => {
    const lean = fallen > 0 ? -0.35 * fallen : p.lean
    // 往前栽（被拉 / 答错脚下一滑）时腰也弯下去、头往前低，不然只是整个人平移，看不出栽
    const bow = fallen > 0 ? 0 : Math.max(0, -lean)
    const hipX = -lean * 0.22 * s
    const hipY = (-0.42 + bow * 0.06) * s
    const shX = -lean * 0.4 * s
    const shY = (-0.74 + bow * 0.14) * s
    const headX = (-lean * 0.48 + bow * 0.1) * s
    const headY = (-0.98 + bow * 0.2) * s
    const handX = p.handX ?? 0.5 * s
    ctx.lineCap = 'round'
    // 腿：前脚蹬地、后脚撑着；蹬地时两脚分得更开，滑了一下前脚滑出去，挪一挪时两脚轮流抬；摔倒时前腿翘起来
    const dig = p.dig ?? 0
    const slip = p.slip ?? 0
    const shuffle = p.shuffle ?? 0
    const ph = Math.sin(p.step ?? 0)
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.14)
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    if (fallen > 0) ctx.lineTo(0.42 * s, -0.25 * s * fallen)
    else ctx.lineTo((0.26 + lean * 0.1 + dig * 0.08 + slip * 0.24) * s, -Math.max(0, ph) * 0.12 * s * shuffle - slip * 0.05 * s)
    ctx.moveTo(hipX, hipY)
    ctx.lineTo((-0.24 - lean * 0.14 - dig * 0.06) * s, -Math.max(0, -ph) * 0.12 * s * shuffle)
    ctx.stroke()
    // 背心
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.moveTo(shX - 0.23 * s, shY + 0.02 * s)
    ctx.lineTo(shX + 0.23 * s, shY + 0.02 * s)
    ctx.lineTo(hipX + 0.25 * s, hipY + 0.1 * s)
    ctx.lineTo(hipX - 0.25 * s, hipY + 0.1 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(shX - 0.17 * s, shY + 0.17 * s, 0.34 * s, 0.07 * s)
    // 手臂：抓绳 / 举手；重新握绳时前面那只手抬起来往前挪
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.11)
    ctx.beginPath()
    if (p.cheer > 0 || fallen > 0) {
      const up = fallen > 0 ? 1 : p.cheer
      ctx.moveTo(shX - 0.1 * s, shY + 0.05 * s)
      ctx.lineTo(shX - 0.36 * s, shY - 0.36 * s * up + 0.1 * s * (1 - up))
      ctx.moveTo(shX + 0.1 * s, shY + 0.05 * s)
      ctx.lineTo(shX + 0.36 * s, shY - 0.36 * s * up + 0.1 * s * (1 - up))
    } else {
      const g = handGrip(s, p.regrip ?? 0)
      ctx.moveTo(shX - 0.02 * s, shY + 0.06 * s)
      ctx.lineTo(handX, p.handY)
      ctx.moveTo(shX + 0.06 * s, shY + 0.12 * s)
      ctx.lineTo(handX + g.dx - 0.01 * s, p.handY + g.dy + 0.005 * s)
    }
    ctx.stroke()
    // 头（回头张望时往后转一点）
    withTransform(ctx, headX, headY, -lean * 0.25 - (p.look ?? 0) * 0.35, 1, 1, () => {
      ctx.fillStyle = fur
      circle(ctx, -0.23 * s, -0.19 * s, 0.1 * s)
      ctx.fill()
      circle(ctx, 0.23 * s, -0.19 * s, 0.1 * s)
      ctx.fill()
      circle(ctx, 0, 0, 0.28 * s)
      ctx.fill()
      ctx.fillStyle = accent
      if (kind === 'panda') {
        ellipse(ctx, -0.03 * s, -0.05 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
        ellipse(ctx, 0.13 * s, -0.05 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
      } else {
        ellipse(ctx, 0.07 * s, 0.07 * s, 0.12 * s, 0.09 * s)
        ctx.fill()
      }
      // 眼睛（答对笑眯眯、答错瞪大）
      const ink = kind === 'panda' ? '#ffffff' : '#2b2b2b'
      const ey = -0.05 * s
      const squint = (p.blink > 0.5 || (p.strain > 0.6 && fallen === 0)) && wide < 0.3 && happy < 0.4
      for (const ex of [-0.03 * s, 0.13 * s]) {
        if (happy > 0.4 && wide < 0.3) {
          ctx.strokeStyle = ink
          ctx.lineWidth = Math.max(1, 0.035 * s)
          ctx.beginPath()
          ctx.arc(ex, ey + 0.015 * s, 0.035 * s, Math.PI, 0)
          ctx.stroke()
        } else if (squint) {
          ctx.fillStyle = ink
          ctx.fillRect(ex - 0.035 * s, ey, 0.07 * s, Math.max(1, 0.02 * s))
        } else {
          ctx.fillStyle = ink
          circle(ctx, ex, ey, fallen > 0.3 ? 0.045 * s : 0.035 * s * (1 + wide * 0.45))
          ctx.fill()
        }
      }
      // 嘴
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (fallen > 0.3 || wide > 0.3) ctx.arc(0.07 * s, 0.11 * s, 0.035 * s, 0, Math.PI * 2)
      else if (happy > 0.3) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0.08 * s, 0.11 * s, 0.05 * s, 0.04 * s)
        ctx.fill()
      } else if (p.strain > 0.6) {
        ctx.moveTo(0.02 * s, 0.13 * s)
        ctx.lineTo(0.13 * s, 0.13 * s)
      } else ctx.arc(0.07 * s, 0.09 * s, 0.05 * s, 0.1, Math.PI - 0.1)
      ctx.stroke()
      // 队色头带 + 后脑勺的飘带
      fillRoundRect(ctx, -0.29 * s, -0.19 * s, 0.58 * s, 0.09 * s, 0.045 * s, c.dark)
      ctx.fillStyle = c.main
      ctx.beginPath()
      ctx.moveTo(-0.28 * s, -0.14 * s)
      ctx.lineTo(-0.48 * s, -0.24 * s)
      ctx.lineTo(-0.42 * s, -0.06 * s)
      ctx.closePath()
      ctx.fill()
    })
  })
}

/** 前面那只手（第二只）相对第一只手的位置：重新握绳时抬起来往前挪（本地朝右） */
function handGrip(s: number, regrip: number): { dx: number; dy: number } {
  return { dx: (0.07 + regrip * 0.09) * s, dy: (0.035 - regrip * 0.12) * s }
}

/** 抓绳的两只手（画在绳子上面）；regrip 是重新握一下绳（前面那只手抬起来往前挪，B72） */
export function drawHands(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: CritterKind, facing: 1 | -1, regrip = 0): void {
  ctx.fillStyle = FUR[kind][0]
  circle(ctx, x, y, s * 0.09)
  ctx.fill()
  const g = handGrip(s, regrip)
  circle(ctx, x + facing * g.dx, y + g.dy, s * 0.08)
  ctx.fill()
}

/** 绳子：深色影线 + 亮面 + 绳纹，路径由 build 画 */
export function strokeRope(ctx: CanvasRenderingContext2D, width: number, build: () => void): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.save()
  ctx.translate(0, width * 0.35)
  ctx.strokeStyle = '#a8834f'
  ctx.lineWidth = width
  ctx.beginPath()
  build()
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = '#d3aa73'
  ctx.lineWidth = width * 0.8
  ctx.beginPath()
  build()
  ctx.stroke()
  ctx.save()
  ctx.setLineDash([width * 0.9, width * 0.9])
  ctx.strokeStyle = 'rgba(120,80,30,0.35)'
  ctx.lineWidth = width * 0.5
  ctx.beginPath()
  build()
  ctx.stroke()
  ctx.restore()
}

/** 绳子正中的黄色蝴蝶结；tilt 是抖动角度，glow 是还差一分时的光晕 */
export function drawBow(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tilt: number, glow: number): void {
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.55, () => {
      ctx.fillStyle = '#fff3b0'
      circle(ctx, x, y, s * 1.5)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, tilt, 1, 1, () => {
    ctx.fillStyle = '#ffd54a'
    ctx.strokeStyle = '#e6b93a'
    ctx.lineWidth = Math.max(1, s * 0.08)
    for (const d of [-1, 1]) {
      ellipse(ctx, d * s * 0.5, -s * 0.05, s * 0.48, s * 0.3)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, s * 0.1)
      ctx.lineTo(d * s * 0.42, s * 0.78)
      ctx.lineTo(d * s * 0.16, s * 0.56)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = '#ffb300'
    circle(ctx, 0, 0, s * 0.2)
    ctx.fill()
    ctx.stroke()
  })
}

/** 中线上的水坑 */
export function drawPuddle(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = '#5a9e45'
  ellipse(ctx, x, y, rx * 1.1, ry * 1.3)
  ctx.fill()
  ctx.fillStyle = '#5eb8ff'
  ellipse(ctx, x, y, rx, ry)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ellipse(ctx, x - rx * 0.3, y - ry * 0.25, rx * 0.35, ry * 0.3)
  ctx.fill()
}

/** 涟漪：t 0…1 由小到大再淡出 */
export function drawRipple(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, t: number, width: number): void {
  if (t <= 0 || t >= 1) return
  withAlpha(ctx, (1 - t) * 0.8, () => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = width
    ellipse(ctx, x, y, rx * (0.15 + t * 0.85), ry * (0.15 + t * 0.85))
    ctx.stroke()
  })
}

/** 头上飞出的汗珠：amount 1 刚冒出来 → 0 消失 */
export function drawSweat(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, amount: number, facing: 1 | -1): void {
  if (amount < 0.05) return
  const fly = (1 - amount) * s * 0.5
  withAlpha(ctx, Math.min(1, amount * 1.5), () => {
    ctx.fillStyle = '#8fd0ff'
    for (const [dx, dy] of [
      [-0.32, -0.3],
      [-0.2, -0.45],
    ] as const) {
      ellipse(ctx, x + facing * (dx * s - fly), y + dy * s - fly * 0.6, s * 0.05, s * 0.075)
      ctx.fill()
    }
  })
}
