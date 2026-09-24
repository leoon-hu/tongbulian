/**
 * 开火车场景的道具：队色蒸汽小火车（车头 + 车厢）、山体与隧道口、石门柱、铁轨、站台与站牌钟、铃、信号灯。
 * 车头 / 车厢的原点都在车头前端（车鼻）落在铁轨上的那一点，朝右；s 是车头长度，车厢按自己的长度 len 画、高度也按 s。
 */
import type { Team } from '@/battle/protocol'
import { circle, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import { drawCritter, type CritterKind, type CritterPose } from './scenery'

export const TRAIN_TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#c94444', light: '#ffa3a3' },
  blue: { main: '#4aa3ff', dark: '#2f6fbf', light: '#8fc3ff' },
}

/** 烟囱口相对车鼻的位置（模型冒烟的点要和画的对上） */
export const CHIMNEY_X = -0.15
export const CHIMNEY_Y = -0.7

export interface LocoPose {
  /** 轮子转角（弧度） */
  wheel: number
  /** 车身离地 */
  bounce: number
  /** 车灯亮度 0…1（隧道里最亮） */
  light: number
  /** 汽笛喷汽 0…1 */
  whistle: number
  blink: number
  /** 司机回头 0…1 */
  look: number
  /** 输了：司机耷拉下来 0…1 */
  sad: number
  /** 司机的头再歪多少（弧度，正 = 往前探：按键前倾、点头、摇头，B72） */
  headTilt?: number
  /** 司机往上探（px，欢呼时） */
  headLift?: number
  /** 司机挥手 0…1 */
  wave?: number
  /** 司机的表情与手（举手、笑、一愣） */
  face?: CritterPose
}

function drawWheel(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, angle: number, spokes: number): void {
  ctx.fillStyle = '#2b2b2b'
  circle(ctx, cx, cy, r)
  ctx.fill()
  ctx.fillStyle = '#d0d0d0'
  circle(ctx, cx, cy, r * 0.62)
  ctx.fill()
  ctx.strokeStyle = '#6b6b6b'
  ctx.lineWidth = Math.max(1, r * 0.16)
  ctx.beginPath()
  for (let i = 0; i < spokes; i++) {
    const a = angle + (i * Math.PI * 2) / spokes
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55)
  }
  ctx.stroke()
  ctx.fillStyle = '#2b2b2b'
  circle(ctx, cx, cy, r * 0.14)
  ctx.fill()
}

