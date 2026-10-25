import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 人教版（PEP）四年级英语知识点树（单一事实源，需求 R4n），按 2022 年版课标修订的新教材（平台上 2026 年度的四上、四下）。
 * 每个单元三个知识点：Part A（对话与单词）、拼读（Let's spell：四上是辅音字母组合 ch / sh / ck / ph / th / wh，
 * 四下是 ar / er / or / ir ur / air / ear）、Part B（对话与单词，含 Read and write）；Part C 是选学板块，它的 Reading time
 * 并进 Part B 的材料。每册末尾的 Revision 一个知识点，单元不编号（numbered: false，地图上显示 ☆）。
 * 单元 id：e4s<册>u<位置>；知识点 id：e4s<册>-<单元两位>-<a | spell | b | revision>。
 */
export const UNITS: Unit[] = [
  { id: 'e4s1u1', semester: 1, order: 1, title: 'Helping at home' },
  { id: 'e4s1u2', semester: 1, order: 2, title: 'My friends' },
  { id: 'e4s1u3', semester: 1, order: 3, title: 'Places we live in' },
  { id: 'e4s1u4', semester: 1, order: 4, title: 'Helping in the community' },
  { id: 'e4s1u5', semester: 1, order: 5, title: 'The weather and us' },
  { id: 'e4s1u6', semester: 1, order: 6, title: 'Changing for the seasons' },
  { id: 'e4s1u7', semester: 1, order: 0, title: "Revision: Let's help!", numbered: false },
  { id: 'e4s2u1', semester: 2, order: 1, title: 'Class rules' },
  { id: 'e4s2u2', semester: 2, order: 2, title: 'Family rules' },
  { id: 'e4s2u3', semester: 2, order: 3, title: 'Time for school' },
  { id: 'e4s2u4', semester: 2, order: 4, title: 'Going shopping' },
  { id: 'e4s2u5', semester: 2, order: 5, title: 'Farms and us' },
  { id: 'e4s2u6', semester: 2, order: 6, title: 'From farm to table' },
  { id: 'e4s2u7', semester: 2, order: 0, title: 'Revision: A great weekend plan', numbered: false },
]

const TALK: QuestionType[] = ['word', 'talk']
const SPELL: QuestionType[] = ['letter', 'word', 'talk'] // 拼读课的儿歌句子也出填空（talk）

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

/** 一个单元的三个知识点：A 的图标是单元主题，拼读 🔡，B 📖 */
function unit(sem: 1 | 2, n: number, icon: string): KnowledgePoint[] {
  const u = `e4s${sem}u${n}`
  const p = `e4s${sem}-${String(n).padStart(2, '0')}`
  return [kp(`${p}-a`, u, `Unit ${n} A 对话和单词`, icon, TALK), kp(`${p}-spell`, u, `Unit ${n} 拼读`, '🔡', SPELL), kp(`${p}-b`, u, `Unit ${n} B 对话和单词`, '📖', TALK)]
}

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  ...unit(1, 1, '🏠'),
  ...unit(1, 2, '🤝'),
  ...unit(1, 3, '🏘️'),
  ...unit(1, 4, '🚒'),
  ...unit(1, 5, '🌦️'),
  ...unit(1, 6, '🍂'),
  kp('e4s1-07-revision', 'e4s1u7', 'Revision 复习', '🌟', SPELL), // 复习页的儿歌也出拼读题
  // ── 下册 ──
  ...unit(2, 1, '🏫'),
  ...unit(2, 2, '🏡'),
  ...unit(2, 3, '⏰'),
  ...unit(2, 4, '🛍️'),
  ...unit(2, 5, '🐄'),
  ...unit(2, 6, '🍽️'),
  kp('e4s2-07-revision', 'e4s2u7', 'Revision 复习', '🌟', SPELL),
]
