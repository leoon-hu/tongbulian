import type { Difficulty, GeoFig, GeoItem, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { type P, W, arcPts, chain, clean, decQ, dimLine, fitFig, fmt, geoPart, judge, numQ, pickWord, poly, text, valQ } from './circle'

// ─────────────────────────────────────────────────────────────
// ☆ 体育中的数学（六上，第 74–78 页，综合与实践；六年级数学 D）：研究 400 米跑的起跑线怎样设置——
// 跑道两头是半圆形弯道，两个弯道合起来是一个圆；终点相同，外圈跑的路长，所以外圈的起跑线往前移；
// 课本的数据：直道 85.96 米、第一道两个弯道合成的圆直径 72.6 米（全长 400 米）、跑道宽 1.22 米、π 取 3.14159（全书只有这里）；
// 每往外一道，直径多 2 × 1.22 = 2.44 米，一圈多 2.44 × 3.14159 ≈ 7.67 米（不用算出每条跑道的长度也知道相差多少）。
// 题目照课本的数据出（选项写「大约」的结果，保留两位小数），另备道宽 1 米、π 取 3.14 的简单数据（题里写清楚 π 取多少）。
// 交流分享里另外两个小组的话题（铅球场地由圆和扇形组成、16 支队伍循环赛的场次）和 200 米跑（只过一个弯道）放第 2 档，
// 是我们加的延伸，等用户核；确定主题、收集信息、活动记录单、自评、篮球命中率（百分数下一单元才学）、跳水算分、1000 米跑不出。
// 朗读：序数写汉字（第一道、第三道，词条里注音）；不说「最长」「全长」「只」「得」，说「最远」「一圈的长度」。
// ─────────────────────────────────────────────────────────────

const KP = 'm6s1-06-sports'
/** 课本表下注的「π 取 3.14159」 */
const PI5 = 3.14159
const STRAIGHT = 85.96
const D1 = 72.6
const LANE = 1.22
/** 第 n 道两个弯道合成的圆的直径（米） */
const laneD = (n: number): number => clean(D1 + 2 * LANE * (n - 1))
/** 保留两位小数 */
const r2 = (x: number): number => Math.round(x * 100) / 100
const lane = (n: number): LStr => W(`m6.sport.lane${n}`)

/** 跑道平面图：中间草坪（两个半圆 + 长方形）、外面 lanes 条跑道；labels = 标上 72.6 m（直径）和 85.96 m（直道） */
export function trackFig(labels: boolean, lanes = 4): GeoFig {
  const Ls = 120
  const Rf = 44
  const lw = 9
  const stadium = (rho: number): P[] => chain(arcPts([Ls / 2, 0], rho, -90, 90), arcPts([-Ls / 2, 0], rho, 90, 270))
  const items: GeoItem[] = [poly(stadium(Rf + lanes * lw), { fill: 'd', stroke: 'd' })]
  for (let k = 1; k < lanes; k++) items.push(poly(stadium(Rf + k * lw), { stroke: 'soft' }))
  items.push(poly(stadium(Rf), { fill: 'c', stroke: 'd' }))
  if (labels) {
    items.push(dimLine([Ls / 2, -Rf], [Ls / 2, Rf], `${D1} m`, 0), dimLine([-Ls / 2, Rf + lanes * lw], [Ls / 2, Rf + lanes * lw], `${STRAIGHT} m`, -14))
  }
  return fitFig(items, 14)
}
const trackPart = (labels: boolean): ReturnType<typeof geoPart> => geoPart([trackFig(labels)], '400 米跑道的平面图：两头是半圆形的弯道，中间是两条直道')

// ── 第 1 档 ──

/** 分析问题：跑道两头是半圆形，合起来是一个圆 */
function genShape(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP, d, rng, 'shape', [text('m6.sport.shapeQ'), trackPart(false)], W('m6.sport.w.semi'), [W('m6.sport.w.rect'), W('m6.sport.w.tri')])
  return pickWord(KP, d, rng, 'whole', [text('m6.sport.wholeQ'), trackPart(false)], W('m6.sport.w.circle'), [W('m6.sport.w.rect'), W('m6.sport.w.square')])
}
/** 分析问题：终点相同，外圈跑的路远，起跑线往前移 */
function genWhy(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP, d, rng, 'far', [text('m6.sport.farQ')], W('m6.sport.w.outer'), [W('m6.sport.w.inner'), W('m6.sport.w.same')])
  return judge(KP, d, rng, 'forward', [text('m6.sport.forwardJ')], true)
}
/** 直道一样长、差别都在弯道 */
function genStraight(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP, d, rng, 'straight', [text('m6.sport.straightJ')], true)
  return judge(KP, d, rng, 'bendj', [text('m6.sport.bendJ')], true)
}
/** 课本的表第 1 列：第一道一圈 = 两条直道 + 两个弯道 = 400 米 */
function genLap1(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) return numQ({ kpId: KP, d, rng, sig: 'lap1', stem: [text('m6.sport.lapQ'), trackPart(true)], value: 400, smart: [314, 228, 486] })
  return decQ({ kpId: KP, d, rng, sig: 'bends1', stem: [text('m6.sport.bendsQ'), trackPart(true)], value: clean(400 - 2 * STRAIGHT), wrong: [400 - STRAIGHT, clean(400 - 4 * STRAIGHT), 114.04] })
}
/** 解决问题：每往外一道，弯道合成的圆的直径多 2 个道宽 */
function genStep(d: Difficulty, rng: RNG): Question {
  const w = rng.pick([1.22, 1.25, 1, 1.2])
  return valQ({ kpId: KP, d, rng, sig: `step-${w}`, stem: [text('m6.sport.stepQ', { w })], value: 2 * w, wrong: [w, 4 * w, w / 2] })
}
/** 第 n 道弯道合成的圆的直径 */
function genLaneD(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 6)
  return decQ({ kpId: KP, d, rng, sig: `laned-${n}`, stem: [text('m6.sport.laneDQ', { lane: lane(n) })], value: laneD(n), wrong: [clean(D1 + LANE * (n - 1)), clean(D1 + 2 * LANE * n), clean(D1 + 2 * LANE * (n - 2))] })
}
/** 两个弯道合起来 = π × 直径（π 取 3.14159） */
function genBend(d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 6)
  const D = laneD(n)
  return decQ({ kpId: KP, d, rng, sig: `bend-${n}`, stem: [text('m6.sport.bendQ', { lane: lane(n), d: fmt(D) })], value: r2(PI5 * D), wrong: [r2((PI5 * D) / 2), r2(PI5 * D + 2 * STRAIGHT), r2(2 * PI5 * D)] })
}
/** 我不用算出每条跑道的长度：相邻两道相差 π × 2 × 道宽 */
function genDiff(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.45)) return decQ({ kpId: KP, d, rng, sig: 'diff-book', stem: [text('m6.sport.diffQ', { w: LANE })], value: r2(PI5 * 2 * LANE), wrong: [r2(PI5 * LANE), 2 * LANE, r2(PI5 * 4 * LANE)] })
  const w = rng.pick([1, 1.25, 1.2, 1.5])
  return valQ({ kpId: KP, d, rng, sig: `diff-${w}`, stem: [text('m6.sport.diffSimpleQ', { w })], value: clean(3.14 * 2 * w), wrong: [clean(3.14 * w), 2 * w, clean(3.14 * 4 * w)] })
}
/** 相邻两道相差的长度怎样列式 */
function genHow(d: Difficulty, rng: RNG): Question {
  return pickWord(KP, d, rng, 'how', [text('m6.sport.howQ')], '3.14159 × 1.22 × 2', ['3.14159 × 1.22', '1.22 × 2', '85.96 × 2'])
}
/** 由上面的计算确定起跑线：第 n 道比第一道往前移多少 */
function genStart(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const n = rng.pick([2, 3, 5, 6])
    return decQ({ kpId: KP, d, rng, sig: `start-${n}`, stem: [text('m6.sport.startQ', { lane: lane(n) })], value: r2(PI5 * 2 * LANE * (n - 1)), wrong: [r2(PI5 * LANE * (n - 1)), r2(PI5 * 2 * LANE * n), clean(2 * LANE * (n - 1))] })
  }
  const n = rng.int(2, 6)
  return valQ({ kpId: KP, d, rng, sig: `start1-${n}`, stem: [text('m6.sport.startSimpleQ', { lane: lane(n) })], value: clean(6.28 * (n - 1)), wrong: [clean(3.14 * (n - 1)), clean(6.28 * n), 2 * (n - 1)] })
}
/** 知道相邻两道相差多少，算第 n 道一圈 */
function genLap2(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3])
  const g = rng.pick([7.67, 6.28])
  return decQ({ kpId: KP, d, rng, sig: `lap2-${n}-${g}`, stem: [text('m6.sport.lap2Q', { g, lane: lane(n) })], value: clean(400 + g * (n - 1)), wrong: [clean(400 + g * n), clean(400 - g * (n - 1)), clean(400 + 2 * g * (n - 1))] })
}
/** 回顾反思：跑道宽度固定，每条跑道总长度的差是相同的 */
function genRule(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP, d, rng, 'rule', [text('m6.sport.ruleJ')], true)
  return judge(KP, d, rng, 'same', [text('m6.sport.sameJ')], false)
}
/** 确定问题：100 米跑的起跑线为什么在同一条直线上 */
function genHundred(d: Difficulty, rng: RNG): Question {
  return pickWord(KP, d, rng, 'hundred', [text('m6.sport.hundredQ')], W('m6.sport.w.allStraight'), [W('m6.sport.w.fewer'), W('m6.sport.w.curved')])
}

