/**
 * 游泳场景的道具与角色（俯视的泳池）：瓷砖甲板、遮阳伞、救生圈、出发台、珠子分道线、池底地砖、触板、水纹，
 * 以及戴泳帽泳镜的青蛙（红队）/ 小鸭（蓝队）。角色原点在头的中心，朝右；s 是身长（头到脚）。
 */
import type { Team } from '@/battle/protocol'
import { circle, ellipse, fillRoundRect, withAlpha, withTransform } from '../engine/draw'

const TEAM: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', light: '#ffb3b3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', light: '#a9d3ff' },
}

export type SwimmerKind = 'frog' | 'duck'

const SKIN: Record<SwimmerKind, { body: string; belly: string; limb: string }> = {
  frog: { body: '#6cc04a', belly: '#d2f0a8', limb: '#5aa83c' },
  duck: { body: '#ffd54a', belly: '#fff2b3', limb: '#f2b33d' },
}

/** 瓷砖甲板：浅色底 + 格线 */
export function drawTileDeck(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tile: number): void {
  ctx.fillStyle = '#e9eff3'
  ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = '#d3dce3'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let gx = x + tile; gx < x + w; gx += tile) {
    ctx.moveTo(gx, y)
    ctx.lineTo(gx, y + h)
  }
  for (let gy = y + tile; gy < y + h; gy += tile) {
    ctx.moveTo(x, gy)
    ctx.lineTo(x + w, gy)
  }
  ctx.stroke()
}

/** 俯视的遮阳伞：八瓣两色 + 中心的伞尖 */
export function drawUmbrella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colors: [string, string]): void {
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = colors[i % 2]!
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.arc(x, y, r, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  circle(ctx, x, y, r * 0.12)
  ctx.fill()
}

/** 挂在墙上的救生圈：红白四段 */
export function drawRingBuoy(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.lineWidth = r * 0.55
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = i % 2 === 0 ? '#ff6b6b' : '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.72, (i * Math.PI) / 2 + 0.2, ((i + 1) * Math.PI) / 2 + 0.2)
    ctx.stroke()
  }
}

/** 出发台（俯视）：队色台面 + 深色前沿 + 一道白条 */
export function drawStartBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: Team): void {
  const c = TEAM[team]
  fillRoundRect(ctx, x, y, w, h, Math.min(w, h) * 0.2, c.main)
  ctx.fillStyle = c.dark
  ctx.fillRect(x + w * 0.82, y + h * 0.1, w * 0.18, h * 0.8)
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillRect(x + w * 0.15, y + h * 0.42, w * 0.55, h * 0.16)
}

/** 珠子分道线：两种颜色交替的小圆 */
export function drawLaneRope(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, r: number, colors: [string, string]): void {
  const step = r * 2.15
  let i = 0
  for (let x = x0 + r; x < x1; x += step, i++) {
    ctx.fillStyle = colors[i % 2]!
    circle(ctx, x, y, r)
    ctx.fill()
  }
}

/** 池底的一块地砖标记；lit = 游过了，亮成队色 */
export function drawPoolTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, lit: boolean, team: Team): void {
  fillRoundRect(ctx, x - s / 2, y - s / 2, s, s, s * 0.22, lit ? TEAM[team].main : 'rgba(255,255,255,0.32)')
  if (lit) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    circle(ctx, x - s * 0.18, y - s * 0.18, s * 0.14)
    ctx.fill()
  }
}

/** 池壁上的黄色触板；glow 是还差一分 / 拍到时的光 */
export function drawTouchPad(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, w: number, glow: number): void {
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.6, () => {
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.roundRect(x - w * 1.6, top - w * 0.6, w * 3.2, bottom - top + w * 1.2, w)
      ctx.fill()
    })
  }
  fillRoundRect(ctx, x, top, w, bottom - top, w * 0.3, glow > 0.5 ? '#fff0a0' : '#ffd54a')
  ctx.fillStyle = '#e6b93a'
  ctx.fillRect(x + w * 0.35, top + w * 0.5, w * 0.3, bottom - top - w)
}

