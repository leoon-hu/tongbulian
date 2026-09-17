// 一年级数学内容包：单元/知识点树 + 生成器 + 词条。
// 被 engine/catalog 导入即完成全部注册（生成器 + i18n）。
import type { Course } from '@/types/models'
import { UNITS, KNOWLEDGE_POINTS } from './curriculum'
import './generators' // 副作用：注册全部生成器
import './i18n' // 副作用：注册题目/选项词条与英文名
import './pinyin' // 副作用：注册词条拼音

export const mathGrade1: Course = {
  id: 'math-g1',
  subjectId: 'math',
  gradeId: 'g1',
  units: UNITS,
  knowledgePoints: KNOWLEDGE_POINTS,
}
