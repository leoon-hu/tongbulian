// 六年级英语的出题测试：共用的部分（目录与材料、150 种子 × 三档、黑体词与「两个都对」、各模板反推答案）在 shared/__tests__/suite.ts
import { describe, expect, it } from 'vitest'
import '@/content/english/grade6'
import { generatorSuite } from '@/content/english/shared/__tests__/suite'
import { parseForm, unitWords } from '@/content/english/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { UNIT_ITEMS, UNIT_SPECS, WORD_POOL } from '../generators'
import { BOLD, PART_B, WHITE } from './wordlist'
import { BOLD as G3_BOLD } from '@/content/english/grade3/__tests__/wordlist'
import { BOLD as G4_BOLD } from '@/content/english/grade4/__tests__/wordlist'
import { BOLD as G5_BOLD, WHITE as G5_WHITE } from '@/content/english/grade5/__tests__/wordlist'

const flat = (b: typeof BOLD): string[] => [...Object.values(b[1]).flat(), ...Object.values(b[2]).flat()]
const specOf = (kp: string) => UNIT_SPECS.find((u) => u.kp === kp)!

generatorSuite({
  grade: 6,
  prefix: 'ew6',
  units: UNITS,
  kps: KNOWLEDGE_POINTS,
  specs: UNIT_SPECS,
  items: UNIT_ITEMS,
  pool: WORD_POOL,
  bold: BOLD,
  white: WHITE,
  // 六年级的两本书都没有 Let's spell：每个单元只有 Part A、Part B
  middle: () => null,
  // 复习单元复习学过的：六年级两册的黑体词、六下的白体词（旧版要求认读）、三至五年级的黑体词、五下的白体词
  revisionWords: new Set([...flat(BOLD), ...Object.values(WHITE[2]).flat(), ...flat(G3_BOLD), ...flat(G4_BOLD), ...flat(G5_BOLD), ...Object.values(G5_WHITE[2]).flat()]),
  // 六上 6 个单元 × 2 + Revision；旧版六下 4 个单元 × 2 + Recycle
  layout: { 1: { units: 7, kps: 13 }, 2: { units: 5, kps: 9, numbered: 4 } },
  // 旧版六下的白体词「听、说、认读」：也能单独考听音、看图、选意思
  whiteTestable: { 2: true },
  minPool: 100,
})

describe('六年级的专项', () => {
  it('Part A 只用词表里 Part A 页码上的词，Part B 只用 Part B 的（六上只有黑体词，六下黑体词和白体词）', () => {
    for (const u of UNITS.filter((x) => x.numbered !== false)) {
      const sem = u.semester as 1 | 2
      const [a, b] = KNOWLEDGE_POINTS.filter((k) => k.unitId === u.id)
      const all = [...(BOLD[sem][u.order] ?? []), ...(sem === 2 ? (WHITE[2][u.order] ?? []) : [])]
      const partB = PART_B[sem][u.order]!
      for (const w of unitWords(specOf(a!.id))) expect(all.includes(w.en) && !partB.includes(w.en), `${a!.id} 的 ${w.en}`).toBe(true)
      for (const w of unitWords(specOf(b!.id))) expect(partB.includes(w.en), `${b!.id} 的 ${w.en}`).toBe(true)
    }
  })

  it('过去式、比较级：六上课本里黑体的过去式都出了「看原形选过去式」；旧版六下 Unit 1 出比较级、Unit 2–3 出过去式；不出补全一个字母、补全字母组合', () => {
    const forms = new Set(UNIT_SPECS.flatMap((s) => (s.past ?? []).map(parseForm).map((f) => f.form)))
    for (const w of ['was', 'went', 'saw', 'ate', 'took', 'ran', 'made', 'sang', 'wore']) expect(forms.has(w), w).toBe(true)
    expect(specOf('e6s2-01-a').comparative?.length).toBeGreaterThan(0)
    expect(specOf('e6s2-01-b').comparative?.length).toBeGreaterThan(0)
    for (const kp of ['e6s2-02-a', 'e6s2-02-b', 'e6s2-03-a', 'e6s2-03-b']) expect(specOf(kp).past?.length, kp).toBeGreaterThan(0)
    for (const [kp, { mix }] of UNIT_ITEMS) {
      const uses = (name: string): boolean => ([1, 2, 3] as const).some((d) => mix[d].some(([n]) => n === name))
      expect(uses('digraph'), kp).toBe(false)
      if (kp.startsWith('e6s2-')) expect(uses('spelling'), kp).toBe(false)
    }
  })

  it('六下只有 4 个单元，Recycle 在最后；标题照课本写 Unit 1–4、「Recycle 复习」', () => {
    expect(UNITS.filter((u) => u.semester === 2).map((u) => u.title)).toEqual(['How tall are you?', 'Last weekend', 'Where did you go?', 'Then and now', "Recycle: Mike's happy days"])
    expect(KNOWLEDGE_POINTS.find((k) => k.id === 'e6s2-04-b')!.title).toBe('Unit 4 B 对话和单词')
    expect(KNOWLEDGE_POINTS.find((k) => k.id === 'e6s2-05-recycle')!.title).toBe('Recycle 复习')
  })
})
