/**
 * 点亮星星场景的道具与角色：夜空、小星星、月亮、山影、小云、大星星（暗 / 亮 / 发光）、星星之间的连线、
 * 以及坐在云上举魔法棒的小动物（面朝观众）。角色原点在屁股坐着的云面上、身体正中；s 是坐高。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, gradient, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'
import { starPath } from './space'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string; glow: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', glow: 'rgba(255,107,107,0.55)' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', glow: 'rgba(74,163,255,0.55)' },
}

export function nightGradient(ctx: CanvasRenderingContext2D, h: number): CanvasGradient {
  return gradient(ctx, 0, 0, 0, h, [
    [0, '#141b3d'],
    [0.7, '#2a2a5e'],
    [1, '#4a3a6e'],
  ])
}

/** 一弯月亮 */
export function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  withAlpha(ctx, 0.25, () => {
    ctx.fillStyle = '#fff3b0'
    circle(ctx, x, y, r * 1.8)
    ctx.fill()
  })
  ctx.fillStyle = '#fff3b0'
  circle(ctx, x, y, r)
  ctx.fill()
  ctx.fillStyle = '#1b2148'
  circle(ctx, x + r * 0.45, y - r * 0.2, r * 0.82)
  ctx.fill()
}

/** 底下一排山的剪影 */
export function drawHillsSilhouette(ctx: CanvasRenderingContext2D, W: number, y: number, h: number): void {
  ctx.fillStyle = '#1b1f45'
  ctx.beginPath()
  ctx.moveTo(0, y + h)
  const n = 7
  for (let i = 0; i <= n; i++) {
    const x = (W * i) / n
    const peak = y + h * (i % 2 === 0 ? 0.55 : 0.05 + ((i * 3) % 4) * 0.1)
    ctx.quadraticCurveTo(x - W / n / 2, peak, x, y + h * (i % 2 === 0 ? 0.25 : 0.7))
  }
  ctx.lineTo(W, y + h)
  ctx.closePath()
  ctx.fill()
}

/** 大星星：lit 亮起来（金色 + 队色光晕），暗的只有轮廓；pulse 是还差一分时的一闪一闪 */
export function drawBigStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, lit: number, scale: number, pulse: number): void {
  const c = TEAM[team]
  if (lit > 0.02) {
    withAlpha(ctx, lit * 0.9, () => {
      ctx.fillStyle = c.glow
      circle(ctx, x, y, r * (1.9 + pulse * 0.3) * scale)
      ctx.fill()
    })
  } else if (pulse > 0.02) {
    withAlpha(ctx, pulse * 0.5, () => {
      ctx.fillStyle = c.glow
      circle(ctx, x, y, r * 1.6)
      ctx.fill()
    })
  }
  withTransform(ctx, x, y, 0, scale, scale, () => {
    if (lit > 0.02) {
      ctx.fillStyle = '#ffd54a'
      starPath(ctx, 0, 0, r)
      ctx.fill()
      withAlpha(ctx, lit * 0.8, () => {
        ctx.fillStyle = '#fff6c8'
        starPath(ctx, 0, 0, r * 0.5)
        ctx.fill()
      })
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      starPath(ctx, 0, 0, r)
      ctx.fill()
      ctx.strokeStyle = 'rgba(200,210,255,0.55)'
      ctx.lineWidth = Math.max(1, r * 0.12)
      ctx.stroke()
    }
  })
}

/** 星星之间的连线：progress 0…1 从第一颗连到最后一颗 */
export function drawConstellation(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[], progress: number, team: Team, width: number): void {
  if (progress <= 0.01 || pts.length < 2) return
  const total = (pts.length - 1) * progress
  ctx.strokeStyle = TEAM[team].main
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  withAlpha(ctx, 0.9, () => {
    ctx.beginPath()
    ctx.moveTo(pts[0]!.x, pts[0]!.y)
    for (let i = 1; i < pts.length; i++) {
      const seg = total - (i - 1)
      if (seg <= 0) break
      const a = pts[i - 1]!
      const b = pts[i]!
      const t = Math.min(1, seg)
      ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    }
    ctx.stroke()
  })
}

/** 飞着的火花 */
export function drawSpark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, team: Team, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = TEAM[team].glow
    circle(ctx, x, y, r * 2.2)
    ctx.fill()
    ctx.fillStyle = '#fff6c8'
    starPath(ctx, x, y, r)
    ctx.fill()
  })
}

/** 小云（角色坐的） */
export function drawPuff(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.fillStyle = 'rgba(230,236,255,0.9)'
  circle(ctx, x - s * 0.45, y, s * 0.32)
  ctx.fill()
  circle(ctx, x + s * 0.45, y, s * 0.32)
  ctx.fill()
  circle(ctx, x, y - s * 0.1, s * 0.45)
  ctx.fill()
  fillRoundRect(ctx, x - s * 0.7, y, s * 1.4, s * 0.3, s * 0.15, 'rgba(230,236,255,0.9)')
}

