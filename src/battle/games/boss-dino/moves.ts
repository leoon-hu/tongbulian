/**
 * 拳手的动作片段（需求 M9 / M10 / M13）：用骨骼姿势片段（engine/skeleton.ts）按数据写，模型只管「现在该放哪一段」。
 * 通道（单位 = 拳手身高，本地朝右、脚下为原点）：
 * - lx / ly / ls、rx / ry / rs：前手 / 后手拳套的位置与大小（护架）；
 * - ext / ax / ay / ps：出拳那只手往目标伸出去多少（0…1，1 = 正打在 Boss 肚子上）、在这条线上再偏多少（勾拳横着抡的弧、
 *   上勾拳从下往上）、拳套放大多少——目标随 Boss 在哪变，所以拳头的路线在模型里按目标解算，片段只写「伸多少、偏多少」；
 *   tuck：另一只手收到下巴护住；
 * - lean 前倾（弧度）、spin 原地转几圈、turn 转向观众、twist 身子扭过去（勾拳）、sx / sy 压扁拉长（蹲）、dx 往前冲一步、lift 跳多高；
 * - bounce：脚尖弹跳的权重（弹跳的节拍由模型按时钟算，脚和身子才对得上拍）；stance 两脚分开多少；
 * - happy / wide / grit / squint / dizzy 表情，blow 耳朵和护头带子被吹向后，swirl 旋风拳身边的风圈。
 * 关键帧的时刻按契约里的 HIT_AT 算：改了命中时刻，片段跟着变，拳头总是在那一刻正好打到。
 */
import { HIT_AT } from '@/battle/game/boss-contract'
import { clip, type Clip, type Keyframe, type Pose } from '@/battle/game/engine/skeleton'
import { ease } from '@/battle/game/engine/tween'
import type { PunchMove } from '@/battle/timed'

export const BOXER_REST: Readonly<Pose> = Object.freeze({
  lx: 0.32,
  ly: -0.78,
  ls: 1,
  rx: 0.2,
  ry: -0.6,
  rs: 1,
  lean: 0,
  spin: 0,
  turn: 0,
  twist: 0,
  sx: 1,
  sy: 1,
  dx: 0,
  lift: 0,
  bounce: 0,
  stance: 0.6,
  ext: 0,
  ax: 0,
  ay: 0,
  ps: 0,
  tuck: 0,
  happy: 0,
  wide: 0,
  grit: 0,
  squint: 0,
  dizzy: 0,
  blow: 0,
  swirl: 0,
})

const out = ease.outQuad
const sine = ease.inOutSine
const inQ = (t: number): number => t * t

/** 一拳从出拳到回到站姿多久（秒）：命中之后停一下、收回来、再落回弹跳 */
export const PUNCH_TOTAL: Record<PunchMove, number> = { jab: 0.6, hook: 0.66, upper: 0.68, super: 0.8 }

function k(t: number, p: Pose, e?: (u: number) => number): Keyframe {
  return e ? { t, p, e } : { t, p }
}

/** 收拳：命中后停 hold 秒（笑一下），再用 back 秒把这些通道收回站姿 */
function recover(h: number, hold: number, back: number, total: number, at: Pose): Keyframe[] {
  const zero: Pose = {}
  for (const c in at) zero[c] = BOXER_REST[c] ?? 0
  return [k(h + hold, { ...at, happy: 1, grit: 0 }), k(h + hold + back, { ...zero, happy: 0.6 }, sine), k(total, { ...zero, bounce: 1, happy: 0 }, sine)]
}

