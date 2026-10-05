import type { Difficulty, Dir8, LStr, PlanMark, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// ☆ 寻找宝藏（四上综合与实践，课本 p102–107）：只有「校园寻宝」一个知识点。
// 课本练的是八个方向——在东、南、西、北之外认识东北、西北、东南、西南（认一认：「东南是东和南之间的方向，和西北相对」），
// 拿着指南针看藏宝图（上北下南的平面图），说出学校东北、西北、东南、西南方向上的建筑；绘制藏宝图：宝藏标在哪个建筑的哪个角
// （p105：3 号在教学楼的东南角、5 号在科技馆的东北角）。复习与关联第 4 题的动物园导游图（某个馆在狮虎山的什么方向、
// 「先向北走到狮虎山，再向西北走」）放第 2、3 档。没有数对、角度、距离（课本没有）；点钟方向是阅读材料，不出。
// 平面图画成 3 × 3 的格子（PlanMap，课本的藏宝图和导游图本来就是这样摆的），名字不注音不朗读，题目里说出地方的名字。
// ─────────────────────────────────────────────────────────────

const KP = 'm4s1-08-treasure'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** 八个方向，顺时针 */
export const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
export const DIAGONALS = ['ne', 'se', 'sw', 'nw'] as const
const SIDES = ['n', 'e', 's', 'w'] as const
/** 往这个方向走一格，行、列各变多少（第 0 行在北边、第 0 列在西边） */
export const DELTA: Record<Dir8, [number, number]> = { n: [-1, 0], ne: [-1, 1], e: [0, 1], se: [1, 1], s: [1, 0], sw: [1, -1], w: [0, -1], nw: [-1, -1] }
export const opposite = (d: Dir8): Dir8 => DIRS[(DIRS.indexOf(d) + 4) % 8]!
const flipEW = (d: Dir8): Dir8 => d.replace(/[ew]/, (c) => (c === 'e' ? 'w' : 'e')) as Dir8
const flipNS = (d: Dir8): Dir8 => d.replace(/[ns]/, (c) => (c === 'n' ? 's' : 'n')) as Dir8
/** 斜方向由哪两个方向组成（课本说「东南是东和南之间」：东、西在前） */
export const PARTS: Record<(typeof DIAGONALS)[number], [Dir8, Dir8]> = { ne: ['e', 'n'], se: ['e', 's'], sw: ['w', 's'], nw: ['w', 'n'] }

/** 从 b 看 a 在什么方向：同一行、同一列或正好斜对着才有，其它（不在八个方向上）返回 null */
export function dirFrom(a: [number, number], b: [number, number]): Dir8 | null {
  const dr = a[0] - b[0]
  const dc = a[1] - b[1]
  if (dr === 0 && dc === 0) return null
  if (dr !== 0 && dc !== 0 && Math.abs(dr) !== Math.abs(dc)) return null
  return `${dr < 0 ? 'n' : dr > 0 ? 's' : ''}${dc > 0 ? 'e' : dc < 0 ? 'w' : ''}` as Dir8
}

/** 方向的干扰项（常见错误在前）：东西看反、南北看反、看成相对的方向，不够再补相邻的 */
export function dirWrongs(d: Dir8): Dir8[] {
  const i = DIRS.indexOf(d)
  const out: Dir8[] = []
  for (const x of [flipEW(d), flipNS(d), opposite(d), DIRS[(i + 1) % 8]!, DIRS[(i + 7) % 8]!]) if (x !== d && !out.includes(x)) out.push(x)
  return out.slice(0, 3)
}
const dirL = (d: Dir8): LStr => L(`m4.tre.dir.${d}`)

// ── 平面图：学校（课本 p103 的藏宝图）、动物园（p113 的导游图）──

export const PLACES: Record<string, { key: string; icon: string }> = {
  canteen: { key: 'm4.tre.place.canteen', icon: '🍚' },
  teach: { key: 'm4.tre.place.teach', icon: '🏫' },
  hall: { key: 'm4.tre.place.hall', icon: '🎭' },
  gym: { key: 'm4.tre.place.gym', icon: '🏀' },
  field: { key: 'm4.tre.place.field', icon: '🏃' },
  library: { key: 'm4.tre.place.library', icon: '📚' },
  science: { key: 'm4.tre.place.science', icon: '🔬' },
  bikes: { key: 'm4.tre.place.bikes', icon: '🚲' },
  gate: { key: 'm4.tre.place.gate', icon: '🚪' },
  flag: { key: 'm4.tre.place.flag', icon: '🚩' },
  zebra: { key: 'm4.tre.zoo.zebra', icon: '🦓' },
  ape: { key: 'm4.tre.zoo.ape', icon: '🦍' },
  bird: { key: 'm4.tre.zoo.bird', icon: '🦢' },
  elephant: { key: 'm4.tre.zoo.elephant', icon: '🐘' },
  lion: { key: 'm4.tre.zoo.lion', icon: '🦁' },
  ocean: { key: 'm4.tre.zoo.ocean', icon: '🐬' },
  monkey: { key: 'm4.tre.zoo.monkey', icon: '🐒' },
  panda: { key: 'm4.tre.zoo.panda', icon: '🐼' },
}
export const placeL = (id: string): LStr => L(PLACES[id]!.key)

/** 课本的藏宝图：北边食堂、教学楼、多功能厅，中间体育馆、操场、图书馆，南边科技馆、大门、存车处 */
export const SCHOOL: string[][] = [
  ['canteen', 'teach', 'hall'],
  ['gym', 'field', 'library'],
  ['science', 'gate', 'bikes'],
]
/** 复习与关联的动物园导游图（长颈鹿馆换成斑马馆）：狮虎山在正中，大门在南边 */
export const ZOO: string[][] = [
  ['zebra', 'ape', 'bird'],
  ['elephant', 'lion', 'ocean'],
  ['monkey', 'gate', 'panda'],
]
const SCHOOL_POOL = ['canteen', 'teach', 'hall', 'gym', 'library', 'science', 'bikes', 'gate', 'flag']

export interface Plan {
  kind: 'school' | 'zoo'
  ids: string[][]
}
/** 学校的平面图：课本那张，或者把操场以外的地方打乱（绘制藏宝图：每个学校摆得不一样，要看图说） */
function schoolPlan(rng: RNG, textbook: boolean): Plan {
  if (textbook) return { kind: 'school', ids: SCHOOL }
  const others = rng.shuffle(SCHOOL_POOL).slice(0, 8)
  const ids = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (r === 1 && c === 1 ? 'field' : others[r * 3 + c - (r * 3 + c > 4 ? 1 : 0)]!)))
  return { kind: 'school', ids }
}
const planSig = (p: Plan): string => `${p.kind}-${p.ids.flat().join('.')}`
export function planPart(p: Plan, marks: PlanMark[] = []): StemPart {
  return {
    kind: 'plan-map',
    title: L(`m4.tre.title.${p.kind}`),
    cells: p.ids.map((row) => row.map((id) => ({ label: placeL(id), icon: PLACES[id]!.icon }))),
    ...(marks.length ? { marks } : {}),
    ...(p.kind === 'zoo' ? { roads: true } : {}),
  }
}
const at = (p: Plan, pos: [number, number]): string => p.ids[pos[0]]![pos[1]]!
const ALL: [number, number][] = [0, 1, 2].flatMap((r) => [0, 1, 2].map((c): [number, number] => [r, c]))
const CENTER: [number, number] = [1, 1]
const AROUND = ALL.filter(([r, c]) => !(r === 1 && c === 1))
const step = (pos: [number, number], d: Dir8): [number, number] | null => {
  const r = pos[0] + DELTA[d][0]
  const c = pos[1] + DELTA[d][1]
  return r >= 0 && r < 3 && c >= 0 && c < 3 ? [r, c] : null
}

