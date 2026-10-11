import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版（人教版）四年级语文知识点树（单一事实源，需求 R4h），照国家中小学智慧教育平台当前的电子课本：四上是新教材
 * （2026 秋起用，根据 2022 年版课标修订），四下平台上还是旧版（教育部审定 2019），照平台当前那本做，平台换了新版再重做下册。
 * 设知识点的规矩同一到三年级（R4c）：一课一个（标题就是课题，「古诗三首」「文言文二则」算一课），每个语文园地一个；
 * 口语交际、习作、习作例文、快乐读书吧、综合性学习不设。第五单元是习作单元：只有两篇课文，没有语文园地。
 * 单元 id：c4s<册>u<序号>；知识点 id：c4s<册>-<单元两位>-<语义名>（语文园地是 garden）。
 */
export const UNITS: Unit[] = [
  { id: 'c4s1u1', semester: 1, order: 1, title: '阅读' },
  { id: 'c4s1u2', semester: 1, order: 2, title: '阅读' },
  { id: 'c4s1u3', semester: 1, order: 3, title: '阅读' },
  { id: 'c4s1u4', semester: 1, order: 4, title: '阅读' },
  { id: 'c4s1u5', semester: 1, order: 5, title: '阅读' },
  { id: 'c4s1u6', semester: 1, order: 6, title: '阅读' },
  { id: 'c4s1u7', semester: 1, order: 7, title: '阅读' },
  { id: 'c4s1u8', semester: 1, order: 8, title: '阅读' },
  { id: 'c4s2u1', semester: 2, order: 1, title: '阅读' },
  { id: 'c4s2u2', semester: 2, order: 2, title: '阅读' },
  { id: 'c4s2u3', semester: 2, order: 3, title: '阅读' },
  { id: 'c4s2u4', semester: 2, order: 4, title: '阅读' },
  { id: 'c4s2u5', semester: 2, order: 5, title: '阅读' },
  { id: 'c4s2u6', semester: 2, order: 6, title: '阅读' },
  { id: 'c4s2u7', semester: 2, order: 7, title: '阅读' },
  { id: 'c4s2u8', semester: 2, order: 8, title: '阅读' },
]

const READING: QuestionType[] = ['reading', 'phrase', 'hanzi', 'writing']
const GARDEN: QuestionType[] = ['phrase', 'reading', 'hanzi', 'writing']

