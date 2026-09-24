/** 融冰场景的道具与角色：极光、雪花、浮冰、波纹水面、小鱼、冰砖（裂 / 化）、系围巾的企鹅。 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, gradient, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

/** 极光：两条带子，t 是相位（0 = 不动） */
export function drawAurora(ctx: CanvasRenderingContext2D, W: number, top: number, h: number, t: number, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    const bands: [string, number, number][] = [
      ['#7cf7c4', 0, 0.7],
      ['#b48cff', 1.7, 0.5],
    ]
    for (const [color, off, speed] of bands) {
      ctx.fillStyle = gradient(ctx, 0, top, 0, top + h, [
        [0, color],
        [1, 'rgba(255,255,255,0)'],
      ])
      ctx.beginPath()
      ctx.moveTo(0, top + h)
      for (let i = 0; i <= 8; i++) {
        const x = (W * i) / 8
        ctx.lineTo(x, top + h * 0.12 + Math.sin(i * 0.9 + t * speed + off) * h * 0.25)
      }
      ctx.lineTo(W, top + h)
      ctx.closePath()
      ctx.fill()
    }
  })
}

/** 雪花：小的是圆点，大的是六角 */
export function drawFlake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, big: boolean, rot: number): void {
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  if (!big) {
    circle(ctx, x, y, r)
    ctx.fill()
    return
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = Math.max(1, r * 0.35)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = rot + (Math.PI / 3) * i
    ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r)
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.stroke()
}

/** 远处的浮冰：白色多边形 + 淡蓝底 */
export function drawIceberg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = '#e9f6ff'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, y)
  ctx.lineTo(x - w * 0.3, y - h * 0.55)
  ctx.lineTo(x - w * 0.05, y - h)
  ctx.lineTo(x + w * 0.2, y - h * 0.6)
  ctx.lineTo(x + w * 0.5, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#bfe3ff'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.05, y - h)
  ctx.lineTo(x + w * 0.2, y - h * 0.6)
  ctx.lineTo(x + w * 0.5, y)
  ctx.lineTo(x + w * 0.05, y)
  ctx.closePath()
  ctx.fill()
}

/** 顶边是波浪的一片水（y 是波浪中线，bottom 是底边） */
export function fillWave(ctx: CanvasRenderingContext2D, W: number, y: number, bottom: number, t: number, amp: number, len: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, bottom)
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const x = (W * i) / steps
    ctx.lineTo(x, y + Math.sin(x / len + t) * amp)
  }
  ctx.lineTo(W, bottom)
  ctx.closePath()
  ctx.fill()
}

/** 小鱼：dir 1 朝右 / -1 朝左，wag 是摆尾相位 */
export function drawFish(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: 1 | -1, wag: number, tilt: number): void {
  withTransform(ctx, x, y, tilt, dir, 1, () => {
    ctx.fillStyle = '#ff9f43'
    const w = Math.sin(wag) * 0.25
    ctx.beginPath()
    ctx.moveTo(-s * 0.45, 0)
    ctx.lineTo(-s * 0.85, -s * 0.3 + w * s)
    ctx.lineTo(-s * 0.85, s * 0.3 + w * s)
    ctx.closePath()
    ctx.fill()
    ellipse(ctx, 0, 0, s * 0.5, s * 0.28)
    ctx.fill()
    ctx.fillStyle = '#ffd27a'
    ellipse(ctx, s * 0.05, s * 0.08, s * 0.3, s * 0.12)
    ctx.fill()
    ctx.fillStyle = '#2b2f3a'
    circle(ctx, s * 0.28, -s * 0.06, s * 0.05)
    ctx.fill()
  })
}

/**
 * 一块冰砖：cx 是中心 x，top 是整块（没化时）的顶边；从顶上往下化（底边不动）；
 * crack 0…1 裂纹长出来，melt 0…1 化掉的比例，alarm 0…1 只剩一块时的报警闪烁
 */
