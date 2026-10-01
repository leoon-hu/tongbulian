import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数据的收集与整理（三下五）：数据的收集和记录（画「正」字 / 打 √ / 画 ○ 的记录单、统计表）、复式统计表、分段整理数据。
// 课本全单元只用统计表（单式、复式），没有条形统计图；人数多在 30 以内，空气质量天数到 188，分公司人员到 267。
// 图：记录单（tally）一类一行；统计表（stat-table）照课本横排——第一列是表头（「地点 / 人数」），竖排的表第一行是表头。
// 表里、记录单里的字不注音也不朗读，所以题目文字里要说清问的是哪一类；类别都是课本里的简单词。
// ─────────────────────────────────────────────────────────────

export type Mark = 'zheng' | 'check' | 'circle'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const item = (id: string): LStr => L(`m3.data.item.${id}`)
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)

/** 在 [lo, hi] 里取 n 个互不相同的数 */
export function distinct(rng: RNG, n: number, lo: number, hi: number): number[] {
  return rng.shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, n)
}
/** 最大（或最小）的那个只有一个时，返回它的位置；并列返回 -1 */
function uniqueExtreme(xs: number[], most: boolean): number {
  const v = most ? Math.max(...xs) : Math.min(...xs)
  return xs.filter((x) => x === v).length === 1 ? xs.indexOf(v) : -1
}

// ── 数据的收集和记录：七个课本情境（春游地点、路口的车、一个月的天气、班牌颜色、讲故事比赛投票、课外小组、水果）──

export type SceneId = 'trip' | 'car' | 'weather' | 'color' | 'vote' | 'club' | 'fruit'
export interface Scene {
  id: SceneId
  items: { id: string; icon: string }[]
  /** 类别那一栏、数量那一栏的表头（m3.data.head.*） */
  head: string
  unit: string
  /** 每一类的数量范围 */
  lo: number
  hi: number
  /** 至少几类 */
  min: number
}
export const SCENES: Record<SceneId, Scene> = {
  trip: {
    id: 'trip',
    items: [
      { id: 'zoo', icon: '🦁' },
      { id: 'garden', icon: '🌳' },
      { id: 'park', icon: '🎡' },
      { id: 'museum', icon: '🔭' },
    ],
    head: 'place',
    unit: 'people',
    lo: 3,
    hi: 16,
    min: 3,
  },
  car: {
    id: 'car',
    items: [
      { id: 'truck', icon: '🚚' },
      { id: 'bus', icon: '🚌' },
      { id: 'car', icon: '🚗' },
      { id: 'moto', icon: '🏍️' },
    ],
    head: 'car',
    unit: 'cars',
    lo: 3,
    hi: 20,
    min: 3,
  },
  weather: {
    id: 'weather',
    items: [
      { id: 'sunny', icon: '☀️' },
      { id: 'cloudy', icon: '☁️' },
      { id: 'rainy', icon: '🌧️' },
    ],
    head: 'weather',
    unit: 'days',
    lo: 2,
    hi: 20,
    min: 3,
  },
  color: {
    id: 'color',
    items: [
      { id: 'red', icon: '🔴' },
      { id: 'yellow', icon: '🟡' },
      { id: 'blue', icon: '🔵' },
      { id: 'white', icon: '⚪' },
    ],
    head: 'color',
    unit: 'people',
    lo: 2,
    hi: 20,
    min: 3,
  },
  // 练习十五 1：从小刚、小雨两名候选人中选一人
  vote: {
    id: 'vote',
    items: [
      { id: 'gang', icon: '👦' },
      { id: 'yu', icon: '👧' },
    ],
    head: 'name',
    unit: 'votes',
    lo: 6,
    hi: 25,
    min: 2,
  },
  club: {
    id: 'club',
    items: [
      { id: 'science', icon: '🔬' },
      { id: 'art', icon: '🎨' },
      { id: 'sports', icon: '⚽' },
    ],
    head: 'club',
    unit: 'votes',
    lo: 5,
    hi: 25,
    min: 3,
  },
  fruit: {
    id: 'fruit',
    items: [
      { id: 'apple', icon: '🍎' },
      { id: 'banana', icon: '🍌' },
      { id: 'orange', icon: '🍊' },
      { id: 'grape', icon: '🍇' },
    ],
    head: 'fruit',
    unit: 'people',
    lo: 3,
    hi: 16,
    min: 3,
  },
}
const SCENE_IDS = Object.keys(SCENES) as SceneId[]
/** 能问「最少」的情境（投票只问选谁） */
const hasLeast = (sc: Scene): boolean => sc.id !== 'vote'

/** 一个情境的一组数据：几类（按课本的顺序）、每类的数量（互不相同，最多 / 最少才唯一） */
export interface Data {
  sc: Scene
  ids: string[]
  counts: number[]
}
function sceneData(rng: RNG, sc: Scene, opts: { lo?: number; hi?: number } = {}): Data {
  const n = rng.int(sc.min, sc.items.length)
  const picked = rng
    .shuffle(sc.items.map((_, i) => i))
    .slice(0, n)
    .sort((a, b) => a - b)
  const ids = picked.map((i) => sc.items[i]!.id)
  if (sc.id === 'weather') return { sc, ids: sc.items.map((x) => x.id), counts: weatherCounts(rng) }
  return { sc, ids, counts: distinct(rng, n, opts.lo ?? sc.lo, opts.hi ?? sc.hi) }
}
/** 一个月的天气（练习十四 2）：晴、阴、雨加起来正好是这个月的天数（30 或 31），三个数不同 */
function weatherCounts(rng: RNG): number[] {
  const total = rng.pick([30, 31])
  for (;;) {
    const sunny = rng.int(8, 18)
    const cloudy = rng.int(4, 14)
    const rainy = total - sunny - cloudy
    if (rainy >= 2 && new Set([sunny, cloudy, rainy]).size === 3) return [sunny, cloudy, rainy]
  }
}
const iconOf = (sc: Scene, id: string): string => sc.items.find((x) => x.id === id)!.icon
const sigOf = (dt: Data): string => `${dt.sc.id}-${dt.ids.join('.')}-${dt.counts.join('.')}`
/**
 * 一张记录单的数据和记号（例 1 课本两种记法：打「√」和画「正」字）：天气以外的 40% 打 √（每类最多 12 个，数得过来），
 * 算上只画「正」字的一个月的天气（三十来天），约三分之一的记录单打 √。
 */
function sheetData(rng: RNG, sc: Scene): { dt: Data; marks?: Mark[] } {
  const check = sc.id !== 'weather' && rng.chance(0.4)
  const dt = sceneData(rng, sc, check ? { lo: Math.min(sc.lo, 3), hi: 12 } : {})
  return { dt, marks: check ? dt.ids.map((): Mark => 'check') : undefined }
}
const markTag = (marks?: Mark[]): string => (marks ? `-${marks.join('.')}` : '')