function makeMoves(hit: Record<PunchMove, number>) {
  const J = hit.jab
  const H = hit.hook
  const U = hit.upper
  const S = hit.super
  // 直拳：前冲一步、手臂打直（第一帧就伸出一截，M10：交卷到拳头开始动 ≤ 50 ms）
  const jabAt: Pose = { ext: 1, dx: 0.13, lean: 0.14, tuck: 0.6 }
  const jab = clip(PUNCH_TOTAL.jab, [
    k(0, { ext: 0.3, dx: 0.04, lean: 0.05, grit: 1, tuck: 0.3 }),
    k(J, { ...jabAt, grit: 1 }, out),
    ...recover(J, 0.05, 0.26, PUNCH_TOTAL.jab, jabAt),
  ])
  // 勾拳：身子扭过去，拳头先往后上方拉、再横着抡一道弧（抡到半路离镜头近、拳套大一点）打到侧面
  const hookAt: Pose = { ext: 1, ax: 0, ay: 0, ps: 0.12, twist: 1, lean: 0.18, dx: 0.09, tuck: 1 }
  const hook = clip(PUNCH_TOTAL.hook, [
    k(0, { ext: 0.12, ax: -0.1, ay: -0.12, twist: 0.35, lean: -0.03, grit: 1, tuck: 0.6 }),
    k(H * 0.45, { ext: 0.5, ax: 0.02, ay: -0.3, ps: 0.35, twist: 0.8, lean: 0.06, dx: 0.04, grit: 1, tuck: 1 }, out),
    k(H, { ...hookAt, grit: 1 }, sine),
    ...recover(H, 0.06, 0.3, PUNCH_TOTAL.hook, hookAt),
  ])
  // 上勾拳：先蹲下去（拳头落到腰下），再整个人往上一窜、从下往上打，打完脚尖离地
  const upperAt: Pose = { ext: 1, ay: 0, ax: 0, sy: 1.07, sx: 0.95, lift: 0.1, lean: 0.03, tuck: 1 }
  const upper = clip(PUNCH_TOTAL.upper, [
    k(0, { ext: 0.04, ay: 0.08, sy: 0.95, sx: 1.03, lean: 0.07, grit: 1, tuck: 0.5 }),
    k(U * 0.42, { ext: 0.12, ay: 0.32, ax: -0.05, sy: 0.83, sx: 1.1, lean: 0.17, grit: 1, tuck: 1 }, out),
    k(U, { ...upperAt, grit: 1 }, out),
    k(U + 0.1, { ...upperAt, lift: 0.15, happy: 1 }, out),
    k(U + 0.34, { ext: 0.15, ay: 0, sy: 1, sx: 1, lift: 0, lean: 0, tuck: 0.3, happy: 0.6 }, inQ),
    k(PUNCH_TOTAL.upper, { ext: 0, tuck: 0, bounce: 1 }, sine),
  ])
  // 旋风拳（没蓄好力：选择题、或者按键时还不知道下一拳是它）：原地飞快转一圈 → 冲刺 → 超大拳套
  // 转一圈（spin 0 → 1）转完那一刻跳回 0：同一时刻两帧 = 一步跳过去（转一整圈和没转看起来一样），之后淡回站姿时不会倒着再转一圈
  const superAt: Pose = { ext: 1, ps: 0.75, dx: 0.3, lean: 0.24, swirl: 0.8, tuck: 1 }
  const spun: Pose = { ext: 0.2, ps: 0.45, sy: 0.93, dx: 0.05, swirl: 1, grit: 1, tuck: 1 }
  const superSpin = clip(PUNCH_TOTAL.super, [
    k(0, { spin: 0, ext: 0.08, ps: 0.2, swirl: 1, grit: 1, tuck: 0.5 }),
    k(S * 0.5, { ...spun, spin: 1 }),
    k(S * 0.5, { ...spun, spin: 0 }),
    k(S, { ...superAt, grit: 1 }, out),
    k(S + 0.08, { ...superAt, happy: 1, grit: 0 }),
    k(S + 0.44, { ext: 0, ps: 0, dx: 0, lean: 0, swirl: 0, tuck: 0, happy: 0.6 }, sine),
    k(PUNCH_TOTAL.super, { bounce: 1 }, sine),
  ])
  // 旋风拳（按键时已经转过一圈、拉满了后手，coil）：直接从后面冲出去
  const coiled: Pose = { rx: -0.12, ry: -0.72, rs: 1.3, lx: 0.24, ly: -0.86, sy: 0.92, lean: -0.1, swirl: 0.6, stance: 1 }
  const superCoiled = clip(PUNCH_TOTAL.super, [
    k(0, { ...coiled, ext: 0.04, grit: 1 }),
    k(S * 0.45, { ext: 0.3, dx: 0.12, lean: 0.12, sy: 1, rs: 1.2, swirl: 1, grit: 1, tuck: 1, stance: 1 }, out),
    k(S, { ...superAt, grit: 1, stance: 0.8 }, out),
    k(S + 0.08, { ...superAt, happy: 1, grit: 0 }),
    k(S + 0.44, { ext: 0, ps: 0, dx: 0, lean: 0, swirl: 0, tuck: 0, happy: 0.6 }, sine),
    k(PUNCH_TOTAL.super, { bounce: 1 }, sine),
  ])
  return { jab, hook, upper, superSpin, superCoiled, coiled }
}

