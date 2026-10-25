import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 人教版（PEP）六年级英语知识点树（单一事实源，需求 R4p）。**六上**是按 2022 年版课标修订的新教材：每个单元两个知识点——Part A
 * （对话与单词）、Part B（对话与单词，含 Read and write，Part C 的 Reading time 并进来），册末 Revision 一个；六年级的课本没有
 * Let's spell，所以没有拼读课。**六下**平台上还是旧版（三年级起点）：4 个单元，每个单元也是 A / B（B 并进 Let's check、Let's wrap it up
 * 与 C 的 Story time），书末一个 Recycle（复习，地图 ☆）——平台换了新版六下再重做下册。
 * 单元 id：e6s<册>u<目录位置>；知识点 id：e6s<册>-<目录位置两位>-<a | b | revision | recycle>。
 */
export const UNITS: Unit[] = [
  { id: 'e6s1u1', semester: 1, order: 1, title: 'Amazing places' },
  { id: 'e6s1u2', semester: 1, order: 2, title: 'Getting together' },
  { id: 'e6s1u3', semester: 1, order: 3, title: 'Healthy life' },
  { id: 'e6s1u4', semester: 1, order: 4, title: 'Managing money well' },
  { id: 'e6s1u5', semester: 1, order: 5, title: 'Exploring space' },
  { id: 'e6s1u6', semester: 1, order: 6, title: 'Energy, nature and us' },
  { id: 'e6s1u7', semester: 1, order: 0, title: 'Revision: Learning in museums', numbered: false },
  { id: 'e6s2u1', semester: 2, order: 1, title: 'How tall are you?' },
  { id: 'e6s2u2', semester: 2, order: 2, title: 'Last weekend' },
  { id: 'e6s2u3', semester: 2, order: 3, title: 'Where did you go?' },
  { id: 'e6s2u4', semester: 2, order: 4, title: 'Then and now' },
  { id: 'e6s2u5', semester: 2, order: 0, title: "Recycle: Mike's happy days", numbered: false },
]

const TALK: QuestionType[] = ['word', 'talk']

const kp = (id: string, unitId: string, title: string, icon: string): KnowledgePoint => ({ id, unitId, title, icon, questionTypes: TALK })

/** 一个单元的两个知识点：A 的图标是单元主题，B 📖 */
function unit(sem: 1 | 2, n: number, icon: string): KnowledgePoint[] {
  const u = `e6s${sem}u${n}`
  const p = `e6s${sem}-${String(n).padStart(2, '0')}`
  return [kp(`${p}-a`, u, `Unit ${n} A 对话和单词`, icon), kp(`${p}-b`, u, `Unit ${n} B 对话和单词`, '📖')]
}

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  ...unit(1, 1, '🏯'),
  ...unit(1, 2, '🎉'),
  ...unit(1, 3, '🩺'),
  ...unit(1, 4, '💰'),
  ...unit(1, 5, '🚀'),
  ...unit(1, 6, '⚡'),
  kp('e6s1-07-revision', 'e6s1u7', 'Revision 复习', '🌟'),
  // ── 下册（旧版）──
  ...unit(2, 1, '📏'),
  ...unit(2, 2, '🧹'),
  ...unit(2, 3, '🏕️'),
  ...unit(2, 4, '🕰️'),
  kp('e6s2-05-recycle', 'e6s2u5', 'Recycle 复习', '🌟'),
]
