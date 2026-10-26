import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版一年级道德与法治知识点树（单一事实源，需求 R4q）：根据 2022 年版课程标准修订的新教材，两册都是新版。
 * 每册 4 个单元、每单元 4 课，一课一个知识点（课里的小标题并进这一课的材料）。标题照课本目录。
 * 单元 id：d1s<册>u<序号>；知识点 id：d1s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd1s1u1', semester: 1, order: 1, title: '我是小学生啦' },
  { id: 'd1s1u2', semester: 1, order: 2, title: '过好校园生活' },
  { id: 'd1s1u3', semester: 1, order: 3, title: '养成良好习惯' },
  { id: 'd1s1u4', semester: 1, order: 4, title: '我们讲文明' },
  { id: 'd1s2u1', semester: 2, order: 1, title: '我有新面貌' },
  { id: 'd1s2u2', semester: 2, order: 2, title: '我们一起长大' },
  { id: 'd1s2u3', semester: 2, order: 3, title: '幸福一家人' },
  { id: 'd1s2u4', semester: 2, order: 4, title: '争做中国好儿童' },
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
  kp('d1s1-01-shangxue', 1, '开开心心上学去', '🎒'),
  kp('d1s1-02-guoqi', 1, '我向国旗敬个礼', '🇨🇳'),
  kp('d1s1-03-xiaoyuan', 1, '这是我们的校园', '🏫'),
  kp('d1s1-04-huijia', 1, '平平安安回家来', '🚸'),
  kp('d1s1-05-laoshi', 2, '老师，您好！', '👩‍🏫'),
  kp('d1s1-06-pengyou', 2, '拉拉手，交朋友', '🤝'),
  kp('d1s1-07-shangke', 2, '上课了，好好学', '✏️'),
  kp('d1s1-08-kexia', 2, '课余生活真丰富', '⚽'),
  kp('d1s1-09-zuoxi', 3, '作息有规律', '⏰'),
  kp('d1s1-10-chifan', 3, '吃饭有讲究', '🍚'),
  kp('d1s1-11-limao', 3, '对人有礼貌', '🙇'),
  kp('d1s1-12-wan', 3, '玩也有学问', '🪁'),
  kp('d1s1-13-xiaosheng', 4, '我们小点儿声', '🤫'),
  kp('d1s1-14-gongwu', 4, '人人爱护公物', '🪑'),
  kp('d1s1-15-luanreng', 4, '我们不乱扔', '🗑️'),
  kp('d1s1-16-paidui', 4, '大家排好队', '🚶'),
  // ── 下册 ──
  kp('d1s2-01-mubiao', 1, '有个新目标', '🎯'),
  kp('d1s2-02-zixi', 1, '做事要仔细', '🔍'),
  kp('d1s2-03-gaicuo', 1, '错了就要改', '🩹'),
  kp('d1s2-04-jingshen', 1, '我们有精神', '💪'),
  kp('d1s2-05-dajia', 2, '和大家在一起', '👫'),
  kp('d1s2-06-bangmang', 2, '请帮我一下', '🙋'),
  kp('d1s2-07-fenxiang', 2, '我们爱分享', '🍪'),
  kp('d1s2-08-hezuo', 2, '大家来合作', '🧩'),
  kp('d1s2-09-jia', 3, '这是我的家', '🏠'),
  kp('d1s2-10-qinai', 3, '相亲相爱一家人', '👨‍👩‍👧'),
  kp('d1s2-11-zhengli', 3, '让我自己来整理', '🧺'),
  kp('d1s2-12-jiawu', 3, '学做家务活', '🧹'),
  kp('d1s2-13-ertongjie', 4, '快乐儿童节', '🎈'),
  kp('d1s2-14-shaoxiandui', 4, '光荣的少先队', '🚩'),
  kp('d1s2-15-honglingjin', 4, '戴上红领巾', '🧣'),
  kp('d1s2-16-xianfeng', 4, '学先锋 做先锋', '🌟'),
]
