// 六年级道德与法治的出题测试：共用的部分（目录与材料、150 种子 × 三档、对错与材料一致、选项朗读）在 shared/__tests__/suite.ts
import '@/content/morality/grade6'
import { generatorSuite } from '@/content/morality/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

// 六年级上册 4 个单元 11 课（3 / 3 / 3 / 2），下册（旧版）4 个单元 10 课（3 / 2 / 2 / 3）
generatorSuite({ grade: 6, req: 'R4v', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, items, unitSizes: { 1: [3, 3, 3, 2], 2: [3, 2, 2, 3] } })
