import { describe, expect, it } from 'vitest'
import type { ChanceBalls, ChanceColor, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 五上「可能性」三个知识点的专项检查（五年级数学 C）：从题目里的盒子、转盘、记录单、统计表反推答案，150 种子 × 三档；
// 一定 / 可能 / 不可能只有一个对的；「哪个盒子 / 哪一个」的编号对得上图；第 1 档出得到课本的例题和做一做。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const CN: Record<ChanceColor, string> = { red: '红', yellow: '黄', blue: '蓝', green: '绿', white: '白' }

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
const text = (q: Question): string => q.stem.map((p) => (p.kind === 'text' ? zh(p.text) : '')).join('')
const answerText = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const count = (balls: ChanceBalls[], c: ChanceColor): number => balls.find((b) => b.color === c)?.n ?? 0
const total = (balls: ChanceBalls[]): number => balls.reduce((s, b) => s + b.n, 0)
/** 题目文字里问的颜色（「红球」「红棋子」「红色」） */
const askedColor = (t: string): ChanceColor => {
  const m = /([红黄蓝绿白])(?:球|棋子|色)(?:吗|？|$)/.exec(t) ?? /摸(?:出|到)([红黄蓝绿白])/.exec(t) ?? /是([红黄蓝绿白])/.exec(t)
  return (Object.keys(CN) as ChanceColor[]).find((c) => CN[c] === m![1])!
}

describe('认识可能性：一定 / 可能 / 不可能和盒子对得上', () => {
  it('一个盒子（练习十九 1）：一定 = 全是这种颜色、可能 = 有但不全是、不可能 = 没有', () => {
    let n = 0
    each('m5s1-08-certain', (q) => {
      if (kind(q) !== 'one') return
      const balls = part(q, 'draw-box')!.boxes[0]!
      const ans = answerText(q)
      const c = (Object.keys(CN) as ChanceColor[]).find((x) => ans.includes(`${CN[x]}球`))!
      const k = count(balls, c)
      expect(ans, q.id).toBe(k === total(balls) ? `一定摸到${CN[c]}球` : k > 0 ? `可能摸到${CN[c]}球` : `不可能摸到${CN[c]}球`)
      n++
    })
    expect(n).toBeGreaterThan(20)
  })

  it('几个盒子（做一做、练习十九 7）：答案的编号对着符合要求的那个盒子，别的盒子都不符合', () => {
    each('m5s1-08-certain', (q) => {
      if (!['two', 'three'].includes(kind(q))) return
      const boxes = part(q, 'draw-box')!.boxes
      const t = text(q)
      const c = askedColor(t)
      const ok = (b: ChanceBalls[]): boolean =>
        /肯定|一定/.test(t) ? count(b, c) === total(b) : /不可能/.test(t) ? count(b, c) === 0 : count(b, c) > 0 && count(b, c) < total(b)
      const right = Number(/^(\d)/.exec(answerText(q))![1])
      boxes.forEach((b, i) => expect(ok(b), `${q.id} ${i + 1} 号`).toBe(i + 1 === right))
    })
  })

  it('例 1 抽签：第一个抽的可能抽到任何一个；抽走的那个不可能再抽到；最后一张一定是剩下的那个', () => {
    each('m5s1-08-certain', (q) => {
      if (!kind(q).startsWith('draw')) return
      const t = text(q)
      const ans = answerText(q)
      const shows = ['唱歌', '跳舞', '朗诵']
      const got = [...t.matchAll(/抽到了(唱歌|跳舞|朗诵)/g)].map((m) => m[1]!)
      if (kind(q) === 'draw2what') {
        expect(ans, q.id).toBe(shows.find((s) => !got.includes(s)))
        return
      }
      const p = /会抽到(唱歌|跳舞|朗诵)吗/.exec(t)![1]!
      if (got.length === 0) expect(ans, q.id).toBe('可能会')
      else if (got.length === 1) expect(ans, q.id).toBe(got.includes(p) ? '不可能' : '可能会')
      else expect(ans, q.id).toBe(got.includes(p) ? '不可能' : '一定会')
    })
  })

  it('一次摸 3 个棋子（红 7、蓝 3、黄 2）：3 个都是黄的不可能，红、蓝可能；颜色一共 9 种结果', () => {
    each('m5s1-08-certain', (q) => {
      if (kind(q) === 'threeof') {
        const c = askedColor(text(q))
        expect(answerText(q), q.id).toBe(c === 'yellow' ? '不可能' : '可能')
      }
      if (kind(q) === 'kinds') {
        // 自己数：红蓝黄三种颜色取 3 个（可重复，黄最多 2 个）
        let k = 0
        for (let r = 0; r <= 3; r++) for (let b = 0; b <= 3 - r; b++) if (3 - r - b <= 2) k++
        expect((q.answer as { value: number }).value).toBe(k)
      }
    })
  })
})

describe('可能性的大小：答案和图里的个数对得上', () => {
  it('盒子 / 袋子（例 2、做一做 1、练习十九 4）：可能性最大 = 个数最多，最小 = 最少', () => {
    each('m5s1-08-likely', (q) => {
      if (!['ex2', 'most', 'bag'].includes(kind(q))) return
      const balls = part(q, 'draw-box')!.boxes[0]!
      const sorted = [...balls].sort((a, b) => b.n - a.n)
      const want = /最小/.test(text(q)) ? sorted[sorted.length - 1]! : sorted[0]!
      expect(answerText(q).startsWith(CN[want.color]), q.id).toBe(true)
      // 题干的文字说清了个数（图不朗读）
      for (const b of balls) expect(text(q), q.id).toContain(String(b.n))
    })
  })

  it('转盘（练习十九 2）：可能性大 = 份数多的颜色，小 = 份数少的颜色', () => {
    each('m5s1-08-likely', (q) => {
      if (kind(q) !== 'spin') return
      const s = part(q, 'spinner')!.items[0]!
      const n = (c: ChanceColor): number => s.filter((x) => x === c).length
      const colors = [...new Set(s)]
      const ans = (Object.keys(CN) as ChanceColor[]).find((c) => answerText(q) === `${CN[c]}色`)!
      const other = colors.find((c) => c !== ans)!
      expect(/小/.test(text(q)) ? n(ans) < n(other) : n(ans) > n(other), q.id).toBe(true)
    })
  })

  it('两个盒子各 15 个（练习二十 2）：更容易摸到的盒子里这种颜色更多', () => {
    each('m5s1-08-likely', (q) => {
      if (kind(q) !== 'easier') return
      const boxes = part(q, 'draw-box')!.boxes
      expect(boxes.map(total)).toEqual([15, 15])
      const c = askedColor(text(q))
      const right = Number(/^(\d)/.exec(answerText(q))![1])
      expect(count(boxes[right - 1]!, c), q.id).toBeGreaterThan(count(boxes[2 - right]!, c))
    })
  })

  it('选转盘（练习二十 1）：只有答案那个符合要求', () => {
    each('m5s1-08-likely', (q) => {
      if (kind(q) !== 'wheel') return
      const items = part(q, 'spinner')!.items
      const full = /最大/.test(text(q))
      const ok = (w: ChanceColor[]): boolean => {
        const n = (c: ChanceColor): number => w.filter((x) => x === c).length
        const all3 = n('red') > 0 && n('yellow') > 0 && n('blue') > 0
        return full ? all3 && n('blue') > n('yellow') && n('yellow') > n('red') : all3
      }
      const right = Number(/^(\d)/.exec(answerText(q))![1])
      items.forEach((w, i) => {
        expect(w, q.id).toHaveLength(8)
        expect(ok(w), `${q.id} ${i + 1} 号`).toBe(i + 1 === right)
      })
    })
  })

  it('公平吗、涂正方体、掷一掷、10 张卡片', () => {
    each('m5s1-08-likely', (q) => {
      if (kind(q) === 'fair') {
        const s = part(q, 'spinner')?.items[0]
        const fair = !s || s.filter((x) => x === 'red').length === s.filter((x) => x === 'blue').length
        expect(answerText(q), q.id).toBe(fair ? '公平' : '不公平')
      }
      if (kind(q) === 'paint' && sig(q) !== 'paint-min') {
        const m = /红色 (\d) 个面，蓝色 (\d) 个面/.exec(answerText(q))!
        expect(Number(m[1]) > Number(m[2]) && Number(m[1]) + Number(m[2]) === 6, q.id).toBe(true)
        for (const c of q.choices!) {
          const x = /红色 (\d) 个面，蓝色 (\d) 个面/.exec(zh(c.label))!
          if (zh(c.label) !== answerText(q)) expect(Number(x[1]) <= Number(x[2]), q.id).toBe(true)
        }
      }
      if (sig(q) === 'paint-min') expect(answerText(q)).toBe('4')
      if (kind(q) === 'dice' && q.answer.kind === 'number') {
        // 两个 1–6 点数之和：自己数
        const sums = new Map<number, number>()
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) sums.set(a + b, (sums.get(a + b) ?? 0) + 1)
        const want = { 'dice-min': 2, 'dice-max': 12, 'dice-seven': sums.get(7), 'dice-best': [...sums].sort((x, y) => y[1] - x[1])[0]![0] }[sig(q)]
        expect(q.answer.value, q.id).toBe(want)
      }
      if (sig(q) === 'dice-game') {
        let teacher = 0
        for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= 5 && a + b <= 9) teacher++
        expect(answerText(q)).toBe(teacher === 18 ? '公平' : '不公平')
      }
      if (sig(q) === 'ten') {
        for (const c of q.choices!) {
          const [a, b, x, e] = [...zh(c.label).matchAll(/有 (\d+) 张/g)].map((m) => Number(m[1]))
          expect(a! + b! + x! + e!, q.id).toBe(10)
          const ok = a! > b! && a! > x! && a! > e! && b === x && e! < b! && e! > 0
          expect(ok, `${q.id} ${zh(c.label)}`).toBe(zh(c.label) === answerText(q))
        }
      }
    })
  })
})

