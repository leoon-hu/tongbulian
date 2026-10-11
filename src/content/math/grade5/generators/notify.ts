import type { Difficulty, InputMode, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 五下「☆ 怎样通知最快」（综合与实践，课本第 102–103 页；五年级数学 F）：一个知识点。
// 课本：队长要尽快通知 15 名队员，一对一传达、每分钟通知 1 人。一个一个通知要 15 分钟；分 3 组（每组 1 + 4 人）要 3 + 4 = 7 分钟、
//   分 5 组（1 + 2 人）要 5 + 2 = 7 分钟（想一想：不是分的组越多越快）；每个人接到通知后都继续往下通知最快——第 1、2、3、4、5 分钟
//   新接到通知的有 1、2、4、8、16 人，总数 1、3、7、15、31 人：(1) 15 名 4 分钟通知完；(2) 5 分钟最多通知 31 人；(3) 50 名最少 6 分钟。
// 分组的规则照课本的算法写全：老师先把每组的第 1 名同学都通知到（几组就几分钟），这些同学再同时通知本组其他同学。
// 朗读避坑：「队长」「组长」「多长时间」的「长」不出——换成「老师」通知「同学」、「几分钟」；不写「应急」（应 yìng）、「一个一个地」（地）、
// 「第 4 分钟」（序数用阿拉伯数字读不好）——问表里的问号、问「几分钟后」「最后这 1 分钟里」。
// 作答一律是整数（数字键盘）；只有「哪种方法最快」「分的组越多越快吗」是选项。
// ─────────────────────────────────────────────────────────────

const K = 'm5s2-08-notify'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** 每个接到通知的人都继续通知：第 t 分钟新接到通知的人数、t 分钟后接到通知的总人数 */
export const newAt = (t: number): number => 2 ** (t - 1)
export const totalAfter = (t: number): number => 2 ** t - 1
/** 照这样通知 n 人，最少要几分钟 */
export function minutesFor(n: number): number {
  let t = 0
  while (totalAfter(t) < n) t++
  return t
}
/** 分成 k 组、每组 s 人：老师先通知每组第 1 人（k 分钟），他们再同时通知本组其他 s − 1 人 */
export const groupMinutes = (k: number, s: number): number => k + s - 1

function ask(d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[], max = 999): Question {
  // 带通知图的题一律出成选项：图加上数字键盘，手机竖屏一屏放不下
  const input: InputMode | undefined = stem.some((p) => p.kind === 'notify-tree') ? 'choice' : undefined
  return numberQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, value, rng, min: 1, max, input, smart: smart.filter((x) => x >= 1 && x !== value) })
}

/** 一个一个通知：几人就几分钟 */
function qOneByOne(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.4) ? 15 : rng.int(8, 30)
  return ask(d, rng, `one-${n}`, [T('m5.notify.one.q', { n })], n, [n - 1, n + 1, 2 * n, minutesFor(n)])
}

/** 课本的两种分法（15 人分 3 组、分 5 组）与别的人数 */
export const GROUP_BOOK: [number, number][] = [
  [3, 5],
  [5, 3],
]
function groupPlan(rng: RNG, big: boolean): [number, number] {
  if (!big && rng.chance(0.45)) return rng.pick(GROUP_BOOK)
  // 图里一个组员一个圆圈：组员太多图就太宽，第 1 档最多 4 组、每组 5 人
  const k = rng.int(2, big ? 5 : 4)
  const s = rng.int(big ? 3 : 2, big ? 6 : 5)
  return [k, s]
}
/** 分组通知（示意图）：一共要几分钟 */
function qGroup(d: Difficulty, rng: RNG, big = false): Question {
  const [k, s] = groupPlan(rng, big)
  const n = k * s
  const v = groupMinutes(k, s)
  // 常错：没把老师通知各组的几分钟算进去（只算 s − 1）、按人数算（n）、k + s（多算了自己）
  return ask(d, rng, `group-${k}x${s}`, [{ kind: 'notify-tree', mode: 'group', groups: k, per: s - 1 }, T('m5.notify.group.q', { n, k, s })], v, [s - 1, n, k + s, k * (s - 1)], 99)
}
/**
 * 想一想：是不是分的组越多，用的时间越少（15 人分 3 组、5 组都是 7 分钟）——给出两种分法的时间（组多的不比组少的快），问这句话对不对
 */
export const MORE_GROUPS: [number, number, number][] = [
  [15, 3, 5],
  [12, 3, 4],
  [12, 4, 6],
  [20, 4, 5],
  [24, 4, 6],
  [30, 5, 6],
  [18, 3, 6],
]
function qMoreGroups(d: Difficulty, rng: RNG): Question {
  const [n, a, b] = rng.chance(0.4) ? MORE_GROUPS[0]! : rng.pick(MORE_GROUPS)
  const x = groupMinutes(a, n / a)
  const y = groupMinutes(b, n / b)
  return labelQuestion({
    kpId: K,
    type: 'logic',
    difficulty: d,
    sig: `moreGroups-${n}-${a}-${b}`,
    stem: [T('m5.notify.more.j', { n, a, b, x, y })],
    correct: L('m5.notify.no'),
    distractors: [L('m5.notify.yes')],
    rng,
  })
}
/** 三种方法哪种最快：都去通知别人最快 */
function qFastest(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.5) ? 15 : rng.int(10, 30)
  const k = rng.pick([2, 3, 5].filter((x) => x < n))
  return labelQuestion({
    kpId: K,
    type: 'logic',
    difficulty: d,
    sig: `fastest-${n}-${k}`,
    stem: [T('m5.notify.fast.q', { n })],
    correct: L('m5.notify.way.all'),
    distractors: [L('m5.notify.way.one'), L('m5.notify.way.group', { k })],
    rng,
  })
}

