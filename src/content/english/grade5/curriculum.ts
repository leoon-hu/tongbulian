import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 人教版（PEP）五年级英语知识点树（单一事实源，需求 R4o）。**五上**是按 2022 年版课标修订的新教材：每个单元三个知识点——Part A
 * （对话与单词）、拼读（Let's spell：ai / ay、ee / ea、ie / igh、oa / ow、oo、al / au / aw）、Part B（对话与单词，含 Read and write，
 * Part C 的 Reading time 并进来），册末 Revision 一个。**五下**平台上还是旧版（三年级起点）：每个单元也是 A / Let's spell / B
 * （Let's spell：cl / pl、br / gr、ch / sh、th、ng / nk、wh；B 并进 Let's check、Let's wrap it up 与 C 的 Story time），
 * 第 3、6 单元后面各有一个 Recycle（复习，地图 ☆）——平台换了新版五下再重做下册。
 * 单元 id：e5s<册>u<目录位置>；知识点 id：e5s<册>-<目录位置两位>-<a | spell | b | revision | recycle>（五下第 4 单元的目录位置是 05）。
 */
export const UNITS: Unit[] = [
  { id: 'e5s1u1', semester: 1, order: 1, title: 'Different friends' },
  { id: 'e5s1u2', semester: 1, order: 2, title: 'My feelings' },
  { id: 'e5s1u3', semester: 1, order: 3, title: 'Work and play' },
  { id: 'e5s1u4', semester: 1, order: 4, title: 'Healthy habits' },
  { id: 'e5s1u5', semester: 1, order: 5, title: 'Food we eat' },
  { id: 'e5s1u6', semester: 1, order: 6, title: 'Nature and us' },
  { id: 'e5s1u7', semester: 1, order: 0, title: "Revision: New Year's party", numbered: false },
  { id: 'e5s2u1', semester: 2, order: 1, title: 'My day' },
  { id: 'e5s2u2', semester: 2, order: 2, title: 'My favourite season' },
  { id: 'e5s2u3', semester: 2, order: 3, title: 'My school calendar' },
  { id: 'e5s2u4', semester: 2, order: 0, title: 'Recycle 1', numbered: false },
  { id: 'e5s2u5', semester: 2, order: 4, title: 'When is the art show?' },
  { id: 'e5s2u6', semester: 2, order: 5, title: 'Whose dog is it?' },
  { id: 'e5s2u7', semester: 2, order: 6, title: 'Work quietly!' },
  { id: 'e5s2u8', semester: 2, order: 0, title: 'Recycle 2', numbered: false },
]

const TALK: QuestionType[] = ['word', 'talk']
const SPELL: QuestionType[] = ['letter', 'word', 'talk'] // 拼读课的儿歌句子也出填空（talk）；复习页的儿歌也出拼读题

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

/** 一个单元的三个知识点：pos 是目录位置（id 用），n 是课本的单元号（标题用）；A 的图标是单元主题，拼读 🔡，B 📖 */
function unit(sem: 1 | 2, pos: number, n: number, icon: string): KnowledgePoint[] {
  const u = `e5s${sem}u${pos}`
  const p = `e5s${sem}-${String(pos).padStart(2, '0')}`
  return [kp(`${p}-a`, u, `Unit ${n} A 对话和单词`, icon, TALK), kp(`${p}-spell`, u, `Unit ${n} 拼读`, '🔡', SPELL), kp(`${p}-b`, u, `Unit ${n} B 对话和单词`, '📖', TALK)]
}

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  ...unit(1, 1, 1, '🧑‍🤝‍🧑'),
  ...unit(1, 2, 2, '😊'),
  ...unit(1, 3, 3, '📅'),
  ...unit(1, 4, 4, '🪥'),
  ...unit(1, 5, 5, '🥟'),
  ...unit(1, 6, 6, '🏞️'),
  kp('e5s1-07-revision', 'e5s1u7', 'Revision 复习', '🌟', SPELL),
  // ── 下册（旧版）──
  ...unit(2, 1, 1, '⏰'),
  ...unit(2, 2, 2, '🍂'),
  ...unit(2, 3, 3, '🗓️'),
  kp('e5s2-04-recycle', 'e5s2u4', 'Recycle 1 复习', '🌟', SPELL),
  ...unit(2, 5, 4, '🎨'),
  ...unit(2, 6, 5, '🐶'),
  ...unit(2, 7, 6, '🤫'),
  kp('e5s2-08-recycle', 'e5s2u8', 'Recycle 2 复习', '🌟', SPELL),
]
