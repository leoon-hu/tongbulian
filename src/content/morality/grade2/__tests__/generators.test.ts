// 二年级道德与法治的出题测试：共用的部分（目录与材料、150 种子 × 三档、对错与材料一致、选项朗读）在 shared/__tests__/suite.ts
import '@/content/morality/grade2'
import { generatorSuite } from '@/content/morality/shared/__tests__/suite'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'
import { LESSONS, items } from '../generators'

generatorSuite({ grade: 2, req: 'R4r', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, items })
