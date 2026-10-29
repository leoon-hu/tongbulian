// 五年级道德与法治的出题测试：共用的部分（目录与材料、150 种子 × 三档、对错与材料一致、选项朗读）在 shared/__tests__/suite.ts
import '@/content/morality/grade5'
import { generatorSuite } from '@/content/morality/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

// 五年级上册 4 个单元 13 课（4 / 3 / 3 / 3），下册（旧版）3 个单元 12 课（3 / 3 / 6）
generatorSuite({ grade: 5, req: 'R4u', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, items, unitSizes: { 1: [4, 3, 3, 3], 2: [3, 3, 6] } })
