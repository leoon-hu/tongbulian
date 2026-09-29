/**
 * 捣蛋龙的纯模型（需求 M8–M10）：快照 + 事件 + 时间 → 场景数据。
 * - 舞台按宽高自己排版：一起打一条道（一个拳手在 Boss 左边、两个红左蓝右夹着 Boss），各打各的两条道
 *   （宽舞台左右并排、Boss 靠中间；又高又窄的上下叠、红上蓝下），保证所有东西都在画面里；
 * - 每条道一只当前的 Boss（登场 / 待机 / 被打弹回 / store 发 taunt 才演的挑衅舞、吼、扔果冻球 / 第 3 只吹泡泡挡拳）+ 正在退场的几只
 *   （打倒：泄气乱飞 → 瘪瘪落地 → 缩小挥手蹦走），血条（补间 + 刚掉的那一截）；台上的拳手由动作片段驱动（moves.ts + engine/skeleton.ts：
 *   弹跳 / 蓄力 / 四种拳 / 挥空 / 庆祝与碰拳 / 击掌 / 被吼后仰 / 低头躲 / 秀肌肉 / 挥手 / 暂停时放下拳头），模型只管「现在放哪一段」
 *   和出拳那只手往哪儿打；观众、灯、锣、星星、粒子、合力拳的金色弧；
 * - 打击感：每条道一个顿帧 / 慢动作的时钟（TimeScale），全场一个镜头（Camera），减少动画时都关掉；四种拳的 Boss 反应各不相同
 *   （直拳倒一下、勾拳倒得狠还被推开、上勾拳离地弹起、旋风拳转半圈 + 镜头推近）；
 * - 多设备（M9 / M12）：台上最多 4 个人（每边 / 每条道最多前后两排），换人时新来的从台边跳上来、下台的往自己的座位那边跳过去淡出、
 *   其他人挪到新站位（Boss 和拳台不跟着跳：有人在台下时一直按每边 2 排留地方）；台下的人按 id 坐观众席前排的座位、举着自己
 *   小动物的牌子，他打中时从牌子里飞出能量拳，ENERGY_AT 秒打到肚子（紧凑版没有观众席，从这一队那边的舞台下角飞进来）；
 *   发表情时台下的举牌蹦一下、台上的挥手。
 * 快照先到、事件后到（同一次答题：setState → hit → bossDown → bossIn），所以血量变了不马上换 Boss，等 bossDown 的过场；
 * 等了一会儿还没有事件（晚进来 / 事件丢了）才直接换。不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { BossFighter, BossGameEvent, BossGameState, BossStage } from '@/battle/game/boss-contract'
import { ENERGY_AT, HIT_AT } from '@/battle/game/boss-contract'
import type { BossSide, PunchMove, TauntAct, TimedPhase, TimedVariant } from '@/battle/timed'
import { Camera } from '@/battle/game/engine/camera'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Blinker, Decay, advancePhase } from '@/battle/game/engine/rig'
import { Animator, sampleClip, type Pose } from '@/battle/game/engine/skeleton'
import { Spring } from '@/battle/game/engine/spring'
import { TimeScale } from '@/battle/game/engine/timescale'
import { clamp, clamp01, ease, lerp } from '@/battle/game/engine/tween'
import { boxerTop, type BoxerKind, type BoxerPose, type Glove } from '@/battle/game/sprites/boxer'
import {
  DINO_BACK,
  DINO_BELLY_Y,
  DINO_FRONT,
  DINO_HAND_SACK,
  DINO_HAND_UP,
  DINO_MOUTH,
  DINO_REST,
  DINO_SACK,
  dinoLook,
  dinoTop,
  type DinoLook,
  type DinoPose,
} from '@/battle/game/sprites/dino'
import { SEAT, SEAT_R, seatOrigin, signCenter, type EnergyFigure, type SeatFigure } from '@/battle/game/sprites/crowd'
import type { Fan, RingShape } from '@/battle/game/sprites/ring'
import {
  BOXER_REST,
  BUMP_CLIP_TIME,
  CHARGE_ADD,
  CHEER_CLIP_TIME,
  CLIPS,
  COIL_SPIN_TIME,
  FLEX_CLIP_TIME,
  MISS_CLIP_TIME,
  PRESS_ADD,
  PUNCH_TOTAL,
  TREMBLE_ADD,
  punchClip,
  type ClipName,
} from './moves'

// ———————————————————— 排版 ————————————————————

/** 一条道竖着要留多少个 u（最高的样子：第 3 只戴王冠）；拳手身高 = BOXER_K × u */
export const HEIGHT_K = 1.18
export const BOXER_K = 0.66
/** 最大的一只（金色）比基准大多少：横向占地按它算 */
const MAX_SCALE = 1.03
/** Boss 中心到拳手中心的距离（单位 u）：宽裕时站远一点、挤的时候凑近（拳头陷进肚子一点） */
export const REACH_MAX = 0.6
export const REACH_MIN = 0.38
/** 拳手身后占多宽（单位 = 拳手身高）、同一边第二个人往后站多远（单位 u） */
const FIGHTER_BACK = 0.24
const ROW_GAP = 0.3
/** 横着宽裕时第二排最多往后站多远（单位 u）：前后两排别挤成一团 */
const ROW_GAP_MAX = 0.5
/** 两条道时宽高比小于它就上下叠 */
export const STACK_ASPECT = 0.95

export interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export interface FighterSlot {
  id: string
  x: number
  /** 脚下的 y（第二排往后站、高一点） */
  y: number
  dir: 1 | -1
  row: number
  /** 第二排小一点（远） */
  scale: number
}

export interface BarGeo {
  x: number
  y: number
  w: number
  h: number
  iconX: number
  iconY: number
  iconR: number
  dotX: number
  dotY: number
  dotR: number
}

export interface LaneGeo {
  side: BossSide
  x0: number
  y0: number
  x1: number
  y1: number
  /** Boss 的基准身高（第 3 只 = u；第 1 只 0.86u） */
  u: number
  bossX: number
  floorY: number
  frontY: number
  backY: number
  /** Boss 的鼻子朝哪边（朝着它的拳手） */
  facing: 1 | -1
  boxerH: number
  reach: number
  slots: FighterSlot[]
  bar: BarGeo
  /** 这条道站在哪座拳台上（geo.rings 的下标） */
  ring: number
}

export interface Lamp {
  x: number
  y: number
  /** 照向哪条道（lanes 的下标） */
  lane: number
  /** 光柱落点相对 Boss 的偏移（px） */
  aim: number
}

export interface StageGeo {
  W: number
  H: number
  /** 宿主给的手机紧凑版标记 */
  compact: boolean
  /** 紧凑版或舞台很小：去掉观众、锣，灯不动 */
  small: boolean
  stacked: boolean
  /** 线宽基准（约舞台高 / 300） */
  k: number
  lanes: LaneGeo[]
  rings: RingShape[]
  /** 每座台子后沿之上那一片（观众站的地方，画的时候裁在这里面） */
  crowdBands: Box[]
  lamps: Lamp[]
  truss: { y: number; h: number } | null
  gong: { x: number; y: number; r: number; floorY: number } | null
  /**
   * 观众席的座位（M9）：每队 SEAT_MAX 个，第 k 个是从这一队那边（红左蓝右）往里数第 k 个；紧凑版 / 小舞台没有（空）。
   * seatShared：两队的座位在同一片观众区（红队第 i 个和蓝队第 j 个只要 i + j + 2 ≤ SEAT_MAX 就不重叠）
   */
  seats: Record<Team, SeatSpot[]>
  seatShared: boolean
}

export interface StageFighter {
  id: string
  team: Team
  kind: BoxerKind
}

export interface StageInput {
  variant: TimedVariant
  sides: readonly BossSide[]
  fighters: readonly StageFighter[]
  /**
   * 每一边（有人的）至少按几排留地方（多设备轮换上台时按 2：换人时 Boss 与拳台的大小不跟着人数跳）；不给 = 按实际人数
   */
  rows?: number
}

/** 观众席里的一个座位（台子后沿上，r 是头的半径；只有台下有真人时才坐人，M9） */
export interface SeatSpot {
  x: number
  y: number
  r: number
  /** 在哪一片观众区（geo.crowdBands 的下标） */
  band: number
}

/** 观众席最多几个座位：红队从左往里、蓝队从右往里（同一片观众区里两队合起来不超过这么多） */
export const SEAT_MAX = 10

interface Vertical {
  pad: number
  barH: number
  iconR: number
  hudTop: number
  hudBottom: number
  frontY: number
  backY: number
  floorY: number
  apronY: number
}

function vertical(y0: number, y1: number): Vertical {
  const h = y1 - y0
  const pad = Math.max(3, h * 0.022)
  const barH = clamp(h * 0.05, 8, 15)
  const iconR = barH * 0.95
  const hudTop = y0 + pad * 0.6
  const frontY = y1 - h * 0.06
  const matDepth = h * 0.1
  return {
    pad,
    barH,
    iconR,
    hudTop,
    hudBottom: hudTop + iconR * 2,
    frontY,
    backY: frontY - matDepth,
    floorY: frontY - matDepth * 0.42,
    apronY: y1,
  }
}

/** 这条道里谁站 Boss 左边、谁站右边，Boss 朝哪边 */
function groupsOf(side: BossSide, fs: readonly StageFighter[]): { left: StageFighter[]; right: StageFighter[]; facing: 1 | -1 } {
  if (side === 'red') return { left: [...fs], right: [], facing: -1 }
  if (side === 'blue') return { left: [], right: [...fs], facing: 1 }
  if (fs.length <= 1) return { left: [...fs], right: [], facing: -1 }
  let left = fs.filter((f) => f.team === 'red')
  let right = fs.filter((f) => f.team === 'blue')
  if (!left.length || !right.length) {
    left = fs.filter((_, i) => i % 2 === 0)
    right = fs.filter((_, i) => i % 2 === 1)
  }
  return { left, right, facing: -1 }
}

function laneLayout(side: BossSide, rect: Box, fs: readonly StageFighter[], mode: 'center' | 'toRight' | 'toLeft', coopBar: boolean, rows = 1): LaneGeo {
  const v = vertical(rect.y0, rect.y1)
  const laneW = rect.x1 - rect.x0
  const { left, right, facing } = groupsOf(side, fs)
  // 左右并排时靠中间那一侧只留一点缝（两只 Boss 背对背，尾巴快碰上）
  const padL = mode === 'toLeft' ? v.pad * 0.4 : v.pad
  const padR = mode === 'toRight' ? v.pad * 0.4 : v.pad
  const avail = laneW - padL - padR
  const back = FIGHTER_BACK * BOXER_K
  const bossLeft = (facing === -1 ? DINO_FRONT : DINO_BACK) * MAX_SCALE
  const bossRight = (facing === -1 ? DINO_BACK : DINO_FRONT) * MAX_SCALE
  // 有人的一边按几排留地方：实际人数，或者（多设备轮换时）至少 rows 排
  const two = (n: number): boolean => n > 1 || (n > 0 && rows > 1)
  const extent = (n: number, r: number, gap = ROW_GAP): number => (n > 0 ? r + (two(n) ? gap : 0) + back : 0)
  const wSum = (r: number): number => Math.max(bossLeft, extent(left.length, r)) + Math.max(bossRight, extent(right.length, r))
  const uH = Math.max(8, (v.floorY - v.hudBottom - v.pad * 0.3) / HEIGHT_K)
  let reach = REACH_MAX
  // 横着放不下时先让拳手凑近一点，还不够再整体缩小
  while (reach > REACH_MIN + 1e-9 && avail / wSum(reach) < uH) reach = Math.max(REACH_MIN, reach - 0.02)
  const u = Math.max(8, Math.min(uH, avail / wSum(reach)))
  // 横着还宽裕：第二排往后多站一点（最多 ROW_GAP_MAX），前后两排的脑袋不叠在一起
  const twoSides = (two(left.length) ? 1 : 0) + (two(right.length) ? 1 : 0)
  const rowGap = twoSides ? ROW_GAP + clamp((avail / u - wSum(reach)) / twoSides, 0, ROW_GAP_MAX - ROW_GAP) : ROW_GAP
  const wL = Math.max(bossLeft, extent(left.length, reach, rowGap))
  const wR = Math.max(bossRight, extent(right.length, reach, rowGap))
  const groupW = (wL + wR) * u
  // 靠中间：离中线留一点缝（舞台很宽时多留一点），但不挤出去
  const gap = Math.min(Math.max(padR, laneW * 0.05), Math.max(0, avail - groupW) + Math.min(padL, padR))
  let bossX: number
  if (mode === 'toRight') bossX = rect.x1 - Math.max(padR, gap) - wR * u
  else if (mode === 'toLeft') bossX = rect.x0 + Math.max(padL, gap) + wL * u
  else bossX = rect.x0 + padL + (avail - groupW) / 2 + wL * u
  const boxerH = BOXER_K * u
  const matDepth = v.frontY - v.backY
  const slots: FighterSlot[] = []
  const place = (list: StageFighter[], dir: 1 | -1): void => {
    list.forEach((f, i) => {
      const row = i === 0 ? 0 : 1
      const extra = i >= 2 ? (i - 1) * 0.12 : 0
      slots.push({
        id: f.id,
        x: bossX - dir * (reach + (row ? rowGap + extra : 0)) * u,
        y: v.floorY - (row ? matDepth * 0.35 : 0),
        dir,
        row,
        scale: row ? 0.9 : 1,
      })
    })
  }
  place(left, 1)
  place(right, -1)
  // 血条：一起打居中、宽一半；两条道各自占满那条道
  const gapB = Math.max(3, v.barH * 0.5)
  const maxW = laneW - v.pad * 2 - v.iconR * 2 - gapB
  const barW = Math.max(20, coopBar ? Math.min(maxW, Math.max(laneW * 0.5, 170)) : maxW)
  const hudW = v.iconR * 2 + gapB + barW
  const hx = rect.x0 + (laneW - hudW) / 2
  const iconY = v.hudTop + v.iconR
  const barY = iconY - v.iconR + v.iconR * 0.12
  const dotR = Math.max(2.5, v.barH * 0.3)
  const bar: BarGeo = {
    x: hx + v.iconR * 2 + gapB,
    y: barY,
    w: barW,
    h: v.barH,
    iconX: hx + v.iconR,
    iconY,
    iconR: v.iconR,
    dotX: hx + v.iconR * 2 + gapB + dotR,
    dotY: barY + v.barH + dotR + Math.max(1.5, v.pad * 0.4),
    dotR,
  }
  return {
    side,
    ...rect,
    u,
    bossX,
    floorY: v.floorY,
    frontY: v.frontY,
    backY: v.backY,
    facing,
    boxerH,
    reach,
    slots,
    bar,
    ring: 0,
  }
}

function ringFor(x0: number, x1: number, v: Vertical, boxerH: number, k: number): RingShape {
  const pad = Math.max(3, (x1 - x0) * 0.012)
  const skew = (v.frontY - v.backY) * 0.9
  return {
    fx0: x0 + pad,
    fx1: x1 - pad,
    bx0: x0 + pad + skew,
    bx1: x1 - pad - skew,
    frontY: v.frontY,
    backY: v.backY,
    apronY: v.apronY,
    postH: boxerH * 0.62,
    backPostH: boxerH * 0.5,
    k,
  }
}

/** 按舞台宽高、玩法、台上的拳手排版 */
export function layoutStage(W: number, H: number, compact: boolean, input: StageInput): StageGeo {
  const sides: BossSide[] = input.sides.length ? [...input.sides] : ['shared']
  const versus = sides.length >= 2
  const stacked = versus && W / H < STACK_ASPECT
  const small = compact || W < 300 || H < 200
  const k = Math.max(0.5, Math.min(W, H * 1.6) / 480)
  const rows = Math.max(1, input.rows ?? 1)
  const laneOfFighter = (f: StageFighter): BossSide => (versus ? (sides.includes(f.team) ? f.team : sides[0]!) : sides[0]!)
  const fightersOf = (side: BossSide): StageFighter[] => input.fighters.filter((f) => laneOfFighter(f) === side)
  const lanes: LaneGeo[] = []
  const rings: RingShape[] = []
  const crowdBands: Box[] = []
  if (!versus) {
    const lane = laneLayout(sides[0]!, { x0: 0, y0: 0, x1: W, y1: H }, fightersOf(sides[0]!), 'center', true, rows)
    lanes.push(lane)
    rings.push(ringFor(0, W, vertical(0, H), lane.boxerH, k))
  } else if (stacked) {
    sides.slice(0, 2).forEach((side, i) => {
      const rect = { x0: 0, y0: (H / 2) * i, x1: W, y1: (H / 2) * (i + 1) }
      const lane = laneLayout(side, rect, fightersOf(side), 'center', false, rows)
      lane.ring = i
      lanes.push(lane)
      rings.push(ringFor(0, W, vertical(rect.y0, rect.y1), lane.boxerH, k))
    })
  } else {
    sides.slice(0, 2).forEach((side, i) => {
      const rect = { x0: (W / 2) * i, y0: 0, x1: (W / 2) * (i + 1), y1: H }
      lanes.push(laneLayout(side, rect, fightersOf(side), i === 0 ? 'toRight' : 'toLeft', false, rows))
    })
    // 两条道一样大（按小的那个），再重新排一次站位
    const u = Math.min(...lanes.map((l) => l.u))
    for (const l of lanes) {
      if (l.u > u + 0.01) {
        const scaleDown = u / l.u
        const cx = l.bossX
        l.u = u
        l.boxerH = BOXER_K * u
        l.slots = l.slots.map((s) => ({ ...s, x: cx + (s.x - cx) * scaleDown }))
      }
      l.ring = 0
    }
    rings.push(ringFor(0, W, vertical(0, H), lanes[0]!.boxerH, k))
  }
  // 观众站在每座台子后沿之上那一片（上下叠时各是各的）
  if (!small) {
    rings.forEach((r, i) => {
      const top = stacked ? lanes[i]!.y0 : 0
      crowdBands.push({ x0: 0, y0: top, x1: W, y1: r.backY })
    })
  }
  const trussH = Math.max(5, H * 0.028)
  const truss = small || stacked ? null : { y: 0, h: trussH }
  const lamps: Lamp[] = []
  if (truss) {
    const xs = versus ? [0.1, 0.36, 0.64, 0.9] : [0.18, 0.5, 0.82]
    xs.forEach((fx) => {
      const x = W * fx
      const lane = versus ? (fx < 0.5 ? 0 : 1) : 0
      const l = lanes[lane]!
      lamps.push({ x, y: truss.y + truss.h * 1.9, lane, aim: (x - l.bossX) * 0.25 })
    })
  } else {
    // 紧凑版 / 小舞台：没有灯架，从画面上沿外面斜着照下来两道（不摆动）
    lanes.forEach((l, i) => {
      for (const sd of [-1, 1]) {
        const x = l.bossX + sd * Math.min((l.x1 - l.x0) * 0.42, l.u * 0.9)
        lamps.push({ x, y: l.y0 - 2, lane: i, aim: sd * l.u * 0.12 })
      }
    })
  }
  let gong: StageGeo['gong'] = null
  if (!small && !stacked) {
    const r0 = rings[0]!
    const r = Math.max(5, lanes[0]!.boxerH * 0.13)
    const x = Math.min(W - r * 1.6, r0.bx1 + r * 1.7)
    gong = { x, y: r0.backY - r0.backPostH * 0.95, r, floorY: r0.backY }
  }
  const seats = seatSpots(lanes, rings, crowdBands, gong, stacked, versus)
  return { W, H, compact, small, stacked, k, lanes, rings, crowdBands, lamps, truss, gong, seats, seatShared: !stacked }
}

