import type { KnowledgePoint, Unit } from '@/types/models'

/**
 * 人教版一年级数学知识点树（单一事实源），按 2022 版课标教材（一上 2024 秋、一下 2025 春起用）。
 * 单元 id：s<册>u<序号>；知识点 id：s<册>-<单元两位>-<语义名>。
 * 「数学游戏」与「☆ 欢乐购物街」是教材里没编号的部分（numbered: false，地图上显示 ☆）；两册的「复习与关联」不设知识点。
 */
export const UNITS: Unit[] = [
  { id: 's1u0', semester: 1, order: 0, title: '数学游戏', numbered: false },
  { id: 's1u1', semester: 1, order: 1, title: '5 以内数的认识和加、减法' },
  { id: 's1u2', semester: 1, order: 2, title: '6~10 的认识和加、减法' },
  { id: 's1u3', semester: 1, order: 3, title: '认识立体图形' },
  { id: 's1u4', semester: 1, order: 4, title: '11~20 的认识' },
  { id: 's1u5', semester: 1, order: 5, title: '20 以内的进位加法' },
  { id: 's2u1', semester: 2, order: 1, title: '认识平面图形' },
  { id: 's2u2', semester: 2, order: 2, title: '20 以内的退位减法' },
  { id: 's2u3', semester: 2, order: 3, title: '100 以内数的认识' },
  { id: 's2u4', semester: 2, order: 4, title: '100 以内的口算加、减法' },
  { id: 's2u5', semester: 2, order: 5, title: '100 以内的笔算加、减法' },
  { id: 's2u6', semester: 2, order: 6, title: '数量间的加减关系' },
  { id: 's2u7', semester: 2, order: 0, title: '欢乐购物街', numbered: false },
]

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  { id: 's1-00-count', unitId: 's1u0', title: '数一数', icon: '🔢', questionTypes: ['count'] },
  { id: 's1-00-compare', unitId: 's1u0', title: '比多少', icon: '⚖️', questionTypes: ['compare'] },
  { id: 's1-00-position', unitId: 's1u0', title: '上下前后左右', icon: '🧭', questionTypes: ['position'] },
  { id: 's1-01-num-5', unitId: 's1u1', title: '1~5 的认识', icon: '✋', questionTypes: ['count', 'compare'] },
  { id: 's1-01-compose-5', unitId: 's1u1', title: '5 以内分与合', icon: '🍎', questionTypes: ['arith'] },
  { id: 's1-01-addsub-5', unitId: 's1u1', title: '5 以内加减法', icon: '➕', questionTypes: ['arith', 'pic-equation'] },
  { id: 's1-02-num-10', unitId: 's1u2', title: '6~10 的认识', icon: '🙌', questionTypes: ['count', 'compare'] },
  { id: 's1-02-compose-10', unitId: 's1u2', title: '6~10 的组成', icon: '🔟', questionTypes: ['arith'] },
  { id: 's1-02-addsub-10', unitId: 's1u2', title: '10 以内加减法', icon: '➖', questionTypes: ['arith', 'pic-equation'] },
  { id: 's1-02-mixed', unitId: 's1u2', title: '连加连减、加减混合', icon: '🔗', questionTypes: ['arith'] },
  { id: 's1-03-solid-shapes', unitId: 's1u3', title: '立体图形', icon: '🧊', questionTypes: ['shape-match'] },
  { id: 's1-04-num-20', unitId: 's1u4', title: '11~20 的认识', icon: '🎯', questionTypes: ['count', 'compare'] },
  { id: 's1-04-simple-addsub', unitId: 's1u4', title: '简单加、减法', icon: '🎈', questionTypes: ['arith'] },
  { id: 's1-05-carry-add', unitId: 's1u5', title: '凑十法', icon: '🌟', questionTypes: ['arith', 'pic-equation'] },
  // ── 下册 ──
  { id: 's2-01-flat-shapes', unitId: 's2u1', title: '平面图形', icon: '🔷', questionTypes: ['shape-match'] },
  { id: 's2-02-borrow-sub', unitId: 's2u2', title: '破十法', icon: '💥', questionTypes: ['arith', 'pic-equation'] },
  { id: 's2-03-num-100', unitId: 's2u3', title: '100 以内的数', icon: '💯', questionTypes: ['count'] },
  { id: 's2-03-compare-100', unitId: 's2u3', title: '比大小', icon: '🐘', questionTypes: ['compare'] },
  { id: 's2-03-tens-addsub', unitId: 's2u3', title: '整十数加减法', icon: '🧮', questionTypes: ['arith'] },
  { id: 's2-04-oral-add', unitId: 's2u4', title: '口算加法', icon: '🔼', questionTypes: ['arith'] },
  { id: 's2-04-oral-sub', unitId: 's2u4', title: '口算减法', icon: '🔽', questionTypes: ['arith'] },
  { id: 's2-05-written-add', unitId: 's2u5', title: '笔算加法', icon: '✏️', questionTypes: ['arith'] },
  { id: 's2-05-written-sub', unitId: 's2u5', title: '笔算减法', icon: '🖍️', questionTypes: ['arith'] },
  { id: 's2-06-diff', unitId: 's2u6', title: '两数相差几', icon: '↔️', questionTypes: ['arith'] },
  { id: 's2-06-more-less', unitId: 's2u6', title: '比一个数多几或少几', icon: '🧩', questionTypes: ['arith'] },
  { id: 's2-07-money', unitId: 's2u7', title: '认识人民币', icon: '💰', questionTypes: ['money'] },
]
