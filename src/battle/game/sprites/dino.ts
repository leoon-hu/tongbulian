/**
 * 捣蛋龙（需求 M8）：一只充气霸王龙玩具——圆鼓鼓的不倒翁底座、肚子上三圈靶子、短小的前爪、大脑袋、一排圆圆的软牙、
 * 背上几块软刺、尾巴、背着装满星星的布袋。链上的样子：第 1 只绿色、第 2 只橙色戴泡沫头盔、第 3 只紫色戴纸王冠、
 * 第 4 只起金色闪光。原点在底座着地点，s 是身高（到头顶），本地朝右画、朝左时镜像；整只按单位坐标画（缩放 s）。
 */
import { withAlpha } from '../engine/draw'
import { clamp01, lerp } from '../engine/tween'

export interface DinoLook {
  /** 1 绿、2 橙（头盔）、3 紫（王冠）、4 金（闪光） */
  tier: 1 | 2 | 3 | 4
  body: string
  /** 底座 / 脚的深一号颜色 */
  shade: string
  belly: string
  /** 描边色 */
  line: string
  spike: string
  /** 这只 Boss 上场时的灯光色（M10：每只换一种） */
  light: string
  hat: 'none' | 'helmet' | 'crown'
  shine: boolean
  /** 身高相对基准（第 3 只 = 1）：第 1 只是小个子 */
  scale: number
}

const LOOKS: readonly DinoLook[] = [
  {
    tier: 1,
    body: '#7fd66b',
    shade: '#5cb84b',
    belly: '#e4f8d0',
    line: '#2f6b2a',
    spike: '#ffd45c',
    light: '#a8ffb4',
    hat: 'none',
    shine: false,
    scale: 0.86,
  },
  {
    tier: 2,
    body: '#ffa24c',
    shade: '#e8822a',
    belly: '#ffe7c8',
    line: '#8a4312',
    spike: '#ffe066',
    light: '#ffc98f',
    hat: 'helmet',
    shine: false,
    scale: 0.93,
  },
  {
    tier: 3,
    body: '#a57ef0',
    shade: '#8661d8',
    belly: '#eee5ff',
    line: '#4b2f8a',
    spike: '#7fe0c9',
    light: '#dcc0ff',
    hat: 'crown',
    shine: false,
    scale: 1,
  },
  {
    tier: 4,
    body: '#ffcf3f',
    shade: '#f0b21e',
    belly: '#fff5cc',
    line: '#8a5d00',
    spike: '#ff9b6b',
    light: '#ffe68a',
    hat: 'none',
    shine: true,
    scale: 1.03,
  },
]

/** 第 level 只的样子（第 4 只起都是金色的） */
export function dinoLook(level: number): DinoLook {
  return LOOKS[Math.max(1, Math.min(4, Math.floor(level) || 1)) - 1]!
}

/** 肚子（不倒翁）中心离脚下多高、半径（单位 = 身高）：打歪了绕这里转 */
export const DINO_BELLY_Y = 0.34
export const DINO_BELLY_R = 0.34
/** 靶心（拳头打这里）相对脚下的位置 */
export const DINO_TARGET = { x: 0.06, y: -0.37 } as const
/** 布袋（星星从这里迸出来）：在背后那一侧 */
export const DINO_SACK = { x: -0.3, y: -0.6 } as const
/** 嘴（吼的声波从这里出去、泡泡从这里吹出来） */
export const DINO_MOUTH = { x: 0.27, y: -0.74 } as const
/** 扔果冻球的那只手（背后那只）：伸进布袋里掏 / 举过头顶往前扔 */
export const DINO_HAND_SACK = { x: -0.3, y: -0.62 } as const
export const DINO_HAND_UP = { x: 0.2, y: -1.12 } as const
/** 占地：朝前（鼻子、小爪）/ 朝后（尾巴）各伸出多远，头顶多高（不算帽子），戴帽子时的头顶 */
export const DINO_FRONT = 0.42
export const DINO_BACK = 0.58
export const DINO_TOP = 1.07
export function dinoTop(look: DinoLook): number {
  return look.hat === 'crown' ? 1.14 : look.hat === 'helmet' ? 1.12 : DINO_TOP
}

