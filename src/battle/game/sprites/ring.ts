/**
 * 打怪兽的舞台道具（需求 M8 / M10）：场馆背景与灯架、浅透视的拳台（台面、裙边、四根角柱、三根围绳）、聚光灯光柱、
 * 观众剪影（荧光棒）、锣、血条与第几只的小圆点、星星、命中的冲击环。都是代码画的矢量卡通，没有字。
 */
import type { Team } from '@/battle/protocol'
import { ellipse, gradient, withAlpha } from '../engine/draw'

export const TEAM_COLOR: Record<Team, { main: string; dark: string; light: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', light: '#ffd3d3' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', light: '#d2e8ff' },
}
/** Boss 那边的中立角柱 */
export const NEUTRAL_POST = '#ffc93c'

/** 一座拳台的形状：台面前沿 / 后沿的左右 x 与 y、裙边下沿、角柱高（前排 / 后排）、线宽基准 */
export interface RingShape {
  fx0: number
  fx1: number
  bx0: number
  bx1: number
  frontY: number
  backY: number
  apronY: number
  postH: number
  backPostH: number
  k: number
}

/** 围绳离台面的高度（占角柱高的比例），从下往上三根 */
export const ROPE_LEVELS = [0.32, 0.6, 0.88] as const

/** 场馆背景：上深下浅的渐变，台子后面透一团柔和的灯光色 */
export function drawBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number, horizonY: number, light: string): void {
  ctx.fillStyle = gradient(ctx, 0, 0, 0, H, [
    [0, '#1f1a40'],
    [Math.min(0.95, Math.max(0.2, horizonY / H)), '#45336e'],
    [1, '#2e2452'],
  ])
  ctx.fillRect(0, 0, W, H)
  const r = Math.max(W, H) * 0.6
  const g = ctx.createRadialGradient(W / 2, horizonY, 0, W / 2, horizonY, r)
  g.addColorStop(0, light)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  withAlpha(ctx, 0.2, () => {
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  })
}

/** 后面的看台：几排深色台阶（观众坐在最前面那排） */
export function drawStands(ctx: CanvasRenderingContext2D, x0: number, x1: number, top: number, bottom: number): void {
  const rows = 3
  const h = (bottom - top) / rows
  for (let i = 0; i < rows; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2a2150' : '#251d49'
    ctx.fillRect(x0, top + i * h, x1 - x0, h + 0.5)
  }
}

/** 头顶的灯架：一根横梁 + 几盏灯（灯罩朝下） */
export function drawTruss(ctx: CanvasRenderingContext2D, W: number, y: number, h: number, lamps: readonly number[], light: string): void {
  ctx.fillStyle = '#16122c'
  ctx.fillRect(0, y, W, h)
  ctx.strokeStyle = '#3b3466'
  ctx.lineWidth = Math.max(1, h * 0.12)
  ctx.beginPath()
  const step = h * 1.6
  for (let x = 0; x < W; x += step) {
    ctx.moveTo(x, y)
    ctx.lineTo(x + step / 2, y + h)
    ctx.lineTo(x + step, y)
  }
  ctx.stroke()
  for (const lx of lamps) {
    ctx.fillStyle = '#2a2448'
    ctx.beginPath()
    ctx.moveTo(lx - h * 0.9, y + h * 0.6)
    ctx.lineTo(lx + h * 0.9, y + h * 0.6)
    ctx.lineTo(lx + h * 0.6, y + h * 1.9)
    ctx.lineTo(lx - h * 0.6, y + h * 1.9)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = light
    ellipse(ctx, lx, y + h * 1.9, h * 0.62, h * 0.24)
    ctx.fill()
  }
}

