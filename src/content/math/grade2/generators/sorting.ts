import type { Difficulty, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

export const CATEGORIES: { key: string; name: string; items: string[] }[] = [
  { key: 'fruit', name: '水果', items: ['🍎', '🍌', '🍓', '🍇', '🍊', '🍉'] },
  { key: 'animal', name: '小动物', items: ['🐶', '🐱', '🐰', '🐼', '🐷', '🐸'] },
  { key: 'vehicle', name: '交通工具', items: ['🚗', '🚕', '🚌', '✈️', '🚂', '🚲'] },
]

/** 按形状、按颜色分（例 1 的气球）：圆形 / 正方形 / 心形 × 红 / 黄 / 蓝 / 绿 */
export type Form = 'circle' | 'square' | 'heart'
export type Color = 'red' | 'yellow' | 'blue' | 'green'
export const FORMS: Form[] = ['circle', 'square', 'heart']
export const COLORS: Color[] = ['red', 'yellow', 'blue', 'green']
export const TOKEN: Record<Form, Record<Color, string>> = {
  circle: { red: '🔴', yellow: '🟡', blue: '🔵', green: '🟢' },
  square: { red: '🟥', yellow: '🟨', blue: '🟦', green: '🟩' },
  heart: { red: '❤️', yellow: '💛', blue: '💙', green: '💚' },
}
/** 象形统计图里的动物（选项要朗读，都用有名字的 emoji） */
export const ANIMALS = ['🐼', '🐶', '🐱', '🐰', '🐵', '🐯']

const KP = 'm2s1-01-sorting'

/** k 个互不相同的个数（2…6），用来让「最多 / 最少」只有一个答案 */
function distinctCounts(k: number, rng: RNG, lo = 2, hi = 6): number[] {
  return rng.shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, k)
}

/** 一堆形状 × 颜色的图形：按 by 这一种标准，各类的个数是 counts（另一种标准随机） */
function shapePile(by: 'form' | 'color', keys: string[], counts: number[], rng: RNG): string[] {
  const items: string[] = []
  keys.forEach((key, i) => {
    for (let n = 0; n < counts[i]!; n++) {
      const form = by === 'form' ? (key as Form) : rng.pick(FORMS)
      const color = by === 'color' ? (key as Color) : rng.pick(COLORS)
      items.push(TOKEN[form][color])
    }
  })
  return rng.shuffle(items)
}

/**
 * 分类与整理（二上第一单元）：
 * - 按形状 / 按颜色分，某一类有几个（例 1）
 * - 按形状 / 按颜色分，哪一类最多 / 最少（例 1「哪种气球最多？哪种最少？」）
 * - 看象形统计图（一个圈代表 1 名同学）：喜欢某个动物的有几人、哪个最多（练一练 3）
 * - 分一分、数一数，把分类结果整理到表格里（例 2）
 * - 数一类有几个（练一练 1「将车圈出来」）、找不同（少量）
 */