export interface DinoPose {
  /** 鼻子朝哪边：1 右、−1 左 */
  facing: 1 | -1
  /** 不倒翁：绕肚子中心转（弧度，正 = 顺时针 = 往右倒） */
  tilt: number
  /** 挤压（以脚下为基准）：肚子被打扁 sx > 1、sy < 1 */
  sx: number
  sy: number
  /** 转身（0…1 = 一整圈，画成水平翻转） */
  spin: number
  blink: number
  /** 眯眼（被打中） */
  squint: number
  /** 咯咯笑 */
  happy: number
  /** 蚊香眼 */
  dizzy: number
  /** 吐舌头 */
  tongue: number
  /** 嘴张成 o（泄气、吃惊） */
  gasp: number
  /** 挤一只眼（做鬼脸） */
  wink: number
  /** 眼珠往哪边看 −1…1（相对朝向，1 = 朝前） */
  look: number
  /** 手：叉腰 / 挥手 / 举起 / 乱挥 的权重 0…1，beat 是摆的相位；grab 背后那只手伸进布袋、toss 举过头顶往前扔（扔果冻球） */
  hips: number
  grab: number
  toss: number
  /** 张大嘴吼 0…1 */
  roar: number
  wave: number
  up: number
  flail: number
  beat: number
  /** 尾巴摆动（单位 = 身高） */
  tail: number
  sweat: number
  /** 泄气 0…1：身上起皱、背刺耷拉 */
  deflate: number
  /** 一屁股坐下 0…1：两只脚伸到前面翘起来 */
  sit: number
  /** 头盔歪（弧度）、掉下来 0…1（1 = 已经不在头上） */
  helmetTilt: number
  helmetOff: number
  /** 布袋鼓一下 0…1 */
  sackPuff: number
  /** 金色闪光的时钟（秒） */
  glint: number
  alpha: number
  /** 画简化版（退场乱飞、缩小的时候看不清细节） */
  lite: boolean
}

export const DINO_REST: Readonly<DinoPose> = Object.freeze({
  facing: 1,
  tilt: 0,
  sx: 1,
  sy: 1,
  spin: 0,
  blink: 0,
  squint: 0,
  happy: 0,
  dizzy: 0,
  tongue: 0,
  gasp: 0,
  wink: 0,
  look: 0,
  hips: 0,
  grab: 0,
  toss: 0,
  roar: 0,
  wave: 0,
  up: 0,
  flail: 0,
  beat: 0,
  tail: 0,
  sweat: 0,
  deflate: 0,
  sit: 0,
  helmetTilt: 0,
  helmetOff: 0,
  sackPuff: 0,
  glint: 0,
  alpha: 1,
  lite: false,
})

type Pt = [number, number]

/** 身高小于这么多像素就画简化版 */
export const LITE_BELOW = 70

/** 先粗描边再填色（描边一半被盖住，重叠处的线也被盖掉），路径已建好 */
function outlineFill(ctx: CanvasRenderingContext2D, line: string, lw: number, fill: string): void {
  ctx.strokeStyle = line
  ctx.lineWidth = lw * 2
  ctx.stroke()
  ctx.fillStyle = fill
  ctx.fill()
}

/**
 * 画一只捣蛋龙：(x, y) 是底座着地点，s 身高。变换：先绕肚子中心转（不倒翁），再按脚下挤压、朝向镜像（转身时按 cos 翻）
 */