const M = makeMoves(HIT_AT)

/** 挥空一整段多久（答错的反馈窗口也是 1.2 秒） */
export const MISS_CLIP_TIME = 1.2
export const CHEER_CLIP_TIME = 0.9
export const BUMP_CLIP_TIME = 0.8
export const FLEX_CLIP_TIME = 1.2
/** 蓄旋风拳：转一圈用多久 */
export const COIL_SPIN_TIME = 0.32

export const CLIPS = {
  /** 等题 / 读题：脚尖弹跳、左右晃拳（节拍由模型算） */
  idle: clip(1, [k(0, { bounce: 1 })], true),
  /** 倒数：两脚分得更开、弹跳 */
  ready: clip(1, [k(0, { bounce: 1, stance: 1 })], true),
  /** 暂停：拳头放下、轻轻呼吸，不弹跳 */
  rest: clip(
    3,
    [
      k(0, { lx: 0.22, ly: -0.55, rx: 0.12, ry: -0.5, stance: 0.3, sy: 1 }),
      k(1.5, { lx: 0.22, ly: -0.54, rx: 0.12, ry: -0.49, stance: 0.3, sy: 1.018, lean: -0.012 }, sine),
      k(3, { lx: 0.22, ly: -0.55, rx: 0.12, ry: -0.5, stance: 0.3, sy: 1 }, sine),
    ],
    true,
  ),
  /** 偶尔擦一下鼻子（得意） */
  nose: clip(1, [
    k(0, { bounce: 0.6 }),
    k(0.18, { lx: 0.12, ly: -0.84, bounce: 0.3, happy: 0.4 }, out),
    k(0.3, { lx: 0.17, ly: -0.82, bounce: 0.3, happy: 0.5 }),
    k(0.42, { lx: 0.1, ly: -0.85, bounce: 0.3, happy: 0.5 }),
    k(0.56, { lx: 0.16, ly: -0.83, bounce: 0.3, happy: 0.5 }),
    k(1, { bounce: 1 }, sine),
  ]),
  jab: M.jab,
  hook: M.hook,
  upper: M.upper,
  superSpin: M.superSpin,
  superCoiled: M.superCoiled,
  /** 下一拳就是旋风拳、正在按键：先原地转一圈，后手拉满、拳套变大，憋着 */
  coil: clip(0.6, [
    k(0, { spin: 0, swirl: 0.3 }),
    k(COIL_SPIN_TIME, { ...M.coiled, spin: 1, swirl: 1 }, sine),
    k(COIL_SPIN_TIME, { ...M.coiled, spin: 0, swirl: 1 }),
    k(0.6, { ...M.coiled }),
  ]),
  /** 挥空：拳头擦着 Boss 头顶过去 → 自己转一圈 → 头上转星星、甩甩头 → 回到准备姿势 */
  miss: clip(MISS_CLIP_TIME, [
    k(0, { ext: 0.3, ay: -0.1, grit: 1 }),
    k(0.15, { ext: 1.05, ay: -0.55, lean: 0.16, dx: 0.08, grit: 1 }, out),
    k(0.2, { ext: 1, ay: -0.5, lean: 0.14, dx: 0.08, wide: 1, spin: 0.05 }),
    k(0.55, { ext: 0, ay: 0, lean: 0, dx: 0, wide: 1, spin: 1 }),
    k(0.55, { wide: 1, spin: 0 }),
    k(0.62, { wide: 1, dizzy: 1 }),
    k(0.74, { wide: 0.5, dizzy: 1, lean: 0.1 }),
    k(0.86, { dizzy: 0.9, lean: -0.1 }),
    k(0.98, { dizzy: 0.6, lean: 0.07 }),
    k(1.1, { dizzy: 0.2, lean: -0.03 }),
    k(MISS_CLIP_TIME, { dizzy: 0, bounce: 1 }),
  ]),
  /** 打倒一只（台上只有自己）：跳起来、两只拳头从头两边举起来 */
  cheer: clip(CHEER_CLIP_TIME, [
    k(0, { turn: 0.2 }),
    k(0.15, { lift: 0.2, lx: 0.4, ly: -1.16, rx: -0.3, ry: -1.1, turn: 0.6, happy: 1 }, out),
    k(0.35, { lift: 0.32, lx: 0.42, ly: -1.2, rx: -0.3, ry: -1.14, turn: 0.6, happy: 1 }, out),
    k(0.6, { lift: 0, lx: 0.4, ly: -1.16, rx: -0.3, ry: -1.1, turn: 0.6, happy: 1 }, inQ),
    k(CHEER_CLIP_TIME, { lx: 0.4, ly: -1.12, rx: -0.3, ry: -1.06, turn: 0.5, happy: 1 }),
  ]),
  /** 和队友碰拳 / 合力拳击掌：跳一下，把前手朝队友那边高高举过去（两只拳在 Boss 头顶上方相碰的地方闪一下，模型画） */
  bump: clip(BUMP_CLIP_TIME, [
    k(0, {}),
    k(0.14, { lift: 0.12, lx: 0.5, ly: -1.1, ls: 1.1, rx: 0.12, ry: -0.82, turn: 0.15, lean: 0.06, happy: 1 }, out),
    k(0.3, { lift: 0.2, lx: 0.56, ly: -1.2, ls: 1.15, rx: 0.1, ry: -0.86, turn: 0.15, lean: 0.08, happy: 1 }, out),
    k(0.5, { lift: 0, lx: 0.48, ly: -1.12, ls: 1.1, rx: 0.12, ry: -0.82, turn: 0.15, happy: 1 }, inQ),
    k(BUMP_CLIP_TIME, { happy: 0.6, bounce: 1 }, sine),
  ]),
  /** 时间到（一起打、各打各的赢了、平局）：举起双拳面向观众，一蹦一蹦 */
  win: clip(
    0.64,
    [
      k(0, { turn: 1, lx: 0.42, ly: -1.14, rx: -0.4, ry: -1.14, happy: 1 }),
      k(0.32, { turn: 1, lx: 0.44, ly: -1.2, rx: -0.42, ry: -1.2, happy: 1, lift: 0.16 }, out),
      k(0.64, { turn: 1, lx: 0.42, ly: -1.14, rx: -0.4, ry: -1.14, happy: 1 }, inQ),
    ],
    true,
  ),
  /** 各打各的输了：面向观众给赢的一边拍手 */
  clap: clip(
    0.4,
    [
      k(0, { turn: 1, lx: 0.1, ly: -0.74, rx: -0.06, ry: -0.74, happy: 1 }),
      k(0.2, { turn: 1, lx: 0.18, ly: -0.74, rx: -0.14, ry: -0.74, happy: 1 }, sine),
      k(0.4, { turn: 1, lx: 0.1, ly: -0.74, rx: -0.06, ry: -0.74, happy: 1 }, sine),
    ],
    true,
  ),
  /** 被点一下（单数次）：秀肌肉 */
  flex: clip(FLEX_CLIP_TIME, [
    k(0, {}),
    k(0.3, { lx: 0.3, ly: -0.98, rx: -0.28, ry: -0.98, turn: 0.7, happy: 1, lean: -0.05, sy: 1.03 }, out),
    k(0.55, { lx: 0.32, ly: -1.0, rx: -0.3, ry: -1.0, turn: 0.7, happy: 1, lean: -0.05, sy: 1.05 }),
    k(0.8, { lx: 0.3, ly: -0.98, rx: -0.28, ry: -0.98, turn: 0.7, happy: 1, lean: -0.05, sy: 1.03 }),
    k(FLEX_CLIP_TIME, { bounce: 1 }, sine),
  ]),
  /** 被点一下（双数次）：朝大家挥手 */
  wave: clip(FLEX_CLIP_TIME, [
    k(0, {}),
    k(0.2, { lx: 0.34, ly: -1.18, turn: 0.7, happy: 1 }, out),
    k(0.38, { lx: 0.48, ly: -1.16, turn: 0.7, happy: 1 }, sine),
    k(0.56, { lx: 0.3, ly: -1.2, turn: 0.7, happy: 1 }, sine),
    k(0.74, { lx: 0.48, ly: -1.16, turn: 0.7, happy: 1 }, sine),
    k(0.9, { lx: 0.34, ly: -1.18, turn: 0.7, happy: 1 }, sine),
    k(FLEX_CLIP_TIME, { bounce: 1 }, sine),
  ]),
  /** Boss 吼：往后仰、眯眼、拳头挡在脸前，耳朵和护头带子被吹向后（吼完由模型淡回站姿） */
  brace: clip(0.14, [k(0, {}), k(0.14, { lean: -0.24, squint: 1, blow: 1, lx: 0.2, ly: -0.94, rx: 0.1, ry: -0.9, dx: -0.05, sy: 0.97 }, out)]),
  /** 果冻球飞来：一低头蹲下去躲开，拳头护住脑袋 */
  duck: clip(0.16, [k(0, {}), k(0.16, { sy: 0.72, sx: 1.1, lean: 0.4, lx: 0.24, ly: -0.74, rx: 0.12, ry: -0.72, wide: 1, dx: -0.03 }, out)]),
} as const satisfies Record<string, Clip>

