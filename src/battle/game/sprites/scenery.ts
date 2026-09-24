/** 赛跑场景的道具：云、太阳、山丘、蘑菇标记、格子终点柱、拱门彩旗、挥动的旗、发令员小猴、观众小动物。 */
import type { AvatarId } from '@/battle/avatars'
import { circle, ellipse, gradient, withTransform } from '../engine/draw'

export function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, alpha = 0.95): void {
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = '#ffffff'
  circle(ctx, x, y, s * 0.5)
  ctx.fill()
  circle(ctx, x + s * 0.5, y - s * 0.15, s * 0.42)
  ctx.fill()
  circle(ctx, x + s * 0.95, y, s * 0.36)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(x - s * 0.4, y - s * 0.05, s * 1.7, s * 0.55, s * 0.25)
  ctx.fill()
  ctx.restore()
}

export function drawSun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pulse: number): void {
  ctx.save()
  ctx.globalAlpha *= 0.25 + pulse * 0.15
  ctx.fillStyle = '#ffe27a'
  circle(ctx, x, y, r * (1.6 + pulse * 0.3))
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#ffd54a'
  circle(ctx, x, y, r)
  ctx.fill()
}

export function drawHill(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color
  ellipse(ctx, x, y, rx, ry)
  ctx.fill()
}

/** 远处的小树：树干 + 两团树冠 */
export function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = '#8a5a3c'
  ctx.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5)
  ctx.fillStyle = '#5fb84a'
  circle(ctx, x, y - s * 0.7, s * 0.34)
  ctx.fill()
  ctx.fillStyle = '#7ccf62'
  circle(ctx, x - s * 0.12, y - s * 0.86, s * 0.24)
  ctx.fill()
}

/** 跑道上的一个小标记（蘑菇）：lit = 跑过了，亮起来 */
export function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lit: boolean, team: 'red' | 'blue'): void {
  ctx.fillStyle = lit ? '#fff3c4' : '#e9dcc0'
  ctx.beginPath()
  ctx.roundRect(x - s * 0.14, y - s * 0.4, s * 0.28, s * 0.42, s * 0.08)
  ctx.fill()
  ctx.fillStyle = lit ? (team === 'red' ? '#ff6b6b' : '#4aa3ff') : '#cdbfa6'
  ctx.beginPath()
  ctx.arc(x, y - s * 0.4, s * 0.34, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  if (lit) {
    ctx.fillStyle = '#fff'
    circle(ctx, x - s * 0.12, y - s * 0.52, s * 0.07)
    ctx.fill()
    circle(ctx, x + s * 0.14, y - s * 0.5, s * 0.05)
    ctx.fill()
  }
}

/** 格子终点柱 */
export function drawFinishPost(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, w: number): void {
  const cell = Math.max(3, w / 2)
  let row = 0
  for (let y = top; y < bottom; y += cell, row++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (row + c) % 2 === 0 ? '#3d2c1e' : '#ffffff'
      ctx.fillRect(x + c * cell, y, cell, Math.min(cell, bottom - y))
    }
  }
}

/** 拱门：一根横杆 + 挂着的三角彩旗（flutter 让旗子摆动） */
export function drawArch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, s: number, flutter: number, glow: number): void {
  if (glow > 0) {
    ctx.save()
    ctx.globalAlpha *= glow * 0.5
    ctx.fillStyle = '#ffe27a'
    ctx.beginPath()
    ctx.roundRect(x - s * 0.3, y - s * 0.3, w + s * 0.6, s * 0.9, s * 0.3)
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#b8895a'
  ctx.fillRect(x, y, w, s * 0.12)
  const colors = ['#ff6b6b', '#ffc93c', '#4aa3ff', '#3ecf8e', '#a78bfa']
  const n = Math.max(3, Math.floor(w / (s * 0.5)))
  for (let i = 0; i < n; i++) {
    const px = x + ((i + 0.5) * w) / n
    const sway = Math.sin(flutter + i * 0.9) * s * 0.08
    ctx.fillStyle = colors[i % colors.length]!
    ctx.beginPath()
    ctx.moveTo(px - s * 0.18, y + s * 0.12)
    ctx.lineTo(px + s * 0.18, y + s * 0.12)
    ctx.lineTo(px + sway, y + s * 0.55)
    ctx.closePath()
    ctx.fill()
  }
}

/** 旗杆上的格子旗：wave 是挥动相位 */
export function drawCheckerFlag(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, wave: number): void {
  ctx.fillStyle = '#6b4f2e'
  ctx.fillRect(x - s * 0.04, y - s * 1.1, s * 0.08, s * 1.1)
  withTransform(ctx, x + s * 0.04, y - s * 1.1, Math.sin(wave) * 0.12, 1, 1, () => {
    const cell = s * 0.16
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#2b2b2b' : '#ffffff'
        const skew = Math.sin(wave + c * 0.8) * s * 0.03
        ctx.fillRect(c * cell, r * cell + skew, cell + 0.5, cell + 0.5)
      }
    }
  })
}

