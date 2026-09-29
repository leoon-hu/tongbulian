/**
 * 打怪兽的拳手（需求 M9）：孩子自己的小动物（B66）戴队色拳套、队色护头、队色短裤；机器人队友 / 对手是一个圆滚滚的小机器人
 * （弹簧手臂、屏幕脸、队色）。原点在脚下正中，b 是身高；本地朝右画（拳头往右出），朝左时镜像；整个按单位坐标画（缩放 b）。
 * 拳套的位置由模型算好（单位 = 身高、本地朝右），这里只负责画：手臂从肩膀连到拳套（不够长就卡通地拉长）。
 */
import type { AvatarId } from '@/battle/avatars'
import type { Team } from '@/battle/protocol'
import { withAlpha } from '../engine/draw'
import { clamp01 } from '../engine/tween'
import { starShape, TEAM_COLOR } from './ring'
import { FUR } from './tug'

export type BoxerKind = AvatarId | 'robot'

/** 一只拳套：位置（单位 = 身高，本地朝右，脚下为原点）与大小倍数（旋风拳放大） */
export interface Glove {
  x: number
  y: number
  s: number
}

export interface BoxerPose {
  /** 面朝哪边（拳头往哪边出）：1 右、−1 左 */
  dir: 1 | -1
  /** 前倾（弧度，负 = 往后仰），绕脚下 */
  lean: number
  /** 转一圈（0…1，画成水平翻转）：挥空打转、旋风拳 */
  spin: number
  /** 转向观众 0…1：五官挪到脸中间（举双拳面向观众） */
  turn: number
  /** 身子扭过去 0…1（勾拳：前肩往后、后肩往前） */
  twist: number
  /** 压扁拉长（以脚下为基准） */
  sx: number
  sy: number
  /** 前手 / 后手的拳套 */
  lead: Glove
  rear: Glove
  /** 出拳那只手的残影（旧位置，新的在前）与强度 */
  trail: readonly Glove[]
  trailArm: 'lead' | 'rear'
  trailAlpha: number
  /** 蓄力：拳套发光 0…3、亮了几格 0…3 */
  charge: number
  pips: number
  blink: number
  happy: number
  wide: number
  /** 咬牙使劲（出拳那一下） */
  grit: number
  /** 眯眼「> <」（Boss 吼的时候） */
  squint: number
  /** 耳朵和护头的带子被吹向后 0…1（Boss 吼的时候） */
  blow: number
  /** 旋风拳身边的风圈 0…1 */
  swirl: number
  /** 挥空后头上转的小星星 0…1 与时钟 */
  dizzy: number
  t: number
  /** 最后 10 秒头上的火焰光环 0…1 */
  fire: number
  /** 两脚分开 0…1 与脚尖弹跳的相位、弹跳的幅度 0…1（暂停、出拳时脚不颠） */
  stance: number
  step: number
  hop: number
  alpha: number
}

/** 头顶离脚下多高（单位 = 身高）：头上的小星星、火焰光环、测试里的占地都按它 */
export const BOXER_HEAD_Y = 0.84
export const BOXER_HEAD_R = 0.2
export function boxerTop(kind: BoxerKind): number {
  if (kind === 'rabbit') return 1.3
  if (kind === 'robot') return 1.14
  return 1.08
}
/** 肩膀：前手 / 后手 */
export const SHOULDER = { lead: { x: 0.07, y: -0.64 }, rear: { x: -0.06, y: -0.645 } } as const
/** 手臂（上臂 + 前臂）有多长；拳套半径 */
export const ARM_LEN = 0.38
export const GLOVE_R = 0.1

const INK = '#3d2c1e'

function outlineFill(ctx: CanvasRenderingContext2D, line: string, lw: number, fill: string): void {
  ctx.strokeStyle = line
  ctx.lineWidth = lw * 2
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.fill()
}

