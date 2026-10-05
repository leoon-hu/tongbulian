import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版（人教版）三年级语文知识点树（单一事实源，需求 R4f），按新教材：三上 2026 秋、三下 2027 春起用（根据 2022 年版课标修订）。
 * 设知识点的规矩同一、二年级（R4c）：一课一个（标题就是课题，「古诗三首」算一课），每个语文园地一个；口语交际、习作、
 * 快乐读书吧、专题学习活动不设。第五单元是习作单元：只有两篇课文（交流平台、初试身手、习作例文不设），没有语文园地。
 * 单元 id：c3s<册>u<序号>；知识点 id：c3s<册>-<单元两位>-<语义名>（语文园地是 garden）。
 */
export const UNITS: Unit[] = [
  { id: 'c3s1u1', semester: 1, order: 1, title: '阅读' },
  { id: 'c3s1u2', semester: 1, order: 2, title: '阅读' },
  { id: 'c3s1u3', semester: 1, order: 3, title: '阅读' },
  { id: 'c3s1u4', semester: 1, order: 4, title: '阅读' },
  { id: 'c3s1u5', semester: 1, order: 5, title: '阅读' },
  { id: 'c3s1u6', semester: 1, order: 6, title: '阅读' },
  { id: 'c3s1u7', semester: 1, order: 7, title: '阅读' },
  { id: 'c3s1u8', semester: 1, order: 8, title: '阅读' },
  { id: 'c3s2u1', semester: 2, order: 1, title: '阅读' },
  { id: 'c3s2u2', semester: 2, order: 2, title: '阅读' },
  { id: 'c3s2u3', semester: 2, order: 3, title: '阅读' },
  { id: 'c3s2u4', semester: 2, order: 4, title: '阅读' },
  { id: 'c3s2u5', semester: 2, order: 5, title: '阅读' },
  { id: 'c3s2u6', semester: 2, order: 6, title: '阅读' },
  { id: 'c3s2u7', semester: 2, order: 7, title: '阅读' },
  { id: 'c3s2u8', semester: 2, order: 8, title: '阅读' },
]