/** 记录单：一类一行，默认画「正」字 */
export function tallyPart(dt: Data, marks?: Mark[]): StemPart {
  return {
    kind: 'tally',
    rows: dt.ids.map((id, i) => ({ label: item(id), icon: iconOf(dt.sc, id), count: dt.counts[i]!, mark: marks?.[i] ?? 'zheng' })),
  }
}
/** 统计表（课本横排）：第一行是类别、第二行是数量；ask = 要填的那一格 */
export function tablePart(dt: Data, ask = -1): StemPart {
  return {
    kind: 'stat-table',
    rows: [
      [L(`m3.data.head.${dt.sc.head}`), ...dt.ids.map(item)],
      [L(`m3.data.head.${dt.sc.unit}`), ...dt.counts.map((c, i) => (i === ask ? null : c))],
    ],
  }
}

function qCount(kpId: string, d: Difficulty, dt: Data, at: number, parts: StemPart[], tag: string, rng: RNG): Question {
  const c = dt.counts[at]!
  return numberQuestion({
    kpId,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-${sigOf(dt)}-${at}`,
    stem: [text(`m3.data.${dt.sc.id}.count`, { x: item(dt.ids[at]!) }), ...parts],
    value: c,
    rng,
    min: 0,
    max: 99,
    // 数「正」字常错：漏了不满 5 画的那个、多数或少数一个整字；也会看错一行
    smart: [c + 5, c - 5, c - (c % 5), c + 1, ...dt.counts.filter((x) => x !== c)],
  })
}
function qMost(kpId: string, d: Difficulty, dt: Data, most: boolean, part: StemPart, tag: string, rng: RNG): Question {
  const at = dt.counts.indexOf(most ? Math.max(...dt.counts) : Math.min(...dt.counts))
  return labelQuestion({
    kpId,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-${most ? 'most' : 'least'}-${sigOf(dt)}`,
    stem: [text(`m3.data.${dt.sc.id}.${most ? 'most' : 'least'}`), part],
    correct: item(dt.ids[at]!),
    distractors: dt.ids.filter((_, i) => i !== at).map(item),
    rng,
  })
}
function qTotal(kpId: string, d: Difficulty, dt: Data, part: StemPart, tag: string, rng: RNG): Question {
  const t = sum(dt.counts)
  return numberQuestion({
    kpId,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-total-${sigOf(dt)}`,
    stem: [text(`m3.data.${dt.sc.id}.total`), part],
    value: t,
    rng,
    min: 0,
    max: 999,
    smart: [t - dt.counts[dt.counts.length - 1]!, t + 10, t - 10, t + 1, t - 1],
  })
}
function qDiff(kpId: string, d: Difficulty, dt: Data, part: StemPart, tag: string, rng: RNG): Question {
  const [i, j] = rng.shuffle(dt.ids.map((_, k) => k)).slice(0, 2) as [number, number]
  const [a, b] = dt.counts[i]! > dt.counts[j]! ? [i, j] : [j, i]
  const v = dt.counts[a]! - dt.counts[b]!
  return numberQuestion({
    kpId,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-diff-${sigOf(dt)}-${a}-${b}`,
    stem: [text(`m3.data.${dt.sc.id}.diff`, { a: item(dt.ids[a]!), b: item(dt.ids[b]!) }), part],
    value: v,
    rng,
    min: 0,
    max: 99,
    smart: [dt.counts[a]! + dt.counts[b]!, v + 1, v - 1, v + 5],
  })
}

const KR = 'm3s2-05-record'
const pickScene = (rng: RNG): Scene => SCENES[rng.pick(SCENE_IDS)]

