import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版二年级道德与法治知识点树（单一事实源，需求 R4r）：根据 2022 年版课程标准修订的新教材，两册都是新版。
 * 每册 4 个单元、每单元 4 课，一课一个知识点（课里的小标题并进这一课的材料）。标题照课本目录。
 * 单元 id：d2s<册>u<序号>；知识点 id：d2s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd2s1u1', semester: 1, order: 1, title: '过好节假日' },
  { id: 'd2s1u2', semester: 1, order: 2, title: '我爱我们班' },
  { id: 'd2s1u3', semester: 1, order: 3, title: '我的家乡美' },
  { id: 'd2s1u4', semester: 1, order: 4, title: '我爱我们的祖国' },
  { id: 'd2s2u1', semester: 2, order: 1, title: '我乐观 我向上' },
  { id: 'd2s2u2', semester: 2, order: 2, title: '大自然，谢谢您' },
  { id: 'd2s2u3', semester: 2, order: 3, title: '传统美德我弘扬' },
  { id: 'd2s2u4', semester: 2, order: 4, title: '播下梦想的种子' },
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
  kp('d2s1-01-jiaqi', 1, '假期有收获', '🏖️'),
  kp('d2s1-02-jiaoshijie', 1, '教师节快乐', '💐'),
  kp('d2s1-03-zhongqiu', 1, '团团圆圆过中秋', '🥮'),
  kp('d2s1-04-guoqing', 1, '欢欢喜喜庆国庆', '🎆'),
  kp('d2s1-05-banji', 2, '这是我们班', '🏫'),
  kp('d2s1-06-guize', 2, '班级生活有规则', '📋'),
  kp('d2s1-07-zhiri', 2, '我是班级值日生', '🧹'),
  kp('d2s1-08-gongxian', 2, '我为班级作贡献', '🏅'),
  kp('d2s1-09-shanshui', 3, '我爱家乡山和水', '🏞️'),
  kp('d2s1-10-wuchan', 3, '家乡物产养育我', '🌾'),
  kp('d2s1-11-jiaxiangren', 3, '可亲可敬的家乡人', '🧑‍🌾'),
  kp('d2s1-12-bianhua', 3, '家乡新变化', '🏙️'),
  kp('d2s1-13-meili', 4, '美丽中国我们的家', '🗺️'),
  kp('d2s1-14-zhongguoren', 4, '我们都是中国人', '🧑‍🤝‍🧑'),
  kp('d2s1-15-guonian', 4, '红红火火中国年', '🧧'),
  kp('d2s1-16-zihao', 4, '祖国，我为您自豪', '🇨🇳'),
  // ── 下册 ──
  kp('d2s2-01-jiankang', 1, '身心健康很重要', '💪'),
  kp('d2s2-02-kuaileniao', 1, '学做“快乐鸟”', '🐦'),
  kp('d2s2-03-kaixinguo', 1, '做个“开心果”', '😄'),
  kp('d2s2-04-jianchi', 1, '坚持才会有收获', '🌱'),
  kp('d2s2-05-ziran', 2, '亲近大自然', '🌳'),
  kp('d2s2-06-dongzhiwu', 2, '爱护动植物', '🐾'),
  kp('d2s2-07-shuidi', 2, '小水滴的诉说', '💧'),
  kp('d2s2-08-zhi', 2, '我是一张纸', '📄'),
  kp('d2s2-09-qinjian', 3, '勤俭传家好', '🪙'),
  kp('d2s2-10-chengxin', 3, '诚信贵如金', '💛'),
  kp('d2s2-11-ziqiang', 3, '少年当自强', '🏃'),
  kp('d2s2-12-jianxian', 3, '见贤要思齐', '🌟'),
  kp('d2s2-13-mengxiang', 4, '每个人都有梦想', '💭'),
  kp('d2s2-14-gongtong', 4, '我们共同的梦想', '🌈'),
  kp('d2s2-15-jieli', 4, '梦想接力棒', '🚀'),
  kp('d2s2-16-xianzai', 4, '实现梦想从现在做起', '⏰'),
]