/** 肩膀到拳套：够不着就拉直（卡通地拉长），够得着就在下面弯个手肘 */
function elbowOf(sx: number, sy: number, gx: number, gy: number): [number, number] {
  const dx = gx - sx
  const dy = gy - sy
  const d = Math.hypot(dx, dy)
  const mx = (sx + gx) / 2
  const my = (sy + gy) / 2
  if (d >= ARM_LEN || d < 1e-6) return [mx, my]
  const bend = Math.sqrt((ARM_LEN / 2) ** 2 - (d / 2) ** 2)
  // 手肘往下（y 正方向）那一侧弯
  let nx = -dy / d
  let ny = dx / d
  if (ny < 0) {
    nx = -nx
    ny = -ny
  }
  return [mx + nx * bend, my + ny * bend]
}

export function drawBoxer(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, kind: BoxerKind, team: Team, p: BoxerPose): void {
  if (p.alpha <= 0.01 || b <= 1) return
  ctx.save()
  if (p.alpha < 1) ctx.globalAlpha *= p.alpha
  ctx.translate(x, y)
  if (p.lean) ctx.rotate(p.lean * p.dir)
  const turn = Math.cos(p.spin * Math.PI * 2)
  const flip = p.dir * (Math.abs(turn) < 0.06 ? (turn < 0 ? -0.06 : 0.06) : turn)
  ctx.scale(b * flip * p.sx, b * p.sy)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const lw = Math.max(1, 0.022 * b) / b
  if (p.fire > 0.02) fireHalo(ctx, p.fire, p.t)
  if (p.swirl > 0.05) swirlRings(ctx, team, p.swirl, p.t)
  if (kind === 'robot') robot(ctx, team, lw, p)
  else critter(ctx, kind, team, lw, p)
  if (p.dizzy > 0.02) dizzyStars(ctx, p.dizzy, p.t)
  ctx.restore()
}

function legs(ctx: CanvasRenderingContext2D, limb: string, lw: number, p: BoxerPose, robot: boolean): [number, number][] {
  const st = clamp01(p.stance)
  const hop = clamp01(p.hop) * 0.035
  const up1 = Math.max(0, Math.sin(p.step)) * hop
  const up2 = Math.max(0, -Math.sin(p.step)) * hop
  const feet: [number, number][] = [
    [0.13 + st * 0.03, -up1],
    [-0.12 - st * 0.03, -up2],
  ]
  ctx.beginPath()
  for (const [i, [fx, fy]] of feet.entries()) {
    const hx = i === 0 ? 0.05 : -0.05
    const hy = robot ? -0.3 : -0.35
    ctx.moveTo(hx, hy)
    ctx.quadraticCurveTo((hx + fx) / 2 + 0.03, (hy + fy) / 2, fx, fy - 0.03)
  }
  const w = robot ? 0.06 : 0.085
  ctx.strokeStyle = INK
  ctx.lineWidth = w + lw * 2
  ctx.stroke()
  ctx.strokeStyle = limb
  ctx.lineWidth = w
  ctx.stroke()
  return feet
}

function shoes(ctx: CanvasRenderingContext2D, feet: [number, number][], lw: number, color: string): void {
  ctx.beginPath()
  for (const [fx, fy] of feet) {
    ctx.moveTo(fx + 0.09, fy - 0.03)
    ctx.ellipse(fx + 0.02, fy - 0.03, 0.075, 0.042, 0, 0, Math.PI * 2)
  }
  outlineFill(ctx, INK, lw, color)
}

function arm(ctx: CanvasRenderingContext2D, sx: number, sy: number, g: Glove, limb: string, lw: number, spring: boolean): void {
  ctx.beginPath()
  if (spring) {
    // 弹簧手臂：肩膀到拳套一段锯齿
    const dx = g.x - sx
    const dy = g.y - sy
    const d = Math.hypot(dx, dy) || 1
    const nx = -dy / d
    const ny = dx / d
    const n = 7
    ctx.moveTo(sx, sy)
    for (let i = 1; i < n; i++) {
      const k = i / n
      const side = i % 2 === 0 ? 1 : -1
      ctx.lineTo(sx + dx * k + nx * side * 0.035, sy + dy * k + ny * side * 0.035)
    }
    ctx.lineTo(g.x, g.y)
    ctx.strokeStyle = INK
    ctx.lineWidth = 0.03 + lw * 2
    ctx.stroke()
    ctx.strokeStyle = limb
    ctx.lineWidth = 0.03
    ctx.stroke()
    return
  }
  const [ex, ey] = elbowOf(sx, sy, g.x, g.y)
  ctx.moveTo(sx, sy)
  ctx.quadraticCurveTo(ex, ey, g.x, g.y)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.075 + lw * 2
  ctx.stroke()
  ctx.strokeStyle = limb
  ctx.lineWidth = 0.075
  ctx.stroke()
}