/** 一行记号数一数（例 1、练习十五 1）：「正」字 6–25，√ 4–12（约三分之一） */
function recOneRow(d: Difficulty, rng: RNG): Question {
  const sc = pickScene(rng)
  const it = rng.pick(sc.items)
  const check = sc.id !== 'weather' && rng.chance(0.4)
  const dt: Data = { sc, ids: [it.id], counts: [check ? rng.int(4, 12) : rng.int(6, 25)] }
  return qCount(KR, d, dt, 0, [tallyPart(dt, check ? ['check'] : undefined)], check ? 'one-check' : 'one', rng)
}
/** 三四类的记录单，问其中一类 */
function recSheetCount(d: Difficulty, rng: RNG): Question {
  const { dt, marks } = sheetData(rng, pickScene(rng))
  return qCount(KR, d, dt, rng.int(0, dt.ids.length - 1), [tallyPart(dt, marks)], `sheet${markTag(marks)}`, rng)
}
/** 把记录的结果填进统计表（例 1「你能把上页统计的结果填入下面的统计表吗？」、做一做 1） */
function recFill(d: Difficulty, rng: RNG, dt: Data, marks?: Mark[]): Question {
  const at = rng.int(0, dt.ids.length - 1)
  const c = dt.counts[at]!
  return numberQuestion({
    kpId: KR,
    type: 'stat',
    difficulty: d,
    sig: `fill-${sigOf(dt)}-${at}-${marks?.join('.') ?? 'z'}`,
    stem: [text('m3.data.fillTable'), tallyPart(dt, marks), tablePart(dt, at)],
    value: c,
    rng,
    min: 0,
    max: 99,
    smart: [c + 5, c - 5, c + 1, c - 1],
  })
}
/** 看统计表：哪一类最多 / 最少（练习十四 1「最喜欢（ ）色的人数最多」） */
function recTableMost(d: Difficulty, rng: RNG, withTally = false): Question {
  const { dt, marks } = sheetData(rng, pickScene(rng))
  const most = !hasLeast(dt.sc) || rng.chance(0.6)
  return withTally ? qMost(KR, d, dt, most, tallyPart(dt, marks), `sheet${markTag(marks)}`, rng) : qMost(KR, d, dt, most, tablePart(dt), 'table', rng)
}
/** 「1 个"正"字有（5）画，代表（5）人。」 */
function recFact(d: Difficulty, rng: RNG): Question {
  const strokes = rng.chance(0.5)
  return numberQuestion({
    kpId: KR,
    type: 'stat',
    difficulty: d,
    sig: strokes ? 'fact-strokes' : 'fact-means',
    stem: [text(strokes ? 'm3.data.zhengStrokes' : 'm3.data.zhengMeans')],
    value: 5,
    rng,
    min: 1,
    max: 9,
    smart: [4, 6, 1],
  })
}
function recTotalOrDiff(d: Difficulty, rng: RNG, total: boolean): Question {
  const { dt, marks } = sheetData(rng, pickScene(rng))
  const tally = rng.chance(0.5)
  const part = tally ? tallyPart(dt, marks) : tablePart(dt)
  const tag = tally ? `sheet${markTag(marks)}` : 'table'
  return total ? qTotal(KR, d, dt, part, tag, rng) : qDiff(KR, d, dt, part, tag, rng)
}
/** 做一做 1：路口 10 分钟通过的车，四张记录单用了「正」字、√、○ 三种记号（课本：货车 6、大巴车 9、小轿车 33、摩托车 11） */
function mixedCars(rng: RNG): { dt: Data; marks: Mark[] } {
  const sc = SCENES.car
  const marks = rng.shuffle<Mark>(['zheng', 'check', 'zheng', 'circle'])
  for (;;) {
    const counts = marks.map((m) => (m === 'zheng' ? rng.int(5, 33) : rng.int(4, 12)))
    if (new Set(counts).size === 4) return { dt: { sc, ids: sc.items.map((x) => x.id), counts }, marks }
  }
}
function recMixed(d: Difficulty, rng: RNG): Question {
  const { dt, marks } = mixedCars(rng)
  const part = tallyPart(dt, marks)
  if (rng.chance(0.4)) return qMost(KR, d, dt, rng.chance(0.5), part, `mix${marks.join('.')}`, rng)
  return qCount(KR, d, dt, rng.int(0, 3), [part], `mix${marks.join('.')}`, rng)
}
/** 练习十五 1 (3)：还有几人没投票，投完以后原来票多的一定能当选吗？（相差的票数比没投的人数多才一定能） */
function recVote(d: Difficulty, rng: RNG): Question {
  const sc = SCENES.vote
  const sure = rng.chance(0.5)
  for (;;) {
    const winner = rng.int(12, 25)
    const gap = rng.int(1, 8)
    const loser = winner - gap
    if (loser < 5) continue
    if (sure && gap < 2) continue
    const n = sure ? rng.int(1, gap - 1) : rng.int(gap, gap + 3)
    const w = rng.int(0, 1)
    const dt: Data = { sc, ids: ['gang', 'yu'], counts: w === 0 ? [winner, loser] : [loser, winner] }
    return labelQuestion({
      kpId: KR,
      type: 'stat',
      difficulty: d,
      sig: `absent-${sigOf(dt)}-${n}`,
      stem: [text('m3.data.vote.absent', { n, w: item(dt.ids[w]!) }), tallyPart(dt)],
      correct: L(sure ? 'm3.data.opt.sure' : 'm3.data.opt.notSure'),
      distractors: [L(sure ? 'm3.data.opt.notSure' : 'm3.data.opt.sure')],
      rng,
    })
  }
}
/** 几个「正」字代表几人；课外小组投票（练习十五 2：9 个、3 个、7 个「正」字） */
function recMany(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const n = rng.int(2, 9)
    return numberQuestion({
      kpId: KR,
      type: 'stat',
      difficulty: d,
      sig: `many-${n}`,
      stem: [text('m3.data.zhengMany', { n })],
      value: 5 * n,
      rng,
      min: 1,
      max: 99,
      smart: [n, 5 * n + 5, 5 * n - 5, n + 5],
    })
  }
  const sc = SCENES.club
  for (;;) {
    const counts = distinct(rng, 3, 3, 9).map((k) => k * 5 - (rng.chance(0.4) ? rng.int(1, 4) : 0))
    if (new Set(counts).size < 3) continue
    const dt: Data = { sc, ids: sc.items.map((x) => x.id), counts }
    return rng.chance(0.5) ? qTotal(KR, d, dt, tallyPart(dt), 'club', rng) : qDiff(KR, d, dt, tallyPart(dt), 'club', rng)
  }
}
/** 看统计表算全班人数（练习十四 1：红 5、黄 4、蓝 20、白 3，全班 32 人） */
function recTableBig(d: Difficulty, rng: RNG): Question {
  const sc = SCENES[rng.pick(['color', 'trip', 'fruit'] as const)]
  const dt = sceneData(rng, sc, { lo: 2, hi: 25 })
  return rng.chance(0.6) ? qTotal(KR, d, dt, tablePart(dt), 'big', rng) : qDiff(KR, d, dt, tablePart(dt), 'big', rng)
}

defineGenerator(KR, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 例 1：数一行 / 一张记录单（约三分之一打 √）、把结果填进统计表、想去哪里的人数最多、1 个「正」字几画；
    // 做一做 1：车辆的记录单混用「正」字、√、○，填表、哪种车最多最少
    if (roll < 0.15) return recOneRow(d, rng)
    if (roll < 0.32) return recSheetCount(d, rng)
    if (roll < 0.47) {
      const { dt, marks } = sheetData(rng, pickScene(rng))
      return recFill(d, rng, dt, marks)
    }
    if (roll < 0.67) {
      if (rng.chance(0.5)) return recMixed(d, rng)
      const { dt, marks } = mixedCars(rng)
      return recFill(d, rng, dt, marks)
    }
    if (roll < 0.88) return recTableMost(d, rng, rng.chance(0.3))
    return recFact(d, rng)
  }
  if (d === 2) {
    // 练习十四、十五：一共多少、相差多少、全班人数、几个「正」字、没投票的同学
    if (roll < 0.25) return recTotalOrDiff(d, rng, true)
    if (roll < 0.45) return recTotalOrDiff(d, rng, false)
    if (roll < 0.6) return recTableBig(d, rng)
    if (roll < 0.8) return recMany(d, rng)
    return recVote(d, rng)
  }
  if (roll < 0.3) return recVote(d, rng)
  if (roll < 0.55) return recMany(d, rng)
  if (roll < 0.75) return recTableBig(d, rng)
  const { dt, marks } = mixedCars(rng)
  return recFill(d, rng, dt, marks)
})

// ── 复式统计表：两组（男生 / 女生，一年级时 / 三年级时）合在一张表里 ──

export type TwoKind = 'sport' | 'book' | 'level'
export interface Two {
  kind: TwoKind
  ids: string[]
  rows: [number[], number[]]
}
/** 例 2 的六个运动项目（手机上一张表最多放 4 项，随机取 4 项、保持课本的顺序） */
const SPORTS = ['soccer', 'basketball', 'swim', 'pingpong', 'rope', 'jianzi']
const BOOKS = ['literature', 'sciBook', 'history']
/** 练习十五 3：体质测试的成绩等级 */
const GRADES = ['you', 'liang', 'jige', 'bujige']
const TWO_HEAD: Record<TwoKind, string> = { sport: 'm3.data.head.sport', book: 'm3.data.head.book', level: 'm3.data.head.grade' }
const TWO_TITLE: Record<TwoKind, string> = { sport: 'm3.data.title.sport', book: 'm3.data.title.book', level: 'm3.data.title.level' }
/** 表里两行的名字（课本「男生人数」「一年级时的人数」）、句子里说的两组 */
const ROW_LABEL: Record<TwoKind, [string, string]> = {
  sport: ['m3.data.boysNum', 'm3.data.girlsNum'],
  book: ['m3.data.boysNum', 'm3.data.girlsNum'],
  level: ['m3.data.g1Num', 'm3.data.g3Num'],
}
const GROUP: Record<TwoKind, [string, string]> = {
  sport: ['m3.data.boys', 'm3.data.girls'],
  book: ['m3.data.boys', 'm3.data.girls'],
  level: ['m3.data.g1', 'm3.data.g3'],
}

