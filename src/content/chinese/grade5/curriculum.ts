import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版（人教版）五年级语文知识点树（单一事实源，需求 R4j），照国家中小学智慧教育平台当前的电子课本：五上是新教材
 * （2026 秋起用，根据 2022 年版课标修订），五下平台上还是旧版（教育部审定 2019），照平台当前那本做，平台换了新版再重做下册。
 * 设知识点的规矩同四年级（R4h）：一课一个（标题就是课题，「古诗三首」「人物描写一组」算一课），每个语文园地一个；
 * 口语交际、习作、习作例文、快乐读书吧不设。第五单元是习作单元：只有两篇课文，没有语文园地。五下第三单元是综合性学习
 * 「遨游汉字王国」，整个单元不设（地图上从 2 跳到 4）。
 * 单元 id：c5s<册>u<序号>；知识点 id：c5s<册>-<单元两位>-<语义名>（语文园地是 garden）。
 */
export const UNITS: Unit[] = [
  { id: 'c5s1u1', semester: 1, order: 1, title: '阅读' },
  { id: 'c5s1u2', semester: 1, order: 2, title: '阅读' },
  { id: 'c5s1u3', semester: 1, order: 3, title: '阅读' },
  { id: 'c5s1u4', semester: 1, order: 4, title: '阅读' },
  { id: 'c5s1u5', semester: 1, order: 5, title: '阅读' },
  { id: 'c5s1u6', semester: 1, order: 6, title: '阅读' },
  { id: 'c5s1u7', semester: 1, order: 7, title: '阅读' },
  { id: 'c5s1u8', semester: 1, order: 8, title: '阅读' },
  { id: 'c5s2u1', semester: 2, order: 1, title: '阅读' },
  { id: 'c5s2u2', semester: 2, order: 2, title: '阅读' },
  { id: 'c5s2u4', semester: 2, order: 4, title: '阅读' },
  { id: 'c5s2u5', semester: 2, order: 5, title: '阅读' },
  { id: 'c5s2u6', semester: 2, order: 6, title: '阅读' },
  { id: 'c5s2u7', semester: 2, order: 7, title: '阅读' },
  { id: 'c5s2u8', semester: 2, order: 8, title: '阅读' },
]