/** 一道聚光灯光柱：从灯口 (lx, ly) 照到 (tx, ty)，灯口宽 w0、落地宽 w1，越往下越淡 */
export function drawBeam(
  ctx: CanvasRenderingContext2D,
  lx: number,
  ly: number,
  tx: number,
  ty: number,
  w0: number,
  w1: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0.005) return
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = gradient(ctx, lx, ly, tx, ty, [
      [0, color],
      [1, 'rgba(255,255,255,0)'],
    ])
    ctx.beginPath()
    ctx.moveTo(lx - w0 / 2, ly)
    ctx.lineTo(lx + w0 / 2, ly)
    ctx.lineTo(tx + w1 / 2, ty)
    ctx.lineTo(tx - w1 / 2, ty)
    ctx.closePath()
    ctx.fill()
  })
}

/** 台面上的光斑 */
export function drawLightPool(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color: string, alpha: number): void {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = color
    ellipse(ctx, x, y, rx, ry)
    ctx.fill()
  })
}

/** 拳台：台面（浅透视梯形）、中间的大星星、前面的裙边（带小星点） */
export function drawRingFloor(ctx: CanvasRenderingContext2D, r: RingShape, light: string): void {
  const lw = Math.max(1.5, r.k * 2.2)
  // 裙边
  ctx.fillStyle = gradient(ctx, 0, r.frontY, 0, r.apronY, [
    [0, '#4468e0'],
    [1, '#2c46a8'],
  ])
  ctx.fillRect(r.fx0, r.frontY, r.fx1 - r.fx0, r.apronY - r.frontY)
  ctx.fillStyle = '#ffd95a'
  ctx.beginPath()
  const apH = r.apronY - r.frontY
  const dot = Math.max(1.2, apH * 0.12)
  const gap = Math.max(dot * 6, 14)
  for (let x = r.fx0 + gap / 2; x < r.fx1; x += gap) {
    starShape(ctx, x, r.frontY + apH * 0.55, dot * 1.6, -Math.PI / 2)
  }
  ctx.fill()
  // 台面
  ctx.fillStyle = gradient(ctx, 0, r.backY, 0, r.frontY, [
    [0, '#e6dccb'],
    [1, '#f7f0e3'],
  ])
  ctx.beginPath()
  ctx.moveTo(r.bx0, r.backY)
  ctx.lineTo(r.bx1, r.backY)
  ctx.lineTo(r.fx1, r.frontY)
  ctx.lineTo(r.fx0, r.frontY)
  ctx.closePath()
  ctx.fill()
  // 灯光打在台面上
  const cx = (r.fx0 + r.fx1) / 2
  const cy = (r.backY + r.frontY) / 2
  drawLightPool(ctx, cx, cy, (r.fx1 - r.fx0) * 0.36, (r.frontY - r.backY) * 0.42, light, 0.35)
  // 台面中间一颗淡淡的大星星
  withAlpha(ctx, 0.18, () => {
    ctx.fillStyle = '#ff9f6b'
    ctx.beginPath()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.32)
    starShape(ctx, 0, 0, (r.frontY - r.backY) * 1.25, -Math.PI / 2)
    ctx.restore()
    ctx.fill()
  })
  // 台面前沿的包边
  ctx.strokeStyle = '#fff6e6'
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(r.fx0, r.frontY)
  ctx.lineTo(r.fx1, r.frontY)
  ctx.stroke()
}

/** 一根角柱：底在 (x, y)、高 h、粗 w，护垫是队色（左红、右蓝、Boss 那边中立黄） */
function post(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, w: number, color: string): void {
  ctx.fillStyle = '#d9d4e6'
  ctx.fillRect(x - w / 2, y - h, w, h)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x - w * 0.8, y - h * 0.94, w * 1.6, h * 0.78, w * 0.5)
  ctx.fill()
  ctx.strokeStyle = 'rgba(40,20,60,0.45)'
  ctx.lineWidth = Math.max(1, w * 0.18)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillRect(x - w * 0.55, y - h * 0.9, w * 0.3, h * 0.7)
}

