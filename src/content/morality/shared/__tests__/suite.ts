// 道德与法治各年级共用的测试（需求 §12 D1–D8）：每个年级的 generators.test.ts / pinyin.test.ts 把自己的目录、材料、拼音表传进来。
// 不是测试文件本身（vitest 只跑 *.test.ts），由各年级的测试文件调用；调用前测试文件先导入这个年级的内容包（注册生成器与词条）。
import { describe, expect, it } from 'vitest'
import type { KnowledgePoint, LStr, Question, Unit } from '@/types/models'
import { buildSession, createRng, getGenerator } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { dictKeys, isHan, pinyinOf, translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, chineseSpeech, phraseSpeech, questionSpeech } from '@/engine/speech'
import { hanPart, lessonTexts, optLabel, parseAsk, parseCloze } from '@/content/morality/shared/makers'
import type { MoralityPack } from '@/content/morality/shared/pack'
import type { LessonSpec } from '@/content/morality/shared/spec'

export interface MoralityGrade {
  /** 年级（知识点 id 的 d<年级>s…） */
  grade: number
  /** 目录的需求条目（一年级 R4q） */
  req: string
  units: Unit[]
  kps: KnowledgePoint[]
  lessons: LessonSpec[]
  items: MoralityPack['items']
  /** 每册各单元的课数（默认每册 4 个单元 × 4 课；三年级起照课本，2–4 课不等） */
  unitSizes?: Record<1 | 2, number[]>
}

const zh = (l: LStr): string => translate(l, 'zh')
const maker = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const label = (q: Question): string => zh(answerLabel(q))
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const shownOf = (s: string): string => optLabel(s).shown
const han = (s: string): number => (s.match(/\p{Script=Han}/gu) ?? []).length
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u
const SEEDS = 150

function sample(kp: string): Question[] {
  const gen = getGenerator(kp)!
  const out: Question[] = []
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) out.push(gen(d, createRng(seed)))
  return out
}