export function drawIceBlock(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, h: number, crack: number, melt: number, alarm: number, k: number): void {
  const hh = h * (1 - melt)
  if (hh <= 0.5) return
  const y = top + h - hh
  const x = cx - w / 2
  const r = Math.min(6 * k, hh * 0.3, w * 0.2)
  withAlpha(ctx, 1 - melt * 0.4, () => {
    ctx.fillStyle = gradient(ctx, 0, y, 0, y + hh, [
      [0, '#f4fbff'],
      [1, '#a9dcff'],
    ])
    ctx.beginPath()
    ctx.roundRect(x, y, w, hh, r)
    ctx.fill()
    ctx.strokeStyle = '#bfe6ff'
    ctx.lineWidth = Math.max(1, 1.2 * k)
    ctx.stroke()
    if (hh > 8) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.roundRect(x + 3 * k, y + 3 * k, w * 0.25, Math.max(2, hh * 0.16), Math.min(2 * k, hh * 0.08))
      ctx.fill()
      ctx.fillStyle = 'rgba(80,150,220,0.22)'
      ctx.fillRect(x + 2 * k, y + hh * 0.86, w - 4 * k, hh * 0.1)
    }
  })
  if (alarm > 0.02) {
    ctx.fillStyle = `rgba(255,120,120,${(0.35 * alarm).toFixed(3)})`
    ctx.beginPath()
    ctx.roundRect(x, y, w, hh, r)
    ctx.fill()
  }
  if (crack > 0.02) {
    withAlpha(ctx, crack, () => {
      ctx.strokeStyle = '#4a90d9'
      ctx.lineWidth = Math.max(1, 1.3 * k)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cx + w * 0.05, y)
      ctx.lineTo(cx - w * 0.08, y + hh * 0.25)
      ctx.lineTo(cx + w * 0.1, y + hh * 0.45)
      ctx.lineTo(cx - w * 0.05, y + hh * 0.7)
      ctx.moveTo(cx - w * 0.08, y + hh * 0.25)
      ctx.lineTo(cx - w * 0.28, y + hh * 0.32)
      ctx.moveTo(cx + w * 0.1, y + hh * 0.45)
      ctx.lineTo(cx + w * 0.3, y + hh * 0.55)
      ctx.stroke()
    })
  }
}

export interface PenguinPose {
  /** 离地高度 */
  lift: number
  /** 整体倾斜（弧度） */
  tilt: number
  /** 翅膀举起 0…1 */
  flap: number
  /** 眼皮 0…1 */
  blink: number
  /** 皱眉 0…1 */
  worry: number
  /** 张嘴欢呼 0…1 */
  cheer: number
  /** 仰面漂在水里 0…1 */
  float: number
  /** 漂着时蹬腿的相位 */
  kick: number
  /** 落地压扁 0…1 */
  squash: number
  /** 以下是一题里的表演（B72），都可选 */
  /** 左右摇摆着踩脚：相位与幅度 0…1（两只脚轮流抬） */
  step?: number
  stomp?: number
  /** 脚下打滑 0…1（两只脚往外撇） */
  splay?: number
  /** 张望 -1…1（眼睛和嘴往一边看） */
  look?: number
  /** 低头往前探 0…1（按键时蓄力：脸往下挪一点） */
  bow?: number
  /** 笑眯眯 0…1（答对）/ 瞪大眼、嘴成 o（答错一愣） */
  happy?: number
  wide?: number
}

