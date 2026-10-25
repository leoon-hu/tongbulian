// 四年级英语的出题测试：共用的部分（目录与材料、150 种子 × 三档、黑体词与「两个都对」、各模板反推答案）在 shared/__tests__/suite.ts
import { describe, expect, it } from 'vitest'
import '@/content/english/grade4'
import { generatorSuite } from '@/content/english/shared/__tests__/suite'
import { unitWords } from '@/content/english/shared/makers'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { UNIT_ITEMS, UNIT_SPECS, WORD_POOL } from '../generators'
import { BOLD, PART_B, WHITE } from './wordlist'
import { BOLD as G3_BOLD } from '@/content/english/grade3/__tests__/wordlist'

const flat = (b: typeof BOLD): string[] => [...Object.values(b[1]).flat(), ...Object.values(b[2]).flat()]
const specOf = (kp: string) => UNIT_SPECS.find((u) => u.kp === kp)!

generatorSuite({
  grade: 4,
  prefix: 'ew4',
  units: UNITS,
  kps: KNOWLEDGE_POINTS,
  specs: UNIT_SPECS,
  items: UNIT_ITEMS,
  pool: WORD_POOL,
  bold: BOLD,
  white: WHITE,
  middle: () => 'spell',
  // Revision 复习本册学过的，三年级的黑体词也算学过
  revisionWords: new Set([...flat(BOLD), ...flat(G3_BOLD)]),
  // 四下 Unit 6 的 ear 组：bear / wear / pear 字母一样、读 /eə/（课本 Read, listen and circle 的对比）
  otherSound: { ear: ['bear', 'pear', 'wear'] },
  minPool: 90,
})

describe('四年级的专项', () => {
  it('Part A 只用词表里 Part A 页码上的黑体词，Part B 只用 Part B 的（按词表页码分）', () => {
    for (const sem of [1, 2] as const) {
      for (const [unit, bold] of Object.entries(BOLD[sem])) {
        const p = `e4s${sem}-${unit.padStart(2, '0')}`
        const b = PART_B[sem][Number(unit)]!
        for (const w of unitWords(specOf(`${p}-a`))) expect(bold.includes(w.en) && !b.includes(w.en), `${p}-a 的 ${w.en}`).toBe(true)
        for (const w of unitWords(specOf(`${p}-b`))) expect(b.includes(w.en), `${p}-b 的 ${w.en}`).toBe(true)
      }
    }
  })

  it('补全字母组合只在四上出：拼读课都有（ch sh ck ph th wh），Revision 复习这几个也可以；四下的 ar / er / or / ir / ur / air / ear 不出——er、ir、ur 读音一样', () => {
    for (const [kp, { mix }] of UNIT_ITEMS) {
      const used = ([1, 2, 3] as const).some((d) => mix[d].some(([n]) => n === 'digraph'))
      if (kp.startsWith('e4s2-')) expect(used, kp).toBe(false)
      else if (kp.endsWith('-spell')) expect(used, kp).toBe(true)
      else if (!kp.endsWith('-revision')) expect(used, kp).toBe(false)
    }
  })

  it('cook 在上册 Unit 1 是「做饭」（家务），Unit 4 是「厨师」', () => {
    expect(unitWords(specOf('e4s1-01-b')).find((w) => w.en === 'cook')?.zh).toBe('做饭')
    expect(unitWords(specOf('e4s1-04-a')).find((w) => w.en === 'cook')?.zh).toBe('厨师')
  })
})