describe('根据试验数据推测', () => {
  it('记录单（例 3 的一组）：摸出次数多的颜色可能多；每组摸 20 次', () => {
    each('m5s1-08-infer', (q) => {
      if (kind(q) !== 'group') return
      const rows = part(q, 'tally')!.rows
      expect(rows[0]!.count + rows[1]!.count).toBe(20)
      const more = rows[0]!.count > rows[1]!.count ? zh(rows[0]!.label) : zh(rows[1]!.label)
      expect(answerText(q), q.id).toBe(`${more}球多`)
      // 只问差得多的（3 倍以上）
      const [a, b] = [rows[0]!.count, rows[1]!.count].sort((x, y) => y - x)
      expect(a! / b!, q.id).toBeGreaterThanOrEqual(1.5)
    })
  })

  it('八个小组的表：合计、每组的另一种颜色、一共多少次', () => {
    each('m5s1-08-infer', (q) => {
      const t = part(q, 'stat-table')
      if (['total', 'rest'].includes(kind(q))) {
        if (sig(q) === 'total-all') expect(answerText(q)).toBe('160')
        if (sig(q) === 'total-r') expect(answerText(q)).toBe('123')
        if (sig(q) === 'total-y') expect(answerText(q)).toBe('37')
        if (kind(q) === 'rest') {
          const m = /摸出红球 (\d+) 次/.exec(text(q))!
          expect(answerText(q), q.id).toBe(String(20 - Number(m[1])))
        }
      }
      if (t && kind(q) === 'groups') {
        const red = t.rows[1]!.slice(1, 9) as number[]
        const yellow = t.rows[2]!.slice(1, 9) as number[]
        expect(red.reduce((s, x) => s + x, 0)).toBe(t.rows[1]![9])
        expect(yellow.reduce((s, x) => s + x, 0)).toBe(t.rows[2]![9])
        red.forEach((r, i) => expect(r + yellow[i]!).toBe(20))
        expect(answerText(q)).toBe('红球多')
      }
    })
  })

  it('做一做与练习十九 6：次数最多的颜色可能最多、最少的可能最少；小亮的判断（只差 1 次）不对', () => {
    each('m5s1-08-infer', (q) => {
      if (kind(q) === 'do3' && sig(q) === 'do3-most') expect(answerText(q)).toBe('红球')
      if (sig(q) === 'do3-liang') expect(answerText(q)).toBe('不对')
      if (kind(q) === 'p6') {
        const t = part(q, 'stat-table')!
        const names = (t.rows[0]!.slice(1) as LStr[]).map(zh)
        const times = t.rows[1]!.slice(1) as number[]
        const at = /最少/.test(text(q)) ? times.indexOf(Math.min(...times)) : times.indexOf(Math.max(...times))
        expect(answerText(q), q.id).toBe(`${names[at]}球`)
      }
    })
  })
})