/** 蒸汽车头：排障器、锅炉（圆头朝前）、黄铜圆顶、烟囱、驾驶室里探出脑袋的司机、车灯与光束、三只轮子 + 连杆。 */
export function drawLocomotive(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: LocoPose): void {
  const c = TRAIN_TEAM[team]
  withTransform(ctx, x, y - p.bounce, 0, 1, 1, () => {
    // 车灯光束：车头前面一道淡黄的扇形
    if (p.light > 0.05) {
      withAlpha(ctx, 0.35 * p.light, () => {
        ctx.fillStyle = '#ffe27a'
        ctx.beginPath()
        ctx.moveTo(-0.02 * s, -0.4 * s)
        ctx.lineTo(0.75 * s, -0.64 * s)
        ctx.lineTo(0.75 * s, -0.16 * s)
        ctx.closePath()
        ctx.fill()
      })
    }
    // 汽笛喷汽：圆顶上方一柱白汽
    if (p.whistle > 0.05) {
      withAlpha(ctx, 0.85 * p.whistle, () => {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(-0.38 * s, -0.56 * s)
        ctx.lineTo(-0.47 * s - 0.06 * s * p.whistle, -0.6 * s - 0.34 * s * p.whistle)
        ctx.lineTo(-0.29 * s + 0.06 * s * p.whistle, -0.6 * s - 0.34 * s * p.whistle)
        ctx.closePath()
        ctx.fill()
      })
    }
    // 底盘与排障器
    ctx.fillStyle = '#3a3a44'
    ctx.fillRect(-1.0 * s, -0.26 * s, 0.96 * s, 0.07 * s)
    ctx.fillStyle = '#5a5a66'
    ctx.beginPath()
    ctx.moveTo(-0.1 * s, -0.26 * s)
    ctx.lineTo(0, -0.26 * s)
    ctx.lineTo(0.07 * s, -0.03 * s)
    ctx.lineTo(-0.1 * s, -0.03 * s)
    ctx.closePath()
    ctx.fill()
    // 驾驶室：队色深色箱子 + 深灰车顶 + 窗
    fillRoundRect(ctx, -1.0 * s, -0.74 * s, 0.4 * s, 0.52 * s, 0.05 * s, c.dark)
    fillRoundRect(ctx, -1.04 * s, -0.79 * s, 0.48 * s, 0.07 * s, 0.03 * s, '#3a3a44')
    fillRoundRect(ctx, -0.94 * s, -0.68 * s, 0.28 * s, 0.24 * s, 0.04 * s, '#cfeeff')
    // 司机：探出窗口的脑袋
    const face = p.face
    const eyesBusy = (face?.wide ?? 0) > 0.3 || (face?.happy ?? 0) > 0.4
    withTransform(ctx, -0.8 * s + p.look * 0.02 * s, -0.42 * s + p.sad * 0.05 * s - (p.headLift ?? 0), p.look * 0.25 - p.sad * 0.2 + (p.headTilt ?? 0), 1, 1, () => {
      drawCritter(ctx, 0, 0, s * 0.42, kind, 0, p.wave ?? 0, face)
      if (p.blink > 0.5 && !eyesBusy) {
        ctx.fillStyle = kind === 'panda' ? '#000' : '#2b2b2b'
        ctx.fillRect(-0.075 * s, -0.17 * s, 0.05 * s, Math.max(1, s * 0.013))
        ctx.fillRect(0.025 * s, -0.17 * s, 0.05 * s, Math.max(1, s * 0.013))
      }
    })
    // 锅炉：圆头朝前，两道箍，高光
    fillRoundRect(ctx, -0.64 * s, -0.5 * s, 0.6 * s, 0.28 * s, 0.11 * s, c.main)
    ctx.fillStyle = c.light
    ctx.fillRect(-0.58 * s, -0.47 * s, 0.46 * s, 0.05 * s)
    ctx.fillStyle = c.dark
    ctx.fillRect(-0.44 * s, -0.5 * s, 0.03 * s, 0.28 * s)
    ctx.fillRect(-0.27 * s, -0.5 * s, 0.03 * s, 0.28 * s)
    // 黄铜圆顶
    ctx.fillStyle = '#ffd54a'
    ctx.beginPath()
    ctx.arc(-0.38 * s, -0.5 * s, 0.07 * s, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
    // 烟囱
    ctx.fillStyle = '#3a3a44'
    ctx.fillRect(-0.2 * s, -0.68 * s, 0.1 * s, 0.19 * s)
    fillRoundRect(ctx, -0.23 * s, -0.72 * s, 0.16 * s, 0.06 * s, 0.02 * s, '#3a3a44')
    // 车灯
    ctx.fillStyle = '#ffe27a'
    circle(ctx, -0.05 * s, -0.4 * s, 0.05 * s)
    ctx.fill()
    ctx.fillStyle = '#fff8d6'
    circle(ctx, -0.06 * s, -0.41 * s, 0.02 * s)
    ctx.fill()
    // 轮子：前面一只小的、后面两只大驱动轮，连杆连着两只驱动轮上同一相位的点
    drawWheel(ctx, -0.16 * s, -0.09 * s, 0.09 * s, p.wheel, 3)
    drawWheel(ctx, -0.45 * s, -0.13 * s, 0.13 * s, p.wheel, 4)
    drawWheel(ctx, -0.8 * s, -0.13 * s, 0.13 * s, p.wheel, 4)
    const px = Math.cos(p.wheel) * 0.07 * s
    const py = Math.sin(p.wheel) * 0.07 * s
    ctx.strokeStyle = '#d94c4c'
    ctx.lineWidth = Math.max(1, 0.035 * s)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-0.45 * s + px, -0.13 * s + py)
    ctx.lineTo(-0.8 * s + px, -0.13 * s + py)
    ctx.stroke()
    // 车尾挂钩
    ctx.fillStyle = '#3a3a44'
    ctx.fillRect(-1.08 * s, -0.31 * s, 0.08 * s, 0.05 * s)
  })
}