/** 发令员小猴：举着旗（down 0 = 举起，1 = 落下） */
export function drawStarter(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, down: number): void {
  // 身体
  ctx.fillStyle = '#b07a45'
  ellipse(ctx, x, y - s * 0.32, s * 0.2, s * 0.3)
  ctx.fill()
  ctx.fillStyle = '#e8c39e'
  ellipse(ctx, x, y - s * 0.3, s * 0.11, s * 0.18)
  ctx.fill()
  // 头 + 耳朵
  ctx.fillStyle = '#b07a45'
  circle(ctx, x - s * 0.2, y - s * 0.68, s * 0.07)
  ctx.fill()
  circle(ctx, x + s * 0.2, y - s * 0.68, s * 0.07)
  ctx.fill()
  circle(ctx, x, y - s * 0.68, s * 0.19)
  ctx.fill()
  ctx.fillStyle = '#e8c39e'
  ellipse(ctx, x, y - s * 0.63, s * 0.12, s * 0.1)
  ctx.fill()
  ctx.fillStyle = '#2b2b2b'
  circle(ctx, x - s * 0.06, y - s * 0.72, s * 0.03)
  ctx.fill()
  circle(ctx, x + s * 0.06, y - s * 0.72, s * 0.03)
  ctx.fill()
  // 手臂 + 旗
  const a = -1.3 + down * 1.9
  withTransform(ctx, x + s * 0.16, y - s * 0.45, a, 1, 1, () => {
    ctx.strokeStyle = '#b07a45'
    ctx.lineWidth = s * 0.08
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(s * 0.45, 0)
    ctx.stroke()
    ctx.strokeStyle = '#6b4f2e'
    ctx.lineWidth = s * 0.04
    ctx.beginPath()
    ctx.moveTo(s * 0.45, 0)
    ctx.lineTo(s * 0.45, -s * 0.5)
    ctx.stroke()
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.moveTo(s * 0.45, -s * 0.5)
    ctx.lineTo(s * 0.85, -s * 0.38)
    ctx.lineTo(s * 0.45, -s * 0.26)
    ctx.closePath()
    ctx.fill()
  })
}

/** 小动物的种类 = 可选的小动物（B66）：六种都能当司机 / 乘客 / 观众 */
export type CritterKind = AvatarId

const CRITTER_COLORS: Record<CritterKind, [string, string]> = {
  bear: ['#b98a5c', '#e9c9a3'],
  pig: ['#f6a5b5', '#fbd0da'],
  panda: ['#ffffff', '#2b2b2b'],
  monkey: ['#b07a45', '#e8c39e'],
  rabbit: ['#f4f4f4', '#ffc7d3'],
  cat: ['#f4b860', '#fff0d6'],
}

/** 小动物手的颜色（熊猫是黑的）：司机 / 乘客把手搭在别处时用（B72） */
export function critterLimb(kind: CritterKind): string {
  return kind === 'panda' ? '#2b2b2b' : CRITTER_COLORS[kind][0]
}

/**
 * 当司机 / 乘客时的表情与手（B72 一题里的表演）：全都不传时画出来与原来一模一样（观众照旧）。
 * 值都是 0…1；beat 是挥手 / 挠头摆动的相位（弧度），给了就按它摆，不给按 wave 本身摆（观众原来的写法）。
 */
export interface CritterPose {
  /** 笑眯眯（眼睛弯成 ∩）、张嘴笑 */
  happy?: number
  /** 一愣：瞪大眼、嘴成 o */
  wide?: number
  /** 两只手举过头顶 */
  arms?: number
  /** 一只手挠头 */
  scratch?: number
  beat?: number
}