/** 后排两根角柱（画在观众前、角色后） */
export function drawBackPosts(ctx: CanvasRenderingContext2D, r: RingShape): void {
  const w = Math.max(3, r.k * 5)
  post(ctx, r.bx0, r.backY, r.backPostH, w * 0.8, NEUTRAL_POST)
  post(ctx, r.bx1, r.backY, r.backPostH, w * 0.8, NEUTRAL_POST)
}

/** 前排两根角柱：左红、右蓝 */
export function drawFrontPosts(ctx: CanvasRenderingContext2D, r: RingShape): void {
  const w = Math.max(3.5, r.k * 6)
  post(ctx, r.fx0, r.frontY + (r.apronY - r.frontY) * 0.3, r.postH, w, TEAM_COLOR.red.main)
  post(ctx, r.fx1, r.frontY + (r.apronY - r.frontY) * 0.3, r.postH, w, TEAM_COLOR.blue.main)
}

/**
 * 围绳：后面三根（两根后柱之间）+ 左右两侧各三根（后柱连到前柱）；前面不拉绳，免得挡住角色。
 * bounce[i] 是第 i 根后绳中间被撞出去的量（px，正 = 往下 / 往后弹），侧绳跟着晃一半
 */
export function drawRopes(ctx: CanvasRenderingContext2D, r: RingShape, bounce: readonly number[]): void {
  const lw = Math.max(1.5, r.k * 2.4)
  const frontBase = r.frontY + (r.apronY - r.frontY) * 0.3
  ctx.lineCap = 'round'
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? 'rgba(60,30,80,0.45)' : '#fff4f8'
    ctx.lineWidth = pass === 0 ? lw * 1.8 : lw
    ctx.beginPath()
    ROPE_LEVELS.forEach((lv, i) => {
      const b = bounce[i] ?? 0
      const by = r.backY - r.backPostH * lv
      const fy = frontBase - r.postH * lv
      const sag = r.k * 2 + b
      const off = pass === 0 ? lw * 0.6 : 0
      ctx.moveTo(r.bx0, by + off)
      ctx.quadraticCurveTo((r.bx0 + r.bx1) / 2, by + sag * 2 + off, r.bx1, by + off)
      ctx.moveTo(r.bx0, by + off)
      ctx.quadraticCurveTo((r.bx0 + r.fx0) / 2 - b * 0.3, (by + fy) / 2 + r.k * 1.5 + b * 0.5 + off, r.fx0, fy + off)
      ctx.moveTo(r.bx1, by + off)
      ctx.quadraticCurveTo((r.bx1 + r.fx1) / 2 + b * 0.3, (by + fy) / 2 + r.k * 1.5 + b * 0.5 + off, r.fx1, fy + off)
    })
    ctx.stroke()
  }
}

/** 一个观众剪影（坐着 / 站起来）与他举的荧光棒 */
export interface Fan {
  x: number
  /** 肩膀的 y（坐着时）；站起来往上抬 lift */
  y: number
  /** 头的半径 */
  r: number
  lift: number
  /** 荧光棒的颜色序号与摆角（弧度），手举多高 0…1 */
  stick: number
  swing: number
  up: number
  /** 深浅两种剪影色：0 / 1 */
  tone: number
  /** 耳朵：0 没有、1 圆耳朵、2 尖耳朵、3 长耳朵（观众也是小动物） */
  ears: number
}

const FAN_TONES = ['#4b3a7e', '#5a468f'] as const
export const STICK_COLORS = ['#7df9ff', '#ff7ad9', '#fff27a'] as const

