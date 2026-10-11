// 五下「5 图形的运动（三）」（平台当前的旧版课本）的生成器（五年级数学 A）。
// 旧版这一单元只有旋转（轴对称、平移在旧版四下），内容就是新版五上「旋转」一节的前身：出题办法用 motion.ts 的旋转题，
// 词条换成旧书的说法（m5.rot.*：「按顺时针方向旋转 90°」「图形 OABC」，例 4 回顾与反思是「平移可以改变卡片的位置」）。
import type { Difficulty, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import {
  FLAG_OLD,
  KITE_OLD,
  type RPre,
  type Rot,
  TRI_OLD,
  genDial,
  genDialTo,
  genFour,
  genPieces,
  genRotJudge,
  genSelf,
  genTriFigs,
  genTriLen,
  genTriPoint,
  randomTri,
  genGate,
  genPendulum,
  genPinwheel,
  genRect,
  genSetSquare,
  genCard,
} from './motion'

// ─────────────────────────────────────────────────────────────
// 图形的运动（三）（旧版五下五，第 83–88 页）：例 1 表盘上的指针（12→1 是 30°，从 3 到 6、从 6 到 12 各旋转了多少度）；
// 做一做 道闸（不提「杆」）；例 2 三角尺每次按顺时针方向旋转 90°（点 O 的位置不变）；例 3 画三角形 AOB 绕点 O 按顺时针方向
// 旋转 90° 后的图形（O(5,6)、A 在上面 4 格、B 在右边 3 格）、做一做 逆时针；例 4 卡片平移或旋转拼成图案（回顾与反思改成判断）；
// 练习二十一 2 钟摆、3 风车、4 图形 OABC 的 ①②③、5 小旗绕点 O 转出风车、6* 旋转后和原来重合；练习二十二 1 两块拼成正方形。
// 练习二十一 1（图案由哪个图形旋转而成）、做一做「换另一把三角尺转一圈」、练习二十二 2 七巧板、3 熊猫卡片不出。
// ─────────────────────────────────────────────────────────────

export const KP_ROTATE2 = 'm5s2-06-rotate'
const PRE: RPre = 'm5.rot'

defineGenerator(KP_ROTATE2, (d, rng) => {
  const kpId = KP_ROTATE2
  for (let i = 0; i < 20; i++) {
    const q = pick(kpId, d, rng)
    if (q) return q
  }
  return genDial(PRE, kpId, d, rng)
})

function pick(kpId: string, d: Difficulty, rng: RNG): Question | null {
  const roll = rng.next()
  if (d === 1) {
    // 例 1 表盘、做一做 道闸、例 2 三角尺、例 3 三角形 AOB（做一做 逆时针）、例 4 回顾与反思（判断）
    const r: Rot = rng.pick(['cw', 'cw', 'ccw'] as const)
    if (roll < 0.2) return genDial(PRE, kpId, d, rng)
    if (roll < 0.27) return genDialTo(PRE, kpId, d, rng)
    if (roll < 0.38) return genGate(PRE, kpId, d, rng)
    if (roll < 0.5) return genSetSquare(PRE, kpId, d, rng)
    if (roll < 0.66) return genTriFigs(PRE, kpId, d, rng, rng.chance(0.6) ? TRI_OLD : randomTri(rng), r)
    if (roll < 0.75) return genTriPoint(PRE, kpId, d, rng, rng.chance(0.5) ? TRI_OLD : randomTri(rng), r)
    if (roll < 0.8) return genTriLen(PRE, kpId, d, rng, TRI_OLD, r)
    if (roll < 0.92) return genRotJudge(PRE, kpId, d, rng)
    return genCard(PRE, kpId, d, rng)
  }
  if (d === 2) {
    // 练习二十一 2 钟摆、3 风车、4 图形 OABC、5 小旗；例 4 卡片；换一个三角形
    const r: Rot = rng.pick(['cw', 'ccw', 'half'] as const)
    if (roll < 0.12) return genPendulum(PRE, kpId, d, rng)
    if (roll < 0.24) return genPinwheel(PRE, kpId, d, rng)
    if (roll < 0.4) return genFour(PRE, kpId, d, rng, KITE_OLD)
    if (roll < 0.56) return genFour(PRE, kpId, d, rng, FLAG_OLD)
    if (roll < 0.66) return genCard(PRE, kpId, d, rng)
    if (roll < 0.82) return genTriFigs(PRE, kpId, d, rng, randomTri(rng), r)
    if (roll < 0.9) return genTriPoint(PRE, kpId, d, rng, randomTri(rng), r)
    return genDial(PRE, kpId, d, rng)
  }
  // 第 3 档：练习二十一 6* 旋转后和原来重合；练习二十二 1 两块拼成正方形；三角形转 180°、长方形绕一个顶点转
  if (roll < 0.3) return genSelf(PRE, kpId, d, rng)
  if (roll < 0.55) return genPieces(PRE, kpId, d, rng)
  if (roll < 0.8) return genTriFigs(PRE, kpId, d, rng, randomTri(rng), rng.pick(['cw', 'ccw', 'half'] as const))
  return genRect(PRE, kpId, d, rng)
}
