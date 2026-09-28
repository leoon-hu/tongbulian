import { describe, expect, it } from 'vitest'
import '@/content/chinese/grade1'
import type { LStr, Question, StemPart } from '@/types/models'
import { buildSession, createRng, getGenerator, labelKey } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { rubySegments, translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, questionSpeech, tokenVoice } from '@/engine/speech'
import { INITIALS, LETTER_SAY, addTone, splitSyllable, splitTone } from '@/content/chinese/shared/syllables'
import { RADICALS, parseAsk, sayZi } from '@/content/chinese/shared/makers'
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
const CN_DIGITS = '一二三四五六七八九十'
const INITIAL_ORDER = 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ')
const FINAL_ORDER = 'a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong'.split(' ')
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const SEEDS = 150

/** 一个知识点三档各 SEEDS 道题 */
function sample(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const out: Question[] = []
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) out.push(gen(d, createRng(seed)))
  return out
}
const SAMPLES = new Map(KNOWLEDGE_POINTS.map((kp) => [kp.id, sample(kp.id)]))

describe('目录与材料（需求 R4c）', () => {
  it('上下册各 8 个单元，40 / 36 个知识点；每个知识点一份材料、一个生成器；id 都以 c1s 开头且不重复', () => {
    expect(UNITS.filter((u) => u.semester === 1)).toHaveLength(8)
    expect(UNITS.filter((u) => u.semester === 2)).toHaveLength(8)
    const s1 = KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('c1s1-'))
    const s2 = KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('c1s2-'))
    expect(s1).toHaveLength(40)
    expect(s2).toHaveLength(36)
    expect(new Set(KNOWLEDGE_POINTS.map((kp) => kp.id)).size).toBe(KNOWLEDGE_POINTS.length)
    expect(LESSONS.map((l) => l.kp)).toEqual(KNOWLEDGE_POINTS.map((kp) => kp.id))
    for (const kp of KNOWLEDGE_POINTS) {
      expect(getGenerator(kp.id), kp.id).toBeDefined()
      expect(UNITS.some((u) => u.id === kp.unitId)).toBe(true)
      // 每个单元最后一个是语文园地
    }
    for (const u of UNITS) {
      const kps = KNOWLEDGE_POINTS.filter((kp) => kp.unitId === u.id)
      expect(kps.length, u.id).toBeGreaterThanOrEqual(4)
      expect(kps[kps.length - 1]!.id.endsWith('-garden'), u.id).toBe(true)
    }
  })

  it('每一档引用的模板都有条目（写错模板名或材料不够会在这里暴露）', () => {
    for (const [kp, { items, mix }] of LESSON_ITEMS) {
      for (const d of [1, 2, 3] as const) {
        expect(mix[d].length, `${kp} 第 ${d} 档`).toBeGreaterThan(0)
        for (const [name, w] of mix[d]) {
          expect(w).toBeGreaterThan(0)
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
          if (p.kind === 'verse' && p.blank) {
            const n = Array.from(p.text).length
            expect(p.blank[0] + p.blank[1]).toBeLessThanOrEqual(n)
          }
        }
      }
    }
  })

  it('答案对得上：从题目本身反推出来的答案与标的答案一致', () => {
    const counts = new Map<string, number>()
    for (const [kp, qs] of SAMPLES) {
      const spec = LESSONS.find((l) => l.kp === kp)!
      for (const q of qs) {
        const m = maker(q)
        counts.set(m, (counts.get(m) ?? 0) + 1)
        const hz = part(q, 'hanzi')?.text ?? ''
        const py = part(q, 'pinyin')?.text ?? ''
        switch (m) {
          case 'listen':
            expect(part(q, 'listen')!.say).toBe(sayZi(label(q), PY[label(q)]))
            break
          case 'pyzi':
            expect(py).toBe(PY[label(q)])
            // 看拼音选字：干扰字里没有同音字（不然两个都对）
            for (const c of q.choices!) if (zh(c.label) !== label(q)) expect(PY[zh(c.label)], q.id).not.toBe(py)
            break
          case 'zipy':
            expect(label(q)).toBe(PY[hz])
            break
          case 'digit':
            expect(label(q)).toBe(CN_DIGITS[Number(hz) - 1])
            break
          case 'zidigit':
            expect(value(q)).toBe(CN_DIGITS.indexOf(hz) + 1)
            break
          case 'cloze': {
            const v = part(q, 'verse')!
            expect(Array.from(v.text).slice(v.blank![0], v.blank![0] + v.blank![1]).join(''), q.id).toBe(label(q))
            break
          }
          case 'compose':
            expect(hz.endsWith('＝？')).toBe(true)
            expect(label(q)).toMatch(/^\p{Script=Han}$/u)
            expect(spec.compose!.some((c) => c.endsWith(`=${label(q)}`) && c.startsWith(hz.replace(/[＋－]/g, (x) => (x === '＋' ? '+' : '-')).replace('＝？', '')))).toBe(true)
            break
          case 'split':
            expect(spec.compose!).toContain(`${label(q).replace(/＋/g, '+')}=${hz}`)
            break
          case 'tone':
            expect(value(q)).toBe(splitTone(py).tone)
            break
          case 'picktone': {
            const n = Number(key(q).split('-').pop())
            expect(label(q)).toBe(addTone(py, n as 1 | 2 | 3 | 4))
            break
          }
          case 'spell': {
            const parts = py.split(' + ')
            const [initial] = parts
            let joined = parts.join('')
            // j q x 与 ü 相拼去掉两点
            if ('jqx'.includes(initial!)) joined = joined.replace(/[üǖǘǚǜ]/, (x) => ({ ü: 'u', ǖ: 'ū', ǘ: 'ú', ǚ: 'ǔ', ǜ: 'ù' })[x]!)
            expect(label(q), q.id).toBe(joined)
            break
          }
          case 'initial':
            expect(label(q)).toBe(splitSyllable(splitTone(py).base).initial)
            break
          case 'final':
            expect(label(q)).toBe(splitSyllable(splitTone(py).base).final)
            break
          case 'order':
          case 'abc': {
            const shown = py.split(/\s+/).map((t) => (t === '?' ? label(q) : t))
            const fits = [INITIAL_ORDER, FINAL_ORDER, ALPHABET].some((list) => {
              const i = list.indexOf(shown[0]!)
              return i >= 0 && shown.every((t, k) => list[i + k] === t)
            })
            expect(fits, `${q.id}：${py} → ${label(q)}`).toBe(true)
            break
          }
          case 'lower':
            expect(label(q)).toBe(py.toLowerCase())
            break
          case 'upper':
            expect(label(q)).toBe(py.toUpperCase())
            break
          case 'yinxu': {
            const c = key(q)
            expect(label(q)).toBe(splitTone(PY[c]!).base[0]!.toUpperCase())
            break
          }
          case 'anto': {
            const w = key(q)
            const pair = spec.anto!.split(' ').find((p) => p.includes(w))!
            expect(label(q)).toBe(Array.from(pair).find((x) => x !== w))
            break
          }
          case 'radof':
            expect(Object.keys(RADICALS)).toContain(label(q))
            expect(q.choices!.find((c) => zh(c.label) === label(q))!.say).toBe(RADICALS[label(q)])
            break
          case 'radwhich': {
            const it = spec.radical!.map((s) => s.split(' ')).find(([c]) => c === label(q))!
            expect(zh(q.stem[0]!.kind === 'text' ? q.stem[0]!.text : '')).toContain(it[2])
            break
          }
          case 'kind': {
            const kind = key(q).split('-')[0]
            if (kind === 'initial') expect((INITIALS as readonly string[]).includes(label(q))).toBe(true)
            else expect((INITIALS as readonly string[]).includes(label(q)), q.id).toBe(false)
            break
          }
          case 'flat':
            expect(label(q)).toBe(/^(zh|ch|sh)/.test(key(q)) ? '翘舌音' : '平舌音')
            break
          case 'nasal':
            expect(label(q)).toBe(/ng$/.test(splitTone(key(q)).base) ? '后鼻韵母' : '前鼻韵母')
            break
          case 'hear':
            expect(label(q)).toBe(key(q))
            break
          case 'ask': {
            const it = parseAsk(spec.ask!.find((s) => parseAsk(s).q === key(q))!)
            if (it.number !== undefined) expect(value(q)).toBe(it.number)
            else expect(zh(answerLabel(q)).replace(/^\p{Extended_Pictographic}️?\s*/u, '')).toBe(it.answer.replace(/^\p{Extended_Pictographic}️?/u, ''))
            break
          }
          case 'strokes':
            expect(value(q)).toBeGreaterThanOrEqual(1)
            expect(value(q)).toBeLessThanOrEqual(20)
            break
          default:
            break
        }
      }
    }
    // 每种模板都真的出现过
    for (const m of ['listen', 'pyzi', 'zipy', 'pic', 'zipic', 'digit', 'zidigit', 'strokes', 'first', 'cloze', 'ask', 'compose', 'split', 'radof', 'radwhich', 'poet', 'anto', 'tone', 'picktone', 'spell', 'hear', 'picpy', 'pypic', 'pyword', 'kind', 'initial', 'final', 'flat', 'nasal', 'order', 'lower', 'upper', 'abc', 'yinxu']) {
      expect(counts.get(m) ?? 0, m).toBeGreaterThan(0)
    }
  })

  it('读得出来的选项都有读法：拼音、偏旁、标点、图的正确项带 say，字母带呼读音', () => {
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        if (q.input !== 'choice') continue
        const right = q.choices!.find((c) => q.answer.kind === 'choice' && c.id === q.answer.choiceId)!
        const text = zh(right.label)
        if (q.choiceStyle === 'pinyin' && !/^[A-Za-z]$/.test(text)) {
          expect(right.say, q.id).toBeTruthy()
          expect(right.say!).toMatch(/^\p{Script=Han}+$/u)
        }
        if (q.choiceStyle === 'emoji') expect(right.say, q.id).toBeTruthy()
        if (/^[。？！，]$/.test(text)) expect(right.say).toBeTruthy()
        if (LETTER_SAY[text] && q.choiceStyle === 'pinyin' && /^[a-zü]+$/.test(text) && text.length > 1) expect(right.say).toBe(LETTER_SAY[text])
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
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        if (q.choiceStyle !== 'hanzi') continue
        const ans = label(q)
        if (!/\p{Script=Han}/u.test(ans)) continue
        checked += 1
        const shown = shownText(q)
        for (const c of Array.from(ans).filter((x) => /\p{Script=Han}/u.test(x))) expect(shown.includes(c), `${q.id}：「${c}」在「${shown}」里`).toBe(false)
      }
    }
    expect(checked).toBeGreaterThan(1000)
  })

  it('看字选读音：田字格里的字不出现在题目要求里，也不读出来；看拼音选字不读拼音', () => {
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        const m = maker(q)
        if (m !== 'zipy' && m !== 'pyzi' && m !== 'listen') continue
        const target = m === 'zipy' ? part(q, 'hanzi')!.text : label(q)
        expect(shownText(q).includes(target), q.id).toBe(false)
        if (m === 'listen') continue // 听音题本来就是读出来的
        const spoken = questionSpeech(q, 'zh').join('')
        expect(spoken.includes(target), `${q.id} 读出了「${target}」`).toBe(false)
      }
    }
  })

  it('上册第一单元（还没学拼音）不出拼音题：没有拼音卡、没有拼音选项', () => {
    for (const [kp, qs] of SAMPLES) {
      if (!kp.startsWith('c1s1-01-')) continue
      for (const q of qs) {
        expect(q.choiceStyle, q.id).not.toBe('pinyin')
        expect(part(q, 'pinyin'), q.id).toBeUndefined()
      }
    }
  })
})

