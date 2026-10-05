// 四年级数学的知识点 / 单元名（英文名 + 中文标题的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

// 知识点英文名（中文标题在 curriculum.ts 作单一事实源）
export const KP_TITLE_EN: Record<string, string> = {
  'm4s1-01-within-yi': 'Numbers up to 100 Million',
  'm4s1-01-above-yi': 'Numbers Beyond 100 Million',
  'm4s1-01-compare': 'Comparing Large Numbers',
  'm4s1-01-round': 'Rewriting & Rounding Numbers',
  'm4s1-02-yi': 'How Big Is 100 Million?',
  'm4s1-03-angles': 'More About Angles',
  'm4s1-03-measure': 'Measuring Angles',
  'm4s1-03-draw': 'Drawing Angles',
  'm4s1-04-oral': 'Mental Multiplication',
  'm4s1-04-written': 'Written Multiplication',
  'm4s1-04-pattern': 'How Products Change',
  'm4s1-04-estimate': 'Solving Problems by Estimating',
  'm4s1-05-total-part': 'Total & Parts',
  'm4s1-05-price': 'Unit Price, Quantity & Total Price',
  'm4s1-05-speed': 'Time, Speed & Distance',
  'm4s1-06-parallel': 'Parallel & Perpendicular Lines',
  'm4s1-06-distance': 'Distance from a Point to a Line',
  'm4s1-06-parallelogram': 'Meet Parallelograms',
  'm4s1-06-trapezoid': 'Meet Trapezoids',
  'm4s1-07-single': 'Bar Graphs',
  'm4s1-07-double': 'Double Bar Graphs',
  'm4s1-08-treasure': 'Treasure Hunt at School',
}

export const UNIT_TITLE_EN: Record<string, string> = {
  m4s1u1: 'Numbers Beyond Ten Thousand',
  m4s1u2: 'How Big Is 100 Million?',
  m4s1u3: 'Measuring Angles',
  m4s1u4: 'Multiplying by a Two-Digit Number',
  m4s1u5: 'Addition & Multiplication Models',
  m4s1u6: 'Parallelograms & Trapezoids',
  m4s1u7: 'Bar Graphs',
  m4s1u8: 'Treasure Hunt',
}

/** 知识点标题的拼音（练习页页头注音），与 curriculum.ts 的中文标题逐字对齐（「总量与分量」的分读 fēn：部分的量） */
export const TITLE_PINYIN: Record<string, string> = {
  'kp.m4s1-01-within-yi': 'yì yǐ nèi shù de rèn shi',
  'kp.m4s1-01-above-yi': 'yì yǐ shàng shù de rèn shi',
  'kp.m4s1-01-compare': 'shù de dà xiǎo bǐ jiào',
  'kp.m4s1-01-round': 'shù de gǎi xiě hé qiú jìn sì shù',
  'kp.m4s1-02-yi': 'yì yǒu duō dà',
  'kp.m4s1-03-angles': 'jiǎo de zài rèn shi',
  'kp.m4s1-03-measure': 'jiǎo de dù liàng',
  'kp.m4s1-03-draw': 'huà jiǎo',
  'kp.m4s1-04-oral': 'kǒu suàn chéng fǎ',
  'kp.m4s1-04-written': 'bǐ suàn chéng fǎ',
  'kp.m4s1-04-pattern': 'jī de biàn huà guī lǜ',
  'kp.m4s1-04-estimate': 'yòng gū suàn jiě jué wèn tí',
  'kp.m4s1-05-total-part': 'zǒng liàng yǔ fēn liàng de guān xì',
  'kp.m4s1-05-price': 'dān jià shù liàng hé zǒng jià de guān xì',
  'kp.m4s1-05-speed': 'shí jiān sù dù lù chéng de guān xì',
  'kp.m4s1-06-parallel': 'píng xíng hé chuí zhí',
  'kp.m4s1-06-distance': 'diǎn dào zhí xiàn de jù lí',
  'kp.m4s1-06-parallelogram': 'rèn shi píng xíng sì biān xíng',
  'kp.m4s1-06-trapezoid': 'rèn shi tī xíng',
  'kp.m4s1-07-single': 'dān shì tiáo xíng tǒng jì tú',
  'kp.m4s1-07-double': 'fù shì tiáo xíng tǒng jì tú',
  'kp.m4s1-08-treasure': 'xiào yuán xún bǎo',
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: UNIT_TITLE_EN },
)
registerPinyin(TITLE_PINYIN)