// ── 第 2、3 档 ──

/** 200 米跑只过一个半圆形弯道：相邻两道相差 π × 道宽（我们加的延伸） */
function gen200(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return decQ({ kpId: KP, d, rng, sig: '200-book', stem: [text('m6.sport.t200Q', { w: LANE })], value: r2(PI5 * LANE), wrong: [r2(PI5 * 2 * LANE), LANE, r2((PI5 * LANE) / 2)] })
  const w = rng.pick([1, 1.5])
  return valQ({ kpId: KP, d, rng, sig: `200-${w}`, stem: [text('m6.sport.t200SimpleQ', { w })], value: clean(3.14 * w), wrong: [clean(6.28 * w), w, clean(1.57 * w)] })
}
function genWider(d: Difficulty, rng: RNG): Question {
  return judge(KP, d, rng, 'wider', [text('m6.sport.widerJ')], true)
}
/** 交流分享：足球赛制（循环赛、淘汰赛的场次） */
function genMatches(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const n = rng.pick([4, 5, 6, 8, 16])
    return numQ({ kpId: KP, d, rng, sig: `robin-${n}`, stem: [text('m6.sport.robinQ', { n })], value: (n * (n - 1)) / 2, smart: [n * (n - 1), n - 1, n * 2] })
  }
  const n = rng.pick([4, 8, 16])
  return numQ({ kpId: KP, d, rng, sig: `knock-${n}`, stem: [text('m6.sport.knockQ', { n })], value: n - 1, smart: [n / 2, n, (n * (n - 1)) / 2] })
}
/** 交流分享：铅球场地由一个圆和一个扇形组成 */
function genShot(d: Difficulty, rng: RNG): Question {
  return pickWord(KP, d, rng, 'shot', [text('m6.sport.shotQ')], W('m6.sport.w.sector'), [W('m6.sport.w.rect'), W('m6.sport.w.tri')])
}
/** 第 3 档：课本表里第 n 道一圈的长度 */
function genFull(d: Difficulty, rng: RNG): Question {
  // 第四道一圈正好约 423.00 米（像整数），不出
  const n = rng.pick([2, 3, 5, 6])
  const D = laneD(n)
  return decQ({ kpId: KP, d, rng, sig: `full-${n}`, stem: [text('m6.sport.fullQ', { lane: lane(n), d: fmt(D) })], value: r2(PI5 * D + 2 * STRAIGHT), wrong: [r2(PI5 * D + STRAIGHT), r2(PI5 * D), r2((PI5 * D) / 2 + 2 * STRAIGHT)] })
}

defineGenerator(KP, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 分析问题（半圆形弯道、外圈往前移）、收集信息的数据、解决问题的表与「不用算出每条跑道的长度」、确定起跑线、回顾反思
    if (roll < 0.08) return genShape(d, rng)
    if (roll < 0.16) return genWhy(d, rng)
    if (roll < 0.22) return genStraight(d, rng)
    if (roll < 0.3) return genLap1(d, rng)
    if (roll < 0.38) return genStep(d, rng)
    if (roll < 0.46) return genLaneD(d, rng)
    if (roll < 0.54) return genBend(d, rng)
    if (roll < 0.66) return genDiff(d, rng)
    if (roll < 0.71) return genHow(d, rng)
    if (roll < 0.83) return genStart(d, rng)
    if (roll < 0.9) return genLap2(d, rng)
    if (roll < 0.96) return genRule(d, rng)
    return genHundred(d, rng)
  }
  if (d === 2) {
    if (roll < 0.35) return gen200(d, rng)
    if (roll < 0.5) return genWider(d, rng)
    if (roll < 0.82) return genMatches(d, rng)
    return genShot(d, rng)
  }
  if (roll < 0.6) return genFull(d, rng)
  return genStart(d, rng)
})
