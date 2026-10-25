// 英语各年级共用的测试（需求 §11 E1–E8）：每个年级的 generators.test.ts / pinyin.test.ts 把自己的目录、材料、单词表传进来。
// 不是测试文件本身（vitest 只跑 *.test.ts），由各年级的测试文件调用。
import { describe, expect, it } from 'vitest'
import type { KnowledgePoint, LStr, Question, StemPart, Unit } from '@/types/models'
import { buildSession, createRng, getGenerator } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { dictKeys, hasEntry, isHan, pinyinOf, rubySegments, translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, questionSpeech, tokenVoice } from '@/engine/speech'
import type { EnglishPack } from '@/content/english/shared/pack'
import type { UnitSpec } from '@/content/english/shared/spec'
import { PINYIN } from '@/content/english/shared/prompts'
import { LETTER_GROUPS, NUM_WORDS, hasPattern, meaningClash, parseCloze, parseRead, parseSpell, parseTalk, parseWord, rudeWord, sentenceOverlap, soundsSame, syllables, unitEnglish, unitReads, unitTexts, unitWords } from '@/content/english/shared/makers'
import type { WordItem } from '@/content/english/shared/makers'

/** 书后单词表：册 → 单元 → 词 */
export type WordList = Readonly<Record<1 | 2, Readonly<Record<number, readonly string[]>>>>

export interface EnglishGrade {
  /** 年级（知识点 id 的 e<年级>s…） */
  grade: number
  /** 注音词条前缀（ew3） */
  prefix: string
  units: Unit[]
  kps: KnowledgePoint[]
  specs: UnitSpec[]
  items: EnglishPack['items']
  pool: WordItem[]
  /** 书后单词表的黑体词 / 白体词 */
  bold: WordList
  white: WordList
  /** 每个单元中间那个知识点（三上 letters，其余 spell） */
  middle: (sem: 1 | 2) => 'letters' | 'spell'
  /** Revision 能单独考的词（两册的黑体词，四年级起还有前面年级的） */
  revisionWords: ReadonlySet<string>
  /** 拼读组的对比词里字母一样、读音不一样的（ear 组的 bear / wear / pear） */
  otherSound?: Readonly<Record<string, readonly string[]>>
  /** 全年级词池至少多少个词 */
  minPool: number
  /** 每册几个单元、几个知识点（默认 7 / 19：6 个单元 + Revision；旧版五下 8 / 20：6 个单元 + 两个 Recycle） */
  layout?: Partial<Record<1 | 2, { units: number; kps: number }>>
  /** 白体词也能单独考的册（旧版课本：白体词「只作听、说、认读要求」，五下） */
  whiteTestable?: Partial<Record<1 | 2, boolean>>
}

/** 复习单元的知识点：新版的 Revision、旧版的 Recycle */
const isReview = (kind: string): boolean => kind === 'revision' || kind === 'recycle'

const zh = (l: LStr): string => translate(l, 'zh')
export const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
export function part<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
}
export const label = (q: Question): string => zh(answerLabel(q))
const SEEDS = 150
const ENGLISH = /^[A-Za-z0-9 ,.!?'"\-:;_]+$/

/** 一个知识点三档各 SEEDS 道题 */
function sample(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const out: Question[] = []
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) out.push(gen(d, createRng(seed)))
  return out
}