export function drawDino(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, look: DinoLook, p: DinoPose): void {
  if (p.alpha <= 0.01 || s <= 1) return
  ctx.save()
  if (p.alpha < 1) ctx.globalAlpha *= p.alpha
  ctx.translate(x, y - DINO_BELLY_Y * s)
  if (p.tilt) ctx.rotate(p.tilt)
  const turn = Math.cos(p.spin * Math.PI * 2)
  const flip = p.facing * (Math.abs(turn) < 0.06 ? (turn < 0 ? -0.06 : 0.06) : turn)
  ctx.scale(s * flip * p.sx, s * p.sy)
  ctx.translate(0, DINO_BELLY_Y)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const lw = Math.max(1.2, 0.022 * s) / s
  const d = clamp01(p.deflate)
  // 画得很小时（缩成一小只蹦走、很窄的舞台）省掉看不清的细节：牙、鼻孔、腮红、布袋的扎口、靶心最里一圈
  const lite = p.lite || s < LITE_BELOW
  tail(ctx, look, lw, p.tail, d)
  sack(ctx, lw, p.sackPuff, lite)
  spikes(ctx, look, lw, d)
  body(ctx, look, lw, d, clamp01(p.sit), lite)
  arms(ctx, look, lw, p)
  head(ctx, look, lw, p, lite)
  if (look.hat === 'helmet' && p.helmetOff < 1) helmet(ctx, lw, p.helmetTilt, p.helmetOff)
  if (look.hat === 'crown') crown(ctx, look, lw)
  if (look.shine) shine(ctx, p.glint)
  if (p.sweat > 0.03) sweat(ctx, lw, p.sweat)
  ctx.restore()
}

function tail(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, wag: number, d: number): void {
  const tipX = -0.54 + d * 0.1
  const tipY = -0.24 + wag + d * 0.08
  ctx.beginPath()
  ctx.moveTo(-0.2, -0.42)
  ctx.quadraticCurveTo(-0.44, -0.42 + wag * 0.5, tipX, tipY)
  ctx.quadraticCurveTo(-0.42, -0.16 + wag * 0.4, -0.18, -0.12)
  ctx.closePath()
  outlineFill(ctx, look.line, lw, look.body)
}