/**
 * 观众席的座位（M9）：坐在剪影前排、台子后沿上；红队从左边往里、蓝队从右边往里一个挨一个（人少时都在两头，
 * 不被 Boss 和拳手挡住），右边让开锣。头的大小按拳手身高，放不下十个就一起缩小；牌子举到最高也不出观众区的上沿
 */
function seatSpots(
  lanes: readonly LaneGeo[],
  rings: readonly RingShape[],
  bands: readonly Box[],
  gong: StageGeo['gong'],
  stacked: boolean,
  versus: boolean,
): Record<Team, SeatSpot[]> {
  const out: Record<Team, SeatSpot[]> = { red: [], blue: [] }
  if (!bands.length) return out
  for (const team of ['red', 'blue'] as const) {
    const lane = (stacked && versus ? lanes.find((l) => l.side === team) : undefined) ?? lanes[0]!
    const bi = stacked ? lane.ring : 0
    const band = bands[bi]
    const ring = rings[bi]
    if (!band || !ring) continue
    const r0 = lane.boxerH * SEAT_R
    const margin = Math.max(3, r0 * 0.5)
    const x0 = band.x0 + margin
    let x1 = band.x1 - margin
    if (gong && bi === 0) x1 = Math.min(x1, gong.x - gong.r * 1.7)
    const pitch = Math.max(1, Math.min(r0 * SEAT.pitch, (x1 - x0) / SEAT_MAX))
    const room = ring.backY - band.y0 - 2
    const r = Math.max(0.5, Math.min(pitch / SEAT.pitch, room / (SEAT.top + SEAT.lift + SEAT.hop)))
    // 上下叠时各队一片观众区：从 Boss 背后那一边（拳手不在的那边）往里坐，不被自己队的拳手挡住
    const fromLeft = stacked && versus ? lane.facing === 1 : team === 'red'
    for (let k = 0; k < SEAT_MAX; k++) {
      out[team].push({ x: fromLeft ? x0 + pitch * (k + 0.5) : x1 - pitch * (k + 0.5), y: ring.backY, r, band: bi })
    }
  }
  return out
}

// ———————————————————— 时间与参数 ————————————————————

/** 从出拳到打中（秒）：定义在契约里（竞技场按它对齐「嘭」），这里转出去给测试用 */
export { HIT_AT }
/** 顿帧（M10）：直拳 40 ms、勾拳 60、上勾拳 80、旋风拳 120；打倒那一拳 250 ms + 0.6 秒的 0.3 倍慢动作 */
export const HITSTOP: Record<PunchMove, number> = { jab: 0.04, hook: 0.06, upper: 0.08, super: 0.12 }
/** 残影：往回取几个时刻的拳套（秒）——招式越重拖得越长 */
export const TRAIL: Record<PunchMove, readonly number[]> = {
  jab: [0.022, 0.044],
  hook: [0.02, 0.04, 0.06],
  upper: [0.02, 0.04, 0.06],
  super: [0.025, 0.05, 0.075, 0.1],
}
export const KO_STOP = 0.25
export const KO_SLOW = 0.3
export const KO_SLOW_TIME = 0.6
/** 命中轻震（px） */
const SHAKE: Record<PunchMove, number> = { jab: 1.5, hook: 2, upper: 2.5, super: 4 }
/** 一拳的全过程：出拳 → 命中 → 收回 → 回到弹跳站姿（M10 的时间线；按招式不同，片段在 moves.ts） */
export { PUNCH_TOTAL }
export const MISS_TIME = MISS_CLIP_TIME
export const CHEER_TIME = CHEER_CLIP_TIME
export const FLEX_TIME = FLEX_CLIP_TIME
/** 命中之后停多久才接着庆祝（打倒一只、合力拳击掌）：先让大家看清这一拳打到了 */
export const PUNCH_HOLD = 0.06
/** 旋风拳从连击第几题起（同 timed.ts 的 moveFor）：下一题就是它时，按键蓄力改成先转一圈（coil） */
export const SUPER_FROM = 5
/** 勾拳把 Boss 往侧后方推多远（单位 u，按分加一点）；上勾拳把 Boss 打得离地多高（单位 u）、重力（u / 秒²） */
export const HOOK_PUSH = 0.1
export const UPPER_HOP = 0.17
export const AIR_G = 7
/** Boss：从天而降、落地叉腰做鬼脸 */
export const DROP_TIME = 0.42
export const LAND_TIME = 0.75
/** 打倒的过场（画面时间）：往后仰 → 泄气乱飞 → 瘪瘪落地 → 缩小挥手 → 蹦出舞台 */
export const REEL_TIME = 0.16
export const FLY_TIME = 0.62
export const FLAT_TIME = 0.22
export const SMALL_TIME = 0.42
export const HOP_TIME = 0.55
/** 打倒后下一只多久（真实时间）开始往下掉：慢动作结束、上一只飞起来的时候（两只的过场部分重叠） */
export const KO_DROP_DELAY = 0.9
/** 减少动画：上一只缩小淡出、下一只直接出现 */
export const FADE_TIME = 0.45
export const POP_TIME = 0.25
/** 时间到：坐下 → 喘气 → 挥手 → 跑掉 */
export const SIT_TIME = 0.3
export const PANT_TIME = 1.5
export const BYE_TIME = 0.6
export const RUN_TIME = 0.9
/**
 * Boss 的表演（M8，只是表演）：store 发 taunt 事件才演（多久没被打中由 store 定，声音也由 store 按这些时刻放，
 * 收到事件的那一帧算 0）。挑衅舞 1.8 秒；吼：0.15 秒张嘴开吼、吼到 1.05 秒、1.2 秒收；
 * 果冻球：0.25 秒出手（「嗖」）、0.85 秒落到台面（「啪」）、抖两下慢慢淡掉，1.5 秒整个结束
 */
export const DANCE_TIME = 1.8
export const ROAR_OPEN = 0.15
export const ROAR_END = 1.05
export const ROAR_TIME = 1.2
export const JELLY_THROW = 0.25
export const JELLY_LAND = 0.85
export const JELLY_TIME = 1.5
/** 扔完 Boss 自己多久回到待机（球还在飞） */
export const JELLY_BOSS_TIME = 0.75
/** 被扔的那个拳手什么时候低头、什么时候抬起来（按果冻球的时钟） */
export const DUCK_FROM = 0.36
export const DUCK_TO = 1.0
/** 第 3 只（戴王冠）吹泡泡挡拳：上场 / 破了之后等几秒再吹、吹一个多久；拳头伸到命中时刻的几成时泡泡先破 */
export const BUBBLE_FIRST = [1.5, 3] as const
export const BUBBLE_AGAIN = [3, 5] as const
export const BUBBLE_BLOW = 1
export const BUBBLE_POP_AT = 0.6
/** 合力拳击掌 / 碰拳的金色弧：多久长好、什么时候闪、整个多久 */
export const LINK_GROW = [0.12, 0.32] as const
export const LINK_FLASH = 0.32
export const LINK_TIME = 1
/** 光敏安全（M10）：两次闪光至少隔这么久（一秒不超过 3 次），太挤的那一次只长弧、不闪 */
export const FLASH_GAP = 0.34
/** 快照里第几只变了、这么久还没等到 bossDown / bossIn 事件就直接换（真实时间） */
export const RECONCILE_WAIT = 0.2
/** 新 Boss 上场时血条从空涨满 */
export const REFILL_TIME = 0.5
/** 连击到第几题起头上冒一圈小火苗 */
export const FIRE_STREAK = 3
/** 旋风拳打得 Boss 转半圈再转回来 */
export const SPIN_TIME = 0.7
/** 打倒时布袋炸出几颗星星 */
export const KO_STARS = 12
export const STAR_CAP = 30
/** 一条道上同时退场的最多几只（连着打倒好几只时老的直接走掉，画面不挤、绘制调用有上限） */
export const OUTGOING_CAP = 2
/**
 * 多设备换人上下台（M9）：上台的从台边跳上来、下台的往观众席那边跳下去淡出、台上其他人挪到新位置（都按真实时间）；
 * 减少动画时上下台只是原地淡入淡出（FADE_SWAP），挪位置直接到
 */
export const ENTER_TIME = 0.5
export const LEAVE_TIME = 0.5
export const MOVE_TIME = 0.35
export const FADE_SWAP = 0.25
/** 从台上下来的人：跳到一半多时在座位上冒出来；冒出来 / 沉下去要多久 */
export const SEAT_RISE_DELAY = 0.3
export const SEAT_RISE_TIME = 0.25
/** 举牌：举起来、举着、放下（秒）；蹦一下多久、牌子晃多久 */
export const SIGN_UP = 0.1
export const SIGN_HOLD = 0.35
export const SIGN_DOWN = 0.3
export const SEAT_HOP_TIME = 0.45
export const SIGN_SHAKE_TIME = 0.7
/** 能量拳（M9）：从座位飞到 Boss 身上 = ENERGY_AT（契约）；拖尾往回取几个时刻（秒）；同时最多几个在飞（多的直接打到） */
export { ENERGY_AT }
export const ENERGY_TRAIL = [0.03, 0.06, 0.09] as const
export const ENERGY_CAP = 8
/** 命中那一团光多久淡掉；减少动画时 Boss 身上那团光在打到之后还亮多久 */
export const GLOW_TIME = 0.3
export const CALM_GLOW_TIME = 0.4

export interface DinoOptions {
  reducedMotion: boolean
}

// ———————————————————— Boss ————————————————————

export type DinoMode =
  | 'wait'
  | 'drop'
  | 'land'
  | 'idle'
  | 'dance'
  | 'roar'
  | 'jelly'
  | 'koWait'
  | 'reel'
  | 'fly'
  | 'flat'
  | 'small'
  | 'hop'
  | 'sit'
  | 'pant'
  | 'bye'
  | 'run'
  | 'fade'
  | 'gone'

export class DinoActor {
  look: DinoLook
  mode: DinoMode = 'idle'
  /** 在这个状态里过了多久（画面时间） */
  t = 0
  /** 相对站位的偏移（px）、额外缩放、透明度 */
  x = 0
  y = 0
  scale = 1
  alpha = 1
  /** 不倒翁（弧度）与肚子挤压（sy 减多少；负的 = 往上拉长，上勾拳打飞的时候） */
  readonly tilt = Spring.of(1.5, 0.22, 0, 1e-4)
  readonly squash = Spring.of(3.2, 0.3, 0, 1e-4)
  /** 勾拳 / 旋风拳把它往侧后方推出去一截再弹回来（px） */
  readonly push = Spring.of(2, 0.45, 0, 0.05)
  /** 上勾拳打得离地多高（px，往上为正）与竖直速度 */
  air = 0
  airV = 0
  /** 转身（0…1 一圈；画成水平翻转）与旋风拳打出来的转半圈还剩多久（秒） */
  spin = 0
  spinLeft = 0
  blink: Blinker
  readonly squint = new Decay(0.18)
  readonly giggle = new Decay(0.4)
  readonly sackPuff = new Decay(0.2)
  /** 做鬼脸（挥空后）、吐舌头、扭屁股的计时（−1 = 没在做） */
  faceT = -1
  tongueT = -1
  wiggleT = -1
  private gestureWait: number
  sway: number
  beat = 0
  /** 第 3 只吹的泡泡（M8）：没有 / 正在吹 / 挡在肚子前；这一段过了多久；还要等多久再吹 */
  bubble: 'none' | 'blow' | 'float' = 'none'
  bubbleT = 0
  bubbleWait: number
  /** 等上一只：打倒后多久往下掉（真实时间，−1 = 还没定） */
  dropIn = -1
  /** 掉下来的时长（有人在它掉下来之前就出拳：快点落地接这一拳） */
  dropDur = DROP_TIME
  /** 落地后直接坐下（时间到时还没掉下来的那只） */
  endAfterLand = false
  /** 往哪边被打倒的（1 = 往右飞） */
  koDir: 1 | -1 = 1
  /** 泄气乱飞的起点、瘪瘪落地的点（相对站位的偏移 px） */
  flyFrom = { x: 0, y: 0 }
  landAt = { x: 0, y: 0 }
  /** 离开时往哪边走（1 右 / −1 左） */
  exitDir: 1 | -1 = 1
  /** 头盔掉下来 0…1 */
  helmetOff = 0
  /** 这一只的血量比例（低于 1/3 冒汗、蚊香眼、动作变慢） */
  hpRatio = 1
  /** 这只身上的时钟（闪光、喘气） */
  clock = 0
  starsDropped = 0

  constructor(
    readonly level: number,
    private readonly rng: RNG,
  ) {
    this.look = dinoLook(level)
    this.blink = new Blinker(rng, 2.2, 4.5)
    this.gestureWait = 3 + rng.next() * 3
    this.sway = rng.next() * Math.PI * 2
    this.bubbleWait = lerp(BUBBLE_FIRST[0], BUBBLE_FIRST[1], rng.next())
  }

  /** 会吹泡泡（第 3 只，戴王冠的紫色） */
  get blower(): boolean {
    return this.look.hat === 'crown'
  }

  /** 泡泡挡在前面（正在吹的也算：一拳就破） */
  get shielded(): boolean {
    return this.bubble !== 'none'
  }

  /** 看得见（没在等、没走掉） */
  get visible(): boolean {
    return this.mode !== 'wait' && this.mode !== 'gone'
  }

  /** 还站在台上能挨打（被打倒 / 时间到之后的都不算） */
  get standing(): boolean {
    return this.mode === 'drop' || this.mode === 'land' || this.mode === 'idle' || this.mode === 'dance' || this.mode === 'roar' || this.mode === 'jelly'
  }

  get low(): boolean {
    return this.hpRatio < 1 / 3
  }

  setMode(mode: DinoMode): void {
    this.mode = mode
    this.t = 0
  }

  nextGesture(): void {
    this.gestureWait = 3 + this.rng.next() * 3
  }

  tickGesture(dt: number): 'tongue' | 'wiggle' | null {
    this.gestureWait -= dt
    if (this.gestureWait > 0) return null
    this.nextGesture()
    return this.rng.next() < 0.5 ? 'tongue' : 'wiggle'
  }
}

export class HpBar {
  max = 1
  level = 1
  /** 血条要去的血量、正在显示的血量（带补间）、刚掉的那一截 */
  target = 1
  shown = 1
  ghost = 1
  ghostHold = 0
  /** 新 Boss 上场从空涨满 0…1 */
  refill = 1
  readonly flash = new Decay(0.15)
  /** 拳头还在路上：等这么久再掉血（秒） */
  delay = 0
  private pending: number | null = null

  set(level: number, hp: number, max: number): void {
    this.level = level
    this.max = Math.max(1, max)
    this.target = this.shown = this.ghost = clamp(hp, 0, this.max)
    this.pending = null
    this.delay = 0
    this.refill = 1
  }

  /** 新的一只上场：血量从空涨到 hp */
  fresh(level: number, hp: number, max: number): void {
    this.set(level, hp, max)
    this.refill = 0
  }

  /** 拳头要这么久才打到（旋风拳慢一点）：正等着掉的那一截再多等一会儿 */
  wait(seconds: number): void {
    if (this.pending !== null) this.delay = Math.max(this.delay, seconds)
  }

  /** 快照来了新的血量；delay > 0 时等拳头打到再掉 */
  to(hp: number, delay: number): void {
    const v = clamp(hp, 0, this.max)
    if (delay > 0 && v < this.target) {
      this.pending = v
      this.delay = Math.max(this.delay, delay)
      return
    }
    this.apply(v)
  }

  private apply(v: number): void {
    if (v < this.target) {
      this.ghost = Math.max(this.ghost, this.shown)
      this.ghostHold = 0.35
      this.flash.kick(1)
    }
    this.target = v
  }

  step(dt: number): void {
    if (this.pending !== null) {
      this.delay -= dt
      if (this.delay <= 0) {
        const v = this.pending
        this.pending = null
        this.apply(v)
      }
    }
    const d = this.target - this.shown
    this.shown = Math.abs(d) < 0.004 ? this.target : this.shown + d * Math.min(1, dt * 16)
    if (this.ghost < this.shown) this.ghost = this.shown
    else if (this.ghost > this.shown) {
      if (this.ghostHold > 0) this.ghostHold -= dt
      else {
        const g = this.shown - this.ghost
        this.ghost = Math.abs(g) < 0.004 ? this.shown : this.ghost + g * Math.min(1, dt * 5)
      }
    }
    if (this.refill < 1) this.refill = Math.min(1, this.refill + dt / REFILL_TIME)
    this.flash.step(dt)
  }
}

// ———————————————————— 拳手 ————————————————————

export interface Punch {
  t: number
  /** 0 前手、1 后手 */
  arm: 0 | 1
  move: PunchMove
  points: number
  together: boolean
  hitAt: number
  impacted: boolean
  side: BossSide
  /** 这一拳把哪几只打倒了（bossDown 挂上来的，命中那一刻开始过场） */
  ko: DinoActor[]
  /** 合力拳的另一个人跟着挥的那一下：不命中、不算分 */
  echo: boolean
  /** 合力拳里跟着出拳的队友（命中时两人击掌） */
  mate: string | null
  /** 旋风拳是蓄好力（按键时已经转过一圈）直接冲出去的 */
  coiled: boolean
  /** 这一拳已经把泡泡打破了（第 3 只） */
  popped: boolean
  /** 命中的那一点（命中时记下，收拳时拳套还往那儿指） */
  target: { x: number; y: number } | null
  /** 第几次 step 的时候出的拳（同一批事件里的 bossDown 挂到这一拳上） */
  born: number
  /** 台下的人打的能量拳（M9）：哪一队、从哪边打过来（1 = 从左往右）、打在肚子上偏上偏下多少（单位 = Boss 身高） */
  energy?: { team: Team; dir: 1 | -1; dy: number }
}

/** 上下台 / 挪位置的一段（M9）：从 (x0, y0, b0, a0) 走到站位（下台是走到 (x1, y1, b1)、淡出），中间跳 hop 那么高 */
export interface Glide {
  kind: 'enter' | 'move' | 'leave'
  t: number
  dur: number
  x0: number
  y0: number
  b0: number
  a0: number
  x1: number
  y1: number
  b1: number
  hop: number
}

export class Fighter {
  team: Team
  kind: BoxerKind
  side: BossSide = 'shared'
  /** 站位（脚下）、面朝、第几排、远近缩放、身高 */
  x = 0
  y = 0
  dir: 1 | -1 = 1
  row = 0
  scale = 1
  b = 60
  input = ''
  /** 蓄了几格（0…3）、发光（平滑）、按一下抖一下 */
  charge = 0
  glow = 0
  readonly press = new Decay(0.1)
  punch: Punch | null = null
  /** 各段表演的计时（−1 = 没在做）：挥空、打倒一只后庆祝、被点一下、合力拳后击掌、擦鼻子 */
  missT = -1
  cheerT = -1
  pokeT = -1
  hiT = -1
  noseT = -1
  /** 被点一下：秀肌肉 / 挥手轮流（点了几次） */
  pokes = 0
  pokeKind: 'flex' | 'wave' = 'flex'
  /** 打倒一只时台上还有队友：跳起来和队友碰拳（不是一个人举双拳） */
  bumpCheer = false
  finish: 'cheer' | 'clap' | null = null
  finishT = 0
  /** 下一拳用哪只手 */
  arm: 0 | 1 = 0
  bounce: number
  blink: Blinker
  fire = 0
  streak = 0
  t = 0
  /** 动作片段的播放器（M13）与现在放的是哪一段 */
  readonly anim = new Animator(BOXER_REST)
  clipName: ClipName = 'idle'
  /** 最近一拳用的哪只手、往哪儿打（单位 = 身高、本地朝右）：收拳淡回站姿时拳头还往那儿收 */
  punchArm: 0 | 1 = 0
  aim = { x: 0.8, y: -0.55 }
  /** 最近一次打中是什么时候（模型的时钟；合力拳找「最近打中过的那个」队友） */
  lastHitAt = -1
  /** 还要多久擦一下鼻子（等题时偶尔一下） */
  noseWait: number
  /** 排版给的站位（x / y / b 是这一刻画在哪：上下台、挪位置时往这儿走） */
  homeX = 0
  homeY = 0
  homeB = 60
  /** 排过一次版了（之后再来的新人从台边跳上来） */
  placed = false
  /** 正在上台 / 挪位置 / 下台；上下台跳起来多高（px，影子不跟着）、透明度 */
  glide: Glide | null = null
  hopY = 0
  alpha = 1