/** 一个年级的出题测试；返回全部样题（各年级自己的专项用） */
export function generatorSuite(g: EnglishGrade): Map<string, Question[]> {
  const SAMPLES = new Map(g.kps.map((kp) => [kp.id, sample(kp.id)]))
  const specOf = (kp: string): UnitSpec => g.specs.find((u) => u.kp === kp)!
  const id = `e${g.grade}s`

  describe('目录与材料', () => {
    it('每册 6 个单元加复习单元（Revision / 旧版的 Recycle）；每个单元三个知识点；每个知识点一份材料、一个生成器', () => {
      for (const sem of [1, 2] as const) {
        const { units, kps } = g.layout?.[sem] ?? { units: 7, kps: 19 }
        expect(g.units.filter((u) => u.semester === sem), `第 ${sem} 册`).toHaveLength(units)
        expect(g.units.filter((u) => u.semester === sem && u.numbered !== false), `第 ${sem} 册`).toHaveLength(6)
        expect(g.kps.filter((kp) => kp.id.startsWith(`${id}${sem}-`)), `第 ${sem} 册`).toHaveLength(kps)
      }
      expect(new Set(g.kps.map((kp) => kp.id)).size).toBe(g.kps.length)
      expect(g.specs.map((u) => u.kp)).toEqual(g.kps.map((kp) => kp.id))
      for (const kp of g.kps) expect(getGenerator(kp.id), kp.id).toBeDefined()
      for (const u of g.units) {
        const kinds = g.kps.filter((kp) => kp.unitId === u.id).map((kp) => kp.id.split('-').at(-1))
        if (u.numbered === false) {
          expect(kinds, u.id).toHaveLength(1)
          expect(isReview(kinds[0]!), u.id).toBe(true)
        } else expect(kinds, u.id).toEqual(['a', g.middle(u.semester), 'b'])
      }
    })

    it('每一档引用的模板都有条目（写错模板名或材料不够会在这里暴露）；字母课有 letters，拼读课有 spell', () => {
      for (const [kp, { items, mix }] of g.items) {
        for (const d of [1, 2, 3] as const) {
          expect(mix[d].length, `${kp} 第 ${d} 档`).toBeGreaterThan(0)
          for (const [name] of mix[d]) expect(items[name]?.length, `${kp} 第 ${d} 档的模板 ${name}`).toBeGreaterThan(0)
        }
      }
      for (const spec of g.specs) {
        if (spec.kp.endsWith('-letters')) expect(spec.letters, spec.kp).toBeTruthy()
        if (spec.kp.endsWith('-spell')) expect(spec.spell?.length, spec.kp).toBeGreaterThan(0)
      }
    })

    it('材料的格式：单词「英文 中文 图」、拼读的词真的含那个字母组合、对话与填空的干扰项不等于答案；英文只用 ASCII 字母与标点', () => {
      for (const spec of g.specs) {
        for (const w of unitWords(spec)) {
          expect(w.en, spec.kp).toMatch(ENGLISH)
          expect(w.zh, `${spec.kp} ${w.en}`).toMatch(/^[\p{Script=Han}（）()·]+$/u)
        }
        for (const s of spec.spell ?? []) {
          const it = parseSpell(s)
          for (const w of it.words) expect(hasPattern(w, it.pattern), `${spec.kp} ${s}`).toBe(true)
          for (const w of it.contrast) if (!g.otherSound?.[it.pattern]?.includes(w)) expect(hasPattern(w, it.pattern), `${spec.kp} ${s}`).toBe(false)
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
      expect(g.pool.length).toBeGreaterThan(g.minPool)
    })
  })

  describe('每个知识点的题目（150 种子 × 三档）', () => {
    for (const kp of g.kps) {
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
            if (v.lang === 'en') expect(v.text, q.id).toMatch(/^[A-Za-z0-9 ,.:?'"\-]+$/)
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

  describe('课本要求与「两个都对」（E1 / E3）', () => {
    const all = [...SAMPLES.values()].flat()
    const kindOf = (kp: string): string => kp.split('-').at(-1)!
    /** 知识点在第几册、课本的第几单元（复习单元是 0） */
    const unitOf = (kp: string): [1 | 2, number] => {
      const u = g.units.find((x) => x.id === g.kps.find((k) => k.id === kp)!.unitId)!
      return [u.semester as 1 | 2, u.numbered === false ? 0 : u.order]
    }

    it('单独考的单词只有书后单词表的黑体词：Part A / B 是本单元的，Revision 是学过的；每个单元的黑体词都考到；白体词、拼读词不单独考意思', () => {
      // 白体词：在别处是黑体词的不算（五下的白体词 excited 是五上的黑体词）
      const anyBold = new Set([...Object.values(g.bold[1]).flat(), ...Object.values(g.bold[2]).flat()])
      const white = new Set(Object.values(g.white).flatMap((b) => Object.values(b).flat()).filter((w) => !anyBold.has(w)))
      for (const spec of g.specs) {
        const [sem, unit] = unitOf(spec.kp)
        const kind = kindOf(spec.kp)
        const words = unitWords(spec).map((w) => w.en)
        const whiteOk = !!g.whiteTestable?.[sem]
        const bold = new Set([...(g.bold[sem][unit] ?? []), ...(whiteOk ? (g.white[sem][unit] ?? []) : [])])
        if (!whiteOk) for (const w of words) if (!bold.has(w)) expect(white.has(w), `${spec.kp} 的 ${w} 是白体词`).toBe(false)
        if (kind === 'letters' || kind === 'spell') {
          expect(words, spec.kp).toEqual([])
          continue
        }
        const allowed = isReview(kind) ? g.revisionWords : bold
        for (const w of words) expect(allowed.has(w), `${spec.kp} 的 ${w} 不是本单元的黑体词`).toBe(true)
      }
      // 每个单元的黑体词都考到（带「...」的词组「have ... class」只在句子里出现）
      for (const u of g.units.filter((x) => x.numbered !== false)) {
        const unitKps = g.kps.filter((k) => k.unitId === u.id && !isReview(kindOf(k.id)))
        const taught = new Set(unitKps.flatMap((k) => unitWords(specOf(k.id)).map((w) => w.en)))
        for (const w of g.bold[u.semester as 1 | 2][u.order] ?? []) if (!w.includes('...')) expect(taught.has(w), `${u.id} 没考黑体词 ${w}`).toBe(true)
      }
      // 拼读词不进全年级的词池（不然会被当成别的题的干扰项、显示出意思）——除非它本来就是黑体词
      const reads = new Set(g.specs.flatMap((s) => unitReads(s).map((r) => r.en)))
      const bold = new Set([...Object.values(g.bold[1]).flat(), ...Object.values(g.bold[2]).flat(), ...g.revisionWords])
      for (const w of g.pool) if (reads.has(w.en)) expect(bold.has(w.en), w.en).toBe(true)
      expect(parseRead('cab 🚕')).toEqual({ en: 'cab', icon: '🚕' })
    })

    it('每道题都考到英语：题干里有英文、要听英文，或者选项是英文（只数数、只读中文的题不出）', () => {
      for (const q of all) {
        const english = q.stem.some((p) => p.kind === 'english' || (p.kind === 'listen' && p.lang === 'en')) || !!q.choices?.some((c) => c.lang === 'en')
        expect(english, q.id).toBe(true)
      }
    })

    it('听音的题，选项里没有读音一样的词（sea / see、right / write）', () => {
      const word = (c: NonNullable<Question['choices']>[number]): string => c.say ?? zh(c.label)
      for (const q of all.filter((x) => part(x, 'listen') && ['listen', 'listenpic', 'decode', 'spell'].includes(maker(x)))) {
        const right = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!
        for (const c of q.choices!) if (c !== right) expect(soundsSame(word(c), word(right)), `${q.id}：${word(c)} / ${word(right)}`).toBe(false)
      }
      expect(soundsSame('see', 'sea')).toBe(true)
      expect(soundsSame('write', 'right')).toBe(true)
    })

    it('听句子选句子：选项里没有一句包含另一句的（听到长的，短的也像对的）', () => {
      for (const q of all.filter((x) => maker(x) === 'listensent')) {
        const right = label(q)
        for (const c of q.choices!) if (zh(c.label) !== right) expect(sentenceOverlap(zh(c.label), right), `${q.id}：${zh(c.label)}`).toBe(false)
      }
      expect(sentenceOverlap("Let's clear the table.", "Let's clear the table. Can you please pass me the bowl?")).toBe(true)
      expect(sentenceOverlap('Yes. Farm animals give us many things.', 'Farm animals give us many things.')).toBe(true)
      expect(sentenceOverlap('I like cats.', 'I like cake.')).toBe(false)
    })

    it('补全字母只出听着就能定的：一个音节、不以元音开头，缺的元音不挨着别的元音 / y / w、后面不是 r（多音节词里不重读的元音、er / ir / ur 换哪个都像）', () => {
      for (const q of all.filter((x) => maker(x) === 'spelling')) {
        const word = part(q, 'listen')!.say
        const at = part(q, 'english')!.text.indexOf('_')
        expect(syllables(word), q.id).toBe(1)
        expect(word, q.id).not.toMatch(/^[aeiou]/)
        if ('aeiou'.includes(label(q))) {
          expect(word[at - 1], q.id).not.toMatch(/[aeiou]/)
          expect(word[at + 1] ?? '', q.id).not.toMatch(/[aeiouywr]/)
        }
      }
      expect([syllables('cake'), syllables('apple'), syllables('sunny'), syllables('chair'), syllables('my'), syllables('yes')]).toEqual([1, 2, 2, 1, 1, 1])
    })

    it('补全字母 / 字母组合：换上干扰项拼出的词和原词读音不一样（son 的 o 不配 u）', () => {
      for (const q of all.filter((x) => ['spelling', 'digraph'].includes(maker(x)))) {
        const word = part(q, 'listen')!.say
        const e = part(q, 'english')!
        const right = label(q)
        const at = maker(q) === 'spelling' ? e.text.indexOf('_') : e.blank![0]
        const len = maker(q) === 'spelling' ? 1 : e.blank![1]
        for (const c of q.choices!) {
          const x = zh(c.label)
          if (x === right) continue
          expect(soundsSame(word.slice(0, at) + x + word.slice(at + len), word), `${q.id}：${x}`).toBe(false)
          expect(rudeWord(word.slice(0, at) + x + word.slice(at + len)), `${q.id}：${x}`).toBe(false)
        }
      }
      expect([rudeWord('rape'), rudeWord('sucks'), rudeWord('socks')]).toEqual([true, true, false])
    })

    it('选意思、中文选单词、看图的题，选项里没有意思一样、一个包含另一个、图上分不清的词（father / 爸爸、panda / bear、👀 / eye）', () => {
      const enOf = new Map<string, string[]>()
      for (const spec of g.specs) for (const w of unitWords(spec)) enOf.set(w.zh, [...(enOf.get(w.zh) ?? []), w.en])
      const icons = new Set(g.specs.flatMap((spec) => unitWords(spec).map((w) => w.icon)).filter(Boolean))
      const iconOf = new Map(g.specs.flatMap((spec) => unitWords(spec).filter((w) => w.icon).map((w) => [w.en, w.icon] as const)))
      for (const q of all) {
        const m = maker(q)
        if (!['meaning', 'zh2en', 'pic', 'wordpic', 'listenpic'].includes(m)) continue
        const right = q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!
        const rightEn = m === 'meaning' ? part(q, 'english')!.text : (right.say ?? zh(right.label))
        for (const c of q.choices!) {
          if (c === right) continue
          const others = m === 'meaning' ? (enOf.get(zh(c.label)) ?? []) : [c.say ?? zh(c.label)]
          for (const o of others) expect(meaningClash(o, rightEn), `${q.id}：${o} / ${rightEn}`).toBe(false)
          if (m === 'pic') expect(iconOf.get(zh(c.label)), `${q.id}：看图题的干扰项 ${zh(c.label)} 要是画得出来的东西`).toBeTruthy()
          if (m === 'wordpic' || m === 'listenpic') expect(icons.has(zh(c.label)), q.id).toBe(true)
        }
      }
      expect(meaningClash('father', 'dad')).toBe(true)
      expect(meaningClash('panda', 'bear')).toBe(true)
      expect(meaningClash('apple', 'banana')).toBe(false)
      expect(meaningClash('jump', 'jumping')).toBe(true)
      expect(meaningClash('turn', 'take turns')).toBe(true)
      expect(meaningClash('eating', 'eat breakfast')).toBe(true)
      expect(meaningClash('doing morning exercises', 'do morning exercises')).toBe(true)
      expect(meaningClash('eat breakfast', 'eat dinner')).toBe(false)
      expect(meaningClash('first', 'twenty-first')).toBe(false)
    })

    it('全年级一个图只给一个词（看图题不会有两个都对）；同一个图的两个词只能是不会同时做选项的（girl / sister 👧）', () => {
      const owner = new Map<string, string>()
      for (const spec of g.specs) {
        for (const w of unitWords(spec)) {
          if (!w.icon) continue
          const o = owner.get(w.icon)
          expect(o === undefined || meaningClash(o, w.en), `${spec.kp}：${w.icon} 是 ${o} 也是 ${w.en}`).toBe(true)
          owner.set(w.icon, w.en)
        }
      }
    })
  })

  describe('各模板反推答案', () => {
    const all = [...SAMPLES.values()].flat()
    const by = (name: string): Question[] => all.filter((q) => maker(q) === name)
    const used = new Set([...g.items.values()].flatMap(({ mix }) => [1, 2, 3].flatMap((d) => mix[d as 1 | 2 | 3].map(([n]) => n))))

    it('用到的模板都出过题', () => {
      for (const name of used) expect(by(name).length, name).toBeGreaterThan(0)
    })

    it('听音选单词 / 看图选单词：答案就是材料里的那个词；看图题的图是那个词配的', () => {
      const words = new Map(g.specs.flatMap((s) => unitWords(s).map((w) => [`${s.kp}:${w.en}`, w] as const)))
      for (const q of by('listen')) expect(label(q)).toBe(part(q, 'listen')!.say)
      for (const q of by('pic')) {
        const w = words.get(`${q.kpId}:${label(q)}`)
        expect(w?.icon, q.id).toBe(part(q, 'picture')!.icon)
      }
    })

    it('单词选意思 / 中文选单词：按材料里的「英文 中文」对', () => {
      const zhOf = new Map(g.specs.flatMap((s) => unitWords(s).map((w) => [`${s.kp}:${w.en}`, w.zh] as const)))
      for (const q of by('meaning')) expect(label(q), q.id).toBe(zhOf.get(`${q.kpId}:${part(q, 'english')!.text}`))
      for (const q of by('zh2en')) {
        const prompt = q.stem[0] as { kind: 'text'; text: { k: string; p: { w: { k: string } } } }
        expect(zhOf.get(`${q.kpId}:${label(q)}`), q.id).toBe(prompt.text.p.w.k.replace(new RegExp(`^${g.prefix}\\.`), ''))
      }
    })

    it('字母：大写选小写 / 小写选大写 / 听音选字母 / 字母表顺序 / 首字母；补全字母、补全字母组合拼回原词', () => {
      for (const q of by('lower')) expect(label(q)).toBe(part(q, 'english')!.text.toLowerCase())
      for (const q of by('upper')) expect(label(q)).toBe(part(q, 'english')!.text.toUpperCase())
      for (const q of by('listenletter')) expect(label(q)).toBe(`${part(q, 'listen')!.say}${part(q, 'listen')!.say.toLowerCase()}`)
      for (const q of by('after')) {
        const e = part(q, 'english')!
        expect(e.say, q.id).toBe(e.text) // 字母用英文的声音读，不夹在中文要求里
        expect(label(q)).toBe(String.fromCharCode(e.text.charCodeAt(0) + 1))
      }
      for (const q of by('before')) {
        const e = part(q, 'english')!
        expect(label(q)).toBe(String.fromCharCode(e.text.charCodeAt(0) - 1))
      }
      for (const q of by('sound')) expect(part(q, 'listen')!.say.toLowerCase().startsWith(label(q))).toBe(true)
      for (const q of by('spelling')) {
        const shown = part(q, 'english')!.text
        expect(shown.replace('_', label(q))).toBe(part(q, 'listen')!.say)
      }
      for (const q of by('digraph')) {
        const e = part(q, 'english')!
        expect(e.say, q.id).toBe('') // 挖了空的词不读（读了等于报答案）
        expect(e.text, q.id).toBe(part(q, 'listen')!.say)
        expect(Array.from(e.text).slice(e.blank![0], e.blank![0] + e.blank![1]).join(''), q.id).toBe(label(q))
        expect(LETTER_GROUPS, q.id).toContain(label(q))
        for (const c of q.choices!) expect(LETTER_GROUPS, q.id).toContain(zh(c.label))
      }
    })

    it('拼读：听音选的词就是读的词（拼读课、字母课的拼读词都是听音选词，不考意思）', () => {
      for (const q of [...by('spell'), ...by('decode')]) expect(label(q)).toBe(part(q, 'listen')!.say)
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

    it('数字：数一数选英文数词（不是数完按数字——那考不到英语）、数词对应的数', () => {
      for (const q of by('count')) {
        const o = part(q, 'objects')!
        expect(q.input).toBe('choice')
        expect(NUM_WORDS[label(q)], q.id).toBe(o.count)
        for (const c of q.choices!) expect(NUM_WORDS[zh(c.label)], q.id).toBeDefined()
      }
      for (const q of by('numword')) expect((q.answer as { value: number }).value).toBe(NUM_WORDS[part(q, 'english')!.text])
      for (const q of by('num2word')) {
        const n = (q.stem[0] as { kind: 'text'; text: { k: string; p: { n: number } } }).text.p.n
        expect(NUM_WORDS[label(q)]).toBe(n)
      }
    })
  })

  return SAMPLES
}

/** 带调的音节（轻声不标调）；儿化的「儿」标 r */
const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/
const hans = (text: string): string[] => [...text].filter(isHan)

/** 拼音与汉字逐个对齐：音节数 = 汉字数，每个音节像拼音；对不上返回问题描述 */
function misaligned(text: string, py: string | undefined): string | null {
  if (py === undefined) return `「${text}」缺拼音`
  const syllables = py.split(/\s+/)
  const cs = hans(text)
  if (syllables.length !== cs.length) return `「${text}」拼音音节数 ${syllables.length} ≠ 汉字数 ${cs.length}`
  for (const [i, s] of syllables.entries()) {
    if (s === 'r' ? cs[i] !== '儿' : !SYLLABLE.test(s)) return `「${text}」的音节「${s}」不对`
  }
  return null
}

/** 一个年级的拼音测试：知识点标题、题目要求、单词意思与中文问答的拼音表 */
export function pinyinSuite(g: { grade: number; specs: UnitSpec[]; py: Readonly<Record<string, string>>; titlePinyin: Record<string, string>; wordOf: (text: string) => LStr; minTexts: number }): void {
  describe('知识点标题与题目要求的拼音', () => {
    it('每个知识点标题都有拼音，且与汉字逐个对齐（Unit、A、B 这些英文不占位）', () => {
      const keys = dictKeys('zh').filter((k) => k.startsWith(`kp.e${g.grade}s`))
      expect(keys).toHaveLength(g.specs.length)
      expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
      for (const k of Object.keys(g.titlePinyin)) expect(keys, k).toContain(k)
    })

    it('题目要求（eq.*）都有拼音且对齐，中英文都有', () => {
      const keys = dictKeys('zh').filter((k) => k.startsWith('eq.'))
      expect(keys.length).toBeGreaterThan(15)
      expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
      for (const k of keys) expect(translate({ k }, 'en'), k).not.toBe(k)
      expect(Object.keys(PINYIN).sort()).toEqual(keys.sort())
    })
  })

  /** 每个知识点要查拼音表的中文 */
  const NEEDED = new Set(g.specs.flatMap((spec) => unitTexts(spec)))

  describe('单词意思与中文问答的拼音表（py.ts）', () => {
    it('每个知识点要用到的中文都在表里，且与汉字逐个对齐', () => {
      expect(NEEDED.size).toBeGreaterThan(g.minTexts)
      expect([...NEEDED].map((t) => misaligned(t, g.py[t])).filter(Boolean)).toEqual([])
    })

    it('表里没有用不到的条目（材料删了拼音也要删）', () => {
      expect(Object.keys(g.py).filter((k) => !NEEDED.has(k))).toEqual([])
    })

    it('要注音的中文逐字注音；英文的选项是纯字符串、不注音', () => {
      const word = [...NEEDED].find((t) => hans(t).length === 2 && g.py[t])!
      const segs = rubySegments(g.wordOf(word), 'zh')
      expect(segs.map((s) => s.py)).toEqual(g.py[word]!.split(' '))
      expect(rubySegments('apple', 'zh')).toEqual([{ text: 'apple' }])
    })
  })
}
