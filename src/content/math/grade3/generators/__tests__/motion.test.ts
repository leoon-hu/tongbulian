import { describe, expect, it } from 'vitest'
import type { LStr, MotionFig, MotionItem, Question, StemPart } from '@/types/models'
import '@/content/math/grade3' // 副作用：注册生成器与词条
import { buildSession, createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { FOLD_FIGS, SCENES, SYMMETRIC } from '../motion'

// 三下「生活中的运动现象」三个知识点的专项检查：从题目本身（图的朝向 / 翻转 / 虚线、钟面的时针、词条）反推答案；
// 课本只到认识为止（没有方格、格数、角度）；朗读时「转」「重」「称」都留在「旋转 / 转动」「重合」「对称」里。
const SEEDS = 150
const zh = (l: LStr): string => translate(l, 'zh')

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const keyOf = (q: Question): string => {
  const t = q.stem.find((p) => p.kind === 'text')
  return t && t.kind === 'text' && typeof t.text === 'object' ? t.text.k : ''
}
const rows = (q: Question): MotionItem[][] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'motion-figs' }> => p.kind === 'motion-figs').map((p) => p.items)
const answerKey = (q: Question): string => {
  const c = q.choices!.find((x) => x.id === (q.answer as { choiceId: string }).choiceId)!.label
  return typeof c === 'object' ? c.k : c
}
const answerNum = (q: Question): number =>
  q.answer.kind === 'number' ? q.answer.value : Number(q.choices!.find((x) => x.id === (q.answer as { choiceId: string }).choiceId)!.label)
const sig = (q: Question): string => q.id.split(':')[1]!

/** 独立的判断：这条虚线是不是这个图形的对称轴（按图形本身：长方形只有两条中线，正方形再加两条对角线，圆的每条直径都是） */
function axisOk(fig: MotionFig, axis: NonNullable<MotionItem['axis']>): boolean {
  if (axis === 'off') return false
  if (axis === 'v') return !!SYMMETRIC[fig]
  if (axis === 'h') return fig === 'rect' || fig === 'square' || fig === 'circle'
  return fig === 'square' || fig === 'circle'
}
/** 能不能通过平移和原来的重合：朝向完全一样（没转、没翻） */
const sameOrientation = (it: MotionItem): boolean => !it.turn && !it.flip

describe('轴对称图形（m3s2-01-symmetry）', () => {
  it('答案从图反推：是不是轴对称图形、对称轴几条、四个里挑一个、虚线是不是对称轴、对折剪纸', () => {
    each('m3s2-01-symmetry', (q, d) => {
      expect(q.type).toBe('symmetry')
      const s = sig(q)
      const [first, second] = rows(q)
      if (s.startsWith('is-')) {
        const fig = first![0]!.fig
        expect(SYMMETRIC[fig], `${q.id} 没登记对称与否`).toBeDefined()
        expect(answerKey(q), q.id).toBe(SYMMETRIC[fig] ? 'm3.opt.right' : 'm3.opt.wrong')
        // 第 1 档不对称的只用一眼看得出的（一般三角形、平行四边形、左转弯箭头、梳子）
        if (d === 1 && !SYMMETRIC[fig]) expect(['scalene', 'parallelogram', 'arrow', 'comb']).toContain(fig)
      } else if (s.startsWith('axes-')) {
        const fig = first![0]!.fig
        expect(answerNum(q), q.id).toBe(fig === 'square' ? 4 : 2)
      } else if (s.startsWith('pick-')) {
        const want = keyOf(q) === 'm3.mot.pickSym'
        const hits = first!.filter((it) => !!SYMMETRIC[it.fig] === want)
        expect(hits.length, `${q.id} 只能有一个符合`).toBe(1)
        expect(answerNum(q), q.id).toBe(hits[0]!.label)
        expect(first!.map((it) => it.label)).toEqual([1, 2, 3, 4])
      } else if (s.startsWith('axis-')) {
        const it = first![0]!
        expect(answerKey(q), q.id).toBe(axisOk(it.fig, it.axis!) ? 'm3.opt.right' : 'm3.opt.wrong')
        // 长方形的对角线这类容易错的只在第 3 档
        if (d < 3) expect((it.fig === 'rect' || it.fig === 'square') && (it.axis === 'd1' || it.axis === 'd2')).toBe(false)
      } else if (s.startsWith('fold-')) {
        const single = first![0]!
        const cands = second!
        expect(single.tone).toBe('paper')
        // 打开：给左半边，选整个图形；反过来：给整个图形，选哪个半边
        if (keyOf(q) === 'm3.mot.foldOpen') {
          expect(single.half).toBe(true)
          expect(cands.every((c) => !c.half)).toBe(true)
        } else {
          expect(single.half).toBeFalsy()
          expect(cands.every((c) => c.half)).toBe(true)
        }
        const hits = cands.filter((c) => c.fig === single.fig)
        expect(hits.length, q.id).toBe(1)
        expect(answerNum(q), q.id).toBe(hits[0]!.label)
        expect(new Set(cands.map((c) => c.fig)).size).toBe(cands.length)
        // 对折剪纸只能剪出轴对称图形
        for (const c of cands) expect(SYMMETRIC[c.fig], c.fig).toBe(true)
        expect(FOLD_FIGS).toContain(single.fig)
      } else throw new Error(`没见过的题：${q.id}`)
    })
  })

  it('第 1 档有是不是轴对称、对称轴几条、对折剪纸三类，题目够多样', () => {
    const kinds = new Set<string>()
    const ids = new Set<string>()
    each('m3s2-01-symmetry', (q, d) => {
      if (d !== 1) return
      kinds.add(sig(q).split('-')[0]!)
      ids.add(q.id)
    })
    expect([...kinds].sort()).toEqual(['axes', 'fold', 'is'])
    expect(ids.size).toBeGreaterThanOrEqual(20)
  })
})