/** 地方的干扰项：东西看反、南北看反、相对的那一格上的地方，不够再从别的格子补 */
function placeWrongs(p: Plan, from: [number, number], d: Dir8, answer: string): string[] {
  const out: string[] = []
  for (const x of [flipEW(d), flipNS(d), opposite(d)]) {
    const pos = step(from, x)
    if (pos && at(p, pos) !== answer && !out.includes(at(p, pos))) out.push(at(p, pos))
  }
  for (const pos of AROUND) {
    if (out.length >= 3) break
    const id = at(p, pos)
    if (id !== answer && !out.includes(id)) out.push(id)
  }
  return out.slice(0, 3)
}

function dirQuestion(d: Difficulty, sig: string, stem: StemPart[], correct: Dir8, rng: RNG): Question {
  return labelQuestion({ kpId: KP, type: 'direction', difficulty: d, sig, stem, correct: dirL(correct), distractors: dirWrongs(correct).map(dirL), rng })
}

// ── 认一认：指南针上的八个方向 ──

/** 指南针上打问号的是什么方向 */
function qCompass(d: Difficulty, rng: RNG): Question {
  const ask = rng.pick(DIRS)
  return dirQuestion(d, `compass-${ask}`, [text('m4.tre.compassAsk'), { kind: 'compass', ask }], ask, rng)
}
/** 东和北之间是什么方向（课本「东南是东和南之间的方向」）；withCompass = 配指南针 */
function qBetween(d: Difficulty, rng: RNG, withCompass: boolean): Question {
  const dd = rng.pick(DIAGONALS)
  const [a, b] = rng.chance(0.7) ? PARTS[dd] : ([PARTS[dd][1], PARTS[dd][0]] as [Dir8, Dir8])
  const stem: StemPart[] = [text('m4.tre.between', { a: dirL(a), b: dirL(b) })]
  if (withCompass) stem.push({ kind: 'compass' })
  return dirQuestion(d, `between-${a}-${b}${withCompass ? '-c' : ''}`, stem, dd, rng)
}
/** 和西北相对的是什么方向（课本「和西北相对」） */
function qOpposite(d: Difficulty, rng: RNG, withCompass: boolean): Question {
  const a = rng.pick(DIRS)
  const stem: StemPart[] = [text('m4.tre.opposite', { a: dirL(a) })]
  if (withCompass) stem.push({ kind: 'compass' })
  return dirQuestion(d, `opposite-${a}${withCompass ? '-c' : ''}`, stem, opposite(a), rng)
}