describe('数量（需求 Y5）', () => {
  it('每课第 1 档至少 12 道不同的题；一轮 8 题总能凑满，对战一批 16 题至少 12 道', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      const ids = new Set(SAMPLES.get(kp.id)!.filter((q) => q.difficulty === 1).map((q) => q.id))
      expect(ids.size, kp.id).toBeGreaterThanOrEqual(12)
      for (let seed = 1; seed <= 20; seed++) {
        expect(buildSession(kp.id, 8, { seed }).length, `${kp.id} seed ${seed}`).toBe(8)
        expect(buildSession(kp.id, 16, { seed }).length, `${kp.id} seed ${seed}`).toBeGreaterThanOrEqual(12)
      }
    }
  })
})

describe('朗读（需求 Y4 / Y6）', () => {
  it('每道题读得出题目要求、读得出答案；中文朗读里没有拼音字母（字母表的字母除外）', () => {
    for (const qs of SAMPLES.values()) {
      for (const q of qs) {
        for (const lang of ['zh', 'en'] as const) {
          const qt = questionSpeech(q, lang)
          const at = answerSpeech(q, lang)
          expect(qt.length, q.id).toBeGreaterThan(0)
          expect(at.length, q.id).toBeGreaterThan(0)
          for (const t of [...qt, ...at]) expect(t).not.toBe('')
        }
        for (const t of [...questionSpeech(q, 'zh'), ...answerSpeech(q, 'zh')]) {
          expect(t, q.id).not.toMatch(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/)
          if (!['lower', 'upper', 'abc', 'yinxu'].includes(maker(q))) expect(t, q.id).not.toMatch(/[A-Za-z]/)
        }
      }
    }
  })

  it('「选出第几声」的声调用汉字：屏幕上「一」注 yī，朗读是一整句、没有阿拉伯数字；英文界面是 tone 1', () => {
    // 阿拉伯数字夹在中文句子里，合成出来是读数字的调子（「第1声」的 1 往下掉，像四声）
    const q = SAMPLES.get('c1s1-02-aoe')!.find((x) => maker(x) === 'picktone' && key(x).endsWith('-1'))!
    const stem = q.stem[0]!
    if (stem.kind !== 'text') throw new Error('not text')
    expect(zh(stem.text)).toBe('选出第一声。')
    expect(rubySegments(stem.text, 'zh')).toContainEqual({ text: '一', py: 'yī' })
    expect(questionSpeech(q, 'zh')[0]).toBe('选出第一声')
    expect(translate(stem.text, 'en')).toBe('Choose tone 1.')
    for (const qs of SAMPLES.values()) for (const x of qs) for (const t of questionSpeech(x, 'zh')) expect(t, x.id).not.toMatch(/第\d声/)
  })

  it('英文界面：题目要求读英文，课文、字词、答案这些中文内容标成用中文读（字母表的字母跟中文界面一样读）', () => {
    let zhTokens = 0
    for (const qs of SAMPLES.values()) {
      for (const q of qs.slice(0, 30)) {
        for (const t of [...questionSpeech(q, 'en'), ...answerSpeech(q, 'en')]) {
          if (t === PAUSE) continue
          const v = tokenVoice(t, 'en')
          if (/\p{Script=Han}/u.test(v.text)) {
            expect(v.lang, `${q.id}：${v.text}`).toBe('zh')
            zhTokens += 1
          } else if (v.lang === 'zh') expect(v.text, q.id).toMatch(/^[A-Za-z]$/)
        }
      }
    }
    expect(zhTokens).toBeGreaterThan(500)
  })
})