describe('平移（m3s2-01-translate）与旋转（m3s2-01-rotate）', () => {
  const TRANSLATE = new Set([
    'm3.mot.s.elevator',
    'm3.mot.s.slide',
    'm3.mot.s.window',
    'm3.mot.s.cableCar',
    'm3.mot.s.drawer',
    'm3.mot.s.boxes',
    'm3.mot.s.luggage',
  ])
  const shortMotion = (k: string): 'translate' | 'rotate' => (TRANSLATE.has(SCENES.find((s) => s.short === k)!.key) ? 'translate' : 'rotate')

  function checkMotion(q: Question, d: 1 | 2 | 3): void {
    expect(q.type).toBe('motion')
    const s = sig(q)
    const [first, second] = rows(q)
    if (s.startsWith('scene-')) {
      const key = s.slice('scene-'.length)
      expect(answerKey(q), q.id).toBe(TRANSLATE.has(key) ? 'm3.mot.translate' : 'm3.mot.rotate')
    } else if (s.startsWith('pic-')) {
      const it = first![0]!
      expect(it.move, q.id).toBeDefined()
      expect(answerKey(q), q.id).toBe(it.move === 'turn' ? 'm3.mot.rotate' : 'm3.mot.translate')
    } else if (s.startsWith('def-')) {
      const expected: Record<string, string> = {
        'm3.mot.defTranslate': 'm3.mot.translate',
        'm3.mot.defRotate': 'm3.mot.rotate',
        'm3.mot.defCw': 'm3.mot.cw',
        'm3.mot.defCcw': 'm3.mot.ccw',
        'm3.mot.clockDir': 'm3.mot.cw',
      }
      expect(answerKey(q), q.id).toBe(expected[keyOf(q)])
    } else if (s.startsWith('not-')) {
      const main = keyOf(q) === 'm3.mot.notTranslate' ? 'translate' : 'rotate'
      const odd = q.choices!.filter((c) => shortMotion((c.label as { k: string }).k) !== main)
      expect(odd.length, q.id).toBe(1)
      expect(odd[0]!.id).toBe((q.answer as { choiceId: string }).choiceId)
    } else if (s.startsWith('overlap-')) {
      const [ref, ...cands] = first!
      expect(ref!.tone).toBe('red')
      expect(sameOrientation(ref!)).toBe(true)
      const hits = cands.filter(sameOrientation)
      expect(hits.length, q.id).toBe(1)
      expect(answerNum(q), q.id).toBe(hits[0]!.label)
      // 第 1 档像课本的小房子：别的只是转过的，不出翻过来的
      if (d === 1) expect(cands.some((c) => c.flip)).toBe(false)
      expect(q.choices!.map((c) => c.label)).toEqual(cands.map((c) => String(c.label)))
    } else if (s.startsWith('count-')) {
      const reds = first!.filter((it) => it.tone === 'red')
      expect(reds.length).toBe(1)
      const same = first!.filter((it) => it.tone !== 'red' && sameOrientation(it)).length
      expect(answerNum(q), q.id).toBe(same)
      expect(same).toBeGreaterThanOrEqual(1)
      expect(first!.length - 1 - same, `${q.id} 至少要有两个不能重合的`).toBeGreaterThanOrEqual(2)
    } else if (s.startsWith('dir-')) {
      const it = first![0]!
      expect(answerKey(q), q.id).toBe(it.arrow === 'cw' ? 'm3.mot.cw' : 'm3.mot.ccw')
    } else if (s.startsWith('clock-')) {
      const hours = first!.slice(0, 3).map((it) => it.hour!)
      expect(first![3]!.blank).toBe(true)
      const step = (((hours[1]! - hours[0]!) % 12) + 12) % 12
      expect((((hours[2]! - hours[1]!) % 12) + 12) % 12, q.id).toBe(step)
      expect(step).not.toBe(0)
      expect(answerNum(q), q.id).toBe(((hours[2]! + step - 1) % 12) + 1)
      // 第 2 档同课本：每次走 3 格
      if (d === 2) expect(step).toBe(3)
    } else if (s.startsWith('next-')) {
      const turns = first!.slice(0, 3).map((it) => it.turn ?? 0)
      expect(first![3]!.blank).toBe(true)
      const step = (turns[1]! - turns[0]! + 360) % 360
      expect(step === 90 || step === 270, q.id).toBe(true)
      expect((turns[2]! - turns[1]! + 360) % 360).toBe(step)
      const next = (turns[2]! + step) % 360
      const hits = second!.filter((it) => (it.turn ?? 0) === next)
      expect(hits.length, q.id).toBe(1)
      expect(answerNum(q), q.id).toBe(hits[0]!.label)
    } else throw new Error(`没见过的题：${q.id}`)
  }

  it('平移：答案从图 / 现象反推', () => each('m3s2-01-translate', checkMotion))
  it('旋转：答案从图 / 现象反推', () => each('m3s2-01-rotate', checkMotion))

  it('第 1 档覆盖主干：平移有现象、示意图、小房子（小鱼）能不能重合；旋转有现象、顺时针逆时针、定义', () => {
    const kinds = (kpId: string): string[] => {
      const out = new Set<string>()
      each(kpId, (q, d) => d === 1 && out.add(sig(q).split('-')[0]!))
      return [...out].sort()
    }
    expect(kinds('m3s2-01-translate')).toEqual(['overlap', 'pic', 'scene'])
    expect(kinds('m3s2-01-rotate')).toEqual(['def', 'dir', 'pic', 'scene'])
  })

  it('平移现象六成是平移、旋转现象六成是旋转（「这是平移还是旋转」两种答案都出）', () => {
    for (const [kpId, main] of [
      ['m3s2-01-translate', 'm3.mot.translate'],
      ['m3s2-01-rotate', 'm3.mot.rotate'],
    ] as const) {
      let mainCount = 0
      let total = 0
      each(kpId, (q) => {
        if (!sig(q).startsWith('scene-')) return
        total += 1
        if (answerKey(q) === main) mainCount += 1
      })
      expect(mainCount / total).toBeGreaterThan(0.45)
      expect(mainCount / total).toBeLessThan(0.8)
    }
  })
})