export function generatorSuite(g: MoralityGrade): void {
  const SAMPLES = new Map(g.kps.map((kp) => [kp.id, sample(kp.id)]))
  const SPEC = new Map(g.lessons.map((l) => [l.kp, l]))

  describe(`目录与材料（需求 ${g.req}）`, () => {
    it('两册各 4 个单元、每单元的课数照课本，一课一个知识点；每个知识点一份材料、一个生成器', () => {
      const sizes = (sem: 1 | 2): number[] => g.unitSizes?.[sem] ?? [4, 4, 4, 4]
      const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0)
      for (const sem of [1, 2] as const) {
        expect(g.units.filter((u) => u.semester === sem)).toHaveLength(sizes(sem).length)
        expect(g.kps.filter((kp) => kp.id.startsWith(`d${g.grade}s${sem}-`))).toHaveLength(sum(sizes(sem)))
      }
      expect(new Set(g.kps.map((kp) => kp.id)).size).toBe(sum(sizes(1)) + sum(sizes(2)))
      expect(g.lessons.map((l) => l.kp)).toEqual(g.kps.map((kp) => kp.id))
      for (const kp of g.kps) {
        expect(getGenerator(kp.id), kp.id).toBeDefined()
        expect(g.units.find((u) => u.id === kp.unitId), kp.id).toBeDefined()
        // 课号照课本全册连着编：第 n 课落在第几个单元按各单元的课数数出来
        const n = Number(kp.id.slice(5, 7))
        let unit = 0
        for (let seen = 0; seen < n; unit++) seen += sizes(Number(kp.id[3]) as 1 | 2)[unit]!
        expect(kp.unitId, kp.id).toBe(`${kp.id.slice(0, 4)}u${unit}`)
      }
    })

    it('材料的格式与长度（D2）：做法 ≤ 12 字不带句末标点，问题以问号结尾，选项 ≤ 8 字、要么都带图要么都不带', () => {
      const bad: string[] = []
      for (const spec of g.lessons) {
        const good = spec.good ?? []
        const wrong = spec.bad ?? []
        if (good.length < 4 || wrong.length < 3) bad.push(`${spec.kp}：做法太少`)
        if ((spec.ask ?? []).length < 3) bad.push(`${spec.kp}：问答太少`)
        for (const s of [...good, ...wrong]) {
          if (han(s) > 12 || /[。？！]$/.test(s) || EMOJI.test(s)) bad.push(`${spec.kp}：${s}`)
        }
        if (new Set([...good, ...wrong]).size !== good.length + wrong.length) bad.push(`${spec.kp}：做法重复`)
        for (const s of spec.ask ?? []) {
          const it = parseAsk(s)
          const opts = [it.answer, ...it.wrongs]
          if (!it.q.endsWith('？') || han(it.q) > 20 || it.wrongs.length > 3) bad.push(`${spec.kp}：${s}`)
          if (opts.some((o) => han(hanPart(o)) > 8 || !han(hanPart(o)))) bad.push(`${spec.kp}：${s}`)
          const pics = opts.filter((o) => EMOJI.test(o)).length
          if (pics && pics !== opts.length) bad.push(`${spec.kp}：选项有的带图有的不带：${s}`)
          if (new Set(opts.map(hanPart)).size !== opts.length) bad.push(`${spec.kp}：选项重复：${s}`)
        }
        for (const s of spec.cloze ?? []) {
          const it = parseCloze(s)
          if (it.wrongs.length > 3 || it.wrongs.some((w) => Array.from(w).length !== Array.from(it.answer).length)) bad.push(`${spec.kp}：${s}`)
        }
      }
      expect(bad).toEqual([])
    })

    it('第 1 档是练习的主体：判断、问答、儿歌填空，每课 ≥ 12 道不同的题；哪种做法对 / 不对从第 2 档起（D6）', () => {
      for (const kp of g.kps) {
        const { items: byName, mix } = g.items.get(kp.id)!
        expect(mix[1].reduce((s, [name]) => s + (byName[name]?.length ?? 0), 0), kp.id).toBeGreaterThanOrEqual(12)
        expect(mix[1].some(([name]) => name === 'good' || name === 'bad'), kp.id).toBe(false)
        for (const d of [1, 2, 3] as const) for (const [name] of mix[d]) expect(byName[name]?.length, `${kp.id} ${d} ${name}`).toBeGreaterThan(0)
        const first = new Set(SAMPLES.get(kp.id)!.filter((q) => q.difficulty === 1).map((q) => q.id))
        expect(first.size, kp.id).toBeGreaterThanOrEqual(12)
      }
    })
  })

  describe('出题（150 种子 × 三档）', () => {
    it('每道都是选择题，选项 2–4 个、不重复，正确答案在选项里', () => {
      for (const [kp, qs] of SAMPLES) {
        for (const q of qs) {
          expect(q.input, kp).toBe('choice')
          const ls = labels(q)
          expect(ls.length, q.id).toBeGreaterThanOrEqual(2)
          expect(ls.length, q.id).toBeLessThanOrEqual(4)
          expect(new Set(ls).size, q.id).toBe(ls.length)
          expect(q.choices!.some((c) => q.answer.kind === 'choice' && c.id === q.answer.choiceId), q.id).toBe(true)
        }
      }
    })

    it('判断题：做法在「对」里答对、在「不对」里答不对（D3）', () => {
      for (const [kp, qs] of SAMPLES) {
        const spec = SPEC.get(kp)!
        for (const q of qs.filter((q) => maker(q) === 'judge')) {
          const said = zh((q.stem[0] as { text: LStr }).text)
          expect(labels(q), q.id).toEqual(['✅ 对', '❌ 不对'])
          expect(label(q), q.id).toBe(spec.good?.includes(said) ? '✅ 对' : '❌ 不对')
          expect([...(spec.good ?? []), ...(spec.bad ?? [])]).toContain(said)
        }
      }
    })

    it('哪种做法对：正确项是对的做法、另外两个都不对；哪种做法不对反过来（D3）', () => {
      for (const [kp, qs] of SAMPLES) {
        const spec = SPEC.get(kp)!
        const good = new Set(spec.good)
        const wrong = new Set(spec.bad)
        for (const q of qs.filter((q) => maker(q) === 'good' || maker(q) === 'bad')) {
          const [right, other] = maker(q) === 'good' ? [good, wrong] : [wrong, good]
          expect(right.has(label(q)), q.id).toBe(true)
          expect(labels(q).filter((l) => l !== label(q)).every((l) => other.has(l)), q.id).toBe(true)
          expect(labels(q), q.id).toHaveLength(3)
        }
      }
    })

    it('问答与儿歌填空的答案与材料一致', () => {
      for (const [kp, qs] of SAMPLES) {
        const spec = SPEC.get(kp)!
        const asks = new Map((spec.ask ?? []).map(parseAsk).map((it) => [it.q, it]))
        for (const q of qs.filter((q) => maker(q) === 'ask')) {
          const it = asks.get(zh((q.stem[0] as { text: LStr }).text))!
          expect(it, q.id).toBeDefined()
          expect(label(q), q.id).toBe(shownOf(it.answer))
          expect(labels(q).every((l) => [it.answer, ...it.wrongs].map(shownOf).includes(l)), q.id).toBe(true)
        }
        const clozes = (spec.cloze ?? []).map(parseCloze)
        for (const q of qs.filter((q) => maker(q) === 'cloze')) {
          const verse = q.stem.find((p) => p.kind === 'verse') as { text: string; blank: [number, number] }
          const it = clozes.find((c) => c.text === verse.text && c.blank[0] === verse.blank[0])!
          expect(it, q.id).toBeDefined()
          expect(label(q), q.id).toBe(it.answer)
        }
      }
    })

    it('朗读（D4）：判断题不读「对 / 不对」，别的题把选项按屏幕上的顺序读一遍；答错读正确答案', () => {
      for (const qs of SAMPLES.values()) {
        for (const q of qs) {
          const said = questionSpeech(q, 'zh').filter((t) => t !== PAUSE).join('')
          if (maker(q) === 'judge') {
            expect(q.readChoices, q.id).toBeUndefined()
            expect(said.endsWith('这样做对吗？') || said.endsWith('这样做对吗'), q.id).toBe(true)
          } else {
            expect(q.readChoices, q.id).toBe(true)
            // 每个选项读的是它自己的那几个片段（年份读成「一九四九年」，带图的读 say），按屏幕上的顺序出现
            let at = 0
            for (const c of q.choices!) {
              const s = (c.say !== undefined ? chineseSpeech(c.say, 'zh') : phraseSpeech(c.label, 'zh')).filter((t) => t !== PAUSE).join('').replace(/[，。、！？\s]/g, '')
              const i = said.replace(/[，。、！？\s]/g, '').indexOf(s, at)
              expect(i, `${q.id} 没读到「${s}」`).toBeGreaterThanOrEqual(0)
              at = i + s.length
            }
          }
          expect(answerSpeech(q, 'zh').join(''), q.id).toContain('正确答案是')
        }
      }
    })

    it('带图的选项读去掉图的文字', () => {
      const withPic = [...SAMPLES.values()].flat().filter((q) => q.choices!.some((c) => EMOJI.test(zh(c.label))))
      for (const q of withPic) for (const c of q.choices!) expect(c.say, q.id).toBe(hanPart(zh(c.label)))
    })

    it('一轮 8 题不重复', () => {
      for (const kp of g.kps) {
        for (let seed = 1; seed <= 20; seed++) {
          const qs = buildSession(kp.id, 8, { seed })
          expect(new Set(qs.map((q) => q.id)).size, kp.id).toBe(8)
        }
      }
    })
  })
}

