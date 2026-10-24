import { describe, expect, it } from 'vitest'
import '@/content/english/grade3'
import type { LStr, Question, StemPart } from '@/types/models'
import { buildSession, createRng, getGenerator } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { hasEntry, translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, questionSpeech, tokenVoice } from '@/engine/speech'
import { NUM_WORDS, hasPattern, parseCloze, parseSpell, parseTalk, parseWord, unitEnglish, unitWords } from '@/content/english/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { UNIT_ITEMS, UNIT_SPECS, WORD_POOL } from '../generators'

const zh = (l: LStr): string => translate(l, 'zh')
const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
function part<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
}
const label = (q: Question): string => zh(answerLabel(q))
const specOf = (kp: string) => UNIT_SPECS.find((u) => u.kp === kp)!
const SEEDS = 150

/** 一个知识点三档各 SEEDS 道题 */
function sample(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const out: Question[] = []
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) out.push(gen(d, createRng(seed)))
  return out
}
const SAMPLES = new Map(KNOWLEDGE_POINTS.map((kp) => [kp.id, sample(kp.id)]))
const ENGLISH = /^[A-Za-z0-9 ,.!?'"\-:;_]+$/

describe('目录与材料（需求 R4m）', () => {
  it('上下册各 6 个单元加一个 Revision，各 19 个知识点；每个单元 A / 字母或拼读 / B 三个；每个知识点一份材料、一个生成器', () => {
    expect(UNITS.filter((u) => u.semester === 1)).toHaveLength(7)
    expect(UNITS.filter((u) => u.semester === 2)).toHaveLength(7)
    expect(UNITS.filter((u) => u.numbered === false).map((u) => u.id)).toEqual(['e3s1u7', 'e3s2u7'])
    expect(KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('e3s1-'))).toHaveLength(19)
    expect(KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith('e3s2-'))).toHaveLength(19)
    expect(new Set(KNOWLEDGE_POINTS.map((kp) => kp.id)).size).toBe(KNOWLEDGE_POINTS.length)
    expect(UNIT_SPECS.map((u) => u.kp)).toEqual(KNOWLEDGE_POINTS.map((kp) => kp.id))
    for (const kp of KNOWLEDGE_POINTS) expect(getGenerator(kp.id), kp.id).toBeDefined()
    for (const u of UNITS) {
      const kinds = KNOWLEDGE_POINTS.filter((kp) => kp.unitId === u.id).map((kp) => kp.id.split('-').at(-1))
      if (u.numbered === false) expect(kinds, u.id).toEqual(['revision'])
      else expect(kinds, u.id).toEqual(['a', u.semester === 1 ? 'letters' : 'spell', 'b'])
    }
  })

  it('每一档引用的模板都有条目（写错模板名或材料不够会在这里暴露）；上册字母课有 letters，下册拼读课有 spell', () => {
    for (const [kp, { items, mix }] of UNIT_ITEMS) {
      for (const d of [1, 2, 3] as const) {
        expect(mix[d].length, `${kp} 第 ${d} 档`).toBeGreaterThan(0)
        for (const [name] of mix[d]) expect(items[name]?.length, `${kp} 第 ${d} 档的模板 ${name}`).toBeGreaterThan(0)
      }
    }
    for (const spec of UNIT_SPECS) {
      if (spec.kp.endsWith('-letters')) expect(spec.letters, spec.kp).toBeTruthy()
      if (spec.kp.endsWith('-spell')) expect(spec.spell?.length, spec.kp).toBeGreaterThan(0)
    }
  })

  it('材料的格式：单词「英文 中文 图」、拼读的词真的含那个字母组合、对话与填空的干扰项不等于答案；英文只用 ASCII 字母与标点', () => {
    for (const spec of UNIT_SPECS) {
      for (const w of unitWords(spec)) {
        expect(w.en, spec.kp).toMatch(ENGLISH)
        expect(w.zh, `${spec.kp} ${w.en}`).toMatch(/^[\p{Script=Han}（）()·]+$/u)
      }
      for (const s of spec.spell ?? []) {
        const it = parseSpell(s)
        for (const w of it.words) expect(hasPattern(w, it.pattern), `${spec.kp} ${s}`).toBe(true)
        for (const w of it.contrast) expect(hasPattern(w, it.pattern), `${spec.kp} ${s}`).toBe(false)
      }
      for (const s of spec.talk ?? []) {
        const it = parseTalk(s)
        expect(it.wrongs, `${spec.kp} ${s}`).not.toContain(it.answer)
      }
      for (const s of spec.cloze ?? []) {
        const it = parseCloze(s)
        expect(it.wrongs, `${spec.kp} ${s}`).not.toContain(it.answer)
      }
      for (const s of unitEnglish(spec)) expect(s, spec.kp).toMatch(ENGLISH)
      for (const w of (spec.numbers ?? '').split(/\s+/).filter(Boolean)) expect(NUM_WORDS[w], `${spec.kp} ${w}`).toBeDefined()
    }
    expect(parseWord('red panda 小熊猫 🐼')).toEqual({ en: 'red panda', zh: '小熊猫', icon: '🐼' })
    expect(WORD_POOL.length).toBeGreaterThan(100)
  })
})