// ── 看藏宝图 ──

/** 某个建筑在学校的什么方向（课本「看看学校东北、西北、东南、西南四个方向上都有哪些建筑」），也问它在操场的什么方向 */
function qInSchool(d: Difficulty, rng: RNG, p: Plan): Question {
  const pos = rng.pick(AROUND)
  const dd = dirFrom(pos, CENTER)!
  const id = at(p, pos)
  const byField = rng.chance(0.35)
  const stem = byField ? text('m4.tre.rel', { a: placeL(id), b: placeL(at(p, CENTER)) }) : text('m4.tre.inSchool', { x: placeL(id) })
  return dirQuestion(d, `in-${byField ? 'f' : 's'}-${planSig(p)}-${id}`, [stem, planPart(p)], dd, rng)
}
/** 学校某个方向上是什么建筑 */
function qWhatAt(d: Difficulty, rng: RNG, p: Plan): Question {
  const dd = rng.pick(DIRS)
  const id = at(p, step(CENTER, dd)!)
  return labelQuestion({
    kpId: KP,
    type: 'direction',
    difficulty: d,
    sig: `what-${planSig(p)}-${dd}`,
    // 斜方向说「学校东北方向上」（课本），正方向说「学校南面」
    stem: [text(dd.length === 2 ? 'm4.tre.whatAt' : 'm4.tre.whatSide', { d: dirL(dd) }), planPart(p)],
    correct: placeL(id),
    distractors: placeWrongs(p, CENTER, dd, id).map(placeL),
    rng,
  })
}
/** 绘制藏宝图：几号宝藏在哪个建筑的哪个角 / 哪一面（p105 的 3 号在教学楼的东南角）；一张图上标一两个宝藏 */
function qMark(d: Difficulty, rng: RNG, p: Plan, corner: boolean): Question {
  const pos = rng.pick(ALL)
  const where: Dir8 = corner ? rng.pick(DIAGONALS) : rng.pick(SIDES)
  const n = rng.int(1, 5)
  const marks: PlanMark[] = [{ r: pos[0], c: pos[1], at: where, n }]
  if (rng.chance(0.5)) {
    // 另一个宝藏标在别的建筑上，编号不同
    const other = rng.pick(ALL.filter(([r, c]) => r !== pos[0] || c !== pos[1]))
    marks.push({ r: other[0], c: other[1], at: rng.pick(DIRS), n: n === 5 ? 1 : n + 1 })
  }
  const id = at(p, pos)
  const pool: readonly Dir8[] = corner ? DIAGONALS : SIDES
  const key = (x: Dir8): LStr => L(corner ? `m4.tre.corner.${x}` : `m4.tre.side.${x}`)
  return labelQuestion({
    kpId: KP,
    type: 'direction',
    difficulty: d,
    sig: `mark-${planSig(p)}-${marks.map((m) => `${m.n}${m.r}${m.c}${m.at}`).join('.')}`,
    stem: [text(corner ? 'm4.tre.cornerAsk' : 'm4.tre.sideAsk', { n, x: placeL(id) }), planPart(p, marks)],
    correct: key(where),
    distractors: pool.filter((x) => x !== where).map(key),
    rng,
  })
}
/** 两个建筑之间的方向（同一行、同一列或斜对着）；far = 隔一格的（食堂在存车处的西北方向） */
function qRel(d: Difficulty, rng: RNG, p: Plan, far: boolean): Question {
  const pairs: [[number, number], [number, number]][] = []
  for (const a of AROUND)
    for (const b of AROUND) {
      if (a === b) continue
      const dd = dirFrom(a, b)
      const dist = Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))
      if (dd && (far ? dist === 2 : dist === 1)) pairs.push([a, b])
    }
  const [a, b] = rng.pick(pairs)
  const dd = dirFrom(a, b)!
  return dirQuestion(d, `rel-${planSig(p)}-${at(p, a)}-${at(p, b)}`, [text('m4.tre.rel', { a: placeL(at(p, a)), b: placeL(at(p, b)) }), planPart(p)], dd, rng)
}