/** 背上的星星布袋（鼓一下时胀大一点）：直接按坐标画，不另外套变换 */
function sack(ctx: CanvasRenderingContext2D, lw: number, puff: number, lite: boolean): void {
  const k = 1 + clamp01(puff) * 0.2
  const x = DINO_SACK.x
  const y = DINO_SACK.y
  ctx.beginPath()
  ctx.moveTo(x - 0.02 * k, y - 0.16 * k)
  ctx.bezierCurveTo(x - 0.24 * k, y - 0.08 * k, x - 0.16 * k, y + 0.19 * k, x + 0.03 * k, y + 0.16 * k)
  ctx.bezierCurveTo(x + 0.2 * k, y + 0.13 * k, x + 0.18 * k, y - 0.12 * k, x + 0.08 * k, y - 0.17 * k)
  ctx.closePath()
  outlineFill(ctx, '#7a4e24', lw, '#cf9d5c')
  if (lite) return
  // 扎口 + 布袋上缝的一颗星（小圆补丁）
  ctx.fillStyle = '#a8723a'
  ctx.beginPath()
  ctx.ellipse(x + 0.03 * k, y - 0.165 * k, 0.07 * k, 0.032 * k, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffd24a'
  ctx.beginPath()
  ctx.arc(x - 0.02 * k, y + 0.03 * k, 0.045 * k, 0, Math.PI * 2)
  ctx.fill()
}

/** 背上的软刺：头后面三块、背上两块（泄气时耷拉） */
function spikes(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, d: number): void {
  const h = 0.09 * (1 - d * 0.6)
  const w = 0.085
  // 贴在椭圆 (cx, cy, rx, ry) 的参数角 a 处：底边沿切线、尖朝外法线（泄气时尖往下垂一点）
  const on = (cx: number, cy: number, rx: number, ry: number, a: number): void => {
    const px = cx + rx * Math.cos(a)
    const py = cy + ry * Math.sin(a)
    let nx = Math.cos(a) / rx
    let ny = Math.sin(a) / ry
    const n = Math.hypot(nx, ny) || 1
    nx /= n
    ny /= n
    const tx = -ny * w * 0.5
    const ty = nx * w * 0.5
    ctx.moveTo(px - tx, py - ty)
    ctx.lineTo(px + nx * h, py + ny * h + d * 0.04)
    ctx.lineTo(px + tx, py + ty)
  }
  ctx.beginPath()
  for (const a of [-1.85, -2.35, -2.8]) on(0.05, -0.83, 0.25, 0.2, a)
  for (const a of [-2.75, 3.05]) on(0.03, -0.6, 0.25, 0.2, a)
  outlineFill(ctx, look.line, lw, look.spike)
}

function body(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, d: number, sit: number, lite: boolean): void {
  ctx.beginPath()
  ctx.arc(0, -DINO_BELLY_Y, DINO_BELLY_R, 0, Math.PI * 2)
  ctx.moveTo(0.28, -0.6)
  ctx.ellipse(0.03, -0.6, 0.25, 0.2, 0, 0, Math.PI * 2)
  outlineFill(ctx, look.line, lw, look.body)
  // 不倒翁的底座：压重的深色一圈
  ctx.fillStyle = look.shade
  ctx.beginPath()
  ctx.arc(0, -DINO_BELLY_Y, DINO_BELLY_R, 0.5, Math.PI - 0.5)
  ctx.closePath()
  ctx.fill()
  // 浅色肚皮 + 三圈靶子
  ctx.fillStyle = look.belly
  ctx.beginPath()
  ctx.ellipse(0.05, -0.4, 0.22, 0.25, 0, 0, Math.PI * 2)
  ctx.fill()
  const tx = DINO_TARGET.x
  const ty = DINO_TARGET.y
  ctx.fillStyle = '#ff6b6b'
  ctx.beginPath()
  ctx.arc(tx, ty, 0.165, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = look.line
  ctx.lineWidth = lw
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(tx, ty, 0.11, 0, Math.PI * 2)
  ctx.fill()
  if (!lite) {
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.arc(tx, ty, 0.055, 0, Math.PI * 2)
    ctx.fill()
  }
  // 泄气：身上起皱
  if (d > 0.12) {
    withAlpha(ctx, clamp01((d - 0.12) * 2), () => {
      ctx.strokeStyle = look.line
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(-0.26, -0.5)
      ctx.quadraticCurveTo(-0.18, -0.44, -0.24, -0.36)
      ctx.moveTo(0.22, -0.2)
      ctx.quadraticCurveTo(0.28, -0.13, 0.2, -0.07)
      ctx.moveTo(-0.12, -0.12)
      ctx.quadraticCurveTo(-0.04, -0.08, -0.1, -0.03)
      ctx.stroke()
    })
  }
  // 两只小脚（坐下时伸到前面、脚底朝前翘起来）
  const feet: [number, number][] = [
    [lerp(-0.1, 0.2, sit), lerp(-0.02, -0.07, sit)],
    [lerp(0.17, 0.36, sit), lerp(-0.02, -0.12, sit)],
  ]
  ctx.beginPath()
  for (const [fx, fy] of feet) {
    ctx.moveTo(fx + 0.085, fy)
    ctx.ellipse(fx, fy, 0.085, 0.045 + sit * 0.02, -sit * 0.9, 0, Math.PI * 2)
  }
  outlineFill(ctx, look.line, lw, look.shade)
}

function arms(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, p: DinoPose): void {
  const b = p.beat
  const list: [Pt, Pt, Pt][] = [
    [
      [-0.17, -0.6],
      [-0.25, -0.56],
      [-0.2, -0.47],
    ],
    [
      [0.24, -0.6],
      [0.33, -0.6],
      [0.33, -0.49],
    ],
  ]
  const blend = (i: number, w: number, e: Pt, h: Pt): void => {
    if (w <= 0) return
    const k = clamp01(w)
    const a = list[i]!
    a[1] = [lerp(a[1][0], e[0], k), lerp(a[1][1], e[1], k)]
    a[2] = [lerp(a[2][0], h[0], k), lerp(a[2][1], h[1], k)]
  }
  blend(0, p.hips, [-0.37, -0.55], [-0.31, -0.42])
  blend(1, p.hips, [0.41, -0.57], [0.35, -0.44])
  blend(0, p.up, [-0.3, -0.72], [-0.3 + Math.sin(b) * 0.03, -0.86])
  blend(1, p.up, [0.35, -0.73], [0.37 - Math.sin(b) * 0.03, -0.87])
  blend(1, p.wave, [0.37, -0.7], [0.4 + Math.sin(b) * 0.06, -0.85])
  blend(0, p.grab, [-0.33, -0.7], [DINO_HAND_SACK.x, DINO_HAND_SACK.y])
  blend(0, p.toss, [-0.05, -0.98], [DINO_HAND_UP.x, DINO_HAND_UP.y])
  if (p.flail > 0) {
    blend(0, p.flail, [-0.3, -0.66], [-0.28 + Math.cos(b * 1.3) * 0.08, -0.7 + Math.sin(b * 1.3) * 0.1])
    blend(1, p.flail, [0.36, -0.66], [0.36 + Math.cos(b * 1.3 + Math.PI) * 0.08, -0.7 + Math.sin(b * 1.3 + Math.PI) * 0.1])
  }
  const w = 0.075
  ctx.beginPath()
  for (const [s, e, h] of list) {
    ctx.moveTo(s[0], s[1])
    ctx.quadraticCurveTo(e[0], e[1], h[0], h[1])
  }
  ctx.strokeStyle = look.line
  ctx.lineWidth = w + lw * 2
  ctx.stroke()
  ctx.strokeStyle = look.body
  ctx.lineWidth = w
  ctx.stroke()
  ctx.beginPath()
  for (const [, , h] of list) {
    ctx.moveTo(h[0] + 0.045, h[1])
    ctx.arc(h[0], h[1], 0.045, 0, Math.PI * 2)
  }
  outlineFill(ctx, look.line, lw, look.body)
}

function head(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, p: DinoPose, lite: boolean): void {
  ctx.beginPath()
  ctx.ellipse(0.05, -0.83, 0.25, 0.2, 0, 0, Math.PI * 2)
  ctx.moveTo(0.41, -0.79)
  ctx.ellipse(0.25, -0.79, 0.16, 0.12, -0.08, 0, Math.PI * 2)
  outlineFill(ctx, look.line, lw, look.body)
  if (lite) {
    mouth(ctx, look, lw, p, true)
    eyes(ctx, look, lw, p)
    return
  }
  // 腮红
  ctx.fillStyle = 'rgba(255,120,150,0.45)'
  ctx.beginPath()
  ctx.ellipse(0.13, -0.755, 0.045, 0.025, 0, 0, Math.PI * 2)
  ctx.fill()
  // 鼻孔
  ctx.fillStyle = look.line
  ctx.beginPath()
  ctx.ellipse(0.3, -0.858, 0.016, 0.011, 0.3, 0, Math.PI * 2)
  ctx.moveTo(0.37, -0.846)
  ctx.ellipse(0.355, -0.846, 0.016, 0.011, 0.3, 0, Math.PI * 2)
  ctx.fill()
  mouth(ctx, look, lw, p, false)
  eyes(ctx, look, lw, p)
}

function mouth(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, p: DinoPose, lite: boolean): void {
  if (p.roar > 0.3) {
    // 张大嘴吼：上下两排软牙露出来、舌头
    const o = clamp01(p.roar)
    const cx = 0.235
    const cy = -0.735
    const ry = 0.05 + 0.045 * o
    ctx.fillStyle = '#7a2330'
    ctx.beginPath()
    ctx.ellipse(cx, cy, 0.15, ry, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = look.line
    ctx.lineWidth = lw
    ctx.stroke()
    if (lite) return
    ctx.fillStyle = '#ff8fb1'
    ctx.beginPath()
    ctx.ellipse(cx + 0.01, cy + ry * 0.55, 0.075, ry * 0.4, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    for (const [dx, up] of [
      [-0.07, 1],
      [0.0, 1],
      [0.07, 1],
      [-0.035, -1],
      [0.045, -1],
    ] as const) {
      const ty = cy - up * (ry * 0.82) + dx * 0.1
      ctx.moveTo(cx + dx + 0.02, ty)
      ctx.arc(cx + dx, ty, 0.02, 0, Math.PI * 2)
    }
    ctx.fill()
    return
  }
  if (p.gasp > 0.4) {
    ctx.fillStyle = '#7a2330'
    ctx.beginPath()
    ctx.ellipse(0.27, -0.725, 0.045, 0.06 * Math.min(1.3, p.gasp), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = look.line
    ctx.lineWidth = lw
    ctx.stroke()
    return
  }
  const open = 0.05 + clamp01(p.happy) * 0.05 + clamp01(p.tongue) * 0.02
  const x0 = 0.06
  const x1 = 0.38
  const y0 = -0.765
  const y1 = -0.775
  const upY = -0.73
  ctx.fillStyle = '#8a2f3a'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo(0.22, -0.7 - open, x1, y1)
  ctx.quadraticCurveTo(0.22, upY, x0, y0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = look.line
  ctx.lineWidth = lw
  ctx.stroke()
  if (lite) return
  // 圆圆的软牙：沿上唇一排
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    const u = 1 - t
    const tx = u * u * x1 + 2 * u * t * 0.22 + t * t * x0
    const ty = u * u * y1 + 2 * u * t * upY + t * t * y0 + 0.014
    ctx.moveTo(tx + 0.02, ty)
    ctx.arc(tx, ty, 0.02, 0, Math.PI * 2)
  }
  ctx.fill()
  if (p.tongue > 0.05) {
    const k = clamp01(p.tongue)
    ctx.fillStyle = '#ff8fb1'
    ctx.beginPath()
    ctx.ellipse(0.37 + 0.03 * k, -0.735 + 0.035 * k, 0.045, 0.07 * k, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
  }
}

function eyes(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number, p: DinoPose): void {
  const at: Pt[] = [
    [-0.03, -0.885],
    [0.14, -0.9],
  ]
  const r = 0.078
  const style = (i: number): 'spiral' | 'squint' | 'happy' | 'closed' | 'open' => {
    if (p.squint > 0.4) return 'squint'
    if (p.dizzy > 0.5) return 'spiral'
    if (p.happy > 0.45) return 'happy'
    if (p.wink > 0.5 && i === 1) return 'happy'
    if (p.blink > 0.5) return 'closed'
    return 'open'
  }
  const styles = [style(0), style(1)] as const
  // 蚊香眼也先画眼白
  const whites = at.filter((_, i) => styles[i] === 'spiral')
  if (whites.length) {
    ctx.beginPath()
    for (const [x, y] of whites) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = look.line
    ctx.lineWidth = lw * 1.4
    ctx.stroke()
  }
  // 睁着的眼：眼白（描边）→ 眼珠 → 高光
  const open = at.filter((_, i) => styles[i] === 'open')
  if (open.length) {
    ctx.beginPath()
    for (const [x, y] of open) {
      ctx.moveTo(x + r, y)
      ctx.arc(x, y, r, 0, Math.PI * 2)
    }
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = look.line
    ctx.lineWidth = lw * 1.4
    ctx.stroke()
    const pr = p.gasp > 0.4 ? r * 0.3 : r * 0.52
    const ox = 0.018 + p.look * 0.02
    ctx.fillStyle = '#2b2140'
    ctx.beginPath()
    for (const [x, y] of open) {
      ctx.moveTo(x + ox + pr, y + 0.006)
      ctx.arc(x + ox, y + 0.006, pr, 0, Math.PI * 2)
    }
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    for (const [x, y] of open) {
      ctx.moveTo(x + ox - pr * 0.3 + pr * 0.36, y - pr * 0.35)
      ctx.arc(x + ox - pr * 0.3, y - pr * 0.35, pr * 0.36, 0, Math.PI * 2)
    }
    ctx.fill()
  }
  // 其它眼形都是线条：一次描完（蚊香另外一次，细一点）
  ctx.strokeStyle = look.line
  ctx.lineWidth = lw * 1.6
  ctx.beginPath()
  let lines = false
  at.forEach(([x, y], i) => {
    const st = styles[i]
    if (st === 'open' || st === 'spiral') return
    lines = true
    if (st === 'closed') {
      ctx.moveTo(x - r * 0.7, y)
      ctx.quadraticCurveTo(x, y + r * 0.6, x + r * 0.7, y)
    } else if (st === 'happy') {
      ctx.moveTo(x - r * 0.7, y + r * 0.2)
      ctx.quadraticCurveTo(x, y - r * 0.8, x + r * 0.7, y + r * 0.2)
    } else if (st === 'squint') {
      // 左眼「>」右眼「<」
      const dx = i === 0 ? 1 : -1
      ctx.moveTo(x - dx * r * 0.6, y - r * 0.55)
      ctx.lineTo(x + dx * r * 0.5, y)
      ctx.lineTo(x - dx * r * 0.6, y + r * 0.55)
    }
  })
  if (lines) ctx.stroke()
  if (whites.length) {
    // 蚊香眼：从中心往外绕一圈半
    ctx.lineWidth = lw * 0.9
    ctx.beginPath()
    whites.forEach(([x, y], i) => {
      for (let k = 0; k <= 12; k++) {
        const a = (k / 12) * Math.PI * 3 + (i === 0 ? 0 : Math.PI)
        const rr = (r * 0.8 * k) / 12
        const px = x + Math.cos(a) * rr
        const py = y + Math.sin(a) * rr
        if (k === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
    })
    ctx.stroke()
  }
}

function helmet(ctx: CanvasRenderingContext2D, lw: number, tilt: number, off: number): void {
  const o = clamp01(off)
  ctx.save()
  ctx.translate(0.05 + o * 0.35, -0.99 + o * o * 0.95)
  ctx.rotate(tilt + o * 1.6)
  ctx.beginPath()
  ctx.moveTo(-0.21, 0)
  ctx.ellipse(0, 0, 0.21, 0.15, 0, Math.PI, Math.PI * 2)
  ctx.closePath()
  outlineFill(ctx, '#1f5f8a', lw, '#5ec8f2')
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(-0.03, -0.148)
  ctx.lineTo(0.03, -0.148)
  ctx.lineTo(0.04, 0)
  ctx.lineTo(-0.04, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(-0.235, -0.02, 0.47, 0.055, 0.027)
  outlineFill(ctx, '#1f5f8a', lw * 0.8, '#3aa7d8')
  ctx.restore()
}

function crown(ctx: CanvasRenderingContext2D, look: DinoLook, lw: number): void {
  const pts: Pt[] = [
    [-0.13, -0.975],
    [-0.15, -1.1],
    [-0.07, -1.03],
    [0.03, -1.14],
    [0.11, -1.03],
    [0.2, -1.1],
    [0.18, -0.975],
  ]
  ctx.beginPath()
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
  ctx.closePath()
  outlineFill(ctx, look.line, lw, '#ffd23f')
  ctx.fillStyle = '#ff6b8a'
  ctx.beginPath()
  for (const [x, y] of [
    [-0.08, -1.0],
    [0.03, -1.01],
    [0.14, -1.0],
  ] as const) {
    ctx.moveTo(x + 0.022, y)
    ctx.arc(x, y, 0.022, 0, Math.PI * 2)
  }
  ctx.fill()
}

/** 金色的那几只身上一闪一闪 */
function shine(ctx: CanvasRenderingContext2D, t: number): void {
  const spots: [number, number, number][] = [
    [-0.16, -0.5, 0],
    [0.22, -0.96, 1.7],
    [0.24, -0.24, 3.3],
  ]
  for (const [x, y, ph] of spots) {
    const a = Math.max(0, Math.sin(t * 3 + ph))
    if (a < 0.1) continue
    const r = 0.06 * (0.5 + a * 0.5)
    withAlpha(ctx, a, () => {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.quadraticCurveTo(x, y, x, y + r)
      ctx.quadraticCurveTo(x, y, x - r, y)
      ctx.quadraticCurveTo(x, y, x, y - r)
      ctx.fill()
    })
  }
}

function sweat(ctx: CanvasRenderingContext2D, lw: number, amount: number): void {
  withAlpha(ctx, clamp01(amount * 1.5), () => {
    ctx.fillStyle = '#8fd0ff'
    ctx.beginPath()
    for (const [x, y, k] of [
      [-0.22, -1.0, 1],
      [-0.29, -0.9, 0.75],
    ] as const) {
      const w = 0.03 * k
      ctx.moveTo(x, y - w * 2.2)
      ctx.quadraticCurveTo(x + w * 1.3, y, x, y + w)
      ctx.quadraticCurveTo(x - w * 1.3, y, x, y - w * 2.2)
    }
    ctx.fill()
    ctx.strokeStyle = '#3f8fc9'
    ctx.lineWidth = lw * 0.7
    ctx.stroke()
  })
}

/** 血条前面的小头像：圆牌里一个捣蛋龙的脑袋（第几只的颜色） */
export function drawDinoIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, look: DinoLook): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(r, r)
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2d2350'
  ctx.beginPath()
  ctx.arc(0, 0, 0.86, 0, Math.PI * 2)
  ctx.fill()
  const lw = Math.max(1, r * 0.08) / r
  // 头顶的软刺
  ctx.beginPath()
  ctx.moveTo(-0.5, -0.3)
  ctx.lineTo(-0.42, -0.72)
  ctx.lineTo(-0.2, -0.45)
  ctx.lineTo(-0.05, -0.8)
  ctx.lineTo(0.12, -0.45)
  outlineFill(ctx, look.line, lw, look.spike)
  // 脑袋 + 鼻子
  ctx.beginPath()
  ctx.ellipse(-0.08, 0.02, 0.56, 0.5, 0, 0, Math.PI * 2)
  ctx.moveTo(0.78, 0.18)
  ctx.ellipse(0.38, 0.18, 0.4, 0.3, 0, 0, Math.PI * 2)
  outlineFill(ctx, look.line, lw, look.body)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(-0.18, -0.12, 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2b2140'
  ctx.beginPath()
  ctx.arc(-0.13, -0.1, 0.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = look.line
  ctx.lineWidth = lw * 1.2
  ctx.beginPath()
  ctx.moveTo(0.02, 0.3)
  ctx.quadraticCurveTo(0.4, 0.5, 0.72, 0.28)
  ctx.stroke()
  ctx.restore()
}

/** 吼出来的声波：以嘴为中心一圈圈往两边扩出去的弧（每圈 r 半径、a 透明度），lw 线宽（px） */
export function drawRoarWaves(ctx: CanvasRenderingContext2D, x: number, y: number, rings: readonly { r: number; a: number }[], lw: number): void {
  ctx.strokeStyle = '#fff4c9'
  ctx.lineCap = 'round'
  for (const ring of rings) {
    if (ring.a <= 0.02 || ring.r <= 1) continue
    withAlpha(ctx, ring.a, () => {
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.arc(x, y, ring.r, -0.55, 0.55)
      ctx.moveTo(x + ring.r * Math.cos(Math.PI - 0.55), y + ring.r * Math.sin(Math.PI - 0.55))
      ctx.arc(x, y, ring.r, Math.PI - 0.55, Math.PI + 0.55)
      ctx.stroke()
    })
  }
}

/** 软果冻球：半透明的粉色一团 + 高光 + 里面两颗小气泡；sx / sy 是落地抖的时候压扁拉长 */
export function drawJelly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sx: number, sy: number, alpha: number): void {
  if (alpha <= 0.01 || r <= 0.5) return
  ctx.save()
  ctx.globalAlpha *= clamp01(alpha)
  ctx.translate(x, y)
  ctx.scale(sx, sy)
  ctx.fillStyle = 'rgba(255,120,190,0.82)'
  ctx.strokeStyle = '#c2417e'
  ctx.lineWidth = Math.max(1, r * 0.1)
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.36, -r * 0.38, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2)
  ctx.moveTo(r * 0.3 + r * 0.1, r * 0.2)
  ctx.arc(r * 0.3, r * 0.2, r * 0.1, 0, Math.PI * 2)
  ctx.moveTo(r * 0.02 + r * 0.07, r * 0.42)
  ctx.arc(r * 0.02, r * 0.42, r * 0.07, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/**
 * 第 3 只吹的泡泡（挡在肚子前）：几乎透明的一个圆 + 白边 + 一道彩虹色的反光（跟着 t 慢慢转）+ 高光。
 * 画在 Boss 前面，看得出拳头要先打破它
 */
export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, alpha: number): void {
  if (alpha <= 0.01 || r <= 0.5) return
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = 'rgba(170,230,255,0.34)'
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'
    ctx.lineWidth = Math.max(1.5, r * 0.07)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    const a = t * 0.8
    ctx.lineWidth = Math.max(1.5, r * 0.11)
    ctx.strokeStyle = 'rgba(255,130,210,0.8)'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.82, a, a + 1.2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(110,225,255,0.85)'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.82, a + 1.3, a + 2.3)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,240,120,0.75)'
    ctx.beginPath()
    ctx.arc(x, y, r * 0.82, a + 3.3, a + 4.1)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.4, y - r * 0.42, r * 0.2, r * 0.11, -0.7, 0, Math.PI * 2)
    ctx.fill()
  })
}