/** 肩膀：侧身时前后错开，转向观众时左右对称地分开（举双拳时手臂从头两边举上去，不挡脸） */
function shoulders(p: BoxerPose): { lead: { x: number; y: number }; rear: { x: number; y: number } } {
  const k = clamp01(p.turn)
  // 勾拳扭身子：前肩往后缩、后肩转到前面来（抡出去的是后手时手臂更长，看得出是整个身子带过去的）
  const w = clamp01(p.twist)
  return {
    lead: { x: SHOULDER.lead.x + (0.14 - SHOULDER.lead.x) * k - 0.1 * w, y: SHOULDER.lead.y },
    rear: { x: SHOULDER.rear.x + (-0.14 - SHOULDER.rear.x) * k + 0.15 * w, y: SHOULDER.rear.y - 0.03 * w },
  }
}

/** 两只拳套：残影 → 蓄力的光 → 白袖口 → 队色拳套（描边）→ 高光 → 前手上的三格蓄力灯 */
function gloves(ctx: CanvasRenderingContext2D, team: Team, lw: number, p: BoxerPose): void {
  const c = TEAM_COLOR[team]
  const sh = shoulders(p)
  if (p.trailAlpha > 0.02 && p.trail.length) {
    const n = p.trail.length
    p.trail.forEach((g, i) => {
      withAlpha(ctx, p.trailAlpha * 0.5 * (1 - i / (n + 0.5)), () => {
        ctx.fillStyle = c.light
        ctx.beginPath()
        ctx.arc(g.x, g.y, GLOVE_R * g.s, 0, Math.PI * 2)
        ctx.fill()
      })
    })
  }
  const list: [Glove, { x: number; y: number }][] = [
    [p.rear, sh.rear],
    [p.lead, sh.lead],
  ]
  if (p.charge > 0.05) {
    withAlpha(ctx, Math.min(0.5, p.charge * 0.16), () => {
      ctx.fillStyle = '#fff27a'
      ctx.beginPath()
      for (const [g] of list) {
        const r = GLOVE_R * g.s * (1.45 + p.charge * 0.12)
        ctx.moveTo(g.x + r, g.y)
        ctx.arc(g.x, g.y, r, 0, Math.PI * 2)
      }
      ctx.fill()
    })
  }
  // 袖口：拳套靠肩膀那一侧一圈白
  ctx.beginPath()
  for (const [g, s] of list) {
    const dx = s.x - g.x
    const dy = s.y - g.y
    const d = Math.hypot(dx, dy) || 1
    const cx = g.x + (dx / d) * GLOVE_R * g.s * 0.85
    const cy = g.y + (dy / d) * GLOVE_R * g.s * 0.85
    const r = GLOVE_R * g.s * 0.62
    ctx.moveTo(cx + r, cy)
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
  }
  outlineFill(ctx, INK, lw, '#ffffff')
  ctx.beginPath()
  for (const [g] of list) {
    const r = GLOVE_R * g.s
    ctx.moveTo(g.x + r, g.y)
    ctx.arc(g.x, g.y, r, 0, Math.PI * 2)
  }
  outlineFill(ctx, c.dark, lw, c.main)
  // 蓄力：拳套外面一圈亮黄的光边，越蓄越粗（不改拳套本身的队色）
  if (p.charge > 0.2) {
    withAlpha(ctx, Math.min(0.9, 0.3 + p.charge * 0.2), () => {
      ctx.strokeStyle = '#fff27a'
      ctx.lineWidth = GLOVE_R * (0.12 + p.charge * 0.07)
      ctx.stroke()
    })
  }
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  for (const [g] of list) {
    const r = GLOVE_R * g.s
    ctx.moveTo(g.x - r * 0.1, g.y - r * 0.42)
    ctx.ellipse(g.x - r * 0.3, g.y - r * 0.42, r * 0.22, r * 0.14, -0.5, 0, Math.PI * 2)
  }
  ctx.fill()
  // 蓄力灯：前手上三格，按一个键亮一格（没在蓄力就不画空格子）
  if (p.pips >= 1) {
    const g = p.lead
    const r = GLOVE_R * g.s
    const lit = Math.max(0, Math.min(3, Math.round(p.pips)))
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? 'rgba(40,20,40,0.28)' : '#fff27a'
      ctx.beginPath()
      let any = false
      for (let i = 0; i < 3; i++) {
        if (i < lit !== (pass === 1)) continue
        any = true
        const px = g.x + (i - 1) * r * 0.56
        const py = g.y + r * 0.32
        ctx.moveTo(px + r * 0.22, py)
        ctx.arc(px, py, r * 0.22, 0, Math.PI * 2)
      }
      if (any) ctx.fill()
    }
  }
}