describe('第 1 档出得到课本的例题和做一做', () => {
  const tier1 = (kp: string): string[] => {
    const out = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 400; seed++) out.add(sig(gen(1, createRng(seed))))
    return [...out]
  }
  it('认识可能性：导入、例 1 三问、做一做三问、练习十九 1', () => {
    const s = tier1('m5s1-08-certain')
    for (const need of ['intro-sun', 'intro-drop', 'intro-coin', 'intro-flower']) expect(s, need).toContain(need)
    for (const pre of ['draw0-', 'draw1-', 'draw2-', 'two-sure-red', 'two-maybe-green', 'two-never-green', 'one-0-', 'one-1-', 'one-2-', 'one-3-'])
      expect(s.some((x) => x.startsWith(pre)), pre).toBe(true)
  })
  it('可能性的大小：例 2、做一做 1、转盘、卡片、袋子、两个盒子、正方体', () => {
    const s = tier1('m5s1-08-likely')
    for (const need of ['ex2', 'most-0-max', 'most-0-min', 'spin-0', 'spin-1', 'cards-max', 'bag']) expect(s, need).toContain(need)
    for (const pre of ['easier-green', 'oddeven']) expect(s.some((x) => x.startsWith(pre)), pre).toBe(true)
  })
  it('根据试验数据推测：例 3 一组（15 / 5）、八个小组、做一做两问', () => {
    const s = tier1('m5s1-08-infer')
    for (const need of ['group-15-5', 'groups', 'do3-most', 'do3-liang']) expect(s, need).toContain(need)
  })
})
