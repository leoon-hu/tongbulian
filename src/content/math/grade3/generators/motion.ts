import type { Difficulty, LStr, MotionFig, MotionItem, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 生活中的运动现象（三下一，p1–9）：轴对称图形、平移、旋转（顺时针 / 逆时针）。
// 新版课本只到「认识」为止：没有方格纸、没有「平移了几格」、没有补全对称图形、没有旋转角度——这里也不出（笔记 C）。
// 图全是 MotionFigs 自己画的（不用 emoji 判断对称：各平台画出来不一样）。
// 朗读：「对称」读 duì chèn、「重合」chóng hé、「旋转」xuán zhuǎn、「转动」zhuàn dòng——这几个字都留在词里，不单独成片段；
// 不用「拧」「转」单字（拧 nǐng / níng、转 zhuǎn / zhuàn 读不准）。
// ─────────────────────────────────────────────────────────────

type Axis = NonNullable<MotionItem['axis']>

/** 图的中文名（静态页的图片说明 alt 用，不进应用） */
const FIG_NAME: Record<MotionFig, string> = {
  rect: '长方形',
  square: '正方形',
  scalene: '一般三角形',
  circle: '圆',
  parallelogram: '平行四边形',
  pentagon: '正五边形',
  'iso-tall': '等腰三角形（尖）',
  'iso-flat': '等腰三角形（扁）',
  star: '五角星',
  arrow: '左转弯箭头',
  paddle: '乒乓球拍',
  plane: '飞机',
  hoodie: '连帽衫',
  comb: '带弯柄的梳子',
  kettle: '侧面的水壶',
  car: '汽车正面',
  leaf: '叶子',
  kite: '燕子风筝',
  dragonfly: '蜻蜓',
  heart: '心形',
  tree: '小树',
  house: '小房子',
  fish: '小鱼',
  flag: '小旗',
  'right-tri': '直角三角形',
  quad: '四等分的圆（涂一块）',
  clock: '钟面',
  pinwheel: '风车',
  propeller: '螺旋桨',
}
const AXIS_NAME: Record<Axis, string> = { v: '竖着的中线', h: '横着的中线', d1: '左上到右下的对角线', d2: '右上到左下的对角线', off: '偏在一边的竖线' }
const CORNER = ['左下', '左上', '右上', '右下'] // 直角三角形 turn = 0 / 90 / 180 / 270 时直角在哪
const QUARTER = ['左上', '右上', '右下', '左下'] // 四等分的圆 turn = 0 / 90 / 180 / 270 时涂色的一块在哪

function itemAlt(it: MotionItem): string {
  if (it.blank && it.fig !== 'clock') return '？'
  const bits: string[] = []
  if (it.label !== undefined) bits.push(`${it.label} 号`)
  if (it.tone === 'red') bits.push('红色的')
  let name = FIG_NAME[it.fig]
  if (it.fig === 'right-tri') name = `直角在${CORNER[((it.turn ?? 0) / 90) % 4]}的直角三角形`
  else if (it.fig === 'quad') name = `涂了${QUARTER[((it.turn ?? 0) / 90) % 4]}一块的圆`
  else if (it.fig === 'clock') name = it.blank ? '时针还没画的钟面' : `时针指着 ${it.hour} 的钟面`
  else {
    if (it.flip) name = `左右翻过来的${name}`
    if (it.turn) name = `转了方向的${name}`
  }
  if (it.half) name = `${name}的左半边（右边的虚线是折痕）`
  bits.push(name)
  if (it.axis) bits.push(`，上面画着一条红虚线（${AXIS_NAME[it.axis]}）`)
  if (it.arrow && !it.move) bits.push(`，旁边的箭头是${it.arrow === 'cw' ? '顺时针' : '逆时针'}方向`)
  if (it.move === 'turn') bits.push(`，虚线是原来的样子，实线和虚线的中心在同一个地方、朝向不一样，旁边的箭头是${it.arrow === 'ccw' ? '逆时针' : '顺时针'}方向`)
  else if (it.move) bits.push(`，虚线是原来的位置，实线在虚线的${it.move === 'up' ? '上面' : it.move === 'right' ? '右边' : '斜下方'}，朝向和虚线一样`)
  return bits.join('')
}

function figs(items: MotionItem[], arrows = false): StemPart {
  const alt = arrows ? `按顺序：${items.map(itemAlt).join(' → ')}` : `图：${items.map(itemAlt).join('；')}`
  return arrows ? { kind: 'motion-figs', items, arrows: true, alt } : { kind: 'motion-figs', items, alt }
}
const text = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const opt = (k: string): LStr => ({ k })
/** 选项是图下面的号：按 1、2、3 的顺序排（孩子对着图找号，打乱了不好找） */
function inOrder(q: Question): Question {
  q.choices?.sort((x, y) => Number(x.label) - Number(y.label))
  return q
}

// ─────────────────────────────────────────────────────────────
// 轴对称图形（p2–3、练习一 1）：对折后能完全重合的图形是轴对称图形；长方形 2 条对称轴、正方形 4 条
// ─────────────────────────────────────────────────────────────

/** 按 MotionFigs 的画法，哪些是轴对称图形（对称的都以竖着的中线为对称轴） */
export const SYMMETRIC: Partial<Record<MotionFig, boolean>> = {
  rect: true,
  square: true,
  circle: true,
  pentagon: true,
  'iso-tall': true,
  'iso-flat': true,
  star: true,
  paddle: true,
  plane: true,
  hoodie: true,
  car: true,
  leaf: true,
  kite: true,
  dragonfly: true,
  heart: true,
  tree: true,
  scalene: false,
  parallelogram: false,
  arrow: false,
  comb: false,
  kettle: false,
  fish: false,
  flag: false,
}
/** 第 1 档：课本例 1 与练习一 1、p3 做一做 1 的图形（水壶也在做一做 1 里）；不对称的只用一眼看得出的 */
const SYM_EASY: MotionFig[] = ['rect', 'square', 'circle', 'iso-tall', 'pentagon', 'star', 'paddle', 'plane', 'hoodie', 'car', 'leaf', 'kite', 'heart']
export const ASYM_EASY: MotionFig[] = ['scalene', 'parallelogram', 'arrow', 'comb', 'kettle']
const SYM_ALL: MotionFig[] = [...SYM_EASY, 'iso-flat', 'dragonfly', 'tree']
const ASYM_ALL: MotionFig[] = [...ASYM_EASY, 'fish', 'flag']

function genIsSym(kpId: string, d: Difficulty, rng: RNG): Question {
  const yes = rng.chance(0.55)
  const fig = rng.pick(yes ? (d === 1 ? SYM_EASY : SYM_ALL) : d === 1 ? ASYM_EASY : ASYM_ALL)
  return labelQuestion({
    kpId,
    type: 'symmetry',
    difficulty: d,
    sig: `is-${fig}`,
    stem: [text('m3.mot.isSym'), figs([{ fig }])],
    correct: opt(yes ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(yes ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 长方形有 2 条对称轴、正方形有 4 条（例 1 下面的对话） */
function genAxisCount(kpId: string, d: Difficulty, rng: RNG): Question {
  const square = rng.chance(0.5)
  const value = square ? 4 : 2
  return numberQuestion({
    kpId,
    type: 'symmetry',
    difficulty: d,
    sig: `axes-${square ? 'square' : 'rect'}`,
    stem: [text('m3.mot.axisCount', { shape: { k: square ? 'shape.square' : 'shape.rectangle' } }), figs([{ fig: square ? 'square' : 'rect' }])],
    value,
    rng,
    min: 1,
    max: 8,
    smart: square ? [2, 1, 8] : [4, 1, 3],
  })
}

/** 四个图里挑出唯一一个是（不是）轴对称图形的，选项是图下面的号 */
function genPickSym(kpId: string, d: Difficulty, rng: RNG): Question {
  const wantSym = rng.chance(0.5)
  const odd = rng.pick(wantSym ? SYM_ALL : ASYM_ALL)
  const others = rng.shuffle(wantSym ? ASYM_ALL : SYM_ALL).slice(0, 3)
  const order = rng.shuffle([odd, ...others])
  return inOrder(
    numberQuestion({
      kpId,
      type: 'symmetry',
      difficulty: d,
      sig: `pick-${wantSym ? 'sym' : 'asym'}-${order.join(',')}`,
      stem: [text(wantSym ? 'm3.mot.pickSym' : 'm3.mot.pickAsym'), figs(order.map((fig, i) => ({ fig, label: i + 1 })))],
      value: order.indexOf(odd) + 1,
      rng,
      min: 1,
      max: 4,
      input: 'choice',
    }),
  )
}

/** 图上一条红虚线，是不是对称轴：ok 按图形的样子定（长方形的对角线不是，正方形的是） */
export const AXIS_CASES: { fig: MotionFig; axis: Axis; ok: boolean; hard?: boolean }[] = [
  { fig: 'leaf', axis: 'v', ok: true },
  { fig: 'leaf', axis: 'off', ok: false },
  { fig: 'star', axis: 'v', ok: true },
  { fig: 'star', axis: 'h', ok: false },
  { fig: 'heart', axis: 'v', ok: true },
  { fig: 'heart', axis: 'h', ok: false },
  { fig: 'plane', axis: 'v', ok: true },
  { fig: 'plane', axis: 'h', ok: false },
  { fig: 'kite', axis: 'v', ok: true },
  { fig: 'car', axis: 'v', ok: true },
  { fig: 'car', axis: 'off', ok: false },
  { fig: 'iso-tall', axis: 'v', ok: true },
  { fig: 'iso-tall', axis: 'h', ok: false },
  { fig: 'iso-flat', axis: 'v', ok: true },
  { fig: 'pentagon', axis: 'v', ok: true },
  { fig: 'pentagon', axis: 'h', ok: false },
  { fig: 'rect', axis: 'v', ok: true },
  { fig: 'rect', axis: 'h', ok: true },
  { fig: 'rect', axis: 'off', ok: false },
  { fig: 'square', axis: 'v', ok: true },
  { fig: 'square', axis: 'h', ok: true },
  { fig: 'circle', axis: 'v', ok: true },
  { fig: 'circle', axis: 'off', ok: false },
  // 容易错的：长方形的对角线不是对称轴，正方形的是；圆的每条直径都是；平行四边形没有对称轴
  { fig: 'rect', axis: 'd1', ok: false, hard: true },
  { fig: 'rect', axis: 'd2', ok: false, hard: true },
  { fig: 'square', axis: 'd1', ok: true, hard: true },
  { fig: 'square', axis: 'd2', ok: true, hard: true },
  { fig: 'circle', axis: 'h', ok: true, hard: true },
  { fig: 'circle', axis: 'd1', ok: true, hard: true },
  { fig: 'parallelogram', axis: 'd1', ok: false, hard: true },
  { fig: 'parallelogram', axis: 'h', ok: false, hard: true },
  { fig: 'parallelogram', axis: 'v', ok: false, hard: true },
]
function genIsAxis(kpId: string, d: Difficulty, rng: RNG): Question {
  const pool = AXIS_CASES.filter((c) => (d === 3 ? true : !c.hard))
  // 「是」「不是」大致各半
  const want = rng.chance(0.5)
  const c = rng.pick(pool.filter((x) => x.ok === want))
  return labelQuestion({
    kpId,
    type: 'symmetry',
    difficulty: d,
    sig: `axis-${c.fig}-${c.axis}`,
    stem: [text('m3.mot.isAxis'), figs([{ fig: c.fig, axis: c.axis }])],
    correct: opt(c.ok ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(c.ok ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 对折剪纸（p3 做一做 2）：左半边 + 右边的折痕 ↔ 展开后的整个图形；两个方向都出 */
export const FOLD_FIGS: MotionFig[] = ['heart', 'tree', 'circle', 'iso-tall', 'star', 'leaf', 'kite', 'pentagon', 'paddle', 'plane', 'car', 'hoodie']
function genFold(kpId: string, d: Difficulty, rng: RNG): Question {
  const pool = d === 1 ? FOLD_FIGS.slice(0, 8) : FOLD_FIGS
  const [answer, ...others] = rng.shuffle(pool).slice(0, 3) as [MotionFig, MotionFig, MotionFig]
  const order = rng.shuffle([answer, ...others])
  const open = rng.chance(0.6)
  const stem: StemPart[] = open
    ? [text('m3.mot.foldOpen'), figs([{ fig: answer, half: true, tone: 'paper' }]), figs(order.map((fig, i) => ({ fig, tone: 'paper', label: i + 1 })))]
    : [text('m3.mot.foldFrom'), figs([{ fig: answer, tone: 'paper' }]), figs(order.map((fig, i) => ({ fig, half: true, tone: 'paper', label: i + 1 })))]
  return inOrder(
    numberQuestion({
      kpId,
      type: 'symmetry',
      difficulty: d,
      sig: `fold-${open ? 'open' : 'from'}-${answer}-${order.join(',')}`,
      stem,
      value: order.indexOf(answer) + 1,
      rng,
      min: 1,
      max: 3,
      input: 'choice',
    }),
  )
}

defineGenerator('m3s2-01-symmetry', (d, rng) => {
  const kpId = 'm3s2-01-symmetry'
  const roll = rng.next()
  if (d === 1) return roll < 0.62 ? genIsSym(kpId, d, rng) : roll < 0.8 ? genAxisCount(kpId, d, rng) : genFold(kpId, d, rng)
  if (d === 2)
    return roll < 0.35
      ? genPickSym(kpId, d, rng)
      : roll < 0.5
        ? genAxisCount(kpId, d, rng)
        : roll < 0.65
          ? genIsSym(kpId, d, rng)
          : roll < 0.85
            ? genIsAxis(kpId, d, rng)
            : genFold(kpId, d, rng)
  return roll < 0.4 ? genIsAxis(kpId, d, rng) : roll < 0.75 ? genFold(kpId, d, rng) : genPickSym(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 平移与旋转：生活里的现象（p4–6 做一做、练习一 2）。只用课本里的典型现象；漫步机（摆动）不用。
// ─────────────────────────────────────────────────────────────

interface Scene {
  /** 一句话的现象（题干） */
  key: string
  /** 两三个字的短说法（「哪个不是平移现象」的选项） */
  short?: string
  motion: 'translate' | 'rotate'
  icon?: string
}
export const SCENES: Scene[] = [
  { key: 'm3.mot.s.elevator', short: 'm3.mot.o.elevator', motion: 'translate' },
  { key: 'm3.mot.s.slide', short: 'm3.mot.o.slide', motion: 'translate' },
  { key: 'm3.mot.s.window', short: 'm3.mot.o.window', motion: 'translate' },
  { key: 'm3.mot.s.cableCar', short: 'm3.mot.o.cableCar', motion: 'translate', icon: '🚡' },
  { key: 'm3.mot.s.drawer', short: 'm3.mot.o.drawer', motion: 'translate', icon: '🗄️' },
  { key: 'm3.mot.s.boxes', short: 'm3.mot.o.boxes', motion: 'translate', icon: '📦' },
  { key: 'm3.mot.s.luggage', motion: 'translate', icon: '🧳' },
  { key: 'm3.mot.s.pinwheel', short: 'm3.mot.o.pinwheel', motion: 'rotate' },
  { key: 'm3.mot.s.propeller', motion: 'rotate', icon: '🚁' },
  { key: 'm3.mot.s.clockHand', short: 'm3.mot.o.clockHand', motion: 'rotate', icon: '🕰️' },
  { key: 'm3.mot.s.fan', short: 'm3.mot.o.fan', motion: 'rotate' },
  { key: 'm3.mot.s.tap', motion: 'rotate', icon: '🚰' },
  { key: 'm3.mot.s.waterwheel', short: 'm3.mot.o.waterwheel', motion: 'rotate' },
  { key: 'm3.mot.s.millstone', short: 'm3.mot.o.millstone', motion: 'rotate' },
  { key: 'm3.mot.s.cube', short: 'm3.mot.o.cube', motion: 'rotate' },
]

/** 「……，这是平移还是旋转？」main = 这个知识点主要考的那种（六成） */
function genScene(kpId: string, d: Difficulty, rng: RNG, main: 'translate' | 'rotate'): Question {
  const motion = rng.chance(0.6) ? main : main === 'translate' ? 'rotate' : 'translate'
  const s = rng.pick(SCENES.filter((x) => x.motion === motion))
  const stem: StemPart[] = [text('m3.mot.which', { scene: { k: s.key } })]
  if (s.icon) stem.push({ kind: 'picture', icon: s.icon })
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `scene-${s.key}`,
    stem,
    correct: opt(s.motion === 'translate' ? 'm3.mot.translate' : 'm3.mot.rotate'),
    distractors: [opt(s.motion === 'translate' ? 'm3.mot.rotate' : 'm3.mot.translate')],
    rng,
  })
}

/** 运动示意图：虚线是原来的位置、实线是现在的——位置变了朝向没变是平移，绕中心转了是旋转（p4、p5 的示意图） */
function genPicture(kpId: string, d: Difficulty, rng: RNG, main: 'translate' | 'rotate'): Question {
  const slide = rng.chance(0.55) === (main === 'translate')
  const fig = rng.pick(['house', 'fish', 'flag', 'rect'] as const)
  if (slide) {
    const move = rng.pick(['up', 'right', 'slide'] as const)
    return labelQuestion({
      kpId,
      type: 'motion',
      difficulty: d,
      sig: `pic-${fig}-${move}`,
      stem: [text('m3.mot.picWhich'), figs([{ fig, move }])],
      correct: opt('m3.mot.translate'),
      distractors: [opt('m3.mot.rotate')],
      rng,
    })
  }
  const arrow = rng.pick(['cw', 'ccw'] as const)
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `pic-${fig}-turn-${arrow}`,
    stem: [text('m3.mot.picWhich'), figs([{ fig, move: 'turn', arrow }])],
    correct: opt('m3.mot.rotate'),
    distractors: [opt('m3.mot.translate')],
    rng,
  })
}

/** 「……的运动是什么？」（定义）与顺时针 / 逆时针的定义（p4、p5、p6 的红字） */
function genDefinition(kpId: string, d: Difficulty, rng: RNG, which: ('translate' | 'rotate' | 'cw' | 'ccw' | 'clock')[]): Question {
  const w = rng.pick(which)
  if (w === 'translate' || w === 'rotate') {
    return labelQuestion({
      kpId,
      type: 'motion',
      difficulty: d,
      sig: `def-${w}`,
      stem: [text(w === 'translate' ? 'm3.mot.defTranslate' : 'm3.mot.defRotate')],
      correct: opt(w === 'translate' ? 'm3.mot.translate' : 'm3.mot.rotate'),
      distractors: [opt(w === 'translate' ? 'm3.mot.rotate' : 'm3.mot.translate')],
      rng,
    })
  }
  const cw = w !== 'ccw'
  const stem: StemPart[] =
    w === 'clock'
      ? [text('m3.mot.clockDir'), figs([{ fig: 'clock', hour: rng.pick([2, 3, 4, 8, 9, 10]) }])]
      : [text(w === 'cw' ? 'm3.mot.defCw' : 'm3.mot.defCcw')]
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `def-${w}`,
    stem,
    correct: opt(cw ? 'm3.mot.cw' : 'm3.mot.ccw'),
    distractors: [opt(cw ? 'm3.mot.ccw' : 'm3.mot.cw')],
    rng,
  })
}

/** 「下面哪个不是平移（旋转）现象？」三个短说法里挑出另一种（练习一 2、p6 做一做 1） */
function genNotMotion(kpId: string, d: Difficulty, rng: RNG, main: 'translate' | 'rotate'): Question {
  const withShort = SCENES.filter((s) => s.short)
  const odd = rng.pick(withShort.filter((s) => s.motion !== main))
  const others = rng.shuffle(withShort.filter((s) => s.motion === main)).slice(0, 2)
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `not-${odd.short}-${others.map((o) => o.short).join(',')}`,
    stem: [text(main === 'translate' ? 'm3.mot.notTranslate' : 'm3.mot.notRotate')],
    correct: opt(odd.short!),
    distractors: others.map((o) => opt(o.short!)),
    rng,
  })
}

// ─────────────────────────────────────────────────────────────
// 平移第 1 档只问「是不是平移」（p4 做一做 1「哪些是平移现象」）：旋转到 p5 才教，平移知识点第 1 档的题目和选项里都不出「旋转」；
// 分平移还是旋转的题放在旋转知识点（p6 做一做 1）和平移的第 2、3 档。
// ─────────────────────────────────────────────────────────────

/** 「……，这是平移现象，对吗？」约六成是平移现象 */
function genIsTranslate(kpId: string, d: Difficulty, rng: RNG): Question {
  const yes = rng.chance(0.6)
  const s = rng.pick(SCENES.filter((x) => (x.motion === 'translate') === yes))
  const stem: StemPart[] = [text('m3.mot.isTranslate', { scene: { k: s.key } })]
  if (s.icon) stem.push({ kind: 'picture', icon: s.icon })
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `isTr-${s.key}`,
    stem,
    correct: opt(yes ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(yes ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 示意图（p4 电梯、滑梯下面的图）：虚线是原来的位置，实线是现在的。这是平移，对吗？ */
function genPictureIs(kpId: string, d: Difficulty, rng: RNG): Question {
  const slide = rng.chance(0.6)
  const fig = rng.pick(['house', 'fish', 'flag', 'rect'] as const)
  const item: MotionItem = slide ? { fig, move: rng.pick(['up', 'right', 'slide'] as const) } : { fig, move: 'turn', arrow: rng.pick(['cw', 'ccw'] as const) }
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `picIs-${fig}-${item.move}${item.arrow ? `-${item.arrow}` : ''}`,
    stem: [text('m3.mot.picIsTranslate'), figs([item])],
    correct: opt(slide ? 'm3.opt.right' : 'm3.opt.wrong'),
    distractors: [opt(slide ? 'm3.opt.wrong' : 'm3.opt.right')],
    rng,
  })
}

/** 「下面哪个是平移现象？」三个短说法里挑出唯一的平移现象（p4 做一做 1） */
function genPickTranslate(kpId: string, d: Difficulty, rng: RNG): Question {
  const withShort = SCENES.filter((s) => s.short)
  const hit = rng.pick(withShort.filter((s) => s.motion === 'translate'))
  const others = rng.shuffle(withShort.filter((s) => s.motion !== 'translate')).slice(0, 2)
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `pickTr-${hit.short}-${others.map((o) => o.short).join(',')}`,
    stem: [text('m3.mot.pickTranslate')],
    correct: opt(hit.short!),
    distractors: others.map((o) => opt(o.short!)),
    rng,
  })
}

// ─────────────────────────────────────────────────────────────
// 平移：哪个能通过平移和红色的重合（p5 做一做 2 小房子、练习一 3 小鱼）。
// 只有朝向完全一样的才能通过平移重合；转过的、翻过来的都不行。小房子的门在右边，翻过来门就到了左边。
// ─────────────────────────────────────────────────────────────

interface Pose {
  turn: number
  flip: boolean
}
const SAME: Pose = { turn: 0, flip: false }
const TURNED: Pose[] = [
  { turn: 90, flip: false },
  { turn: 180, flip: false },
  { turn: 270, flip: false },
]
const FLIPPED: Pose[] = [
  { turn: 0, flip: true },
  { turn: 90, flip: true },
  { turn: 180, flip: true },
]
const poseKey = (p: Pose): string => `${p.turn}${p.flip ? 'f' : ''}`
const MOVERS = ['house', 'fish', 'flag'] as const
const OVERLAP_KEY: Record<(typeof MOVERS)[number], string> = { house: 'm3.mot.overlapHouse', fish: 'm3.mot.overlapFish', flag: 'm3.mot.overlapFlag' }
const COUNT_KEY: Record<(typeof MOVERS)[number], string> = { house: 'm3.mot.countHouse', fish: 'm3.mot.countFish', flag: 'm3.mot.countFlag' }

/** 红色的那个 + 三（四）个标了号的：只有一个朝向和红色的一样 */
function genCanOverlap(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = rng.pick(d === 1 ? (['house', 'fish'] as const) : MOVERS)
  // 第 1 档像课本的小房子：别的只是转过的；第 2 档起也有翻过来的（镜子里的样子）
  const wrongPool = d === 1 ? TURNED : [...TURNED, ...FLIPPED]
  const count = d === 1 ? 3 : 4
  const wrongs = rng.shuffle(wrongPool).slice(0, count - 1)
  const order = rng.shuffle([SAME, ...wrongs])
  const items: MotionItem[] = [{ fig, tone: 'red' }, ...order.map((p, i) => ({ fig, turn: p.turn || undefined, flip: p.flip || undefined, label: i + 1 }))]
  return inOrder(
    numberQuestion({
      kpId,
      type: 'motion',
      difficulty: d,
      sig: `overlap-${fig}-${order.map(poseKey).join(',')}`,
      stem: [text(OVERLAP_KEY[fig]), figs(items)],
      value: order.indexOf(SAME) + 1,
      rng,
      min: 1,
      max: count,
      input: 'choice',
    }),
  )
}

/** 一排里有几个能通过平移和红色的重合（练习一 3：7 条小鱼里有 3 条）：红色的自己不算 */
function genCountOverlap(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = rng.pick(d === 2 ? (['fish', 'house'] as const) : MOVERS)
  const total = d === 2 ? rng.int(5, 6) : rng.int(6, 7)
  const same = rng.int(1, total - 3)
  const others = Array.from({ length: total - 1 - same }, () => rng.pick([...TURNED, ...FLIPPED]))
  const poses = rng.shuffle<Pose | 'red'>(['red', ...Array.from({ length: same }, () => SAME), ...others])
  const items: MotionItem[] = poses.map((p) => (p === 'red' ? { fig, tone: 'red' } : { fig, turn: p.turn || undefined, flip: p.flip || undefined }))
  return numberQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `count-${fig}-${poses.map((p) => (p === 'red' ? 'r' : poseKey(p))).join(',')}`,
    stem: [text(COUNT_KEY[fig]), figs(items)],
    value: same,
    rng,
    min: 0,
    max: total - 1,
    smart: [same + 1, total - 1 - same, same - 1],
  })
}

defineGenerator('m3s2-01-translate', (d, rng) => {
  const kpId = 'm3s2-01-translate'
  const roll = rng.next()
  if (d === 1)
    return roll < 0.35
      ? genIsTranslate(kpId, d, rng)
      : roll < 0.55
        ? genPictureIs(kpId, d, rng)
        : roll < 0.7
          ? genPickTranslate(kpId, d, rng)
          : genCanOverlap(kpId, d, rng)
  if (d === 2)
    return roll < 0.3
      ? genCanOverlap(kpId, d, rng)
      : roll < 0.55
        ? genCountOverlap(kpId, d, rng)
        : roll < 0.75
          ? genScene(kpId, d, rng, 'translate')
          : genDefinition(kpId, d, rng, ['translate', 'rotate'])
  return roll < 0.35 ? genCountOverlap(kpId, d, rng) : roll < 0.65 ? genNotMotion(kpId, d, rng, 'translate') : roll < 0.85 ? genCanOverlap(kpId, d, rng) : genPicture(kpId, d, rng, 'translate')
})

// ─────────────────────────────────────────────────────────────
// 旋转：顺时针 / 逆时针（与时针旋转方向相同的是顺时针旋转，p6）；按规律接下去（练习一 5 钟面、6 直角三角形与涂色的圆）。
// ─────────────────────────────────────────────────────────────

/** 风车 / 螺旋桨按箭头转，是顺时针还是逆时针（弧形箭头画在右上方，箭头在哪一头看方向） */
function genDirection(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = rng.pick(['pinwheel', 'propeller'] as const)
  const arrow = rng.pick(['cw', 'ccw'] as const)
  return labelQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `dir-${fig}-${arrow}`,
    stem: [text(fig === 'pinwheel' ? 'm3.mot.dirPinwheel' : 'm3.mot.dirPropeller'), figs([{ fig, arrow }])],
    correct: opt(arrow === 'cw' ? 'm3.mot.cw' : 'm3.mot.ccw'),
    distractors: [opt(arrow === 'cw' ? 'm3.mot.ccw' : 'm3.mot.cw')],
    rng,
  })
}

/** 按规律，最后一幅钟面上的时针指着几（练习一 5：分针都指 12，时针 12 → 3 → 6 → ?，答 9） */
function genClockPattern(kpId: string, d: Difficulty, rng: RNG): Question {
  // 第 2 档同课本每次走 3 格；第 3 档每次走 1、2、4 格，也有逆时针往回走的
  const step = d === 3 ? rng.pick([1, 2, 4, -3, -2]) : 3
  const h0 = rng.int(1, 12)
  const at = (k: number): number => ((((h0 + k * step - 1) % 12) + 12) % 12) + 1
  const value = at(3)
  return numberQuestion({
    kpId,
    type: 'motion',
    difficulty: d,
    sig: `clock-${h0}-${step}`,
    stem: [
      text('m3.mot.clockNext'),
      figs(
        [0, 1, 2, 3].map((k): MotionItem => (k < 3 ? { fig: 'clock', hour: at(k) } : { fig: 'clock', blank: true })),
        true,
      ),
    ],
    value,
    rng,
    min: 1,
    max: 12,
    smart: [at(2), at(4), at(1)],
  })
}

/** 找规律，接下来是哪个图形（练习一 6）：直角三角形 / 四等分的圆每次转 90°，顺时针、逆时针都有 */
function genNextShape(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = rng.pick(['right-tri', 'quad'] as const)
  const step = rng.pick([90, -90])
  const start = rng.pick([0, 90, 180, 270])
  const turnAt = (k: number): number => (((start + k * step) % 360) + 360) % 360
  const answer = turnAt(3)
  // 干扰项：前面出现过的朝向（最后一个、倒数第二个、第一个里挑两个）
  const wrongs = rng.shuffle([turnAt(0), turnAt(1), turnAt(2)]).slice(0, 2)
  const order = rng.shuffle([answer, ...wrongs])
  return inOrder(
    numberQuestion({
      kpId,
      type: 'motion',
      difficulty: d,
      sig: `next-${fig}-${start}-${step}-${order.join(',')}`,
      stem: [
        text('m3.mot.nextShape'),
        figs([...[0, 1, 2].map((k): MotionItem => ({ fig, turn: turnAt(k) || undefined })), { fig, blank: true }], true),
        figs(order.map((t, i) => ({ fig, turn: t || undefined, label: i + 1 }))),
      ],
      value: order.indexOf(answer) + 1,
      rng,
      min: 1,
      max: 3,
      input: 'choice',
    }),
  )
}

defineGenerator('m3s2-01-rotate', (d, rng) => {
  const kpId = 'm3s2-01-rotate'
  const roll = rng.next()
  if (d === 1)
    return roll < 0.35
      ? genScene(kpId, d, rng, 'rotate')
      : roll < 0.65
        ? genDirection(kpId, d, rng)
        : roll < 0.8
          ? genPicture(kpId, d, rng, 'rotate')
          : genDefinition(kpId, d, rng, ['rotate', 'cw', 'ccw', 'clock'])
  if (d === 2)
    return roll < 0.2
      ? genDirection(kpId, d, rng)
      : roll < 0.5
        ? genClockPattern(kpId, d, rng)
        : roll < 0.7
          ? genNextShape(kpId, d, rng)
          : roll < 0.85
            ? genDefinition(kpId, d, rng, ['cw', 'ccw', 'clock'])
            : genNotMotion(kpId, d, rng, 'rotate')
  return roll < 0.45 ? genNextShape(kpId, d, rng) : roll < 0.75 ? genClockPattern(kpId, d, rng) : genNotMotion(kpId, d, rng, 'rotate')
})