function critter(ctx: CanvasRenderingContext2D, kind: AvatarId, team: Team, lw: number, p: BoxerPose): void {
  const c = TEAM_COLOR[team]
  const [fur, accent] = FUR[kind]
  const limb = kind === 'panda' ? accent : fur
  const sh = shoulders(p)
  // 后手的手臂在身子后面；转向观众（举双拳）时前手也画在头后面
  arm(ctx, sh.rear.x, sh.rear.y, p.rear, limb, lw, false)
  const feet = legs(ctx, limb, lw, p, false)
  shoes(ctx, feet, lw, '#f7f7fb')
  // 队色短裤 + 白腰带
  ctx.beginPath()
  ctx.roundRect(-0.165, -0.47, 0.33, 0.165, 0.05)
  outlineFill(ctx, INK, lw, c.main)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-0.16, -0.468, 0.32, 0.035)
  // 身子
  ctx.beginPath()
  ctx.ellipse(0, -0.585, 0.15, 0.14, 0, 0, Math.PI * 2)
  outlineFill(ctx, INK, lw, fur)
  ctx.fillStyle = kind === 'panda' ? '#ffffff' : accent
  ctx.beginPath()
  ctx.ellipse(0.035, -0.57, 0.085, 0.09, 0, 0, Math.PI * 2)
  ctx.fill()
  const front = p.turn > 0.5
  if (front) arm(ctx, sh.lead.x, sh.lead.y, p.lead, limb, lw, false)
  critterHead(ctx, kind, team, lw, p)
  if (!front) arm(ctx, sh.lead.x, sh.lead.y, p.lead, limb, lw, false)
  gloves(ctx, team, lw, p)
}