describe('每个知识点的题目（150 种子 × 三档）', () => {
  for (const kp of KNOWLEDGE_POINTS) {
    const qs = SAMPLES.get(kp.id)!

    it(`${kp.id}：结构自洽，答案在选项里 / 是数，中英文词条都有`, () => {
      for (const q of qs) {
        expect(q.kpId).toBe(kp.id)
        expect(kp.questionTypes, q.type).toContain(q.type)
        expect(q.stem.length).toBeGreaterThan(0)
        if (q.input === 'choice') {
          expect(q.answer.kind).toBe('choice')
          const ids = q.choices!.map((c) => c.id)
          expect(ids).toContain((q.answer as { choiceId: string }).choiceId)
          expect(q.choices!.length).toBeGreaterThanOrEqual(2)
          const labels = q.choices!.map((c) => zh(c.label))
          expect(new Set(labels).size, q.id).toBe(labels.length)
          for (const c of q.choices!) {
            if (typeof c.label === 'object') expect(hasEntry(c.label.k, 'zh'), c.label.k).toBe(true)
            if (c.lang === 'en') expect(zh(c.label), q.id).not.toMatch(/\p{Script=Han}/u)
          }
        } else {
          expect(q.answer.kind).toBe('number')
          expect((q.answer as { value: number }).value).toBeGreaterThanOrEqual(0)
        }
        for (const p of q.stem) {
          if (p.kind === 'text' && typeof p.text === 'object') {
            expect(hasEntry(p.text.k, 'zh'), p.text.k).toBe(true)
            expect(hasEntry(p.text.k, 'en'), p.text.k).toBe(true)
          }
          if (p.kind === 'english') expect(p.text, q.id).toMatch(ENGLISH)
        }
      }
    })

    it(`${kp.id}：第 1 档至少 12 种不同的题，一轮 8 题不重复`, () => {
      const first = new Set(qs.filter((q) => q.difficulty === 1).map((q) => q.id))
      expect(first.size).toBeGreaterThanOrEqual(12)
      const session = buildSession(kp.id, 8)
      expect(new Set(session.map((q) => q.id)).size).toBe(8)
    })

    it(`${kp.id}：听音题屏幕上不出现要听的词；英文内容用英文的声音读、题目要求用中文读`, () => {
      for (const q of qs) {
        const listen = part(q, 'listen')
        if (listen) {
          expect(listen.lang).toBe('en')
          const shown = q.stem.filter((p): p is Extract<StemPart, { kind: 'english' }> => p.kind === 'english' && p.say !== '').map((p) => p.text.toLowerCase())
          for (const s of shown) expect(s, q.id).not.toContain(listen.say.toLowerCase())
        }
        const speech = questionSpeech(q, 'zh')
        expect(speech.length, q.id).toBeGreaterThan(0)
        for (const t of speech) {
          if (t === PAUSE) continue
          const v = tokenVoice(t, 'zh')
          if (v.lang === 'en') expect(v.text, q.id).toMatch(/^[A-Za-z0-9 ,.'"\-]+$/)
          else expect(v.text, q.id).not.toMatch(/[a-z]{2,}/)
        }
        const answer = answerSpeech(q, 'zh')
        expect(answer.length, q.id).toBeGreaterThan(0)
        const correct = q.input === 'choice' ? q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)! : undefined
        if (correct?.lang === 'en') {
          expect(tokenVoice(answer[0]!, 'zh').lang).toBe('zh')
          expect(answer.slice(1).filter((t) => t !== PAUSE).every((t) => tokenVoice(t, 'zh').lang === 'en'), q.id).toBe(true)
        }
      }
    })
  }
})

describe('各模板反推答案', () => {
  const all = [...SAMPLES.values()].flat()
  const by = (name: string): Question[] => all.filter((q) => maker(q) === name)

  it('听音选单词 / 看图选单词：答案就是材料里的那个词；看图题的图是那个词配的', () => {
    const words = new Map(UNIT_SPECS.flatMap((s) => unitWords(s).map((w) => [`${s.kp}:${w.en}`, w] as const)))
    for (const q of by('listen')) expect(label(q)).toBe(part(q, 'listen')!.say)
    for (const q of by('pic')) {
      const w = words.get(`${q.kpId}:${label(q)}`)
      expect(w?.icon, q.id).toBe(part(q, 'picture')!.icon)
    }
    expect(by('listen').length).toBeGreaterThan(100)
    expect(by('pic').length).toBeGreaterThan(50)
  })

  it('单词选意思 / 中文选单词：按材料里的「英文 中文」对', () => {
    const zhOf = new Map(UNIT_SPECS.flatMap((s) => unitWords(s).map((w) => [`${s.kp}:${w.en}`, w.zh] as const)))
    for (const q of by('meaning')) expect(label(q), q.id).toBe(zhOf.get(`${q.kpId}:${part(q, 'english')!.text}`))
    for (const q of by('zh2en')) {
      const prompt = q.stem[0] as { kind: 'text'; text: { k: string; p: { w: { k: string } } } }
      expect(zhOf.get(`${q.kpId}:${label(q)}`), q.id).toBe(prompt.text.p.w.k.replace(/^ew3\./, ''))
    }
  })

  it('字母：大写选小写 / 小写选大写 / 听音选字母 / 字母表顺序 / 首字母', () => {
    for (const q of by('lower')) expect(label(q)).toBe(part(q, 'english')!.text.toLowerCase())
    for (const q of by('upper')) expect(label(q)).toBe(part(q, 'english')!.text.toUpperCase())
    for (const q of by('listenletter')) expect(label(q)).toBe(`${part(q, 'listen')!.say}${part(q, 'listen')!.say.toLowerCase()}`)
    for (const q of by('after')) {
      const l = (q.stem[0] as { kind: 'text'; text: { k: string; p: { l: string } } }).text.p.l
      expect(label(q)).toBe(String.fromCharCode(l.charCodeAt(0) + 1))
    }
    for (const q of by('before')) {
      const l = (q.stem[0] as { kind: 'text'; text: { k: string; p: { l: string } } }).text.p.l
      expect(label(q)).toBe(String.fromCharCode(l.charCodeAt(0) - 1))
    }
    for (const q of by('sound')) expect(part(q, 'listen')!.say.toLowerCase().startsWith(label(q))).toBe(true)
    for (const q of by('spelling')) {
      const shown = part(q, 'english')!.text
      expect(shown.replace('_', label(q))).toBe(part(q, 'listen')!.say)
    }
  })

  it('拼读：听音选的词就是读的词；「哪个单词里有」的答案含那个字母组合、别的选项不含', () => {
    for (const q of by('spell')) expect(label(q)).toBe(part(q, 'listen')!.say)
    for (const q of by('spellgroup')) {
      const pattern = part(q, 'english')!.text
      expect(hasPattern(label(q), pattern), q.id).toBe(true)
      for (const c of q.choices!) if (c.id !== (q.answer as { choiceId: string }).choiceId) expect(hasPattern(zh(c.label), pattern), q.id).toBe(false)
    }
  })

  it('对话应答 / 选词填空 / 问答：答案是材料里给的', () => {
    for (const q of by('talk')) {
      const spec = specOf(q.kpId)
      const it = spec.talk!.map(parseTalk).find((t) => t.prompt === part(q, 'english')!.text)!
      expect(label(q), q.id).toBe(it.answer)
    }
    for (const q of by('cloze')) {
      const e = part(q, 'english')!
      expect(e.blank, q.id).toBeDefined()
      const chars = Array.from(e.text)
      expect(chars.slice(e.blank![0], e.blank![0] + e.blank![1]).join(''), q.id).toBe(label(q))
    }
    for (const q of by('listensent')) expect(label(q)).toBe(part(q, 'listen')!.say)
  })

  it('数字：数一数的个数、数词对应的数', () => {
    for (const q of by('count')) {
      const o = part(q, 'objects')!
      expect((q.answer as { value: number }).value).toBe(o.count)
      expect(q.input).toBe('numpad')
    }
    for (const q of by('numword')) expect((q.answer as { value: number }).value).toBe(NUM_WORDS[part(q, 'english')!.text])
    for (const q of by('num2word')) {
      const n = (q.stem[0] as { kind: 'text'; text: { k: string; p: { n: number } } }).text.p.n
      expect(NUM_WORDS[label(q)]).toBe(n)
    }
  })
})