/** 车厢：x 是这节车厢的前端、len 是长度；偶数节是带两扇窗的客车，奇数节是露着货物的敞车；每节自带往后接的挂钩。 */
export function drawWagon(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, s: number, team: Team, index: number, wheel: number, bounce: number): void {
  const c = TRAIN_TEAM[team]
  const passenger = index % 2 === 0
  withTransform(ctx, x, y - bounce, 0, 1, 1, () => {
    ctx.fillStyle = '#3a3a44'
    ctx.fillRect(-len - s * 0.16, -0.31 * s, s * 0.16, 0.05 * s)
    ctx.fillRect(-len + s * 0.02, -0.26 * s, len - s * 0.04, 0.06 * s)
    if (passenger) {
      fillRoundRect(ctx, -len, -0.54 * s, len, 0.32 * s, 0.05 * s, c.main)
      fillRoundRect(ctx, -len - 0.02 * s, -0.58 * s, len + 0.04 * s, 0.06 * s, 0.03 * s, c.dark)
      const ww = len * 0.22
      for (const fx of [0.2, 0.58]) fillRoundRect(ctx, -len + len * fx, -0.5 * s, ww, 0.16 * s, 0.03 * s, '#cfeeff')
    } else {
      fillRoundRect(ctx, -len, -0.46 * s, len, 0.24 * s, 0.04 * s, c.light)
      ctx.fillStyle = c.dark
      ctx.fillRect(-len + len * 0.32, -0.46 * s, 0.03 * s, 0.24 * s)
      ctx.fillRect(-len + len * 0.66, -0.46 * s, 0.03 * s, 0.24 * s)
      const cargo = ['#ffb347', '#7ed957', '#ffd54a']
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cargo[i]!
        circle(ctx, -len + len * (0.25 + i * 0.25), -0.5 * s, 0.075 * s)
        ctx.fill()
      }
    }
    drawWheel(ctx, -len * 0.22, -0.09 * s, 0.09 * s, wheel, 2)
    drawWheel(ctx, -len * 0.78, -0.09 * s, 0.09 * s, wheel, 2)
  })
}

/** 山体：盖住 mouthX 左边的一座圆头大山，隧道口上方往右鼓出一点（洞在山肚子底下）；compact 只画矮山。 */
export function drawMountain(ctx: CanvasRenderingContext2D, mouthX: number, archTop: number, bottom: number, H: number, k: number, compact: boolean): void {
  const peakY = compact ? H * 0.06 : H * 0.04
  ctx.fillStyle = '#63a854'
  ctx.beginPath()
  ctx.moveTo(mouthX, bottom + 10)
  ctx.lineTo(mouthX, archTop)
  ctx.quadraticCurveTo(mouthX + 16 * k, H * 0.3, mouthX * 0.5, peakY)
  ctx.quadraticCurveTo(mouthX * 0.08, peakY, -10, H * 0.4)
  ctx.lineTo(-10, bottom + 10)
  ctx.closePath()
  ctx.fill()
  // 几丛深色灌木
  ctx.fillStyle = '#4c8f42'
  for (const [fx, fy, r] of [
    [0.25, 0.45, 5],
    [0.6, 0.25, 4],
    [0.45, 0.7, 4.5],
  ] as const) {
    circle(ctx, mouthX * fx, archTop * fy + (compact ? 0 : 2 * k), r * k)
    ctx.fill()
  }
}

/** 隧道口：山右边缘上的深色拱洞（左上角圆的）；火车从这个洞里开出来 */
export function drawTunnelMouth(ctx: CanvasRenderingContext2D, mouthX: number, archTop: number, bottom: number, archW: number): void {
  ctx.fillStyle = '#1f2130'
  ctx.beginPath()
  ctx.roundRect(mouthX - archW, archTop, archW + 1, bottom - archTop, [archW * 0.55, 0, 0, 0])
  ctx.fill()
}

/** 隧道口的石门柱（画在火车上面，火车从柱子后面出来）+ 拱顶石 */
export function drawPortal(ctx: CanvasRenderingContext2D, mouthX: number, archTop: number, bottom: number, k: number): void {
  const w = Math.max(5, 7 * k)
  fillRoundRect(ctx, mouthX - w / 2, archTop - 5 * k, w, bottom - archTop + 5 * k, 2 * k, '#9b8f7d')
  ctx.fillStyle = '#7d7262'
  for (let y = archTop + 4 * k; y < bottom; y += 12 * k) ctx.fillRect(mouthX - w / 2, y, w, Math.max(1, k))
  fillRoundRect(ctx, mouthX - w, archTop - 9 * k, w * 2, 5 * k, 1.5 * k, '#8a7f6e')
}

/** 一条铁轨：碎石道床 + 枕木 + 钢轨（y 是钢轨顶面） */
export function drawTrack(ctx: CanvasRenderingContext2D, y: number, W: number, k: number): void {
  ctx.fillStyle = '#cdc3b2'
  ctx.fillRect(0, y - 2 * k, W, 6.5 * k)
  ctx.fillStyle = '#8a6a4a'
  const pitch = Math.max(8, 10 * k)
  for (let x = 0; x < W; x += pitch) ctx.fillRect(x, y - 1.5 * k, Math.max(2, 3 * k), 5 * k)
  ctx.fillStyle = '#5c5c66'
  ctx.fillRect(0, y - 1.6 * k, W, Math.max(1.5, 1.7 * k))
}

