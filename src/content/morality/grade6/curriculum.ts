import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版六年级道德与法治知识点树（单一事实源，需求 R4v）：上册是根据 2022 年版课程标准修订的新教材（整册讲法律：宪法、公民、
 * 国家机构、未成年人的特殊保护）；下册平台上还是旧版（总主编鲁洁），照平台当前那本做，平台换了新版再重做下册、id 跟着换。
 * 上册 4 个单元 11 课（3 / 3 / 3 / 2），下册 4 个单元 10 课（3 / 2 / 2 / 3），一课一个知识点。标题照课本目录。
 * 单元 id：d6s<册>u<序号>；知识点 id：d6s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd6s1u1', semester: 1, order: 1, title: '生活中的法律' },
  { id: 'd6s1u2', semester: 1, order: 2, title: '公民与国家' },
  { id: 'd6s1u3', semester: 1, order: 3, title: '我们受特殊保护' },
  { id: 'd6s1u4', semester: 1, order: 4, title: '知法守法 依法维权' },
  { id: 'd6s2u1', semester: 2, order: 1, title: '完善自我 健康成长' },
  { id: 'd6s2u2', semester: 2, order: 2, title: '爱护地球 共同责任' },
  { id: 'd6s2u3', semester: 2, order: 3, title: '多样文明 多彩生活' },
  { id: 'd6s2u4', semester: 2, order: 4, title: '让世界更美好' },
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
  kp('d6s1-01-falv', 1, '法律是什么', '⚖️'),
  kp('d6s1-02-zuoyong', 1, '法律作用大', '🛡️'),
  kp('d6s1-03-xianfa', 1, '宪法是根本法', '📜'),
  kp('d6s1-04-gongmin', 2, '我是中国公民', '🆔'),
  kp('d6s1-05-quanli', 2, '公民的基本权利和义务', '🗳️'),
  kp('d6s1-06-jigou', 2, '了解国家机构', '🏛️'),
  kp('d6s1-07-teshu', 3, '未成年人需特殊保护', '🧒'),
  kp('d6s1-08-zhuanmen', 3, '专门法律来保护', '📕'),
  kp('d6s1-09-guanai', 3, '特殊关爱 助我成长', '🤗'),
  kp('d6s1-10-weiquan', 4, '用好法律 维护权利', '🔍'),
  kp('d6s1-11-shoufa', 4, '做守法公民', '✅'),
  // ── 下册（旧版）──
  kp('d6s2-01-zunzhong', 1, '学会尊重', '🙏'),
  kp('d6s2-02-kuanrong', 1, '学会宽容', '😊'),
  kp('d6s2-03-fansi', 1, '学会反思', '🤔'),
  kp('d6s2-04-diqiu', 2, '地球——我们的家园', '🌍'),
  kp('d6s2-05-zaihai', 2, '应对自然灾害', '🌪️'),
  kp('d6s2-06-wenming', 3, '探访古代文明', '🏺'),
  kp('d6s2-07-duoyuan', 3, '多元文化 多样魅力', '🎭'),
  kp('d6s2-08-keji', 4, '科技发展 造福人类', '🔬'),
  kp('d6s2-09-guoji', 4, '日益重要的国际组织', '🌐'),
  kp('d6s2-10-heping', 4, '我们爱和平', '🕊️'),
]
