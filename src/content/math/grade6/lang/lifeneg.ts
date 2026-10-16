// 六上「☆ 生活中的负数」的词条（六年级数学 F），键一律以「m6.lneg.」开头；分正负、0、账单、海拔、读法、算筹这些和六下共用的题用 m6.neg.*（lang/negative.ts）。
// 课本用词：寻找负数、认识负数、应用负数、小讲堂、天气预报、电梯、电子账单、海拔、收支、坐位体前屈、算筹（正算赤、负算黑）。
// 朗读避坑：「−4 ℃～0 ℃」写「−4 ℃ 到 0 ℃」；「还差」（还、差）写「离脚底 4 厘米」；「得数」不写（算出来）；电梯「−1」紧挨着数。
import type { Dict } from '@/engine/i18n'

type Row = [string, string, string, string]

const ROWS: Row[] = [
  ['fc.low', '天气预报说，{c}的气温是 {a} 到 {b}。这一天的最低气温是多少？', 'tiān qì yù bào shuō de qì wēn shì dào zhè yì tiān de zuì dī qì wēn shì duō shao', 'The weather forecast says the temperature in {c} will be {a} to {b}. What is the lowest temperature that day?'],
  ['fc.high', '天气预报说，{c}的气温是 {a} 到 {b}。这一天的最高气温是多少？', 'tiān qì yù bào shuō de qì wēn shì dào zhè yì tiān de zuì gāo qì wēn shì duō shao', 'The weather forecast says the temperature in {c} will be {a} to {b}. What is the highest temperature that day?'],
  ['floor.mean', '电梯按钮上的 −{n} 表示哪一层？', 'diàn tī àn niǔ shàng de biǎo shì nǎ yì céng', 'Which floor does −{n} on the lift buttons mean?'],
  ['floor.write', '地下 {n} 层在电梯按钮上写作什么？', 'dì xià céng zài diàn tī àn niǔ shàng xiě zuò shén me', 'How is basement level {n} shown on the lift buttons?'],
  ['floor.under', '地下 {n} 层', 'dì xià céng', 'basement level {n}'],
  ['floor.over', '地上 {n} 层', 'dì shàng céng', 'floor {n} above ground'],
  ['fam.lead', '我家记录了春节期间的部分收支：正数表示收入，负数表示支出。', 'wǒ jiā jì lù le chūn jié qī jiān de bù fen shōu zhī zhèng shù biǎo shì shōu rù fù shù biǎo shì zhī chū', 'My family wrote down some money in and out during the Spring Festival: positive numbers are money in; negative numbers are money out.'],
  ['fam.mean', '表里的 {v} 元表示什么？', 'biǎo lǐ de yuán biǎo shì shén me', 'What does {v} yuan in the table mean?'],
  ['fam.r.wage', '父母工资', 'fù mǔ gōng zī', 'parents’ wages'],
  ['fam.r.elder', '给老人', 'gěi lǎo rén', 'to grandparents'],
  ['fam.r.gift', '给我和妹妹压岁钱', 'gěi wǒ hé mèi mei yā suì qián', 'New Year money for my sister and me'],
  ['fam.r.goods', '买年货', 'mǎi nián huò', 'Spring Festival shopping'],
  ['fam.elder', '给老人 2000 元，表里记作多少元？', 'gěi lǎo rén yuán biǎo lǐ jì zuò duō shao yuán', '2000 yuan was given to the grandparents. How is it written in the table?'],
  ['fam.gift', '给我和妹妹的压岁钱一共 200 元，表里记作多少元？', 'gěi wǒ hé mèi mei de yā suì qián yí gòng yuán biǎo lǐ jì zuò duō shao yuán', 'New Year money for my sister and me was 200 yuan in all. How is it written in the table?'],
  ['fam.goods', '买年货花了 500 元，表里记作多少元？', 'mǎi nián huò huā le yuán biǎo lǐ jì zuò duō shao yuán', '500 yuan was spent on Spring Festival shopping. How is it written in the table?'],
  ['fam.sum', '表里的收入减去这三项支出，剩下多少元？', 'biǎo lǐ de shōu rù jiǎn qù zhè sān xiàng zhī chū shèng xià duō shao yuán', 'Take the three amounts of money out away from the money in. How much is left?'],
  ['sub.lead', '有了负数，小的数减大的数也能算出来。', 'yǒu le fù shù xiǎo de shù jiǎn dà de shù yě néng suàn chū lái', 'With negative numbers, a smaller number minus a bigger number can be worked out too.'],
  ['sit.rule', '坐位体前屈测试时，把脚底的位置记作 0，手指超过脚底记作正数，没有够到脚底记作负数。', 'zuò wèi tǐ qián qū cè shì shí bǎ jiǎo dǐ de wèi zhì jì zuò shǒu zhǐ chāo guò jiǎo dǐ jì zuò zhèng shù méi yǒu gòu dào jiǎo dǐ jì zuò fù shù', 'In the sit-and-reach test, the soles of the feet are at 0. Reaching past them gives a positive score; not reaching them gives a negative score.'],
  ['sit.over', '小芳的手指超过脚底 {n} 厘米，成绩记作多少厘米？', 'xiǎo fāng de shǒu zhǐ chāo guò jiǎo dǐ lí mǐ chéng jì jì zuò duō shao lí mǐ', 'Fang reaches {n} cm past her soles. How is her score written?'],
  ['sit.short', '小东的手指没有够到脚底，离脚底 {n} 厘米，成绩记作多少厘米？', 'xiǎo dōng de shǒu zhǐ méi yǒu gòu dào jiǎo dǐ lí jiǎo dǐ lí mǐ chéng jì jì zuò duō shao lí mǐ', 'Dong’s fingers stop {n} cm short of his soles. How is his score written?'],
  ['claim.q', '下面哪句话是对的？', 'xià miàn nǎ jù huà shì duì de', 'Which sentence is right?'],
  ['claim.zero', '0 既不是正数，也不是负数', 'jì bú shì zhèng shù yě bú shì fù shù', '0 is neither positive nor negative'],
  ['claim.zeroPos', '0 是正数', 'shì zhèng shù', '0 is a positive number'],
  ['claim.zeroNeg', '0 是负数', 'shì fù shù', '0 is a negative number'],
  ['claim.negPos', '−5 是正数', 'shì zhèng shù', '−5 is a positive number'],
  ['claim.decNeg', '4.7 是负数', 'shì fù shù', '4.7 is a negative number'],
  ['claim.fracNeg', '3/8 是负数', 'shì fù shù', '3/8 is a negative number'],
]

const table = (col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m6.lneg.${r[0]}`, r[col]]))

export const ZH: Dict = table(1)
export const EN: Dict = table(3)
export const PY: Record<string, string> = table(2)