/** 站台：地面上的一块台子（黄色安全线）+ 两根柱子撑着一片雨棚；roofY 是雨棚顶边。紧凑版没有站台，只有 drawStationPost 的记号柱 */
export function drawStation(ctx: CanvasRenderingContext2D, x0: number, W: number, roadTop: number, roofY: number, k: number, compact: boolean): void {
  if (compact) return
  const slabH = Math.max(3, 7 * k)
  fillRoundRect(ctx, x0, roadTop - slabH, W - x0 + 10, slabH, 2 * k, '#d9cfc0')
  ctx.fillStyle = '#ffd54a'
  ctx.fillRect(x0, roadTop - slabH, W - x0 + 10, Math.max(1, 1.5 * k))
  ctx.fillStyle = '#6b4f2e'
  for (const px of [x0 + 8 * k, W - 12 * k]) ctx.fillRect(px, roofY + 6 * k, 3 * k, roadTop - slabH - roofY - 6 * k)
  fillRoundRect(ctx, x0 + 2 * k, roofY, W - x0 + 10, 8 * k, 3 * k, '#3aa8a0')
  ctx.fillStyle = '#2d8a83'
  ctx.fillRect(x0 + 2 * k, roofY + 6 * k, W - x0 + 10, 2 * k)
}

/** 站牌钟：白色圆盘 + 时针分针；glow 还差一分时发光 */
export function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glow: number): void {
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#ffe27a'
      circle(ctx, x, y, r * 1.8)
      ctx.fill()
    })
  }
  ctx.fillStyle = '#3a3a44'
  circle(ctx, x, y, r * 1.15)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.strokeStyle = '#3a3a44'
  ctx.lineWidth = Math.max(1, r * 0.14)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - r * 0.6)
  ctx.moveTo(x, y)
  ctx.lineTo(x + r * 0.45, y + r * 0.2)
  ctx.stroke()
}

/** 挂在雨棚下的铃：swing 是摆动角 */
export function drawBell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, swing: number): void {
  withTransform(ctx, x, y, swing, 1, 1, () => {
    ctx.fillStyle = '#6b4f2e'
    ctx.fillRect(-s * 0.06, 0, s * 0.12, s * 0.25)
    ctx.fillStyle = '#ffd54a'
    ctx.beginPath()
    ctx.moveTo(-s * 0.4, s * 0.95)
    ctx.quadraticCurveTo(-s * 0.42, s * 0.3, 0, s * 0.25)
    ctx.quadraticCurveTo(s * 0.42, s * 0.3, s * 0.4, s * 0.95)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e0b62f'
    ctx.fillRect(-s * 0.46, s * 0.9, s * 0.92, s * 0.1)
    ctx.fillStyle = '#3a3a44'
    circle(ctx, 0, s * 1.02, s * 0.1)
    ctx.fill()
  })
}

/** 信号灯：柱子 + 上红下绿两盏灯 + 臂板；go 0 = 红灯、臂板水平（停），1 = 绿灯、臂板下垂（走） */
export function drawSignal(ctx: CanvasRenderingContext2D, x: number, baseY: number, h: number, k: number, go: number): void {
  ctx.fillStyle = '#3a3a44'
  ctx.fillRect(x - 1.2 * k, baseY - h, 2.4 * k, h)
  fillRoundRect(ctx, x - 4 * k, baseY - h - 2 * k, 8 * k, 13 * k, 2 * k, '#2b2b2b')
  withAlpha(ctx, 0.25 + (1 - go) * 0.75, () => {
    ctx.fillStyle = '#ff4d4d'
    circle(ctx, x, baseY - h + 1.5 * k, 2.4 * k)
    ctx.fill()
  })
  withAlpha(ctx, 0.25 + go * 0.75, () => {
    ctx.fillStyle = '#3ecf8e'
    circle(ctx, x, baseY - h + 7.5 * k, 2.4 * k)
    ctx.fill()
  })
  withTransform(ctx, x + 3 * k, baseY - h + 4.5 * k, go * 0.9, 1, 1, () => {
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(0, -1.2 * k, 11 * k, 2.4 * k)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(7 * k, -1.2 * k, 2 * k, 2.4 * k)
  })
}

/** 紧凑版的车站记号：黄黑条纹的柱子 + 小钟 */
export function drawStationPost(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, k: number, glow: number): void {
  const w = Math.max(3, 4 * k)
  const cell = Math.max(3, 5 * k)
  let i = 0
  for (let y = top; y < bottom; y += cell, i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ffd54a' : '#3a3a44'
    ctx.fillRect(x - w / 2, y, w, Math.min(cell, bottom - y))
  }
  drawClock(ctx, x, top - 4 * k, Math.max(3, 4 * k), glow)
}
