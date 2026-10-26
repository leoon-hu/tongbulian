// 三年级道德与法治的出题测试：共用的部分（目录与材料、150 种子 × 三档、对错与材料一致、选项朗读）在 shared/__tests__/suite.ts
import '@/content/morality/grade3'
import { generatorSuite } from '@/content/morality/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

// 三年级每单元的课数照课本：上册 3 / 3 / 3 / 4 课，下册 2 / 3 / 3 / 4 课
generatorSuite({ grade: 3, req: 'R4s', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, items, unitSizes: { 1: [3, 3, 3, 4], 2: [2, 3, 3, 4] } })