export interface StarKidPose {
  /** 魔法棒挥动 0…1 */
  wave: number
  lift: number
  cheer: number
  /** 睡着了 0…1 */
  sleepy: number
  blink: number
  look: number
  dir: 1 | -1
  /** 以下是一题里的表演（B72），都可选 */
  /** 举手欢呼 / 伸懒腰 0…1（连续；cheer 是赢了的 0 / 1） */
  arms?: number
  /** 按键：魔法棒举起来、棒尖发亮 0…1 */
  raise?: number
  /** 棒子绕手多转的角度（弧度，答对挥一圈） */
  spin?: number
  /** 答错棒尖「噗」地冒一小团灰烟的进度 0…1（0 = 没有） */
  fizzle?: number
  /** 左手挠头 0…1 与搓动相位 */
  scratch?: number
  rub?: number
  /** 晃腿：相位与幅度 0…1 */
  legs?: number
  legAmp?: number
  /** 笑眯眯 / 瞪大眼（答错一愣，嘴成 o） 0…1 */
  happy?: number
  wide?: number
}

/** 坐在云上的小动物：队色围巾、一只手举着顶着星星的魔法棒；原点在坐着的云面上、身体正中 */
export function drawStarKid(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: StarKidPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  const sleepy = p.sleepy
  const up = Math.max(p.cheer, p.arms ?? 0)
  const raise = (p.raise ?? 0) * (1 - up)
  const fizzle = p.fizzle ?? 0
  const scratch = (p.scratch ?? 0) * (1 - up)
  const happy = p.happy ?? 0
  const wide = p.wide ?? 0
  withTransform(ctx, x, y - p.lift, sleepy * 0.25 * p.dir, p.dir, 1, () => {
    ctx.lineCap = 'round'
    // 腿：坐在云上，膝盖朝前、小腿垂在云边上，一前一后地晃（往前晃时脚尖抬起来）
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.13)
    ctx.lineJoin = 'round'
    const legAmp = p.legAmp ?? 0
    for (const d of [-1, 1] as const) {
      const a = Math.sin((p.legs ?? 0) + (d < 0 ? Math.PI : 0)) * legAmp
      const kx = d * 0.2 * s
      const ky = -0.1 * s
      const fx = d * (0.23 + a * 0.02) * s
      const fy = (0.1 - a * 0.1) * s
      ctx.beginPath()
      ctx.moveTo(d * 0.1 * s, -0.18 * s)
      ctx.lineTo(kx, ky)
      ctx.lineTo(fx, fy)
      ctx.stroke()
      ctx.fillStyle = fur
      ellipse(ctx, fx + d * 0.02 * s, fy + 0.02 * s, 0.075 * s, 0.05 * s)
      ctx.fill()
    }
    // 身子 + 围巾
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.42 * s, 0.26 * s, 0.32 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.66 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.62 * s, 0.09 * s, 0.2 * s)
    // 右手举魔法棒：平时斜举，挥一下往星星那边一甩，按键举高，欢呼举过头顶，睡着垂下，答错耷拉一下
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    const rest = sleepy > 0.5 ? 0.9 : -0.9 + p.wave * 0.7 + fizzle * (1 - fizzle) * 1.2
    const armA = rest + (-1.35 - rest) * raise + (-1.45 - rest) * up
    const hx = 0.16 * s + Math.cos(armA) * 0.34 * s
    const hy = -0.6 * s + Math.sin(armA) * 0.34 * s
    // 棒子的朝向（画面角度）：平时斜向右上，挥的时候指向星星，举高 / 欢呼时朝上，睡着朝下
    const restDir = sleepy > 0.5 ? 1.2 : -0.35 + p.wave * 0.55 + fizzle * (1 - fizzle) * 1.6
    const dirA = restDir + (-1.25 - restDir) * raise + (-1.05 - restDir) * up + (p.spin ?? 0)
    ctx.beginPath()
    ctx.moveTo(0.16 * s, -0.6 * s)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    withTransform(ctx, hx, hy, dirA + Math.PI / 2, 1, 1, () => {
      ctx.strokeStyle = '#c9a3ff'
      ctx.lineWidth = Math.max(1.5, s * 0.06)
      ctx.beginPath()
      ctx.moveTo(0, s * 0.08)
      ctx.lineTo(0, -s * 0.42)
      ctx.stroke()
      // 棒尖：按键时发亮；答错先哑成灰的，再冒一小团灰烟
      if (raise > 0.05 && fizzle === 0) {
        withAlpha(ctx, raise * 0.6, () => {
          ctx.fillStyle = c.glow
          circle(ctx, 0, -s * 0.5, s * 0.26)
          ctx.fill()
          ctx.fillStyle = 'rgba(255,246,200,0.8)'
          circle(ctx, 0, -s * 0.5, s * 0.15)
          ctx.fill()
        })
      }
      ctx.fillStyle = fizzle > 0 && fizzle < 0.7 ? '#9aa0b5' : '#ffd54a'
      starPath(ctx, 0, -s * 0.5, s * (0.13 + raise * 0.04))
      ctx.fill()
      if (fizzle > 0) {
        const q = fizzle
        withAlpha(ctx, (1 - q) * 0.85, () => {
          ctx.fillStyle = '#8c8f9e'
          const r = s * (0.07 + 0.12 * Math.sqrt(q))
          const rise = s * (0.62 + q * 0.2)
          circle(ctx, 0, -rise, r)
          ctx.fill()
          circle(ctx, -r * 0.9, -rise + r * 0.35, r * 0.7)
          ctx.fill()
          circle(ctx, r * 0.9, -rise + r * 0.3, r * 0.75)
          ctx.fill()
        })
      }
    })
    ctx.fillStyle = fur
    circle(ctx, hx, hy, s * 0.06)
    ctx.fill()
    // 左手：平时扶着云，举手欢呼 / 伸懒腰举过头顶；挠头时搭到脑袋边上搓一搓（画在头的前面，不然被头挡住）
    const rub = Math.sin(p.rub ?? 0) * 0.035 * s * scratch
    const leftArm = (): void => {
      // 挠头的爪子贴在脑袋左上边（再往里就和脑袋叠在一起看不出来了）
      const lx = -0.3 * s + (0.01 * s + rub) * scratch
      const ly = -0.4 * s + -0.6 * s * up + (-0.95 * s + 0.4 * s) * scratch
      ctx.strokeStyle = fur
      ctx.lineWidth = Math.max(1.5, s * 0.1)
      ctx.beginPath()
      ctx.moveTo(-0.16 * s, -0.6 * s)
      ctx.lineTo(lx, ly)
      ctx.stroke()
      if (scratch > 0.05) {
        // 爪子描一圈深色边：和脑袋同一个颜色，不描看不出手搭在头上
        ctx.fillStyle = fur
        ctx.strokeStyle = 'rgba(60,40,30,0.45)'
        ctx.lineWidth = Math.max(1, s * 0.025)
        circle(ctx, lx, ly, s * 0.065)
        ctx.fill()
        ctx.stroke()
      }
    }
    if (scratch <= 0.05) leftArm()
    // 头
    withTransform(ctx, 0, -0.84 * s, -p.look * 0.3 + sleepy * 0.2, 1, 1, () => {
      ctx.fillStyle = fur
      circle(ctx, -0.23 * s, -0.16 * s, 0.09 * s)
      ctx.fill()
      circle(ctx, 0.23 * s, -0.16 * s, 0.09 * s)
      ctx.fill()
      circle(ctx, 0, 0, 0.26 * s)
      ctx.fill()
      ctx.fillStyle = accent
      if (kind === 'panda') {
        ellipse(ctx, -0.1 * s, -0.03 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
        ellipse(ctx, 0.1 * s, -0.03 * s, 0.08 * s, 0.1 * s)
        ctx.fill()
      } else {
        ellipse(ctx, 0, 0.08 * s, 0.13 * s, 0.09 * s)
        ctx.fill()
      }
      const ink = kind === 'panda' ? '#ffffff' : '#2b2b2b'
      const closed = (p.blink > 0.5 || sleepy > 0.5) && wide < 0.3
      const glance = -p.look * 0.03 * s
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (closed) {
          ctx.fillStyle = ink
          ctx.fillRect(ex - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
        } else if (happy > 0.4 && wide < 0.3) {
          // 笑眯眯：眼睛弯成 ∩
          ctx.strokeStyle = ink
          ctx.lineWidth = Math.max(1, 0.035 * s)
          ctx.beginPath()
          ctx.arc(ex, -0.01 * s, 0.035 * s, Math.PI, 0)
          ctx.stroke()
        } else {
          ctx.fillStyle = ink
          circle(ctx, ex + glance, -0.03 * s, 0.035 * s * (1 + wide * 0.45))
          ctx.fill()
        }
      }
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0 || (happy > 0.3 && wide < 0.3)) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0.02 * s, 0.11 * s, 0.05 * s, 0.04 * s)
        ctx.fill()
      } else if (wide > 0.3) ctx.arc(0.01 * s, 0.12 * s, 0.03 * s, 0, Math.PI * 2)
      else ctx.arc(0, 0.09 * s, sleepy > 0.5 ? 0.03 * s : 0.06 * s, 0.15, Math.PI - 0.15)
      ctx.stroke()
    })
    if (scratch > 0.05) leftArm()
  })
}