export function twoData(rng: RNG, kind: TwoKind): Two {
  for (;;) {
    let ids: string[]
    let rows: [number[], number[]]
    if (kind === 'sport') {
      ids = rng
        .shuffle(SPORTS.map((_, i) => i))
        .slice(0, 4)
        .sort((a, b) => a - b)
        .map((i) => SPORTS[i]!)
      rows = [ids.map(() => rng.int(0, 9)), ids.map(() => rng.int(0, 9))]
    } else if (kind === 'book') {
      ids = BOOKS
      rows = [ids.map(() => rng.int(2, 15)), ids.map(() => rng.int(2, 15))]
    } else {
      // 练习十五 3：同一个班一年级时、三年级时各测一次（课本 30 人），两次的总人数一样；及格的人数用总数减出来
      ids = GRADES
      const total = rng.int(26, 32)
      const g1 = [rng.int(2, 7), rng.int(6, 12), 0, rng.int(0, 2)]
      const g3 = [rng.int(4, 10), rng.int(8, 14), 0, rng.int(0, 1)]
      g1[2] = total - g1[0]! - g1[1]! - g1[3]!
      g3[2] = total - g3[0]! - g3[1]! - g3[3]!
      rows = [g1, g3]
    }
    // 每一组的最多都唯一（问「哪一项最多」）；每一组至少有人
    if (rows.every((r) => uniqueExtreme(r, true) >= 0 && sum(r) > 0)) return { kind, ids, rows }
  }
}
export function twoTable(t: Two, title = true): StemPart {
  const [l0, l1] = ROW_LABEL[t.kind]
  return {
    kind: 'stat-table',
    ...(title ? { title: L(TWO_TITLE[t.kind]) } : {}),
    rows: [
      [L(TWO_HEAD[t.kind]), ...t.ids.map(item)],
      [L(l0), ...t.rows[0]],
      [L(l1), ...t.rows[1]],
    ],
  }
}
const twoSig = (t: Two): string => `${t.kind}-${t.ids.join('.')}-${t.rows[0].join('.')}-${t.rows[1].join('.')}`
const KT = 'm3s2-05-table'

/** 读一格：「女生最喜欢跳绳的有几人？」 */
function tabCell(d: Difficulty, rng: RNG, t: Two): Question {
  const r = rng.int(0, 1) as 0 | 1
  const c = rng.int(0, t.ids.length - 1)
  const v = t.rows[r][c]!
  const g = L(GROUP[t.kind][r])
  const x = item(t.ids[c]!)
  const key = t.kind === 'level' ? 'm3.data.level.cell' : `m3.data.${t.kind}.cell`
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `cell-${twoSig(t)}-${r}-${c}`,
    stem: [text(key, { x, g }), twoTable(t)],
    value: v,
    rng,
    min: 0,
    max: 99,
    // 看错行（另一组同一项）、看错列
    smart: [t.rows[1 - r][c]!, ...t.rows[r].filter((_, k) => k !== c)],
  })
}
/** 某一组哪一项最多：「男生最喜欢哪种运动项目的人最多？」 */
function tabMost(d: Difficulty, rng: RNG, t: Two): Question {
  const r = rng.int(0, 1) as 0 | 1
  const at = uniqueExtreme(t.rows[r], true)
  const key = t.kind === 'level' ? 'm3.data.level.most' : `m3.data.${t.kind}.most`
  return labelQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `most-${twoSig(t)}-${r}`,
    stem: [text(key, { g: L(GROUP[t.kind][r]) }), twoTable(t)],
    correct: item(t.ids[at]!),
    distractors: t.ids.filter((_, k) => k !== at).map(item),
    rng,
  })
}
/** 同一项两组合起来（男生 + 女生） */
function tabColSum(d: Difficulty, rng: RNG, t: Two, part: StemPart[] = [twoTable(t)], tag = 'col'): Question {
  const c = rng.int(0, t.ids.length - 1)
  const v = t.rows[0][c]! + t.rows[1][c]!
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `${tag}-${twoSig(t)}-${c}`,
    stem: [text(`m3.data.${t.kind}.colSum`, { x: item(t.ids[c]!) }), ...part],
    value: v,
    rng,
    min: 0,
    max: 99,
    smart: [Math.abs(t.rows[0][c]! - t.rows[1][c]!), v + 1, v - 1, t.rows[0][c]!],
  })
}
/** 同一项两组相差：「最喜欢跳绳的，女生比男生多几人？」；体质测试是三年级时比一年级时多 / 少几人 */
function tabDiff(d: Difficulty, rng: RNG, t: Two): Question | null {
  const cols = t.ids.map((_, k) => k).filter((k) => t.rows[0][k] !== t.rows[1][k])
  if (!cols.length) return null
  const c = rng.pick(cols)
  const [v0, v1] = [t.rows[0][c]!, t.rows[1][c]!]
  const v = Math.abs(v0 - v1)
  const x = item(t.ids[c]!)
  let stem: StemPart
  if (t.kind === 'level') stem = text(v1 > v0 ? 'm3.data.level.more' : 'm3.data.level.fewer', { x })
  else {
    const [a, b] = v0 > v1 ? [0, 1] : [1, 0]
    stem = text(`m3.data.${t.kind}.diff`, { x, a: L(GROUP[t.kind][a]!), b: L(GROUP[t.kind][b]!) })
  }
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `diff-${twoSig(t)}-${c}`,
    stem: [stem, twoTable(t)],
    value: v,
    rng,
    min: 0,
    max: 99,
    smart: [v0 + v1, v + 1, v - 1],
  })
}
/** 一组一共多少人、整张表一共多少人（例 2 (2)「参加调查的一共有多少人？」） */
function tabTotal(d: Difficulty, rng: RNG, t: Two, whole: boolean): Question {
  if (whole && t.kind !== 'level') {
    const v = sum(t.rows[0]) + sum(t.rows[1])
    return numberQuestion({
      kpId: KT,
      type: 'stat',
      difficulty: d,
      sig: `all-${twoSig(t)}`,
      stem: [text('m3.data.grandTotal'), twoTable(t)],
      value: v,
      rng,
      min: 0,
      max: 999,
      smart: [sum(t.rows[0]), sum(t.rows[1]), v + 1, v - 1],
    })
  }
  const r = rng.int(0, 1) as 0 | 1
  const v = sum(t.rows[r])
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `row-${twoSig(t)}-${r}`,
    stem: [text(t.kind === 'level' ? 'm3.data.level.rowTotal' : 'm3.data.rowTotal', { g: L(GROUP[t.kind][r]) }), twoTable(t)],
    value: v,
    rng,
    min: 0,
    max: 999,
    smart: [sum(t.rows[1 - r]), v + 1, v - 1, v + 10],
  })
}
/** 一题里放两张表时（两张单式表、单式表 + 复式表）各取 3 项，手机上放得下（保持课本的顺序） */
function threeOf(rng: RNG, kind: 'sport' | 'book'): Two {
  const full = twoData(rng, kind)
  if (full.ids.length <= 3) return full
  const keep = rng
    .shuffle(full.ids.map((_, k) => k))
    .slice(0, 3)
    .sort((a, b) => a - b)
  return { kind, ids: keep.map((k) => full.ids[k]!), rows: [keep.map((k) => full.rows[0][k]!), keep.map((k) => full.rows[1][k]!)] }
}
/** 一组（男生或女生）的单式统计表（例 2 上面的两张表：「男生最喜欢的运动项目人数情况」） */
function singleTable(t: Two, r: 0 | 1): StemPart {
  const kind = t.kind === 'book' ? 'book' : 'sport'
  return {
    kind: 'stat-table',
    title: L(`m3.data.title.${kind}G`, { g: L(GROUP[t.kind][r]) }),
    rows: [
      [L(TWO_HEAD[t.kind]), ...t.ids.map(item)],
      [L('m3.data.head.people'), ...t.rows[r]],
    ],
  }
}
/** 两张单式统计表（男生一张、女生一张，例 2）：合在一起看，最喜欢某一项的一共有几人 */
function tabTwoTables(d: Difficulty, rng: RNG): Question {
  const t = threeOf(rng, 'sport')
  return tabColSum(d, rng, t, [singleTable(t, 0), singleTable(t, 1)], 'two')
}
/**
 * 例 2「像这样的表可以合成一个表」：一组的单式统计表 + 合成的复式统计表（另一组已经填好），复式表里问号那一格照单式表填。
 * 图书种类（做一做 2）同样。
 */
