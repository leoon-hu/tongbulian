import { describe, expect, it } from 'vitest'
import '@/content/chinese/grade2'
import type { LStr, Question, StemPart } from '@/types/models'
import { buildSession, createRng, getGenerator, labelKey } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, questionSpeech, tokenVoice } from '@/engine/speech'
import { splitTone } from '@/content/chinese/shared/syllables'
import { parseAsk, parseBushou, parsePairs, parsePoly, parseZi, sayZi } from '@/content/chinese/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, LESSON_ITEMS } from '../generators'
import { PY } from '../py'

const zh = (l: LStr): string => translate(l, 'zh')
const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const key = (q: Question): string => q.id.split(':')[1]!.split('-').slice(1).join('-')
function part<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
}
const label = (q: Question): string => zh(answerLabel(q))
const value = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(label(q)))
const specOf = (kp: string) => LESSONS.find((l) => l.kp === kp)!
const SEEDS = 150

/** 一个知识点三档各 SEEDS 道题 */
function sample(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const out: Question[] = []
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) out.push(gen(d, createRng(seed)))
  return out
}
const SAMPLES = new Map(KNOWLEDGE_POINTS.map((kp) => [kp.id, sample(kp.id)]))

describe('目录与材料（需求 R4d）', () => {
  it('上下册各 8 个单元，35 / 36 个知识点；每个知识点一份材料、一个生成器；id 都以 c2s 开头且不重复', () => {
    expect(UNITS.filter((u) => u.semester === 1)).toHaveLength(8)
    expect(UNITS.filter((u) => u.semester === 2)).toHaveLength(8)
    expect(KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('c2s1-'))).toHaveLength(35)
    expect(KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('c2s2-'))).toHaveLength(36)
    expect(new Set(KNOWLEDGE_POINTS.map((kp) => kp.id)).size).toBe(KNOWLEDGE_POINTS.length)
    expect(LESSONS.map((l) => l.kp)).toEqual(KNOWLEDGE_POINTS.map((kp) => kp.id))
    for (const kp of KNOWLEDGE_POINTS) expect(getGenerator(kp.id), kp.id).toBeDefined()
    for (const u of UNITS) {
      const kps = KNOWLEDGE_POINTS.filter((kp) => kp.unitId === u.id)
      expect(kps.length, u.id).toBeGreaterThanOrEqual(4)
      // 每个单元最后一个是语文园地
      expect(kps[kps.length - 1]!.id.endsWith('-garden'), u.id).toBe(true)
    }
  })

  it('每一档引用的模板都有条目（写错模板名或材料不够会在这里暴露）；二年级没有拼音课的模板', () => {
    const PINYIN_ONLY = ['tone', 'picktone', 'spell', 'hear', 'picpy', 'pypic', 'pyword', 'kind', 'initial', 'final', 'flat', 'nasal', 'order', 'alphabet']
    for (const [kp, { items, mix }] of LESSON_ITEMS) {
      for (const d of [1, 2, 3] as const) {
        expect(mix[d].length, `${kp} 第 ${d} 档`).toBeGreaterThan(0)
        for (const [name, w] of mix[d]) {
          expect(w).toBeGreaterThan(0)
          expect(PINYIN_ONLY, `${kp} 用了拼音课的模板 ${name}`).not.toContain(name)
          expect(items[name]?.length ?? 0, `${kp} 第 ${d} 档的 ${name} 没有条目`).toBeGreaterThan(0)
        }
      }
    }
  })
})