const kp = (id: string, unitId: string, title: string, icon: string, questionTypes: QuestionType[]): KnowledgePoint => ({ id, unitId, title, icon, questionTypes })

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  kp('c4s1-01-guanchao', 'c4s1u1', '观潮', '🌊', READING),
  kp('c4s1-01-fanxing', 'c4s1u1', '繁星', '✨', READING),
  kp('c4s1-01-xiandaishi', 'c4s1u1', '现代诗二首', '🌇', READING),
  kp('c4s1-01-garden', 'c4s1u1', '语文园地一', '📝', GARDEN),
  kp('c4s1-02-doujia', 'c4s1u2', '一个豆荚里的五粒豆', '🌱', READING),
  kp('c4s1-02-yejian', 'c4s1u2', '夜间飞行的秘密', '🦇', READING),
  kp('c4s1-02-maozi', 'c4s1u2', '方帽子店', '🎩', READING),
  kp('c4s1-02-saima', 'c4s1u2', '田忌赛马', '🐎', READING),
  kp('c4s1-02-garden', 'c4s1u2', '语文园地二', '❓', GARDEN),
  kp('c4s1-03-gushi', 'c4s1u3', '古诗三首', '🌄', READING),
  kp('c4s1-03-pashanhu', 'c4s1u3', '爬山虎的脚', '🌿', READING),
  kp('c4s1-03-xishuai', 'c4s1u3', '蟋蟀的住宅', '🦗', READING),
  kp('c4s1-03-garden', 'c4s1u3', '语文园地三', '🔍', GARDEN),
  kp('c4s1-04-pangu', 'c4s1u4', '盘古开天地', '🪓', READING),
  kp('c4s1-04-jingwei', 'c4s1u4', '精卫填海', '🪨', READING),
  kp('c4s1-04-puluomi', 'c4s1u4', '普罗米修斯', '🔥', READING),
  kp('c4s1-04-nvwa', 'c4s1u4', '女娲补天', '🌈', READING),
  kp('c4s1-04-garden', 'c4s1u4', '语文园地四', '🌺', GARDEN),
  kp('c4s1-05-maque', 'c4s1u5', '麻雀', '🐦', READING),
  kp('c4s1-05-tiandu', 'c4s1u5', '爬天都峰', '🧗', READING),
  kp('c4s1-06-changcheng', 'c4s1u6', '长城', '🧱', READING),
  kp('c4s1-06-yiheyuan', 'c4s1u6', '颐和园', '🏯', READING),
  kp('c4s1-06-bingmayong', 'c4s1u6', '秦兵马俑', '🗿', READING),
  kp('c4s1-06-garden', 'c4s1u6', '语文园地六', '🏛️', GARDEN),
  kp('c4s1-07-niue', 'c4s1u7', '牛和鹅', '🐂', READING),
  kp('c4s1-07-laohu', 'c4s1u7', '一只窝囊的大老虎', '🐯', READING),
  kp('c4s1-07-tuoluo', 'c4s1u7', '陀螺', '🌀', READING),
  kp('c4s1-07-wangrong', 'c4s1u7', '王戎不取道旁李', '🍑', READING),
  kp('c4s1-07-garden', 'c4s1u7', '语文园地七', '🥬', GARDEN),
  kp('c4s1-08-wuwo', 'c4s1u8', '我将无我，不负人民', '🌟', READING),
  kp('c4s1-08-jueqi', 'c4s1u8', '为中华之崛起而读书', '📚', READING),
  kp('c4s1-08-yanan', 'c4s1u8', '延安，我把你追寻', '🏔️', READING),
  kp('c4s1-08-gushi', 'c4s1u8', '古诗三首', '🍇', READING),
  kp('c4s1-08-garden', 'c4s1u8', '语文园地八', '📜', GARDEN),
  // ── 下册（平台当前的旧版四下）──
  kp('c4s2-01-gushici', 'c4s2u1', '古诗词三首', '🌾', READING),
  kp('c4s2-01-xiangxia', 'c4s2u1', '乡下人家', '🏡', READING),
  kp('c4s2-01-tianchuang', 'c4s2u1', '天窗', '🪟', READING),
  kp('c4s2-01-taohuashui', 'c4s2u1', '三月桃花水', '🌸', READING),
  kp('c4s2-01-garden', 'c4s2u1', '语文园地一', '🌼', GARDEN),
  kp('c4s2-02-hupo', 'c4s2u2', '琥珀', '🕷️', READING),
  kp('c4s2-02-konglong', 'c4s2u2', '飞向蓝天的恐龙', '🦖', READING),
  kp('c4s2-02-nami', 'c4s2u2', '纳米技术就在我们身边', '🔬', READING),
  kp('c4s2-02-mengyuan', 'c4s2u2', '千年梦圆在今朝', '🚀', READING),
  kp('c4s2-02-garden', 'c4s2u2', '语文园地二', '🧪', GARDEN),
  kp('c4s2-03-duanshi', 'c4s2u3', '短诗三首', '⭐', READING),
  kp('c4s2-03-lv', 'c4s2u3', '绿', '🍃', READING),
  kp('c4s2-03-baihua', 'c4s2u3', '白桦', '🌲', READING),
  kp('c4s2-03-tianqing', 'c4s2u3', '在天晴了的时候', '🌤️', READING),
  kp('c4s2-03-garden', 'c4s2u3', '语文园地三', '✒️', GARDEN),
  kp('c4s2-04-mao', 'c4s2u4', '猫', '🐈', READING),
  kp('c4s2-04-muji', 'c4s2u4', '母鸡', '🐔', READING),
  kp('c4s2-04-baie', 'c4s2u4', '白鹅', '🦢', READING),
  kp('c4s2-04-garden', 'c4s2u4', '语文园地四', '🐾', GARDEN),
  kp('c4s2-05-richu', 'c4s2u5', '海上日出', '🌅', READING),
  kp('c4s2-05-shuanglong', 'c4s2u5', '记金华的双龙洞', '🐉', READING),
  kp('c4s2-06-wenyan', 'c4s2u6', '文言文二则', '📖', READING),
  kp('c4s2-06-yulai', 'c4s2u6', '小英雄雨来', '🏊', READING),
  kp('c4s2-06-nanzihan', 'c4s2u6', '我们家的男子汉', '👦', READING),
  kp('c4s2-06-luhuaxie', 'c4s2u6', '芦花鞋', '👟', READING),
  kp('c4s2-06-garden', 'c4s2u6', '语文园地六', '🎒', GARDEN),
  kp('c4s2-07-gushi', 'c4s2u7', '古诗三首', '🌙', READING),
  kp('c4s2-07-huangjiguang', 'c4s2u7', '黄继光', '🎖️', READING),
  kp('c4s2-07-nuomandi', 'c4s2u7', '“诺曼底号”遇难记', '🚢', READING),
  kp('c4s2-07-tiaoshangong', 'c4s2u7', '挑山工', '⛰️', READING),
  kp('c4s2-07-garden', 'c4s2u7', '语文园地七', '🏅', GARDEN),
  kp('c4s2-08-baohulu', 'c4s2u8', '宝葫芦的秘密', '🍐', READING),
  kp('c4s2-08-juren', 'c4s2u8', '巨人的花园', '🌷', READING),
  kp('c4s2-08-nver', 'c4s2u8', '海的女儿', '🧜', READING),
  kp('c4s2-08-garden', 'c4s2u8', '语文园地八', '🧚', GARDEN),
]
