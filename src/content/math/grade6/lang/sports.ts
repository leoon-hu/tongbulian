// 六上「☆ 体育中的数学」的词条（六年级数学 D），键一律以「m6.sport.」开头：400 米跑的起跑线怎样设置（课本的数据：直道 85.96 米、
// 第一道两个弯道合成的圆直径 72.6 米、跑道宽 1.22 米、π 取 3.14159），交流分享里的铅球场地、足球赛制。
// 朗读的坑：序数写汉字（第一道……第六道，lane1–lane6 词条带注音，题里用 {lane} 代入）；不说「最长」「全长」「只」「得」；
// 「π 取 3.14159」读「派取三点一四一五九」；400 米、100 米、200 米照写数字。
import type { Dict } from '@/engine/i18n'

/** 一条词条：[键尾, 中文, 拼音, 英文] */
type Row = [string, string, string, string]

const ROWS: Row[] = [
  ['lane1', '第一道', 'dì yī dào', 'lane 1'],
  ['lane2', '第二道', 'dì èr dào', 'lane 2'],
  ['lane3', '第三道', 'dì sān dào', 'lane 3'],
  ['lane4', '第四道', 'dì sì dào', 'lane 4'],
  ['lane5', '第五道', 'dì wǔ dào', 'lane 5'],
  ['lane6', '第六道', 'dì liù dào', 'lane 6'],
  // 选项里的词
  ['w.semi', '半圆', 'bàn yuán', 'Semicircles'],
  ['w.rect', '长方形', 'cháng fāng xíng', 'A rectangle'],
  ['w.tri', '三角形', 'sān jiǎo xíng', 'A triangle'],
  ['w.circle', '圆', 'yuán', 'A circle'],
  ['w.square', '正方形', 'zhèng fāng xíng', 'A square'],
  ['w.sector', '扇形', 'shàn xíng', 'A sector'],
  ['w.outer', '最外面一条', 'zuì wài miàn yì tiáo', 'The outermost lane'],
  ['w.inner', '最里面一条', 'zuì lǐ miàn yì tiáo', 'The innermost lane'],
  ['w.same', '都一样', 'dōu yí yàng', 'All the same'],
  ['w.allStraight', '100 米都在直道上', 'mǐ dōu zài zhí dào shàng', 'All 100 meters are on the straight'],
  ['w.fewer', '100 米跑的人少', 'mǐ pǎo de rén shǎo', 'Fewer people run the 100 meters'],
  ['w.curved', '100 米跑道是弯的', 'mǐ pǎo dào shì wān de', 'The 100-meter track is curved'],
  // 第 1 档
  ['shapeQ', '400 米跑道两头的弯道部分是什么形状？', 'mǐ pǎo dào liǎng tóu de wān dào bù fen shì shén me xíng zhuàng', 'On a 400-meter track, what shape are the bends at the two ends?'],
  ['wholeQ', '跑道两头的两个半圆形弯道，合起来是一个什么图形？', 'pǎo dào liǎng tóu de liǎng gè bàn yuán xíng wān dào hé qǐ lái shì yí gè shén me tú xíng', 'Put together, the two semicircular bends at the ends of the track make which shape?'],
  ['farQ', '终点相同，如果大家都在同一条起跑线上起跑，哪条跑道的同学要跑的路最远？', 'zhōng diǎn xiāng tóng rú guǒ dà jiā dōu zài tóng yì tiáo qǐ pǎo xiàn shàng qǐ pǎo nǎ tiáo pǎo dào de tóng xué yào pǎo de lù zuì yuǎn', 'The finish line is the same for everyone. If everyone started from the same line, the runner in which lane would run the farthest?'],
  ['forwardJ', '400 米跑时，外圈跑道的起跑线要往前移，对吗？', 'mǐ pǎo shí wài quān pǎo dào de qǐ pǎo xiàn yào wǎng qián yí duì ma', 'In a 400-meter race, the start lines of the outer lanes are moved forward. Right?'],
  ['straightJ', '各条跑道直道部分的长度都相等，对吗？', 'gè tiáo pǎo dào zhí dào bù fen de cháng dù dōu xiāng děng duì ma', 'The straight parts of all the lanes are equally long. Right?'],
  ['bendJ', '各条跑道一圈的长度不一样，是因为弯道不一样，对吗？', 'gè tiáo pǎo dào yì quān de cháng dù bù yí yàng shì yīn wèi wān dào bù yí yàng duì ma', 'One lap is a different length in each lane because the bends are different. Right?'],
  ['lapQ', '第一道两条直道的长度都是 85.96 米，两个弯道合起来是 228.08 米。第一道一圈的长度是多少米？', 'dì yī dào liǎng tiáo zhí dào de cháng dù dōu shì mǐ liǎng gè wān dào hé qǐ lái shì mǐ dì yī dào yì quān de cháng dù shì duō shao mǐ', 'In lane 1, each straight is 85.96 meters and the two bends together are 228.08 meters. How many meters is one lap of lane 1?'],
  ['bendsQ', '第一道一圈是 400 米，两条直道的长度都是 85.96 米，两个弯道合起来是多少米？', 'dì yī dào yì quān shì mǐ liǎng tiáo zhí dào de cháng dù dōu shì mǐ liǎng gè wān dào hé qǐ lái shì duō shao mǐ', 'One lap of lane 1 is 400 meters and each straight is 85.96 meters. How many meters are the two bends together?'],
  ['stepQ', '跑道宽 {w} 米，第二道两个弯道合成的圆，直径比第一道多多少米？', 'pǎo dào kuān mǐ dì èr dào liǎng gè wān dào hé chéng de yuán zhí jìng bǐ dì yī dào duō duō shao mǐ', 'Each lane is {w} meters wide. The two bends of lane 2 make a circle. How many meters longer is its diameter than that of lane 1?'],
  ['laneDQ', '第一道两个弯道合成的圆，直径是 72.6 米，跑道宽 1.22 米。{lane}两个弯道合成的圆，直径是多少米？', 'dì yī dào liǎng gè wān dào hé chéng de yuán zhí jìng shì mǐ pǎo dào kuān mǐ liǎng gè wān dào hé chéng de yuán zhí jìng shì duō shao mǐ', 'The two bends of lane 1 make a circle with a diameter of 72.6 meters, and each lane is 1.22 meters wide. What is the diameter of the circle made by the two bends of {lane}?'],
  ['bendQ', '{lane}两个弯道合成的圆，直径是 {d} 米。两个弯道合起来大约是多少米？π 取 3.14159，结果保留两位小数。', 'liǎng gè wān dào hé chéng de yuán zhí jìng shì mǐ liǎng gè wān dào hé qǐ lái dà yuē shì duō shao mǐ qǔ jié guǒ bǎo liú liǎng wèi xiǎo shù', 'The two bends of {lane} make a circle with a diameter of {d} meters. About how many meters are the two bends together? Use 3.14159 for π and round to two decimal places.'],
  ['diffQ', '跑道宽 {w} 米，相邻两条跑道一圈的长度大约相差多少米？π 取 3.14159，结果保留两位小数。', 'pǎo dào kuān mǐ xiāng lín liǎng tiáo pǎo dào yì quān de cháng dù dà yuē xiāng chà duō shao mǐ qǔ jié guǒ bǎo liú liǎng wèi xiǎo shù', 'Each lane is {w} meters wide. About how many meters longer is one lap of a lane than one lap of the lane just inside it? Use 3.14159 for π and round to two decimal places.'],
  ['diffSimpleQ', '跑道宽 {w} 米，相邻两条跑道一圈的长度相差多少米？π 取 3.14。', 'pǎo dào kuān mǐ xiāng lín liǎng tiáo pǎo dào yì quān de cháng dù xiāng chà duō shao mǐ qǔ', 'Each lane is {w} meters wide. How many meters longer is one lap of a lane than one lap of the lane just inside it? Use 3.14 for π.'],
  ['howQ', '跑道宽 1.22 米。不用算出每条跑道的长度，也能算出相邻两条跑道相差多少米，下面哪个算式是对的？', 'pǎo dào kuān mǐ bú yòng suàn chū měi tiáo pǎo dào de cháng dù yě néng suàn chū xiāng lín liǎng tiáo pǎo dào xiāng chà duō shao mǐ xià miàn nǎ ge suàn shì shì duì de', 'Each lane is 1.22 meters wide. Without working out the length of every lane, you can still find how much longer each lane is than the one inside it. Which calculation is right?'],
  ['startQ', '400 米跑时，跑道宽 1.22 米，{lane}的起跑线要比第一道往前移大约多少米？π 取 3.14159，结果保留两位小数。', 'mǐ pǎo shí pǎo dào kuān mǐ de qǐ pǎo xiàn yào bǐ dì yī dào wǎng qián yí dà yuē duō shao mǐ qǔ jié guǒ bǎo liú liǎng wèi xiǎo shù', 'In a 400-meter race each lane is 1.22 meters wide. About how many meters ahead of lane 1 is the start line of {lane}? Use 3.14159 for π and round to two decimal places.'],
  ['startSimpleQ', '400 米跑时，跑道宽 1 米，{lane}的起跑线要比第一道往前移多少米？π 取 3.14。', 'mǐ pǎo shí pǎo dào kuān mǐ de qǐ pǎo xiàn yào bǐ dì yī dào wǎng qián yí duō shao mǐ qǔ', 'In a 400-meter race each lane is 1 meter wide. How many meters ahead of lane 1 is the start line of {lane}? Use 3.14 for π.'],
  ['lap2Q', '第一道一圈是 400 米，相邻两条跑道相差大约 {g} 米。{lane}一圈大约是多少米？', 'dì yī dào yì quān shì mǐ xiāng lín liǎng tiáo pǎo dào xiāng chà dà yuē mǐ yì quān dà yuē shì duō shao mǐ', 'One lap of lane 1 is 400 meters, and each lane is about {g} meters longer than the one inside it. About how many meters is one lap of {lane}?'],
  ['ruleJ', '每条跑道的宽度都一样时，相邻两条跑道一圈的长度相差都一样，对吗？', 'měi tiáo pǎo dào de kuān dù dōu yí yàng shí xiāng lín liǎng tiáo pǎo dào yì quān de cháng dù xiāng chà dōu yí yàng duì ma', 'When all lanes are equally wide, the difference in lap length between neighboring lanes is always the same. Right?'],
  ['sameJ', '每条跑道一圈的长度都一样，对吗？', 'měi tiáo pǎo dào yì quān de cháng dù dōu yí yàng duì ma', 'One lap is the same length in every lane. Right?'],
  ['hundredQ', '100 米跑的起跑线为什么在同一条直线上？', 'mǐ pǎo de qǐ pǎo xiàn wèi shén me zài tóng yì tiáo zhí xiàn shàng', 'Why are the start lines of the 100-meter race all on one straight line?'],
  // 第 2、3 档
  ['t200Q', '200 米跑要经过一个半圆形弯道，跑道宽 {w} 米，相邻两条跑道的起跑线大约相差多少米？π 取 3.14159，结果保留两位小数。', 'mǐ pǎo yào jīng guò yí gè bàn yuán xíng wān dào pǎo dào kuān mǐ xiāng lín liǎng tiáo pǎo dào de qǐ pǎo xiàn dà yuē xiāng chà duō shao mǐ qǔ jié guǒ bǎo liú liǎng wèi xiǎo shù', 'A 200-meter race goes around one semicircular bend, and each lane is {w} meters wide. About how many meters apart are the start lines of neighboring lanes? Use 3.14159 for π and round to two decimal places.'],
  ['t200SimpleQ', '200 米跑要经过一个半圆形弯道，跑道宽 {w} 米，相邻两条跑道的起跑线相差多少米？π 取 3.14。', 'mǐ pǎo yào jīng guò yí gè bàn yuán xíng wān dào pǎo dào kuān mǐ xiāng lín liǎng tiáo pǎo dào de qǐ pǎo xiàn xiāng chà duō shao mǐ qǔ', 'A 200-meter race goes around one semicircular bend, and each lane is {w} meters wide. How many meters apart are the start lines of neighboring lanes? Use 3.14 for π.'],
  ['widerJ', '跑道越宽，相邻两条跑道的起跑线相差越多，对吗？', 'pǎo dào yuè kuān xiāng lín liǎng tiáo pǎo dào de qǐ pǎo xiàn xiāng chà yuè duō duì ma', 'The wider the lanes, the farther apart the start lines of neighboring lanes. Right?'],
  ['robinQ', '{n} 支球队进行循环赛，每两支球队都要比赛一场，一共要比赛多少场？', 'zhī qiú duì jìn xíng xún huán sài měi liǎng zhī qiú duì dōu yào bǐ sài yì chǎng yí gòng yào bǐ sài duō shao chǎng', '{n} teams play a round robin, where every two teams play each other once. How many games are played in all?'],
  ['knockQ', '{n} 支球队进行淘汰赛，每场比赛淘汰一支球队，直到决出冠军，一共要比赛多少场？', 'zhī qiú duì jìn xíng táo tài sài měi chǎng bǐ sài táo tài yì zhī qiú duì zhí dào jué chū guàn jūn yí gòng yào bǐ sài duō shao chǎng', '{n} teams play a knockout tournament. Each game knocks out one team, until there is a champion. How many games are played in all?'],
  ['shotQ', '铅球的场地由一个圆和一个什么图形组成？', 'qiān qiú de chǎng dì yóu yí gè yuán hé yí gè shén me tú xíng zǔ chéng', 'A shot put area is made of a circle and which other shape?'],
  ['fullQ', '{lane}两个弯道合成的圆，直径是 {d} 米，两条直道的长度都是 85.96 米。{lane}一圈大约是多少米？π 取 3.14159，结果保留两位小数。', 'liǎng gè wān dào hé chéng de yuán zhí jìng shì mǐ liǎng tiáo zhí dào de cháng dù dōu shì mǐ yì quān dà yuē shì duō shao mǐ qǔ jié guǒ bǎo liú liǎng wèi xiǎo shù', 'The two bends of {lane} make a circle with a diameter of {d} meters, and each straight is 85.96 meters. About how many meters is one lap of {lane}? Use 3.14159 for π and round to two decimal places.'],
]

const table = (col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m6.sport.${r[0]}`, r[col]]))

export const ZH: Dict = table(1)

export const EN: Dict = table(3)

export const PY: Record<string, string> = table(2)
