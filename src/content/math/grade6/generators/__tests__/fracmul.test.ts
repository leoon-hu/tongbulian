import { describe, expect, it } from 'vitest'
import type { BarRow, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'

// 六上「二 分数乘法」（六年级数学 B）的专项检查：150 种子 × 三档，答案一律从题干文字 / 算式 / 图里的数另算一遍（浮点数，
// 不用生成器的分数算法）；选项里只有一个对的；第 1 档出得到课本的每个例题和做一做；朗读避坑（不出现读不准的字）。

const K = {
  int: 'm6s1-02-frac-int',
  num: 'm6s1-02-num-frac',
  ff: 'm6s1-02-frac-frac',
  dec: 'm6s1-02-dec-frac',
  law: 'm6s1-02-laws',
  chain: 'm6s1-02-chain',
  ml: 'm6s1-02-more-less',
}
const ALL = Object.values(K)
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}

/** 另算一遍：把算式换成 JS 浮点数算式（带分数「3 3/86」→ (3+3/86)，分数加括号），只放数字和运算符 */
function val(s: string): number {
  const js = s
    .trim()
    .replace(/(\d+) (\d+)\/(\d+)/g, '($1+$2/$3)')
    .replace(/(\d+(?:\.\d+)?)\/(\d+)/g, '($1/$2)')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
  if (!/^[\d\s.+\-*/()]+$/.test(js)) throw new Error(`算不了：${s}`)
  return Function(`return (${js})`)() as number
}
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b))
const isNumLabel = (s: string): boolean => /^[\d. / ]+$/.test(s) && /\d/.test(s)
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
/** 题干里的文字（几段之间隔一个空格，正则里的 \S+ 不会跨段） */
const texts = (q: Question): string => q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)).join(' ')
const exprs = (q: Question): string[] => q.stem.filter((p) => p.kind === 'expr').map((p) => (p as { expr: string }).expr)
const part = <T extends StemPart['kind']>(q: Question, kind: T): Extract<StemPart, { kind: T }> | undefined => q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: T }> | undefined
const correctLabel = (q: Question): string => zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
/** 答案的值：数字键盘的数，或者正确选项（数）的值；选项是文字时 null */
function answerVal(q: Question): number | null {
  if (q.answer.kind === 'number') return q.answer.value
  const l = correctLabel(q)
  return isNumLabel(l) ? val(l) : null
}
function m(re: RegExp, s: string, id: string): RegExpExecArray {
  const r = re.exec(s)
  if (!r) throw new Error(`${id} 的题干对不上：${s}`)
  return r
}

/**
 * 从题干（文字、算式、图）另算出这道题应该的答案。返回数（数值答案）、字符串（文字选项的正确项）或 boolean（判断题：这样算对不对）；
 * 认不出的题型抛错（每种题都要有核对）。
 */