function critterHead(ctx: CanvasRenderingContext2D, kind: AvatarId, team: Team, lw: number, p: BoxerPose): void {
  const c = TEAM_COLOR[team]
  const [fur, accent] = FUR[kind]
  const hx = 0.02
  const hy = -BOXER_HEAD_Y
  const R = BOXER_HEAD_R
  // 被吼的时候护头的两条带子往后飘（在头后面）
  const blow = clamp01(p.blow)
  if (blow > 0.05) straps(ctx, team, hx - R * 0.85, hy + 0.02, blow, p.t, lw)
  // 耳朵（在头后面）：被吹的时候往后倒（兔子的长耳朵倒得最多）
  const flap = blow * (0.85 + 0.15 * Math.sin(p.t * 40))
  ctx.beginPath()
  if (kind === 'rabbit') {
    for (const dx of [-0.07, 0.08]) {
      const ex = hx + dx - flap * 0.12
      const ey = hy - 0.27 + flap * 0.07
      ctx.moveTo(ex + 0.045, ey)
      ctx.ellipse(ex, ey, 0.045, 0.14, dx * 0.8 - flap * 1.1, 0, Math.PI * 2)
    }
  } else if (kind === 'cat' || kind === 'pig') {
    for (const sd of [-1, 1]) {
      ctx.moveTo(hx + sd * 0.07, hy - 0.16)
      ctx.lineTo(hx + sd * 0.17 - flap * 0.1, hy - 0.28 + flap * 0.06)
      ctx.lineTo(hx + sd * 0.19, hy - 0.1)
      ctx.closePath()
    }
  } else if (kind === 'monkey') {
    for (const sd of [-1, 1]) {
      ctx.moveTo(hx + sd * 0.215 + 0.065 - flap * 0.03, hy + 0.01)
      ctx.arc(hx + sd * 0.215 - flap * 0.03, hy + 0.01, 0.065, 0, Math.PI * 2)
    }
  } else {
    for (const sd of [-1, 1]) {
      ctx.moveTo(hx + sd * 0.145 + 0.068 - flap * 0.04, hy - 0.15)
      ctx.arc(hx + sd * 0.145 - flap * 0.04, hy - 0.15, 0.068, 0, Math.PI * 2)
    }
  }
  outlineFill(ctx, INK, lw, kind === 'panda' ? accent : fur)
  if (kind === 'rabbit' || kind === 'monkey') {
    ctx.fillStyle = accent
    ctx.beginPath()
    if (kind === 'rabbit') {
      for (const dx of [-0.07, 0.08]) {
        const ex = hx + dx - flap * 0.12
        const ey = hy - 0.27 + flap * 0.07
        ctx.moveTo(ex + 0.022, ey)
        ctx.ellipse(ex, ey, 0.022, 0.09, dx * 0.8 - flap * 1.1, 0, Math.PI * 2)
      }
    } else {
      for (const sd of [-1, 1]) {
        ctx.moveTo(hx + sd * 0.215 + 0.035 - flap * 0.03, hy + 0.01)
        ctx.arc(hx + sd * 0.215 - flap * 0.03, hy + 0.01, 0.035, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  }
  // 头
  ctx.beginPath()
  ctx.arc(hx, hy, R, 0, Math.PI * 2)
  outlineFill(ctx, INK, lw, fur)
  // 五官：侧着时往前挪一点，面向观众时居中
  const fo = 0.045 * (1 - clamp01(p.turn))
  const eyeY = hy - 0.025
  const eyes: [number, number][] = [
    [hx - 0.06 + fo, eyeY],
    [hx + 0.075 + fo, eyeY],
  ]
  if (kind === 'panda') {
    ctx.fillStyle = accent
    ctx.beginPath()
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex + 0.05, ey + 0.005)
      ctx.ellipse(ex, ey + 0.005, 0.05, 0.062, 0.2, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  const mx = hx + 0.01 + fo * 1.3
  const my = hy + 0.075
  if (kind !== 'panda') {
    ctx.fillStyle = kind === 'pig' ? '#fbc2cf' : accent
    ctx.beginPath()
    ctx.ellipse(mx, my, kind === 'pig' ? 0.075 : 0.095, kind === 'pig' ? 0.05 : 0.068, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // 眼睛：被吼眯成「> <」、答对笑眯眯、挥空瞪大、眨眼
  const ink = kind === 'panda' ? '#ffffff' : '#2b2b2b'
  if (p.squint > 0.5) {
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(lw * 1.4, 0.022)
    squintEyes(ctx, eyes)
  } else if (p.happy > 0.45 && p.wide < 0.3) {
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(lw * 1.4, 0.022)
    ctx.beginPath()
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex - 0.03, ey + 0.012)
      ctx.quadraticCurveTo(ex, ey - 0.03, ex + 0.03, ey + 0.012)
    }
    ctx.stroke()
  } else if (p.blink > 0.5 && p.wide < 0.3) {
    ctx.strokeStyle = ink
    ctx.lineWidth = Math.max(lw * 1.4, 0.02)
    ctx.beginPath()
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex - 0.028, ey)
      ctx.lineTo(ex + 0.028, ey)
    }
    ctx.stroke()
  } else {
    if (p.wide > 0.3) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      for (const [ex, ey] of eyes) {
        ctx.moveTo(ex + 0.045, ey)
        ctx.arc(ex, ey, 0.045, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    ctx.fillStyle = p.wide > 0.3 ? '#2b2b2b' : ink
    ctx.beginPath()
    const er = p.wide > 0.3 ? 0.02 : 0.03
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex + er, ey)
      ctx.arc(ex, ey, er, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  // 鼻子（小猪是两个鼻孔）
  ctx.fillStyle = kind === 'pig' ? '#c9667e' : '#3b2a24'
  ctx.beginPath()
  if (kind === 'pig') {
    for (const dx of [-0.022, 0.022]) {
      ctx.moveTo(mx + dx + 0.012, my - 0.005)
      ctx.ellipse(mx + dx, my - 0.005, 0.012, 0.018, 0, 0, Math.PI * 2)
    }
  } else ctx.ellipse(mx + 0.01, my - 0.035, 0.028, 0.02, 0, 0, Math.PI * 2)
  ctx.fill()
  // 嘴：平时笑、答对张嘴笑、挥空嘴成 o、出拳咬牙
  const mouthY = my + (kind === 'pig' ? 0.055 : 0.02)
  ctx.strokeStyle = '#5a3a2a'
  ctx.lineWidth = Math.max(lw, 0.016)
  if (p.wide > 0.3) {
    ctx.fillStyle = '#7a3b2e'
    ctx.beginPath()
    ctx.ellipse(mx + 0.01, mouthY + 0.01, 0.022, 0.03, 0, 0, Math.PI * 2)
    ctx.fill()
  } else if (p.happy > 0.3) {
    ctx.fillStyle = '#c0392b'
    ctx.beginPath()
    ctx.moveTo(mx - 0.035, mouthY)
    ctx.quadraticCurveTo(mx + 0.01, mouthY + 0.07, mx + 0.055, mouthY)
    ctx.closePath()
    ctx.fill()
  } else if (p.grit > 0.3) {
    ctx.beginPath()
    ctx.moveTo(mx - 0.02, mouthY + 0.01)
    ctx.lineTo(mx + 0.045, mouthY + 0.01)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(mx - 0.02, mouthY)
    ctx.quadraticCurveTo(mx + 0.01, mouthY + 0.035, mx + 0.04, mouthY)
    ctx.stroke()
  }
  // 队色护头：头顶一道 + 两边护颊
  ctx.beginPath()
  ctx.arc(hx, hy, R * 0.97, Math.PI * 1.08, Math.PI * 1.92)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.075 + lw * 2
  ctx.stroke()
  ctx.strokeStyle = c.main
  ctx.lineWidth = 0.075
  ctx.stroke()
  ctx.beginPath()
  for (const sd of [-1, 1]) {
    const px = hx + sd * R * 0.93
    ctx.moveTo(px + 0.038, hy + 0.01)
    ctx.ellipse(px, hy + 0.01, 0.038, 0.075, 0, 0, Math.PI * 2)
  }
  outlineFill(ctx, INK, lw, c.main)
}

function robot(ctx: CanvasRenderingContext2D, team: Team, lw: number, p: BoxerPose): void {
  const c = TEAM_COLOR[team]
  const metal = '#d5dbe6'
  const k = clamp01(p.turn)
  const sl = { x: 0.1 + 0.06 * k, y: -0.52 }
  const sr = { x: -0.09 - 0.07 * k, y: -0.52 }
  arm(ctx, sr.x, sr.y, p.rear, metal, lw, true)
  const feet = legs(ctx, '#9aa5b8', lw, p, true)
  shoes(ctx, feet, lw, '#6f7b90')
  // 圆滚滚的身子 + 肚子上的面板和三颗小灯
  ctx.beginPath()
  ctx.roundRect(-0.19, -0.66, 0.38, 0.38, 0.16)
  outlineFill(ctx, INK, lw, c.main)
  ctx.fillStyle = '#eef2f8'
  ctx.beginPath()
  ctx.roundRect(-0.1, -0.58, 0.21, 0.19, 0.05)
  ctx.fill()
  ctx.fillStyle = c.dark
  ctx.beginPath()
  for (const dx of [-0.05, 0, 0.05]) {
    ctx.moveTo(dx + 0.02, -0.49)
    ctx.arc(dx, -0.49, 0.02, 0, Math.PI * 2)
  }
  ctx.fill()
  // 天线（灯一闪一闪；被吼的时候往后弯）
  const bend = clamp01(p.blow) * (0.85 + 0.15 * Math.sin(p.t * 40))
  const tipX = 0.02 - bend * 0.07
  const tipY = -1.1 + bend * 0.02
  ctx.strokeStyle = INK
  ctx.lineWidth = Math.max(lw * 1.5, 0.018)
  ctx.beginPath()
  ctx.moveTo(0.02, -1.0)
  ctx.quadraticCurveTo(0.02, -1.07, tipX, tipY + 0.01)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(tipX, tipY, 0.035, 0, Math.PI * 2)
  outlineFill(ctx, INK, lw, Math.sin(p.t * 5) > 0 ? '#fff27a' : c.light)
  // 脑袋是一台小显示器
  ctx.beginPath()
  ctx.roundRect(-0.19, -1.0, 0.42, 0.32, 0.1)
  outlineFill(ctx, INK, lw, metal)
  ctx.fillStyle = '#1d2b3a'
  ctx.beginPath()
  ctx.roundRect(-0.14, -0.955, 0.32, 0.23, 0.06)
  ctx.fill()
  const fo = 0.03 * (1 - clamp01(p.turn))
  const eyes: [number, number][] = [
    [-0.02 + fo, -0.85],
    [0.1 + fo, -0.85],
  ]
  ctx.strokeStyle = '#6ff7ff'
  ctx.fillStyle = '#6ff7ff'
  ctx.lineWidth = 0.022
  ctx.beginPath()
  if (p.squint > 0.5) {
    squintEyes(ctx, eyes)
  } else if (p.dizzy > 0.3) {
    // 晕了：× ×
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex - 0.025, ey - 0.025)
      ctx.lineTo(ex + 0.025, ey + 0.025)
      ctx.moveTo(ex + 0.025, ey - 0.025)
      ctx.lineTo(ex - 0.025, ey + 0.025)
    }
    ctx.stroke()
  } else if (p.happy > 0.45) {
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex - 0.03, ey + 0.012)
      ctx.lineTo(ex, ey - 0.02)
      ctx.lineTo(ex + 0.03, ey + 0.012)
    }
    ctx.stroke()
  } else if (p.blink > 0.5) {
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex - 0.028, ey)
      ctx.lineTo(ex + 0.028, ey)
    }
    ctx.stroke()
  } else {
    const r = p.wide > 0.3 ? 0.04 : 0.03
    for (const [ex, ey] of eyes) {
      ctx.moveTo(ex + r, ey)
      ctx.arc(ex, ey, r, 0, Math.PI * 2)
    }
    if (p.wide > 0.3) ctx.stroke()
    else ctx.fill()
  }
  // 屏幕上的嘴
  ctx.beginPath()
  if (p.happy > 0.3) {
    ctx.moveTo(0.0 + fo, -0.79)
    ctx.quadraticCurveTo(0.04 + fo, -0.755, 0.08 + fo, -0.79)
  } else {
    ctx.moveTo(0.01 + fo, -0.78)
    ctx.lineTo(0.07 + fo, -0.78)
  }
  ctx.stroke()
  arm(ctx, sl.x, sl.y, p.lead, metal, lw, true)
  gloves(ctx, team, lw, p)
}

