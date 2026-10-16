import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版（人教版）六年级语文知识点树（单一事实源，需求 R4k），照国家中小学智慧教育平台当前的电子课本：六上是新教材
 * （2026 秋起用，根据 2022 年版课标修订），六下平台上还是旧版（教育部审定 2019），照平台当前那本做，平台换了新版再重做下册。
 * 设知识点的规矩同五年级（R4j）：一课一个（标题就是课题，「古诗词三首」「文言文二则」算一课），每个语文园地一个；
 * 口语交际、习作、习作例文、快乐读书吧、综合性学习不设。第五单元（上册）、第三单元（下册）是习作单元：只有两篇课文，
 * 没有语文园地。下册第六单元是综合性学习「难忘小学生活」，整个单元不设（地图上从 5 直接到「古诗词诵读」）；书末的
 * 「古诗词诵读」十首每首一个知识点，单元不编号（numbered: false，地图上显示 ☆）。
 * 单元 id：c6s<册>u<目录位置>；知识点 id：c6s<册>-<目录位置两位>-<语义名>（语文园地是 garden；古诗词诵读排在第六单元后面，位置 7）。
 */
export const UNITS: Unit[] = [
  { id: 'c6s1u1', semester: 1, order: 1, title: '阅读' },
  { id: 'c6s1u2', semester: 1, order: 2, title: '阅读' },
  { id: 'c6s1u3', semester: 1, order: 3, title: '阅读' },
  { id: 'c6s1u4', semester: 1, order: 4, title: '阅读' },
  { id: 'c6s1u5', semester: 1, order: 5, title: '阅读' },
  { id: 'c6s1u6', semester: 1, order: 6, title: '阅读' },
  { id: 'c6s1u7', semester: 1, order: 7, title: '阅读' },
  { id: 'c6s1u8', semester: 1, order: 8, title: '阅读' },
  { id: 'c6s2u1', semester: 2, order: 1, title: '阅读' },
  { id: 'c6s2u2', semester: 2, order: 2, title: '阅读' },
  { id: 'c6s2u3', semester: 2, order: 3, title: '阅读' },
  { id: 'c6s2u4', semester: 2, order: 4, title: '阅读' },
  { id: 'c6s2u5', semester: 2, order: 5, title: '阅读' },
  { id: 'c6s2u7', semester: 2, order: 0, title: '古诗词诵读', numbered: false },
]

