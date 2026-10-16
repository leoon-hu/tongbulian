import { describe, expect, it } from 'vitest'
import type { Bearing, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { TOWN } from '../position'

// 六上「一 确定位置」三个知识点的专项检查（六年级数学 A）：150 种子 × 三档，从图（PairGrid / BearingMap / RouteMap）和题目里的数
// 另算一遍答案（不用生成器里的公式）；方向的选项里没有和答案同一个方向的另一种说法；第 1 档出得到课本的例题和做一做；朗读避坑。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const K1 = 'm6s1-01-pairs'
const K2 = 'm6s1-01-bearing'
const K3 = 'm6s1-01-route'

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
const text = (q: Question): string => q.stem.map((p) => (p.kind === 'text' ? zh(p.text) : '')).join('')
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label))
const options = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const pairsIn = (s: string): [number, number][] => [...s.matchAll(/（(\d+)，(\d+)）/g)].map((m) => [Number(m[1]), Number(m[2])])
const pairText = ([x, y]: [number, number]): string => `（${x}，${y}）`
const CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']
const cn = (s: string): number => CN.indexOf(s) + 1

// ── 方向：另写一份换算（从北顺时针的度数）──
const AX: Record<string, number> = { 北: 0, 东: 90, 南: 180, 西: 270 }
const LETTER: Record<string, string> = { n: '北', e: '东', s: '南', w: '西' }
function azOf(label: string): number {
  const due = /^正(北|南|东|西)$/.exec(label)
  if (due) return AX[due[1]!]!
  const m = /^(北|南|东|西)偏(北|南|东|西)(\d+)°$/.exec(label)
  expect(m, `不是方向：${label}`).not.toBeNull()
  const b = AX[m![1]!]!
  const s = AX[m![2]!]!
  const d = Number(m![3])
  expect(Math.abs(b - s) % 180, label).toBe(90)
  return (b + ((s - b + 360) % 360 === 90 ? d : -d) + 360) % 360
}
const bearingLabel = (b: Bearing): string => (b.side ? `${LETTER[b.base]}偏${LETTER[b.side]}${b.deg}°` : `正${LETTER[b.base]}`)
const azB = (b: Bearing): number => azOf(bearingLabel(b))
const DIR_RE = /[北南东西]偏[北南东西]\d+°|正[北南东西]/g
/** 方向的选项：答案对，别的选项都不和答案同一个方向 */
function checkDirOptions(q: Question, az: number): void {
  expect(azOf(answer(q)), q.id).toBe(az)
  for (const o of options(q)) if (o !== answer(q)) expect(azOf(o), `${q.id} 选项「${o}」和答案同一个方向`).not.toBe(az)
}