  constructor(
    readonly id: string,
    team: Team,
    kind: BoxerKind,
    rng: RNG,
  ) {
    this.team = team
    this.kind = kind
    this.bounce = rng.next() * Math.PI * 2
    this.blink = new Blinker(rng, 2.5, 5)
    this.noseWait = 4 + rng.next() * 5
  }

  /** 正在按的内容变了（M9）：变长 = 蓄一格（最多 3）、变短 = 泄一格、清空 = 放下；每按一下拳套抖一下（叠加层） */
  syncInput(input: string, playing: boolean, animated = true): void {
    const old = this.input
    if (input === old) return
    this.input = input
    if (!playing || input === '') {
      this.charge = 0
      return
    }
    let kick = 1
    if (input.length > old.length) this.charge = Math.min(3, this.charge + 1)
    else if (input.length < old.length) {
      this.charge = Math.max(0, this.charge - 1)
      kick = 0.5
    }
    this.press.kick(kick)
    this.anim.trigger('press', PRESS_ADD, animated ? kick : 0)
  }
}

/** 果冻球（Boss 的表演，M8）：从布袋里掏出来 → 抛物线扔向一个拳手（他一低头躲开）→ 落在他身后的台面上抖两下、慢慢淡掉 */
export interface JellyBall {
  /** 谁扔的（被打倒 / 时间到坐下了还没扔出去就不扔了） */
  from: DinoActor
  /** 扔向谁（拳手 id；台上没人时是 null，落在 Boss 面前） */
  target: string | null
  /** 从收到 taunt 那一帧算起过了多久（真实时间：和 store 放的「嗖」「啪」对齐） */
  t: number
  launched: boolean
  landed: boolean
  /** 出手点、落点、在拳手头顶那一刻的高度（抛物线过这三点） */
  x0: number
  y0: number
  x1: number
  y1: number
  sf: number
  yf: number
  r: number
  /** 落地后压扁回弹 */
  readonly wob: Spring
}

/** 合力拳击掌 / 打倒后碰拳：两个拳手之间的金色弧 + 最高处一闪 */
export interface LinkFx {
  a: string
  b: string
  side: BossSide
  t: number
  flashed: boolean
  /** 离上一次闪光太近：这一道弧不闪（光敏安全） */
  quiet: boolean
}

/** 飞出来的星星（布袋里迸出来的） */
export interface StarBit {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  r: number
  age: number
  life: number
  color: string
  gravity: number
}

export interface ImpactFx {
  x: number
  y: number
  r: number
  t: number
  color: string
}

export interface CrowdFan extends Fan {
  baseY: number
  band: number
  phase: number
  /** 站起来还要站多久（秒） */
  standT: number
  /** 蹦一下 */
  hop: number
}

/** 观众席里的一个真人（M9）：按 id 稳定地坐一个座位，举着自己小动物的牌子 */
export interface Seat {
  id: string
  team: Team
  kind: BoxerKind
  /** 坐在 geo.seats[team] 的第几个（−1 = 座位满了，没画出来） */
  idx: number
  /** 在快照的 crowd 里（不在了就沉下去、沉完删掉；座位还给他留着） */
  here: boolean
  /** 冒出来 0…1；从台上下来的人要等一会儿（跳到一半多）才冒出来 */
  show: number
  wait: number
  /** 举牌、蹦一下、牌子晃的计时（−1 = 没在做） */
  liftT: number
  hopT: number
  shakeT: number
  /** 平时牌子跟着节奏轻轻晃的相位 */
  phase: number
}

/** 飞着的能量拳：这一拳（hitAt = ENERGY_AT）+ 从哪儿飞来、弧有多高（单位 u）、多大 */
export interface EnergyFist {
  id: string
  p: Punch
  x0: number
  y0: number
  arc: number
  r: number
}

/**
 * 一团光（能量拳打到的那一下 / 减少动画时 Boss 身上的光）：level 是这一刻的亮度（≤ peak ≤ 0.35），hold 秒内往 peak 走、
 * 之后往 0 走（rise / fall 每秒多少）。打到的那一下是闪光（一上来就亮，按 FLASH_GAP 限次数）；减少动画时的那团光慢慢亮、慢慢暗
 */
export interface GlowFx {
  side: BossSide
  x: number
  y: number
  r: number
  color: string
  level: number
  peak: number
  hold: number
  rise: number
  fall: number
  /** 减少动画时 Boss 身上那团慢慢亮、慢慢暗的光（不是闪光）；ring 是它外面那圈环的颜色 */
  calm: boolean
  ring?: string
}

export class LaneState {
  geo!: LaneGeo
  /** 当前（最新）的一只；wait 状态的还没上台 */
  boss: DinoActor | null = null
  /** 正在退场的（被打倒、时间到） */
  outgoing: DinoActor[] = []
  /** 最近一只被打倒的：下一只等它的过场 */
  pred: DinoActor | null = null
  readonly bar = new HpBar()
  stateLevel = 1
  stateHp = 1
  stateMax = 1
  /** 快照里第几只和画面不一样、在等事件（真实秒，−1 = 没在等） */
  pendingT = -1
  readonly time = new TimeScale()
  /** 这一帧画面里过去了多久（顿帧 / 慢动作换算过的）：这条道上的拳手收拳也按它 */
  wdt = 0
  lastPunch: Punch | null = null
  /** 最近是从哪边挨打的（Boss 眼珠往那边看） */
  lastFrom: 1 | -1 = -1
  /** 正在飞 / 落地抖的果冻球 */
  jelly: JellyBall | null = null

  constructor(readonly side: BossSide) {}
}

export type PokeTarget = { kind: 'boss'; side: BossSide } | { kind: 'fighter'; id: string } | { kind: 'gong' } | { kind: 'crowd'; id?: string }

const STAR_COLORS = ['#ffd24a', '#ffe98a', '#ffb347'] as const
/** 快照里的人 → 画成什么：机器人，或孩子选的小动物（没有就按队给一只） */
function kindOf(f: BossFighter): BoxerKind {
  return f.robot ? 'robot' : (f.avatar ?? (f.team === 'red' ? 'rabbit' : 'cat'))
}
const TEAM_GLOW: Record<Team, { main: string; light: string }> = {
  red: { main: '#ff6b6b', light: '#ffd3d3' },
  blue: { main: '#4aa3ff', light: '#d2e8ff' },
}
/** 几个能量拳同时飞：各走各的弧（单位 u）、打在肚子上偏上偏下一点（单位 = Boss 身高），不叠在一起 */
const ENERGY_ARC = [0.3, 0.46, 0.2, 0.56, 0.38] as const
const ENERGY_DY = [0, -0.08, 0.07, -0.13, 0.12] as const
const CONFETTI = ['#ff6b6b', '#4aa3ff', '#ffd24a', '#7df9ff', '#ff7ad9', '#ffffff'] as const

/** 扔果冻球那只手的动作（按表演开始后的秒数）：先伸进布袋掏 → 出手前一下举过头顶往前扔 → 慢慢放下 */
export function jellyArm(t: number): { grab: number; toss: number } {
  const t0 = JELLY_THROW - 0.07
  if (t < t0) return { grab: clamp01(t / 0.12), toss: 0 }
  if (t < JELLY_THROW) {
    const k = (t - t0) / 0.07
    return { grab: 1 - k, toss: k }
  }
  return { grab: 0, toss: t < 0.45 ? 1 : clamp01(1 - (t - 0.45) / 0.3) }
}

// ———————————————————— 模型 ————————————————————

export class DinoModel {
  geo: StageGeo
  lanes: LaneState[] = []
  fighters: Fighter[] = []
  readonly camera = new Camera(1.7)
  readonly particles: ParticlePool
  stars: StarBit[] = []
  impacts: ImpactFx[] = []
  crowd: CrowdFan[] = []
  /** 合力拳击掌 / 打倒后碰拳的金色弧 */
  links: LinkFx[] = []
  /** 每座台子三根后绳的弹簧（px） */
  ropes: Spring[][] = []
  readonly gongSwing = Spring.of(0.9, 0.12, 0, 1e-3)
  readonly gongGlow = new Decay(0.35)
  phase: TimedPhase = 'countdown'
  variant: TimedVariant = 'coop'
  lastTen = false
  /** 时间到之后（timeUp 事件或快照里 ended 等久了） */
  ended = false
  private endPending = -1
  time = 0
  /** 灯光摆动的相位（降级 1 级 / 紧凑版不动） */
  lightT = 0
  /** 最后 10 秒灯光呼吸的相位 */
  warm = 0
  quality = 0
  private steps = 0
  private hasState = false
  /** 暂停之后回来的倒数（store 继续前放 3-2-1）：不是新的一局，不复位 */
  private resuming = false
  private readonly trailPose: Pose = {}
  /** 正在下台的拳手（M9：往观众席那边跳下去、淡出；跳完就删） */
  leaving: Fighter[] = []
  /** 观众席里的真人（M9） */
  seats: Seat[] = []
  /** 飞着的能量拳、光 */
  energy: EnergyFist[] = []
  glows: GlowFx[] = []
  /** 台下的人（快照的 crowd，含没坐上座位的） */
  private crowdIds = new Set<string>()
  /** 座位按 id 留着（上台了也留着：回到观众席还坐原来那个；座位不够时才让出来） */
  private readonly reserve = new Map<string, { team: Team; idx: number }>()
  /** 每队台上的人的顺序（换人时新来的顶替走掉的那个位置，其他人不挪） */
  private readonly teamOrder: Record<Team, string[]> = { red: [], blue: [] }
  /** 每一边按几排留地方：多设备有人在台下 / 台上超过 2 个人就一直按 2 排（换人时 Boss 和拳台不跟着跳） */
  private rows = 1
  private energyCount = 0
  private crowdKey = ''
  /** 上一次（或已经排好的）击掌闪光在什么时候（模型的时钟） */
  private lastFlashAt = -9
  private geoVersion = 0
  private bgGeo = ''
  private W = 1000
  private H = 300
  private compact = false
  private signature = ''
  private input: StageInput = { variant: 'coop', sides: ['shared'], fighters: [] }
  private readonly rng: RNG
  private readonly opts: DinoOptions