function tabMerge(d: Difficulty, rng: RNG): Question {
  const t = threeOf(rng, rng.pick(['sport', 'sport', 'book'] as const))
  const r = rng.int(0, 1) as 0 | 1
  const c = rng.int(0, t.ids.length - 1)
  const v = t.rows[r][c]!
  const merged = twoTable(t)
  if (merged.kind === 'stat-table') merged.rows[r + 1]![c + 1] = null
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `merge-${twoSig(t)}-${r}-${c}`,
    stem: [text('m3.data.merge', { g: L(GROUP[t.kind][r]) }), singleTable(t, r), merged],
    value: v,
    rng,
    min: 0,
    max: 99,
    // 抄成另一组的同一项、抄错一格
    smart: [t.rows[1 - r][c]!, ...t.rows[r].filter((_, k) => k !== c), v + 1],
  })
}

/** 做一做 1：某市 2016、2020、2024 年空气质量各级别天数（课本的真实数据，这里取前四个级别） */
export const AIR_YEARS = [2016, 2020, 2024]
export const AIR: { id: string; days: number[] }[] = [
  { id: 'you', days: [76, 98, 127] },
  { id: 'liang', days: [153, 163, 188] },
  { id: 'light', days: [77, 63, 38] },
  { id: 'medium', days: [37, 26, 11] },
]
export function airTable(): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.data.title.air'),
    head: 'row',
    rows: [[L('m3.data.head.air'), ...AIR_YEARS.map((y) => L('m3.data.yearCol', { y }))], ...AIR.map((a) => [item(a.id), ...a.days])],
  }
}
const year = (y: number): LStr => L('m3.data.yearCol', { y })
function tabAir(d: Difficulty, rng: RNG): Question {
  const a = rng.pick(AIR)
  if (rng.chance(0.45)) {
    const most = rng.chance(0.5)
    const at = uniqueExtreme(a.days, most)
    return labelQuestion({
      kpId: KT,
      type: 'stat',
      difficulty: d,
      sig: `air-${a.id}-${most ? 'most' : 'least'}`,
      stem: [text(most ? 'm3.data.air.most' : 'm3.data.air.least', { lv: item(a.id) }), airTable()],
      correct: year(AIR_YEARS[at]!),
      distractors: AIR_YEARS.filter((_, k) => k !== at).map(year),
      rng,
    })
  }
  const [i, j] = rng
    .shuffle([0, 1, 2])
    .slice(0, 2)
    .sort((x, y) => x - y) as [number, number]
  const v = a.days[j]! - a.days[i]!
  return numberQuestion({
    kpId: KT,
    type: 'stat',
    difficulty: d,
    sig: `air-${a.id}-${i}-${j}`,
    stem: [text(v > 0 ? 'm3.data.air.more' : 'm3.data.air.fewer', { y2: AIR_YEARS[j]!, y1: AIR_YEARS[i]!, lv: item(a.id) }), airTable()],
    value: Math.abs(v),
    rng,
    min: 0,
    max: 999,
    smart: [Math.abs(v) + 10, Math.abs(v) - 10, a.days[i]! + a.days[j]!],
  })
}

/** 练习十四 5：两个分公司的生产 / 管理 / 辅助人员（课本 133、27、55；267、45、62），三位数加减 */
const STAFF = ['prod', 'admin', 'aux']
function staffData(rng: RNG): [number[], number[]] {
  if (rng.chance(0.25)) return [
    [133, 27, 55],
    [267, 45, 62],
  ]
  return [
    [rng.int(100, 300), rng.int(20, 60), rng.int(30, 90)],
    [rng.int(100, 300), rng.int(20, 60), rng.int(30, 90)],
  ]
}
export function staffTable(rows: [number[], number[]]): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.data.title.staff'),
    head: 'both',
    rows: [
      [L('m3.data.head.staff'), ...STAFF.map(item)],
      [L('m3.data.branch.1'), ...rows[0]],
      [L('m3.data.branch.2'), ...rows[1]],
    ],
  }
}
function tabStaff(d: Difficulty, rng: RNG): Question {
  const rows = staffData(rng)
  const sig = `staff-${rows[0].join('.')}-${rows[1].join('.')}`
  const roll = rng.next()
  if (roll < 0.4) {
    const c = rng.int(0, 2)
    const v = rows[0][c]! + rows[1][c]!
    return numberQuestion({ kpId: KT, type: 'stat', difficulty: d, sig: `${sig}-sum${c}`, stem: [text('m3.data.staff.colSum', { x: item(STAFF[c]!) }), staffTable(rows)], value: v, rng, min: 0, max: 9999, smart: [v + 100, v - 100, v + 10, v - 10] })
  }
  const more = [0, 1, 2].filter((c) => rows[1][c]! > rows[0][c]!)
  if (roll < 0.7 && more.length) {
    const c = rng.pick(more)
    const v = rows[1][c]! - rows[0][c]!
    return numberQuestion({ kpId: KT, type: 'stat', difficulty: d, sig: `${sig}-more${c}`, stem: [text('m3.data.staff.more', { x: item(STAFF[c]!) }), staffTable(rows)], value: v, rng, min: 0, max: 999, smart: [v + 10, v - 10, rows[0][c]! + rows[1][c]!] })
  }
  const r = rng.int(0, 1)
  const v = sum(rows[r]!)
  return numberQuestion({ kpId: KT, type: 'stat', difficulty: d, sig: `${sig}-row${r}`, stem: [text('m3.data.staff.rowTotal', { b: L(`m3.data.branch.${r + 1}`) }), staffTable(rows)], value: v, rng, min: 0, max: 9999, smart: [v + 10, v - 10, v + 100, sum(rows[1 - r]!)] })
}