/** 观众：同色的身子 / 头 / 荧光棒各并成一条路径画（几十个人也只有十来次填充） */
export function drawCrowd(ctx: CanvasRenderingContext2D, fans: readonly Fan[], glow: boolean): void {
  if (fans.length === 0) return
  for (let tone = 0; tone < FAN_TONES.length; tone++) {
    ctx.fillStyle = FAN_TONES[tone]!
    ctx.beginPath()
    for (const f of fans) {
      if (f.tone !== tone) continue
      const y = f.y - f.lift
      ctx.moveTo(f.x + f.r * 1.5, y + f.r * 1.4)
      ctx.ellipse(f.x, y + f.r * 1.4, f.r * 1.5, f.r * 1.5, 0, 0, Math.PI * 2)
      const hy = y - f.r * 0.25
      ctx.moveTo(f.x + f.r, hy)
      ctx.arc(f.x, hy, f.r, 0, Math.PI * 2)
      if (f.ears === 1) {
        for (const sd of [-1, 1]) {
          ctx.moveTo(f.x + sd * f.r * 0.7 + f.r * 0.38, hy - f.r * 0.72)
          ctx.arc(f.x + sd * f.r * 0.7, hy - f.r * 0.72, f.r * 0.38, 0, Math.PI * 2)
        }
      } else if (f.ears === 2) {
        for (const sd of [-1, 1]) {
          ctx.moveTo(f.x + sd * f.r * 0.25, hy - f.r * 0.8)
          ctx.lineTo(f.x + sd * f.r * 0.85, hy - f.r * 1.35)
          ctx.lineTo(f.x + sd * f.r * 0.95, hy - f.r * 0.35)
        }
      } else if (f.ears === 3) {
        for (const sd of [-1, 1]) {
          ctx.moveTo(f.x + sd * f.r * 0.38 + f.r * 0.24, hy - f.r * 1.3)
          ctx.ellipse(f.x + sd * f.r * 0.38, hy - f.r * 1.3, f.r * 0.24, f.r * 0.62, sd * 0.2, 0, Math.PI * 2)
        }
      }
    }
    ctx.fill()
  }
  ctx.lineCap = 'round'
  for (let c = 0; c < STICK_COLORS.length; c++) {
    ctx.beginPath()
    let any = false
    for (const f of fans) {
      if (f.stick !== c || f.up <= 0.05) continue
      any = true
      const y = f.y - f.lift
      const hx = f.x + f.r * 1.1
      const hy = y + f.r * (0.9 - 1.3 * f.up)
      const len = f.r * 1.5
      ctx.moveTo(hx, hy)
      ctx.lineTo(hx + Math.sin(f.swing) * len, hy - Math.cos(f.swing) * len)
    }
    if (!any) continue
    if (glow) {
      ctx.strokeStyle = STICK_COLORS[c]!
      ctx.globalAlpha = 0.28
      ctx.lineWidth = Math.max(3, fans[0]!.r * 0.9)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.strokeStyle = STICK_COLORS[c]!
    ctx.lineWidth = Math.max(1.5, fans[0]!.r * 0.34)
    ctx.stroke()
  }
}

/** 锣架（不动的部分）：两根柱子 + 横梁，锣挂在 (x, y)，半径 r */
export function drawGongStand(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, floorY: number): void {
  ctx.strokeStyle = '#6b4a2e'
  ctx.lineWidth = Math.max(2, r * 0.18)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - r * 1.25, floorY)
  ctx.lineTo(x - r * 1.25, y - r * 1.35)
  ctx.lineTo(x + r * 1.25, y - r * 1.35)
  ctx.lineTo(x + r * 1.25, floorY)
  ctx.stroke()
}