/** 观众小动物：一张圆脸 + 耳朵，bounce 是离地高度；o = 表情与手（司机 / 乘客用，B72） */
export function drawCritter(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, kind: CritterKind, bounce: number, wave: number, o?: CritterPose): void {
  const [main, accent] = CRITTER_COLORS[kind]
  withTransform(ctx, x, y - bounce, 0, 1, 1, () => {
    ctx.fillStyle = main
    if (kind === 'rabbit') {
      // 小兔：两只长耳朵，里面一道粉
      for (const sx of [-1, 1]) {
        ellipse(ctx, sx * s * 0.16, -s * 0.74, s * 0.09, s * 0.24)
        ctx.fill()
      }
      ctx.fillStyle = accent
      for (const sx of [-1, 1]) {
        ellipse(ctx, sx * s * 0.16, -s * 0.74, s * 0.045, s * 0.16)
        ctx.fill()
      }
      ctx.fillStyle = main
    } else if (kind === 'cat') {
      // 小猫：两只尖耳朵
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(sx * s * 0.12, -s * 0.56)
        ctx.lineTo(sx * s * 0.32, -s * 0.76)
        ctx.lineTo(sx * s * 0.34, -s * 0.46)
        ctx.closePath()
        ctx.fill()
      }
    } else {
      circle(ctx, -s * 0.28, -s * 0.5, s * 0.12)
      ctx.fill()
      circle(ctx, s * 0.28, -s * 0.5, s * 0.12)
      ctx.fill()
    }
    circle(ctx, 0, -s * 0.32, s * 0.34)
    ctx.fill()
    ctx.fillStyle = accent
    if (kind === 'panda') {
      ellipse(ctx, -s * 0.13, -s * 0.36, s * 0.09, s * 0.11)
      ctx.fill()
      ellipse(ctx, s * 0.13, -s * 0.36, s * 0.09, s * 0.11)
      ctx.fill()
    } else {
      ellipse(ctx, 0, -s * 0.24, s * 0.16, s * 0.12)
      ctx.fill()
    }
    const wide = o?.wide ?? 0
    const happy = o?.happy ?? 0
    if (wide > 0.3) {
      // 一愣：白眼圈 + 小眼珠
      for (const ex of [-0.12, 0.12]) {
        ctx.fillStyle = '#fff'
        circle(ctx, ex * s, -s * 0.38, s * 0.075)
        ctx.fill()
        ctx.fillStyle = '#2b2b2b'
        circle(ctx, ex * s, -s * 0.38, s * 0.032)
        ctx.fill()
      }
    } else if (happy > 0.4) {
      // 笑眯眯：眼睛弯成 ∩
      ctx.strokeStyle = kind === 'panda' ? '#fff' : '#2b2b2b'
      ctx.lineWidth = Math.max(1, s * 0.045)
      ctx.lineCap = 'round'
      for (const ex of [-0.12, 0.12]) {
        ctx.beginPath()
        ctx.arc(ex * s, -s * 0.36, s * 0.055, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = kind === 'panda' ? '#fff' : '#2b2b2b'
      circle(ctx, -s * 0.12, -s * 0.38, s * 0.04)
      ctx.fill()
      circle(ctx, s * 0.12, -s * 0.38, s * 0.04)
      ctx.fill()
    }
    if (o) {
      // 嘴：答对张嘴笑、答错嘴成 o（观众不画嘴）
      if (wide > 0.3) {
        ctx.fillStyle = '#7a3b2e'
        ellipse(ctx, 0, -s * 0.19, s * 0.04, s * 0.055)
        ctx.fill()
      } else if (happy > 0.3) {
        ctx.fillStyle = '#c94f4f'
        ctx.beginPath()
        ctx.arc(0, -s * 0.22, s * 0.085, 0, Math.PI)
        ctx.closePath()
        ctx.fill()
      }
      // 手：举过头顶欢呼 / 一只手挠头（从肩膀伸出去，手臂一笔、手一个圆）
      const limb = critterLimb(kind)
      const arms = o.arms ?? 0
      const scratch = arms < 0.5 ? (o.scratch ?? 0) : 0
      const rub = Math.sin(o.beat ?? 0) * s * 0.07
      const paws: [number, number, number][] = []
      if (arms > 0.05) for (const side of [-1, 1]) paws.push([side, side * (0.3 + 0.2 * arms), -0.04 - 0.98 * arms])
      if (scratch > 0.05) paws.push([-1, -0.3 + 0.16 * scratch + (rub / s) * scratch, -0.04 - 0.62 * scratch])
      for (const [side, px, py] of paws) {
        ctx.strokeStyle = limb
        ctx.lineWidth = Math.max(1, s * 0.13)
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(side * s * 0.24, -s * 0.06)
        ctx.lineTo(px * s, py * s)
        ctx.stroke()
        ctx.fillStyle = limb
        circle(ctx, px * s, py * s, s * 0.1)
        ctx.fill()
        ctx.strokeStyle = 'rgba(60,40,20,0.3)'
        ctx.lineWidth = Math.max(0.75, s * 0.03)
        ctx.stroke()
      }
    }
    // 挥手：一只小手举起来摆
    if (wave > 0.02) {
      const swing = o?.beat !== undefined ? Math.sin(o.beat) : Math.sin(wave * 20)
      withTransform(ctx, s * 0.3, -s * 0.2, -0.8 + swing * 0.5 * wave, 1, 1, () => {
        ctx.fillStyle = main
        circle(ctx, s * 0.18, 0, s * 0.09)
        ctx.fill()
      })
    }
  })
}

/** 队色圆牌（B32：横条游戏里每条赛道起点标一个，孩子一眼看出哪条是红队 / 蓝队的） */
export function drawTeamBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: 'red' | 'blue'): void {
  ctx.fillStyle = '#ffffff'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = team === 'red' ? '#ff6b6b' : '#4aa3ff'
  circle(ctx, x, y, r * 0.72)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  circle(ctx, x - r * 0.22, y - r * 0.22, r * 0.2)
  ctx.fill()
}

/** 天空渐变（复用） */
export function skyGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  return gradient(ctx, 0, 0, 0, h, [
    [0, '#8fd0ff'],
    [1, '#e9f6ff'],
  ])
}
