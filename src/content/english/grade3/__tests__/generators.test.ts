// 三年级英语的出题测试：共用的部分（目录与材料、150 种子 × 三档、黑体词与「两个都对」、各模板反推答案）在 shared/__tests__/suite.ts
import { describe, expect, it } from 'vitest'
import '@/content/english/grade3'
import { generatorSuite } from '@/content/english/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { UNIT_ITEMS, UNIT_SPECS, WORD_POOL } from '../generators'
import { BOLD, WHITE } from './wordlist'

generatorSuite({
  grade: 3,
  prefix: 'ew3',
  units: UNITS,
  kps: KNOWLEDGE_POINTS,
  specs: UNIT_SPECS,
  items: UNIT_ITEMS,
  pool: WORD_POOL,
  bold: BOLD,
  white: WHITE,
  middle: (sem) => (sem === 1 ? 'letters' : 'spell'),
  revisionWords: new Set([...Object.values(BOLD[1]).flat(), ...Object.values(BOLD[2]).flat()]),
  minPool: 100,
})

describe('三年级的专项', () => {
  it('动词不配身体部位的图（👀 会被看成 eye、🖐️ 会被看成 hand）', () => {
    for (const w of ['see', 'hear', 'smell', 'taste', 'touch']) expect(WORD_POOL.find((x) => x.en === w)?.icon, w).toBeUndefined()
  })
})