/** 企鹅：原点在脚下正中，正面朝观众，s 是身高 */
export function drawPenguin(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, p: PenguinPose): void {
  const c = TEAM[team]
  withTransform(ctx, x, y - p.lift + p.float * s * 0.5, p.tilt, 1, 1 - p.squash * 0.12, () => {
    // 漂在水里时绕身体中心转成仰面
    withTransform(ctx, 0, -s * 0.5, -1.35 * p.float, 1, 1, () => {
      // 脚（踩脚时两只轮流抬，打滑时往外撇）
      ctx.fillStyle = '#ff9f43'
      const kick = Math.sin(p.kick) * p.float * s * 0.06
      const ph = Math.sin(p.step ?? 0) * (p.stomp ?? 0)
      const splay = (p.splay ?? 0) * s * 0.08
      ellipse(ctx, -s * 0.14 - splay, s * 0.47 + kick - Math.max(0, ph) * s * 0.08, s * 0.12, s * 0.05)
      ctx.fill()
      ellipse(ctx, s * 0.14 + splay, s * 0.47 - kick - Math.max(0, -ph) * s * 0.08, s * 0.12, s * 0.05)
      ctx.fill()
      // 身体与肚皮
      ctx.fillStyle = '#2b2f3a'
      ellipse(ctx, 0, 0, s * 0.34, s * 0.48)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ellipse(ctx, 0, s * 0.1, s * 0.23, s * 0.34)
      ctx.fill()
      ellipse(ctx, 0, -s * 0.24, s * 0.2, s * 0.16)
      ctx.fill()
      // 翅膀（从肩膀转，flap 举起来）
      const wing = 0.35 - p.flap * 1.9
      for (const d of [-1, 1] as const) {
        withTransform(ctx, d * s * 0.3, -s * 0.1, d * wing, 1, 1, () => {
          ctx.fillStyle = '#2b2f3a'
          ellipse(ctx, 0, s * 0.16, s * 0.09, s * 0.2)
          ctx.fill()
        })
      }
      // 队色围巾 + 飘带
      fillRoundRect(ctx, -s * 0.26, -s * 0.1, s * 0.52, s * 0.1, s * 0.05, c.main)
      ctx.fillStyle = c.dark
      ctx.fillRect(s * 0.1, -s * 0.04, s * 0.1, s * 0.2)
      // 脸：低头往前探时整张脸往下挪一点
      withTransform(ctx, 0, (p.bow ?? 0) * s * 0.05, 0, 1, 1, () => {
        // 眼睛（眨眼是两条线；答对笑眯眯、答错瞪大；张望时往一边看）
        const happy = (p.happy ?? 0) * (1 - p.float)
        const wide = (p.wide ?? 0) * (1 - p.float)
        const glance = (p.look ?? 0) * s * 0.06
        for (const d of [-1, 1] as const) {
          ctx.fillStyle = '#2b2f3a'
          if (happy > 0.4 && wide < 0.3) {
            ctx.strokeStyle = '#2b2f3a'
            ctx.lineWidth = Math.max(1, s * 0.035)
            ctx.beginPath()
            ctx.arc(d * s * 0.1, -s * 0.27, s * 0.04, Math.PI, 0)
            ctx.stroke()
          } else if (p.blink > 0.5 && wide < 0.3) ctx.fillRect(d * s * 0.1 - s * 0.04, -s * 0.28, s * 0.08, Math.max(1, s * 0.02))
          else {
            const r = s * 0.045 * (1 + wide * 0.35)
            circle(ctx, d * s * 0.1 + glance, -s * 0.28, r)
            ctx.fill()
            ctx.fillStyle = '#ffffff'
            circle(ctx, d * s * 0.1 + glance + s * 0.015, -s * 0.295, s * 0.015)
            ctx.fill()
          }
          if (p.worry > 0.1) {
            ctx.strokeStyle = '#2b2f3a'
            ctx.lineWidth = Math.max(1, s * 0.03)
            ctx.beginPath()
            ctx.moveTo(d * s * 0.16, -s * 0.37 + p.worry * s * 0.02)
            ctx.lineTo(d * s * 0.05, -s * 0.35 - p.worry * s * 0.03)
            ctx.stroke()
          }
        }
        // 嘴：欢呼 / 惊讶时张开；答错一愣时是个小 o
        ctx.fillStyle = '#ff9f43'
        if (wide > 0.3 && p.cheer === 0) {
          circle(ctx, glance, -s * 0.16, s * 0.045)
          ctx.fill()
          ctx.fillStyle = '#c0392b'
          circle(ctx, glance, -s * 0.16, s * 0.022)
          ctx.fill()
        } else {
          const open = Math.max(p.cheer, p.float, happy) * s * 0.06
          ctx.beginPath()
          ctx.moveTo(-s * 0.07 + glance, -s * 0.2)
          ctx.lineTo(s * 0.07 + glance, -s * 0.2)
          ctx.lineTo(glance, -s * 0.12 + open)
          ctx.closePath()
          ctx.fill()
        }
      })
    })
  })
}