/** 水面漂动的亮纹：一条波浪线 */
export function drawShimmer(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, t: number, amp: number, len: number, width: number, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.beginPath()
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps
      const yy = y + Math.sin(x / len + t) * amp
      if (i === 0) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
  })
}

/** 头前推出的白浪：两道弧 */
export function drawBowWave(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, strength: number): void {
  if (strength < 0.05) return
  withAlpha(ctx, strength * 0.85, () => {
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1, r * 0.22)
    ctx.lineCap = 'round'
    for (const d of [1.35, 1.75]) {
      ctx.beginPath()
      ctx.arc(x, y, r * d, -0.75, 0.75)
      ctx.stroke()
    }
  })
}

export interface SwimmerPose {
  /** 划水相位 */
  phase: number
  /** 0 = 漂着，1 = 全速游 */
  swim: number
  /** 蹲在出发台上 0…1 */
  crouch: number
  /** 跳水中的「高度」0…1（俯视用放大表现） */
  air: number
  /** 举手欢呼 0…1 */
  cheer: number
  /** 仰面漂 0…1（输了） */
  float: number
  blink: number
  /** 回头 0…1 */
  look: number
  /** 仰面时蹬腿的相位 */
  kick: number
  /** 踩水 0…1（等答题时手在两边慢慢划、腿慢慢蹬，B72）与它的相位 */
  tread?: number
  treadT?: number
  /** 摆好划水的架势 0…1：一只手往前伸、一只往后摆（正在按 / 伸展） */
  reach?: number
  /** 刚按了一下 0…1：往前那只手划一下 */
  press?: number
  /** 挥手 0…1（外侧那只手出水挥）与挥动的相位；waveSide 是外侧（红队在上 −1、蓝队在下 1） */
  wave?: number
  waveSide?: 1 | -1
  beat?: number
  /** 挠头 0…1（里侧那只手搭到泳帽上） */
  scratch?: number
  /** 头往两边摆（弧度，摇头） */
  turn?: number
  /** 张嘴笑 0…1（答对） */
  happy?: number
  /** 瞪大眼、嘴成 o 0…1（答错一愣） */
  wide?: number
  /** 呛了一口水 0…1：嘴前冒一串泡泡 */
  gulp?: number
}

/** 泳镜：两片镜片 + 绕过帽子的带子；pushed = 推到帽子上（仰面漂时）；wide = 瞪大眼（镜片里的眼睛变大、眼珠变小，B72） */
function drawGoggles(ctx: CanvasRenderingContext2D, r: number, blink: number, look: number, pushed: number, wide = 0): void {
  const gx = r * (0.5 - pushed * 0.75)
  const lens = r * (0.3 - pushed * 0.08) * (1 + wide * 0.3)
  ctx.strokeStyle = '#2b2b2b'
  ctx.lineWidth = Math.max(1, r * 0.09)
  ctx.beginPath()
  ctx.moveTo(gx - lens * 0.4, -r * 0.55)
  ctx.lineTo(-r * 0.6, -r * 0.7)
  ctx.moveTo(gx - lens * 0.4, r * 0.55)
  ctx.lineTo(-r * 0.6, r * 0.7)
  ctx.stroke()
  for (const d of [-1, 1] as const) {
    ctx.fillStyle = '#d5f1ff'
    circle(ctx, gx, d * r * 0.5, lens)
    ctx.fill()
    ctx.stroke()
    if (pushed < 0.5) {
      ctx.fillStyle = '#2b2b2b'
      if (blink > 0.5 && wide < 0.3) ctx.fillRect(gx - lens * 0.5, d * r * 0.5 - Math.max(0.5, lens * 0.12), lens, Math.max(1, lens * 0.24))
      else {
        circle(ctx, gx + lens * 0.25 - look * lens * 0.6, d * r * 0.5, lens * 0.32 * (1 - wide * 0.4))
        ctx.fill()
      }
    }
  }
}