const READING: QuestionType[] = ['reading', 'phrase', 'hanzi', 'writing']
const GARDEN: QuestionType[] = ['phrase', 'reading', 'hanzi', 'writing']

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  kp('c5s1-01-guihuayu', 'c5s1u1', '桂花雨', '🌼', READING),
  kp('c5s1-01-luohuasheng', 'c5s1u1', '落花生', '🥜', READING),
  kp('c5s1-01-zhenzhuniao', 'c5s1u1', '珍珠鸟', '🐦', READING),
  kp('c5s1-01-garden', 'c5s1u1', '语文园地一', '📝', GARDEN),
  kp('c5s1-02-didaozhan', 'c5s1u2', '冀中的地道战', '🕳️', READING),
  kp('c5s1-02-jiangxianghe', 'c5s1u2', '将相和', '🤝', READING),
  kp('c5s1-02-liebao', 'c5s1u2', '什么比猎豹的速度更快', '🐆', READING),
  kp('c5s1-02-nuomandi', 'c5s1u2', '“诺曼底号”遇难记', '🚢', READING),
  kp('c5s1-02-garden', 'c5s1u2', '语文园地二', '⏱️', GARDEN),
  kp('c5s1-03-hailibu', 'c5s1u3', '猎人海力布', '🏹', READING),
  kp('c5s1-03-niulang1', 'c5s1u3', '牛郎织女（一）', '🐂', READING),
  kp('c5s1-03-niulang2', 'c5s1u3', '牛郎织女（二）', '🌌', READING),
  kp('c5s1-03-garden', 'c5s1u3', '语文园地三', '📖', GARDEN),
  kp('c5s1-04-gushi', 'c5s1u4', '古诗三首', '🏮', READING),
  kp('c5s1-04-shaonian', 'c5s1u4', '少年中国说', '🌅', READING),
  kp('c5s1-04-yuanmingyuan', 'c5s1u4', '圆明园的毁灭', '🏯', READING),
  kp('c5s1-04-meilanfang', 'c5s1u4', '梅兰芳蓄须明志', '🎭', READING),
  kp('c5s1-04-garden', 'c5s1u4', '语文园地四', '✊', GARDEN),
  kp('c5s1-05-taiyang', 'c5s1u5', '太阳', '☀️', READING),
  kp('c5s1-05-jinzita', 'c5s1u5', '金字塔', '🔺', READING),
  kp('c5s1-06-cimu', 'c5s1u6', '慈母情深', '🧵', READING),
  kp('c5s1-06-fuai', 'c5s1u6', '父爱之舟', '🛶', READING),
  kp('c5s1-06-hangtianyuan', 'c5s1u6', '航天员写给孩子的信', '🚀', READING),
  kp('c5s1-06-garden', 'c5s1u6', '语文园地六', '💞', GARDEN),
  kp('c5s1-07-gushi', 'c5s1u7', '古诗三首', '🍂', READING),
  kp('c5s1-07-diyichangxue', 'c5s1u7', '第一场雪', '❄️', READING),
  kp('c5s1-07-bailu', 'c5s1u7', '白鹭', '🪶', READING),
  kp('c5s1-07-garden', 'c5s1u7', '语文园地七', '🏞️', GARDEN),
  kp('c5s1-08-guren', 'c5s1u8', '古人谈读书', '📜', READING),
  kp('c5s1-08-yidushu', 'c5s1u8', '忆读书', '📚', READING),
  kp('c5s1-08-shuweilv', 'c5s1u8', '走遍天下书为侣', '🧳', READING),
  kp('c5s1-08-garden', 'c5s1u8', '语文园地八', '🔖', GARDEN),
  // ── 下册（平台当前的旧版五下；第三单元综合性学习不设）──
  kp('c5s2-01-gushi', 'c5s2u1', '古诗三首', '🌾', READING),
  kp('c5s2-01-zufu', 'c5s2u1', '祖父的园子', '🌻', READING),
  kp('c5s2-01-yueshi', 'c5s2u1', '月是故乡明', '🌕', READING),
  kp('c5s2-01-meihuahun', 'c5s2u1', '梅花魂', '🌸', READING),
  kp('c5s2-01-garden', 'c5s2u1', '语文园地一', '🎈', GARDEN),
  kp('c5s2-02-caochuan', 'c5s2u2', '草船借箭', '⛵', READING),
  kp('c5s2-02-jingyanggang', 'c5s2u2', '景阳冈', '🐅', READING),
  kp('c5s2-02-houwang', 'c5s2u2', '猴王出世', '🐒', READING),
  kp('c5s2-02-honglou', 'c5s2u2', '红楼春趣', '🪁', READING),
  kp('c5s2-02-garden', 'c5s2u2', '语文园地二', '📕', GARDEN),
  kp('c5s2-04-gushi', 'c5s2u4', '古诗三首', '⚔️', READING),
  kp('c5s2-04-qingshan', 'c5s2u4', '青山处处埋忠骨', '⛰️', READING),
  kp('c5s2-04-junshen', 'c5s2u4', '军神', '🎖️', READING),
  kp('c5s2-04-qingpin', 'c5s2u4', '清贫', '🕯️', READING),
  kp('c5s2-04-garden', 'c5s2u4', '语文园地四', '🏅', GARDEN),
  kp('c5s2-05-renwu', 'c5s2u5', '人物描写一组', '🤼', READING),
  kp('c5s2-05-shuazili', 'c5s2u5', '刷子李', '🖌️', READING),
  kp('c5s2-06-maodun', 'c5s2u6', '自相矛盾', '🛡️', READING),
  kp('c5s2-06-saima', 'c5s2u6', '田忌赛马', '🐎', READING),
  kp('c5s2-06-tiaoshui', 'c5s2u6', '跳水', '🌊', READING),
  kp('c5s2-06-garden', 'c5s2u6', '语文园地六', '💡', GARDEN),
  kp('c5s2-07-xiaoting', 'c5s2u7', '威尼斯的小艇', '🚣', READING),
  kp('c5s2-07-muchang', 'c5s2u7', '牧场之国', '🐮', READING),
  kp('c5s2-07-jinzita', 'c5s2u7', '金字塔', '🐫', READING),
  kp('c5s2-07-garden', 'c5s2u7', '语文园地七', '🗺️', GARDEN),
  kp('c5s2-08-yangshi', 'c5s2u8', '杨氏之子', '🍒', READING),
  kp('c5s2-08-shouzhi', 'c5s2u8', '手指', '✋', READING),
  kp('c5s2-08-tongnian', 'c5s2u8', '童年的发现', '🔍', READING),
  kp('c5s2-08-garden', 'c5s2u8', '语文园地八', '😄', GARDEN),
]