describe('题目结构（G1–G3）', () => {
  it(`每个知识点 ${SEEDS} 种子 × 三档：知识点 / 难度对、题干非空、作答方式与答案一致、选项互异且含正确项`, () => {
    for (const [kp, qs] of SAMPLES) {
      for (const q of qs) {
        expect(q.kpId).toBe(kp)
        expect(q.id.startsWith(`${kp}:`)).toBe(true)
        expect(q.stem.length).toBeGreaterThan(0)
        if (q.input === 'numpad') {
          expect(q.answer.kind).toBe('number')
          expect(q.choices).toBeUndefined()
        } else {
          expect(q.answer.kind).toBe('choice')
          const cs = q.choices!
          expect(cs.length, q.id).toBeGreaterThanOrEqual(2)
          expect(cs.length).toBeLessThanOrEqual(4)
          expect(new Set(cs.map((c) => labelKey(c.label))).size, q.id).toBe(cs.length)
          expect(new Set(cs.map((c) => zh(c.label))).size, q.id).toBe(cs.length)
          expect(cs.some((c) => c.id === (q.answer.kind === 'choice' ? q.answer.choiceId : ''))).toBe(true)
        }
        for (const p of q.stem) {
          if (p.kind === 'verse' && p.blank) expect(p.blank[0] + p.blank[1]).toBeLessThanOrEqual(Array.from(p.text).length)
          if (p.kind === 'hanzi' && p.mark !== undefined) expect(Array.from(p.text)[p.mark]).toBeDefined()
        }
      }
    }
  })

  it('答案对得上：从题目本身反推出来的答案与标的答案一致；材料里每种模板都真的出过题', () => {
    const used = new Set<string>()
    for (const [kp, qs] of SAMPLES) {
      const spec = specOf(kp)
      const own = parseZi(spec.zi).reading
      const zr = (c: string): string | undefined => own[c] ?? PY[c]
      for (const q of qs) {
        const m = maker(q)
        used.add(`${kp}|${m}`)
        const hz = part(q, 'hanzi')?.text ?? ''
        const py = part(q, 'pinyin')?.text ?? ''
        switch (m) {
          case 'listen':
            expect(part(q, 'listen')!.say).toBe(sayZi(label(q), zr(label(q))))
            break
          case 'pyzi':
            expect(py).toBe(zr(label(q)))
            for (const c of q.choices!) if (zh(c.label) !== label(q)) expect(PY[zh(c.label)], q.id).not.toBe(py)
            break
          case 'zipy':
            expect(label(q)).toBe(zr(hz))
            break
          case 'pyci':
            expect(py).toBe(zr(label(q)))
            // 同音的词不当干扰项（不然两个都对）
            for (const c of q.choices!) if (zh(c.label) !== label(q)) expect(PY[zh(c.label)], q.id).not.toBe(py)
            break
          case 'cilisten':
            expect(part(q, 'listen')!.say).toBe(label(q))
            break
          case 'poly': {
            const it = spec.poly!.map(parsePoly).find((p) => `${p.word}-${p.c}` === key(q))!
            expect(label(q)).toBe(it.readings[0]!.py)
            const grid = part(q, 'hanzi')!
            expect(grid.text).toBe(it.word)
            expect(Array.from(grid.text)[grid.mark!]).toBe(it.c)
            break
          }
          case 'cloze': {
            const v = part(q, 'verse')!
            expect(Array.from(v.text).slice(v.blank![0], v.blank![0] + v.blank![1]).join(''), q.id).toBe(label(q))
            break
          }
          case 'compose':
            expect(hz.endsWith('＝？')).toBe(true)
            expect(spec.compose!.some((c) => c.endsWith(`=${label(q)}`) && c.startsWith(hz.replace(/[＋－]/g, (x) => (x === '＋' ? '+' : '-')).replace('＝？', '')))).toBe(true)
            break
          case 'split':
            expect(spec.compose!).toContain(`${label(q).replace(/＋/g, '+')}=${hz}`)
            break
          case 'anto':
          case 'syn': {
            const pairs = parsePairs(m === 'anto' ? spec.anto : spec.syn)
            const w = key(q)
            const pair = pairs.find((p) => p.includes(w))!
            expect(label(q)).toBe(pair[0] === w ? pair[1] : pair[0])
            break
          }
          case 'radof':
            expect(q.choices!.find((c) => zh(c.label) === label(q))!.say).toBeTruthy()
            break
          case 'bushou': {
            const it = spec.bushou!.map(parseBushou).find((b) => b.c === key(q))!
            expect(label(q)).toBe(it.r)
            expect(q.choices!.find((c) => zh(c.label) === it.r)!.say).toBe(it.name)
            break
          }
          case 'bushouN': {
            const it = spec.bushou!.map(parseBushou).find((b) => b.c === key(q))!
            expect(value(q)).toBe(it.n)
            break
          }
          case 'ask': {
            const it = parseAsk(spec.ask!.find((s) => parseAsk(s).q === key(q))!)
            if (it.number !== undefined) expect(value(q)).toBe(it.number)
            else expect(zh(answerLabel(q)).replace(/^\p{Extended_Pictographic}️?\s*/u, '')).toBe(it.answer.replace(/^\p{Extended_Pictographic}️?/u, ''))
            break
          }
          case 'strokes':
            expect(value(q)).toBeGreaterThanOrEqual(1)
            expect(value(q)).toBeLessThanOrEqual(25)
            break
          default:
            break
        }
      }
    }
    // 每一档引用到的模板都出过题（radical 模板出的题叫 radof / radwhich，compose 的还有 split，bushou 的数画是 bushouN）
    const ALIAS: Record<string, string[]> = { radical: ['radof', 'radwhich'], compose: ['compose', 'split'] }
    for (const [kp, { mix }] of LESSON_ITEMS) {
      for (const name of new Set(([1, 2, 3] as const).flatMap((d) => mix[d].map(([n]) => n)))) {
        expect((ALIAS[name] ?? [name]).some((n) => used.has(`${kp}|${n}`)), `${kp} 的 ${name} 一道也没出过`).toBe(true)
      }
    }
  })

  it('多音字的同音字只有这一个读音、正好是要读的音；部首都有名称', () => {
    for (const spec of LESSONS) {
      for (const s of spec.poly ?? []) {
        const it = parsePoly(s)
        expect(new Set(it.readings.map((r) => r.py)).size, s).toBe(it.readings.length)
        for (const r of it.readings) {
          expect(PY[r.say], `${s}：${r.say}`).toBe(r.py)
          expect(splitTone(r.py).tone, `${s}：${r.py} 要带调`).toBeGreaterThan(0)
        }
      }
      for (const s of spec.bushou ?? []) {
        const it = parseBushou(s)
        expect(it.n, s).toBeGreaterThanOrEqual(0)
        // 名称按部首在字里的位置叫（鲁的鱼在上面叫「鱼字头」，鲤的叫「鱼字旁」），不一定与偏旁表一样
        expect(it.name, s).toMatch(/^\p{Script=Han}{1,4}$/u)
      }
    }
  })
})