/** 队色泳帽 + 一道浅色条；青蛙的帽子给两个眼泡留位置（画得小一点） */
function drawCap(ctx: CanvasRenderingContext2D, r: number, team: Team, kind: SwimmerKind): void {
  const c = TEAM[team]
  ctx.fillStyle = c.main
  circle(ctx, -r * 0.08, 0, r * (kind === 'frog' ? 0.86 : 0.92))
  ctx.fill()
  ctx.fillStyle = c.light
  ctx.beginPath()
  ctx.ellipse(-r * 0.2, 0, r * 0.14, r * 0.62, 0, 0, Math.PI * 2)
  ctx.fill()
}

/** 青蛙 / 小鸭泳员（俯视）：身体、两条腿打水、两只手臂轮流划水、头 + 帽 + 泳镜；蹲台、跳水、欢呼、仰面漂都在这里 */
export function drawSwimmer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, kind: SwimmerKind, p: SwimmerPose): void {
  const c = TEAM[team]
  const sk = SKIN[kind]
  const r = s * 0.23
  const scale = 1 + p.air * 0.35
  withTransform(ctx, x, y, 0, scale, scale, () => {
    ctx.lineCap = 'round'
    if (p.float > 0.5) {
      drawFloating(ctx, s, r, team, kind, p)
      return
    }
    const roll = 1 - Math.sin(Math.min(1, p.float * 2) * Math.PI) * 0.35
    ctx.save()
    ctx.scale(1, roll)
    const bodyLen = s * 0.42 * (1 - p.crouch * 0.4)
    const hipX = -s * 0.72 * (1 - p.crouch * 0.4)
    const tread = p.tread ?? 0
    const treadT = p.treadT ?? 0
    // 腿：在后面打水（蹲着时收起来；踩水时慢慢蹬）
    ctx.strokeStyle = sk.limb
    ctx.lineWidth = Math.max(1.5, s * 0.075)
    for (const d of [-1, 1] as const) {
      const kick = Math.sin(p.phase * 2 + (d < 0 ? Math.PI : 0)) * s * 0.1 * p.swim + Math.sin(treadT * 1.5 + (d < 0 ? Math.PI : 0)) * s * 0.07 * tread
      const fx = hipX - s * 0.26 * (1 - p.crouch * 0.6)
      ctx.beginPath()
      ctx.moveTo(hipX, d * s * 0.07)
      ctx.lineTo(fx, d * s * 0.1 + kick)
      ctx.stroke()
      ctx.fillStyle = sk.limb
      ellipse(ctx, fx - s * 0.03, d * s * 0.1 + kick, s * (kind === 'frog' ? 0.07 : 0.05), s * 0.045)
      ctx.fill()
    }
    // 身体 + 队色泳衣带
    ctx.fillStyle = sk.body
    ellipse(ctx, -s * 0.46 * (1 - p.crouch * 0.4), 0, bodyLen, s * 0.17)
    ctx.fill()
    ctx.fillStyle = c.main
    ctx.fillRect(-s * 0.56 * (1 - p.crouch * 0.4), -s * 0.15, s * 0.13, s * 0.3)
    // 水下拉水的手臂（半透明）先画，出水回摆的那只在头之后画
    const arms: { d: 1 | -1; tipX: number; tipY: number; above: boolean }[] = []
    const L = s * 0.32
    // 肩膀出发、角度 ang（0 = 朝前）、长 len 的手尖
    const tipAt = (d: 1 | -1, ang: number, len: number): [number, number] => [-s * 0.28 + Math.cos(ang) * len, d * (s * 0.14 + Math.sin(ang) * len * 0.9)]
    const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
    const reach = p.reach ?? 0
    const wave = p.wave ?? 0
    const scratch = p.scratch ?? 0
    const outer = p.waveSide ?? -1
    for (const d of [-1, 1] as const) {
      let a = (p.phase + (d < 0 ? Math.PI : 0)) % (Math.PI * 2)
      if (a < 0) a += Math.PI * 2
      let tipX: number
      let tipY: number
      let above: boolean
      if (p.swim < 0.05) {
        // 漂着 / 踩水：两只手在身边慢慢往外划、往里收（B72）
        ;[tipX, tipY] = tipAt(d, 0.35 + tread * 0.3 * Math.sin(treadT + (d < 0 ? 0 : Math.PI)), L)
        above = true
      } else {
        const pull = a <= Math.PI
        tipX = -s * 0.28 + Math.cos(a) * L
        tipY = d * (s * 0.14 + Math.abs(Math.sin(a)) * L * (pull ? 0.2 : 0.7))
        above = !pull
      }
      // 摆好划水的架势：外侧那只往前伸（按一下往回划一点），里侧那只往后贴着身子
      if (reach > 0.01) {
        const [rx, ry] = d === outer ? tipAt(d, 0.12 + (p.press ?? 0) * 0.45, L * 1.3) : tipAt(d, Math.PI - 0.3, L)
        tipX = lerp(tipX, rx, reach)
        tipY = lerp(tipY, ry, reach)
        above = above || reach > 0.5
      }
      // 挥手：外侧那只出水往外伸、来回摆；挠头：里侧那只搭到泳帽上搓
      if (wave > 0.01 && d === outer) {
        const [wx, wy] = tipAt(d, 0.95 + Math.sin((p.beat ?? 0) * 2) * 0.32, L * 1.1)
        tipX = lerp(tipX, wx, wave)
        tipY = lerp(tipY, wy, wave)
        above = above || wave > 0.3
      }
      if (scratch > 0.01 && d !== outer) {
        const rub = Math.sin((p.beat ?? 0) * 3) * s * 0.04
        tipX = lerp(tipX, -s * 0.05 + rub, scratch)
        tipY = lerp(tipY, d * s * 0.1, scratch)
        above = above || scratch > 0.3
      }
      // 欢呼：两只手举出水面往前伸着挥（答对那一拍按 cheer 的大小过渡过去）
      if (p.cheer > 0) {
        const w = Math.sin(p.phase * 2 + d) * 0.15
        const k = Math.min(1, p.cheer)
        tipX = lerp(tipX, -s * 0.28 + Math.cos(0.55 + w) * L, k)
        tipY = lerp(tipY, d * (s * 0.14 + Math.sin(0.9 + w) * L), k)
        above = above || k > 0.3
      }
      arms.push({ d, tipX, tipY, above })
    }
    const drawArm = (arm: (typeof arms)[number], alpha: number): void => {
      withAlpha(ctx, alpha, () => {
        ctx.strokeStyle = sk.limb
        ctx.lineWidth = Math.max(1.5, s * 0.08)
        ctx.beginPath()
        ctx.moveTo(-s * 0.28, arm.d * s * 0.14)
        ctx.lineTo(arm.tipX, arm.tipY)
        ctx.stroke()
        ctx.fillStyle = sk.limb
        circle(ctx, arm.tipX, arm.tipY, s * 0.055)
        ctx.fill()
      })
    }
    for (const arm of arms) if (!arm.above) drawArm(arm, 0.5)
    // 头
    const happy = p.happy ?? 0
    const wide = p.wide ?? 0
    withTransform(ctx, 0, 0, -p.look * 0.35 + (p.turn ?? 0), 1, 1, () => {
      ctx.fillStyle = sk.body
      circle(ctx, 0, 0, r)
      ctx.fill()
      if (kind === 'duck') {
        ctx.fillStyle = '#ff9f43'
        ctx.beginPath()
        ctx.roundRect(r * 0.7, -r * 0.36, r * 0.85, r * 0.72, r * 0.3)
        ctx.fill()
      }
      drawCap(ctx, r, team, kind)
      if (kind === 'frog') {
        ctx.fillStyle = sk.body
        for (const d of [-1, 1] as const) {
          circle(ctx, r * 0.5, d * r * 0.5, r * 0.36)
          ctx.fill()
        }
      }
      if ((p.cheer > 0.4 || happy > 0.4) && wide < 0.3) {
        // 欢呼 / 答对：抬头看天，张着嘴
        ctx.fillStyle = '#2b2b2b'
        for (const d of [-1, 1] as const) {
          circle(ctx, r * 0.35, d * r * 0.42, r * 0.11)
          ctx.fill()
        }
        ctx.fillStyle = '#c0392b'
        ellipse(ctx, r * 0.72, 0, r * 0.18, r * 0.14)
        ctx.fill()
      } else {
        drawGoggles(ctx, r, p.blink, p.look, 0, wide)
        if (wide > 0.3) {
          // 呛了一口水：嘴成 o
          ctx.fillStyle = '#7a3b2e'
          ellipse(ctx, r * (kind === 'duck' ? 1.3 : 0.86), 0, r * 0.13, r * 0.17)
          ctx.fill()
        }
      }
      // 嘴前冒一串泡泡（呛水）
      const gulp = p.gulp ?? 0
      if (gulp > 0.02) {
        withAlpha(ctx, Math.min(1, gulp * 1.5), () => {
          ctx.fillStyle = 'rgba(255,255,255,0.55)'
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = Math.max(1, r * 0.08)
          for (let j = 0; j < 3; j++) {
            const out = (1 - gulp) * r * 0.8
            circle(ctx, r * (kind === 'duck' ? 1.8 : 1.3) + j * r * 0.5 + out, (j - 1) * r * 0.45, r * (0.18 + j * 0.07) * (0.7 + (1 - gulp) * 0.5))
            ctx.fill()
            ctx.stroke()
          }
        })
      }
    })
    for (const arm of arms) if (arm.above) drawArm(arm, 1)
    ctx.restore()
  })
}