  constructor(rng: RNG, opts: DinoOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(72, () => rng.next())
    this.camera.enabled = !opts.reducedMotion
    this.geo = layoutStage(this.W, this.H, false, this.input)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  laneOf(side: BossSide): LaneState | undefined {
    return this.lanes.find((l) => l.side === side)
  }

  fighter(id: string): Fighter | undefined {
    return this.fighters.find((f) => f.id === id)
  }

  /** 离屏背景的键：背景的几何变了（尺寸、台上的人数让拳台变了）或灯光色变了（换了一只 Boss）就要重画；只是换人不重画 */
  bgKey(): string {
    return `${this.geoVersion}|${this.lanes.map((l) => this.lightOf(l)).join('|')}`
  }

  lightOf(l: LaneState): string {
    return (l.boss ?? l.pred)?.look.light ?? dinoLook(1).light
  }

  // —— 排版 ——

  layout(W: number, H: number, compact: boolean): void {
    this.W = W
    this.H = H
    this.compact = compact
    // 换尺寸：大家直接到新位置（正在下台的不演了）
    this.leaving = []
    this.relayout(false)
  }

  /**
   * 重新排版。animate（快照里上台的人变了）：新来的从台边跳上来，其他人挪到新站位；否则（第一次、换尺寸）直接放好
   */
  private relayout(animate = false): void {
    this.geo = layoutStage(this.W, this.H, this.compact, this.input)
    const g = this.geo
    // 背景（场馆、看台、台面、灯架、锣架）只跟这些有关：换人时它们不变，就不重画离屏背景
    const bg = JSON.stringify([g.W, g.H, g.rings, g.crowdBands, g.truss, g.lamps.map((l) => l.x), g.gong])
    if (bg !== this.bgGeo) {
      this.bgGeo = bg
      this.geoVersion += 1
    }
    g.lanes.forEach((lg) => {
      const lane = this.laneOf(lg.side)
      if (lane) lane.geo = lg
    })
    for (const f of this.fighters) {
      const lg = g.lanes.find((l) => l.slots.some((s) => s.id === f.id))
      const slot = lg?.slots.find((s) => s.id === f.id)
      if (!lg || !slot) continue
      f.side = lg.side
      f.dir = slot.dir
      f.row = slot.row
      f.scale = slot.scale
      f.homeX = slot.x
      f.homeY = slot.y
      f.homeB = lg.boxerH * slot.scale
      if (!animate) {
        f.placed = true
        this.snap(f)
      } else if (!f.placed) {
        f.placed = true
        this.enter(f, lg)
      } else if (f.glide?.kind === 'enter') {
        // 还在往上跳：落到新的站位
      } else if (Math.abs(f.x - f.homeX) > 0.5 || Math.abs(f.y - f.homeY) > 0.5 || Math.abs(f.b - f.homeB) > 0.5 || f.alpha < 1) {
        if (this.animated) this.startGlide(f, 'move', MOVE_TIME, f.homeX, f.homeY, f.homeB, f.homeB * 0.12)
        else this.snap(f)
      }
    }
    this.ropes = g.rings.map((_, i) => this.ropes[i] ?? [0, 1, 2].map(() => Spring.of(2.4, 0.18, 0, 0.05)))
    this.makeCrowd()
  }

  private snap(f: Fighter): void {
    f.glide = null
    f.x = f.homeX
    f.y = f.homeY
    f.b = f.homeB
    f.hopY = 0
    f.alpha = 1
  }

  private startGlide(f: Fighter, kind: Glide['kind'], dur: number, x1: number, y1: number, b1: number, hop: number): void {
    f.glide = { kind, t: 0, dur: Math.max(0.01, dur), x0: f.x, y0: f.y, b0: f.b, a0: f.alpha, x1, y1, b1, hop }
  }

  /** 上台（M9）：从这一边台角外面、台子下面跳上来（减少动画：原地淡入） */
  private enter(f: Fighter, lg: LaneGeo): void {
    const ring = this.geo.rings[lg.ring] ?? this.geo.rings[0]
    if (!this.animated || !ring) {
      this.snap(f)
      f.alpha = 0
      this.startGlide(f, 'enter', FADE_SWAP, f.homeX, f.homeY, f.homeB, 0)
      return
    }
    f.x = f.dir === 1 ? ring.fx0 - f.homeB * 0.3 : ring.fx1 + f.homeB * 0.3
    f.y = ring.apronY + f.homeB * 0.05
    f.b = f.homeB
    f.alpha = 0
    // 跳多高：最多 0.3 个身高，而且跳到最高时头顶不碰到血条（矮舞台上跳得低一点）
    const room = f.homeY - boxerTop(f.kind) * f.homeB - (lg.bar.dotY + lg.bar.dotR * 2)
    this.startGlide(f, 'enter', ENTER_TIME, f.homeX, f.homeY, f.homeB, clamp(room, 0, f.homeB * 0.3))
  }

  /** 下台（M9）：还没打到的那一拳先打到；往自己在观众席的座位那边跳过去、变小淡出（没座位就从台角跳下去） */
  private leave(f: Fighter, animate: boolean): void {
    if (f.punch && !f.punch.impacted && !f.punch.echo) this.impact(f, f.punch)
    f.punch = null
    f.missT = -1
    f.pokeT = -1
    if (!animate) return
    if (!this.animated) {
      this.startGlide(f, 'leave', FADE_SWAP, f.x, f.y, f.b, 0)
    } else {
      const seat = this.seats.find((x) => x.id === f.id)
      const spot = seat && seat.idx >= 0 ? this.geo.seats[seat.team][seat.idx] : undefined
      const lg = this.laneOf(f.side)?.geo
      const ring = (lg ? this.geo.rings[lg.ring] : undefined) ?? this.geo.rings[0]
      if (spot) this.startGlide(f, 'leave', LEAVE_TIME, spot.x, spot.y + f.b * 0.18, f.b * 0.45, f.b * 0.4)
      else if (ring) this.startGlide(f, 'leave', LEAVE_TIME, f.dir === 1 ? ring.fx0 - f.b * 0.45 : ring.fx1 + f.b * 0.45, ring.apronY + f.b * 0.1, f.b, f.b * 0.3)
      else this.startGlide(f, 'leave', FADE_SWAP, f.x, f.y, f.b, 0)
    }
    this.leaving.push(f)
    if (this.leaving.length > 4) this.leaving.splice(0, this.leaving.length - 4)
  }

  /** 正在下台的又回来了：接着从现在的位置挪回站位 */
  private takeLeaving(id: string): Fighter | undefined {
    const i = this.leaving.findIndex((f) => f.id === id)
    if (i < 0) return undefined
    const f = this.leaving.splice(i, 1)[0]!
    f.glide = null
    f.hopY = 0
    return f
  }

  private stepGlide(f: Fighter, dt: number): void {
    const g = f.glide
    if (!g) return
    g.t += dt
    const q = clamp01(g.t / g.dur)
    const leave = g.kind === 'leave'
    const e = g.kind === 'move' ? ease.inOutSine(q) : leave ? q : ease.outQuad(q)
    f.x = lerp(g.x0, leave ? g.x1 : f.homeX, e)
    f.y = lerp(g.y0, leave ? g.y1 : f.homeY, e)
    f.b = lerp(g.b0, leave ? g.b1 : f.homeB, e)
    f.hopY = g.hop * Math.sin(Math.PI * q)
    f.alpha = g.kind === 'enter' ? lerp(g.a0, 1, clamp01(q / 0.4)) : leave ? g.a0 * (1 - clamp01((q - 0.35) / 0.65)) : lerp(g.a0, 1, q)
    if (q < 1) return
    f.glide = null
    f.hopY = 0
    if (leave) f.alpha = 0
    else this.snap(f)
  }

  /** 台上每队的顺序：留下的人位置不变，新来的顶替走掉的那个位置（前排走了就站前排），多出来的排在后面 */
  private stableOrder(list: readonly StageFighter[]): StageFighter[] {
    const out: StageFighter[] = []
    for (const team of ['red', 'blue'] as const) {
      const mine = list.filter((f) => f.team === team)
      const prev = this.teamOrder[team]
      const slots: (StageFighter | null)[] = prev.map((id) => mine.find((f) => f.id === id) ?? null)
      const fresh = mine.filter((f) => !prev.includes(f.id))
      for (let i = 0; i < slots.length && fresh.length; i++) if (!slots[i]) slots[i] = fresh.shift()!
      const ordered = [...slots.filter((f): f is StageFighter => f !== null), ...fresh]
      this.teamOrder[team] = ordered.map((f) => f.id)
      out.push(...ordered)
    }
    return out
  }

  private makeCrowd(): void {
    const g = this.geo
    // 观众区没变（换人时）：剪影留着，不重新随机
    const key = `${g.W}|${g.crowdBands.map((b, i) => `${b.x0},${b.y0},${b.x1},${b.y1},${g.rings[i]?.backY},${(g.lanes.find((l) => l.ring === i) ?? g.lanes[0])?.boxerH}`).join('|')}`
    if (key === this.crowdKey) return
    this.crowdKey = key
    this.crowd = []
    g.crowdBands.forEach((_band, bi) => {
      const ring = g.rings[bi]!
      const lane = g.lanes.find((l) => l.ring === bi) ?? g.lanes[0]!
      const r = Math.max(3, lane.boxerH * 0.095)
      const step = r * 3.3
      for (let x = r * 1.5, i = 0; x < g.W - r; x += step, i++) {
        const baseY = ring.backY - lane.boxerH * 0.2 + (i % 2) * r * 0.45
        this.crowd.push({
          x: x + (this.rng.next() - 0.5) * r * 0.8,
          y: baseY,
          baseY,
          r: r * (0.9 + this.rng.next() * 0.2),
          lift: 0,
          stick: i % 3,
          swing: 0,
          up: 0.6,
          tone: i % 2,
          ears: i % 4,
          band: bi,
          phase: this.rng.next() * Math.PI * 2,
          standT: 0,
          hop: 0,
        })
      }
    })
  }

  // —— 快照 ——

  setState(s: BossGameState): void {
    const prevPhase = this.phase
    const fresh = !this.hasState
    this.hasState = true
    this.variant = s.variant
    this.syncCrowd(s.crowd ?? [], fresh)
    this.syncStage(s)
    if (s.phase === 'countdown') {
      if (prevPhase === 'paused') this.resuming = true
      else if (!this.resuming && (fresh || prevPhase !== 'countdown')) this.reset(s)
    } else this.resuming = false
    this.phase = s.phase
    if (s.phase === 'paused' && prevPhase !== 'paused') this.quiet()
    this.lastTen = s.lastTen && s.phase !== 'countdown'
    const playing = s.phase === 'playing'
    for (const f of s.fighters) {
      const fi = this.fighter(f.id)
      if (!fi) continue
      fi.streak = f.streak
      fi.syncInput(f.input, playing, this.animated)
    }
    for (const st of s.bosses) this.syncBoss(st)
    if (s.phase === 'ended' && !this.ended && this.endPending < 0) this.endPending = 0
    if (s.phase !== 'ended') {
      this.endPending = -1
      if (this.ended && s.phase === 'playing') this.ended = false
    }
  }

  /**
   * 台下的人（M9）：按 id 坐一个座位（红队从左往里、蓝队从右往里），刚从台上下来的等一会儿再冒出来；
   * 不在台下了（上台了 / 走了）就沉下去，座位还给他留着
   */
  private syncCrowd(list: readonly BossFighter[], fresh: boolean): void {
    this.crowdIds = new Set(list.map((c) => c.id))
    for (const c of list) {
      const fromStage = !!this.fighter(c.id) || this.leaving.some((f) => f.id === c.id)
      let seat = this.seats.find((x) => x.id === c.id)
      if (!seat) {
        seat = { id: c.id, team: c.team, kind: kindOf(c), idx: -1, here: false, show: fresh ? 1 : 0, wait: 0, liftT: -1, hopT: -1, shakeT: -1, phase: this.rng.next() * Math.PI * 2 }
        this.seats.push(seat)
      }
      if (!seat.here) {
        seat.here = true
        seat.wait = fromStage && !fresh ? SEAT_RISE_DELAY : 0
      }
      if (seat.team !== c.team) {
        this.reserve.delete(c.id)
        seat.team = c.team
        seat.idx = -1
      }
      seat.kind = kindOf(c)
      if (seat.idx < 0) seat.idx = this.claimSeat(c.id, c.team)
    }
    for (const seat of this.seats) {
      if (this.crowdIds.has(seat.id)) continue
      seat.here = false
      seat.wait = 0
    }
  }

  /**
   * 给台下的人找个座位（M9）：他以前坐过的那个；不然这一队从边上往里第一个空的（同一片观众区里不能和另一队的撞上）；
   * 都满了就先让出这一队不在台下的人留着的座位、再让另一队的；还是没有就不画（能量拳从这一队那边飞来）
   */
  private claimSeat(id: string, team: Team): number {
    const mine = this.reserve.get(id)
    if (mine && mine.team === team) return mine.idx
    this.reserve.delete(id)
    const free = (): number => {
      const used = new Set<number>()
      let otherMax = -1
      for (const r of this.reserve.values()) {
        if (r.team === team) used.add(r.idx)
        else otherMax = Math.max(otherMax, r.idx)
      }
      const limit = this.geo.seatShared ? SEAT_MAX - otherMax - 1 : SEAT_MAX
      for (let k = 0; k < limit; k++) if (!used.has(k)) return k
      return -1
    }
    let k = free()
    if (k < 0) {
      this.releaseStale(team)
      k = free()
    }
    if (k < 0) {
      this.releaseStale(team === 'red' ? 'blue' : 'red')
      k = free()
    }
    if (k >= 0) this.reserve.set(id, { team, idx: k })
    return k
  }

  /** 让出这一队不在台下的人留着的座位（还看得见的——正在沉下去的——先不让，免得两个人叠在一个座位上） */
  private releaseStale(team: Team): void {
    for (const [id, r] of this.reserve) {
      if (r.team !== team || this.crowdIds.has(id)) continue
      if (this.seats.some((x) => x.id === id && x.show > 0)) continue
      this.reserve.delete(id)
    }
  }

  /** 拳手 / Boss 的组合变了就重新排版（新人上台、换人、玩法变了） */
  private syncStage(s: BossGameState): void {
    const sides = s.bosses.map((b) => b.side)
    const fighters = this.stableOrder(s.fighters.map((f) => ({ id: f.id, team: f.team, kind: kindOf(f) })))
    // 多设备轮换上台：一直按每边 2 排留地方（只会变多，不变少）
    if ((s.crowd?.length ?? 0) > 0 || fighters.length > 2) this.rows = 2
    const sig = `${s.variant}#${sides.join(',')}#${this.rows}#${fighters.map((f) => `${f.id}:${f.team}:${f.kind}`).join(',')}`
    if (sig === this.signature) return
    // 第一次直接放好；之后上台的人变了就演上下台（M9）
    const animate = this.signature !== ''
    this.signature = sig
    this.input = { variant: s.variant, sides, fighters, rows: this.rows }
    // 拳手：按 id 留着原来的（表演接着演；正在下台的又回来了也接着用），新来的建一个；不在了的下台
    const keep = new Set(fighters.map((f) => f.id))
    const gone = this.fighters.filter((f) => !keep.has(f.id))
    this.fighters = fighters.map((f) => {
      const old = this.fighter(f.id) ?? this.takeLeaving(f.id)
      if (old) {
        old.team = f.team
        old.kind = f.kind
        return old
      }
      return new Fighter(f.id, f.team, f.kind, this.rng)
    })
    // 道：按 side 留着
    this.lanes = (sides.length ? sides : (['shared'] as BossSide[])).map((side) => {
      const lane = this.laneOf(side) ?? new LaneState(side)
      lane.time.enabled = this.animated
      return lane
    })
    this.relayout(animate)
    for (const f of gone) this.leave(f, animate)
    // 新建的道立刻按快照放一只（倒数的 reset 会再换成从天而降）
    for (const st of s.bosses) {
      const lane = this.laneOf(st.side)
      if (lane && !lane.boss && !lane.outgoing.length) this.placeBoss(lane, st, s.phase)
    }
  }

  /** 直接放一只（第一次挂载、晚进来、等不到事件）：比赛中站着，结束了坐着喘气 */
  private placeBoss(lane: LaneState, st: BossStage, phase: TimedPhase): void {
    const a = new DinoActor(st.level, this.rng)
    a.setMode(phase === 'ended' ? 'pant' : 'idle')
    a.hpRatio = st.max > 0 ? st.hp / st.max : 1
    lane.boss = a
    lane.pred = null
    lane.stateLevel = st.level
    lane.stateHp = st.hp
    lane.stateMax = st.max
    lane.pendingT = -1
    lane.bar.set(st.level, st.hp, st.max)
  }

  private syncBoss(st: BossStage): void {
    const lane = this.laneOf(st.side)
    if (!lane) return
    lane.stateLevel = st.level
    lane.stateHp = st.hp
    lane.stateMax = st.max
    const shown = lane.boss?.level ?? 0
    if (st.level === shown) {
      lane.pendingT = -1
      // 同一只：血量跟着快照走。快照比 hit 事件先到、拳头还要一会儿才打到，所以掉血等一下（onHit 按这一拳的招式再延长）
      if (lane.bar.level === st.level) {
        if (lane.bar.max !== st.max) lane.bar.max = Math.max(1, st.max)
        lane.bar.to(st.hp, this.phase === 'playing' || this.phase === 'ended' ? HIT_AT.jab : 0)
      }
      if (lane.boss) lane.boss.hpRatio = st.max > 0 ? st.hp / st.max : 1
    } else if (lane.pendingT < 0) lane.pendingT = 0
  }

  /** 暂停（M1）：Boss 安静待机（正在跳的舞、正在吼的都停下；还没扔出去的果冻球收回去），拳手由每帧选片段换成放下拳头 */
  private quiet(): void {
    for (const lane of this.lanes) {
      const a = lane.boss
      if (a && (a.mode === 'dance' || a.mode === 'roar' || a.mode === 'jelly')) a.setMode('idle')
      if (lane.jelly && !lane.jelly.launched) lane.jelly = null
    }
  }

  /** 新的一局（倒数）：全部复位到第 1 只满血，Boss 从天而降 */
  private reset(s: BossGameState): void {
    this.particles.clear()
    this.stars = []
    this.impacts = []
    this.links = []
    this.camera.reset()
    this.ended = false
    this.endPending = -1
    for (const lane of this.lanes) {
      lane.time.reset()
      lane.outgoing = []
      lane.pred = null
      lane.lastPunch = null
      lane.pendingT = -1
      lane.jelly = null
      const st = s.bosses.find((b) => b.side === lane.side)
      const level = st?.level ?? 1
      const a = new DinoActor(level, this.rng)
      lane.boss = a
      lane.stateLevel = level
      lane.stateHp = st?.hp ?? 1
      lane.stateMax = st?.max ?? 1
      lane.bar.fresh(level, lane.stateHp, lane.stateMax)
      a.setMode('wait')
      a.dropIn = 0.3
    }
    for (const f of this.fighters) {
      f.punch = null
      f.missT = -1
      f.cheerT = -1
      f.pokeT = -1
      f.hiT = -1
      f.noseT = -1
      f.finish = null
      f.charge = 0
      f.input = ''
      f.clipName = 'ready'
      f.anim.play(CLIPS.ready, 0)
    }
    for (const c of this.crowd) c.standT = 0
    // 新的一局：飞着的能量拳、光不要了，下台的直接走掉，观众席的人放下牌子
    this.energy = []
    this.glows = []
    this.leaving = []
    for (const s of this.seats) s.liftT = s.hopT = s.shakeT = -1
  }

  // —— 事件 ——

  onEvent(e: BossGameEvent): void {
    switch (e.type) {
      case 'countdown':
        // 暂停回来的 3-2-1 不是新的一局
        if (this.resuming || this.phase === 'paused') break
        // 快照（第 1 只满血）已经先到了：按它复位一次（倒数的快照已经复位过也没关系，只是重新从天而降）
        this.reset({
          phase: 'countdown',
          variant: this.variant,
          lastTen: false,
          fighters: [],
          bosses: this.lanes.map((l) => ({ side: l.side, level: l.stateLevel, hp: l.stateHp, max: l.stateMax })),
        })
        this.phase = 'countdown'
        this.lastTen = false
        break
      case 'go':
        this.ringGong()
        for (const lane of this.lanes) if (lane.boss?.visible && this.animated) lane.boss.squash.kick(0.08)
        break
      case 'hit':
        this.onHit(e)
        break
      case 'miss':
        this.onMiss(e.playerId, e.side)
        break
      case 'bossDown':
        this.onBossDown(e.side)
        break
      case 'bossIn':
        this.onBossIn(e.side, e.level)
        break
      case 'lastTen':
        this.lastTen = true
        this.cheerCrowd(null, 1.2, true)
        break
      case 'timeUp':
        this.timeUp()
        break
      case 'finished':
        this.finish(e.winner)
        break
      case 'taunt':
        this.onTaunt(e.side, e.act)
        break
      case 'emote':
        this.onEmote(e.playerId)
        break
      default:
        break
    }
  }

  private onHit(e: Extract<BossGameEvent, { type: 'hit' }>): void {
    const lane = this.laneOf(e.side) ?? this.lanes[0]
    if (!lane) return
    // 下一拳来了：别让上一只的慢动作拖住它
    lane.time.clearSlow()
    const f = this.fighter(e.playerId)
    // 台下的人（M9）：从观众席飞出一个能量拳，ENERGY_AT 秒打到（冲击和一记直拳差不多）
    const energy = !f && this.crowdIds.has(e.playerId)
    const p: Punch = {
      t: 0,
      arm: 0,
      move: energy ? 'jab' : e.move,
      points: e.points,
      together: e.together,
      hitAt: energy ? ENERGY_AT : HIT_AT[e.move],
      impacted: false,
      side: lane.side,
      ko: [],
      echo: false,
      mate: null,
      coiled: false,
      popped: false,
      target: null,
      born: this.steps,
    }
    lane.lastPunch = p
    lane.bar.wait(p.hitAt)
    // 拳头打到之前 Boss 还没掉下来：让它赶紧落地接这一拳
    const b = lane.boss
    if (b && b.mode === 'wait') this.startDrop(lane, b, Math.max(0.08, p.hitAt))
    if (!f) {
      if (energy) this.launchEnergy(lane, p, e.playerId, e.team)
      else this.ghostPunches.push(p)
      return
    }
    f.lastHitAt = this.time
    this.throwPunch(f, p)
    if (e.together) {
      // 合力拳（M4）：另一个人（最近打中过的那个队友）同步出一拳，两只拳套一起打到，然后两人击掌
      const mate = this.fighters
        .filter((o) => o !== f && o.side === f.side)
        .sort((x, y) => y.lastHitAt - x.lastHitAt)[0]
      if (mate) {
        p.mate = mate.id
        this.throwPunch(mate, { ...p, echo: true, ko: [], mate: f.id })
      }
    }
  }

  /** 出拳：上一拳还没打到就先让它打到，放这一招的片段（第一帧就动，M10），左右手轮流（蓄好力的旋风拳用后手） */
  private throwPunch(f: Fighter, p: Punch): void {
    if (f.punch && !f.punch.impacted && !f.punch.echo) this.impact(f, f.punch)
    p.coiled = p.move === 'super' && f.clipName === 'coil' && f.anim.t >= COIL_SPIN_TIME
    p.arm = p.coiled ? 1 : f.arm
    f.arm = p.arm === 0 ? 1 : 0
    f.punch = p
    f.punchArm = p.arm
    f.missT = -1
    f.pokeT = -1
    f.noseT = -1
    f.hiT = -1
    f.charge = 0
    f.aim = this.aimOf(f, p)
    const name = punchClip(p.move, p.coiled)
    f.anim.play(CLIPS[name], 0, 1, true)
    f.clipName = name
  }

  /** 台上、台下都没有这个人（快照还没跟上）：拳头照样打到 Boss 身上 */
  private ghostPunches: Punch[] = []

  private onMiss(playerId: string, side: BossSide): void {
    const f = this.fighter(playerId)
    if (f) {
      if (f.punch && !f.punch.impacted && !f.punch.echo) this.impact(f, f.punch)
      f.punch = null
      f.missT = 0
      f.pokeT = -1
      f.noseT = -1
      f.hiT = -1
      f.charge = 0
      f.punchArm = 0
      f.aim = this.aimOf(f)
      f.anim.play(CLIPS.miss, 0.04, 1, true)
      f.clipName = 'miss'
    }
    // Boss 一低头躲开，然后做个鬼脸
    const b = (this.laneOf(side) ?? this.lanes[0])?.boss
    if (b && b.standing) {
      if (this.animated) b.squash.kick(0.1)
      b.faceT = 0
    }
  }

  private onBossDown(side: BossSide): void {
    const lane = this.laneOf(side)
    if (!lane) return
    const old = lane.boss
    lane.boss = null
    if (!old) return
    if (old.mode === 'wait') {
      // 还没上台就又被打倒了（一拳溢出好几只）：这只不演了，下一只接着等上上一只
      return
    }
    old.setMode('koWait')
    lane.outgoing.push(old)
    lane.pred = old
    // 同一批事件里的那一拳打到的时候才开始倒下
    const p = lane.lastPunch
    if (p && !p.impacted && p.born === this.steps) p.ko.push(old)
    else this.knockout(lane, old, lane.lastFrom === -1 ? 1 : -1)
  }

  private onBossIn(side: BossSide, level: number): void {
    const lane = this.laneOf(side)
    if (!lane) return
    const a = new DinoActor(level, this.rng)
    a.setMode('wait')
    lane.boss = a
    if (level === lane.stateLevel) lane.pendingT = -1
    const pred = lane.pred
    // 上一只已经开始倒下了：按它倒下的时刻排好下来的时间；还在等拳头：等它
    if (!pred || pred.mode === 'gone') a.dropIn = 0
    else if (pred.mode !== 'koWait') a.dropIn = Math.max(0, (this.animated ? KO_DROP_DELAY : FADE_TIME * 0.6) - pred.t)
    if (this.ended) a.endAfterLand = true
  }

  private startDrop(lane: LaneState, a: DinoActor, dur = DROP_TIME): void {
    a.dropIn = -1
    a.dropDur = dur
    a.setMode('drop')
    a.x = 0
    a.y = -(lane.geo.floorY - lane.geo.y0 + lane.geo.u * 1.3)
    if (!this.animated) {
      a.y = 0
      a.alpha = 0
    }
    const level = a.level
    const hp = level === lane.stateLevel ? lane.stateHp : lane.stateMax
    const max = level === lane.stateLevel ? lane.stateMax : lane.stateMax
    lane.bar.fresh(level, hp, max)
    a.hpRatio = max > 0 ? hp / max : 1
  }

  /** 这一拳打到了（M10：直拳 70 ms、勾拳 100、上勾拳 120、旋风拳 200 的那一刻，和竞技场放的「嘭」对齐） */
  private impact(f: Fighter | null, p: Punch): void {
    p.impacted = true
    if (p.echo) return
    const lane = this.laneOf(p.side) ?? this.lanes[0]
    if (!lane) return
    const en = p.energy
    const dir: 1 | -1 = f ? f.dir : en ? en.dir : lane.geo.facing === -1 ? 1 : -1
    lane.lastFrom = dir === 1 ? -1 : 1
    const target = this.punchVictim(lane, p)
    const kos = p.ko.splice(0)
    // 第 3 只的泡泡挡在前面：先「啪」地破掉，拳照样打中（伤害由状态机定）
    if (!p.popped) {
      p.popped = true
      this.popBubble(lane, target)
    }
    const pt = en ? this.energyAim(lane, p, target) : target ? this.bellyPoint(lane, target, f ? -dir : 0) : { x: lane.geo.bossX, y: lane.geo.floorY - lane.geo.u * 0.4 }
    p.target = pt
    const animated = this.animated
    if (target && !kos.length) this.hitBoss(lane, target, dir, p)
    for (const a of kos) this.knockout(lane, a, dir)
    if (!kos.length) {
      lane.time.hitstop(HITSTOP[p.move])
      this.camera.shake(SHAKE[p.move] * (0.7 + 0.15 * p.points), 0.22 + 0.04 * p.points)
      // 旋风拳：镜头往 Boss 推一下
      if (p.move === 'super' && target) this.camera.punch(0.06, pt.x, pt.y)
    }
    if (animated && this.quality < 2) {
      // 能量拳：分越多冲击环越大，外面再一圈队色
      const r = lane.geo.boxerH * 0.3 * (p.move === 'super' ? 1.5 : p.move === 'jab' ? 1 : 1.2) * (en ? 1 + 0.15 * Math.max(0, p.points - 1) : 1)
      this.addImpact(pt.x, pt.y, r, '#ffffff')
      if (en) this.addImpact(pt.x, pt.y, r * 1.3, TEAM_GLOW[en.team].main)
      if (p.together) this.addImpact(pt.x, pt.y, r * 1.6, '#ffd24a')
    }
    if (en) this.energyBurst(lane, pt, en.team, p)
    // 合力拳：两只拳套一起打到（金色光圈），接着两人击掌
    if (p.together && p.mate && f) {
      const mate = this.fighter(p.mate)
      if (mate) {
        f.hiT = 0
        mate.hiT = 0
        this.addLink(f, mate, lane.side)
      }
    }
    // 得分时附近的观众站起来一下
    this.cheerCrowd(pt.x, 0.8, false)
  }

  // —— 台下的人：能量拳、座位（M9 / M12） ——

  /** 这一拳打在哪一只身上：挂着的那只被打倒的，或者台上站着的这一只 */
  private punchVictim(lane: LaneState, p: Punch): DinoActor | null {
    return p.ko[0] ?? (lane.boss && lane.boss.visible ? lane.boss : null)
  }

  /** 能量拳打在哪（肚子上，从它飞来的那一边，偏上偏下一点）；Boss 不在就打它该站的地方 */
  energyAim(lane: LaneState, p: Punch, victim?: DinoActor | null): { x: number; y: number } {
    const en = p.energy
    const a = victim === undefined ? this.punchVictim(lane, p) : victim
    const g = lane.geo
    if (!a || !en) return { x: g.bossX, y: g.floorY - g.u * 0.4 }
    const pt = this.bellyPoint(lane, a, -en.dir)
    return { x: pt.x, y: pt.y + en.dy * g.u * a.look.scale * a.scale }
  }

  /**
   * 台下的人打中了：从他举着的牌子里飞出一个能量拳（紧凑版 / 没座位时从这一队那边的舞台下角飞进来），他的牌子举高一下；
   * 几个同时飞的各走各的弧、打在肚子上不同的地方。减少动画时不飞，Boss 身上慢慢亮起一团队色的光
   */
  private launchEnergy(lane: LaneState, p: Punch, id: string, team: Team): void {
    const g = lane.geo
    const r = Math.max(4, g.boxerH * 0.13)
    const seat = this.seats.find((x) => x.id === id)
    let from: { x: number; y: number } | null = null
    if (seat) {
      // 刚从台上下来、还没冒出来：马上冒出来举牌
      seat.wait = 0
      seat.here = true
      seat.show = 1
      seat.liftT = 0
      const fig = this.seatFigure(seat)
      if (fig) from = signCenter(fig)
    }
    if (!from) {
      const band = this.geo.crowdBands[g.ring] ?? this.geo.crowdBands[0]
      const ring = this.geo.rings[g.ring] ?? this.geo.rings[0]
      if (!this.geo.small && band && ring) from = { x: team === 'red' ? band.x0 + r * 2 : band.x1 - r * 2, y: ring.backY - g.boxerH * 0.45 }
      else from = { x: team === 'red' ? g.x0 - r * 0.5 : g.x1 + r * 0.5, y: g.y1 - r * 0.4 }
    }
    const a = this.punchVictim(lane, p)
    const bx = a ? g.bossX + a.x + a.push.value : g.bossX
    const n = this.energyCount++
    p.energy = { team, dir: from.x <= bx ? 1 : -1, dy: ENERGY_DY[n % ENERGY_DY.length]! }
    this.energy.push({ id, p, x0: from.x, y0: from.y, arc: ENERGY_ARC[n % ENERGY_ARC.length]!, r })
    // 太多了：最早的那个直接打到（画面不挤）
    while (this.energy.length > ENERGY_CAP) this.landEnergy(this.energy.shift()!)
    if (!this.animated) {
      const pt = this.energyAim(lane, p)
      const calm = this.glows.find((x) => x.calm && x.side === lane.side)
      const t = TEAM_GLOW[team]
      if (calm) {
        calm.hold = Math.max(calm.hold, ENERGY_AT + 0.1)
        calm.x = pt.x
        calm.y = pt.y
        calm.color = t.light
        calm.ring = t.main
      } else this.glows.push({ side: lane.side, x: pt.x, y: pt.y, r: g.boxerH * 0.6, color: t.light, level: 0, peak: 0.32, hold: ENERGY_AT + 0.1, rise: 0.32 / 0.15, fall: 0.32 / CALM_GLOW_TIME, calm: true, ring: t.main })
    }
  }

  private landEnergy(fist: EnergyFist): void {
    if (!fist.p.impacted) this.impact(null, fist.p)
  }

  /** 能量拳打到的那一下：一团队色（合力拳金色）的光闪一下（一秒最多 3 次，挤在一起的不闪），迸几颗亮片 */
  private energyBurst(lane: LaneState, pt: { x: number; y: number }, team: Team, p: Punch): void {
    if (!this.animated) return
    if (this.time - this.lastFlashAt >= FLASH_GAP) {
      this.lastFlashAt = this.time
      const color = p.together ? '#fff3b0' : TEAM_GLOW[team].light
      this.glows.push({ side: lane.side, x: pt.x, y: pt.y, r: lane.geo.boxerH * 0.5 * (1 + 0.1 * Math.max(0, p.points - 1)), color, level: 0.3, peak: 0.3, hold: 0.04, rise: 1e6, fall: 0.3 / GLOW_TIME, calm: false })
    }
    if (this.quality >= 2) return
    const k = this.geo.k
    this.particles.emit({
      x: pt.x,
      y: pt.y,
      count: 5 + Math.min(4, p.points),
      speed: k * 110,
      angle: 0,
      spread: Math.PI * 2,
      life: 0.4,
      size: Math.max(2.5, k * 4),
      colors: p.together ? ['#ffd24a', '#fff3b0'] : [TEAM_GLOW[team].main, TEAM_GLOW[team].light],
      shape: 'flake',
      gravity: k * 140,
      drag: 2.4,
    })
  }

  /**
   * 能量拳 t 秒时在哪、往哪飞（单位向量）：从起点到肚子的一道二次曲线（弧顶比两头都高 arc 个 u），越飞越快；
   * 目标跟着 Boss 走（它被上一拳打歪了也打得中）
   */
  energyPoint(fist: EnergyFist, t: number): { x: number; y: number; dx: number; dy: number; q: number } {
    const lane = this.laneOf(fist.p.side) ?? this.lanes[0]
    const tgt = lane ? this.energyAim(lane, fist.p) : { x: this.geo.W / 2, y: this.geo.H / 2 }
    const u = lane ? lane.geo.u : 100
    const top = lane ? lane.geo.y0 + fist.r * 1.5 : 0
    const q = clamp01(t / fist.p.hitAt)
    const e = q * (0.55 + 0.45 * q)
    const cx = (fist.x0 + tgt.x) / 2
    const cy = Math.max(top, Math.min(fist.y0, tgt.y) - fist.arc * u)
    const k = 1 - e
    const x = k * k * fist.x0 + 2 * k * e * cx + e * e * tgt.x
    const y = k * k * fist.y0 + 2 * k * e * cy + e * e * tgt.y
    const vx = 2 * k * (cx - fist.x0) + 2 * e * (tgt.x - cx)
    const vy = 2 * k * (cy - fist.y0) + 2 * e * (tgt.y - cy)
    const len = Math.hypot(vx, vy) || 1
    return { x, y, dx: vx / len, dy: vy / len, q }
  }

  /** 给渲染：飞着的能量拳（越飞越近、越大；拖尾在降级 2 级时不画）。减少动画时不画（Boss 身上的那团光代替） */
  energyFigures(): EnergyFigure[] {
    if (!this.animated) return []
    return this.energy.map((fist) => {
      const pt = this.energyPoint(fist, fist.p.t)
      const trail = this.quality < 2 ? ENERGY_TRAIL.filter((b) => fist.p.t - b > 0.005).map((b) => this.energyPoint(fist, fist.p.t - b)) : []
      return {
        x: pt.x,
        y: pt.y,
        r: fist.r * (0.65 + 0.35 * pt.q),
        team: fist.p.energy?.team ?? 'red',
        dx: pt.dx,
        dy: pt.dy,
        trail,
        halo: 0.3,
        gold: fist.p.together,
      }
    })
  }

  private stepEnergy(dt: number): void {
    for (let i = this.energy.length - 1; i >= 0; i--) {
      const fist = this.energy[i]!
      // 按真实时间飞（竞技场按 ENERGY_AT 晚一点放「嘭」）
      fist.p.t += dt
      if (fist.p.t >= fist.p.hitAt) {
        this.energy.splice(i, 1)
        this.landEnergy(fist)
      }
    }
    for (let i = this.glows.length - 1; i >= 0; i--) {
      const gl = this.glows[i]!
      if (gl.hold > 0) {
        gl.hold -= dt
        gl.level = Math.min(gl.peak, gl.level + gl.rise * dt)
      } else {
        gl.level = Math.max(0, gl.level - gl.fall * dt)
        if (gl.level <= 0) this.glows.splice(i, 1)
      }
    }
  }

  private stepSeats(dt: number): void {
    const animated = this.animated
    for (let i = this.seats.length - 1; i >= 0; i--) {
      const s = this.seats[i]!
      if (s.here) {
        if (s.wait > 0) s.wait -= dt
        else s.show = animated ? Math.min(1, s.show + dt / SEAT_RISE_TIME) : 1
      } else {
        s.show = animated ? Math.max(0, s.show - dt / SEAT_RISE_TIME) : 0
        if (s.show <= 0) {
          this.seats.splice(i, 1)
          continue
        }
      }
      if (s.liftT >= 0 && (s.liftT += dt) > SIGN_UP + SIGN_HOLD + SIGN_DOWN) s.liftT = -1
      if (s.hopT >= 0 && (s.hopT += dt) > SEAT_HOP_TIME) s.hopT = -1
      if (s.shakeT >= 0 && (s.shakeT += dt) > SIGN_SHAKE_TIME) s.shakeT = -1
    }
  }

  /**
   * 一个座位这一刻的样子（没座位 / 小舞台就 null）：举牌（减少动画时直接举起来）、蹦一下、牌子晃（发表情时）；
   * 平时牌子跟着节奏轻轻晃（降级 1 级 / 暂停时不晃，最后 10 秒晃得快）
   */
  seatFigure(s: Seat): SeatFigure | null {
    const spot = s.idx >= 0 ? this.geo.seats[s.team][s.idx] : undefined
    if (!spot) return null
    const animated = this.animated
    const lt = s.liftT
    const lift = lt < 0 ? 0 : lt < SIGN_UP ? (animated ? lt / SIGN_UP : 1) : lt < SIGN_UP + SIGN_HOLD ? 1 : 1 - clamp01((lt - SIGN_UP - SIGN_HOLD) / SIGN_DOWN)
    const hop = animated && s.hopT >= 0 ? Math.sin(Math.PI * clamp01(s.hopT / SEAT_HOP_TIME)) * SEAT.hop * spot.r : 0
    let shake = 0
    if (animated && s.shakeT >= 0) shake = Math.sin(s.shakeT * 26) * 0.25 * spot.r * (1 - clamp01(s.shakeT / SIGN_SHAKE_TIME))
    else if (animated && this.quality < 1 && this.phase !== 'paused') shake = Math.sin(this.time * (this.lastTen ? 3.2 : 1.6) + s.phase) * 0.12 * spot.r
    return { x: spot.x, y: spot.y, r: spot.r, kind: s.kind, team: s.team, rise: s.show, hop, lift, shake, happy: lift > 0.3 || s.hopT >= 0 ? 1 : 0 }
  }

  /** 给渲染：这一片观众区里坐着的真人 */
  seatFigures(band: number): SeatFigure[] {
    const out: SeatFigure[] = []
    for (const s of this.seats) {
      const fig = this.seatFigure(s)
      if (fig && fig.rise > 0.01 && this.geo.seats[s.team][s.idx]?.band === band) out.push(fig)
    }
    return out
  }

  /** 座位的占地（测试用）：牌子举到最高、蹦到最高、晃到最边也在这里面；身子在台子后沿下面被挡住，不算 */
  seatBox(id: string): Box | null {
    const s = this.seats.find((x) => x.id === id)
    const spot = s && s.idx >= 0 ? this.geo.seats[s.team][s.idx] : undefined
    if (!spot) return null
    return { x0: spot.x - SEAT.half * spot.r, x1: spot.x + SEAT.half * spot.r, y0: spot.y - (SEAT.top + SEAT.lift + SEAT.hop) * spot.r, y1: spot.y }
  }

  /** 发了表情（M12）：台下的那个举起牌子蹦一下、牌子晃；台上的挥一下手（正在出拳、挥空、收尾时不打断） */
  private onEmote(id: string): void {
    const seat = this.seats.find((x) => x.id === id && x.here)
    if (seat) {
      seat.liftT = 0
      seat.hopT = 0
      seat.shakeT = 0
      return
    }
    const f = this.fighter(id)
    if (f && !f.punch && f.missT < 0 && !f.finish) {
      f.pokeKind = 'wave'
      f.pokeT = 0
    }
  }

  private addLink(a: Fighter, b: Fighter, side: BossSide): void {
    // 这两个人的弧还没长好（连着两次合力拳）：接着用那一道，不重来（不然一直长不到头、也闪不出来）
    const same = this.links.find((l) => (l.a === a.id && l.b === b.id) || (l.a === b.id && l.b === a.id))
    if (same && same.t < LINK_FLASH) return
    this.links = this.links.filter((l) => l.a !== a.id && l.b !== a.id && l.a !== b.id && l.b !== b.id)
    const at = this.time + LINK_FLASH
    const quiet = at - this.lastFlashAt < FLASH_GAP
    if (!quiet) this.lastFlashAt = at
    this.links.push({ a: a.id, b: b.id, side, t: 0, flashed: quiet, quiet })
  }

  private addImpact(x: number, y: number, r: number, color: string): void {
    this.impacts.push({ x, y, r, t: 0, color })
    if (this.impacts.length > 8) this.impacts.shift()
  }

  /** Boss 肚子上被打到的那一点：from 是拳手在哪边（−1 左边 / 1 右边 / 0 正中）；跟着被推开、被打飞的那一截走 */
  bellyPoint(lane: LaneState, a: DinoActor, from: number): { x: number; y: number } {
    const g = lane.geo
    const s = g.u * a.look.scale * a.scale
    return { x: g.bossX + a.x + a.push.value + from * s * 0.27, y: g.floorY + a.y - a.air - s * 0.36 }
  }

  /**
   * 挨了一拳：朝受力方向倒过去再弹回来（分越多倒得越多）、肚子挤一下、眯眼、布袋里迸出星星飞向打的那一边。四种拳一眼分得出（M9 / M10）：
   * 直拳只是倒一下；勾拳倒得更狠、整只被推往侧后方一截；上勾拳打得离地弹起来再落下（身子往上拉长）；旋风拳转半圈 + 被推开 + 镜头推近
   */
  private hitBoss(lane: LaneState, a: DinoActor, dir: 1 | -1, p: Punch): void {
    // 挑衅舞被打断；吼和扔果冻球照演完（声音是按时刻放的，画面跟着）
    if (a.mode === 'dance') a.setMode('idle')
    a.squint.kick(1)
    a.sackPuff.kick(1)
    a.faceT = -1
    const u = lane.geo.u
    const pts = p.points
    if (this.animated) {
      const slow = a.low ? 0.8 : 1
      const base = (2.4 + 0.9 * pts) * slow
      if (p.move === 'hook') {
        a.tilt.impulse(dir * base * 1.6)
        a.push.kick(dir * u * (HOOK_PUSH + 0.03 * pts))
        a.squash.kick(0.08 + 0.03 * pts)
      } else if (p.move === 'upper') {
        a.tilt.impulse(dir * base * 0.55)
        a.airV = Math.max(a.airV, Math.sqrt(2 * AIR_G * u * u * (UPPER_HOP + 0.04 * pts)))
        a.squash.kick(-0.12)
      } else if (p.move === 'super') {
        a.tilt.impulse(dir * base * 1.2)
        a.push.kick(dir * u * (HOOK_PUSH + 0.05))
        a.squash.kick(0.16 + 0.03 * pts)
        a.spinLeft = SPIN_TIME
      } else {
        a.tilt.impulse(dir * base)
        a.squash.kick(0.1 + 0.04 * pts)
      }
      // 靠到绳子上：后绳弹一下
      if (pts >= 2 || p.move !== 'jab') this.kickRopes(lane, 2 + pts)
    } else {
      // 减少动画：只换姿势 + 小幅位移（照样看得出是哪一种拳）
      a.tilt.impulse(dir * 0.9)
      if (p.move === 'hook' || p.move === 'super') a.push.kick(dir * u * 0.03)
      if (p.move === 'upper') a.airV = Math.max(a.airV, Math.sqrt(2 * AIR_G * u * u * 0.02))
    }
    if (this.animated && this.quality < 2) this.emitSackStars(lane, a, pts, -dir)
  }

  /** 布袋这一刻在哪（背后那一侧；转身走掉时跟着转过去） */
  sackPoint(lane: LaneState, a: DinoActor): { x: number; y: number } {
    const g = lane.geo
    const s = g.u * a.look.scale * a.scale
    const facing = a.mode === 'run' || a.mode === 'hop' ? a.exitDir : g.facing
    return { x: g.bossX + a.x + DINO_SACK.x * s * facing, y: g.floorY + a.y + DINO_SACK.y * s }
  }

  /** 布袋里迸出 n 颗星星，飞向 toward 那一边（−1 左 / 1 右） */
  private emitSackStars(lane: LaneState, a: DinoActor, n: number, toward: number): void {
    const g = lane.geo
    const { x: sx, y: sy } = this.sackPoint(lane, a)
    for (let i = 0; i < n; i++) {
      const speed = g.u * (1.6 + this.rng.next() * 0.6)
      const ang = -Math.PI / 2 + toward * (0.45 + this.rng.next() * 0.5)
      this.addStar({
        x: sx,
        y: sy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        rot: this.rng.next() * Math.PI,
        vr: (this.rng.next() - 0.5) * 8,
        r: g.boxerH * 0.075,
        age: 0,
        life: 0.9 + this.rng.next() * 0.3,
        color: STAR_COLORS[i % STAR_COLORS.length]!,
        gravity: g.u * 3.2,
      })
    }
  }

  private addStar(s: StarBit): void {
    this.stars.push(s)
    if (this.stars.length > STAR_CAP) this.stars.shift()
  }

  /** 打倒（M8）：最后一拳顿帧 250 ms + 0.6 秒的 0.3 倍慢动作 → 往后仰、泄气 → 乱飞一圈 → 瘪瘪落地 → 缩成一小只挥手蹦走 */
  private knockout(lane: LaneState, a: DinoActor, dir: 1 | -1): void {
    if (a.mode !== 'koWait' && !a.standing) return
    if (!lane.outgoing.includes(a)) lane.outgoing.push(a)
    if (a.shielded) this.popBubble(lane, a)
    a.koDir = dir
    a.flyFrom = { x: a.x, y: a.y }
    const g = lane.geo
    const back = g.facing === -1 ? 1 : -1
    // 落在背后那一侧（离拳手远的那边），不压着新来的那只
    const landX = clamp(g.bossX + back * g.u * 0.62, g.x0 + g.u * 0.25, g.x1 - g.u * 0.25) - g.bossX
    a.landAt = { x: landX, y: -(g.floorY - g.backY) * 0.3 }
    a.exitDir = back as 1 | -1
    // 血条还是这一只的才清空（下一只可能已经提前落地接了一拳、换上了自己的血条）
    if (lane.bar.level === a.level) lane.bar.to(0, 0)
    // 这条道的拳手跳起来举拳；台上还有队友就互相碰拳（金色的弧在 Boss 头顶上方碰一下）
    const mine = this.fighters.filter((f) => f.side === lane.side && f.missT < 0)
    for (const f of mine) {
      f.cheerT = 0
      f.bumpCheer = mine.length > 1
    }
    if (mine.length > 1) {
      const [x, y] = [...mine].sort((p, q) => q.lastHitAt - p.lastHitAt)
      this.addLink(x!, y!, lane.side)
    }
    this.cheerCrowd(null, 1.4, true)
    if (!this.animated) {
      a.setMode('fade')
    } else {
      a.setMode('reel')
      a.tilt.impulse(dir * 4.2)
      a.squash.kick(0.18)
      a.squint.kick(1)
      lane.time.hitstop(KO_STOP)
      lane.time.slow(KO_SLOW, KO_SLOW_TIME)
      this.camera.shake(4, 0.4)
      const pt = this.bellyPoint(lane, a, 0)
      this.camera.punch(0.07, pt.x, pt.y)
      this.kickRopes(lane, 5)
      this.confetti(lane)
    }
    // 等着它的下一只：从现在算（减少动画时等上一只淡出一大半再出现，不叠在一起）
    const next = lane.boss
    if (next && next.mode === 'wait') next.dropIn = this.animated ? KO_DROP_DELAY : FADE_TIME * 0.6
  }

  /** 彩带炮：舞台两边往上喷 */
  private confetti(lane: LaneState): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const lg = lane.geo
    for (const side of [0, 1]) {
      this.particles.emit({
        x: side === 0 ? lg.x0 + lg.u * 0.1 : lg.x1 - lg.u * 0.1,
        y: lg.floorY,
        count: 12,
        speed: lg.u * 2.4,
        angle: side === 0 ? -Math.PI * 0.35 : -Math.PI * 0.65,
        spread: 0.6,
        life: 1.3,
        size: Math.max(3, g.k * 5),
        colors: CONFETTI,
        shape: 'flake',
        gravity: lg.u * 1.6,
        drag: 1.4,
      })
    }
  }

