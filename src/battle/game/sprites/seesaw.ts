/**
 * 跷跷板场景的道具与角色：三角支座、木板与两头的扶手、队色砝码，以及坐在板头抓着扶手的小动物（面朝观众）。
 * 板上的东西都在「板的坐标系」里画（原点在支点、随板转），所以砝码与角色跟着板一起倾。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import type { CritterKind } from './scenery'
import { FUR } from './tug'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

/** 三角支座 + 轴销；(x, groundY) 是底边中点，h 是高 */
export function drawFulcrum(ctx: CanvasRenderingContext2D, x: number, groundY: number, h: number, w: number): void {
  ctx.fillStyle = '#7a7a8a'
  ctx.beginPath()
  ctx.moveTo(x - w / 2, groundY)
  ctx.lineTo(x, groundY - h)
  ctx.lineTo(x + w / 2, groundY)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#5a5a6a'
  ctx.fillRect(x - w / 2, groundY - h * 0.08, w, h * 0.08)
  ctx.fillStyle = '#c9c9d4'
  circle(ctx, x, groundY - h, h * 0.12)
  ctx.fill()
}

/** 木板（板坐标系里、原点在支点）：half 是半长，thick 是厚度；两头一个队色扶手；glow 是还差一分那头发光 */
export function drawPlank(ctx: CanvasRenderingContext2D, half: number, thick: number, glowL: number, glowR: number): void {
  for (const [d, glow] of [
    [-1, glowL],
    [1, glowR],
  ] as const) {
    if (glow > 0.02) {
      withAlpha(ctx, glow * 0.55, () => {
        ctx.fillStyle = '#fff3b0'
        circle(ctx, d * half * 0.9, -thick * 2.2, thick * 3.5)
        ctx.fill()
      })
    }
  }
  fillRoundRect(ctx, -half, -thick / 2, half * 2, thick, thick / 2, '#c9955a')
  ctx.fillStyle = '#a8743f'
  ctx.fillRect(-half + thick, thick * 0.1, half * 2 - thick * 2, thick * 0.4)
  for (const [d, team] of [
    [-1, 'red'],
    [1, 'blue'],
  ] as const) {
    const c = TEAM[team]
    ctx.strokeStyle = c.dark
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1.5, thick * 0.5)
    ctx.beginPath()
    ctx.moveTo(d * half * 0.86, -thick / 2)
    ctx.lineTo(d * half * 0.86, -thick * 3.2)
    ctx.moveTo(d * half * 0.78, -thick * 3.2)
    ctx.lineTo(d * half * 0.94, -thick * 3.2)
    ctx.stroke()
  }
}

/** 砝码：带提手的队色小块；(x, y) 是底边中点（板坐标系） */
export function drawWeight(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team): void {
  const c = TEAM[team]
  fillRoundRect(ctx, x - s / 2, y - s * 0.8, s, s * 0.8, s * 0.16, c.main)
  ctx.fillStyle = c.dark
  ctx.fillRect(x - s / 2, y - s * 0.32, s, s * 0.16)
  ctx.strokeStyle = c.dark
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, s * 0.12)
  ctx.beginPath()
  ctx.arc(x, y - s * 0.8, s * 0.22, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  circle(ctx, x - s * 0.22, y - s * 0.6, s * 0.08)
  ctx.fill()
}

export interface RiderPose {
  /** 离座高度（板坐标系里向上为负） */
  lift: number
  /** 举手欢呼 0…1 */
  cheer: number
  /** 被翘在高处抱着扶手瞪眼 0…1 */
  scared: number
  /** 腿悬着晃的相位 */
  swing: number
  /** 腿悬空的程度 0…1（翘起来的那头） */
  dangle: number
  blink: number
  look: number
  /** 挥手 0…1 */
  wave: number
  dir: 1 | -1
  /** 以下是一题里的表演（B72），都可选 */
  /** 坐着也晃腿（一踢一踢）0…1 */
  kick?: number
  /** 举手欢呼（连续，答对）0…1 */
  arms?: number
  /** 挠头 0…1 与搓动相位 */
  scratch?: number
  rub?: number
  /** 笑眯眯 0…1（答对） */
  happy?: number
}

