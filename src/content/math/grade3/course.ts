// 三年级数学的目录（单元 / 知识点树 + 知识点名），随 engine/catalog 静态加载：选学科、选年级、地图、页头要用。
// 生成器、题目词条与拼音在 index.ts，进这门课的页面之前才加载（N8，catalog 的 loadCourse）。
import type { Course } from '@/types/models'
import { UNITS, KNOWLEDGE_POINTS } from './curriculum'
import './titles' // 副作用：注册知识点 / 单元的英文名与标题拼音

export const mathGrade3: Course = {
  id: 'math-g3',
  subjectId: 'math',
  gradeId: 'g3',
  units: UNITS,
  knowledgePoints: KNOWLEDGE_POINTS,
}