  private kickRopes(lane: LaneState, px: number): void {
    if (!this.animated) return
    const ropes = this.ropes[lane.geo.ring]
    if (!ropes) return
    ropes.forEach((r, i) => r.impulse(px * this.geo.k * (8 + i * 3)))
  }

  private timeUp(): void {
    if (this.ended) return
    this.ended = true
    this.endPending = -1
    for (const lane of this.lanes) {
      const a = lane.boss
      if (!a) continue
      if (a.mode === 'wait') {
        this.startDrop(lane, a, this.animated ? DROP_TIME * 0.7 : 0)
        a.endAfterLand = true
      } else if (a.mode === 'drop' || a.mode === 'land') a.endAfterLand = true
      else if (a.standing) this.sitDown(lane, a)
    }
    for (const f of this.fighters) {
      if (f.finish === null) {
        f.finish = 'cheer'
        f.finishT = 0
      }
    }
    this.cheerCrowd(null, 3, true)
  }

  /** 时间到还没打倒：一屁股坐下喘气、挥手、跑掉，掉几颗星星（M8，不惨） */
  private sitDown(lane: LaneState, a: DinoActor): void {
    if (a.shielded) this.popBubble(lane, a)
    a.setMode('sit')
    a.faceT = -1
    a.exitDir = (lane.geo.facing === -1 ? 1 : -1) as 1 | -1
    if (this.animated) {
      a.squash.kick(0.14)
      this.dust(lane, a, 8)
    }
  }

