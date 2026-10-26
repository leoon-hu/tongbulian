// 三年级道德与法治的知识点 / 单元名（英文名 + 中文标题的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts；三年级课本不注拼音，拼音照字典定。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

const KP_TITLE_EN: Record<string, string> = {
  'd3s1-01-chengzhang': 'Learning Helps Me Grow',
  'd3s1-02-kuaile': "I Learn, I'm Happy",
  'd3s1-03-fangfa': 'Ways to Learn',
  'd3s1-04-keji': 'The Power of Science and Technology',
  'd3s1-05-kexuejia': 'Meet the Scientists',
  'd3s1-06-aikexue': 'Love Science from Childhood',
  'd3s1-07-laoshi': 'Getting to Know Our Teachers',
  'd3s1-08-tongxue': 'Classmates Together',
  'd3s1-09-xuexiao': 'Making Our School Better',
  'd3s1-10-gonggong': 'Good Manners in Public Places',
  'd3s1-11-rexin': "We're All Warm-hearted",
  'd3s1-12-guize': 'Life Needs Rules',
  'd3s1-13-anquan': 'Keep Safety in Mind',
  'd3s2-01-xingfu': 'Our Lives Keep Getting Better',
  'd3s2-02-fendou': 'A Happy Life Comes from Hard Work',
  'd3s2-03-laodong': 'Everything Comes from Work',
  'd3s2-04-zhijing': 'Salute to Workers',
  'd3s2-05-ailaodong': 'Love Work from Childhood',
  'd3s2-06-caoxin': 'Give Parents Less to Worry About',
  'd3s2-07-zeren': 'My Part and Duties at Home',
  'd3s2-08-meide': 'Family Virtues',
  'd3s2-09-qingting': 'Learn to Listen',
  'd3s2-10-biaoda': 'Learn to Speak Up',
  'd3s2-11-huzhu': 'Classmates Help Each Other',
  'd3s2-12-chengxin': 'Be Honest with Others',
}

const UNIT_TITLE_EN: Record<string, string> = {
  d3s1u1: 'Be the Master of Your Learning',
  d3s1u2: 'Love Science, Learn Science',
  d3s1u3: 'Growing Up Together',
  d3s1u4: 'Public Life Depends on Everyone',
  d3s2u1: 'Building a Better Life Together',
  d3s2u2: 'Work Is Glorious',
  d3s2u3: "I'm Part of My Family",
  d3s2u4: 'Getting Along with Others',
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: UNIT_TITLE_EN },
)

// 知识点与单元标题的拼音（练习页页头、地图），与 curriculum.ts 的中文逐字对齐
export const TITLE_PINYIN: Record<string, string> = {
  'kp.d3s1-01-chengzhang': 'xué xí bàn wǒ chéng zhǎng',
  'kp.d3s1-02-kuaile': 'wǒ xué xí wǒ kuài lè',
  'kp.d3s1-03-fangfa': 'xué xí yǒu fāng fǎ',
  'kp.d3s1-04-keji': 'kē jì lì liàng dà',
  'kp.d3s1-05-kexuejia': 'zǒu jìn kē xué jiā',
  'kp.d3s1-06-aikexue': 'cóng xiǎo ài kē xué',
  'kp.d3s1-07-laoshi': 'zǒu jìn wǒ men de lǎo shī',
  'kp.d3s1-08-tongxue': 'tóng xué xiāng bàn',
  'kp.d3s1-09-xuexiao': 'ràng wǒ men de xué xiào gèng měi hǎo',
  'kp.d3s1-10-gonggong': 'gōng gòng chǎng suǒ de wén míng sù yǎng',
  'kp.d3s1-11-rexin': 'wǒ men dōu shì rè xīn rén',
  'kp.d3s1-12-guize': 'shēng huó lí bù kāi guī zé',
  'kp.d3s1-13-anquan': 'ān quán jì xīn shàng',
  'kp.d3s2-01-xingfu': 'wǒ men de shēng huó yuè lái yuè xìng fú',
  'kp.d3s2-02-fendou': 'xìng fú shēng huó shì fèn dòu chū lái de',
  'kp.d3s2-03-laodong': 'yí qiè kào láo dòng',
  'kp.d3s2-04-zhijing': 'zhì jìng láo dòng zhě',
  'kp.d3s2-05-ailaodong': 'cóng xiǎo ài láo dòng',
  'kp.d3s2-06-caoxin': 'shǎo ràng fù mǔ cāo xīn',
  'kp.d3s2-07-zeren': 'wǒ de jiā tíng gòng xiàn yǔ zé rèn',
  'kp.d3s2-08-meide': 'hóng yáng jiā tíng měi dé',
  'kp.d3s2-09-qingting': 'xué huì qīng tīng',
  'kp.d3s2-10-biaoda': 'xué huì biǎo dá',
  'kp.d3s2-11-huzhu': 'tóng xué yào hù zhù',
  'kp.d3s2-12-chengxin': 'dài rén yào chéng xìn',
  'unit.d3s1u1': 'zuò xué xí de zhǔ rén',
  'unit.d3s1u2': 'ài kē xué xué kē xué',
  'unit.d3s1u3': 'zài jí tǐ zhōng chéng zhǎng',
  'unit.d3s1u4': 'gōng gòng shēng huó kào dà jiā',
  'unit.d3s2u1': 'gòng jiàn měi hǎo shēng huó',
  'unit.d3s2u2': 'láo dòng zuì guāng róng',
  'unit.d3s2u3': 'wǒ shì jiā tíng yì yuán',
  'unit.d3s2u4': 'wǒ men lái jiāo wǎng',
}

registerPinyin(TITLE_PINYIN)