const READING: QuestionType[] = ['reading', 'phrase', 'hanzi', 'writing']
const GARDEN: QuestionType[] = ['phrase', 'reading', 'hanzi', 'writing']

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  kp('c3s1-01-dashu', 'c3s1u1', '大青树下的小学', '🏫', READING),
  kp('c3s1-01-huaxuexiao', 'c3s1u1', '花的学校', '🌸', READING),
  kp('c3s1-01-budong', 'c3s1u1', '不懂就要问', '❓', READING),
  kp('c3s1-01-garden', 'c3s1u1', '语文园地一', '📝', GARDEN),
  kp('c3s1-02-gushi', 'c3s1u2', '古诗三首', '🍁', READING),
  kp('c3s1-02-shuinidao', 'c3s1u2', '铺满金色巴掌的水泥道', '🍂', READING),
  kp('c3s1-02-qiuyu', 'c3s1u2', '秋天的雨', '🌧️', READING),
  kp('c3s1-02-qiusheng', 'c3s1u2', '听听，秋的声音', '👂', READING),
  kp('c3s1-02-garden', 'c3s1u2', '语文园地二', '📒', GARDEN),
  kp('c3s1-03-laowu', 'c3s1u3', '总也倒不了的老屋', '🏚️', READING),
  kp('c3s1-03-jianggui', 'c3s1u3', '犟龟', '🐢', READING),
  kp('c3s1-03-xiaogou', 'c3s1u3', '小狗学叫', '🐶', READING),
  kp('c3s1-03-garden', 'c3s1u3', '语文园地三', '🔮', GARDEN),
  kp('c3s1-04-baohulu', 'c3s1u4', '宝葫芦的秘密', '🍐', READING),
  kp('c3s1-04-niudu', 'c3s1u4', '在牛肚子里旅行', '🐄', READING),
  kp('c3s1-04-nailao', 'c3s1u4', '一块奶酪', '🧀', READING),
  kp('c3s1-04-garden', 'c3s1u4', '语文园地四', '🧚', GARDEN),
  kp('c3s1-05-dachuan', 'c3s1u5', '搭船的鸟', '🛶', READING),
  kp('c3s1-05-caodi', 'c3s1u5', '金色的草地', '🌼', READING),
  kp('c3s1-06-xisha', 'c3s1u6', '富饶的西沙群岛', '🏝️', READING),
  kp('c3s1-06-haibin', 'c3s1u6', '海滨小城', '🏖️', READING),
  kp('c3s1-06-xinganling', 'c3s1u6', '美丽的小兴安岭', '🌲', READING),
  kp('c3s1-06-xianggang', 'c3s1u6', '香港，璀璨的明珠', '🌃', READING),
  kp('c3s1-06-garden', 'c3s1u6', '语文园地六', '🗺️', GARDEN),
  kp('c3s1-07-gushi', 'c3s1u7', '古诗三首', '⛰️', READING),
  kp('c3s1-07-shengyin', 'c3s1u7', '大自然的声音', '🎵', READING),
  kp('c3s1-07-dashu', 'c3s1u7', '读不完的大书', '📖', READING),
  kp('c3s1-07-garden', 'c3s1u7', '语文园地七', '🦀', GARDEN),
  kp('c3s1-08-simaguang', 'c3s1u8', '司马光', '🏺', READING),
  kp('c3s1-08-zhengqi', 'c3s1u8', '一定要争气', '💪', READING),
  kp('c3s1-08-shoushutai', 'c3s1u8', '手术台就是阵地', '🏥', READING),
  kp('c3s1-08-ciwan', 'c3s1u8', '一个粗瓷大碗', '🥣', READING),
  kp('c3s1-08-garden', 'c3s1u8', '语文园地八', '👀', GARDEN),
  // ── 下册 ──
  kp('c3s2-01-gushi', 'c3s2u1', '古诗三首', '🦆', READING),
  kp('c3s2-01-yanzi', 'c3s2u1', '燕子', '🐦', READING),
  kp('c3s2-01-hehua', 'c3s2u1', '荷花', '🪷', READING),
  kp('c3s2-01-kunchong', 'c3s2u1', '昆虫备忘录', '🐞', READING),
  kp('c3s2-01-garden', 'c3s2u1', '语文园地一', '🗡️', GARDEN),
  kp('c3s2-02-shouzhu', 'c3s2u2', '守株待兔', '🐇', READING),
  kp('c3s2-02-lang', 'c3s2u2', '会摇尾巴的狼', '🐺', READING),
  kp('c3s2-02-lujiao', 'c3s2u2', '鹿角和鹿腿', '🦌', READING),
  kp('c3s2-02-chizi', 'c3s2u2', '池子与河流', '🏞️', READING),
  kp('c3s2-02-garden', 'c3s2u2', '语文园地二', '📚', GARDEN),
  kp('c3s2-03-haidi', 'c3s2u3', '海底世界', '🐙', READING),
  kp('c3s2-03-shifeng', 'c3s2u3', '石蜂', '🐝', READING),
  kp('c3s2-03-xiaoxia', 'c3s2u3', '小虾', '🦐', READING),
  kp('c3s2-03-garden', 'c3s2u3', '语文园地三', '🔬', GARDEN),
  kp('c3s2-04-gushi', 'c3s2u4', '古诗三首', '🧨', READING),
  kp('c3s2-04-zhi', 'c3s2u4', '纸的发明', '📜', READING),
  kp('c3s2-04-zhaozhou', 'c3s2u4', '赵州桥', '🌉', READING),
  kp('c3s2-04-minghua', 'c3s2u4', '一幅名扬中外的画', '🖼️', READING),
  kp('c3s2-04-garden', 'c3s2u4', '语文园地四', '🏮', GARDEN),
  kp('c3s2-05-huluobo', 'c3s2u5', '胡萝卜先生的长胡子', '🥕', READING),
  kp('c3s2-05-yikeshu', 'c3s2u5', '我变成了一棵树', '🌳', READING),
  kp('c3s2-06-shuimo', 'c3s2u6', '童年的水墨画', '🖌️', READING),
  kp('c3s2-06-feizao', 'c3s2u6', '肥皂泡', '🫧', READING),
  kp('c3s2-06-huique', 'c3s2u6', '灰雀', '🐤', READING),
  kp('c3s2-06-shixin', 'c3s2u6', '我不能失信', '🤝', READING),
  kp('c3s2-06-garden', 'c3s2u6', '语文园地六', '⚓', GARDEN),
  kp('c3s2-07-huoshaoyun', 'c3s2u7', '火烧云', '🌇', READING),
  kp('c3s2-07-baofengyu', 'c3s2u7', '暴风雨来临之前', '⛈️', READING),
  kp('c3s2-07-shijie', 'c3s2u7', '我们奇妙的世界', '🌍', READING),
  kp('c3s2-07-garden', 'c3s2u7', '语文园地七', '🐼', GARDEN),
  kp('c3s2-08-caifeng', 'c3s2u8', '慢性子裁缝和急性子顾客', '🧵', READING),
  kp('c3s2-08-lou', 'c3s2u8', '漏', '🫏', READING),
  kp('c3s2-08-zaohe', 'c3s2u8', '枣核', '🌰', READING),
  kp('c3s2-08-garden', 'c3s2u8', '语文园地八', '🗣️', GARDEN),
]