  private finish(winner: Team | null): void {
    if (!this.ended) this.timeUp()
    for (const f of this.fighters) {
      const cheer = this.variant !== 'versus' || winner === null || f.team === winner
      const next = cheer ? 'cheer' : 'clap'
      if (f.finish !== next) {
        f.finish = next
        f.finishT = 0
      }
    }
  }

  private ringGong(): void {
    if (this.animated) this.gongSwing.impulse(2.2)
    this.gongGlow.kick(1)
  }

  /** 观众站起来：near 是 x（只站附近几个，null = 全场），seconds 站多久，jump 蹦一下 */
  private cheerCrowd(near: number | null, seconds: number, jump: boolean): void {
    const span = this.geo.W * 0.18
    for (const c of this.crowd) {
      if (near !== null && Math.abs(c.x - near) > span) continue
      c.standT = Math.max(c.standT, seconds * (near === null ? 1 : 0.6 + this.rng.next() * 0.4))
      if (jump && this.animated) c.hop = 1
    }
    // 全场欢呼（打倒、登场、最后 10 秒、时间到）：观众席里的真人一起举牌
    if (near === null && jump) for (const s of this.seats) if (s.here && s.liftT < 0) s.liftT = 0
  }

  private dust(lane: LaneState, a: DinoActor, count: number): void {
    if (!this.animated || this.quality >= 2) return
    const g = lane.geo
    this.particles.emit({
      x: g.bossX + a.x,
      y: g.floorY + a.y,
      count,
      speed: g.u * 0.8,
      angle: -Math.PI / 2,
      spread: Math.PI * 0.9,
      life: 0.6,
      size: Math.max(2.5, g.u * 0.03),
      colors: ['#fff4e0', '#e9dcc6'],
      gravity: -g.u * 0.3,
      drag: 2.6,
    })
  }

  // —— Boss 的表演（M8）：挑衅舞 / 吼 / 扔果冻球，只是表演，不影响血量、不挡答题 ——

  /** store 发来的表演：只在这只 Boss 站在台上待机时演（登场、被打倒的过场、时间到、暂停、不是 playing 时都不演） */
  private onTaunt(side: BossSide, act: TauntAct): void {
    if (this.phase !== 'playing' || this.ended) return
    const lane = this.laneOf(side)
    const a = lane?.boss
    if (!lane || !a || a.mode !== 'idle') return
    a.faceT = -1
    a.tongueT = -1
    a.wiggleT = -1
    a.setMode(act)
    if (act === 'jelly') {
      // 扔向这条道上的一个拳手（各打各的只有那一边的人）
      const mine = this.fighters.filter((f) => f.side === lane.side)
      const target = mine.length ? mine[Math.min(mine.length - 1, Math.floor(this.rng.next() * mine.length))]! : null
      lane.jelly = {
        from: a,
        target: target?.id ?? null,
        t: 0,
        launched: false,
        landed: false,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        sf: 0.5,
        yf: 0,
        r: Math.max(3, lane.geo.boxerH * 0.14),
        wob: Spring.of(3, 0.16, 0, 1e-3),
      }
    }
  }

  /** 扔果冻球那只手在哪（画面坐标，不算不倒翁的歪）：grab 伸进布袋、toss 举过头顶，和 dino.ts 的手臂一样的混合顺序 */
  handPoint(lane: LaneState, a: DinoActor, grab: number, toss: number): { x: number; y: number } {
    const g = lane.geo
    const s = g.u * a.look.scale * a.scale
    let hx = lerp(-0.2, DINO_HAND_SACK.x, grab)
    let hy = lerp(-0.47, DINO_HAND_SACK.y, grab)
    hx = lerp(hx, DINO_HAND_UP.x, toss)
    hy = lerp(hy, DINO_HAND_UP.y, toss)
    return { x: g.bossX + a.x + a.push.value + g.facing * hx * s, y: g.floorY + a.y - a.air + hy * s }
  }

  private stepJelly(lane: LaneState, j: JellyBall, dt: number): void {
    j.t += dt
    if (!j.launched) {
      // 还没扔出去就被打倒了 / 时间到坐下了：不扔了
      if (!j.from.standing || j.from !== lane.boss) {
        lane.jelly = null
        return
      }
      if (j.t >= JELLY_THROW) this.launchJelly(lane, j)
      return
    }
    if (!j.landed && j.t >= JELLY_LAND) {
      j.landed = true
      if (this.animated) {
        j.wob.kick(0.38)
        this.kickRopes(lane, 1.5)
        if (this.quality < 2)
          this.particles.emit({
            x: j.x1,
            y: j.y1 + j.r * 0.8,
            count: 7,
            speed: j.r * 5,
            angle: -Math.PI / 2,
            spread: Math.PI * 0.9,
            life: 0.4,
            size: Math.max(2, j.r * 0.28),
            colors: ['#ff8fc7', '#ffc2e0'],
            gravity: lane.geo.u * 3,
            drag: 2,
          })
      }
    }
    j.wob.step(dt)
    if (j.t >= JELLY_TIME) lane.jelly = null
  }

  /** 出手：从手里抛出去，抛物线正好从拳手（没低头时）的脑袋那么高过去，落在他身后的台面上 */
  private launchJelly(lane: LaneState, j: JellyBall): void {
    const g = lane.geo
    const arm = jellyArm(JELLY_THROW)
    const h = this.handPoint(lane, j.from, arm.grab, arm.toss)
    j.x0 = h.x
    j.y0 = h.y
    j.launched = true
    const f = j.target ? this.fighter(j.target) : undefined
    if (f) {
      j.x1 = clamp(f.x - f.dir * f.b * 0.6, g.x0 + j.r * 1.5, g.x1 - j.r * 1.5)
      j.y1 = f.y - j.r * 0.9
      const span = j.x1 - j.x0
      j.sf = Math.abs(span) > 1 ? clamp((f.x - j.x0) / span, 0.25, 0.85) : 0.5
      j.yf = Math.max(g.y0 + j.r, f.y - f.b * 0.95)
    } else {
      j.x1 = clamp(g.bossX + g.facing * g.u * 0.9, g.x0 + j.r * 1.5, g.x1 - j.r * 1.5)
      j.y1 = g.floorY - j.r * 0.9
      j.sf = 0.5
      j.yf = Math.min(j.y0, j.y1) - g.u * 0.25
    }
  }

  /** 果冻球这一刻画在哪、多大、压扁多少、多透明（还没从布袋里掏出来 / 已经没了就 null） */
  jellyPos(lane: LaneState, j: JellyBall): { x: number; y: number; r: number; sx: number; sy: number; alpha: number } | null {
    if (j.t < 0.1 || j.t >= JELLY_TIME) return null
    let x: number
    let y: number
    if (!j.launched) {
      const arm = jellyArm(j.t)
      const h = this.handPoint(lane, j.from, arm.grab, arm.toss)
      x = h.x
      y = h.y - j.r * 0.6
    } else if (j.landed) {
      x = j.x1
      y = j.y1
    } else if (!this.animated) {
      // 减少动画：不飞，举在手里，落地那一刻起在落点淡掉
      x = j.x0
      y = j.y0 - j.r * 0.6
    } else {
      const u = clamp01((j.t - JELLY_THROW) / (JELLY_LAND - JELLY_THROW))
      const sf = j.sf
      const b = (j.yf - j.y0 - (j.y1 - j.y0) * sf) / (sf * sf - sf)
      const a = j.y1 - j.y0 - b
      x = lerp(j.x0, j.x1, u)
      y = j.y0 + a * u + b * u * u
    }
    const w = j.wob.value
    const alpha = j.t < JELLY_LAND + 0.3 ? 1 : 1 - clamp01((j.t - JELLY_LAND - 0.3) / (JELLY_TIME - JELLY_LAND - 0.3))
    return { x, y: y + j.r * w * 0.8, r: j.r, sx: 1 + w * 0.6, sy: 1 - w, alpha }
  }

  // —— 第 3 只的泡泡（M8） ——

  /** 泡泡这一刻在哪、多大（画面坐标）：吹的时候从嘴里长出来、飘到肚子前面挡着；没有就 null */
  bubblePoint(lane: LaneState, a: DinoActor): { x: number; y: number; r: number } | null {
    if (a.bubble === 'none' || !a.visible) return null
    const g = lane.geo
    const s = g.u * a.look.scale * a.scale
    const bx = g.bossX + a.x + a.push.value
    const by = g.floorY + a.y - a.air
    const R = 0.24 * s
    const front = { x: bx + g.facing * 0.38 * s, y: by - 0.42 * s }
    if (a.bubble === 'float') return { x: front.x, y: front.y + (this.animated ? Math.sin(a.clock * 2.2) * 0.015 * s : 0), r: R }
    const q = clamp01(a.bubbleT / BUBBLE_BLOW)
    if (!this.animated) return { ...front, r: R * clamp01(q * 1.6) }
    const mouthX = bx + g.facing * DINO_MOUTH.x * s
    const mouthY = by + DINO_MOUTH.y * s
    if (q < 0.55) {
      const r = R * 0.45 * ease.outQuad(q / 0.55)
      return { x: mouthX + g.facing * r * 0.9, y: mouthY, r }
    }
    const k = ease.inOutSine((q - 0.55) / 0.45)
    const r = R * lerp(0.45, 1, k)
    return { x: lerp(mouthX + g.facing * R * 0.4, front.x, k), y: lerp(mouthY, front.y, k), r }
  }

  /** 待机时隔一会儿吹一个（暂停时不吹、不长），挡在肚子前面等着被打破 */
  private stepBubble(a: DinoActor, dt: number): void {
    if (a.bubble === 'none') {
      if (a.mode === 'idle' && this.phase === 'playing' && !this.ended) {
        a.bubbleWait -= dt
        if (a.bubbleWait <= 0) {
          a.bubble = 'blow'
          a.bubbleT = 0
        }
      }
      return
    }
    if (this.phase !== 'paused') a.bubbleT += dt
    if (a.bubble === 'blow' && a.bubbleT >= BUBBLE_BLOW) {
      a.bubble = 'float'
      a.bubbleT = 0
    }
  }

  /** 泡泡「啪」地破掉：迸一圈小水珠（减少动画 / 降级时只是没了），过几秒再吹 */
  private popBubble(lane: LaneState, a: DinoActor | null): void {
    if (!a || !a.shielded) return
    const pt = this.bubblePoint(lane, a)
    a.bubble = 'none'
    a.bubbleT = 0
    a.bubbleWait = lerp(BUBBLE_AGAIN[0], BUBBLE_AGAIN[1], this.rng.next())
    if (!pt || !this.animated || this.quality >= 2) return
    this.particles.emit({
      x: pt.x,
      y: pt.y,
      count: 10,
      speed: pt.r * 3.4,
      angle: 0,
      spread: Math.PI * 2,
      life: 0.45,
      size: Math.max(2, pt.r * 0.12),
      colors: ['#bfefff', '#ffffff', '#9fe3ff'],
      gravity: lane.geo.u * 2,
      drag: 2,
    })
    this.addImpact(pt.x, pt.y, pt.r, '#dff6ff')
  }

  // —— 合力拳击掌 / 碰拳 ——

  /** 拳手举起来的那只拳（前手）在画面上的位置 */
  gloveWorld(f: Fighter): { x: number; y: number } {
    const bp = this.boxerPose(f)
    const g = bp.pose.lead
    return { x: bp.x + f.dir * g.x * bp.b * bp.pose.sx, y: bp.y + g.y * bp.b * bp.pose.sy }
  }

  /**
   * 一道金色的弧：从两个人举起来的拳头往中间长，最高点在两人中间（中间隔着 Boss 时在它头顶上方、血条下面），
   * 碰上的那一刻闪一下；没了就 null
   */
  linkGeo(l: LinkFx): { ax: number; ay: number; bx: number; by: number; cx: number; cy: number; grow: number; flash: number; alpha: number } | null {
    const fa = this.fighter(l.a)
    const fb = this.fighter(l.b)
    if (!fa || !fb || l.t >= LINK_TIME) return null
    const pa = this.gloveWorld(fa)
    const pb = this.gloveWorld(fb)
    const cx = (pa.x + pb.x) / 2
    // 两只拳离得越远弧越高（挨得很近的时候就是两拳之间一闪）
    const gap = Math.abs(pa.x - pb.x)
    let cy = Math.min(pa.y, pb.y) - Math.min(gap * 0.35, Math.max(fa.b, fb.b) * 0.3)
    const lane = this.laneOf(l.side)
    if (lane) {
      const g = lane.geo
      const a = lane.boss && lane.boss.standing ? lane.boss : null
      if (a && gap > g.u * 0.6) {
        const s = g.u * a.look.scale * a.scale
        cy = Math.min(cy, g.floorY + a.y - a.air - dinoTop(a.look) * s - g.u * 0.06)
      }
      cy = Math.max(cy, g.bar.dotY + g.bar.dotR * 2 + 2, g.y0 + 4)
    }
    const grow = this.animated ? clamp01((l.t - LINK_GROW[0]) / (LINK_GROW[1] - LINK_GROW[0])) : l.t >= LINK_GROW[0] ? 1 : 0
    const flash = l.quiet || l.t < LINK_FLASH ? 0 : clamp01(1 - (l.t - LINK_FLASH) / 0.3)
    const alpha = l.t < 0.7 ? 1 : clamp01(1 - (l.t - 0.7) / (LINK_TIME - 0.7))
    return { ax: pa.x, ay: pa.y, bx: pb.x, by: pb.y, cx, cy, grow, flash, alpha }
  }

  private stepLinks(dt: number): void {
    for (let i = this.links.length - 1; i >= 0; i--) {
      const l = this.links[i]!
      const lane = this.laneOf(l.side)
      // 跟着这条道的顿帧 / 慢动作走（打倒那一拳的慢动作里碰拳也慢）
      l.t += lane ? lane.wdt : dt
      if (!l.flashed && l.t >= LINK_FLASH) {
        l.flashed = true
        const geo = this.linkGeo(l)
        if (geo && this.animated && this.quality < 2)
          this.particles.emit({
            x: geo.cx,
            y: geo.cy,
            count: 8,
            speed: this.geo.k * 90,
            angle: -Math.PI / 2,
            spread: Math.PI * 2,
            life: 0.5,
            size: Math.max(2.5, this.geo.k * 4),
            colors: ['#ffd24a', '#fff3b0'],
            shape: 'flake',
            gravity: this.geo.k * 120,
            drag: 2,
          })
      }
      if (l.t >= LINK_TIME) this.links.splice(i, 1)
    }
  }

  // —— 点一下（B59 / M12） ——

  hitTest(x: number, y: number): PokeTarget {
    for (const f of this.fighters) {
      const box = this.fighterBox(f.id)
      if (box && x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1) return { kind: 'fighter', id: f.id }
    }
    for (const lane of this.lanes) {
      const a = lane.boss && lane.boss.visible ? lane.boss : null
      if (!a) continue
      const g = lane.geo
      const s = g.u * a.look.scale * a.scale
      const bx = g.bossX + a.x + a.push.value
      const by = g.floorY + a.y - a.air
      if (Math.hypot(x - bx, y - (by - DINO_BELLY_Y * s)) <= s * 0.4) return { kind: 'boss', side: lane.side }
      if (Math.hypot(x - (bx + g.facing * s * 0.12), y - (by - s * 0.82)) <= s * 0.3) return { kind: 'boss', side: lane.side }
    }
    const gong = this.geo.gong
    if (gong && Math.hypot(x - gong.x, y - gong.y) <= gong.r * 1.5) return { kind: 'gong' }
    // 观众席里的真人（从人到举着的牌子）
    for (const s of this.seats) {
      const fig = this.seatFigure(s)
      if (!fig || fig.rise < 0.5) continue
      const top = seatOrigin(fig).y - (SEAT.top + SEAT.lift * fig.lift) * fig.r
      if (Math.abs(x - fig.x) <= SEAT.half * fig.r && y <= fig.y && y >= top) return { kind: 'crowd', id: s.id }
    }
    return { kind: 'crowd' }
  }

