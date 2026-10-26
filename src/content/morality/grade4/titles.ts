// 四年级道德与法治的知识点 / 单元名（英文名 + 中文标题的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts；课本不注拼音，拼音照字典定。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

const KP_TITLE_EN: Record<string, string> = {
  'd4s1-01-banjiti': 'Love Our Class',
  'd4s1-02-xuanju': 'Electing the Class Committee',
  'd4s1-03-xieshang': 'Deciding Class Matters Together',
  'd4s1-04-dute': "I'm Unique",
  'd4s1-05-shengming': 'Life Is Most Precious',
  'd4s1-06-baohu': 'Protect Yourself from Harm',
  'd4s1-07-shenqi': 'A Wonderful World Online',
  'd4s1-08-qiangzou': "Don't Let It Take Too Much",
  'd4s1-09-shangwang': 'Be Safe and Civil Online',
  'd4s1-10-gouwu': 'Smart Shopping',
  'd4s1-11-xiaofei': 'Learn to Spend Wisely',
  'd4s1-12-langfei': 'Say No to Waste',
  'd4s2-01-pengyou': 'Our Good Friends',
  'd4s2-02-suanshu': 'Keep Your Word',
  'd4s2-03-chongtu': 'When Conflicts Happen',
  'd4s2-04-maidongxi': 'The Know-how of Buying Things',
  'd4s2-05-heli': 'Sensible Spending',
  'd4s2-06-bimian': 'How Much Waste Could Be Avoided',
  'd4s2-07-yishi': 'Where Our Food and Clothes Come From',
  'd4s2-08-nalilai': 'Where Do These Things Come From',
  'd4s2-09-tamen': "Life Can't Do Without Them",
  'd4s2-10-fengsu': 'Our Local Customs',
  'd4s2-11-yishu': 'Colorful Folk Arts',
  'd4s2-12-xiyou': "Our Hometown's Joys and Worries",
}

const UNIT_TITLE_EN: Record<string, string> = {
  d4s1u1: 'Our Class',
  d4s1u2: 'Growing Up',
  d4s1u3: 'Living in the Information Society',
  d4s1u4: 'Be a Civil Consumer',
  d4s2u1: 'Friends and Getting Along',
  d4s2u2: 'Be a Smart Consumer',
  d4s2u3: 'Where Does a Good Life Come From',
  d4s2u4: 'Hometown Culture and Development',
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: UNIT_TITLE_EN },
)

// 知识点与单元标题的拼音（练习页页头、地图），与 curriculum.ts 的中文逐字对齐
export const TITLE_PINYIN: Record<string, string> = {
  'kp.d4s1-01-banjiti': 'rè ài bān jí tǐ',
  'kp.d4s1-02-xuanju': 'xuǎn jǔ bān wěi huì',
  'kp.d4s1-03-xieshang': 'xié shāng jué dìng bān jí shì wù',
  'kp.d4s1-04-dute': 'wǒ shì dú tè de',
  'kp.d4s1-05-shengming': 'shēng mìng zuì bǎo guì',
  'kp.d4s1-06-baohu': 'zì wǒ bǎo hù miǎn shòu shāng hài',
  'kp.d4s1-07-shenqi': 'shén qí de shì jiè',
  'kp.d4s1-08-qiangzou': 'bié ràng tā qiǎng zǒu tài duō',
  'kp.d4s1-09-shangwang': 'ān quán wén míng shàng wǎng',
  'kp.d4s1-10-gouwu': 'gòu wù yǒu xué wen',
  'kp.d4s1-11-xiaofei': 'xué huì hé lǐ xiāo fèi',
  'kp.d4s1-12-langfei': 'fǎn duì làng fèi',
  'kp.d4s2-01-pengyou': 'wǒ men de hǎo péng you',
  'kp.d4s2-02-suanshu': 'shuō huà yào suàn shù',
  'kp.d4s2-03-chongtu': 'dāng chōng tū fā shēng',
  'kp.d4s2-04-maidongxi': 'mǎi dōng xi de xué wen',
  'kp.d4s2-05-heli': 'hé lǐ xiāo fèi',
  'kp.d4s2-06-bimian': 'yǒu duō shao làng fèi běn kě bì miǎn',
  'kp.d4s2-07-yishi': 'wǒ men de yī shí zhī yuán',
  'kp.d4s2-08-nalilai': 'zhè xiē dōng xi nǎ lǐ lái',
  'kp.d4s2-09-tamen': 'shēng huó lí bù kāi tā men',
  'kp.d4s2-10-fengsu': 'wǒ men dāng dì de fēng sú',
  'kp.d4s2-11-yishu': 'duō zī duō cǎi de mín jiān yì shù',
  'kp.d4s2-12-xiyou': 'jiā xiāng de xǐ yǔ yōu',
  'unit.d4s1u1': 'wǒ men de bān jí tǐ',
  'unit.d4s1u2': 'shào nián zài chéng zhǎng',
  'unit.d4s1u3': 'shēng huó zài xìn xī shè huì',
  'unit.d4s1u4': 'zuò wén míng de xiāo fèi zhě',
  'unit.d4s2u1': 'tóng bàn yǔ jiāo wǎng',
  'unit.d4s2u2': 'zuò cōng ming de xiāo fèi zhě',
  'unit.d4s2u3': 'měi hǎo shēng huó nǎ lǐ lái',
  'unit.d4s2u4': 'gǎn shòu jiā xiāng wén huà guān xīn jiā xiāng fā zhǎn',
}

registerPinyin(TITLE_PINYIN)