/** 带调的音节（轻声不标调）；儿化的「儿」标 r（小点儿声 xiǎo diǎn r shēng） */
const SYLLABLE = /^[a-zü]*[āáǎàaēéěèeīíǐìiōóǒòoūúǔùuǖǘǚǜü][a-zü]*$/

const hans = (text: string): string[] => [...text].filter(isHan)

/** 拼音与汉字逐个对齐：音节数 = 汉字数，每个音节像拼音，r 只配「儿」；对不上返回问题描述 */
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

export function pinyinSuite(g: {
  /** 「一年级」 */
  name: string
  units: Unit[]
  kps: KnowledgePoint[]
  lessons: LessonSpec[]
  py: Readonly<Record<string, string>>
  titlePinyin: Record<string, string>
  /** 全年级要注音的中文至少多少条 */
  minTexts: number
}): void {
  describe(`${g.name}道德与法治：题目要求与标题的拼音`, () => {
    it('题目要求（dq.*）都有拼音，且与汉字逐个对齐', () => {
      const keys = dictKeys('zh').filter((k) => k.startsWith('dq.'))
      expect(keys.length).toBeGreaterThanOrEqual(6)
      expect(keys.map((k) => misaligned(translate({ k }, 'zh'), pinyinOf(k))).filter(Boolean)).toEqual([])
    })

    it('知识点与单元标题都有拼音，且与汉字逐个对齐；没有多余的键', () => {
      const titles = [...g.kps.map((kp) => [`kp.${kp.id}`, kp.title]), ...g.units.map((u) => [`unit.${u.id}`, u.title])]
      expect(titles.map(([k, t]) => misaligned(t!, g.titlePinyin[k!])).filter(Boolean)).toEqual([])
      expect(Object.keys(g.titlePinyin).sort()).toEqual(titles.map(([k]) => k!).sort())
    })
  })

  describe(`${g.name}道德与法治：拼音表（py.ts）`, () => {
    const needed = new Set(g.lessons.flatMap((spec) => lessonTexts(spec)))

    it('每课要用到的中文都在表里，且与汉字逐个对齐', () => {
      expect(needed.size).toBeGreaterThan(g.minTexts)
      expect([...needed].map((t) => misaligned(t, g.py[t])).filter(Boolean)).toEqual([])
    })

    it('表里没有用不到的条目（材料删了拼音也要删）', () => {
      expect(Object.keys(g.py).filter((k) => !needed.has(k))).toEqual([])
    })

    it('一 / 不 标变调（看一看的「一」读轻声）', () => {
      const bad: string[] = []
      for (const [text, py] of Object.entries(g.py)) {
        const cs = hans(text)
        const ss = py.split(' ')
        cs.forEach((c, i) => {
          const next = ss[i + 1]
          // 「不」在四声前读 bú
          if (c === '不' && next && /[àèìòùǜ]/.test(next) && ss[i] !== 'bú') bad.push(`${text}：不 → bú`)
          // 「看一看」「等一等」里的「一」读轻声 yi（「一个一个」不算）；别处在四声前读 yí（作序数、单念的这里不出现）
          if (c === '一' && cs[i - 1] === cs[i + 1] && cs[i - 2] !== '一') {
            if (ss[i] !== 'yi') bad.push(`${text}：一 → yi`)
          } else if (c === '一' && next && /[àèìòùǜ]/.test(next) && ss[i] !== 'yí' && cs[i - 1] !== '第' && cs[i - 1] !== '十') bad.push(`${text}：一 → yí`)
        })
      }
      expect(bad).toEqual([])
    })
  })
}