/** 例 3 的整理表：等级（不及格、及格、良好、优秀）× 女生人数、男生人数，带「合计」一行 */
export const ROPE_ORDER = ['fail', 'pass', 'good', 'excellent'] as const
function ropeCounts(rng: RNG): [number[], number[]] {
  for (;;) {
    const g = [rng.int(0, 2), rng.int(3, 8), rng.int(4, 9), rng.int(2, 7)]
    const b = [rng.int(0, 2), rng.int(3, 8), rng.int(4, 9), rng.int(2, 7)]
    const total = g.map((x, i) => x + b[i]!)
    if (uniqueExtreme(total, true) >= 0) return [g, b]
  }
}
export function ropeSumTable(g: number[], b: number[], totals: 'none' | 'full' | number): StemPart {
  const rows: (number | LStr | null)[][] = [
    [L('m3.data.head.level'), ...ROPE_ORDER.map((lv) => L(`m3.data.lv.${lv}`))],
    [L('m3.data.girlsNum'), ...g],
    [L('m3.data.boysNum'), ...b],
  ]
  if (totals !== 'none') rows.push([L('m3.data.sum'), ...g.map((x, i) => (i === totals ? null : x + b[i]!))])
  return { kind: 'stat-table', title: L('m3.data.title.ropeSum'), rows }
}
/** 例 3 后半：把女生、男生各等级的人数整理在一张表里（合计、哪个等级最多、几人没及格）——属于「分段整理数据」 */
function tabRopeSum(d: Difficulty, rng: RNG): Question {
  const kpId = 'm3s2-05-segments'
  const [g, b] = ropeCounts(rng)
  const sig = `ropesum-${g.join('.')}-${b.join('.')}`
  const roll = rng.next()
  if (roll < 0.45) {
    const c = rng.int(0, 3)
    const v = g[c]! + b[c]!
    return numberQuestion({ kpId, type: 'stat', difficulty: d, sig: `${sig}-ask${c}`, stem: [text('m3.data.rope.sumAsk'), ropeSumTable(g, b, c)], value: v, rng, min: 0, max: 99, smart: [Math.abs(g[c]! - b[c]!), v + 1, v - 1] })
  }
  if (roll < 0.75) {
    const total = g.map((x, i) => x + b[i]!)
    const at = uniqueExtreme(total, true)
    return labelQuestion({
      kpId,
      type: 'stat',
      difficulty: d,
      sig: `${sig}-most`,
      stem: [text('m3.data.rope.sumMost'), ropeSumTable(g, b, 'full')],
      correct: L(`m3.data.lv.${ROPE_ORDER[at]}`),
      distractors: ROPE_ORDER.filter((_, k) => k !== at).map((lv) => L(`m3.data.lv.${lv}`)),
      rng,
    })
  }
  const v = g[0]! + b[0]!
  return numberQuestion({ kpId, type: 'stat', difficulty: d, sig: `${sig}-fail`, stem: [text('m3.data.rope.sumFail'), ropeSumTable(g, b, 'none')], value: v, rng, min: 0, max: 99, smart: [g[0]!, b[0]!, v + 1, g[1]! + b[1]!] })
}

defineGenerator(KT, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 例 2：两张表合成一个表、读一格、男生 / 女生最喜欢哪一项的人最多、参加调查的一共有多少人；
    // 做一做 1：某市三年的空气质量；做一做 2：图书种类
    if (roll < 0.25) return tabMerge(d, rng)
    if (roll < 0.4) return tabAir(d, rng)
    const t = twoData(rng, rng.pick(['sport', 'sport', 'book'] as const))
    if (roll < 0.52) return tabCell(d, rng, t)
    if (roll < 0.72) return tabMost(d, rng, t)
    if (roll < 0.87) return tabTotal(d, rng, t, rng.chance(0.6))
    return tabColSum(d, rng, t)
  }
  if (d === 2) {
    // 练习十四、十五：两张单式表同一项合起来、男女相差几人、体质测试两次的成绩等级、两个分公司的人员
    if (roll < 0.2) return tabTwoTables(d, rng)
    if (roll < 0.35) return tabStaff(d, rng)
    const t = twoData(rng, rng.pick(['sport', 'book', 'level', 'level'] as const))
    if (t.kind === 'level' && roll < 0.55) return rng.chance(0.5) ? tabCell(d, rng, t) : tabMost(d, rng, t)
    if (roll < 0.55) return tabColSum(d, rng, t)
    if (roll < 0.8) return tabDiff(d, rng, t) ?? tabTotal(d, rng, t, false)
    return tabTotal(d, rng, t, roll < 0.9)
  }
  if (roll < 0.25) return tabAir(d, rng)
  if (roll < 0.5) return tabStaff(d, rng)
  if (roll < 0.7) return tabTwoTables(d, rng)
  const t = twoData(rng, 'level')
  return tabDiff(d, rng, t) ?? tabTotal(d, rng, t, false)
})

// ── 分段整理数据：按标准分段（跳绳等级、阅读时间、做家务的时间、身高），判断一个数在哪一段、数每一段有几个 ──

export type BandKind = 'range' | 'max' | 'min' | 'over'
/** 一段：lo–hi（hi = null 没有上限）；kind 决定怎么写：range「39—108」、max「38 及以下」、min「125 及以上」、over「60 以上」（不含 60） */
export interface Band {
  lo: number
  hi: number | null
  kind: BandKind
}
export const inBand = (b: Band, v: number): boolean => v >= b.lo && (b.hi === null || v <= b.hi)
/** 表里的写法（课本「38 及以下」「39—108」「60 以上」；表格不朗读） */
export function bandLabel(b: Band): LStr {
  if (b.kind === 'range') return `${b.lo}—${b.hi}`
  if (b.kind === 'max') return L('m3.data.band.max', { a: b.hi! })
  if (b.kind === 'min') return L('m3.data.band.min', { a: b.lo })
  return L('m3.data.band.over', { a: b.lo - 1 })
}
/** 选项里的写法：答错时要朗读「正确答案是……」，「—」会读成停顿，区间写成「39 到 108」 */
export function bandChoice(b: Band): LStr {
  return b.kind === 'range' ? L('m3.data.band.range', { a: b.lo, b: b.hi! }) : bandLabel(b)
}
/** 句子里的说法（带单位，「—」说成「到」） */
function bandSpoken(b: Band, unit: 'min' | 'cm' | 'times'): LStr {
  const u = L(`m3.data.u.${unit}`)
  if (b.kind === 'range') return L('m3.data.seg.range', { a: b.lo, b: b.hi!, u })
  if (b.kind === 'max') return L('m3.data.seg.max', { a: b.hi!, u })
  if (b.kind === 'min') return L('m3.data.seg.min', { a: b.lo, u })
  return L('m3.data.seg.over', { a: b.lo - 1, u })
}