function expected(q: Question): number | string | boolean {
  const s = sig(q)
  const t = texts(q)
  const e = exprs(q)
  const id = q.id
  const calc = (): number => val(e[0]!.replace(/=\s*\?$/, ''))
  const judge = (): boolean => {
    const segs = e[0]!.split('=').map((x) => x.trim())
    return near(val(segs[0]!), val(segs[segs.length - 1]!))
  }
  const cmp = (): string => {
    const [x, y] = e[0]!.split('○').map((v) => val(v))
    return near(x!, y!) ? '=' : x! < y! ? '<' : '>'
  }
  // ── 通用的几种 ──
  if (/^(int|plain|reduce|big|frac|mix|order|ex4a|ex4b|ex4c|mixed|simple|split|pattern13|do|ex)-/.test(s) && e.length && /=\s*\?$/.test(e[0]!)) return calc()
  if (/^(judge|badreduce)-/.test(s) && e.length) return judge()
  if (/^cmp-/.test(s)) return cmp()
  if (/^fix-/.test(s)) return val(m(/^(.+) 的正确结果是多少/, t, id)[1]!)
  if (/^(rule-num)$/.test(s)) return '分子'
  if (/^(rule-den)$/.test(s)) return q.kpId === K.ff ? '分母' : '不变'

  switch (q.kpId) {
    case K.int: {
      if (s.startsWith('flower-')) {
        const r = m(/要用 (\d+\/\d+) 张纸。做 (\d+) 朵纸花要用多少张纸/, t, id)
        return val(r[1]!) * Number(r[2])
      }
      if (s.startsWith('pic-')) {
        const pic = part(q, 'frac-shape')!.items
        const a = pic[0]!.shaded.length
        expect(pic.every((p) => p.shaded.length === a && p.parts === pic[0]!.parts), id).toBe(true)
        expect(t, id).toContain(`${pic.length} 朵纸花`)
        return s.startsWith('pic-units') ? a * pic.length : (a / pic[0]!.parts) * pic.length
      }
      if (s.startsWith('bread-')) {
        const r = m(/质量是 (\S+) 千克，(\d+) 袋面包一共是多少千克/, t, id)
        return val(r[1]!) * Number(r[2])
      }
      if (s.startsWith('breadform-')) {
        const r = m(/质量是 (\S+) 千克，求 (\d+) 袋/, t, id)
        return `${r[1]} × ${r[2]}`
      }
      if (s.startsWith('kids-')) {
        const r = m(/要用 (\S+) 张纸。小宇剪了 (\d+) 朵，小婷剪了 (\d+) 朵/, t, id)
        return val(r[1]!) * (Number(r[2]) + Number(r[3]))
      }
      if (s.startsWith('kidsmore-')) {
        const r = m(/要用 (\S+) 张纸。小宇剪了 (\d+) 朵，小婷比小宇多剪了 (\d+) 朵/, t, id)
        return val(r[1]!) * (2 * Number(r[2]) + Number(r[3]))
      }
      if (s.startsWith('candy-')) {
        const r = m(/装了 (\d+) 箱，每箱 (\d+) 袋，每袋 (\S+) 千克/, t, id)
        return Number(r[1]) * Number(r[2]) * val(r[3]!)
      }
      if (s.startsWith('chain-')) {
        const terms = part(q, 'frac-chain')!.terms as ({ n: string; d: string } | { t: string })[]
        const a = Number((terms[0] as { n: string }).n)
        const n = Number((terms[2] as { t: string }).t)
        expect((terms[terms.length - 1] as { n: string }).n).toBe('?')
        return a * n
      }
      if (s.startsWith('addmul-')) {
        const sum = val(e[0]!)
        return q.choices!.map((c) => zh(c.label)).find((l) => near(val(l), sum))!
      }
      if (s.startsWith('means-')) {
        const [f, n] = e[0]!.split(' × ')
        return `${n} 个 ${f} 相加`
      }
      if (s.startsWith('first-')) {
        const r = m(/计算 (\d+)\/(\d+) × (\d+)，/, t, id)
        return `分母 ${r[2]} 和整数 ${r[3]}`
      }
      break
    }
    case K.num: {
      if (s.startsWith('seed-')) {
        const r = m(/面积是 (\d+) 公顷，其中 (\S+) 用来种植柳树苗。种植柳树苗/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s.startsWith('left-')) {
        const r = m(/面积是 (\d+) 公顷，其中 (\S+) 用来种植柳树苗，剩下的/, t, id)
        return Number(r[1]) * (1 - val(r[2]!))
      }
      if (s === 'whichop') return '乘法'
      if (s.startsWith('times-')) return `${m(/的 (\S+) 是多少，也就是/, t, id)[1]} 倍`
      if (s.startsWith('split-')) {
        const [a, b] = m(/的 (\d+)\/(\d+) 是多少，就是把/, t, id).slice(1).map(Number)
        return t.endsWith('要平均分成几份？') ? b! : a!
      }
      if (s.startsWith('each-')) {
        const r = m(/把 (\d+) 公顷平均分成 (\d+) 份/, t, id)
        return Number(r[1]) / Number(r[2])
      }
      if (s.startsWith('grid-')) {
        const pic = part(q, 'frac-shape')!.items[0]!
        const r = m(/是 (\d+) 公顷，每一横条是 1 公顷。涂色部分有几个 1\/(\d+) 公顷/, t, id)
        expect(pic.rows, id).toBe(Number(r[1]))
        expect(pic.parts / pic.rows!, id).toBe(Number(r[2]))
        return pic.shaded.length
      }
      if (s.startsWith('wall-')) {
        const r = m(/面积是 (\d+) 平方米，已经刷完了这面墙的 (\S+)。已经刷完的面积/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s.startsWith('wallform-')) {
        const r = m(/面积是 (\d+) 平方米，已经刷完了这面墙的 (\S+)。/, t, id)
        return `${r[1]} × ${r[2]}`
      }
      if (s === 'palace') {
        const r = m(/大约是 (\d+) 万平方米，其中建筑面积占总面积的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s === 'crane') {
        const r = m(/共有 (\d+) 种.*占全世界的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s === 'star') {
        const r = m(/大约是 (\d+) 千米\/秒，织女星平均运行速度是牛郎星的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s.startsWith('paper-')) {
        const r = m(/废纸质量的 (\S+)。.*整理出 (\d+) 千克废纸/, t, id)
        return val(r[1]!) * Number(r[2])
      }
      if (s === 'paperall') {
        const r = m(/大约是 (\d+) 万吨，其中大约 (\S+) 可以/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s === 'air') {
        const r = m(/全年 (\d+) 天的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s.startsWith('bagmax-')) {
        const r = m(/体重的 (\S+)。李明的体重是 (\d+) 千克，他的书包最多/, t, id)
        return val(r[1]!) * Number(r[2])
      }
      if (s.startsWith('bagover-')) {
        const r = m(/体重的 (\S+)。李明的体重是 (\d+) 千克，他的书包是 ([\d.]+) 千克/, t, id)
        return Number(r[3]) > val(r[1]!) * Number(r[2]) ? '超重了' : '没有超重'
      }
      if (s.startsWith('whichint-')) return q.choices!.map((c) => zh(c.label)).find((l) => Number.isInteger(Math.round(val(l) * 1e9) / 1e9))!
      if (s === 'judge-44-7') return near(val('4 × 4/7'), 1 / 7)
      if (s === 'fix-44-7') return val('4 × 4/7')
      break
    }
    case K.ff: {
      if (s.startsWith('ginkgo-')) {
        const r = m(/有 (\S+) 公顷，其中 (\S+) 种植银杏树苗/, t, id)
        const [fn, fd] = r[1]!.split('/').map(Number)
        const [gn, gd] = r[2]!.split('/').map(Number)
        const a = part(q, 'frac-area')!
        expect([a.rows, a.cols, a.first?.along, a.first?.n, a.second?.n, a.ghost], id).toEqual([fd, gd, 'row', fn, gn, fd! - fn!])
        return val(r[1]!) * val(r[2]!)
      }
      if (s.startsWith('pic-')) {
        const a = part(q, 'frac-area')!
        const byRow = a.first!.along === 'row'
        const f = a.first!.n / (byRow ? a.rows : a.cols)
        const g = a.second!.n / (byRow ? a.cols : a.rows)
        const eText = m(/看图计算 (.+)。/, t, id)[1]!
        const [x, y] = eText.split(' × ').map(val)
        expect(near(x!, f) && near(y!, g), `${id} 图和算式对不上`).toBe(true)
        return f * g
      }
      if (s.startsWith('paint-')) {
        const r = m(/先画出 (\S+) 公顷，再画出 \S+ 公顷的 (\S+)，/, t, id)
        const a = part(q, 'frac-area')!
        expect(a.first!.along, id).toBe('col')
        expect(near(a.first!.n / a.cols, val(r[1]!)) && near(a.second!.n / a.rows, val(r[2]!)), id).toBe(true)
        return val(r[1]!) * val(r[2]!)
      }
      if (s.startsWith('chain-')) {
        const terms = part(q, 'frac-chain')!.terms as ({ n: string; d: string } | { t: string })[]
        const f = terms[0] as { n: string; d: string }
        const g = terms[2] as { n: string; d: string }
        const last = terms[terms.length - 1] as { n: string; d: string }
        return last.n === '?' ? Number(f.n) * Number(g.n) : Number(f.d) * Number(g.d)
      }
      if (s === 'int-as-frac') return 1
      if (s.startsWith('int-as-frac-')) return `${m(/把 (\d+) 看成/, t, id)[1]}/1`
      if (/^(ton|meter)-/.test(s)) {
        const r = m(/^(\S+) [吨米]的 (\S+) 是多少/, t, id)
        return val(r[1]!) * val(r[2]!)
      }
      if (s.startsWith('step-')) {
        const r = m(/(\d+) 和 (\d+) 约分，(\d+) 变成几/, t, id)
        const p = Number(r[1])
        const qn = Number(r[2])
        let g = p
        let h = qn
        while (h) [g, h] = [h, g % h]
        expect(r[3]).toBe(r[1])
        return p / g
      }
      if (s === 'rule-less') return '变小了'
      if (s === 'rule-more') return '变大了'
      if (s.startsWith('whichless-')) {
        const x = val(m(/积比 (\S+) 小/, t, id)[1]!)
        return q.choices!.map((c) => zh(c.label)).find((l) => val(l) < x - 1e-12)!
      }
      if (s.startsWith('rect-')) {
        const r = m(/长度是 (\S+) 米，宽度是 (\S+) 米/, t, id)
        return val(r[1]!) * val(r[2]!)
      }
      if (s === 'mixed-eq') {
        return q.choices!.map((c) => zh(c.label)).find((l) => {
          const [left, right] = l.split('=')
          return near(val(left!), val(right!))
        })!
      }
      if (s.startsWith('judge-numnum-')) return judge()
      break
    }
    case K.dec: {
      if (s.startsWith('squirrel-')) return val(m(/身体长度是 ([\d.]+) 分米/, t, id)[1]!) * val(m(/身体长度的 (\S+)。/, t, id)[1]!)
      if (s.startsWith('squirrelsum-')) {
        const r = m(/欢欢的身体长度是 ([\d.]+) 分米，贝贝的身体长度是 ([\d.]+) 分米/, t, id)
        return (Number(r[1]) + Number(r[2])) * 0.75
      }
      if (s.startsWith('todec-')) return val(m(/可以把 (\S+) 化成哪个小数/, t, id)[1]!)
      if (s.startsWith('tofrac-')) return val(m(/可以把 (\S+) 化成哪个分数/, t, id)[1]!)
      if (s.startsWith('reducedec-')) {
        const r = m(/把 ([\d.]+) 和 (\d+) 约分/, t, id)
        return Number(r[1]) / Number(r[2])
      }
      if (s.startsWith('bird-')) return 0.8 * val(m(/它 (\S+) 分钟飞行/, t, id)[1]!)
      if (s === 'gdp') {
        const r = m(/大约是 ([\d.]+) 万元。2020 年.*2021 年的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (/^honey2?-/.test(s)) {
        const r = m(/(\d+\/\d+)[。，]([\d.]+) 千克这种蜂蜜里/, t, id)
        return val(r[1]!) * Number(r[2])
      }
      if (s === 'ostrich') {
        const r = m(/身高是 ([\d.]+) 米，一只成年帝企鹅的身高是这只鸵鸟的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      break
    }
    case K.law: {
      if (s.startsWith('first-')) {
        const ex = e[0]!
        const inner = /\(([^()]+)\)/.exec(ex)
        return inner ? inner[1]! : q.choices!.map((c) => zh(c.label)).find((l) => l.includes('×'))!
      }
      if (s === 'order-rule') return '整数混合运算的运算顺序'
      if (s.startsWith('which-')) {
        const ex = e[0]!
        return ex.includes('+') ? '乘法分配律' : ex.includes('(') ? '乘法结合律' : '乘法交换律'
      }
      if (s.startsWith('lawused-')) return '乘法交换律和乘法结合律'
      if (s.startsWith('diststep-')) return val(m(/，(.+) 是多少？$/, t, id)[1]!)
      if (s.startsWith('distform-')) {
        const v = val(m(/律，(.+) 可以写成/, t, id)[1]!)
        const right = q.choices!.map((c) => zh(c.label)).filter((l) => near(val(l), v))
        expect(right, `${id} 只能有一个算式和原式相等`).toHaveLength(1)
        return right[0]!
      }
      if (s.startsWith('cow-')) {
        const r = m(/每天产奶 (\S+) 吨，(\d+) 头奶牛 (\d+) 天/, t, id)
        return val(r[1]!) * Number(r[2]) * Number(r[3])
      }
      if (s === 'tri') {
        const r = m(/分别是 (\S+) 分米和 (\S+) 分米/, t, id)
        return (val(r[1]!) * val(r[2]!)) / 2
      }
      if (s === 'trap') {
        const r = m(/上底是 (\S+) 分米，下底是 (\S+) 分米，高是 (\S+) 分米/, t, id)
        return ((val(r[1]!) + val(r[2]!)) * val(r[3]!)) / 2
      }
      if (s === 'desk') {
        const r = m(/长度是 (\S+) 米，宽度是 (\S+) 米；一个正方形桌面的面积是 (\S+) 平方米/, t, id)
        return val(r[3]!) - val(r[1]!) * val(r[2]!)
      }
      if (s === 'power') {
        const r = m(/每年发电 (\d+) 万千瓦时，其中居民用 (\S+)，工业用 (\S+)，农业用 (\S+)。/, t, id)
        return Number(r[1]) * (val(r[2]!) + val(r[3]!) + val(r[4]!))
      }
      if (s === 'garbage') {
        const r = m(/收到 (\d+) 吨生活垃圾，其中可以回收利用的垃圾占 (\S+)。这个垃圾处理场 (\d+) 天/, t, id)
        return Number(r[1]) * val(r[2]!) * Number(r[3])
      }
      if (s.startsWith('pattern12-')) {
        const [left, right] = e[0]!.split('=')
        return q.choices!.map((c) => zh(c.label)).find((x) => near(val(left!.replace('?', x)), val(right!.replace('?', x))))!
      }
      if (s === 'table') {
        const rows = part(q, 'stat-table')!.rows as string[][]
        for (let r = 1; r < 4; r++) for (let c = 1; c < 4; c++) expect(near(val(rows[r]![c]!), val(rows[r]![0]!) * val(rows[0]![c]!)), `${id} 表里第 ${r} 行第 ${c} 列`).toBe(true)
        return [1, 2, 3].reduce((p, i) => p * val(rows[i]![0]!) * val(rows[0]![i]!), 1)
      }
      break
    }
    case K.chain: {
      if (/^(park|park1|parkf|who1|who2|form|reflect)-/.test(s)) {
        const r = m(/休闲场所有 (\d+) 平方米，其中 (\S+) 是运动区，器械区占运动区的 (\S+)。/, t, id)
        const [n, f, g] = [Number(r[1]), val(r[2]!), val(r[3]!)]
        if (s.startsWith('park-')) {
          const a = part(q, 'frac-area')!
          expect(a.first!.along, id).toBe('col')
          expect(near(a.first!.n / a.cols, f) && near(a.second!.n / a.rows, g), id).toBe(true)
          return n * f * g
        }
        if (s.startsWith('park1-')) return n * f
        if (s.startsWith('parkf-')) return f * g
        if (s.startsWith('who1-') || s.startsWith('reflect-')) return '整个休闲场所'
        if (s.startsWith('who2-')) return '运动区'
        const right = q.choices!.map((c) => zh(c.label)).filter((l) => near(val(l), n * f * g))
        expect(right, `${id} 综合算式只能有一个对`).toHaveLength(1)
        return right[0]!
      }
      if (/^class1?-/.test(s)) {
        const r = m(/有 (\d+) 人，想当教师的占全班的 (\S+)，想当科学家的人数是想当教师的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!) * (s.startsWith('class1-') ? 1 : val(r[3]!))
      }
      if (/^seal1?-/.test(s)) {
        const r = m(/大约是 (\d+) 年，海狮的寿命是海象的 (\S+)，海豹的寿命是海狮的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!) * (s.startsWith('seal1-') ? 1 : val(r[3]!))
      }
      if (s.startsWith('trees-')) {
        const r = m(/一共有 (\d+) 棵树，柳树和桃树一共占 (\S+)，桃树占柳树和桃树的 (\S+)。/, t, id)
        const a = part(q, 'frac-area')!
        expect([a.first!.along, a.second!.from], id).toEqual(['col', 'end'])
        expect(near(a.first!.n / a.cols, val(r[2]!)) && near(a.second!.n / a.rows, val(r[3]!)), id).toBe(true)
        return Number(r[1]) * val(r[2]!) * val(r[3]!)
      }
      if (s.startsWith('fruit-')) {
        const r = m(/苹果有 (\d+) 个，桃的个数是苹果的 (\S+)，橘子的个数是桃的 (\S+)。/, t, id)
        const bars = part(q, 'frac-bars')!
        const [apple, peach, orange] = bars.rows as [BarRow, BarRow, BarRow]
        expect(apple.len, id).toBe(bars.unit)
        expect(near(peach.len / apple.len, val(r[2]!)), id).toBe(true)
        expect(near(orange.len / peach.len, val(r[3]!)), id).toBe(true)
        expect(apple.braces![0]!.label, id).toBe(r[1])
        return Number(r[1]) * val(r[2]!) * val(r[3]!)
      }
      if (s.startsWith('peony-')) {
        const r = m(/花期是 (\d+) 天，玫瑰的花期是芍药的 (\S+)，水仙的花期是玫瑰的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!) * val(r[3]!)
      }
      if (s.startsWith('partof-')) {
        const r = m(/一个数的 (\S+) 的 (\S+)，是/, t, id)
        return val(r[1]!) * val(r[2]!)
      }
      if (/^(pure|chain3)-/.test(s)) {
        const r = m(/^(\d+) 的 (\S+) 的 (\S+)(?: 的 (\S+))? 是多少/, t, id)
        return Number(r[1]) * val(r[2]!) * val(r[3]!) * (r[4] ? val(r[4]) : 1)
      }
      if (s === 'blood') {
        const r = m(/大约是 (\d+) 厘米\/秒，.*主动脉中的 (\S+)，.*静脉中的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!) * val(r[3]!)
      }
      break
    }
    case K.ml: {
      if (/^(kitchen|kitchenbars|kitchen1|kitchenf|who|form)-/.test(s)) {
        const r = m(/大约有 (\d+) 千克厨余垃圾，.*减少了大约 (\S+)。/, t, id)
        const [n, f] = [Number(r[1]), val(r[2]!)]
        if (s.startsWith('kitchenbars-')) {
          const bars = part(q, 'frac-bars')!
          const [before, now] = bars.rows as [BarRow, BarRow]
          const [fn, fd] = r[2]!.split('/').map(Number)
          expect([before.len, now.len, now.dash], id).toEqual([fd, fd, [fd! - fn!, fd]])
          expect(before.braces![0]!.label, id).toBe(r[1])
          expect(now.braces!.find((b) => b.side === 'top')!.label, id).toBe(r[2])
        }
        if (s.startsWith('kitchen-') || s.startsWith('kitchenbars-')) return n * (1 - f)
        if (s.startsWith('kitchen1-')) return n * f
        if (s.startsWith('kitchenf-')) return 1 - f
        if (s.startsWith('who-')) return '原来的厨余垃圾'
        const right = q.choices!.map((c) => zh(c.label)).filter((l) => near(val(l), n * (1 - f)))
        expect(right, `${id} 列式只能有一个对`).toHaveLength(1)
        return right[0]!
      }
      if (/^heart/.test(s)) {
        const r = m(/大约 (\d+) 次，婴儿每分钟心跳的次数比青少年多 (\S+)。/, t, id)
        const [n, f] = [Number(r[1]), val(r[2]!)]
        return s.startsWith('heart1-') ? n * f : s.startsWith('heartf-') ? 1 + f : n * (1 + f)
      }
      if (s.startsWith('plum-')) {
        const r = m(/兰花有 (\d+) 朵，梅花比兰花多 (\S+)。/, t, id)
        const [lan, mei] = part(q, 'frac-bars')!.rows as [BarRow, BarRow]
        expect(near((mei.len - lan.len) / lan.len, val(r[2]!)), id).toBe(true)
        return Number(r[1]) * (1 + val(r[2]!))
      }
      if (s.startsWith('girls-')) {
        const r = m(/男生有 (\d+) 人，女生比男生少 (\S+)。/, t, id)
        const [boys, girls] = part(q, 'frac-bars')!.rows as [BarRow, BarRow]
        expect(near((girls.dash![1] - girls.dash![0]) / boys.len, val(r[2]!)), id).toBe(true)
        return Number(r[1]) * (1 - val(r[2]!))
      }
      if (s === 'swordfish') {
        const r = m(/大约游 (\d+) 千米，剑鱼的游速比它快 (\S+)。/, t, id)
        return Number(r[1]) * (1 + val(r[2]!))
      }
      if (s === 'train') {
        const r = m(/要行驶 (\d+) 小时，普通列车用的时间比高铁多 (\S+)。/, t, id)
        return Number(r[1]) * (1 + val(r[2]!))
      }
      if (s === 'ele-small') {
        const r = m(/体重是 (\d+) 吨，一头小象的体重是这头大象的 (\S+)。/, t, id)
        return Number(r[1]) * val(r[2]!)
      }
      if (s === 'ele-big') {
        const r = m(/体重是 (\d+) 吨，一头非洲象的体重比这头亚洲象多 (\S+)。/, t, id)
        return Number(r[1]) * (1 + val(r[2]!))
      }
      if (s === 'sun') {
        const r = m(/大约是 (\d+) 小时，北京比深圳多 (\S+)。/, t, id)
        return Number(r[1]) * (1 + val(r[2]!))
      }
      if (s === 'puzzle') {
        const r = m(/要 (\d+) 分钟，小华拼完的时间比小丽的 (\S+) 多 (\d+) 秒/, t, id)
        return Number(r[1]) * 60 * val(r[2]!) + Number(r[3])
      }
      if (s === 'yangtze') {
        const r = m(/长度是 (\d+) 千米，长江的长度比尼罗河的 (\S+) 多 (\d+) 千米/, t, id)
        return Number(r[1]) * val(r[2]!) + Number(r[3])
      }
      if (s === 'ball') {
        const r = m(/从 (\d+) 米高的地方.*降低了 (\S+)。这个球第三次/, t, id)
        return Number(r[1]) * (1 - val(r[2]!)) ** 3
      }
      if (s.startsWith('judge-less-')) return false
      if (s.startsWith('judge-more-')) {
        const r = m(/比原来多 (\S+)，就是说现在是原来的 (\S+)，/, t, id)
        return near(val(r[2]!), 1 + val(r[1]!))
      }
      break
    }
  }
  throw new Error(`没有核对的题：${id}`)
}

describe('分数乘法：答案从题干另算一遍（150 种子 × 三档）', () => {
  for (const kp of ALL) {
    it(kp, () => {
      each(kp, (q) => {
        const exp = expected(q)
        if (typeof exp === 'number') {
          const got = answerVal(q)
          expect(got, `${q.id} 答案不是数`).not.toBeNull()
          expect(near(got!, exp), `${q.id} 答案 ${got}，应该是 ${exp}`).toBe(true)
          // 选项里只有一个对的（等值的另一种写法也不行）
          if (q.input === 'choice') {
            const right = q.choices!.map((c) => zh(c.label)).filter((l) => isNumLabel(l) && near(val(l), exp))
            expect(right, `${q.id} 有不止一个选项等于答案：${right.join('、')}`).toHaveLength(1)
          }
        } else if (typeof exp === 'boolean') {
          expect(correctLabel(q), q.id).toBe(exp ? '对' : '不对')
        } else {
          expect(correctLabel(q), q.id).toBe(exp)
        }
      })
    })
  }
})

describe('分数乘法：作答方式', () => {
  it('整数答案用数字键盘（带大图的做成选项卡）；分数、小数、带分数做成选项；小数和分数相乘的结果不出等值的两种写法', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        if (q.input === 'choice') {
          const labels = q.choices!.map((c) => zh(c.label))
          // 选项不是单独一个小写字母
          for (const l of labels) expect(l, q.id).not.toMatch(/^[a-z]$/)
          // 数的选项值互不相同
          const nums = labels.filter(isNumLabel).map(val)
          for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) expect(near(nums[i]!, nums[j]!), `${q.id} 选项有等值的：${labels.join(' | ')}`).toBe(false)
          // 正确答案是数时不是整数（整数用数字键盘）——「6/1」这种考写法的、带大图的（图 + 键盘手机一屏放不下）除外
          const v = answerVal(q)
          const bigFig = q.stem.some((x) => x.kind === 'frac-area' || x.kind === 'frac-bars' || x.kind === 'frac-shape')
          if (v !== null && !/\/1$/.test(correctLabel(q)) && !bigFig) expect(Number.isInteger(Math.round(v * 1e9) / 1e9) && !correctLabel(q).includes('/') && !correctLabel(q).includes('.') && !correctLabel(q).includes(' '), `${q.id} 整数答案该用数字键盘：${correctLabel(q)}`).toBe(false)
        }
      })
    }
  })
  it('分数答案写最简；比 1 大的写假分数，只有拆数（87 × 3/86）和练习三 12 写带分数', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        if (q.input !== 'choice') return
        for (const l of q.choices!.map((c) => zh(c.label))) {
          const f = /^(\d+)\/(\d+)$/.exec(l)
          if (f && !/^int-as-frac-/.test(sig(q))) {
            let [a, b] = [Number(f[1]), Number(f[2])]
            while (b) [a, b] = [b, a % b]
            expect(a, `${q.id} 选项 ${l} 没约成最简`).toBe(1)
          }
          if (l.includes(' ')) expect(sig(q), q.id).toMatch(/^(split-|mixed-eq)/)
        }
      })
    }
  })
})

describe('分数乘法：第 1 档出得到课本的每个例题和做一做', () => {
  const firstTier = (kp: string): Set<string> => {
    const out = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 600; seed++) out.add(sig(gen(1, createRng(seed))))
    return out
  }
  const REQUIRED: Record<string, string[]> = {
    [K.int]: ['flower-3/8x2', 'flower-3/8x8', 'bread-3/10x3', 'breadform-3/10x3', 'pic-sum-3/8x2', 'pic-units-3/8x2', 'first-3/8x8', 'rule-num', 'rule-den', 'reduce-3/8x2', 'int-3/8x8'],
    [K.num]: ['seed-2x5/8', 'times-2x5/8', 'whichop', 'split-parts-2x5/8', 'split-take-2x5/8', 'each-2-8', 'grid-2x5/8', 'rule-num', 'rule-den', 'frac-2x5/8', 'wall-20x1/4', 'palace', 'crane', 'star', 'paper-80', 'paperall', 'bagmax-40', 'bagover-40-3.6'],
    [K.ff]: ['ginkgo-4/5x2/3', 'pic-1/2x1/2-row', 'pic-2/3x4/5-row', 'pic-3/4x3/4-col', 'chain-n-4/5x2/3', 'rule-num', 'rule-den', 'int-as-frac', 'mix-5/4x10', 'mix-6x11/12', 'reduce-4/7x1/4', 'reduce-20/9x3/10', 'paint-1/5x3/4', 'ton-1/4x3/5', 'meter-3/8x3/4'],
    [K.dec]: ['squirrel-2.1', 'squirrel-2.4', 'todec-2.1x3/4', 'tofrac-2.1x3/4', 'reducedec-2.4x3/4', 'do-1.2x3/5', 'do-2.5x3/5', 'do-1.4x5/6', 'do-2.4x5/6', 'bird-3/4', 'bird-5', 'gdp', 'honey-2.5', 'ostrich'],
    [K.law]: [
      'order-p-4/5-1/2-2',
      'order-s-4/5-1/2-2',
      'cmp-1/2 × 1/3|1/3 × 1/2',
      'cmp-(1/4 × 2/3) × 3/5|1/4 × (2/3 × 3/5)',
      'cmp-(1/2 + 1/3) × 1/5|1/2 × 1/5 + 1/3 × 1/5',
      'ex4a-3/5 × 1/6 × 5',
      'ex4b-(5/6 + 1/4) × 12',
      'ex4c-2/3 × 8/7 × 14 × 9/4',
      'ex4a-2/3 × 1/7 × 3',
      'ex4b-(8/9 + 4/27) × 27',
      'split-87x3/86',
      'cow-1/50-42-100',
    ],
    [K.chain]: ['park-4800-3/5-1/4', 'park1-4800-3/5-1/4', 'parkf-4800-3/5-1/4', 'who1-4800-3/5-1/4', 'who2-4800-3/5-1/4', 'form-4800-3/5-1/4', 'reflect-4800-3/5-1/4', 'class-36-1/3-3/4', 'seal-40-3/4-2/3', 'trees-120-5/6-1/4', 'fruit-160-3/4-5/6', 'peony-32-5/8-3/4'],
    [K.ml]: ['kitchen-100-1/4', 'kitchenbars-100-1/4', 'kitchen1-100-1/4', 'kitchenf-100-1/4', 'who-100-1/4', 'form-100-1/4', 'heart-75-4/5', 'plum-60-1/3', 'girls-180-1/6', 'swordfish', 'train', 'ele-small', 'ele-big', 'sun'],
  }
  for (const kp of ALL) {
    it(kp, () => {
      const got = firstTier(kp)
      // 比一比的三组（交换律、结合律、分配律）两边可能对调
      const has = (s: string): boolean => got.has(s) || (s.startsWith('cmp-') && got.has(`cmp-${s.slice(4).split('|').reverse().join('|')}`))
      expect(REQUIRED[kp]!.filter((s) => !has(s))).toEqual([])
    })
  }
})

describe('分数乘法：朗读避坑', () => {
  /** 题干文字与选项里不该出现的写法（多音字单独出现、括号、引号、阿拉伯数字的序数、方程） */
  const BAD: [RegExp, string][] = [
    [/长(?!度|方形|江)/, '「长」只在长度、长方形、长江里'],
    [/(?<!体|超)重/, '「重」只在体重、超重里'],
    [/种(?!植)(?<![\d] 种|多少种|一种|这种)/, '「种」写种植，量词只在「15 种」「一种」「这种」「多少种」里'],
    [/[为还得着乐应倒转调]/, '为 / 还 / 得 / 着 / 乐 / 应 / 倒 / 转 / 调'],
    [/只有|相当于/, '只有 / 相当于'],
    [/处(?!理)/, '「处」只在处理里'],
    [/(?<!运|飞)行(?!驶|动)/, '「行」只在运行、飞行、行驶、行动里'],
    [/[（）“”‘’「」]/, '中文括号、引号'],
    [/第\s*\d/, '阿拉伯数字的序数'],
    [/方程/, '方程'],
  ]
  it('题干文字和选项', () => {
    for (const kp of ALL) {
      each(kp, (q) => {
        const all = [texts(q), ...(q.choices ?? []).map((c) => zh(c.label))]
        for (const s of all) for (const [re, why] of BAD) expect(re.test(s), `${q.id}：${why}——${s}`).toBe(false)
      }, 60)
    }
  })
})
