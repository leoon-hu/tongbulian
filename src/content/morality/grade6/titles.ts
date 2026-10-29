// 六年级道德与法治的知识点 / 单元名（英文名 + 中文标题的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts；课本不注拼音，拼音照字典定。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

const KP_TITLE_EN: Record<string, string> = {
  'd6s1-01-falv': 'What Is Law',
  'd6s1-02-zuoyong': 'The Power of Law',
  'd6s1-03-xianfa': 'The Constitution Is the Fundamental Law',
  'd6s1-04-gongmin': "I'm a Chinese Citizen",
  'd6s1-05-quanli': "Citizens' Basic Rights and Duties",
  'd6s1-06-jigou': 'Getting to Know State Institutions',
  'd6s1-07-teshu': 'Minors Need Special Protection',
  'd6s1-08-zhuanmen': 'Laws Made to Protect Us',
  'd6s1-09-guanai': 'Special Care Helps Me Grow',
  'd6s1-10-weiquan': 'Use the Law to Protect Your Rights',
  'd6s1-11-shoufa': 'Be a Law-Abiding Citizen',
  'd6s2-01-zunzhong': 'Learn to Respect',
  'd6s2-02-kuanrong': 'Learn to Be Tolerant',
  'd6s2-03-fansi': 'Learn to Reflect',
  'd6s2-04-diqiu': 'Earth, Our Home',
  'd6s2-05-zaihai': 'Coping with Natural Disasters',
  'd6s2-06-wenming': 'Exploring Ancient Civilizations',
  'd6s2-07-duoyuan': 'Diverse Cultures, Varied Charms',
  'd6s2-08-keji': 'Technology Benefits Humanity',
  'd6s2-09-guoji': 'Increasingly Important International Organizations',
  'd6s2-10-heping': 'We Love Peace',
}

const UNIT_TITLE_EN: Record<string, string> = {
  d6s1u1: 'Law in Our Lives',
  d6s1u2: 'Citizens and the Country',
  d6s1u3: 'We Are Specially Protected',
  d6s1u4: 'Know and Obey the Law, Defend Rights by Law',
  d6s2u1: 'Improve Yourself, Grow Up Healthy',
  d6s2u2: "Caring for the Earth Is Everyone's Duty",
  d6s2u3: 'Diverse Civilizations, Colorful Lives',
  d6s2u4: 'Making the World Better',
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: UNIT_TITLE_EN },
)

// 知识点与单元标题的拼音（练习页页头、地图），与 curriculum.ts 的中文逐字对齐
export const TITLE_PINYIN: Record<string, string> = {
  'kp.d6s1-01-falv': 'fǎ lǜ shì shén me',
  'kp.d6s1-02-zuoyong': 'fǎ lǜ zuò yòng dà',
  'kp.d6s1-03-xianfa': 'xiàn fǎ shì gēn běn fǎ',
  'kp.d6s1-04-gongmin': 'wǒ shì zhōng guó gōng mín',
  'kp.d6s1-05-quanli': 'gōng mín de jī běn quán lì hé yì wù',
  'kp.d6s1-06-jigou': 'liǎo jiě guó jiā jī gòu',
  'kp.d6s1-07-teshu': 'wèi chéng nián rén xū tè shū bǎo hù',
  'kp.d6s1-08-zhuanmen': 'zhuān mén fǎ lǜ lái bǎo hù',
  'kp.d6s1-09-guanai': 'tè shū guān ài zhù wǒ chéng zhǎng',
  'kp.d6s1-10-weiquan': 'yòng hǎo fǎ lǜ wéi hù quán lì',
  'kp.d6s1-11-shoufa': 'zuò shǒu fǎ gōng mín',
  'kp.d6s2-01-zunzhong': 'xué huì zūn zhòng',
  'kp.d6s2-02-kuanrong': 'xué huì kuān róng',
  'kp.d6s2-03-fansi': 'xué huì fǎn sī',
  'kp.d6s2-04-diqiu': 'dì qiú wǒ men de jiā yuán',
  'kp.d6s2-05-zaihai': 'yìng duì zì rán zāi hài',
  'kp.d6s2-06-wenming': 'tàn fǎng gǔ dài wén míng',
  'kp.d6s2-07-duoyuan': 'duō yuán wén huà duō yàng mèi lì',
  'kp.d6s2-08-keji': 'kē jì fā zhǎn zào fú rén lèi',
  'kp.d6s2-09-guoji': 'rì yì zhòng yào de guó jì zǔ zhī',
  'kp.d6s2-10-heping': 'wǒ men ài hé píng',
  'unit.d6s1u1': 'shēng huó zhōng de fǎ lǜ',
  'unit.d6s1u2': 'gōng mín yǔ guó jiā',
  'unit.d6s1u3': 'wǒ men shòu tè shū bǎo hù',
  'unit.d6s1u4': 'zhī fǎ shǒu fǎ yī fǎ wéi quán',
  'unit.d6s2u1': 'wán shàn zì wǒ jiàn kāng chéng zhǎng',
  'unit.d6s2u2': 'ài hù dì qiú gòng tóng zé rèn',
  'unit.d6s2u3': 'duō yàng wén míng duō cǎi shēng huó',
  'unit.d6s2u4': 'ràng shì jiè gèng měi hǎo',
}

registerPinyin(TITLE_PINYIN)
