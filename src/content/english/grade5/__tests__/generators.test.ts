// 五年级英语的出题测试：共用的部分（目录与材料、150 种子 × 三档、黑体词与「两个都对」、各模板反推答案）在 shared/__tests__/suite.ts
import { describe, expect, it } from 'vitest'
import '@/content/english/grade5'
import { generatorSuite } from '@/content/english/shared/__tests__/suite'
import { unitWords } from '@/content/english/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { UNIT_ITEMS, UNIT_SPECS, WORD_POOL } from '../generators'
import { BOLD, PART_B, WHITE } from './wordlist'
import { BOLD as G3_BOLD } from '@/content/english/grade3/__tests__/wordlist'
import { BOLD as G4_BOLD } from '@/content/english/grade4/__tests__/wordlist'

const flat = (b: typeof BOLD): string[] => [...Object.values(b[1]).flat(), ...Object.values(b[2]).flat()]
const specOf = (kp: string) => UNIT_SPECS.find((u) => u.kp === kp)!

generatorSuite({
  grade: 5,
  prefix: 'ew5',
  units: UNITS,
  kps: KNOWLEDGE_POINTS,
  specs: UNIT_SPECS,
  items: UNIT_ITEMS,
  pool: WORD_POOL,
  bold: BOLD,
  white: WHITE,
  middle: () => 'spell',
  // 复习单元复习学过的：五年级两册的黑体词、五下的白体词（旧版要求认读）、三四年级的黑体词
  revisionWords: new Set([...flat(BOLD), ...Object.values(WHITE[2]).flat(), ...flat(G3_BOLD), ...flat(G4_BOLD)]),
  // 五下是旧版：6 个单元 + Recycle 1、Recycle 2
  layout: { 2: { units: 8, kps: 20 } },
  // 旧版五下的白体词「只作听、说、认读要求」：也能单独考听音、看图、选意思
  whiteTestable: { 2: true },
  minPool: 100,
})

describe('五年级的专项', () => {
  it('Part A 只用词表里 Part A 页码上的词，Part B 只用 Part B 的（五上只有黑体词，五下黑体词和白体词）', () => {
    for (const u of UNITS.filter((x) => x.numbered !== false)) {
      const sem = u.semester as 1 | 2
      const kps = KNOWLEDGE_POINTS.filter((k) => k.unitId === u.id)
      const all = [...(BOLD[sem][u.order] ?? []), ...(sem === 2 ? (WHITE[2][u.order] ?? []) : [])]
      const b = PART_B[sem][u.order]!
      for (const w of unitWords(specOf(kps[0]!.id))) expect(all.includes(w.en) && !b.includes(w.en), `${kps[0]!.id} 的 ${w.en}`).toBe(true)
      for (const w of unitWords(specOf(kps[2]!.id))) expect(b.includes(w.en), `${kps[2]!.id} 的 ${w.en}`).toBe(true)
    }
  })

  it('补全字母组合只在五下（旧版）的辅音组合拼读课出；五上的元音组合（ai / ay、ee / ea……读音一样）不出；五下不出补全一个字母', () => {
    for (const [kp, { mix }] of UNIT_ITEMS) {
      const uses = (name: string): boolean => ([1, 2, 3] as const).some((d) => mix[d].some(([n]) => n === name))
      if (kp.startsWith('e5s1-')) expect(uses('digraph'), kp).toBe(false)
      if (kp.startsWith('e5s2-') && kp.endsWith('-spell')) expect(uses('digraph'), kp).toBe(true)
      if (kp.startsWith('e5s2-')) expect(uses('spelling'), kp).toBe(false)
    }
  })

  it('五下的 Unit 4–6 在目录里排在 Recycle 1 后面（目录位置 05–07），标题照课本写 Unit 4–6', () => {
    expect(KNOWLEDGE_POINTS.find((k) => k.id === 'e5s2-05-a')!.title).toBe('Unit 4 A 对话和单词')
    expect(KNOWLEDGE_POINTS.find((k) => k.id === 'e5s2-04-recycle')!.title).toBe('Recycle 1 复习')
    expect(UNITS.filter((u) => u.semester === 2).map((u) => u.title)).toEqual(['My day', 'My favourite season', 'My school calendar', 'Recycle 1', 'When is the art show?', 'Whose dog is it?', 'Work quietly!', 'Recycle 2'])
  })
})