describe('用有序数对确定位置：答案和图、和题目里的数对得上', () => {
  it('座位表、格子：涂色的格子 / 写着字母的座位 / 水果的位置', () => {
    let n = 0
    each(K1, (q) => {
      const g = part(q, 'pair-grid')
      const k = kind(q)
      if (k === 'seat' || k === 'paint') {
        const red = g!.items!.find((it) => it.fill === 'red')!
        expect(answer(q), q.id).toBe(pairText([red.x, red.y]))
        n++
      }
      if (k === 'find') {
        const [x, y] = pairsIn(text(q))[0]!
        expect(answer(q), q.id).toBe(g!.items!.find((it) => it.x === x && it.y === y)!.tag)
        expect(options(q).length).toBe(g!.items!.length)
      }
      if (k === 'cab') {
        const t = text(q)
        if (sig(q).endsWith('-where')) {
          const icon = g!.items!.find((it) => it.icon && t.includes(it.icon))!
          expect(answer(q), q.id).toBe(pairText([icon.x, icon.y]))
        } else {
          const [x, y] = pairsIn(t)[0]!
          expect(answer(q), q.id).toBe(g!.items!.find((it) => it.x === x && it.y === y)!.icon)
        }
      }
      if (g && g.mode === 'cells' && g.items) for (const it of g.items) expect(it.x >= 1 && it.y >= 1 && it.x <= g.cols && it.y <= g.rows, q.id).toBe(true)
    })
    expect(n).toBeGreaterThan(12)
  })

  it('文字题、有序、同一列 / 同一行：第一个数是列、第二个数是行', () => {
    each(K1, (q) => {
      const t = text(q)
      const k = kind(q)
      if (k === 'text') {
        const m = /第(.+?)列、第(.+?)行/.exec(t)!
        expect(answer(q), q.id).toBe(pairText([cn(m[1]!), cn(m[2]!)]))
      }
      if (sig(q).startsWith('ord-tf')) {
        const [a, b] = pairsIn(t)
        expect(a![0] === b![0] && a![1] === b![1] ? '对' : '不对', q.id).toBe(answer(q))
      }
      if (sig(q).startsWith('ord-first') || sig(q).startsWith('ord-second')) {
        const [x, y] = pairsIn(t)[0]!
        const m = /第(一|二)个数表示第(.+?)(列|行)/.exec(t)!
        const truth = m[1] === '一' ? m[3] === '列' && cn(m[2]!) === x : m[3] === '行' && cn(m[2]!) === y
        expect(answer(q), q.id).toBe(truth ? '对' : '不对')
      }
      if (sig(q).startsWith('ord-what')) expect(answer(q), q.id).toBe(`第${CN[pairsIn(t)[0]![0] - 1]}列`)
      if (sig(q).startsWith('line-col') || sig(q).startsWith('line-row')) {
        const [base] = pairsIn(t)
        const col = sig(q).startsWith('line-col')
        const same = (o: string): boolean => {
          const [p] = pairsIn(o)
          return col ? p![0] === base![0] : p![1] === base![1]
        }
        expect(same(answer(q)), q.id).toBe(true)
        for (const o of options(q)) if (o !== answer(q)) expect(same(o), `${q.id} 选项 ${o}`).toBe(false)
      }
      if (sig(q).startsWith('line-allCol')) expect(answer(q), q.id).toBe(`第${CN[pairsIn(t)[0]![0] - 1]}列`)
      if (sig(q).startsWith('line-allRow')) expect(answer(q), q.id).toBe(`第${CN[pairsIn(t)[0]![1] - 1]}行`)
      if (sig(q).startsWith('line-num')) expect(answer(q), q.id).toBe(/都是 (\d+)/.exec(t)![1])
    })
  })

  it('方格图上的点：问的点的有序数对、哪个点在（x，y）', () => {
    each(K1, (q) => {
      const g = part(q, 'pair-grid')
      const t = text(q)
      const k = kind(q)
      if (k === 'pt' || k === 'star') {
        const tag = /点 ([A-D]) 的位置(?:用|是？)/.exec(t.replace(/点 A 的位置是（5，9）。/, ''))?.[1] ?? /点 ([A-D]) 的位置是？/.exec(t)![1]
        const it = g!.items!.find((x) => x.tag === tag)!
        expect(answer(q), q.id).toBe(pairText([it.x, it.y]))
      }
      if (k === 'class') {
        const who = /。(.+?)的位置用有序数对/.exec(t)![1]!
        const it = g!.items!.find((x) => x.name && zh(x.name) === who)!
        expect(answer(q), q.id).toBe(pairText([it.x, it.y]))
      }
      if (k === 'ptfind') {
        const [x, y] = pairsIn(t)[0]!
        expect(answer(q), q.id).toBe(g!.items!.find((it) => it.x === x && it.y === y)!.tag)
      }
      if (k === 'campus') {
        if (sig(q).startsWith('campus-what')) {
          const [x, y] = pairsIn(t)[0]!
          expect(answer(q), q.id).toBe(zh(g!.items!.find((it) => it.x === x && it.y === y)!.name!))
        } else {
          const who = /。(.+?)的位置用有序数对/.exec(t)![1]!
          const it = g!.items!.find((x) => x.name && zh(x.name) === who)!
          expect(answer(q), q.id).toBe(pairText([it.x, it.y]))
        }
      }
      if (g?.mode === 'points') for (const it of g.items ?? []) expect(it.x >= 0 && it.y >= 0 && it.x <= g.cols && it.y <= g.rows, q.id).toBe(true)
    })
  })

  it('描点连成图形（做一做 2）：照题目里的点另判图形', () => {
    const NAME: Record<string, string> = { 3: '三角形', 5: '五边形', 6: '六边形' }
    let n = 0
    each(K1, (q) => {
      if (kind(q) !== 'shape') return
      const pts = pairsIn(text(q))
      let name = NAME[pts.length]
      if (pts.length === 4) {
        const v = pts.map((p, i) => [pts[(i + 1) % 4]![0] - p[0], pts[(i + 1) % 4]![1] - p[1]] as [number, number])
        const par = (a: [number, number], b: [number, number]): boolean => a[0] * b[1] - a[1] * b[0] === 0
        const p1 = par(v[0]!, v[2]!)
        const p2 = par(v[1]!, v[3]!)
        const right = v[0]![0] * v[1]![0] + v[0]![1] * v[1]![1] === 0
        const len = v.map(([a, b]) => a * a + b * b)
        name = p1 && p2 ? (right ? (len.every((l) => l === len[0]) ? '正方形' : '长方形') : '平行四边形') : p1 || p2 ? '梯形' : '四边形'
      }
      expect(answer(q), q.id).toBe(name)
      // 特殊与一般：正方形的题不出长方形、平行四边形，长方形的题不出平行四边形
      if (name === '正方形') expect(options(q).some((o) => o === '长方形' || o === '平行四边形'), q.id).toBe(false)
      if (name === '长方形') expect(options(q)).not.toContain('平行四边形')
      n++
    })
    expect(n).toBeGreaterThan(20)
  })

  it('第 2、3 档：平移、机器人、王玲的路线、以东往北、电影院、两次平移、隔几格', () => {
    each(K1, (q) => {
      const t = text(q)
      const k = kind(q)
      const g = part(q, 'pair-grid')
      if (k === 'move') {
        const n = Number(/平移 (\d+) 个单位/.exec(t)![1])
        const tag = /顶点 ([A-D])/.exec(t)![1]
        const v = g!.items!.find((it) => it.tag === tag)!
        expect(answer(q), q.id).toBe(pairText(t.includes('向右') ? [v.x + n, v.y] : [v.x, v.y + n]))
      }
      if (k === 'movewhich') expect(answer(q), q.id).toBe(t.includes('向右') ? '第一个数' : '第二个数')
      if (k === 'robot' && !sig(q).startsWith('robot-same')) {
        // 按图上的虚线路线一段一段数格子；题目里说的起点、终点就是路线的两头
        const ps = g!.route!
        const steps = ps.slice(1).reduce((s, p, i) => s + Math.abs(p[0] - ps[i]![0]) + Math.abs(p[1] - ps[i]![1]), 0)
        expect(answer(q), q.id).toBe(String(steps))
        expect(pairsIn(t), q.id).toEqual([ps[0], ps[ps.length - 1]])
        // 竖着走的那一列不碰投递口（投递口在两个数都是双数的格点上）；终点那一行画在图里
        expect(ps[2]![0] % 2, q.id).toBe(1)
        expect(g!.rows, q.id).toBeGreaterThanOrEqual(ps[ps.length - 1]![1])
        expect(g!.marks!.every((m) => m.y <= g!.rows), q.id).toBe(true)
      }
      if (sig(q).startsWith('robot-same')) expect(answer(q), q.id).toBe(t.includes('横着走的时候') ? '第二个数' : '第一个数')
      if (k === 'town') {
        const ps = pairsIn(t)
        const kth = cn(/她第(.)个到的地方/.exec(t)![1]!)
        const [x, y] = ps[kth - 1]!
        const id = TOWN.find((p) => p[1] === x && p[2] === y)![0]
        expect(answer(q), q.id).toBe(zh({ k: `m6.pos.pl.${id}` }))
      }
      if (k === 'en') {
        if (sig(q).startsWith('en-pair')) {
          const m = /以东 (\d+) 米、再往北 (\d+) 米/.exec(t)!
          expect(answer(q), q.id).toBe(pairText([Number(m[1]) / 100, Number(m[2]) / 100]))
        } else {
          const [, p] = pairsIn(t)
          expect(answer(q), q.id).toBe(String((t.includes('以东多少米') ? p![0] : p![1]) * 100))
        }
      }
      if (k === 'cinema') {
        const m = /小刚坐在(.+?)排(.+?)号/.exec(t)!
        const r = cn(m[1]!)
        const s = cn(m[2]!)
        expect(answer(q), q.id).toBe(t.includes('前一排') ? `${CN[r - 2]}排${CN[s - 1]}号` : `${CN[r - 1]}排一号`)
      }
      if (k === 'two') {
        const [[x, y]] = pairsIn(t) as [[number, number]]
        const m = /向(左|右)平移 (\d+) 个单位，再向(上|下)平移 (\d+) 个单位/.exec(t)!
        const nx = x + (m[1] === '右' ? 1 : -1) * Number(m[2])
        const ny = y + (m[3] === '上' ? 1 : -1) * Number(m[4])
        expect(answer(q), q.id).toBe(pairText([nx, ny]))
      }
      if (k === 'gap') {
        const [a, b] = pairsIn(t)
        expect(answer(q), q.id).toBe(String(b![0] - a![0] - 1))
      }
      if (k === 'dims') expect(answer(q), q.id).toBe(t.includes('直线') ? '1' : '2')
      if (k === 'life') expect(answer(q)).toBe('电影票上的八排十号')
    })
  })
})