// ── 动物园导游图（复习与关联第 4 题）──

const ZOO_PLAN: Plan = { kind: 'zoo', ids: ZOO }
/** 路：外圈相邻的两处之间、狮虎山到四周每一处 */
export function road(a: [number, number], b: [number, number]): boolean {
  const center = (x: [number, number]): boolean => x[0] === 1 && x[1] === 1
  if (center(a) || center(b)) return true
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1
}
/** 从 from 往 d 走一格能到哪里（有路才走得过去） */
export function walk(from: [number, number], d: Dir8): [number, number] | null {
  const to = step(from, d)
  return to && road(from, to) ? to : null
}
/** 某个馆在狮虎山的什么方向（课本「说一说其他动物场馆分别在狮虎山的什么方向」），或狮虎山某个方向上是哪个馆 */
function qZoo(d: Difficulty, rng: RNG): Question {
  const pos = rng.pick(AROUND)
  const dd = dirFrom(pos, CENTER)!
  const id = at(ZOO_PLAN, pos)
  if (rng.chance(0.6)) return dirQuestion(d, `zoo-rel-${id}`, [text('m4.tre.rel', { a: placeL(id), b: placeL('lion') }), planPart(ZOO_PLAN)], dd, rng)
  return labelQuestion({
    kpId: KP,
    type: 'direction',
    difficulty: d,
    sig: `zoo-at-${dd}`,
    stem: [text(dd.length === 2 ? 'm4.tre.zooAt' : 'm4.tre.zooSide', { d: dirL(dd) }), planPart(ZOO_PLAN)],
    correct: placeL(id),
    distractors: placeWrongs(ZOO_PLAN, CENTER, dd, id).map(placeL),
    rng,
  })
}
/** 从某处出发向某个方向走，先到哪里（课本「我先向东走去看大熊猫」） */
function qWalk(d: Difficulty, rng: RNG): Question {
  const moves: { from: [number, number]; d: Dir8; to: [number, number] }[] = []
  for (const from of ALL)
    for (const dd of DIRS) {
      const to = walk(from, dd)
      if (to) moves.push({ from, d: dd, to })
    }
  const mv = rng.pick(moves)
  const answer = at(ZOO_PLAN, mv.to)
  // 干扰项：往别的方向走到的地方（东西 / 南北看反）
  const wrongs: string[] = []
  for (const x of [flipEW(mv.d), flipNS(mv.d), opposite(mv.d), ...DIRS]) {
    const pos = step(mv.from, x)
    if (pos && !(pos[0] === mv.from[0] && pos[1] === mv.from[1])) {
      const id = at(ZOO_PLAN, pos)
      if (id !== answer && !wrongs.includes(id)) wrongs.push(id)
    }
  }
  return labelQuestion({
    kpId: KP,
    type: 'direction',
    difficulty: d,
    sig: `walk-${at(ZOO_PLAN, mv.from)}-${mv.d}`,
    stem: [text('m4.tre.walk', { a: placeL(at(ZOO_PLAN, mv.from)), d: dirL(mv.d) }), planPart(ZOO_PLAN)],
    correct: placeL(answer),
    distractors: wrongs.slice(0, 3).map(placeL),
    rng,
  })
}
/** 先向北走到狮虎山，再向西北走，到了哪里（课本小红的话） */
function qWalk2(d: Difficulty, rng: RNG): Question {
  const routes: { a: [number, number]; d1: Dir8; b: [number, number]; d2: Dir8; c: [number, number] }[] = []
  for (const a of ALL)
    for (const d1 of DIRS) {
      const b = walk(a, d1)
      if (!b) continue
      for (const d2 of DIRS) {
        const c = walk(b, d2)
        if (c && !(c[0] === a[0] && c[1] === a[1])) routes.push({ a, d1, b, d2, c })
      }
    }
  const rt = rng.pick(routes)
  const answer = at(ZOO_PLAN, rt.c)
  // 干扰项：只走了第一段（停在 b）、第二段看反了方向、从起点直接往第二个方向走
  const wrongs: string[] = []
  const push = (pos: [number, number] | null): void => {
    if (!pos) return
    const id = at(ZOO_PLAN, pos)
    if (id !== answer && !wrongs.includes(id)) wrongs.push(id)
  }
  push(rt.b)
  push(step(rt.b, flipEW(rt.d2)))
  push(step(rt.b, flipNS(rt.d2)))
  push(step(rt.a, rt.d2))
  for (const pos of AROUND) push(pos)
  return labelQuestion({
    kpId: KP,
    type: 'direction',
    difficulty: d,
    sig: `walk2-${at(ZOO_PLAN, rt.a)}-${rt.d1}-${rt.d2}`,
    stem: [text('m4.tre.walk2', { a: placeL(at(ZOO_PLAN, rt.a)), d1: dirL(rt.d1), b: placeL(at(ZOO_PLAN, rt.b)), d2: dirL(rt.d2) }), planPart(ZOO_PLAN)],
    correct: placeL(answer),
    distractors: wrongs.slice(0, 3).map(placeL),
    rng,
  })
}

