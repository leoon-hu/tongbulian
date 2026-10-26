import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版四年级道德与法治知识点树（单一事实源，需求 R4t）：上册是根据 2022 年版课程标准修订的新教材；下册平台上还是旧版
 * （总主编鲁洁），照平台当前那本做，平台换了新版再重做下册、id 跟着换。两册都是 4 个单元 × 3 课，一课一个知识点。标题照课本目录。
 * 单元 id：d4s<册>u<序号>；知识点 id：d4s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd4s1u1', semester: 1, order: 1, title: '我们的班集体' },
  { id: 'd4s1u2', semester: 1, order: 2, title: '少年在成长' },
  { id: 'd4s1u3', semester: 1, order: 3, title: '生活在信息社会' },
  { id: 'd4s1u4', semester: 1, order: 4, title: '做文明的消费者' },
  { id: 'd4s2u1', semester: 2, order: 1, title: '同伴与交往' },
  { id: 'd4s2u2', semester: 2, order: 2, title: '做聪明的消费者' },
  { id: 'd4s2u3', semester: 2, order: 3, title: '美好生活哪里来' },
  { id: 'd4s2u4', semester: 2, order: 4, title: '感受家乡文化 关心家乡发展' },
]

const TYPES: QuestionType[] = ['conduct', 'civics']

const kp = (id: string, unit: number, title: string, icon: string): KnowledgePoint => ({
  id,
  unitId: `${id.slice(0, 4)}u${unit}`,
  title,
  icon,
  questionTypes: TYPES,
})

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册（新版）──
  kp('d4s1-01-banjiti', 1, '热爱班集体', '🧑‍🤝‍🧑'),
  kp('d4s1-02-xuanju', 1, '选举班委会', '🗳️'),
  kp('d4s1-03-xieshang', 1, '协商决定班级事务', '💬'),
  kp('d4s1-04-dute', 2, '我是独特的', '🌟'),
  kp('d4s1-05-shengming', 2, '生命最宝贵', '🌱'),
  kp('d4s1-06-baohu', 2, '自我保护，免受伤害', '🛡️'),
  kp('d4s1-07-shenqi', 3, '神奇的世界', '🌐'),
  kp('d4s1-08-qiangzou', 3, '别让它抢走太多', '📱'),
  kp('d4s1-09-shangwang', 3, '安全文明上网', '💻'),
  kp('d4s1-10-gouwu', 4, '购物有学问', '🛒'),
  kp('d4s1-11-xiaofei', 4, '学会合理消费', '💰'),
  kp('d4s1-12-langfei', 4, '反对浪费', '🍚'),
  // ── 下册（旧版）──
  kp('d4s2-01-pengyou', 1, '我们的好朋友', '👫'),
  kp('d4s2-02-suanshu', 1, '说话要算数', '🤞'),
  kp('d4s2-03-chongtu', 1, '当冲突发生', '⚡'),
  kp('d4s2-04-maidongxi', 2, '买东西的学问', '🧾'),
  kp('d4s2-05-heli', 2, '合理消费', '⚖️'),
  kp('d4s2-06-bimian', 2, '有多少浪费本可避免', '♻️'),
  kp('d4s2-07-yishi', 3, '我们的衣食之源', '🌾'),
  kp('d4s2-08-nalilai', 3, '这些东西哪里来', '📦'),
  kp('d4s2-09-tamen', 3, '生活离不开他们', '👷'),
  kp('d4s2-10-fengsu', 4, '我们当地的风俗', '🏮'),
  kp('d4s2-11-yishu', 4, '多姿多彩的民间艺术', '🎎'),
  kp('d4s2-12-xiyou', 4, '家乡的喜与忧', '🏘️'),
]