describe('运动现象：朗读与选项', () => {
  const ALL = ['m3s2-01-symmetry', 'm3s2-01-translate', 'm3s2-01-rotate']

  it('「转」「重」「称」不单独成片段，也不跟着别的字凑成别的读音（只在 旋转 / 转动 / 重合 / 对称 里）', () => {
    for (const kpId of ALL)
      each(kpId, (q) => {
        const words = [...questionSpeech(q, 'zh'), ...(q.choices ?? []).map((c) => zh(c.label))]
        for (const w of words) {
          for (const [ch, ok] of [
            ['转', /旋转|转动/g],
            ['重', /重合/g],
            ['称', /对称/g],
          ] as const) {
            const rest = w.replace(ok, '')
            expect(rest.includes(ch), `${q.id} 的「${w}」里有单独的「${ch}」`).toBe(false)
          }
          // 题干里不用括号（会读成「括号」）、不用「拧」
          expect(/[()（）拧]/.test(w), `${q.id}：${w}`).toBe(false)
        }
      })
  })

  it('选图的题：选项按图下面的号从小到大排', () => {
    for (const kpId of ALL)
      each(kpId, (q) => {
        if (!rows(q).some((r) => r.some((it) => it.label !== undefined))) return
        const nums = q.choices!.map((c) => Number(c.label))
        expect(nums, q.id).toEqual([...nums].sort((a, b) => a - b))
      })
  })

  it('没有方格纸、平移几格、旋转角度这些新课本没有的内容', () => {
    for (const kpId of ALL)
      each(kpId, (q) => {
        const text = questionSpeech(q, 'zh').join('')
        expect(/格|度|°/.test(text), `${q.id}：${text}`).toBe(false)
      })
  })

  it('一轮 8 题凑得满（第 1 档题目够多）', () => {
    for (const kpId of ALL) for (let seed = 1; seed <= 20; seed++) expect(buildSession(kpId, 8, { seed })).toHaveLength(8)
  })
})