describe('不泄露答案（需求 Y3）', () => {
  const shownText = (q: Question): string =>
    q.stem
      .map((p) => {
        if (p.kind === 'text') return zh(p.text)
        if (p.kind === 'verse') {
          const cs = Array.from(p.text)
          return p.blank ? [...cs.slice(0, p.blank[0]), ...cs.slice(p.blank[0] + p.blank[1])].join('') : p.text
        }
        return ''
      })
      .join('\n')

  it('考认字的题（楷体选项）：答案里的字不出现在注音的题目文字里', () => {
    let checked = 0
    const bad: string[] = []
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        if (q.choiceStyle !== 'hanzi') continue
        const ans = label(q)
        if (!/\p{Script=Han}/u.test(ans)) continue
        checked += 1
        const shown = shownText(q)
        for (const c of Array.from(ans).filter((x) => /\p{Script=Han}/u.test(x))) if (shown.includes(c)) bad.push(`${q.id}：「${c}」在「${shown}」里`)
      }
    }
    expect([...new Set(bad)]).toEqual([])
    expect(checked).toBeGreaterThan(1000)
  })

  it('看字选读音 / 看拼音选字 / 看拼音选词语：考的字词不在题目要求里，也不读出来；听音题屏幕上没有要听的字词', () => {
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        const m = maker(q)
        if (!['zipy', 'pyzi', 'listen', 'pyci', 'cilisten', 'poly'].includes(m)) continue
        const target = m === 'zipy' || m === 'poly' ? part(q, 'hanzi')!.text : label(q)
        expect(shownText(q).includes(target), q.id).toBe(false)
        if (m === 'listen' || m === 'cilisten') continue // 听音题本来就是读出来的
        const spoken = questionSpeech(q, 'zh').join('')
        expect(spoken.includes(target), `${q.id} 读出了「${target}」`).toBe(false)
      }
    }
  })
})

describe('数量（需求 Y5）', () => {
  it('每课第 1 档至少 14 道不同的题；一轮 8 题总能凑满，对战一批 16 题至少 12 道', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      const ids = new Set(SAMPLES.get(kp.id)!.filter((q) => q.difficulty === 1).map((q) => q.id))
      expect(ids.size, kp.id).toBeGreaterThanOrEqual(14)
      for (let seed = 1; seed <= 20; seed++) {
        expect(buildSession(kp.id, 8, { seed }).length, `${kp.id} seed ${seed}`).toBe(8)
        expect(buildSession(kp.id, 16, { seed }).length, `${kp.id} seed ${seed}`).toBeGreaterThanOrEqual(12)
      }
    }
  })
})

describe('朗读（需求 Y4 / Y6）', () => {
  it('每道题读得出题目要求、读得出答案；中文朗读里没有拼音字母、阿拉伯数字（除了数字键盘的答案）', () => {
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        for (const lang of ['zh', 'en'] as const) {
          expect(questionSpeech(q, lang).length, q.id).toBeGreaterThan(0)
          expect(answerSpeech(q, lang).length, q.id).toBeGreaterThan(0)
        }
        for (const t of questionSpeech(q, 'zh')) {
          expect(t, q.id).not.toMatch(/[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/)
          expect(t, q.id).not.toMatch(/\d/)
        }
        for (const t of answerSpeech(q, 'zh')) expect(t, q.id).not.toMatch(/[A-Za-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/)
      }
    }
  })

  it('英文界面：课文、字词、答案这些中文内容标成用中文读', () => {
    let zhTokens = 0
    for (const qs of SAMPLES.values()) {
      for (const q of qs.slice(0, 30)) {
        for (const t of [...questionSpeech(q, 'en'), ...answerSpeech(q, 'en')]) {
          if (t === PAUSE) continue
          const v = tokenVoice(t, 'en')
          if (/\p{Script=Han}/u.test(v.text)) {
            expect(v.lang, `${q.id}：${v.text}`).toBe('zh')
            zhTokens += 1
          }
        }
      }
    }
    expect(zhTokens).toBeGreaterThan(500)
  })
})