describe('用方向和距离确定位置：方向、距离和图对得上', () => {
  it('看图说方向 / 填度数 / 数小段：问的地方在图上的方向和距离', () => {
    let n = 0
    each(K2, (q) => {
      const map = part(q, 'bearing-map')
      if (!map) return
      const t = text(q)
      const k = kind(q)
      const per = map.per ? Number(/^(\d+) m$/.exec(map.per)![1]) : 0
      const find = (name: string) => map.places.find((p) => p.name && zh(p.name) === name)!
      if (k === 'dir' || k === 'sym') {
        const [, a, b] = /^(.+?)在(.+?)的什么方向上/.exec(t)!
        if (b === zh(map.center)) checkDirOptions(q, azB(find(a!).dir))
        else {
          // 练习二 3 (4)：两个地方之间——按图上的位置算
          const pos = (name: string): [number, number] => {
            const p = find(name)
            const r = (azB(p.dir) * Math.PI) / 180
            return [Math.sin(r) * p.segs, Math.cos(r) * p.segs]
          }
          const [ax, ay] = pos(a!)
          const [bx, by] = pos(b!)
          const az = (Math.round((Math.atan2(ax - bx, ay - by) * 180) / Math.PI) + 360) % 360
          checkDirOptions(q, az)
        }
        n++
      }
      if (k === 'deg') {
        const [, a, dn] = /^(.+?)在.+?的(.偏.)多少度方向上/.exec(t)!
        const p = find(a!)
        const deg = dn![0] === LETTER[p.dir.base] ? p.dir.deg! : 90 - p.dir.deg!
        expect(answer(q), q.id).toBe(String(deg))
        // 弧量在另一条线上（第 2 档）：图上写的是 90 − 度数
        if (sig(q).endsWith('-other')) expect(p.arc).toBe('other')
      }
      if (k === 'dist') {
        const [, a] = /。(.+?)离(.+?)多少米/.exec(t)!
        expect(answer(q), q.id).toBe(String(find(a!).segs * per))
        expect(per).toBe(Number(/表示 (\d+) 米/.exec(t)![1]))
      }
    })
    expect(n).toBeGreaterThan(30)
  })

  it('例 4 选点、做一做选射线：对的那个点 / 射线的方向和距离都对，别的都不对', () => {
    each(K2, (q) => {
      const map = part(q, 'bearing-map')
      const t = text(q)
      if (kind(q) === 'locate') {
        const dir = azOf(t.match(DIR_RE)![0]!)
        const d = Number(/距离.+? (\d+) 米/.exec(t)![1])
        const per = Number(/表示 (\d+) 米/.exec(t)![1])
        const ok = map!.places.filter((p) => azB(p.dir) === dir && p.segs * per === d)
        expect(ok.length, q.id).toBe(1)
        expect(answer(q), q.id).toBe(ok[0]!.tag)
      }
      if (kind(q) === 'ray') {
        const dir = azOf(t.match(DIR_RE)![0]!)
        const ok = map!.places.filter((p) => azB(p.dir) === dir)
        expect(ok.length, q.id).toBe(1)
        expect(answer(q), q.id).toBe(`${ok[0]!.tag} 号`)
        // 射线之间分得开
        const azs = map!.places.map((p) => azB(p.dir))
        for (let i = 0; i < azs.length; i++) for (let j = i + 1; j < azs.length; j++) expect(Math.abs(((azs[i]! - azs[j]! + 540) % 360) - 180), q.id).toBeGreaterThanOrEqual(25)
      }
    })
  })

  it('换说法、同一方向、习惯说法、反过来说：按度数另算', () => {
    each(K2, (q) => {
      const t = text(q)
      const k = kind(q)
      const dirs = t.match(DIR_RE) ?? []
      if (k === 'comp') {
        const dn = /的?(.偏.)多少度/.exec(t)![1]!
        const az = azOf(dirs[0]!)
        // 答案代进去是同一个方向
        expect(azOf(`${dn}${answer(q)}°`), q.id).toBe(az)
      }
      if (k === 'same') expect(answer(q), q.id).toBe(azOf(dirs[0]!) === azOf(dirs[1]!) ? '对' : '不对')
      if (k === 'habit') {
        checkDirOptions(q, azOf(dirs[0]!))
        expect(Number(/(\d+)°/.exec(answer(q))![1]), q.id).toBeLessThanOrEqual(45)
      }
      if (k === 'rev' || k === 'rev2') checkDirOptions(q, (azOf(dirs[0]!) + 180) % 360)
      if (k === 'revtf') expect(answer(q), q.id).toBe(azOf(dirs[1]!) === (azOf(dirs[0]!) + 180) % 360 ? '对' : '不对')
      if (k === 'd8') expect(answer(q), q.id).toBe({ 45: '东北', 135: '东南', 225: '西南', 315: '西北' }[azOf(dirs[0]!)])
    })
  })

  it('距离的换算：图上几厘米 / 几小段 ↔ 实际多少米', () => {
    each(K2, (q) => {
      const t = text(q)
      const k = kind(q)
      if (k === 'real') {
        const per = Number(/1 厘米表示实际 (\d+) 米/.exec(t)![1])
        const cm = Number(/ (\d+) 厘米，实际距离/.exec(t)![1])
        expect(answer(q), q.id).toBe(String(per * cm))
      }
      if (k === 'cm') {
        const d = Number(/ (\d+) 米。/.exec(t)![1])
        const per = Number(/表示实际 (\d+) 米/.exec(t)![1])
        expect(answer(q), q.id).toBe(String(d / per))
      }
      if (k === 'segs' || k === 'oil' || k === 'rev2km') {
        const m = /距离.+? ([\d.]+) (千米|米)。图上每一小段表示 ([\d.]+) (千米|米)/.exec(t)!
        expect(m[2]).toBe(m[4])
        expect(answer(q), q.id).toBe(String(Math.round((Number(m[1]) / Number(m[3])) * 1000) / 1000))
      }
      if (k === 'km') {
        const per = Number(/表示 (\d+) 米/.exec(t)![1])
        const km = Number(/([\d.]+) 千米/.exec(t)![1])
        expect(answer(q), q.id).toBe(String((km * 1000) / per))
      }
      if (k === 'opp') {
        const ms = [...t.matchAll(/距离O (\d+) 米/g)].map((m) => Number(m[1]))
        const ds = t.match(DIR_RE)!
        expect((azOf(ds[0]!) + 180) % 360, q.id).toBe(azOf(ds[1]!))
        expect(answer(q), q.id).toBe(String(ms[0]! + ms[1]!))
      }
      if (k === 'diag') {
        const [[x, y]] = pairsIn(t) as [[number, number]]
        const az = azOf(t.match(DIR_RE)![0]!)
        const steps = Number(/走 (\d+) 米/.exec(t)![1]) / 10
        const dx = az === 45 || az === 135 ? 1 : -1
        const dy = az === 45 || az === 315 ? 1 : -1
        expect(answer(q), q.id).toBe(pairText([x + dx * steps, y + dy * steps]))
      }
      if (k === 'only') expect(answer(q)).toBe('不能')
      if (k === 'many') expect(answer(q)).toBe('有很多个')
      if (k === 'need') expect(answer(q)).toBe('方向和距离')
      if (k === 'ref') expect(answer(q), q.id).toBe(/^说.+?在(.+?)的/.exec(t)![1])
    })
  })
})