/** 仰面漂着：肚皮朝上、手脚摊开慢慢蹬、泳镜推到帽子上、闭眼「呼——」 */
function drawFloating(ctx: CanvasRenderingContext2D, s: number, r: number, team: Team, kind: SwimmerKind, p: SwimmerPose): void {
  const c = TEAM[team]
  const sk = SKIN[kind]
  ctx.strokeStyle = sk.limb
  ctx.lineWidth = Math.max(1.5, s * 0.075)
  for (const d of [-1, 1] as const) {
    const kick = Math.sin(p.kick + (d < 0 ? Math.PI : 0)) * s * 0.07
    ctx.beginPath()
    ctx.moveTo(-s * 0.72, d * s * 0.08)
    ctx.lineTo(-s * 0.98, d * s * 0.18 + kick)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s * 0.28, d * s * 0.14)
    ctx.lineTo(-s * 0.12, d * s * 0.5)
    ctx.stroke()
    ctx.fillStyle = sk.limb
    circle(ctx, -s * 0.12, d * s * 0.5, s * 0.055)
    ctx.fill()
  }
  ctx.fillStyle = sk.belly
  ellipse(ctx, -s * 0.46, 0, s * 0.42, s * 0.19)
  ctx.fill()
  ctx.fillStyle = c.main
  ctx.fillRect(-s * 0.56, -s * 0.16, s * 0.13, s * 0.32)
  ctx.fillStyle = sk.body
  circle(ctx, 0, 0, r)
  ctx.fill()
  if (kind === 'duck') {
    ctx.fillStyle = '#ff9f43'
    ellipse(ctx, r * 0.55, 0, r * 0.4, r * 0.28)
    ctx.fill()
  }
  drawCap(ctx, r, team, kind)
  drawGoggles(ctx, r, 0, 0, 1)
  // 闭着的眼睛（两道弧）+ 圆嘴
  ctx.strokeStyle = '#2b2b2b'
  ctx.lineWidth = Math.max(1, r * 0.1)
  for (const d of [-1, 1] as const) {
    ctx.beginPath()
    ctx.arc(r * 0.3, d * r * 0.42, r * 0.16, Math.PI * 0.15, Math.PI * 0.85)
    ctx.stroke()
  }
  ctx.fillStyle = '#c0392b'
  circle(ctx, r * (kind === 'duck' ? 0.35 : 0.72), 0, r * 0.11)
  ctx.fill()
}
