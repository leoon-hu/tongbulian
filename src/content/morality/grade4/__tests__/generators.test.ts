// 四年级道德与法治的出题测试：共用的部分（目录与材料、150 种子 × 三档、对错与材料一致、选项朗读）在 shared/__tests__/suite.ts
import '@/content/morality/grade4'
import { generatorSuite } from '@/content/morality/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

// 四年级两册都是 4 个单元 × 3 课
generatorSuite({ grade: 4, req: 'R4t', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, items, unitSizes: { 1: [3, 3, 3, 3], 2: [3, 3, 3, 3] } })