  poke(x: number, y: number, _team?: Team): PokeTarget['kind'] {
    const hit = this.hitTest(x, y)
    switch (hit.kind) {
      case 'boss': {
        // 咯咯笑着晃一下
        const lane = this.laneOf(hit.side)
        const a = lane?.boss
        if (!lane || !a) break
        a.giggle.kick(1)
        const dir = x < lane.geo.bossX + a.x ? 1 : -1
        a.tilt.impulse(dir * (this.animated ? 1.6 : 0.5))
        if (this.animated) a.squash.kick(0.06)
        break
      }
      case 'fighter': {
        // 秀肌肉 / 挥手轮流（正在出拳、挥空时不打断）
        const f = this.fighter(hit.id)
        if (f && !f.punch && f.missT < 0) {
          f.pokes += 1
          f.pokeKind = f.pokes % 2 === 1 ? 'flex' : 'wave'
          f.pokeT = 0
        }
        break
      }
      case 'gong':
        this.ringGong()
        break
      default: {
        // 点到观众席里的真人：他举一下牌子；点到别处：附近的观众欢呼
        const seat = hit.id ? this.seats.find((s) => s.id === hit.id) : undefined
        if (seat) {
          seat.liftT = 0
          if (this.animated) seat.hopT = 0
        } else this.cheerCrowd(x, 1, true)
        break
      }
    }
    return hit.kind
  }

