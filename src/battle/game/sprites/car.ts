/** 赛车：队色车身、车顶座舱里探出司机的脑袋、尾翼、车灯、两个会转的轮子、氮气尾焰。原点在轮子着地的中点，朝右。 */
import type { Team } from '@/battle/protocol'
import { circle, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import { drawCritter, type CritterKind, type CritterPose } from './scenery'

const TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#c94444', light: '#ffa3a3' },
  blue: { main: '#4aa3ff', dark: '#2f6fbf', light: '#8fc3ff' },
}

export interface CarPose {
  /** 轮子转角（弧度） */
  wheel: number
  /** 车身离地（颠簸 / 翘头） */
  bounce: number
  /** 整体倾斜（负 = 翘起车头） */
  tilt: number
  /** 氮气尾焰 0…1 */
  nitro: number
  blink: number
  /** 司机回头 0…1 */
  look: number
  /** 司机的头再歪多少（弧度，正 = 往前探：踩油门前倾、点头、摇头，B72） */
  headTilt?: number
  /** 司机往上探（px，欢呼时） */
  headLift?: number
  /** 司机挥手 0…1 */
  wave?: number
  /** 司机的表情与手（举手、挠头、笑、一愣） */
  face?: CritterPose
  /** 车灯亮度 0…1（熄火时暗下去；不传 = 亮） */
  lamp?: number
}

export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: CritterKind, p: CarPose): void {
  const c = TEAM[team]
  withTransform(ctx, x, y - p.bounce, p.tilt, 1, 1, () => {
    // 氮气尾焰（车尾往左喷）
    if (p.nitro > 0.05) {
      const len = s * 0.45 * p.nitro
      withAlpha(ctx, 0.9, () => {
        ctx.fillStyle = '#ff9f43'
        ctx.beginPath()
        ctx.moveTo(-s * 0.5, -s * 0.22)
        ctx.quadraticCurveTo(-s * 0.5 - len * 0.6, -s * 0.3, -s * 0.5 - len, -s * 0.2)
        ctx.quadraticCurveTo(-s * 0.5 - len * 0.6, -s * 0.1, -s * 0.5, -s * 0.18)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#ffe27a'
        ctx.beginPath()
        ctx.moveTo(-s * 0.5, -s * 0.21)
        ctx.lineTo(-s * 0.5 - len * 0.55, -s * 0.2)
        ctx.lineTo(-s * 0.5, -s * 0.19)
        ctx.closePath()
        ctx.fill()
      })
    }
    // 尾翼
    ctx.fillStyle = c.dark
    ctx.fillRect(-s * 0.46, -s * 0.44, s * 0.03, s * 0.1)
    fillRoundRect(ctx, -s * 0.56, -s * 0.48, s * 0.16, s * 0.05, s * 0.02, c.dark)
    // 车身
    fillRoundRect(ctx, -s * 0.5, -s * 0.36, s, s * 0.26, s * 0.09, c.main)
    ctx.fillStyle = c.light
    ctx.fillRect(-s * 0.42, -s * 0.33, s * 0.84, s * 0.05)
    // 座舱与车窗
    fillRoundRect(ctx, -s * 0.3, -s * 0.58, s * 0.44, s * 0.26, s * 0.08, c.dark)
    fillRoundRect(ctx, -s * 0.26, -s * 0.55, s * 0.36, s * 0.18, s * 0.05, '#cfeeff')
    // 司机的脑袋（探出车窗）
    const face = p.face
    const eyesBusy = (face?.wide ?? 0) > 0.3 || (face?.happy ?? 0) > 0.4
    withTransform(ctx, -s * 0.08 + p.look * s * 0.03, -s * 0.36 - (p.headLift ?? 0), p.look * 0.25 + (p.headTilt ?? 0), 1, 1, () => {
      drawCritter(ctx, 0, 0, s * 0.5, kind, 0, p.wave ?? 0, face)
      if (p.blink > 0.5 && !eyesBusy) {
        ctx.fillStyle = kind === 'panda' ? '#000' : '#2b2b2b'
        ctx.fillRect(-s * 0.09, -s * 0.2, s * 0.06, Math.max(1, s * 0.015))
        ctx.fillRect(s * 0.03, -s * 0.2, s * 0.06, Math.max(1, s * 0.015))
      }
    })
    // 车灯（熄火时暗下去）
    ctx.fillStyle = '#ffe27a'
    circle(ctx, s * 0.47, -s * 0.25, s * 0.045)
    ctx.fill()
    if (p.lamp !== undefined && p.lamp < 0.98) {
      withAlpha(ctx, (1 - p.lamp) * 0.8, () => {
        ctx.fillStyle = '#6b6b6b'
        ctx.fill()
      })
    }
    ctx.fillStyle = '#d94c4c'
    ctx.fillRect(-s * 0.5, -s * 0.28, s * 0.04, s * 0.06)
    // 轮子
    for (const wx of [-s * 0.3, s * 0.3]) {
      ctx.fillStyle = '#2b2b2b'
      circle(ctx, wx, -s * 0.13, s * 0.13)
      ctx.fill()
      ctx.fillStyle = '#bdbdbd'
      circle(ctx, wx, -s * 0.13, s * 0.065)
      ctx.fill()
      ctx.strokeStyle = '#6b6b6b'
      ctx.lineWidth = Math.max(1, s * 0.02)
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = p.wheel + (i * Math.PI * 2) / 3
        ctx.moveTo(wx, -s * 0.13)
        ctx.lineTo(wx + Math.cos(a) * s * 0.06, -s * 0.13 + Math.sin(a) * s * 0.06)
      }
      ctx.stroke()
    }
  })
}
