import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 人教版（PEP）三年级英语知识点树（单一事实源，需求 R4m），按 2022 年版课标修订的新教材（三上 2024 秋、三下 2025 春起用；
 * 平台上 2026 年度 / 2025 年度的那一本）。每个单元三个知识点：Part A（对话与单词）、字母与发音（三上 Letters and sounds）
 * 或拼读（三下 Let's spell）、Part B（对话与单词，含 Start to read / Read and write）；Part C 是选学板块，它的 Reading time
 * 并进 Part B 的材料。每册末尾的 Revision 一个知识点，单元不编号（numbered: false，地图上显示 ☆）。
 * 单元 id：e3s<册>u<位置>；知识点 id：e3s<册>-<单元两位>-<a | letters | spell | b | revision>。
 */
export const UNITS: Unit[] = [
  { id: 'e3s1u1', semester: 1, order: 1, title: 'Making friends' },
  { id: 'e3s1u2', semester: 1, order: 2, title: 'Different families' },
  { id: 'e3s1u3', semester: 1, order: 3, title: 'Our animal friends' },
  { id: 'e3s1u4', semester: 1, order: 4, title: 'Plants around us' },
  { id: 'e3s1u5', semester: 1, order: 5, title: 'The colourful world' },
  { id: 'e3s1u6', semester: 1, order: 6, title: 'Useful numbers' },
  { id: 'e3s1u7', semester: 1, order: 0, title: 'Revision: Being a good guest', numbered: false },
  { id: 'e3s2u1', semester: 2, order: 1, title: 'Meeting new people' },
  { id: 'e3s2u2', semester: 2, order: 2, title: 'My words and actions' },
  { id: 'e3s2u3', semester: 2, order: 3, title: 'Tools and senses for learning' },
  { id: 'e3s2u4', semester: 2, order: 4, title: 'Healthy food' },
  { id: 'e3s2u5', semester: 2, order: 5, title: 'Old things' },
  { id: 'e3s2u6', semester: 2, order: 6, title: 'Numbers in life' },
  { id: 'e3s2u7', semester: 2, order: 0, title: 'Revision: Going to a school fair', numbered: false },
]

const TALK: QuestionType[] = ['word', 'talk']
const LETTER: QuestionType[] = ['letter', 'word', 'talk'] // 拼读课的儿歌句子也出填空（talk）

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

/** 一个单元的三个知识点：A 的图标是单元主题，字母 / 拼读 🔤 / 🔡，B 📖 */
function unit(sem: 1 | 2, n: number, icon: string): KnowledgePoint[] {
  const u = `e3s${sem}u${n}`
  const p = `e3s${sem}-${String(n).padStart(2, '0')}`
  const middle = sem === 1 ? kp(`${p}-letters`, u, `Unit ${n} 字母和发音`, '🔤', LETTER) : kp(`${p}-spell`, u, `Unit ${n} 拼读`, '🔡', LETTER)
  return [kp(`${p}-a`, u, `Unit ${n} A 对话和单词`, icon, TALK), middle, kp(`${p}-b`, u, `Unit ${n} B 对话和单词`, '📖', TALK)]
}

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  ...unit(1, 1, '👋'),
  ...unit(1, 2, '👨‍👩‍👧'),
  ...unit(1, 3, '🐾'),
  ...unit(1, 4, '🌱'),
  ...unit(1, 5, '🎨'),
  ...unit(1, 6, '🔢'),
  kp('e3s1-07-revision', 'e3s1u7', 'Revision 复习', '🌟', TALK),
  // ── 下册 ──
  ...unit(2, 1, '🌍'),
  ...unit(2, 2, '🙂'),
  ...unit(2, 3, '✏️'),
  ...unit(2, 4, '🥗'),
  ...unit(2, 5, '🧸'),
  ...unit(2, 6, '🔢'),
  kp('e3s2-07-revision', 'e3s2u7', 'Revision 复习', '🌟', TALK),
]