/** 坐在板头的小动物（板坐标系，原点在屁股坐着的板面上）：系队色围巾、抓着扶手 */
export function drawRider(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: RiderPose): void {
  const c = TEAM[team]
  const [fur, accent] = FUR[kind]
  const up = Math.max(p.cheer, p.arms ?? 0)
  const kick = (p.kick ?? 0) * (1 - p.dangle)
  const happy = (p.happy ?? 0) * (1 - p.scared)
  withTransform(ctx, x, y - p.lift, 0, p.dir, 1, () => {
    ctx.lineCap = 'round'
    // 腿：坐着往前伸（一踢一踢地晃），翘起来时悬着晃
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.13)
    for (const d of [-1, 1] as const) {
      const ph = Math.sin(p.swing + (d < 0 ? Math.PI : 0))
      const sw = ph * s * 0.1 * Math.max(p.dangle, kick * 0.6)
      const fy = 0.12 * s * p.dangle + 0.02 * s - Math.max(0, ph) * kick * 0.14 * s
      ctx.beginPath()
      ctx.moveTo(d * 0.08 * s, -0.16 * s)
      ctx.lineTo(0.2 * s + d * 0.1 * s + sw, fy)
      ctx.stroke()
      ctx.fillStyle = fur
      ellipse(ctx, 0.22 * s + d * 0.1 * s + sw, fy + 0.01 * s, s * 0.08, s * 0.045)
      ctx.fill()
    }
    ctx.fillStyle = fur
    ellipse(ctx, 0, -0.42 * s, 0.26 * s, 0.32 * s)
    ctx.fill()
    fillRoundRect(ctx, -0.22 * s, -0.66 * s, 0.44 * s, 0.1 * s, 0.05 * s, c.main)
    ctx.fillStyle = c.dark
    ctx.fillRect(0.06 * s, -0.62 * s, 0.09 * s, 0.2 * s)
    // 手：右手抓扶手、左手也搭上去；挥手 / 挠头时左手松开；欢呼两手举高
    ctx.strokeStyle = fur
    ctx.lineWidth = Math.max(1.5, s * 0.1)
    const wave = p.wave > 0.05 ? p.wave : 0
    const scratch = (p.scratch ?? 0) * (1 - wave)
    const rub = Math.sin(p.rub ?? 0) * 0.035 * s * scratch
    // 左手松开扶手时先绕到身子左边（肩膀高），再往上挥 / 搭到脑袋边上 / 举高——直接走直线会从脸上划过去
    const free = Math.min(1, Math.max(wave, scratch, up))
    const k1 = Math.min(1, free * 2)
    const k2 = Math.max(0, free * 2 - 1)
    // 挠头的爪子贴在脑袋左上边（再往里就和脑袋叠在一起看不出来了）
    const [topX, topY] =
      up >= Math.max(wave, scratch)
        ? [-0.3 * s, -1.0 * s]
        : wave > 0
          ? [-0.34 * s, -0.95 * s - Math.sin(p.swing * 3) * 0.06 * s]
          : [-0.29 * s + rub, -0.95 * s]
    const midX = 0.38 * s + (-0.36 * s - 0.38 * s) * k1
    const midY = -0.42 * s + (-0.6 * s + 0.42 * s) * k1
    const lx = midX + (topX - midX) * k2
    const ly = midY + (topY - midY) * k2
    ctx.beginPath()
    ctx.moveTo(0.16 * s, -0.6 * s)
    ctx.lineTo(0.42 * s + (0.3 * s - 0.42 * s) * up, -0.5 * s + (-1.05 * s + 0.5 * s) * up)
    ctx.stroke()
    // 左手：挠头时画在头的前面（不然被头挡住），爪子描一圈深色边
    const leftArm = (): void => {
      ctx.strokeStyle = fur
      ctx.lineWidth = Math.max(1.5, s * 0.1)
      ctx.beginPath()
      ctx.moveTo(-0.16 * s, -0.6 * s)
      ctx.lineTo(lx, ly)
      ctx.stroke()
      if (scratch > 0.05) {
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
    withTransform(ctx, 0, -0.84 * s, -p.look * 0.3, 1, 1, () => {
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
      const er = (0.035 + p.scared * 0.02) * s
      for (const ex of [-0.1 * s, 0.1 * s]) {
        if (p.blink > 0.5 && p.scared < 0.5) {
          ctx.fillStyle = ink
          ctx.fillRect(ex - 0.035 * s, -0.03 * s, 0.07 * s, Math.max(1, 0.02 * s))
        } else if (happy > 0.4) {
          // 笑眯眯：眼睛弯成 ∩
          ctx.strokeStyle = ink
          ctx.lineWidth = Math.max(1, 0.035 * s)
          ctx.beginPath()
          ctx.arc(ex, -0.01 * s, 0.035 * s, Math.PI, 0)
          ctx.stroke()
        } else {
          ctx.fillStyle = ink
          circle(ctx, ex, -0.03 * s, er)
          ctx.fill()
        }
      }
      ctx.strokeStyle = '#8a5a3a'
      ctx.lineWidth = Math.max(1, 0.03 * s)
      ctx.beginPath()
      if (p.cheer > 0 || happy > 0.3) {
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, 0.02 * s, 0.11 * s, 0.05 * s, 0.04 * s)
        ctx.fill()
      } else if (p.scared > 0.5) ctx.arc(0, 0.12 * s, 0.035 * s, 0, Math.PI * 2)
      else ctx.arc(0, 0.09 * s, 0.06 * s, 0.15, Math.PI - 0.15)
      ctx.stroke()
    })
    if (scratch > 0.05) leftArm()
  })
}
