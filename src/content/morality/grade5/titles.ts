// 五年级道德与法治的知识点 / 单元名（英文名 + 中文标题的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts；课本不注拼音，拼音照字典定。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

const KP_TITLE_EN: Record<string, string> = {
  'd5s1-01-kaitian': 'An Epoch-Making Event',
  'd5s1-02-daolu': "Exploring the Path of China's Revolution",
  'd5s1-03-kangri': 'The Mainstay of the War of Resistance',
  'd5s1-04-jiefang': 'Winning the War of Liberation',
  'd5s1-05-zhanqilai': 'The Chinese People Have Stood Up',
  'd5s1-06-dangjia': 'The People Are Masters of the Country',
  'd5s1-07-shehuizhuyi': 'Socialism Is Good',
  'd5s1-08-gaige': 'The Grand Plan of Reform and Opening Up',
  'd5s1-09-guoli': 'Growing National Strength',
  'd5s1-10-tongyi': 'Advancing National Reunification',
  'd5s1-11-xinshidai': 'Entering a New Era',
  'd5s1-12-chengjiu': 'Historic Achievements',
  'd5s1-13-zhengcheng': 'Embarking on a New Journey',
  'd5s2-01-bici': "Understanding Each Other's Hearts",
  'd5s2-02-meihao': 'Making Our Home Better',
  'd5s2-03-jiafeng': 'Carrying Forward Good Family Traditions',
  'd5s2-04-gonggong': 'Our Public Life',
  'd5s2-05-zhixu': 'Building Good Public Order',
  'd5s2-06-fengxian': 'I Take Part, I Contribute',
  'd5s2-07-kangzheng': 'Refusing Humiliation, Fighting Bravely',
  'd5s2-08-juexing': 'Ending the Monarchy, Awakening the Nation',
  'd5s2-09-gongchandang': 'China Has the Communist Party',
  'd5s2-10-shengli': 'Victory in the War of Resistance and the War of Liberation',
  'd5s2-11-dongfang': 'Standing Tall in the East',
  'd5s2-12-qiangqilai': 'From Getting Rich to Growing Strong',
}

const UNIT_TITLE_EN: Record<string, string> = {
  d5s1u1: 'Without the Communist Party, There Would Be No New China',
  d5s1u2: 'Building a Socialist New China',
  d5s1u3: 'Carrying Out Reform and Opening Up',
  d5s1u4: 'Opening a New Era',
  d5s2u1: 'We Are Family',
  d5s2u2: 'Public Life Depends on Everyone',
  d5s2u3: 'A Century-Long Dream: Rejuvenating China',
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: UNIT_TITLE_EN },
)

// 知识点与单元标题的拼音（练习页页头、地图），与 curriculum.ts 的中文逐字对齐
export const TITLE_PINYIN: Record<string, string> = {
  'kp.d5s1-01-kaitian': 'kāi tiān pì dì de dà shì biàn',
  'kp.d5s1-02-daolu': 'tàn suǒ zhōng guó gé mìng dào lù',
  'kp.d5s1-03-kangri': 'kàng rì zhàn zhēng de zhōng liú dǐ zhù',
  'kp.d5s1-04-jiefang': 'duó qǔ shèng lì de jiě fàng zhàn zhēng',
  'kp.d5s1-05-zhanqilai': 'zhōng guó rén mín zhàn qǐ lái le',
  'kp.d5s1-06-dangjia': 'rén mín dāng jiā zuò zhǔ',
  'kp.d5s1-07-shehuizhuyi': 'shè huì zhǔ yì hǎo',
  'kp.d5s1-08-gaige': 'gǎi gé kāi fàng zhǎn hóng tú',
  'kp.d5s1-09-guoli': 'zōng hé guó lì rì yì tí shēng',
  'kp.d5s1-10-tongyi': 'zǔ guó tǒng yī dà yè bú duàn tuī jìn',
  'kp.d5s1-11-xinshidai': 'zǒu jìn xīn shí dài',
  'kp.d5s1-12-chengjiu': 'lì shǐ xìng chéng jiù',
  'kp.d5s1-13-zhengcheng': 'kāi qǐ xīn zhēng chéng',
  'kp.d5s2-01-bici': 'dú dǒng bǐ cǐ de xīn',
  'kp.d5s2-02-meihao': 'ràng wǒ men de jiā gèng měi hǎo',
  'kp.d5s2-03-jiafeng': 'hóng yáng yōu xiù jiā fēng',
  'kp.d5s2-04-gonggong': 'wǒ men de gōng gòng shēng huó',
  'kp.d5s2-05-zhixu': 'jiàn lì liáng hǎo de gōng gòng zhì xù',
  'kp.d5s2-06-fengxian': 'wǒ cān yù wǒ fèng xiàn',
  'kp.d5s2-07-kangzheng': 'bù gān qū rǔ fèn yǒng kàng zhēng',
  'kp.d5s2-08-juexing': 'tuī fān dì zhì mín zú jué xǐng',
  'kp.d5s2-09-gongchandang': 'zhōng guó yǒu le gòng chǎn dǎng',
  'kp.d5s2-10-shengli': 'duó qǔ kàng rì zhàn zhēng hé rén mín jiě fàng zhàn zhēng de shèng lì',
  'kp.d5s2-11-dongfang': 'yì lì zài shì jiè de dōng fāng',
  'kp.d5s2-12-qiangqilai': 'fù qǐ lái dào qiáng qǐ lái',
  'unit.d5s1u1': 'méi yǒu gòng chǎn dǎng jiù méi yǒu xīn zhōng guó',
  'unit.d5s1u2': 'jiàn shè shè huì zhǔ yì xīn zhōng guó',
  'unit.d5s1u3': 'jìn xíng gǎi gé kāi fàng',
  'unit.d5s1u4': 'kāi chuàng xīn shí dài',
  'unit.d5s2u1': 'wǒ men yì jiā rén',
  'unit.d5s2u2': 'gōng gòng shēng huó kào dà jiā',
  'unit.d5s2u3': 'bǎi nián zhuī mèng fù xīng zhōng huá',
}

registerPinyin(TITLE_PINYIN)