const READING: QuestionType[] = ['reading', 'phrase', 'hanzi', 'writing']
const GARDEN: QuestionType[] = ['phrase', 'reading', 'hanzi', 'writing']

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  kp('c6s1-01-caoyuan', 'c6s1u1', '草原', '🐎', READING),
  kp('c6s1-01-dingxiangjie', 'c6s1u1', '丁香结', '💜', READING),
  kp('c6s1-01-gushici', 'c6s1u1', '古诗词三首', '🌙', READING),
  kp('c6s1-01-garden', 'c6s1u1', '语文园地一', '📝', GARDEN),
  kp('c6s1-02-changzheng', 'c6s1u2', '七律·长征', '🚩', READING),
  kp('c6s1-02-langyashan', 'c6s1u2', '狼牙山五壮士', '⛰️', READING),
  kp('c6s1-02-kaiguo', 'c6s1u2', '开国大典', '🎆', READING),
  kp('c6s1-02-qiushaoyun', 'c6s1u2', '我的战友邱少云', '🔥', READING),
  kp('c6s1-02-garden', 'c6s1u2', '语文园地二', '✍️', GARDEN),
  kp('c6s1-03-zhujieren', 'c6s1u3', '竹节人', '🎋', READING),
  kp('c6s1-03-yuzhou', 'c6s1u3', '宇宙生命之谜', '🪐', READING),
  kp('c6s1-03-gugong', 'c6s1u3', '故宫博物院', '🏯', READING),
  kp('c6s1-03-garden', 'c6s1u3', '语文园地三', '🎯', GARDEN),
  kp('c6s1-04-qiao', 'c6s1u4', '桥', '🌉', READING),
  kp('c6s1-04-qiongren', 'c6s1u4', '穷人', '⛵', READING),
  kp('c6s1-04-yugou', 'c6s1u4', '金色的鱼钩', '🎣', READING),
  kp('c6s1-04-garden', 'c6s1u4', '语文园地四', '📕', GARDEN),
  kp('c6s1-05-dengguang', 'c6s1u5', '灯光', '💡', READING),
  kp('c6s1-05-pan', 'c6s1u5', '盼', '☔', READING),
  kp('c6s1-06-diqiu', 'c6s1u6', '只有一个地球', '🌍', READING),
  kp('c6s1-06-qingshan', 'c6s1u6', '青山不老', '🌲', READING),
  kp('c6s1-06-sanhei', 'c6s1u6', '三黑和土地', '🌱', READING),
  kp('c6s1-06-gushi', 'c6s1u6', '古诗三首', '🏞️', READING),
  kp('c6s1-06-garden', 'c6s1u6', '语文园地六', '♻️', GARDEN),
  kp('c6s1-07-wenyan', 'c6s1u7', '文言文二则', '☀️', READING),
  kp('c6s1-07-biaoli', 'c6s1u7', '表里的生物', '⌚', READING),
  kp('c6s1-07-youqu', 'c6s1u7', '他们那时候多有趣啊', '🤖', READING),
  kp('c6s1-07-garden', 'c6s1u7', '语文园地七', '🔬', GARDEN),
  kp('c6s1-08-runtu', 'c6s1u8', '少年闰土', '🍉', READING),
  kp('c6s1-08-haogushi', 'c6s1u8', '好的故事', '🚣', READING),
  kp('c6s1-08-bofu', 'c6s1u8', '我的伯父鲁迅先生', '📖', READING),
  kp('c6s1-08-youderen', 'c6s1u8', '有的人——纪念鲁迅有感', '✒️', READING),
  kp('c6s1-08-garden', 'c6s1u8', '语文园地八', '🖋️', GARDEN),
  // ── 下册（平台当前的旧版六下；第六单元综合性学习不设）──
  kp('c6s2-01-chunjie', 'c6s2u1', '北京的春节', '🧧', READING),
  kp('c6s2-01-labazhou', 'c6s2u1', '腊八粥', '🥣', READING),
  kp('c6s2-01-gushi', 'c6s2u1', '古诗三首', '🏮', READING),
  kp('c6s2-01-zangxi', 'c6s2u1', '藏戏', '🎭', READING),
  kp('c6s2-01-garden', 'c6s2u1', '语文园地一', '🎊', GARDEN),
  kp('c6s2-02-lubinxun', 'c6s2u2', '鲁滨逊漂流记', '🏝️', READING),
  kp('c6s2-02-qie', 'c6s2u2', '骑鹅旅行记', '🦢', READING),
  kp('c6s2-02-tangmu', 'c6s2u2', '汤姆·索亚历险记', '🕯️', READING),
  kp('c6s2-02-garden', 'c6s2u2', '语文园地二', '📚', GARDEN),
  kp('c6s2-03-congcong', 'c6s2u3', '匆匆', '⏳', READING),
  kp('c6s2-03-xingqitian', 'c6s2u3', '那个星期天', '🌇', READING),
  kp('c6s2-04-gushi', 'c6s2u4', '古诗三首', '🪨', READING),
  kp('c6s2-04-huiyi', 'c6s2u4', '十六年前的回忆', '🕊️', READING),
  kp('c6s2-04-weirenmin', 'c6s2u4', '为人民服务', '⭐', READING),
  kp('c6s2-04-dongcunrui', 'c6s2u4', '董存瑞舍身炸暗堡', '💥', READING),
  kp('c6s2-04-garden', 'c6s2u4', '语文园地四', '🏅', GARDEN),
  kp('c6s2-05-wenyan', 'c6s2u5', '文言文二则', '♟️', READING),
  kp('c6s2-05-zhenli', 'c6s2u5', '真理诞生于一百个问号之后', '❓', READING),
  kp('c6s2-05-biaoli', 'c6s2u5', '表里的生物', '⏱️', READING),
  kp('c6s2-05-youqu', 'c6s2u5', '他们那时候多有趣啊', '💻', READING),
  kp('c6s2-05-garden', 'c6s2u5', '语文园地五', '🧪', GARDEN),
  // 书末「古诗词诵读」：每首一个知识点
  kp('c6s2-07-caiwei', 'c6s2u7', '采薇', '🌿', READING),
  kp('c6s2-07-songyuaner', 'c6s2u7', '送元二使安西', '🍶', READING),
  kp('c6s2-07-chunye', 'c6s2u7', '春夜喜雨', '🌧️', READING),
  kp('c6s2-07-zaochun', 'c6s2u7', '早春呈水部张十八员外', '🌦️', READING),
  kp('c6s2-07-yuzhe', 'c6s2u7', '江上渔者', '🐟', READING),
  kp('c6s2-07-guazhou', 'c6s2u7', '泊船瓜洲', '🌕', READING),
  kp('c6s2-07-youyuan', 'c6s2u7', '游园不值', '🌸', READING),
  kp('c6s2-07-busuanzi', 'c6s2u7', '卜算子·送鲍浩然之浙东', '🏔️', READING),
  kp('c6s2-07-huanxisha', 'c6s2u7', '浣溪沙', '🐓', READING),
  kp('c6s2-07-qingpingle', 'c6s2u7', '清平乐', '🐦', READING),
]