describe('用方向和距离描述路线：路线图上的方向、距离、参照点', () => {
  /** 路线图上一段一段的地方名（出发的地方 + 每段到的地方） */
  const stops = (q: Question): string[] => {
    const f = part(q, 'route-map')!.figs[0]!
    return [zh(f.start), ...f.legs.map((l) => (l.to ? zh(l.to) : ''))]
  }
  const legMetres = (q: Question, i: number): number => {
    const f = part(q, 'route-map')!.figs[0]!
    const leg = f.legs[i]!
    if (leg.dist) return Number(/^(\d+) m$/.exec(leg.dist)![1])
    return Math.round(leg.segs * Number(/^(\d+) m$/.exec(f.per!)![1]))
  }

  it('某段的方向、距离、参照点、全程、回来的方向', () => {
    let n = 0
    each(K3, (q) => {
      const t = text(q)
      const k = kind(q)
      const map = part(q, 'route-map')
      if (!map || map.figs.length !== 1) return
      const legs = map.figs[0]!.legs
      const names = stops(q)
      const legOf = (a: string, b: string): number => names.findIndex((s, i) => s === a && names[i + 1] === b)
      if (k === 'legdir') {
        const [, a, b] = /^从(.+?)到(.+?)，向什么方向走/.exec(t)!
        checkDirOptions(q, azB(legs[legOf(a!, b!)]!.dir))
        n++
      }
      if (k === 'legdist') {
        const [, a, b] = /从(.+?)到(.+?)走了多少米/.exec(t)!
        expect(answer(q), q.id).toBe(String(legMetres(q, legOf(a!, b!))))
      }
      if (k === 'legref') expect(answer(q), q.id).toBe(/^说从(.+?)到/.exec(t)![1])
      if (k === 'total') expect(answer(q), q.id).toBe(String(legs.reduce((s, _, i) => s + legMetres(q, i), 0)))
      if (k === 'count') expect(answer(q), q.id).toBe(String(legs.length))
      if (k === 'back') {
        const [, b, a] = /。从(.+?)到(.+?)，向什么方向走/.exec(t)!
        // 回来时走的是去时从 a 到 b 的那一段，方向反过来
        checkDirOptions(q, (azB(legs[legOf(a!, b!)]!.dir) + 180) % 360)
      }
      if (k === 'full') {
        const back = legs.map((l, i) => ({ az: (azB(l.dir) + 180) % 360, m: legMetres(q, i) })).reverse()
        const parse = (o: string): { az: number; m: number }[] => [...o.matchAll(/向([北南东西]偏[北南东西]\d+°|正[北南东西])走 (\d+) 米/g)].map((m) => ({ az: azOf(m[1]!), m: Number(m[2]) }))
        const same = (o: string): boolean => {
          const xs = parse(o)
          return xs.length === back.length && xs.every((x, i) => x.az === back[i]!.az && x.m === back[i]!.m)
        }
        expect(same(answer(q)), q.id).toBe(true)
        for (const o of options(q)) if (o !== answer(q)) expect(same(o), `${q.id} 选项「${o}」也对`).toBe(false)
      }
    })
    expect(n).toBeGreaterThan(20)
  })

  it('选路线图（做一做）：只有一幅和描述一样', () => {
    let n = 0
    each(K3, (q) => {
      if (kind(q) !== 'which') return
      const t = text(q)
      const [d1, d2] = t.match(DIR_RE)!.map(azOf)
      const [m1, m2] = [...t.matchAll(/走 (\d+) 米/g)].map((m) => Number(m[1]))
      const figs = part(q, 'route-map')!.figs
      const ok = figs.map((f, i) => ({ i, f })).filter(({ f }) => azB(f.legs[0]!.dir) === d1 && azB(f.legs[1]!.dir) === d2 && f.legs[0]!.dist === `${m1} m` && f.legs[1]!.dist === `${m2} m`)
      expect(ok.length, q.id).toBe(1)
      expect(answer(q), q.id).toBe(`${ok[0]!.i + 1} 号`)
      n++
    })
    expect(n).toBeGreaterThan(10)
  })

  it('练习二 9、10：时间、平均速度除得尽；公共汽车回来时每段的方向', () => {
    each(K3, (q) => {
      const t = text(q)
      const k = kind(q)
      if (k === 'table') {
        const ts = /依次用了 ([\d、]+) 分钟/.exec(t)![1]!.split('、').map(Number)
        expect(ts.length).toBe(4)
        const time = ts.reduce((s, x) => s + x, 0)
        const all = 2 * (legMetres(q, 0) + legMetres(q, 1))
        expect(all).toBe(2800)
        if (t.includes('平均每分钟')) expect(answer(q), q.id).toBe(String(all / time))
        if (t.includes('一共用了')) expect(answer(q), q.id).toBe(String(time))
        if (t.includes('去和回一共走了')) expect(answer(q), q.id).toBe(String(all))
        if (t.endsWith('向什么方向走？')) checkDirOptions(q, (azB(part(q, 'route-map')!.figs[0]!.legs[1]!.dir) + 180) % 360)
      }
      if (k === 'bus') {
        const ds = t.match(DIR_RE)!.slice(0, 3).map(azOf)
        const km = [...t.matchAll(/行驶 (\d+) 千米/g)].map((m) => Number(m[1]))
        if (t.includes('全程')) expect(answer(q), q.id).toBe(String(km.reduce((s, x) => s + x, 0)))
        else {
          const kth = cn(/第(.)段向/.exec(t)![1]!)
          checkDirOptions(q, (ds[3 - kth]! + 180) % 360)
        }
      }
    })
  })
})

