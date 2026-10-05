import type { KnowledgePoint, Unit } from '@/types/models'

/**
 * 人教版四年级数学知识点树（单一事实源），按 2022 版课标教材（四上 2026 秋起用；目录以国家中小学智慧教育平台上人教社的
 * 电子课本为准）。平台上四下还是旧版教材，新版出来之前只有上册。单元 id：m4s<册>u<目录位置>；知识点 id：
 * m4s<册>-<目录位置两位>-<语义名>（位置含 ☆ 的综合与实践，所以不一定等于教材的单元编号）。带 ☆ 的是教材里没编号的
 * 综合与实践（numbered: false）；「复习与关联」不设知识点。课本第四单元没有小节标题，知识点名照平台同步课的章节名。
 */
export const UNITS: Unit[] = [
  { id: 'm4s1u1', semester: 1, order: 1, title: '万以上数的认识' },
  { id: 'm4s1u2', semester: 1, order: 0, title: '1亿有多大', numbered: false },
  { id: 'm4s1u3', semester: 1, order: 2, title: '角的度量' },
  { id: 'm4s1u4', semester: 1, order: 3, title: '多位数乘两位数' },
  { id: 'm4s1u5', semester: 1, order: 4, title: '加法模型和乘法模型' },
  { id: 'm4s1u6', semester: 1, order: 5, title: '平行四边形和梯形' },
  { id: 'm4s1u7', semester: 1, order: 6, title: '条形统计图' },
  { id: 'm4s1u8', semester: 1, order: 0, title: '寻找宝藏', numbered: false },
]

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  { id: 'm4s1-01-within-yi', unitId: 'm4s1u1', title: '亿以内数的认识', icon: '🔢', questionTypes: ['big-number'] },
  { id: 'm4s1-01-above-yi', unitId: 'm4s1u1', title: '亿以上数的认识', icon: '🌏', questionTypes: ['big-number'] },
  { id: 'm4s1-01-compare', unitId: 'm4s1u1', title: '数的大小比较', icon: '⚖️', questionTypes: ['big-number', 'compare'] },
  { id: 'm4s1-01-round', unitId: 'm4s1u1', title: '数的改写和求近似数', icon: '🎯', questionTypes: ['big-number'] },
  { id: 'm4s1-02-yi', unitId: 'm4s1u2', title: '1亿有多大', icon: '📚', questionTypes: ['big-number'] },
  { id: 'm4s1-03-angles', unitId: 'm4s1u3', title: '角的再认识', icon: '🔄', questionTypes: ['angle'] },
  { id: 'm4s1-03-measure', unitId: 'm4s1u3', title: '角的度量', icon: '📐', questionTypes: ['angle'] },
  { id: 'm4s1-03-draw', unitId: 'm4s1u3', title: '画角', icon: '✏️', questionTypes: ['angle'] },
  { id: 'm4s1-04-oral', unitId: 'm4s1u4', title: '口算乘法', icon: '✖️', questionTypes: ['multiply'] },
  { id: 'm4s1-04-written', unitId: 'm4s1u4', title: '笔算乘法', icon: '✍️', questionTypes: ['multiply'] },
  { id: 'm4s1-04-pattern', unitId: 'm4s1u4', title: '积的变化规律', icon: '📈', questionTypes: ['multiply', 'compare'] },
  { id: 'm4s1-04-estimate', unitId: 'm4s1u4', title: '用估算解决问题', icon: '💰', questionTypes: ['multiply'] },
  { id: 'm4s1-05-total-part', unitId: 'm4s1u5', title: '总量与分量的关系', icon: '🧩', questionTypes: ['quantity'] },
  { id: 'm4s1-05-price', unitId: 'm4s1u5', title: '单价、数量和总价的关系', icon: '🛒', questionTypes: ['quantity'] },
  { id: 'm4s1-05-speed', unitId: 'm4s1u5', title: '时间、速度、路程的关系', icon: '🚗', questionTypes: ['quantity'] },
  { id: 'm4s1-06-parallel', unitId: 'm4s1u6', title: '平行和垂直', icon: '🛤️', questionTypes: ['parallel'] },
  { id: 'm4s1-06-distance', unitId: 'm4s1u6', title: '点到直线的距离', icon: '📍', questionTypes: ['parallel'] },
  { id: 'm4s1-06-parallelogram', unitId: 'm4s1u6', title: '认识平行四边形', icon: '🔷', questionTypes: ['parallel'] },
  { id: 'm4s1-06-trapezoid', unitId: 'm4s1u6', title: '认识梯形', icon: '🪜', questionTypes: ['parallel'] },
  { id: 'm4s1-07-single', unitId: 'm4s1u7', title: '单式条形统计图', icon: '📊', questionTypes: ['stat'] },
  { id: 'm4s1-07-double', unitId: 'm4s1u7', title: '复式条形统计图', icon: '📶', questionTypes: ['stat'] },
  { id: 'm4s1-08-treasure', unitId: 'm4s1u8', title: '校园寻宝', icon: '🧭', questionTypes: ['direction'] },
]
