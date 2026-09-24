/** 热气球：队色球囊（浅色条纹、高光）、颈口、四根绳、烧嘴火苗、藤篮，篮子里探出乘客的脑袋。原点在篮子底部正中，s 是总高。 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withTransform } from '../engine/draw'
import { critterLimb, drawCritter, type CritterKind, type CritterPose } from './scenery'

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#c94444' },
  blue: { main: '#4aa3ff', dark: '#2f6fbf' },
}

export interface BalloonPose {
  /** 绕球顶的摆动角（弧度） */
  sway: number
  /** 烧嘴火苗 0…1.5 */
  flame: number
  /** 乘客挥手 0…1 */
  wave: number
  /** 球囊瘪掉 0…1（输了） */
  deflate: number
  blink: number
  /** 乘客回头 0…1 */
  look: number
  /** 球囊压扁拉长（以颈口为基准：呼吸一鼓一缩、答对先压扁再拉长，B72） */
  sx?: number
  sy?: number
  /** 乘客从篮边往外探（px，横着）、歪头 / 摇头（弧度）、身子的压扁拉长（以篮子里的脚下为基准） */
  headDx?: number
  headTilt?: number
  bodySx?: number
  bodySy?: number
  /** 乘客的表情与手（举手、挠头、笑、一愣） */
  face?: CritterPose
  /** 两只手趴在篮边 [左, 右] 0…1（挥手 / 挠头 / 举手时那只手拿开） */
  rest?: [number, number]
}

export function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: BalloonPose): void {
  const c = TEAM[team]
  withTransform(ctx, x, y - s, p.sway, 1, 1, () => {
    // 现在原点在球顶，篮子底在 (0, s)
    const R = s * 0.3
    const cy = R + s * 0.02
    const neckY = s * 0.66
    withTransform(ctx, 0, neckY, 0, (1 - p.deflate * 0.22) * (p.sx ?? 1), (1 - p.deflate * 0.15) * (p.sy ?? 1), () => {
      ctx.fillStyle = c.main
      ctx.beginPath()
      ctx.moveTo(0, cy - R - neckY)
      ctx.bezierCurveTo(R * 1.35, cy - R - neckY, R * 1.2, cy + R * 0.9 - neckY, s * 0.12, 0)
      ctx.lineTo(-s * 0.12, 0)
      ctx.bezierCurveTo(-R * 1.2, cy + R * 0.9 - neckY, -R * 1.35, cy - R - neckY, 0, cy - R - neckY)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      for (const gx of [-R * 0.45, R * 0.45]) {
        ellipse(ctx, gx, cy - neckY, R * 0.16, R * 1.05)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ellipse(ctx, -R * 0.45, cy - R * 0.55 - neckY, R * 0.18, R * 0.28)
      ctx.fill()
    })
    // 烧嘴火苗（往上烧）：从颈口往球囊里窜，颈口压住火苗根部，乘客的头挡不住（B72：按一下喷一下要看得见）
    if (p.flame > 0.03) {
      const fh = s * 0.12 * (0.5 + p.flame)
      const fw = s * 0.05 * (0.8 + p.flame * 0.3)
      const fy = neckY + s * 0.03
      ctx.fillStyle = '#ff9f43'
      ctx.beginPath()
      ctx.moveTo(-fw, fy)
      ctx.quadraticCurveTo(-fw * 0.5, fy - fh * 0.6, 0, fy - fh)
      ctx.quadraticCurveTo(fw * 0.5, fy - fh * 0.6, fw, fy)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffe27a'
      ctx.beginPath()
      ctx.moveTo(-fw * 0.5, fy)
      ctx.quadraticCurveTo(0, fy - fh * 0.5, 0, fy - fh * 0.6)
      ctx.quadraticCurveTo(0, fy - fh * 0.5, fw * 0.5, fy)
      ctx.closePath()
      ctx.fill()
    }
    // 颈口
    ctx.fillStyle = c.dark
    ctx.fillRect(-s * 0.12, neckY - s * 0.01, s * 0.24, s * 0.05)
    // 绳子
    ctx.strokeStyle = '#8a6a3c'
    ctx.lineWidth = Math.max(1, s * 0.012)
    ctx.beginPath()
    for (const [nx, bx] of [
      [-0.11, -0.15],
      [-0.04, -0.06],
      [0.04, 0.06],
      [0.11, 0.15],
    ] as const) {
      ctx.moveTo(nx * s, neckY + s * 0.04)
      ctx.lineTo(bx * s, s * 0.86)
    }
    ctx.stroke()
    // 乘客（先画，篮子挡住下半截）
    const face = p.face
    const eyesBusy = (face?.wide ?? 0) > 0.3 || (face?.happy ?? 0) > 0.4
    withTransform(ctx, p.look * s * 0.02 + (p.headDx ?? 0), s * 0.9, p.look * 0.2 + (p.headTilt ?? 0), p.bodySx ?? 1, p.bodySy ?? 1, () => {
      drawCritter(ctx, 0, 0, s * 0.34, kind, 0, p.wave, face)
      if (p.blink > 0.5 && !eyesBusy) {
        ctx.fillStyle = kind === 'panda' ? '#000' : '#2b2b2b'
        ctx.fillRect(-s * 0.06, -s * 0.13, s * 0.04, Math.max(1, s * 0.01))
        ctx.fillRect(s * 0.02, -s * 0.13, s * 0.04, Math.max(1, s * 0.01))
      }
    })
    // 趴在篮边的两只手（B72）：画在篮子前面之前，篮沿挡住下半个，像手指扒着篮沿
    if (p.rest) {
      p.rest.forEach((k, j) => {
        if (k < 0.05) return
        ctx.fillStyle = critterLimb(kind)
        circle(ctx, (j === 0 ? -1 : 1) * s * 0.125, s * 0.862 + (1 - k) * s * 0.04, s * 0.036)
        ctx.fill()
        ctx.strokeStyle = 'rgba(60,40,20,0.35)'
        ctx.lineWidth = Math.max(0.75, s * 0.01)
        ctx.stroke()
      })
    }
    // 藤篮
    fillRoundRect(ctx, -s * 0.17, s * 0.86, s * 0.34, s * 0.14, s * 0.03, '#b07a45')
    ctx.strokeStyle = 'rgba(80,50,20,0.35)'
    ctx.lineWidth = Math.max(1, s * 0.01)
    ctx.beginPath()
    for (const ly of [0.9, 0.94, 0.98]) {
      ctx.moveTo(-s * 0.16, s * ly)
      ctx.lineTo(s * 0.16, s * ly)
    }
    ctx.stroke()
  })
}