/** 最后 10 秒头上的一圈火焰：几簇火苗朝外跳（画在头后面：外圈橙、里圈黄） */
function fireHalo(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  const cx = 0.02
  const cy = -BOXER_HEAD_Y - 0.02
  const n = 5
  withAlpha(ctx, clamp01(amount), () => {
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass === 0 ? '#ff8a3d' : '#ffd84d'
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * (0.12 + (0.76 * i) / (n - 1))
        const fl = 0.8 + 0.3 * Math.sin(t * 13 + i * 1.7)
        const r0 = BOXER_HEAD_R * 0.95
        const len = (pass === 0 ? 0.17 : 0.1) * fl
        const w = pass === 0 ? 0.055 : 0.03
        const bx = cx + Math.cos(a) * r0
        const by = cy + Math.sin(a) * r0
        const tx = cx + Math.cos(a) * (r0 + len)
        const ty = cy + Math.sin(a) * (r0 + len)
        const px = -Math.sin(a) * w
        const py = Math.cos(a) * w
        ctx.moveTo(bx - px, by - py)
        ctx.quadraticCurveTo(bx + (tx - bx) * 0.5 - px * 1.2, by + (ty - by) * 0.5 - py * 1.2, tx, ty)
        ctx.quadraticCurveTo(bx + (tx - bx) * 0.5 + px * 1.2, by + (ty - by) * 0.5 + py * 1.2, bx + px, by + py)
      }
      ctx.fill()
    }
  })
}