/** 锣：挂绳 + 金色圆盘（swing 是摆角，glow 是被敲时的光） */
export function drawGong(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, swing: number, glow: number): void {
  const top = y - r * 1.35
  const gx = x + Math.sin(swing) * r * 0.9
  const gy = y - (1 - Math.cos(swing)) * r * 0.9
  ctx.strokeStyle = '#3d2c1e'
  ctx.lineWidth = Math.max(1, r * 0.08)
  ctx.beginPath()
  ctx.moveTo(x - r * 0.5, top)
  ctx.lineTo(gx - r * 0.45, gy - r * 0.85)
  ctx.moveTo(x + r * 0.5, top)
  ctx.lineTo(gx + r * 0.45, gy - r * 0.85)
  ctx.stroke()
  if (glow > 0.02) {
    withAlpha(ctx, Math.min(0.35, glow * 0.35), () => {
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.arc(gx, gy, r * 1.6, 0, Math.PI * 2)
      ctx.fill()
    })
  }
  ctx.fillStyle = '#e8a93a'
  ctx.strokeStyle = '#8a5a14'
  ctx.lineWidth = Math.max(1, r * 0.1)
  ctx.beginPath()
  ctx.arc(gx, gy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ffd36b'
  ctx.beginPath()
  ctx.arc(gx, gy, r * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#e8a93a'
  ctx.beginPath()
  ctx.arc(gx, gy, r * 0.22, 0, Math.PI * 2)
  ctx.fill()
}

/** 血条的颜色（按第几只：绿 / 橙 / 紫 / 金，和 Boss 的颜色一样） */
export interface HpLook {
  fill: string
  dark: string
}

/**
 * 血条：深色槽 + 白描边、按血量填色、刚掉的那一截先留一段浅色（一会儿再缩回去）、一分一格的分隔线
 * （格子太细时每 5 / 10 分一条）。hp 是显示的血量（带补间，可以是小数），ghost ≥ hp 是刚掉的那一截，
 * refill 0…1 是新 Boss 上场时从空涨满，flash 是被打中时填色部分闪一下（只在血条里，亮度 ≤ 35%）
 */
export function drawHpBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  hp: number,
  ghost: number,
  max: number,
  look: HpLook,
  refill: number,
  flash: number,
): void {
  const r = h / 2
  const m = Math.max(1, max)
  const cap = m * Math.max(0, Math.min(1, refill))
  ctx.fillStyle = '#241b3d'
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  const gw = (w * Math.min(cap, Math.max(0, ghost))) / m
  if (gw > 0.5) {
    ctx.fillStyle = '#fff1b8'
    ctx.beginPath()
    ctx.roundRect(x, y, Math.max(h, gw), h, r)
    ctx.fill()
  }
  const fw = (w * Math.min(cap, Math.max(0, hp))) / m
  if (fw > 0.5) {
    ctx.fillStyle = gradient(ctx, 0, y, 0, y + h, [
      [0, look.fill],
      [1, look.dark],
    ])
    ctx.beginPath()
    ctx.roundRect(x, y, Math.max(h, fw), h, r)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(x + r * 0.6, y + h * 0.16, Math.max(0, Math.max(h, fw) - r * 1.2), h * 0.18)
    if (flash > 0.02) {
      withAlpha(ctx, Math.min(0.35, flash * 0.35), () => {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(x, y, Math.max(h, fw), h, r)
        ctx.fill()
      })
    }
  }
  // 分隔线：一分一格；格子太窄就每 5 / 10 / 50 分一条（还是一格一格往下掉，只是线少画几条）
  const every = hpTickEvery(m, w)
  if (m > 1) {
    const cell = w / m
    ctx.strokeStyle = 'rgba(20,10,40,0.38)'
    ctx.lineWidth = Math.max(1, Math.min(2, cell * every * 0.12))
    ctx.beginPath()
    for (let i = every; i < m; i += every) {
      const lx = x + cell * i
      ctx.moveTo(lx, y + h * 0.2)
      ctx.lineTo(lx, y + h * 0.8)
    }
    ctx.stroke()
  }
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = Math.max(1.5, h * 0.14)
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.stroke()
}

/** 血条每几分画一条分隔线：一分一格；格子窄于 4 px 时每 5 / 10 / 50 分一条 */
export function hpTickEvery(max: number, w: number): number {
  const cell = w / Math.max(1, max)
  for (const n of [1, 5, 10, 50]) if (cell * n >= 4) return n
  return 50
}

/** 第几只的小圆点：前面打倒过的是金点，当前这只是 Boss 颜色的圈（最多画 6 个） */
export function drawLevelDots(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, level: number, color: string): void {
  const n = Math.max(1, Math.min(6, level))
  const gap = r * 2.7
  if (n > 1) {
    ctx.fillStyle = '#ffd24a'
    ctx.beginPath()
    for (let i = 0; i < n - 1; i++) {
      ctx.moveTo(x + i * gap + r, y)
      ctx.arc(x + i * gap, y, r, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  const cx = x + (n - 1) * gap
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(cx, y, r * 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(cx, y, r * 0.75, 0, Math.PI * 2)
  ctx.fill()
}

/** 五角星的轮廓（只加子路径，不 beginPath / fill：好几颗同色的星星并成一次填充） */
export function starShape(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number): void {
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.46
    const a = rot + (Math.PI / 5) * i
    const px = x + rr * Math.cos(a)
    const py = y + rr * Math.sin(a)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

/** 命中处的冲击环 + 放射线：q 0…1 从小到大再淡掉；color 是环的颜色（合力拳是金色） */
export function drawImpact(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, q: number, color: string): void {
  if (q <= 0 || q >= 1) return
  const k = 1 - q
  withAlpha(ctx, Math.min(0.85, k * 1.1), () => {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1.5, r * 0.16 * k)
    ctx.beginPath()
    ctx.arc(x, y, r * (0.35 + 0.85 * q), 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(1, r * 0.1 * k)
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + 0.3
      const r0 = r * (0.7 + 0.8 * q)
      const r1 = r0 + r * 0.45 * k
      ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0)
      ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1)
    }
    ctx.stroke()
  })
}

/**
 * 合力拳击掌 / 打倒后碰拳（M4 / M9）：两个人举起来的拳头之间一道金色的弧，从两头往中间长（grow 0…1），在最高处 (cx, cy)
 * 碰上的那一刻闪一下（flash 0…1：一颗四角星 + 淡淡一圈光，光的亮度 ≤ 35%，只在这一小块，光敏安全），alpha 整体淡出
 */
export function drawLink(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  grow: number,
  flash: number,
  alpha: number,
  k: number,
): void {
  if (alpha <= 0.02) return
  // 过 (cx, cy) 的二次曲线：控制点 = 2 × 顶点 − 两端的中点；从两头各画到 s 处（de Casteljau 截一段）
  const px = 2 * cx - (ax + bx) / 2
  const py = 2 * cy - (ay + by) / 2
  const s = Math.max(0, Math.min(1, grow)) * 0.5
  const at = (t: number): [number, number] => {
    const u = 1 - t
    return [u * u * ax + 2 * u * t * px + t * t * bx, u * u * ay + 2 * u * t * py + t * t * by]
  }
  withAlpha(ctx, alpha, () => {
    if (s > 0.01) {
      const [e1x, e1y] = at(s)
      const [e2x, e2y] = at(1 - s)
      ctx.strokeStyle = '#ffd24a'
      ctx.lineCap = 'round'
      ctx.lineWidth = Math.max(2, k * 3.2)
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.quadraticCurveTo(ax + (px - ax) * s, ay + (py - ay) * s, e1x, e1y)
      ctx.moveTo(bx, by)
      ctx.quadraticCurveTo(bx + (px - bx) * s, by + (py - by) * s, e2x, e2y)
      ctx.stroke()
    }
    if (flash > 0.02) {
      const r = Math.max(6, k * 14) * (0.6 + 0.4 * flash)
      withAlpha(ctx, Math.min(0.35, flash * 0.35), () => {
        ctx.fillStyle = '#fff3b0'
        ctx.beginPath()
        ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.fillStyle = '#ffe98a'
      ctx.beginPath()
      ctx.moveTo(cx, cy - r)
      ctx.quadraticCurveTo(cx, cy, cx + r, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy + r)
      ctx.quadraticCurveTo(cx, cy, cx - r, cy)
      ctx.quadraticCurveTo(cx, cy, cx, cy - r)
      ctx.fill()
    }
  })
}