export type Gender = 'boy' | 'girl'
export type Level = (typeof ROPE_ORDER)[number]
/** 《国家学生体质健康标准》三年级一分钟跳绳（课本例 3）：男生、女生标准不同 */
export const ROPE: Record<Gender, { lv: Level; band: Band }[]> = {
  boy: [
    { lv: 'excellent', band: { lo: 116, hi: null, kind: 'min' } },
    { lv: 'good', band: { lo: 104, hi: 115, kind: 'range' } },
    { lv: 'pass', band: { lo: 34, hi: 103, kind: 'range' } },
    { lv: 'fail', band: { lo: 0, hi: 33, kind: 'max' } },
  ],
  girl: [
    { lv: 'excellent', band: { lo: 125, hi: null, kind: 'min' } },
    { lv: 'good', band: { lo: 109, hi: 124, kind: 'range' } },
    { lv: 'pass', band: { lo: 39, hi: 108, kind: 'range' } },
    { lv: 'fail', band: { lo: 0, hi: 38, kind: 'max' } },
  ],
}
export const ropeLevel = (g: Gender, n: number): Level => ROPE[g].find((x) => inBand(x.band, n))!.lv
const lvLabel = (lv: Level): LStr => L(`m3.data.lv.${lv}`)
/** 一个等级里取一个跳绳次数（优秀往上 30 次以内、不及格从 10 次起）；boundary = 取分界上的数 */
function ropeValue(rng: RNG, b: Band, boundary: boolean): number {
  const lo = Math.max(b.lo, 10)
  const hi = b.hi ?? b.lo + 30
  if (boundary) return rng.pick(b.kind === 'max' ? [b.hi!] : b.kind === 'min' ? [b.lo] : [b.lo, b.hi!])
  return rng.int(lo, hi)
}
export function ropeTable(g: Gender): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.data.title.rope', { g: L(`m3.data.${g}s`) }),
    head: 'row',
    rows: [[L('m3.data.head.level'), L('m3.data.head.times')], ...ROPE[g].map((x) => [lvLabel(x.lv), bandLabel(x.band)])],
  }
}
export function ropeBothTable(): StemPart {
  return {
    kind: 'stat-table',
    title: L('m3.data.title.ropeBoth'),
    head: 'row',
    rows: [[L('m3.data.head.level'), L('m3.data.boys'), L('m3.data.girls')], ...ROPE.boy.map((x, i) => [lvLabel(x.lv), bandLabel(x.band), bandLabel(ROPE.girl[i]!.band)])],
  }
}

/** 其它分段（练习十四 4 做家务的时间、练习十五 4 阅读时间、例 3 做一做 身高） */
export type SetId = 'read' | 'chore' | 'height'
export interface DataSet {
  id: SetId
  bands: Band[]
  lo: number
  hi: number
  unit: 'min' | 'cm'
}
export const SETS: Record<SetId, DataSet> = {
  read: {
    id: 'read',
    bands: [
      { lo: 0, hi: 30, kind: 'range' },
      { lo: 31, hi: 60, kind: 'range' },
      { lo: 61, hi: null, kind: 'over' },
    ],
    lo: 5,
    hi: 90,
    unit: 'min',
  },
  chore: {
    id: 'chore',
    bands: [
      { lo: 0, hi: 10, kind: 'max' },
      { lo: 11, hi: 20, kind: 'range' },
      { lo: 21, hi: 30, kind: 'range' },
      { lo: 31, hi: null, kind: 'min' },
    ],
    lo: 3,
    hi: 40,
    unit: 'min',
  },
  height: {
    id: 'height',
    bands: [
      { lo: 0, hi: 119, kind: 'max' },
      { lo: 120, hi: 129, kind: 'range' },
      { lo: 130, hi: 139, kind: 'range' },
      { lo: 140, hi: null, kind: 'min' },
    ],
    lo: 112,
    hi: 148,
    unit: 'cm',
  },
}
/** 一段里取一个数（落在这个数据集的范围里）；boundary = 取分界上的数 */
function valueIn(rng: RNG, ds: DataSet, b: Band, boundary = false): number {
  const lo = Math.max(b.lo, ds.lo)
  const hi = Math.min(b.hi ?? ds.hi, ds.hi)
  if (boundary) {
    const edges = [b.lo, b.hi].filter((x): x is number => x !== null && x >= ds.lo && x <= ds.hi)
    if (edges.length) return rng.pick(edges)
  }
  return rng.int(lo, hi)
}
/** n 个数据：先随机挑一段再在段里取数，各段都常有 */
function values(rng: RNG, ds: DataSet, n: number): number[] {
  return Array.from({ length: n }, () => valueIn(rng, ds, rng.pick(ds.bands)))
}
const chunk = <T>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))
/** 一串数据排成方方正正的表：8 个一行 4 个，10 个一行 5 个 */
export function gridPart(title: LStr, cells: (number | LStr)[]): StemPart {
  return { kind: 'stat-table', title, head: 'none', rows: chunk(cells, cells.length % 5 === 0 ? 5 : 4) }
}
const KS = 'm3s2-05-segments'