/** 挥空后头上转两颗小星星 */
function dizzyStars(ctx: CanvasRenderingContext2D, amount: number, t: number): void {
  withAlpha(ctx, clamp01(amount * 1.5), () => {
    ctx.fillStyle = '#ffd24a'
    ctx.beginPath()
    for (let i = 0; i < 2; i++) {
      const a = t * 7 + i * Math.PI
      starShape(ctx, 0.02 + Math.cos(a) * 0.22, -1.12 + Math.sin(a) * 0.08, 0.065, a)
    }
    ctx.fill()
    ctx.strokeStyle = '#b8860b'
    ctx.lineWidth = 0.012
    ctx.stroke()
  })
}

/** 眯眼「> <」：左眼开口朝前、右眼开口朝后（路径与描边一起做） */
function squintEyes(ctx: CanvasRenderingContext2D, eyes: readonly [number, number][]): void {
  ctx.beginPath()
  eyes.forEach(([ex, ey], i) => {
    const d = i === 0 ? 1 : -1
    ctx.moveTo(ex - d * 0.028, ey - 0.024)
    ctx.lineTo(ex + d * 0.022, ey)
    ctx.lineTo(ex - d * 0.028, ey + 0.024)
  })
  ctx.stroke()
}

/** 护头后面的两条队色带子：平时收着不画，被吼的时候往后飘、一抖一抖 */
function straps(ctx: CanvasRenderingContext2D, team: Team, x: number, y: number, blow: number, t: number, lw: number): void {
  const c = TEAM_COLOR[team]
  const len = 0.2 * blow
  ctx.beginPath()
  for (let i = 0; i < 2; i++) {
    const w = Math.sin(t * 34 + i * 1.9) * 0.035 * blow
    const y0 = y - 0.02 + i * 0.045
    ctx.moveTo(x, y0)
    ctx.quadraticCurveTo(x - len * 0.5, y0 - 0.02 + w, x - len, y0 + w * 1.6 + i * 0.02)
    ctx.lineTo(x - len + 0.012, y0 + 0.028 + w * 1.6 + i * 0.02)
    ctx.quadraticCurveTo(x - len * 0.5, y0 + 0.02 + w, x, y0 + 0.03)
    ctx.closePath()
  }
  outlineFill(ctx, INK, lw * 0.8, c.main)
}

/** 旋风拳：身边两道弧形的风圈，跟着转（队色浅色） */
function swirlRings(ctx: CanvasRenderingContext2D, team: Team, amount: number, t: number): void {
  const a0 = t * 16
  withAlpha(ctx, clamp01(amount) * 0.75, () => {
    ctx.strokeStyle = TEAM_COLOR[team].light
    ctx.lineWidth = 0.035
    ctx.beginPath()
    for (let i = 0; i < 2; i++) {
      const a = a0 + i * Math.PI
      ctx.moveTo(Math.cos(a) * 0.36, -0.55 + Math.sin(a) * 0.2)
      ctx.ellipse(0, -0.55, 0.36, 0.2, 0, a, a + 1.9)
      ctx.moveTo(Math.cos(a + 0.8) * 0.28, -0.3 + Math.sin(a + 0.8) * 0.14)
      ctx.ellipse(0, -0.3, 0.28, 0.14, 0, a + 0.8, a + 2.2)
    }
    ctx.stroke()
  })
}
