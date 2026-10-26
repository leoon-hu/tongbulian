import { describe, expect, it } from 'vitest'
import '@/content/morality/grade1'
import type { LStr, Question } from '@/types/models'
import { buildSession, createRng, getGenerator } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { PAUSE, answerSpeech, questionSpeech } from '@/engine/speech'
import { hanPart, optLabel, parseAsk, parseCloze } from '@/content/morality/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

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
const SAMPLES = new Map(KNOWLEDGE_POINTS.map((kp) => [kp.id, sample(kp.id)]))
const SPEC = new Map(LESSONS.map((l) => [l.kp, l]))

describe('目录与材料（需求 R4q）', () => {
  it('两册各 4 个单元、16 课，一课一个知识点；每个知识点一份材料、一个生成器', () => {
    for (const sem of [1, 2]) {
      expect(UNITS.filter((u) => u.semester === sem)).toHaveLength(4)
      expect(KNOWLEDGE_POINTS.filter((kp) => kp.id.startsWith(`d1s${sem}-`))).toHaveLength(16)
    }
    expect(new Set(KNOWLEDGE_POINTS.map((kp) => kp.id)).size).toBe(32)
    expect(LESSONS.map((l) => l.kp)).toEqual(KNOWLEDGE_POINTS.map((kp) => kp.id))
    for (const kp of KNOWLEDGE_POINTS) {
      expect(getGenerator(kp.id), kp.id).toBeDefined()
      expect(UNITS.find((u) => u.id === kp.unitId), kp.id).toBeDefined()
      // 课号照课本全册连着编，每单元 4 课
      const n = Number(kp.id.slice(5, 7))
      expect(kp.unitId, kp.id).toBe(`${kp.id.slice(0, 4)}u${Math.ceil(n / 4)}`)
    }
  })

  it('材料的格式与长度（D2）：做法 ≤ 12 字不带句末标点，问题以问号结尾，选项 ≤ 8 字、要么都带图要么都不带', () => {
    const bad: string[] = []
    for (const spec of LESSONS) {
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
    for (const kp of KNOWLEDGE_POINTS) {
      const { items: byName, mix } = items.get(kp.id)!
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
          let at = 0
          for (const c of q.choices!) {
            const s = (c.say ?? zh(c.label)).replace(/[，。、！？\s]/g, '')
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
    for (const kp of KNOWLEDGE_POINTS) {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = buildSession(kp.id, 8, { seed })
        expect(new Set(qs.map((q) => q.id)).size, kp.id).toBe(8)
      }
    }
  })
})