export type ClipName = keyof typeof CLIPS

/** 出拳用哪一段：旋风拳蓄好了力（转过一圈）就直接冲出去 */
export function punchClip(move: PunchMove, coiled: boolean): ClipName {
  if (move === 'super') return coiled ? 'superCoiled' : 'superSpin'
  return move
}

// —— 叠加层 ——

/** 蓄力：护架往后拉、身子往后坐、咬牙（权重 = 蓄了几格 / 3） */
export const CHARGE_ADD = clip(1, [k(0, { lx: -0.07, ly: -0.03, rx: -0.06, ry: -0.01, lean: -0.08, grit: 1, sy: -0.02 })], true)
/** 按一下键：拳套抖一下、亮一下（大一点） */
export const PRESS_ADD = clip(0.14, [
  k(0, { lx: 0.026, ly: 0.012, ls: 0.1 }),
  k(0.035, { lx: -0.02, ly: -0.01, ls: 0.06 }),
  k(0.07, { lx: 0.012, ly: 0.006, ls: 0.03 }),
  k(0.105, { lx: -0.006, ly: -0.003 }),
  k(0.14, { lx: 0, ly: 0, ls: 0 }),
])
/** 被吼的时候身子发抖 */
export const TREMBLE_ADD = clip(0.1, [k(0, { lean: 0.018, dx: 0.006 }), k(0.05, { lean: -0.018, dx: -0.006 }), k(0.1, { lean: 0.018, dx: 0.006 })], true)