const RULE = T('m5.notify.rule')
/** 课本的表：第几分钟、新接到通知的人数、接到通知的总人数；问号放在第 at 分钟那一列，后面的格子空着 */
function table(cols: number, at: number, row: 1 | 2): StemPart {
  const cell = (r: 1 | 2, t: number): number | LStr | null => (t === at && r === row ? null : t > at ? '' : r === 1 ? newAt(t) : totalAfter(t))
  const ts = Array.from({ length: cols }, (_, i) => i + 1)
  return {
    kind: 'stat-table',
    head: 'both',
    rows: [
      [L('m5.notify.th.minute'), ...ts],
      [L('m5.notify.th.new'), ...ts.map((t) => cell(1, t))],
      [L('m5.notify.th.total'), ...ts.map((t) => cell(2, t))],
    ],
  }
}
function qTable(d: Difficulty, rng: RNG, far = false): Question {
  const cols = far ? 6 : 5
  const at = far ? rng.int(5, 6) : rng.int(3, 5)
  const row = rng.chance(0.5) ? 1 : 2
  const v = row === 1 ? newAt(at) : totalAfter(at)
  // 常错：新接到的人数照 +1 / +2 往下写（4、5 / 5、6）、总数只加了上一分钟新接到的、把两行弄混
  const smart = row === 1 ? [newAt(at - 1) + 1, newAt(at - 1) + 2, totalAfter(at), 2 * at] : [totalAfter(at - 1) + newAt(at - 1), totalAfter(at - 1) + 2, newAt(at), 2 * totalAfter(at - 1)]
  return ask(d, rng, `table-${row}-${at}`, [RULE, table(cols, at, row), T('m5.notify.table.q')], v, smart, 99)
}
/** 课本第 103 页的图：画到第 2、3 分钟，问一共几人接到通知、最后这 1 分钟新接到几人 */
function qTree(d: Difficulty, rng: RNG): Question {
  const t = rng.int(2, 3)
  const tree: StemPart = { kind: 'notify-tree', mode: 'double', minutes: t }
  // 图就是规则（每个接到通知的人都接着通知别人），题目只说圈里的数是什么
  if (rng.chance(0.55)) return ask(d, rng, `tree-total-${t}`, [tree, T('m5.notify.tree.total', { t })], totalAfter(t), [totalAfter(t) + 1, newAt(t), 2 * t, 2 ** t], 99)
  return ask(d, rng, `tree-new-${t}`, [tree, T('m5.notify.tree.new')], newAt(t), [newAt(t) + 1, totalAfter(t), t, 2 * t], 99)
}
/** 例子的 (1)：照这样通知 n 人最少要几分钟（课本 15 人 4 分钟） */
function qFull(d: Difficulty, rng: RNG, hi: number): Question {
  const n = rng.chance(0.4) ? 15 : rng.int(4, hi)
  const v = minutesFor(n)
  return ask(d, rng, `full-${n}`, [RULE, T('m5.notify.full.q', { n })], v, [v + 1, v - 1, Math.ceil(n / 2), n], 99)
}
/** 例子的 (2)：照这样通知，t 分钟最多可以通知多少人（课本 5 分钟 31 人） */
function qMost(d: Difficulty, rng: RNG, hi: number): Question {
  const t = rng.chance(0.4) ? 5 : rng.int(2, hi)
  const v = totalAfter(t)
  return ask(d, rng, `most-${t}`, [RULE, T('m5.notify.most.q', { t })], v, [v + 1, 2 ** t, newAt(t), 2 * t], 999)
}
/** 例子的 (3)：一共 n 人，照这样最少要几分钟（课本 50 人 6 分钟） */
function qNeed(d: Difficulty, rng: RNG, lo: number, hi: number): Question {
  const n = rng.chance(0.35) ? 50 : rng.int(lo, hi)
  const v = minutesFor(n)
  // 问法同 (1)（「最少要几分钟能通知到每个人」说长了，手机竖屏连数字键盘放不下）
  return ask(d, rng, `need-${n}`, [RULE, T('m5.notify.full.q', { n })], v, [v + 1, v - 1, Math.ceil(n / 2), v + 2], 99)
}

function notify(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 一个一个通知、分组通知（3 组 / 5 组）、想一想、都去通知别人（图、表、(1)(2)）
    if (roll < 0.1) return qOneByOne(d, rng)
    if (roll < 0.3) return qGroup(d, rng)
    if (roll < 0.36) return qMoreGroups(d, rng)
    if (roll < 0.44) return qFastest(d, rng)
    if (roll < 0.6) return qTable(d, rng)
    if (roll < 0.74) return qTree(d, rng)
    if (roll < 0.87) return qFull(d, rng, 31)
    return qMost(d, rng, 5)
  }
  if (d === 2) {
    // (3) 50 名队员；表往后填；别的人数分组
    if (roll < 0.35) return qNeed(d, rng, 32, 127)
    if (roll < 0.6) return qTable(d, rng, true)
    if (roll < 0.8) return qGroup(d, rng, true)
    return qMost(d, rng, 6)
  }
  if (roll < 0.5) return qNeed(d, rng, 64, 255)
  return qMost(d, rng, 7)
}
defineGenerator(K, notify)