defineGenerator(KP, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 认一认：指南针上的八个方向、之间、相对（配指南针）；校园寻宝：课本的藏宝图（六成）或打乱的学校平面图上，
    // 建筑在学校的什么方向、某个方向上是什么建筑；绘制藏宝图：宝藏在建筑的哪个角（哪一面少一些）
    if (roll < 0.13) return qCompass(d, rng)
    if (roll < 0.26) return qBetween(d, rng, true)
    if (roll < 0.38) return qOpposite(d, rng, true)
    const p = schoolPlan(rng, rng.chance(0.6))
    if (roll < 0.56) return qInSchool(d, rng, p)
    if (roll < 0.72) return qWhatAt(d, rng, p)
    if (roll < 0.9) return qMark(d, rng, p, true)
    return qMark(d, rng, p, false)
  }
  if (d === 2) {
    // 复习与关联：动物园导游图（某个馆在狮虎山的什么方向、往某个方向走先到哪里）；两个建筑之间的方向；不配指南针说之间、相对
    if (roll < 0.25) return qZoo(d, rng)
    if (roll < 0.45) return qWalk(d, rng)
    if (roll < 0.65) return qRel(d, rng, schoolPlan(rng, rng.chance(0.4)), false)
    if (roll < 0.75) return qBetween(d, rng, false)
    if (roll < 0.85) return qOpposite(d, rng, false)
    return qMark(d, rng, schoolPlan(rng, false), rng.chance(0.6))
  }
  // 第 3 档：走两段路、隔一格的两个建筑（斜对角）
  if (roll < 0.5) return qWalk2(d, rng)
  return qRel(d, rng, schoolPlan(rng, rng.chance(0.4)), true)
})