describe('课本的例题和做一做第 1 档都出得到', () => {
  const firstTier = (kpId: string): Set<string> => {
    const out = new Set<string>()
    const gen = getGenerator(kpId)!
    for (let seed = 1; seed <= 600; seed++) out.add(sig(gen(1, createRng(seed))))
    return out
  }
  it('用有序数对确定位置：例 1、例 2、做一做 1、2，练习一 3，练习二 1、2', () => {
    const s = [...firstTier(K1)]
    for (const want of ['seat-6x5-', 'find-6x5-6-3-', 'text-wangyan-3-4', 'text-zhaoxue-4-3', 'ord-tf-3-4', 'star-B', 'star-C', 'star-D', 'class-', 'pt-', 'ptfind-', 'line-col', 'line-row', 'shape-pentagon-0-0', 'paint-', 'cab-', 'campus-'])
      expect(s.some((x) => x.startsWith(want)), want).toBe(true)
  })
  it('用方向和距离确定位置：例 3、例 4 和 p6–8 的做一做', () => {
    const s = [...firstTier(K2)]
    for (const want of ['only-1500', 'many-', 'need', 'dir-ship-fishing', 'comp-ship', 'real-500-3-fishing', 'cm-500-2-cargo', 'locate-nw40-2-500-cargo', 'dir-plaza-', 'deg-plaza-park', 'dist-plaza-', 'ray-wn30', 'ray-ws40', 'ray-es20', 'segs-gate-teach', 'segs-gate-library', 'segs-gate-gym', 'rev-xgHome-school-ne45', 'dir-school-', 'same-', 'habit-se65'])
      expect(s.some((x) => x.startsWith(want)), want).toBe(true)
  })
  it('用方向和距离描述路线：例 5、做一做', () => {
    const s = [...firstTier(K3)]
    for (const want of ['legdir-ex5-0', 'legdir-ex5-1', 'legdir-ex5-2', 'legdist-ex5-', 'legref-ex5-1', 'rule', 'total-ex5', 'back-ex5-0', 'back-ex5-1', 'back-ex5-2', 'which-s-sw30-50-100', 'count-'])
      expect(s.some((x) => x.startsWith(want)), want).toBe(true)
  })
  it('例 5 的数照课本：200 + 600 + 540 = 1340 米', () => {
    const gen = getGenerator(K3)!
    for (let seed = 1; seed <= 600; seed++) {
      const q = gen(1, createRng(seed))
      if (sig(q) === 'total-ex5') {
        expect(answer(q)).toBe('1340')
        return
      }
    }
    throw new Error('没出到 total-ex5')
  })
})

describe('朗读与文字', () => {
  it('序数写汉字、不写「处」「长」「量一量」「王乐」「大厦」「属相」「为」「还」；不出单独的小写字母', () => {
    for (const kp of [K1, K2, K3])
      each(kp, (q) => {
        const t = text(q)
        expect(t, q.id).not.toMatch(/第\s*\d|\d\s*排\s*\d|处|量一量|王乐|大厦|为|还|得/)
        expect(t.replace(/长方形/g, ''), q.id).not.toMatch(/长/)
        for (const o of options(q)) {
          expect(o, q.id).not.toMatch(/^[a-z]$/)
          expect(o.replace(/长方形/g, ''), q.id).not.toMatch(/长|处/)
        }
      })
  })
})