/** 例 3：给出跳绳标准，一个次数是什么等级；both = 男女标准放在一张表里（108 次：男生良好、女生及格） */
function segRope(d: Difficulty, rng: RNG, mode: 'single' | 'boundary' | 'both'): Question {
  const g: Gender = rng.pick(['boy', 'girl'])
  let n: number
  if (mode === 'both') {
    // 男女等级不一样的次数：34–38、104–108、116–124
    n = rng.pick([rng.int(34, 38), rng.int(104, 108), rng.int(116, 124)])
  } else {
    const b = rng.pick(ROPE[g]).band
    n = ropeValue(rng, b, mode === 'boundary' ? rng.chance(0.6) : rng.chance(0.25))
  }
  const lv = ropeLevel(g, n)
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `rope-${mode === 'both' ? 'b' : 's'}-${g}-${n}`,
    stem: [text('m3.data.rope.levelOf', { g: L(`m3.data.${g}`), n }), mode === 'both' ? ropeBothTable() : ropeTable(g)],
    correct: lvLabel(lv),
    distractors: ROPE_ORDER.filter((x) => x !== lv).map(lvLabel),
    rng,
  })
}
/** 阅读 45 分钟、身高 127 厘米……在哪一段（选项就是各段的写法） */
function segWhich(d: Difficulty, rng: RNG): Question {
  const ds = SETS[rng.pick(['read', 'chore', 'height'] as const)]
  const b = rng.pick(ds.bands)
  const n = valueIn(rng, ds, b, rng.chance(0.3))
  const at = ds.bands.findIndex((x) => inBand(x, n))
  return labelQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `which-${ds.id}-${n}`,
    stem: [text(`m3.data.seg.${ds.id}`, { n })],
    correct: bandChoice(ds.bands[at]!),
    distractors: ds.bands.filter((_, k) => k !== at).map(bandChoice),
    rng,
  })
}
/** 一串数据（练习十四 4、练习十五 4）：数某一段有几个 */
function segCount(d: Difficulty, rng: RNG): Question {
  const ds = SETS[rng.pick(['read', 'chore', 'height'] as const)]
  const n = ds.id === 'height' ? rng.pick([8, 10]) : 10
  const vs = values(rng, ds, n)
  const counts = ds.bands.map((b) => vs.filter((v) => inBand(b, v)).length)
  const nonEmpty = ds.bands.map((_, k) => k).filter((k) => counts[k]! > 0)
  const at = rng.chance(0.9) && nonEmpty.length ? rng.pick(nonEmpty) : rng.int(0, ds.bands.length - 1)
  const v = counts[at]!
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `count-${ds.id}-${vs.join('.')}-${at}`,
    stem: [text(`m3.data.${ds.id}.countIn`, { seg: bandSpoken(ds.bands[at]!, ds.unit) }), gridPart(L(`m3.data.title.${ds.id}`, { n }), vs)],
    value: v,
    rng,
    min: 0,
    max: 10,
    smart: [v + 1, v - 1, ...counts.filter((_, k) => k !== at)],
  })
}
/** 例 3：一串男生（女生）的跳绳次数，按标准数某一等级有几人 */
function segRopeCount(d: Difficulty, rng: RNG, withFail: boolean): Question {
  const g: Gender = rng.pick(['boy', 'girl'])
  const std = ROPE[g]
  const vs = Array.from({ length: 8 }, () => ropeValue(rng, rng.pick(std).band, rng.chance(0.2)))
  const pool = withFail ? std : std.filter((x) => x.lv !== 'fail')
  const target = rng.pick(pool)
  const v = vs.filter((n) => inBand(target.band, n)).length
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `ropecount-${g}-${vs.join('.')}-${target.lv}`,
    stem: [
      text('m3.data.rope.countLevel', { g: L(`m3.data.${g}s`), seg: bandSpoken(target.band, 'times'), lv: lvLabel(target.lv) }),
      gridPart(L('m3.data.title.ropeGrid', { n: vs.length, g: L(`m3.data.${g}s`) }), vs),
    ],
    value: v,
    rng,
    min: 0,
    max: 8,
    smart: [v + 1, v - 1, vs.length - v],
  })
}
/** 男女混在一起的数据（练习十四 4）：男生（女生）里某一段有几人。格子里照课本写「男 31」「女 36」（英文界面是 👦 / 👧） */
function segGender(d: Difficulty, rng: RNG): Question {
  const ds = SETS[rng.pick(['chore', 'height'] as const)]
  const people = Array.from({ length: 10 }, () => ({ g: rng.pick<Gender>(['boy', 'girl']), v: valueIn(rng, ds, rng.pick(ds.bands)) }))
  const g: Gender = rng.pick(['boy', 'girl'])
  const at = rng.int(0, ds.bands.length - 1)
  const v = people.filter((p) => p.g === g && inBand(ds.bands[at]!, p.v)).length
  const all = people.filter((p) => inBand(ds.bands[at]!, p.v)).length
  return numberQuestion({
    kpId: KS,
    type: 'stat',
    difficulty: d,
    sig: `gender-${ds.id}-${people.map((p) => `${p.g[0]}${p.v}`).join('.')}-${g}-${at}`,
    stem: [
      text(`m3.data.${ds.id}.countInG`, { g: L(`m3.data.${g}s`), seg: bandSpoken(ds.bands[at]!, ds.unit) }),
      gridPart(
        L(`m3.data.title.${ds.id}`, { n: 10 }),
        people.map((p) => L(`m3.data.cell.${p.g}`, { v: p.v })),
      ),
    ],
    value: v,
    rng,
    min: 0,
    max: 10,
    smart: [all, all - v, v + 1],
  })
}
/** 分段整理后哪一段人数最多（例 3「三（1）班同学跳绳水平在（良好）等级的人数最多」） */
function segMost(d: Difficulty, rng: RNG): Question {
  const ds = SETS[rng.pick(['read', 'chore', 'height'] as const)]
  for (;;) {
    const vs = values(rng, ds, 10)
    const counts = ds.bands.map((b) => vs.filter((v) => inBand(b, v)).length)
    const at = uniqueExtreme(counts, true)
    if (at < 0) continue
    return labelQuestion({
      kpId: KS,
      type: 'stat',
      difficulty: d,
      sig: `mostband-${ds.id}-${vs.join('.')}`,
      stem: [text('m3.data.seg.mostBand'), gridPart(L(`m3.data.title.${ds.id}`, { n: 10 }), vs)],
      correct: bandChoice(ds.bands[at]!),
      distractors: ds.bands.filter((_, k) => k !== at).map(bandChoice),
      rng,
    })
  }
}

defineGenerator(KS, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 例 3：按标准判等级 / 判在哪一段（常考分界上的数）30%、数一段有几人 35%、哪一段的人数最多 15%、
    // 把女生男生各等级的人数整理成一张表（合计、哪个等级最多、几人没及格）20%；做一做：身高分段
    if (roll < 0.15) return segRope(d, rng, rng.chance(0.5) ? 'single' : 'boundary')
    if (roll < 0.3) return segWhich(d, rng)
    if (roll < 0.47) return segRopeCount(d, rng, true)
    if (roll < 0.65) return segCount(d, rng)
    if (roll < 0.8) return segMost(d, rng)
    return tabRopeSum(d, rng)
  }
  if (d === 2) {
    // 练习十四 4（男女混在一起）、例 3 男女标准放在一起（108 次男生良好、女生及格）
    if (roll < 0.3) return segGender(d, rng)
    if (roll < 0.55) return segRope(d, rng, 'both')
    if (roll < 0.8) return segCount(d, rng)
    return segRopeCount(d, rng, true)
  }
  if (roll < 0.3) return segGender(d, rng)
  if (roll < 0.55) return segMost(d, rng)
  if (roll < 0.8) return segRope(d, rng, 'both')
  return tabRopeSum(d, rng)
})