  /** 终局特写要对准的点（B63）：一起打对准 Boss；各打各的对准那一队的 Boss */
  focus(team: Team): { x: number; y: number } {
    const lane = (this.variant === 'versus' ? this.laneOf(team) : undefined) ?? this.lanes[0]
    if (!lane) return { x: this.geo.W / 2, y: this.geo.H / 2 }
    const g = lane.geo
    const a = lane.boss?.visible ? lane.boss : lane.outgoing.filter((o) => o.visible).at(-1)
    if (!a) return { x: g.bossX, y: g.floorY - g.u * 0.5 }
    const s = g.u * a.look.scale * a.scale
    return { x: clamp(g.bossX + a.x + a.push.value, 0, this.geo.W), y: clamp(g.floorY + a.y - a.air - s * 0.5, 0, this.geo.H) }
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) {
      this.particles.clear()
      this.stars = []
    }
  }

  // —— 每帧 ——

  step(dt: number): void {
    this.steps += 1
    this.time += dt
    const animated = this.animated
    this.camera.step(dt)
    if (animated && !this.geo.small && this.quality < 1) this.lightT += dt
    // 最后 10 秒灯光慢慢呼吸（暂停时停下）
    if (this.lastTen && animated && this.phase !== 'paused') this.warm = advancePhase(this.warm, dt, 1 / 1.8)
    for (const lane of this.lanes) this.stepLane(lane, dt)
    for (const f of this.fighters) this.stepFighter(f, dt)
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const f = this.leaving[i]!
      this.stepFighter(f, dt)
      if (!f.glide) this.leaving.splice(i, 1)
    }
    this.stepLinks(dt)
    this.stepEnergy(dt)
    this.stepSeats(dt)
    for (let i = this.ghostPunches.length - 1; i >= 0; i--) {
      const p = this.ghostPunches[i]!
      p.t += dt
      if (p.t >= p.hitAt) {
        this.ghostPunches.splice(i, 1)
        this.impact(null, p)
      }
    }
    // 快照说结束了、却一直没等到 timeUp（晚进来）：直接收尾
    if (this.endPending >= 0) {
      this.endPending += dt
      if (this.endPending > RECONCILE_WAIT) {
        this.endPending = -1
        this.timeUp()
      }
    }
    this.particles.step(dt)
    this.stepStars(dt)
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const fx = this.impacts[i]!
      fx.t += dt / 0.28
      if (fx.t >= 1) this.impacts.splice(i, 1)
    }
    this.stepCrowd(dt)
    for (const ring of this.ropes) for (const r of ring) r.step(dt)
    this.gongSwing.step(dt)
    this.gongGlow.step(dt)
  }

  private stepStars(dt: number): void {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i]!
      s.age += dt
      if (s.age >= s.life) {
        this.stars.splice(i, 1)
        continue
      }
      s.vy += s.gravity * dt
      s.vx *= Math.max(0, 1 - 0.8 * dt)
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.rot += s.vr * dt
    }
  }

  private stepCrowd(dt: number): void {
    const animated = this.animated
    const sway = animated && this.quality < 1 && !this.geo.small
    const speed = this.lastTen ? 3.2 : 1.6
    for (const c of this.crowd) {
      if (c.standT > 0) c.standT -= dt
      const stand = (this.lastTen && this.phase !== 'paused') || c.standT > 0 || this.ended ? 1 : 0
      const target = stand * c.r * 1.3
      c.lift += (target - c.lift) * Math.min(1, dt * (animated ? 8 : 60))
      if (c.hop > 0) c.hop = Math.max(0, c.hop - dt * 2.4)
      const hop = animated ? Math.sin((1 - c.hop) * Math.PI) * c.hop * c.r * 1.2 : 0
      c.y = c.baseY - hop
      c.up = stand ? 1 : 0.55
      c.swing = sway ? Math.sin(this.time * speed + c.phase) * 0.55 : 0.2 * Math.sin(c.phase)
    }
  }

  private stepLane(lane: LaneState, dt: number): void {
    const wdt = lane.time.scale(dt)
    lane.wdt = wdt
    // 快照里是别的一只、一直没等到事件：直接换
    if (lane.pendingT >= 0) {
      lane.pendingT += dt
      if (lane.pendingT > RECONCILE_WAIT) {
        lane.outgoing = lane.outgoing.filter((a) => a.mode !== 'koWait')
        this.placeBoss(lane, { side: lane.side, level: lane.stateLevel, hp: lane.stateHp, max: lane.stateMax }, this.phase)
        if (this.ended && lane.boss) lane.boss.setMode('pant')
      }
    }
    const a = lane.boss
    if (a && a.mode === 'wait' && a.dropIn >= 0) {
      a.dropIn -= dt
      if (a.dropIn <= 0) this.startDrop(lane, a)
    }
    lane.bar.step(dt)
    if (a) this.stepBoss(lane, a, wdt, true)
    // 果冻球按真实时间飞（落地的「啪」是 store 按收到事件后的时刻放的）
    if (lane.jelly) this.stepJelly(lane, lane.jelly, dt)
    for (let i = lane.outgoing.length - 1; i >= 0; i--) {
      const o = lane.outgoing[i]!
      this.stepBoss(lane, o, wdt, false)
      // 等拳头等太久（拳手没了）：直接倒
      if (o.mode === 'koWait' && o.t > 0.5) this.knockout(lane, o, lane.lastFrom === -1 ? 1 : -1)
      if (o.mode === 'gone') lane.outgoing.splice(i, 1)
    }
    if (lane.outgoing.length > OUTGOING_CAP) lane.outgoing.splice(0, lane.outgoing.length - OUTGOING_CAP)
  }

  private stepBoss(lane: LaneState, a: DinoActor, dt: number, current: boolean): void {
    const g = lane.geo
    const animated = this.animated
    const prevT = a.t
    a.t += dt
    a.clock += dt
    // 血少了动作变慢；暂停时安安静静地慢慢晃
    const slow = (a.low ? 0.6 : 1) * (this.phase === 'paused' ? 0.5 : 1)
    if (animated) {
      a.sway = advancePhase(a.sway, dt, 0.45 * slow)
      a.beat = advancePhase(a.beat, dt, 2.2)
    }
    a.blink.step(dt)
    a.squint.step(dt)
    a.giggle.step(dt)
    a.sackPuff.step(dt)
    if (a.faceT >= 0) {
      a.faceT += dt
      if (a.faceT > 0.9) a.faceT = -1
    }
    // 旋风拳：转半圈（背对拳手、露出布袋）再转回来
    if (a.spinLeft > 0) {
      a.spinLeft = Math.max(0, a.spinLeft - dt)
      a.spin = 0.5 * Math.sin(Math.PI * (1 - a.spinLeft / SPIN_TIME))
      if (a.spinLeft <= 0) a.spin = 0
    }
    // 血少了动作变慢（弹簧也慢）
    a.tilt.tune(a.low ? 1.1 : 1.5, animated ? 0.22 : 0.9)
    a.tilt.step(dt)
    a.squash.step(dt)
    a.push.step(dt)
    // 上勾拳打飞：往上弹起来、落地压一下再小弹一次
    if ((a.air > 0 || a.airV > 0) && dt > 0) {
      const G = AIR_G * g.u
      a.airV -= G * dt
      a.air += a.airV * dt
      if (a.air <= 0 && a.airV < 0) {
        a.air = 0
        const v = -a.airV
        a.airV = v > g.u * 0.6 ? v * 0.28 : 0
        if (animated && v > g.u * 0.6) {
          a.squash.kick(Math.min(0.2, 0.05 + v / g.u / 20))
          this.dust(lane, a, 5)
        }
      }
    }
    if (current && a.blower) this.stepBubble(a, dt)
    // 头盔：血少于一半歪、快没血了掉下来
    if (a.look.hat === 'helmet') {
      const knocked = a.mode === 'reel' || a.mode === 'fly' || a.mode === 'flat' || a.mode === 'small' || a.mode === 'hop' || a.mode === 'fade'
      const off = a.hpRatio <= 0.15 || knocked ? 1 : 0
      a.helmetOff = off ? Math.min(1, a.helmetOff + dt * (animated ? 2.2 : 10)) : Math.max(0, a.helmetOff - dt * 4)
    }
    switch (a.mode) {
      case 'drop': {
        // 从上面掉下来（越掉越快）；减少动画时原地淡入
        const q = a.dropDur > 0 ? clamp01(a.t / a.dropDur) : 1
        if (animated) a.y = -(g.floorY - g.y0 + g.u * 1.3) * (1 - q * q)
        else a.alpha = clamp01(a.t / POP_TIME)
        if (animated ? q >= 1 : a.t >= POP_TIME) {
          a.y = 0
          a.alpha = 1
          a.setMode('land')
          if (animated) {
            a.squash.kick(0.2)
            this.camera.shake(2.5, 0.25)
            this.dust(lane, a, 10)
            this.kickRopes(lane, 2)
          }
          this.cheerCrowd(null, 0.8, true)
          if (a.endAfterLand && current) this.sitDown(lane, a)
        }
        break
      }
      case 'land':
        if (a.endAfterLand && current) this.sitDown(lane, a)
        else if (a.t >= LAND_TIME) a.setMode('idle')
        break
      case 'idle': {
        // 偶尔吐舌头 / 扭屁股（暂停时不做）；挑衅由 store 发 taunt 事件（onTaunt）
        if (animated && this.phase !== 'paused') {
          const gst = a.tickGesture(dt)
          if (gst === 'tongue') a.tongueT = 0
          else if (gst === 'wiggle') a.wiggleT = 0
        }
        break
      }
      case 'dance':
        if (a.t >= DANCE_TIME) a.setMode('idle')
        break
      case 'roar':
        // 张嘴开吼那一下：台子一震、围绳一弹
        if (prevT < ROAR_OPEN && a.t >= ROAR_OPEN && animated) {
          this.camera.shake(2, 0.35)
          this.kickRopes(lane, 2.5)
        }
        if (a.t >= ROAR_TIME) a.setMode('idle')
        break
      case 'jelly':
        if (prevT < 0.1 && a.t >= 0.1) a.sackPuff.kick(0.7)
        if (a.t >= JELLY_BOSS_TIME) a.setMode('idle')
        break
      case 'reel':
        if (a.t >= REEL_TIME) {
          a.setMode('fly')
          a.helmetOff = 1
          this.burstSack(lane, a)
        }
        break
      case 'fly': {
        const q = clamp01(a.t / FLY_TIME)
        const p = this.flyPoint(lane, a, q)
        a.x = p.x
        a.y = p.y
        a.scale = 1 - 0.3 * q
        if (animated && this.quality < 2 && Math.floor(a.t / 0.05) !== Math.floor((a.t - dt) / 0.05)) this.puff(lane, a)
        if (q >= 1) {
          a.setMode('flat')
          a.x = a.landAt.x
          a.y = a.landAt.y
          this.dust(lane, a, 6)
          this.camera.shake(2, 0.2)
        }
        break
      }
      case 'flat':
        if (a.t >= FLAT_TIME) a.setMode('small')
        break
      case 'small':
        a.scale = lerp(0.7, 0.42, ease.outBack(clamp01(a.t / 0.2)))
        if (a.t >= SMALL_TIME) a.setMode('hop')
        break
      case 'hop': {
        // 蹦两下往台子后面走、越走越小（横着只挪一点）
        const q = clamp01(a.t / HOP_TIME)
        a.x = a.landAt.x + a.exitDir * g.u * 0.35 * q
        a.y = a.landAt.y - Math.abs(Math.sin(q * Math.PI * 2)) * g.u * 0.18 - (g.floorY - g.backY) * 0.9 * q
        a.scale = 0.42 * (1 - 0.35 * q)
        a.alpha = q < 0.6 ? 1 : 1 - (q - 0.6) / 0.4
        if (q >= 1) a.setMode('gone')
        break
      }
      case 'sit':
        a.y = animated ? g.u * 0.02 * Math.sin(Math.min(1, a.t / SIT_TIME) * Math.PI) : 0
        if (a.t >= SIT_TIME) a.setMode('pant')
        break
      case 'pant':
        if (this.ended && a.t >= PANT_TIME) a.setMode('bye')
        break
      case 'bye':
        if (a.t >= BYE_TIME) {
          a.setMode('run')
          if (animated && this.quality < 2) this.dropStars(lane, a, 3)
        }
        break
      case 'run': {
        // 一颠一颠往台子后面跑、越跑越小（横着只挪一点：两条道并排时不会撞到一起）
        const q = clamp01(a.t / RUN_TIME)
        a.x = a.exitDir * g.u * 0.3 * ease.inOutSine(q)
        a.y = -Math.abs(Math.sin(q * Math.PI * 3)) * g.u * 0.08 - (g.floorY - g.backY) * 1.1 * q
        a.alpha = q < 0.7 ? 1 : 1 - (q - 0.7) / 0.3
        a.scale = 1 - 0.4 * q
        if (q >= 1) a.setMode('gone')
        break
      }
      case 'fade': {
        const q = clamp01(a.t / FADE_TIME)
        a.scale = 1 - 0.5 * q
        a.alpha = 1 - q
        if (q >= 1) a.setMode('gone')
        break
      }
      default:
        break
    }
    if (a.tongueT >= 0) {
      a.tongueT += dt
      if (a.tongueT > 1) a.tongueT = -1
    }
    if (a.wiggleT >= 0) {
      a.wiggleT += dt
      if (a.wiggleT > 0.8) a.wiggleT = -1
    }
  }

  /** 泄气乱飞的一圈：从站位往上绕一圈半，落到背后那一侧 */
  flyPoint(lane: LaneState, a: DinoActor, q: number): { x: number; y: number } {
    const g = lane.geo
    const up = Math.sin(Math.PI * q) * g.u * 0.55
    const amp = Math.sin(Math.PI * q) * g.u * 0.32
    const ang = q * Math.PI * 3 * a.koDir
    let x = lerp(a.flyFrom.x, a.landAt.x, q) + Math.sin(ang) * amp
    const y = lerp(a.flyFrom.y, a.landAt.y, q) - up - (1 - Math.cos(ang)) * amp * 0.4
    const min = g.x0 - g.bossX + g.u * 0.2
    const max = g.x1 - g.bossX - g.u * 0.2
    x = clamp(x, min, max)
    return { x, y }
  }

  /** 泄气：气门往外喷一小团气 */
  private puff(lane: LaneState, a: DinoActor): void {
    const g = lane.geo
    const s = g.u * a.look.scale * a.scale
    this.particles.emit({
      x: g.bossX + a.x - g.facing * s * 0.4,
      y: g.floorY + a.y - s * 0.3,
      count: 1,
      speed: g.u * 0.4,
      angle: -Math.PI / 2,
      spread: Math.PI,
      life: 0.45,
      size: Math.max(3, s * 0.06),
      colors: ['#ffffff', '#f2eaff'],
      gravity: -g.u * 0.4,
      drag: 3,
    })
  }

  /** 打倒：布袋炸开，星星像烟花一样撒满舞台 */
  private burstSack(lane: LaneState, a: DinoActor): void {
    a.sackPuff.kick(1)
    if (!this.animated || this.quality >= 2) return
    const g = lane.geo
    const { x: sx, y: sy } = this.sackPoint(lane, a)
    for (let i = 0; i < KO_STARS; i++) {
      const ang = -Math.PI / 2 + (i / KO_STARS - 0.5) * Math.PI * 1.7 + (this.rng.next() - 0.5) * 0.3
      const speed = g.u * (2 + this.rng.next() * 1.4)
      this.addStar({
        x: sx,
        y: sy,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        rot: this.rng.next() * Math.PI,
        vr: (this.rng.next() - 0.5) * 9,
        r: g.boxerH * (0.06 + this.rng.next() * 0.04),
        age: 0,
        life: 1.2 + this.rng.next() * 0.5,
        color: STAR_COLORS[i % STAR_COLORS.length]!,
        gravity: g.u * 2.2,
      })
    }
  }

  /** 跑掉时布袋里掉出几颗星星 */
  private dropStars(lane: LaneState, a: DinoActor, n: number): void {
    const g = lane.geo
    const at = this.sackPoint(lane, a)
    for (let i = 0; i < n; i++) {
      this.addStar({
        x: at.x,
        y: at.y,
        vx: (this.rng.next() - 0.5) * g.u * 0.8,
        vy: -g.u * (0.6 + this.rng.next() * 0.5),
        rot: 0,
        vr: (this.rng.next() - 0.5) * 6,
        r: g.boxerH * 0.07,
        age: 0,
        life: 1.1,
        color: STAR_COLORS[i % STAR_COLORS.length]!,
        gravity: g.u * 2.6,
      })
    }
    a.starsDropped += n
  }

  private stepFighter(f: Fighter, dt: number): void {
    const lane = this.laneOf(f.side)
    const wdt = lane ? lane.wdt : dt
    const animated = this.animated
    const paused = this.phase === 'paused'
    // 上台 / 挪位置 / 下台按真实时间走
    this.stepGlide(f, dt)
    f.t += dt
    f.blink.step(dt)
    f.press.step(dt)
    // 暂停时放下拳头：蓄力的光、火焰光环都收起来
    f.glow += ((paused ? 0 : f.charge) - f.glow) * Math.min(1, dt * 14)
    // 火焰光环：最后 10 秒烧满一圈；平时连击到第 3 题起先冒一圈小的（M9、契约里的 streak）
    const fire = this.phase === 'ended' || paused ? 0 : this.lastTen ? 1 : f.streak >= FIRE_STREAK ? 0.55 : 0
    f.fire += (fire - f.fire) * Math.min(1, dt * 5)
    // 脚尖弹跳的节拍：倒数、最后 10 秒快一点；暂停时不弹
    if (animated && !paused) {
      const hz = this.phase === 'countdown' ? 3 : this.lastTen ? 3 : 2.2
      f.bounce = advancePhase(f.bounce, dt, hz)
    }
    // 出拳到命中这一段按真实时间走（M10：交卷只放「出拳」这一段，不被别人的顿帧拖住）；命中之后跟着这条道的顿帧 / 慢动作
    let adt = wdt
    const p = f.punch
    if (p) {
      adt = p.t < p.hitAt ? dt : wdt
      p.t += adt
      if (!p.impacted) {
        f.aim = this.aimOf(f, p)
        // 拳头先碰到挡在前面的泡泡（第 3 只）：「啪」地破掉，再打到肚子
        if (!p.popped && !p.echo && p.t >= p.hitAt * BUBBLE_POP_AT && lane) {
          p.popped = true
          this.popBubble(lane, lane.boss)
        }
        if (p.t >= p.hitAt) this.impact(f, p)
      }
      if (p.t >= PUNCH_TOTAL[p.move]) f.punch = null
    }
    if (f.missT >= 0) {
      f.missT += wdt
      if (f.missT >= MISS_TIME) f.missT = -1
    }
    // 跳起来举拳 / 击掌跟着这条道的慢动作走（打倒那一拳的慢动作里跳得也慢）
    if (f.cheerT >= 0) {
      f.cheerT += wdt
      if (f.cheerT >= (f.bumpCheer ? BUMP_CLIP_TIME + PUNCH_HOLD : CHEER_TIME)) f.cheerT = -1
    }
    if (f.hiT >= 0) {
      f.hiT += wdt
      if (f.hiT >= BUMP_CLIP_TIME + PUNCH_HOLD) f.hiT = -1
    }
    if (f.pokeT >= 0) {
      f.pokeT += dt
      if (f.pokeT >= FLEX_TIME) f.pokeT = -1
    }
    if (f.noseT >= 0) {
      f.noseT += dt
      if (f.noseT >= CLIPS.nose.dur) f.noseT = -1
    }
    if (f.finish) f.finishT += dt
    // 等题时隔几秒擦一下鼻子（正在按键、出拳、表演时不擦）
    if (this.phase === 'playing' && !f.punch && f.missT < 0 && f.cheerT < 0 && f.hiT < 0 && f.pokeT < 0 && f.noseT < 0 && !f.input && !f.finish) {
      f.noseWait -= dt
      if (f.noseWait <= 0) {
        f.noseT = 0
        f.noseWait = 5 + this.rng.next() * 5
      }
    }
    this.pickClip(f)
    // 叠加层：蓄力往后拉（权重 = 蓄了几格）、被吼的时候发抖
    f.anim.setLayer('charge', CHARGE_ADD, paused ? 0 : clamp01(f.glow / 3))
    f.anim.setLayer('tremble', animated && f.clipName === 'brace' ? TREMBLE_ADD : null, 1)
    f.anim.step(adt)
  }

  /** 被吼的时候这条道上的拳手往后仰（张嘴前一点点就开始，吼完就回来） */
  bracing(f: Fighter): boolean {
    const a = this.laneOf(f.side)?.boss
    return !!a && a.mode === 'roar' && a.t >= ROAR_OPEN - 0.05 && a.t < ROAR_END
  }

  /** 果冻球朝自己飞来：一低头躲开 */
  ducking(f: Fighter): boolean {
    const j = this.laneOf(f.side)?.jelly
    return !!j && j.target === f.id && (j.launched || j.t >= JELLY_THROW - 0.02) && j.t >= DUCK_FROM && j.t < DUCK_TO
  }

  /** 下一题答对就是旋风拳、正在按键：蓄力改成先原地转一圈、后手拉满（交卷时直接冲出去） */
  coiling(f: Fighter): boolean {
    return this.phase === 'playing' && f.input !== '' && f.streak + 1 >= SUPER_FROM
  }

  /**
   * 现在该放哪一段（M9）：正在出拳时不换（出拳的片段在 onHit 里就放上了；命中停一下之后要庆祝就直接淡到庆祝）；
   * 否则按优先级：挥空 → 时间到的收尾 → 打倒一只的庆祝 / 碰拳 → 合力拳后击掌 → 躲果冻球 → 被吼 → 被点一下 → 暂停 →
   * 蓄旋风拳 → 擦鼻子 → 倒数的准备 → 弹跳
   */
  private pickClip(f: Fighter): void {
    const p = f.punch
    if (p) {
      const celebrate = f.cheerT >= 0 || f.hiT >= 0 || f.finish !== null
      if (!(celebrate && p.impacted && p.t > p.hitAt + PUNCH_HOLD)) return
      f.punch = null
    }
    let name: ClipName = 'idle'
    let fade = 0.15
    if (f.glide && f.glide.kind !== 'move') {
      // 跳上台摆好架势、跳下台朝大家挥手
      name = f.glide.kind === 'enter' ? 'ready' : 'wave'
      fade = 0.1
    } else if (f.missT >= 0) {
      name = 'miss'
      fade = 0.04
    } else if (f.finish) {
      name = f.finish === 'cheer' ? 'win' : 'clap'
      fade = 0.2
    } else if (f.cheerT >= 0) {
      name = f.bumpCheer ? 'bump' : 'cheer'
      fade = 0.1
    } else if (f.hiT >= 0) {
      name = 'bump'
      fade = 0.08
    } else if (this.ducking(f)) {
      name = 'duck'
      fade = 0.08
    } else if (this.bracing(f)) {
      name = 'brace'
      fade = 0.08
    } else if (f.pokeT >= 0) {
      name = f.pokeKind
      fade = 0.12
    } else if (this.phase === 'paused') {
      name = 'rest'
      fade = 0.35
    } else if (this.coiling(f)) {
      name = 'coil'
      fade = 0.06
    } else if (f.noseT >= 0) name = 'nose'
    else if (this.phase === 'countdown') name = 'ready'
    if (name !== f.clipName) {
      f.anim.play(CLIPS[name], fade)
      f.clipName = name
    }
  }

  // —— 给渲染与测试：姿势与位置 ——

  /** 一只 Boss 这一刻画在哪、多大、什么姿势 */
  dinoPose(lane: LaneState, a: DinoActor): { x: number; y: number; s: number; pose: DinoPose } {
    const g = lane.geo
    const animated = this.animated
    const s = g.u * a.look.scale * a.scale
    const p: DinoPose = { ...DINO_REST, facing: g.facing, glint: a.clock }
    const sway = animated ? Math.sin(a.sway) * (a.low ? 0.03 : 0.055) * (this.phase === 'paused' ? 0.6 : 1) : 0
    p.tilt = a.tilt.value + sway
    const sq = a.squash.value
    p.sy = 1 - sq
    p.sx = 1 + sq * 0.6
    // 在空中（上勾拳打飞）：身子往上拉长一点
    if (a.air > 0) {
      const k = Math.min(1, a.air / (g.u * 0.2))
      p.sy *= 1 + 0.06 * k
      p.sx *= 1 - 0.04 * k
    }
    // 第 3 只吹泡泡：嘴撅成 o
    if (a.bubble === 'blow' && a.bubbleT < BUBBLE_BLOW * 0.6) p.gasp = 0.5
    p.spin = a.spin
    p.blink = a.blink.value
    p.squint = a.squint.value
    p.happy = a.giggle.value
    p.dizzy = a.low ? 1 : 0
    p.sweat = a.low ? 0.8 + 0.2 * Math.sin(a.clock * 3) : 0
    p.look = lane.lastFrom === g.facing ? 1 : -0.6
    p.sackPuff = a.sackPuff.value
    p.helmetTilt = a.look.hat === 'helmet' && a.hpRatio < 0.5 ? -0.35 : 0
    p.helmetOff = a.helmetOff
    p.beat = a.beat
    p.tail = animated ? Math.sin(a.clock * 2.4) * 0.03 : 0
    p.alpha = a.alpha
    // 退场的（乱飞、瘪了、缩小蹦走）画简化版：动得快、看不清细节，省下绘制调用
    p.lite = a.mode === 'fly' || a.mode === 'flat' || a.mode === 'small' || a.mode === 'hop' || a.mode === 'fade'
    let lift = 0
    // 叉腰做鬼脸（登场）/ 做鬼脸（挥空之后）
    if (a.mode === 'land') {
      const q = clamp01(a.t / LAND_TIME)
      p.hips = Math.min(1, q * 4)
      p.tongue = q > 0.2 ? 1 : 0
      p.wink = q > 0.2 ? 1 : 0
    }
    if (a.faceT >= 0) {
      const env = Math.sin(Math.PI * clamp01(a.faceT / 0.9))
      p.tongue = Math.max(p.tongue, env)
      p.wink = env > 0.3 ? 1 : 0
      p.hips = Math.max(p.hips, env)
    }
    if (a.tongueT >= 0) p.tongue = Math.max(p.tongue, Math.sin(Math.PI * clamp01(a.tongueT)))
    if (a.wiggleT >= 0 && animated) {
      const env = Math.sin(Math.PI * clamp01(a.wiggleT / 0.8))
      p.tilt += Math.sin(a.wiggleT * 28) * 0.1 * env
      p.tail += Math.sin(a.wiggleT * 28) * 0.06 * env
    }
    switch (a.mode) {
      case 'dance': {
        const q = a.t / DANCE_TIME
        const env = Math.sin(Math.PI * clamp01(q))
        p.up = env
        p.tongue = Math.max(p.tongue, env)
        p.wink = env > 0.3 ? 1 : 0
        p.tail += Math.sin(a.t * 14) * 0.08 * env
        if (animated) {
          p.tilt += Math.sin(a.t * 7) * 0.14 * env
          lift = Math.abs(Math.sin(a.t * 7)) * g.u * 0.07 * env
        }
        break
      }
      case 'roar': {
        // 吸一口气（胸口鼓起来、往后仰）→ 张大嘴朝前吼（两只爪子举起来、眯眼、浑身发抖）→ 收
        const t = a.t
        const inhale = clamp01(t / ROAR_OPEN)
        const open = t < ROAR_OPEN ? 0 : t < ROAR_END ? clamp01((t - ROAR_OPEN) / 0.08) : 1 - clamp01((t - ROAR_END) / (ROAR_TIME - ROAR_END))
        p.sy *= 1 + 0.05 * inhale * (1 - open)
        p.tilt += -g.facing * 0.08 * inhale * (1 - open) + g.facing * 0.1 * open
        p.roar = open
        p.squint = Math.max(p.squint, open)
        p.up = Math.max(p.up, open * 0.8)
        p.tail += Math.sin(t * 20) * 0.05 * open
        if (animated) p.tilt += Math.sin(t * 60) * 0.02 * open
        break
      }
      case 'jelly': {
        // 回头伸手到布袋里掏 → 举过头顶往前扔 → 得意地吐舌头
        const arm = jellyArm(a.t)
        p.grab = arm.grab
        p.toss = arm.toss
        p.look = arm.grab > 0.3 ? -1 : 1
        p.tilt += -g.facing * 0.06 * arm.grab + g.facing * 0.1 * arm.toss
        if (a.t > JELLY_THROW) {
          p.happy = Math.max(p.happy, 0.6)
          p.tongue = Math.max(p.tongue, Math.sin(Math.PI * clamp01((a.t - JELLY_THROW) / (JELLY_BOSS_TIME - JELLY_THROW))))
        }
        break
      }
      case 'reel':
      case 'koWait':
        if (a.mode === 'reel') {
          p.dizzy = 1
          p.gasp = 1
          p.flail = 1
        }
        break
      case 'fly': {
        const q = clamp01(a.t / FLY_TIME)
        p.dizzy = 1
        p.gasp = 1
        p.flail = 1
        p.deflate = q * 0.85
        p.tilt = a.tilt.value + q * Math.PI * 4 * a.koDir
        p.sx *= 1 - 0.1 * q
        break
      }
      case 'flat':
        p.dizzy = 1
        p.deflate = 1
        p.sy = 0.32
        p.sx = 1.45
        p.tilt = 0
        break
      case 'small':
      case 'hop':
        // 缩成一小只挥手和好：不晕了、不冒汗了
        p.wave = 1
        p.happy = 1
        p.dizzy = 0
        p.sweat = 0
        p.deflate = 0.2
        if (a.mode === 'hop') p.facing = a.exitDir
        break
      case 'sit':
      case 'pant': {
        // 一屁股坐下：往后一仰、脚伸到前面翘起来、身子矮一截，喘气时一鼓一鼓
        const q = a.mode === 'sit' ? ease.outBack(clamp01(a.t / SIT_TIME)) : 1
        p.sit = q
        p.sy *= 1 - 0.16 * q
        p.sx *= 1 + 0.08 * q
        p.tilt -= g.facing * 0.12 * q
        p.tongue = a.mode === 'pant' ? 1 : 0
        p.sweat = 1
        p.blink = 0
        p.dizzy = 0
        p.happy = a.mode === 'pant' ? 0.5 : 0
        if (a.mode === 'pant' && animated) p.sy *= 1 + 0.045 * Math.sin(a.t * 18)
        break
      }
      case 'bye':
        p.sit = 1 - clamp01(a.t / BYE_TIME)
        p.wave = 1
        p.happy = 1
        p.dizzy = 0
        p.sy *= 0.88
        break
      case 'run':
        p.facing = a.exitDir
        p.happy = 1
        p.dizzy = 0
        p.wave = 0.6
        break
      case 'fade':
        p.dizzy = 1
        break
      default:
        break
    }
    return { x: g.bossX + a.x + a.push.value, y: g.floorY + a.y - lift - a.air, s, pose: p }
  }

  /**
   * 一个拳手这一刻的姿势（拳套位置按身高、本地朝右）与画的位置：动作片段播放器给出各通道（M13），这里把它们解算成
   * 能画的样子——弹跳的节拍、出拳那只手往 Boss 身上伸（勾拳的弧、上勾拳从下往上）、另一只手护住下巴、残影
   */
  boxerPose(f: Fighter): { x: number; y: number; b: number; pose: BoxerPose } {
    const animated = this.animated
    const q = f.anim.pose()
    const lead: Glove = { x: q.lx!, y: q.ly!, s: q.ls! }
    const rear: Glove = { x: q.rx!, y: q.ry!, s: q.rs! }
    // 等题：脚尖弹跳、左右晃拳（节拍是模型的时钟：脚、身子、拳头对得上拍）
    const hop = animated ? clamp01(q.bounce!) : 0
    if (hop > 0) {
      lead.y += Math.sin(f.bounce * 2) * 0.012 * hop
      rear.y += Math.sin(f.bounce * 2 + 1.3) * 0.012 * hop
      lead.x += Math.sin(f.bounce * 0.5 + 0.6) * 0.03 * hop
      rear.x -= Math.sin(f.bounce * 0.5 + 0.6) * 0.02 * hop
    }
    // 减少动画：往前冲只挪一半（小幅位移）
    const dx = animated ? q.dx! : q.dx! * 0.5
    this.reach(f, q, lead, rear, dx)
    const p: BoxerPose = {
      dir: f.dir,
      lean: q.lean!,
      spin: animated ? q.spin! : 0,
      turn: q.turn!,
      twist: q.twist!,
      sx: q.sx!,
      sy: q.sy!,
      lead,
      rear,
      trail: [],
      trailArm: f.punchArm === 0 ? 'lead' : 'rear',
      trailAlpha: 0,
      charge: f.glow,
      pips: this.phase === 'paused' ? 0 : f.charge,
      blink: f.blink.value,
      happy: q.happy!,
      wide: q.wide!,
      grit: q.grit!,
      squint: q.squint!,
      blow: q.blow!,
      dizzy: q.dizzy!,
      t: f.t,
      fire: f.fire,
      stance: this.phase === 'countdown' ? Math.max(1, q.stance!) : q.stance!,
      step: animated ? f.bounce : 0,
      hop,
      swirl: animated ? q.swirl! : 0,
      alpha: f.alpha,
    }
    // 拳套拖出残影（出拳那一小段）：按这一招的路线往回取几个位置，直拳是一条直线、勾拳一道弧、上勾拳从下往上、旋风拳又多又大
    const pu = f.punch
    if (pu && animated && this.quality < 2 && pu.t < pu.hitAt + 0.1) {
      const c = CLIPS[f.clipName]
      const tr: Glove[] = []
      for (const back of TRAIL[pu.move]) {
        const tt = pu.t - back
        if (tt < 0) continue
        const qq = sampleClip(c, tt, BOXER_REST, this.trailPose)
        const gl: Glove = pu.arm === 0 ? { x: qq.lx!, y: qq.ly!, s: qq.ls! } : { x: qq.rx!, y: qq.ry!, s: qq.rs! }
        this.reachOne(f, qq, gl, qq.dx!)
        tr.push(gl)
      }
      p.trail = tr
      p.trailAlpha = tr.length ? 1 : 0
    }
    const lift = animated ? (Math.abs(Math.sin(f.bounce)) * 0.04 * hop + q.lift!) * f.b : 0
    return { x: f.x + dx * f.b * f.dir, y: f.y - lift - f.hopY, b: f.b, pose: p }
  }

  /** 出拳那只手：从护架的位置往目标伸 ext、再沿路线偏 (ax, ay)、放大 ps（目标里扣掉往前冲的那一步，拳头陷进肚子一点） */
  private reachOne(f: Fighter, q: Pose, g: Glove, dx: number): void {
    const ext = q.ext!
    if (ext === 0 && q.ax === 0 && q.ay === 0 && q.ps === 0) return
    const tx = f.aim.x - dx * 0.6
    const ty = f.aim.y
    g.x += (tx - g.x) * ext + q.ax!
    g.y += (ty - g.y) * ext + q.ay!
    g.s *= 1 + q.ps!
  }

  private reach(f: Fighter, q: Pose, lead: Glove, rear: Glove, dx: number): void {
    this.reachOne(f, q, f.punchArm === 0 ? lead : rear, dx)
    // 另一只手收到下巴护住
    const tuck = q.tuck!
    if (tuck > 0) {
      const o = f.punchArm === 0 ? rear : lead
      o.x += (0.16 - o.x) * tuck
      o.y += (-0.84 - o.y) * tuck
    }
  }

  /** 拳头往哪儿打（单位 = 身高、本地朝右）：这一拳记下的命中点，或者这条道的 Boss 肚子 */
  aimOf(f: Fighter, p?: Punch): { x: number; y: number } {
    const lane = this.laneOf(p?.side ?? f.side)
    const tgt = p?.target ?? this.punchTarget(f, lane)
    return { x: clamp(((tgt.x - f.x) * f.dir) / f.b, 0.3, 1.3), y: clamp((tgt.y - f.y) / f.b, -1.1, -0.35) }
  }

  /** 拳头往哪儿打：这条道的 Boss 肚子（Boss 没在台上就打它该站的地方） */
  punchTarget(f: Fighter, lane: LaneState | undefined): { x: number; y: number } {
    if (!lane) return { x: f.x + f.dir * f.b * 0.6, y: f.y - f.b * 0.62 }
    const a = lane.boss && lane.boss.visible ? lane.boss : null
    if (a) return this.bellyPoint(lane, a, -f.dir)
    const g = lane.geo
    return { x: g.bossX - f.dir * g.u * 0.27, y: g.floorY - g.u * 0.36 }
  }

  // —— 占地（测试用：都在画面里） ——

  fighterBox(id: string): Box | null {
    const f = this.fighter(id)
    if (!f) return null
    const b = f.b
    const front = 0.4 * b
    const back = 0.24 * b
    return {
      x0: f.x - (f.dir === 1 ? back : front),
      x1: f.x + (f.dir === 1 ? front : back),
      y0: f.y - boxerTop(f.kind) * b,
      y1: f.y + 0.01 * b,
    }
  }

  /** Boss 站着时的占地（按这一只的样子与头上的帽子） */
  bossBox(side: BossSide, level?: number): Box | null {
    const lane = this.laneOf(side)
    if (!lane) return null
    const g = lane.geo
    const look = dinoLook(level ?? lane.boss?.level ?? lane.stateLevel)
    const s = g.u * look.scale
    const left = (g.facing === -1 ? DINO_FRONT : DINO_BACK) * s
    const right = (g.facing === -1 ? DINO_BACK : DINO_FRONT) * s
    return { x0: g.bossX - left, x1: g.bossX + right, y0: g.floorY - dinoTop(look) * s, y1: g.floorY }
  }

  barBox(side: BossSide): Box | null {
    const lane = this.laneOf(side)
    if (!lane) return null
    const b = lane.geo.bar
    return {
      x0: b.iconX - b.iconR,
      x1: b.x + b.w,
      y0: Math.min(b.iconY - b.iconR, b.y),
      y1: Math.max(b.iconY + b.iconR, b.dotY + b.dotR),
    }
  }
}
