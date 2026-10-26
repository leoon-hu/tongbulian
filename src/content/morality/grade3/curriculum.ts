import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版三年级道德与法治知识点树（单一事实源，需求 R4s）：根据 2022 年版课程标准修订的新教材，两册都是新版。
 * 每册 4 个单元，每单元的课数照课本（2–4 课），一课一个知识点（课里的小标题并进这一课的材料）。标题照课本目录。
 * 单元 id：d3s<册>u<序号>；知识点 id：d3s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd3s1u1', semester: 1, order: 1, title: '做学习的主人' },
  { id: 'd3s1u2', semester: 1, order: 2, title: '爱科学 学科学' },
  { id: 'd3s1u3', semester: 1, order: 3, title: '在集体中成长' },
  { id: 'd3s1u4', semester: 1, order: 4, title: '公共生活靠大家' },
  { id: 'd3s2u1', semester: 2, order: 1, title: '共建美好生活' },
  { id: 'd3s2u2', semester: 2, order: 2, title: '劳动最光荣' },
  { id: 'd3s2u3', semester: 2, order: 3, title: '我是家庭一员' },
  { id: 'd3s2u4', semester: 2, order: 4, title: '我们来交往' },
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
  // ── 上册 ──
  kp('d3s1-01-chengzhang', 1, '学习伴我成长', '📚'),
  kp('d3s1-02-kuaile', 1, '我学习，我快乐', '😊'),
  kp('d3s1-03-fangfa', 1, '学习有方法', '💡'),
  kp('d3s1-04-keji', 2, '科技力量大', '🛰️'),
  kp('d3s1-05-kexuejia', 2, '走近科学家', '🧑‍🔬'),
  kp('d3s1-06-aikexue', 2, '从小爱科学', '🔬'),
  kp('d3s1-07-laoshi', 3, '走近我们的老师', '👩‍🏫'),
  kp('d3s1-08-tongxue', 3, '同学相伴', '👫'),
  kp('d3s1-09-xuexiao', 3, '让我们的学校更美好', '🏫'),
  kp('d3s1-10-gonggong', 4, '公共场所的文明素养', '🏛️'),
  kp('d3s1-11-rexin', 4, '我们都是热心人', '❤️'),
  kp('d3s1-12-guize', 4, '生活离不开规则', '🚦'),
  kp('d3s1-13-anquan', 4, '安全记心上', '⛑️'),
  // ── 下册 ──
  kp('d3s2-01-xingfu', 1, '我们的生活越来越幸福', '🏡'),
  kp('d3s2-02-fendou', 1, '幸福生活是奋斗出来的', '💪'),
  kp('d3s2-03-laodong', 2, '一切靠劳动', '🛠️'),
  kp('d3s2-04-zhijing', 2, '致敬劳动者', '👷'),
  kp('d3s2-05-ailaodong', 2, '从小爱劳动', '🧹'),
  kp('d3s2-06-caoxin', 3, '少让父母操心', '👨‍👩‍👧'),
  kp('d3s2-07-zeren', 3, '我的家庭贡献与责任', '🏠'),
  kp('d3s2-08-meide', 3, '弘扬家庭美德', '🏮'),
  kp('d3s2-09-qingting', 4, '学会倾听', '👂'),
  kp('d3s2-10-biaoda', 4, '学会表达', '🗣️'),
  kp('d3s2-11-huzhu', 4, '同学要互助', '🙌'),
  kp('d3s2-12-chengxin', 4, '待人要诚信', '💛'),
]