function genSorting(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.25) {
    // 按形状 / 按颜色分，某一类有几个
    const by = rng.chance(0.5) ? 'form' : 'color'
    const keys: string[] = by === 'form' ? rng.shuffle(FORMS).slice(0, rng.int(2, 3)) : rng.shuffle(COLORS).slice(0, d === 1 ? 3 : rng.int(3, 4))
    const counts = keys.map(() => rng.int(1, d === 1 ? 4 : 5))
    const items = shapePile(by, keys, counts, rng)
    const at = rng.int(0, keys.length - 1)
    const value = counts[at]!
    return numberQuestion({
      kpId: KP,
      type: 'sort',
      difficulty: d,
      sig: `by-${by}-${keys[at]}-${items.join('')}`,
      stem: [
        { kind: 'text', text: { k: by === 'form' ? 'q.sort.byForm' : 'q.sort.byColor', p: { c: { k: `cat.${keys[at]}` } } } },
        { kind: 'scatter', items },
      ],
      value,
      rng,
      min: 0,
      max: items.length,
      smart: [items.length - value, value + 1, value - 1, items.length],
    })
  }
  if (roll < 0.45) {
    // 哪一类最多 / 最少
    const by = rng.chance(0.5) ? 'form' : 'color'
    const keys: string[] = by === 'form' ? rng.shuffle(FORMS) : rng.shuffle(COLORS).slice(0, 3)
    const counts = distinctCounts(keys.length, rng)
    const items = shapePile(by, keys, counts, rng)
    const most = rng.chance(0.5)
    const target = keys[counts.indexOf(most ? Math.max(...counts) : Math.min(...counts))]!
    return labelQuestion({
      kpId: KP,
      type: 'sort',
      difficulty: d,
      sig: `${most ? 'most' : 'least'}-${by}-${items.join('')}`,
      stem: [
        { kind: 'text', text: { k: most ? 'q.sort.most' : 'q.sort.least', p: { by: { k: by === 'form' ? 'cat.byForm' : 'cat.byColor' } } } },
        { kind: 'scatter', items },
      ],
      correct: { k: `cat.${target}` },
      distractors: keys.filter((k) => k !== target).map((k) => ({ k: `cat.${k}` })),
      rng,
    })
  }
  if (roll < 0.65) {
    // 象形统计图：一个圈代表 1 名同学
    const animals = rng.shuffle(ANIMALS).slice(0, d === 1 ? 3 : rng.int(3, 4))
    const counts = distinctCounts(animals.length, rng, 2, 8)
    const tally: StemPart = { kind: 'tally', rows: animals.map((icon, i) => ({ label: { k: `emoji.${icon}` }, icon, count: counts[i]!, mark: 'circle' as const })) }
    if (rng.chance(0.55)) {
      const at = rng.int(0, animals.length - 1)
      const value = counts[at]!
      return numberQuestion({
        kpId: KP,
        type: 'sort',
        difficulty: d,
        sig: `tally-${animals.join('')}-${counts.join(',')}-${at}`,
        stem: [{ kind: 'text', text: { k: 'q.sort.tally', p: { a: animals[at]! } } }, tally],
        value,
        rng,
        min: 0,
        max: 10,
        smart: counts.filter((c) => c !== value),
      })
    }
    const target = animals[counts.indexOf(Math.max(...counts))]!
    return labelQuestion({
      kpId: KP,
      type: 'sort',
      difficulty: d,
      sig: `tallyMost-${animals.join('')}-${counts.join(',')}`,
      stem: [{ kind: 'text', text: { k: 'q.sort.tallyMost' } }, tally],
      correct: target,
      distractors: animals.filter((a) => a !== target),
      rng,
    })
  }
  if (roll < 0.8) {
    // 分一分、数一数，把表填完整（例 2：分类结果整理到表格里）
    const cats = rng.shuffle(CATEGORIES).slice(0, 3)
    const counts = cats.map(() => rng.int(2, d === 1 ? 4 : 5))
    const items = rng.shuffle(cats.flatMap((c, i) => rng.shuffle(c.items).slice(0, counts[i]!)))
    const at = rng.int(0, cats.length - 1)
    const value = counts[at]!
    return numberQuestion({
      kpId: KP,
      type: 'sort',
      difficulty: d,
      sig: `table-${items.join('')}-${at}`,
      stem: [
        { kind: 'text', text: { k: 'q.sort.table' } },
        { kind: 'scatter', items },
        { kind: 'stat-table', rows: [cats.map((c) => ({ k: `cat.${c.key}` })), counts.map((c, i) => (i === at ? null : c))], head: 'row' },
      ],
      value,
      rng,
      min: 0,
      max: items.length,
      smart: [items.length - value, value + 1, value - 1, items.length],
    })
  }
  const [catA, catB] = rng.shuffle(CATEGORIES).slice(0, 2) as [(typeof CATEGORIES)[number], (typeof CATEGORIES)[number]]
  if (roll < 0.92) {
    // 数一类有几个
    const a = rng.int(2, 5)
    const b = rng.int(2, 5)
    const picksA = rng.shuffle(catA.items).slice(0, a)
    const picksB = rng.shuffle(catB.items).slice(0, b)
    const items = rng.shuffle([...picksA, ...picksB])
    return numberQuestion({
      kpId: KP,
      type: 'sort',
      difficulty: d,
      sig: `cnt-${catA.key}-${items.join('')}`,
      stem: [
        { kind: 'text', text: { k: 'q.countCategory', p: { category: { k: `cat.${catA.key}` } } } },
        { kind: 'scatter', items },
      ],
      value: a,
      rng,
      min: 0,
      max: a + b,
      smart: [b, a + b, a + 1, a - 1],
    })
  }
  // 找不同：三个同类 + 一个异类
  const sameThree = rng.shuffle(catA.items).slice(0, 3)
  const odd = rng.pick(catB.items)
  return labelQuestion({
    kpId: KP,
    type: 'sort',
    difficulty: d,
    sig: `odd-${sameThree.join('')}-${odd}`,
    stem: [{ kind: 'text', text: { k: 'q.oddOne' } }],
    correct: odd,
    distractors: sameThree,
    rng,
  })
}

defineGenerator(KP, genSorting)
