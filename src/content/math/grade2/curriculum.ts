import type { KnowledgePoint, Unit } from '@/types/models'

/**
 * 人教版二年级数学知识点树（单一事实源），按 2022 版课标教材（二上 2025 秋、二下 2026 春起用）。
 * 单元 id：m2s<册>u<目录位置>；知识点 id：m2s<册>-<目录位置两位>-<语义名>（位置含 ☆ 的综合与实践，所以不一定等于教材的单元编号）。
 * 带 ☆ 的是教材里没编号的综合与实践（numbered: false）；两册的「复习与关联」、「身体上的尺子」「数学连环画」不设知识点。
 */
export const UNITS: Unit[] = [
  { id: 'm2s1u1', semester: 1, order: 1, title: '分类与整理' },
  { id: 'm2s1u2', semester: 1, order: 2, title: '1~6 的表内乘法' },
  { id: 'm2s1u3', semester: 1, order: 3, title: '1~6 的表内除法' },
  { id: 'm2s1u4', semester: 1, order: 0, title: '校园小导游', numbered: false },
  { id: 'm2s1u5', semester: 1, order: 4, title: '厘米和米' },
  { id: 'm2s1u6', semester: 1, order: 5, title: '7~9 的表内乘、除法' },
  { id: 'm2s2u1', semester: 2, order: 0, title: '时间在哪里', numbered: false },
  { id: 'm2s2u2', semester: 2, order: 1, title: '有余数的除法' },
  { id: 'm2s2u3', semester: 2, order: 2, title: '数量间的乘除关系' },
  { id: 'm2s2u4', semester: 2, order: 3, title: '万以内数的认识' },
  { id: 'm2s2u5', semester: 2, order: 4, title: '万以内的加法和减法' },
]

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  { id: 'm2s1-01-sorting', unitId: 'm2s1u1', title: '分类与整理', icon: '🗂️', questionTypes: ['sort'] },
  { id: 'm2s1-02-mult-intro', unitId: 'm2s1u2', title: '乘法的初步认识', icon: '✖️', questionTypes: ['multiply'] },
  { id: 'm2s1-02-table-6', unitId: 'm2s1u2', title: '2~6 的乘法口诀', icon: '🎲', questionTypes: ['multiply'] },
  { id: 'm2s1-02-mult-addsub', unitId: 'm2s1u2', title: '乘加、乘减', icon: '➕', questionTypes: ['multiply'] },
  { id: 'm2s1-02-mult-solve', unitId: 'm2s1u2', title: '用乘法解决问题', icon: '🛒', questionTypes: ['multiply'] },
  { id: 'm2s1-03-share', unitId: 'm2s1u3', title: '平均分', icon: '🍬', questionTypes: ['divide'] },
  { id: 'm2s1-03-div-parts', unitId: 'm2s1u3', title: '认识除法算式', icon: '➗', questionTypes: ['divide'] },
  { id: 'm2s1-03-div-6', unitId: 'm2s1u3', title: '用 2~6 的乘法口诀求商', icon: '🔢', questionTypes: ['divide'] },
  { id: 'm2s1-03-div-solve', unitId: 'm2s1u3', title: '用除法解决问题', icon: '🎁', questionTypes: ['divide'] },
  { id: 'm2s1-04-directions', unitId: 'm2s1u4', title: '认识东、南、西、北', icon: '🧭', questionTypes: ['position'] },
  { id: 'm2s1-05-cm-m', unitId: 'm2s1u5', title: '认识厘米和米', icon: '📏', questionTypes: ['length', 'compare'] },
  { id: 'm2s1-05-measure', unitId: 'm2s1u5', title: '量一量', icon: '✏️', questionTypes: ['length'] },
  { id: 'm2s1-06-table-9', unitId: 'm2s1u6', title: '7、8、9 的乘法口诀', icon: '🎯', questionTypes: ['multiply'] },
  { id: 'm2s1-06-div-9', unitId: 'm2s1u6', title: '用 7、8、9 的乘法口诀求商', icon: '🎰', questionTypes: ['divide'] },
  { id: 'm2s1-06-two-questions', unitId: 'm2s1u6', title: '连续两问', icon: '🧩', questionTypes: ['multiply', 'divide'] },
  // ── 下册 ──
  { id: 'm2s2-01-clock-hour', unitId: 'm2s2u1', title: '认识整时和半时', icon: '🕐', questionTypes: ['clock-read'] },
  { id: 'm2s2-01-time-read', unitId: 'm2s2u1', title: '认识几时几分', icon: '🕰️', questionTypes: ['time'] },
  { id: 'm2s2-01-time-calc', unitId: 'm2s2u1', title: '时与分', icon: '⏱️', questionTypes: ['time'] },
  { id: 'm2s2-02-remainder', unitId: 'm2s2u2', title: '认识余数', icon: '🍪', questionTypes: ['divide'] },
  { id: 'm2s2-02-rem-calc', unitId: 'm2s2u2', title: '有余数除法的计算', icon: '🧮', questionTypes: ['divide'] },
  { id: 'm2s2-03-times', unitId: 'm2s2u3', title: '倍的认识', icon: '✨', questionTypes: ['multiply', 'divide'] },
  { id: 'm2s2-03-mul-div-solve', unitId: 'm2s2u3', title: '乘除法解决问题', icon: '🛍️', questionTypes: ['multiply', 'divide'] },
  { id: 'm2s2-04-num-1000', unitId: 'm2s2u4', title: '1000 以内数的认识', icon: '🔟', questionTypes: ['count', 'pattern'] },
  { id: 'm2s2-04-num-10000', unitId: 'm2s2u4', title: '10000 以内数的认识', icon: '💎', questionTypes: ['count', 'pattern'] },
  { id: 'm2s2-04-compare', unitId: 'm2s2u4', title: '万以内数的大小比较', icon: '🐘', questionTypes: ['compare'] },
  { id: 'm2s2-04-round-addsub', unitId: 'm2s2u4', title: '整百、整千数加减法', icon: '💯', questionTypes: ['arith'] },
  { id: 'm2s2-05-add', unitId: 'm2s2u5', title: '三位数加法', icon: '🔼', questionTypes: ['arith'] },
  { id: 'm2s2-05-sub', unitId: 'm2s2u5', title: '三位数减法', icon: '🔽', questionTypes: ['arith'] },
  { id: 'm2s2-05-relations', unitId: 'm2s2u5', title: '加减法各部分间的关系', icon: '🔗', questionTypes: ['arith'] },
]
