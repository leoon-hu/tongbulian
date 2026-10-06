// 四下「小数的意义和性质」的词条（四年级数学下册 C）。
// 课本用词：小数、小数点、整数部分、小数部分、计数单位（十分之一、百分之一……）、进率、数位（十分位、百分位……）、
// 「读作」「写作」、小数的性质、化简、改写、「扩大到原数的 10 倍」「缩小到原数的 1/10」（选项里写成「十分之一」：分母是 1000 的分数画不成两层、读不对）、
// 「用『米』作单位」、近似数、「四舍五入」法、保留一位小数、精确到十分位、用「万」「亿」作单位。比大小写「比一比，填 >、< 或 =」。
// 读法（m4.dec.w.* 一个字一条，m4.dec.seq.<n> 把 n 个字接起来）中英文都是汉字：考的是汉字读法；「二」不写「两」。
// 朗读注意：括号会读成「括号」，句子里不用；要填的数问「几」「多少」；「长」只出现在「长度」「周长」里；「重」只在「体重」里；
// 数字后面不跟「只」。
import type { Dict } from '@/engine/i18n'

// ── 读法的字：一字一条（「一」三条：yī、在千 / 百前面 yì、在万 / 亿前面 yí）──
const W: [string, string, string][] = [
  ['0', '零', 'líng'],
  ['1', '一', 'yī'],
  ['1a', '一', 'yì'],
  ['1b', '一', 'yí'],
  ['2', '二', 'èr'],
  ['3', '三', 'sān'],
  ['4', '四', 'sì'],
  ['5', '五', 'wǔ'],
  ['6', '六', 'liù'],
  ['7', '七', 'qī'],
  ['8', '八', 'bā'],
  ['9', '九', 'jiǔ'],
  ['10', '十', 'shí'],
  ['100', '百', 'bǎi'],
  ['1000', '千', 'qiān'],
  ['wan', '万', 'wàn'],
  ['yi', '亿', 'yì'],
  ['dot', '点', 'diǎn'],
]
/** 读法最长几个字：同 generators/decimals.ts 的 MAX_WORDS */
const SEQ_MAX = 24
const seq: Dict = Object.fromEntries(Array.from({ length: SEQ_MAX }, (_, i) => [`m4.dec.seq.${i + 1}`, Array.from({ length: i + 1 }, (_, k) => `{c${k}}`).join('')]))
const seqPy: Record<string, string> = Object.fromEntries(Array.from({ length: SEQ_MAX }, (_, i) => [`m4.dec.seq.${i + 1}`, '']))

/** 一组词条：[键尾, 中文, 拼音, 英文] */
type Row = [string, string, string, string]
const table = (prefix: string, rows: Row[], col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(rows.map((r) => [`${prefix}.${r[0]}`, r[col]]))

/** 数位：个位 0、十位 1……；十分位 d1、百分位 d2…… */
const PLACE: Row[] = [
  ['4', '万位', 'wàn wèi', 'ten-thousands place'],
  ['3', '千位', 'qiān wèi', 'thousands place'],
  ['2', '百位', 'bǎi wèi', 'hundreds place'],
  ['1', '十位', 'shí wèi', 'tens place'],
  ['0', '个位', 'gè wèi', 'ones place'],
  ['d1', '十分位', 'shí fēn wèi', 'tenths place'],
  ['d2', '百分位', 'bǎi fēn wèi', 'hundredths place'],
  ['d3', '千分位', 'qiān fēn wèi', 'thousandths place'],
  ['d4', '万分位', 'wàn fēn wèi', 'ten-thousandths place'],
]
/** 计数单位（课本的数位顺序表：万、千、百、十、一（个）、十分之一……） */
const UNIT: Row[] = [
  ['4', '万', 'wàn', 'ten thousand'],
  ['3', '千', 'qiān', 'one thousand'],
  ['2', '百', 'bǎi', 'one hundred'],
  ['1', '十', 'shí', 'ten'],
  ['0', '一', 'yī', 'one'],
  ['d1', '十分之一', 'shí fēn zhī yī', 'one tenth'],
  ['d2', '百分之一', 'bǎi fēn zhī yī', 'one hundredth'],
  ['d3', '千分之一', 'qiān fēn zhī yī', 'one thousandth'],
  ['d4', '万分之一', 'wàn fēn zhī yī', 'one ten-thousandth'],
]
/** 「几个计数单位」里的计数单位（英文复数；cu1 是单数） */
const CU: Row[] = [
  ['4', '万', 'wàn', 'ten-thousands'],
  ['3', '千', 'qiān', 'thousands'],
  ['2', '百', 'bǎi', 'hundreds'],
  ['1', '十', 'shí', 'tens'],
  ['0', '一', 'yī', 'ones'],
  ['d1', '十分之一', 'shí fēn zhī yī', 'tenths'],
  ['d2', '百分之一', 'bǎi fēn zhī yī', 'hundredths'],
  ['d3', '千分之一', 'qiān fēn zhī yī', 'thousandths'],
  ['d4', '万分之一', 'wàn fēn zhī yī', 'ten-thousandths'],
]
const CU1: Row[] = [
  ['4', '万', 'wàn', 'ten-thousand'],
  ['3', '千', 'qiān', 'thousand'],
  ['2', '百', 'bǎi', 'hundred'],
  ['1', '十', 'shí', 'ten'],
  ['0', '一', 'yī', 'one'],
  ['d1', '十分之一', 'shí fēn zhī yī', 'tenth'],
  ['d2', '百分之一', 'bǎi fēn zhī yī', 'hundredth'],
  ['d3', '千分之一', 'qiān fēn zhī yī', 'thousandth'],
  ['d4', '万分之一', 'wàn fēn zhī yī', 'ten-thousandth'],
]
/** 「缩小到原数的十分之一」里的几分之一（10 的几次方分之一） */
const PART: Row[] = [
  ['1', '十分之一', 'shí fēn zhī yī', 'one tenth'],
  ['2', '百分之一', 'bǎi fēn zhī yī', 'one hundredth'],
  ['3', '千分之一', 'qiān fēn zhī yī', 'one thousandth'],
  ['4', '万分之一', 'wàn fēn zhī yī', 'one ten-thousandth'],
]
/** 单位（题目文字里写汉字，英文用符号） */
const UNITS: Row[] = [
  ['mm', '毫米', 'háo mǐ', 'mm'],
  ['cm', '厘米', 'lí mǐ', 'cm'],
  ['dm', '分米', 'fēn mǐ', 'dm'],
  ['m', '米', 'mǐ', 'm'],
  ['km', '千米', 'qiān mǐ', 'km'],
  ['g', '克', 'kè', 'g'],
  ['kg', '千克', 'qiān kè', 'kg'],
  ['t', '吨', 'dūn', 't'],
  ['dm2', '平方分米', 'píng fāng fēn mǐ', 'dm²'],
  ['m2', '平方米', 'píng fāng mǐ', 'm²'],
  ['ha', '公顷', 'gōng qǐng', 'hectares'],
  ['km2', '平方千米', 'píng fāng qiān mǐ', 'km²'],
]
/** 移动几位、小数点怎样移动、保留几位 */
const POS: Row[] = [
  ['1', '一位', 'yí wèi', 'one place'],
  ['2', '两位', 'liǎng wèi', 'two places'],
  ['3', '三位', 'sān wèi', 'three places'],
]
const MOVE: Row[] = [
  ['r1', '向右移动一位', 'xiàng yòu yí dòng yí wèi', 'move the decimal point one place to the right'],
  ['r2', '向右移动两位', 'xiàng yòu yí dòng liǎng wèi', 'move the decimal point two places to the right'],
  ['r3', '向右移动三位', 'xiàng yòu yí dòng sān wèi', 'move the decimal point three places to the right'],
  ['l1', '向左移动一位', 'xiàng zuǒ yí dòng yí wèi', 'move the decimal point one place to the left'],
  ['l2', '向左移动两位', 'xiàng zuǒ yí dòng liǎng wèi', 'move the decimal point two places to the left'],
  ['l3', '向左移动三位', 'xiàng zuǒ yí dòng sān wèi', 'move the decimal point three places to the left'],
]
const KEEP: Row[] = [
  ['0', '整数', 'zhěng shù', 'a whole number'],
  ['1', '一位小数', 'yí wèi xiǎo shù', 'one decimal place'],
  ['2', '两位小数', 'liǎng wèi xiǎo shù', 'two decimal places'],
]
/** 「几个计数单位」前面写成汉字的数（「八个十分之一」：后面都跟「个」，所以一读 yí、二写「两」） */
const GE: Row[] = [
  ['1', '一', 'yí', '1'],
  ['2', '两', 'liǎng', '2'],
  ['3', '三', 'sān', '3'],
  ['4', '四', 'sì', '4'],
  ['5', '五', 'wǔ', '5'],
  ['6', '六', 'liù', '6'],
  ['7', '七', 'qī', '7'],
  ['8', '八', 'bā', '8'],
  ['9', '九', 'jiǔ', '9'],
]
/** 人名、动物、商品、商店 */
const WHO: Row[] = [
  ['ming', '小明', 'xiǎo míng', 'Xiaoming'],
  ['lin', '小林', 'xiǎo lín', 'Xiaolin'],
  ['dong', '小东', 'xiǎo dōng', 'Xiaodong'],
  ['jun', '小军', 'xiǎo jūn', 'Xiaojun'],
  ['fang', '小芳', 'xiǎo fāng', 'Xiaofang'],
  ['li', '小丽', 'xiǎo lì', 'Xiaoli'],
  ['gang', '小刚', 'xiǎo gāng', 'Xiaogang'],
  ['hong', '小红', 'xiǎo hóng', 'Xiaohong'],
]
const ANIMAL: Row[] = [
  ['dolphin', '海豚', 'hǎi tún', 'dolphin'],
  ['polar', '北极熊', 'běi jí xióng', 'polar bear'],
  ['penguin', '企鹅', 'qǐ é', 'penguin'],
  ['seal', '海豹', 'hǎi bào', 'seal'],
  ['beluga', '白鲸', 'bái jīng', 'beluga whale'],
  ['elephant', '大象', 'dà xiàng', 'elephant'],
  ['hare', '野兔', 'yě tù', 'hare'],
  ['horse', '马', 'mǎ', 'horse'],
  ['cheetah', '猎豹', 'liè bào', 'cheetah'],
]
const GOODS: Row[] = [
  ['racket', '乒乓球拍', 'pīng pāng qiú pāi', 'Table-tennis bat'],
  ['shuttle', '羽毛球', 'yǔ máo qiú', 'Shuttlecock'],
  ['kick', '毽子', 'jiàn zi', 'Kick shuttlecock'],
]
const SHOP: Row[] = [
  ['a', 'A 商店', 'shāng diàn', 'Shop A'],
  ['b', 'B 商店', 'shāng diàn', 'Shop B'],
  ['c', 'C 商店', 'shāng diàn', 'Shop C'],
  ['racket', '买一个乒乓球拍，去哪个商店买最便宜？', 'mǎi yí gè pīng pāng qiú pāi qù nǎ ge shāng diàn mǎi zuì pián yi', 'Which shop sells the table-tennis bat for the lowest price?'],
  ['shuttle', '买一个羽毛球，去哪个商店买最便宜？', 'mǎi yí gè yǔ máo qiú qù nǎ ge shāng diàn mǎi zuì pián yi', 'Which shop sells the shuttlecock for the lowest price?'],
  ['kick', '买一个毽子，去哪个商店买最便宜？', 'mǎi yí gè jiàn zi qù nǎ ge shāng diàn mǎi zuì pián yi', 'Which shop sells the kick shuttlecock for the lowest price?'],
]
/** 表头 */
const HEAD: Row[] = [
  ['name', '姓名', 'xìng míng', 'name'],
  ['jump', '成绩/m', 'chéng jì', 'result/m'],
  ['weightKg', '体重/kg', 'tǐ zhòng', 'weight/kg'],
  ['weight', '体重', 'tǐ zhòng', 'weight'],
  ['height', '身高', 'shēn gāo', 'height'],
  ['animal', '动物', 'dòng wù', 'animal'],
  ['speed', '速度', 'sù dù', 'speed'],
  ['goods', '商品', 'shāng pǐn', 'item'],
  ['priceYuan', '单价/元', 'dān jià yuán', 'Price/yuan'],
]

/** 题目（键尾、中文、拼音、英文） */
const Q: Row[] = [
  // ── 通用 ──
  ['yes', '对', 'duì', 'Right'],
  ['no', '不对', 'bú duì', 'Wrong'],
  ['compare', '比一比，填 >、< 或 =。', 'bǐ yi bǐ tián huò', 'Compare: fill in >, < or =.'],
  ['cnt', '{n}个{u}', 'gè', '{n} {u}'],
  ['cnt1', '{n}个{u}', 'gè', '{n} {u}'],
  ['intPart', '整数部分', 'zhěng shù bù fen', 'The whole-number part'],
  ['maxOf', '下面哪个数最大？', 'xià miàn nǎ ge shù zuì dà', 'Which number is the greatest?'],
  ['minOf', '下面哪个数最小？', 'xià miàn nǎ ge shù zuì xiǎo', 'Which number is the least?'],
  ['lineRead', '直线上箭头指的数是多少？', 'zhí xiàn shàng jiàn tóu zhǐ de shù shì duō shao', 'What number is the arrow pointing to?'],
  ['conv', '{n} {a}是多少{b}？', 'shì duō shao', '{n} {a} is how many {b}?'],
  // ── 小数的意义：例 1 的三把尺 ──
  [
    'stick.10.dec',
    '把 1 米平均分成 10 份。箭头指着的长度用小数表示是多少米？',
    'bǎ mǐ píng jūn fēn chéng fèn jiàn tóu zhǐ zhe de cháng dù yòng xiǎo shù biǎo shì shì duō shao mǐ',
    '1 m is split into 10 equal parts. Write the length up to the arrow as a decimal, in meters.',
  ],
  [
    'stick.10.frac',
    '把 1 米平均分成 10 份。箭头指着的长度用分数表示是多少米？',
    'bǎ mǐ píng jūn fēn chéng fèn jiàn tóu zhǐ zhe de cháng dù yòng fēn shù biǎo shì shì duō shao mǐ',
    '1 m is split into 10 equal parts. Write the length up to the arrow as a fraction, in meters.',
  ],
  ['stick.10.int', '把 1 米平均分成 10 份。箭头指着的长度是几分米？', 'bǎ mǐ píng jūn fēn chéng fèn jiàn tóu zhǐ zhe de cháng dù shì jǐ fēn mǐ', '1 m is split into 10 equal parts. How many decimeters is the length up to the arrow?'],
  [
    'stick.100.dec',
    '把 1 米平均分成 100 份，每份是 1 厘米。箭头指着的长度用小数表示是多少米？',
    'bǎ mǐ píng jūn fēn chéng fèn měi fèn shì lí mǐ jiàn tóu zhǐ zhe de cháng dù yòng xiǎo shù biǎo shì shì duō shao mǐ',
    '1 m is split into 100 equal parts; each part is 1 cm. Write the length up to the arrow as a decimal, in meters.',
  ],
  [
    'stick.100.frac',
    '把 1 米平均分成 100 份，每份是 1 厘米。箭头指着的长度用分数表示是多少米？',
    'bǎ mǐ píng jūn fēn chéng fèn měi fèn shì lí mǐ jiàn tóu zhǐ zhe de cháng dù yòng fēn shù biǎo shì shì duō shao mǐ',
    '1 m is split into 100 equal parts; each part is 1 cm. Write the length up to the arrow as a fraction, in meters.',
  ],
  [
    'stick.100.int',
    '把 1 米平均分成 100 份，每份是 1 厘米。箭头指着的长度是几厘米？',
    'bǎ mǐ píng jūn fēn chéng fèn měi fèn shì lí mǐ jiàn tóu zhǐ zhe de cháng dù shì jǐ lí mǐ',
    '1 m is split into 100 equal parts; each part is 1 cm. How many centimeters is the length up to the arrow?',
  ],
  [
    'stick.1000.dec',
    '把 1 米平均分成 1000 份，每份是 1 毫米。箭头指着的长度用小数表示是多少米？',
    'bǎ mǐ píng jūn fēn chéng fèn měi fèn shì háo mǐ jiàn tóu zhǐ zhe de cháng dù yòng xiǎo shù biǎo shì shì duō shao mǐ',
    '1 m is split into 1000 equal parts; each part is 1 mm. Write the length up to the arrow as a decimal, in meters.',
  ],
  [
    'stick.1000.int',
    '把 1 米平均分成 1000 份，每份是 1 毫米。箭头指着的长度是几毫米？',
    'bǎ mǐ píng jūn fēn chéng fèn měi fèn shì háo mǐ jiàn tóu zhǐ zhe de cháng dù shì jǐ háo mǐ',
    '1 m is split into 1000 equal parts; each part is 1 mm. How many millimeters is the length up to the arrow?',
  ],
  // ── 小数的意义：做一做的三幅图、涂色 ──
  ['pic.seg.dec', '把一条线段平均分成 10 份，括起来的部分用小数表示是多少？', 'bǎ yì tiáo xiàn duàn píng jūn fēn chéng fèn kuò qǐ lái de bù fen yòng xiǎo shù biǎo shì shì duō shao', 'A line segment is split into 10 equal parts. Write the bracketed part as a decimal.'],
  ['pic.seg.frac', '把一条线段平均分成 10 份，括起来的部分用分数表示是多少？', 'bǎ yì tiáo xiàn duàn píng jūn fēn chéng fèn kuò qǐ lái de bù fen yòng fēn shù biǎo shì shì duō shao', 'A line segment is split into 10 equal parts. Write the bracketed part as a fraction.'],
  ['pic.strip.dec', '把一个正方形平均分成 10 份，涂色部分用小数表示是多少？', 'bǎ yí gè zhèng fāng xíng píng jūn fēn chéng fèn tú sè bù fen yòng xiǎo shù biǎo shì shì duō shao', 'A square is split into 10 equal parts. Write the shaded part as a decimal.'],
  ['pic.strip.frac', '把一个正方形平均分成 10 份，涂色部分用分数表示是多少？', 'bǎ yí gè zhèng fāng xíng píng jūn fēn chéng fèn tú sè bù fen yòng fēn shù biǎo shì shì duō shao', 'A square is split into 10 equal parts. Write the shaded part as a fraction.'],
  ['pic.grid.dec', '把一个正方形平均分成 100 份，涂色部分用小数表示是多少？', 'bǎ yí gè zhèng fāng xíng píng jūn fēn chéng fèn tú sè bù fen yòng xiǎo shù biǎo shì shì duō shao', 'A square is split into 100 equal parts. Write the shaded part as a decimal.'],
  ['pic.grid.frac', '把一个正方形平均分成 100 份，涂色部分用分数表示是多少？', 'bǎ yí gè zhèng fāng xíng píng jūn fēn chéng fèn tú sè bù fen yòng fēn shù biǎo shì shì duō shao', 'A square is split into 100 equal parts. Write the shaded part as a fraction.'],
  ['shadeWhole', '一个正方形表示 1，涂色部分用小数表示是多少？', 'yí gè zhèng fāng xíng biǎo shì tú sè bù fen yòng xiǎo shù biǎo shì shì duō shao', 'One whole square stands for 1. Write the shaded part as a decimal.'],
  ['shadeCircle', '把一个圆平均分成 10 份，涂色部分用小数表示是多少？', 'bǎ yí gè yuán píng jūn fēn chéng fèn tú sè bù fen yòng xiǎo shù biǎo shì shì duō shao', 'A circle is split into 10 equal parts. Write the shaded part as a decimal.'],
  ['rulerM', '尺子上方的线段是多少米？用小数表示。', 'chǐ zi shàng fāng de xiàn duàn shì duō shao mǐ yòng xiǎo shù biǎo shì', 'How many meters is the line segment above the ruler? Write it as a decimal.'],
  // ── 小数的意义：计数单位、进率、分数和小数 ──
  [
    'rate',
    '小数的计数单位中，每相邻两个计数单位之间的进率是多少？',
    'xiǎo shù de jì shù dān wèi zhōng měi xiāng lín liǎng gè jì shù dān wèi zhī jiān de jìn lǜ shì duō shao',
    'Among the counting units of decimals, what is the ratio between any two neighboring units?',
  ],
  ['unitWrite', '{u}写成小数是多少？', 'xiě chéng xiǎo shù shì duō shao', 'Write {u} as a decimal.'],
  ['unitName', '{x} 是哪个计数单位？', 'shì nǎ ge jì shù dān wèi', 'Which counting unit is {x}?'],
  ['countIn', '{x} 里面有几个 {u}？', 'lǐ miàn yǒu jǐ gè', 'How many lots of {u} are there in {x}?'],
  ['countMake', '{n} 个 {u} 是多少？', 'gè shì duō shao', 'What do {n} lots of {u} make?'],
  ['fracToDec', '{f} 写成小数是多少？', 'xiě chéng xiǎo shù shì duō shao', 'Write {f} as a decimal.'],
  ['cardFracToDec', '卡片上的分数写成小数是多少？', 'kǎ piàn shàng de fēn shù xiě chéng xiǎo shù shì duō shao', 'Write the fraction on the card as a decimal.'],
  ['decToFrac', '{x} 写成分数是多少？', 'xiě chéng fēn shù shì duō shao', 'Write {x} as a fraction.'],
  ['tf.denom', '分母是 10、100、1000……的分数可以用小数表示，对吗？', 'fēn mǔ shì de fēn shù kě yǐ yòng xiǎo shù biǎo shì duì ma', 'Fractions with a denominator of 10, 100, 1000… can be written as decimals. Right?'],
  ['tf.m007', '0.07 米就是 7/100 米，对吗？', 'mǐ jiù shì mǐ duì ma', '0.07 m is the same as 7/100 m. Right?'],
  ['tf.d03', '0.3 表示 3/100，对吗？', 'biǎo shì duì ma', '0.3 means 3/100. Right?'],
  ['tf.d005', '0.05 里面有 5 个 1/10，对吗？', 'lǐ miàn yǒu gè duì ma', 'There are 5 lots of 1/10 in 0.05. Right?'],
  [
    'tf.units',
    '小数的计数单位有十分之一、百分之一、千分之一……，对吗？',
    'xiǎo shù de jì shù dān wèi yǒu shí fēn zhī yī bǎi fēn zhī yī qiān fēn zhī yī duì ma',
    'The counting units of decimals include one tenth, one hundredth, one thousandth… Right?',
  ],
  ['tf.rate100', '0.1 和 0.01 之间的进率是 100，对吗？', 'hé zhī jiān de jìn lǜ shì duì ma', 'The ratio between 0.1 and 0.01 is 100. Right?'],
  ['tf.d08', '0.8 里面有 8 个 0.1，对吗？', 'lǐ miàn yǒu gè duì ma', 'There are 8 lots of 0.1 in 0.8. Right?'],
  // ── 小数的读法和写法 ──
  ['readAs', '这个小数读作什么？', 'zhè ge xiǎo shù dú zuò shén me', 'How do you read this decimal in Chinese?'],
  ['writeAs', '「{r}」写作多少？', 'xiě zuò duō shao', 'Write "{r}" in digits.'],
  ['readTf', '这个小数读作{r}，对吗？', 'zhè ge xiǎo shù dú zuò duì ma', 'This decimal is read as {r}. Right?'],
  [
    'tablePlace',
    '小数的数位顺序表里，打问号的那一格是什么数位？',
    'xiǎo shù de shù wèi shùn xù biǎo lǐ dǎ wèn hào de nà yì gé shì shén me shù wèi',
    'In the place-value table for decimals, which place has the question mark?',
  ],
  [
    'tableUnit',
    '小数的数位顺序表里，打问号的那一位的计数单位是什么？',
    'xiǎo shù de shù wèi shùn xù biǎo lǐ dǎ wèn hào de nà yí wèi de jì shù dān wèi shì shén me',
    'In the place-value table for decimals, what is the counting unit of the place with the question mark?',
  ],
  ['markPlace', '画横线的数字在什么数位上？', 'huà héng xiàn de shù zì zài shén me shù wèi shàng', 'Which place is the underlined digit in?'],
  ['markMeans', '画横线的数字表示什么？', 'huà héng xiàn de shù zì biǎo shì shén me', 'What does the underlined digit stand for?'],
  ['comp3.a', '{x} 是由几个一、{b}个十分之一和{c}个百分之一组成的？', 'shì yóu jǐ gè yī gè shí fēn zhī yī hé gè bǎi fēn zhī yī zǔ chéng de', '{x} is made of how many ones, {b} tenths and {c} hundredths?'],
  ['comp3.b', '{x} 是由{a}个一、几个十分之一和{c}个百分之一组成的？', 'shì yóu gè yī jǐ gè shí fēn zhī yī hé gè bǎi fēn zhī yī zǔ chéng de', '{x} is made of {a} ones, how many tenths and {c} hundredths?'],
  ['comp3.c', '{x} 是由{a}个一、{b}个十分之一和几个百分之一组成的？', 'shì yóu gè yī gè shí fēn zhī yī hé jǐ gè bǎi fēn zhī yī zǔ chéng de', '{x} is made of {a} ones, {b} tenths and how many hundredths?'],
  [
    'comp4.a',
    '{x} 是由几个一、{b}个十分之一、{c}个百分之一和{d}个千分之一组成的？',
    'shì yóu jǐ gè yī gè shí fēn zhī yī gè bǎi fēn zhī yī hé gè qiān fēn zhī yī zǔ chéng de',
    '{x} is made of how many ones, {b} tenths, {c} hundredths and {d} thousandths?',
  ],
  [
    'comp4.b',
    '{x} 是由{a}个一、几个十分之一、{c}个百分之一和{d}个千分之一组成的？',
    'shì yóu gè yī jǐ gè shí fēn zhī yī gè bǎi fēn zhī yī hé gè qiān fēn zhī yī zǔ chéng de',
    '{x} is made of {a} ones, how many tenths, {c} hundredths and {d} thousandths?',
  ],
  [
    'comp4.c',
    '{x} 是由{a}个一、{b}个十分之一、几个百分之一和{d}个千分之一组成的？',
    'shì yóu gè yī gè shí fēn zhī yī jǐ gè bǎi fēn zhī yī hé gè qiān fēn zhī yī zǔ chéng de',
    '{x} is made of {a} ones, {b} tenths, how many hundredths and {d} thousandths?',
  ],
  [
    'comp4.d',
    '{x} 是由{a}个一、{b}个十分之一、{c}个百分之一和几个千分之一组成的？',
    'shì yóu gè yī gè shí fēn zhī yī gè bǎi fēn zhī yī hé jǐ gè qiān fēn zhī yī zǔ chéng de',
    '{x} is made of {a} ones, {b} tenths, {c} hundredths and how many thousandths?',
  ],
  [
    'ctx.ev',
    '2021 年，我国新能源汽车产量达三百六十七点七万辆。三百六十七点七写作多少？',
    'nián wǒ guó xīn néng yuán qì chē chǎn liàng dá sān bǎi liù shí qī diǎn qī wàn liàng sān bǎi liù shí qī diǎn qī xiě zuò duō shao',
    'In 2021, China produced 三百六十七点七万 new-energy vehicles. Write 三百六十七点七 in digits.',
  ],
  [
    'ctx.egg',
    '一只蜂鸟的蛋只有绿豆那么大，大约是零点五五七克。零点五五七写作多少？',
    'yì zhī fēng niǎo de dàn zhǐ yǒu lǜ dòu nà me dà dà yuē shì líng diǎn wǔ wǔ qī kè líng diǎn wǔ wǔ qī xiě zuò duō shao',
    'A hummingbird egg is only as big as a mung bean, about 零点五五七 g. Write 零点五五七 in digits.',
  ],
  [
    'ctx.equator',
    '地球赤道的周长大约是四万零七十五点七千米。四万零七十五点七写作多少？',
    'dì qiú chì dào de zhōu cháng dà yuē shì sì wàn líng qī shí wǔ diǎn qī qiān mǐ sì wàn líng qī shí wǔ diǎn qī xiě zuò duō shao',
    'The Earth’s equator is about 四万零七十五点七 km around. Write 四万零七十五点七 in digits.',
  ],
  [
    'cards.lt1',
    '用 3、0、8、5 和小数点写小数，每个数字都要用上，并且只能用一次。下面哪个数小于 1，并且小数部分是三位？',
    'yòng hé xiǎo shù diǎn xiě xiǎo shù měi gè shù zì dōu yào yòng shàng bìng qiě zhǐ néng yòng yí cì xià miàn nǎ ge shù xiǎo yú bìng qiě xiǎo shù bù fen shì sān wèi',
    'Use 3, 0, 8, 5 and a decimal point to write a decimal, using each digit exactly once. Which one is less than 1 and has three decimal places?',
  ],
  [
    'cards.gt8',
    '用 3、0、8、5 和小数点写小数，每个数字都要用上，并且只能用一次。下面哪个数大于 8，并且小数部分是三位？',
    'yòng hé xiǎo shù diǎn xiě xiǎo shù měi gè shù zì dōu yào yòng shàng bìng qiě zhǐ néng yòng yí cì xià miàn nǎ ge shù dà yú bìng qiě xiǎo shù bù fen shì sān wèi',
    'Use 3, 0, 8, 5 and a decimal point to write a decimal, using each digit exactly once. Which one is greater than 8 and has three decimal places?',
  ],
  [
    'cards.silent',
    '用 3、0、8、5 和小数点写小数，每个数字都要用上，并且只能用一次。下面哪个数的 0 不读出来，并且小数部分是两位？',
    'yòng hé xiǎo shù diǎn xiě xiǎo shù měi gè shù zì dōu yào yòng shàng bìng qiě zhǐ néng yòng yí cì xià miàn nǎ ge shù de bù dú chū lái bìng qiě xiǎo shù bù fen shì liǎng wèi',
    'Use 3, 0, 8, 5 and a decimal point to write a decimal, using each digit exactly once. In which one is the 0 not read aloud, with two decimal places?',
  ],
  // ── 小数的性质 ──
  ['cmpMM', '{a} 米 ○ {b} 米', 'mǐ mǐ', '{a} m ○ {b} m'],
  ['cmpYuan', '{a} 元 ○ {b} 元', 'yuán yuán', '{a} yuan ○ {b} yuan'],
  ['sameIn', '{x} 是 {n} 个 0.01，也就是几个 0.1？', 'shì gè yě jiù shì jǐ gè', '{x} is {n} lots of 0.01. How many lots of 0.1 is that?'],
  ['rule.main', '小数的末尾添上 0 或去掉 0，小数的大小不变，对吗？', 'xiǎo shù de mò wěi tiān shàng huò qù diào xiǎo shù de dà xiǎo bú biàn duì ma', 'Adding or removing 0s at the end of a decimal does not change its value. Right?'],
  ['rule.end', '{x} 的末尾添上一个 0，它的大小不变，对吗？', 'de mò wěi tiān shàng yí gè tā de dà xiǎo bú biàn duì ma', 'Put a 0 at the end of {x}. Its value does not change. Right?'],
  ['rule.midZero', '{x} 去掉中间的 0，变成 {y}，大小不变，对吗？', 'qù diào zhōng jiān de biàn chéng dà xiǎo bú biàn duì ma', 'Take away the 0 in the middle of {x} to get {y}. The value does not change. Right?'],
  ['rule.dropEnd', '{x} 去掉末尾的 0，变成 {y}，大小不变，对吗？', 'qù diào mò wěi de biàn chéng dà xiǎo bú biàn duì ma', 'Take away the 0s at the end of {x} to get {y}. The value does not change. Right?'],
  ['rule.eq', '{a} 和 {b} 大小相等，对吗？', 'hé dà xiǎo xiāng děng duì ma', '{a} and {b} are equal. Right?'],
  ['simplify', '{x} 化简后是多少？', 'huà jiǎn hòu shì duō shao', 'Simplify {x}.'],
  ['pad3', '不改变 {x} 的大小，把它写成三位小数是多少？', 'bù gǎi biàn de dà xiǎo bǎ tā xiě chéng sān wèi xiǎo shù shì duō shao', 'Without changing its value, write {x} with three decimal places.'],
  ['zeroCan', '不改变数的大小，下面哪个数里的 0 可以去掉？', 'bù gǎi biàn shù de dà xiǎo xià miàn nǎ ge shù lǐ de kě yǐ qù diào', 'Without changing the value, in which number can a 0 be taken away?'],
  ['zeroCannot', '不改变数的大小，下面哪个数里的 0 都不能去掉？', 'bù gǎi biàn shù de dà xiǎo xià miàn nǎ ge shù lǐ de dōu bù néng qù diào', 'Without changing the value, in which number can none of the 0s be taken away?'],
  ['equalTo', '下面哪个数和 {x} 相等？', 'xià miàn nǎ ge shù hé xiāng děng', 'Which number is equal to {x}?'],
  ['append', '{x} 的末尾添上一个 0，它的大小变不变？', 'de mò wěi tiān shàng yí gè tā de dà xiǎo biàn bu biàn', 'Put a 0 at the end of {x}. Does its value change?'],
  ['noChange', '不变', 'bú biàn', 'It does not change'],
  ['changed', '变了', 'biàn le', 'It changes'],
  ['price.yj', '{a} 元 {b} 角，以元为单位、用两位小数表示是多少元？', 'yuán jiǎo yǐ yuán wéi dān wèi yòng liǎng wèi xiǎo shù biǎo shì shì duō shao yuán', '{a} yuan {b} jiao: write it in yuan with two decimal places.'],
  ['price.y', '{a} 元，以元为单位、用两位小数表示是多少元？', 'yuán yǐ yuán wéi dān wèi yòng liǎng wèi xiǎo shù biǎo shì shì duō shao yuán', '{a} yuan: write it in yuan with two decimal places.'],
  ['price.j', '{b} 角，以元为单位、用两位小数表示是多少元？', 'jiǎo yǐ yuán wéi dān wèi yòng liǎng wèi xiǎo shù biǎo shì shì duō shao yuán', '{b} jiao: write it in yuan with two decimal places.'],
  // ── 小数的大小比较 ──
  ['jump.first', '下面是四名同学的跳远成绩，谁跳得最远？', 'xià miàn shì sì míng tóng xué de tiào yuǎn chéng jì shuí tiào de zuì yuǎn', 'Here are four students’ long-jump results. Who jumped the farthest?'],
  ['jump.second', '下面是四名同学的跳远成绩，谁排第二名？', 'xià miàn shì sì míng tóng xué de tiào yuǎn chéng jì shuí pái dì èr míng', 'Here are four students’ long-jump results. Who came second?'],
  ['jump.third', '下面是四名同学的跳远成绩，谁排第三名？', 'xià miàn shì sì míng tóng xué de tiào yuǎn chéng jì shuí pái dì sān míng', 'Here are four students’ long-jump results. Who came third?'],
  ['jump.last', '下面是四名同学的跳远成绩，谁跳得最近？', 'xià miàn shì sì míng tóng xué de tiào yuǎn chéng jì shuí tiào de zuì jìn', 'Here are four students’ long-jump results. Who jumped the shortest distance?'],
  ['step', '比较 {a} 和 {b} 的大小，要比到哪里才能分出大小？', 'bǐ jiào hé de dà xiǎo yào bǐ dào nǎ lǐ cái néng fēn chū dà xiǎo', 'When comparing {a} and {b}, where do you find the difference?'],
  ['weightMax', '谁的体重最大？', 'shuí de tǐ zhòng zuì dà', 'Whose weight is the greatest?'],
  ['weightMin', '谁的体重最小？', 'shuí de tǐ zhòng zuì xiǎo', 'Whose weight is the least?'],
  ['cards234.count', '用数字卡片 {a}、{b}、{c} 和小数点组成小数，每张卡片都要用上，能组成多少个不同的小数？', 'yòng shù zì kǎ piàn hé xiǎo shù diǎn zǔ chéng xiǎo shù měi zhāng kǎ piàn dōu yào yòng shàng néng zǔ chéng duō shao gè bù tóng de xiǎo shù', 'Use the digit cards {a}, {b}, {c} and a decimal point, using every card. How many different decimals can you make?'],
  ['cards234.max', '用数字卡片 {a}、{b}、{c} 和小数点组成小数，每张卡片都要用上，最大的是多少？', 'yòng shù zì kǎ piàn hé xiǎo shù diǎn zǔ chéng xiǎo shù měi zhāng kǎ piàn dōu yào yòng shàng zuì dà de shì duō shao', 'Use the digit cards {a}, {b}, {c} and a decimal point, using every card. What is the greatest decimal you can make?'],
  ['cards234.min', '用数字卡片 {a}、{b}、{c} 和小数点组成小数，每张卡片都要用上，最小的是多少？', 'yòng shù zì kǎ piàn hé xiǎo shù diǎn zǔ chéng xiǎo shù měi zhāng kǎ piàn dōu yào yòng shàng zuì xiǎo de shì duō shao', 'Use the digit cards {a}, {b}, {c} and a decimal point, using every card. What is the least decimal you can make?'],
  // ── 小数点移动引起小数大小的变化 ──
  ['bigger', '扩大到原数的 {n} 倍', 'kuò dà dào yuán shù de bèi', '{n} times the original number'],
  ['smaller', '缩小到原数的{f}', 'suō xiǎo dào yuán shù de', '{f} of the original number'],
  ['ruleRight', '小数点向右移动{m}，小数就扩大到原数的多少倍？', 'xiǎo shù diǎn xiàng yòu yí dòng xiǎo shù jiù kuò dà dào yuán shù de duō shao bèi', 'Move the decimal point {m} to the right. How many times the original number does it become?'],
  ['ruleLeft', '小数点向左移动{m}，小数就缩小到原数的几分之一？', 'xiǎo shù diǎn xiàng zuǒ yí dòng xiǎo shù jiù suō xiǎo dào yuán shù de jǐ fēn zhī yī', 'Move the decimal point {m} to the left. What fraction of the original number does it become?'],
  ['howMoveMul', '把一个小数乘 {n}，小数点要怎样移动？', 'bǎ yí gè xiǎo shù chéng xiǎo shù diǎn yào zěn yàng yí dòng', 'To multiply a decimal by {n}, how do you move the decimal point?'],
  ['howMoveDiv', '把一个小数除以 {n}，小数点要怎样移动？', 'bǎ yí gè xiǎo shù chú yǐ xiǎo shù diǎn yào zěn yàng yí dòng', 'To divide a decimal by {n}, how do you move the decimal point?'],
  ['staffTimes', '金箍棒从 {a} 米变成 {b} 米，长度扩大到原来的多少倍？', 'jīn gū bàng cóng mǐ biàn chéng mǐ cháng dù kuò dà dào yuán lái de duō shao bèi', 'The magic staff grows from {a} m to {b} m. How many times its original length is it now?'],
  ['change', '{a} 改写成 {b}，它的大小有什么变化？', 'gǎi xiě chéng tā de dà xiǎo yǒu shén me biàn huà', '{a} is changed into {b}. How has its value changed?'],
  ['mulTimes', '把 {x} 扩大到原数的 {n} 倍是多少？', 'bǎ kuò dà dào yuán shù de bèi shì duō shao', 'What is {x} made {n} times as large?'],
  ['divPart', '把 {x} 缩小到原数的{f}是多少？', 'bǎ suō xiǎo dào yuán shù de shì duō shao', 'What is {f} of {x}?'],
  ['move', '{x} 的小数点{m}，得到的数是多少？', 'de xiǎo shù diǎn dé dào de shù shì duō shao', 'In {x}, {m}. What number do you get?'],
  ['timesTo', '{a} 扩大到它的多少倍是 {b}？', 'kuò dà dào tā de duō shao bèi shì', 'How many times {a} is {b}?'],
  ['partTo', '{a} 缩小到它的几分之一是 {b}？', 'suō xiǎo dào tā de jǐ fēn zhī yī shì', 'What fraction of {a} is {b}?'],
  ['buy.eraser', '一块橡皮 {p} 元，买 {n} 块要多少元？', 'yí kuài xiàng pí yuán mǎi kuài yào duō shao yuán', 'An eraser costs {p} yuan. How much do {n} erasers cost?'],
  ['buy.book', '一本练习本 {p} 元，买 {n} 本要多少元？', 'yì běn liàn xí běn yuán mǎi běn yào duō shao yuán', 'An exercise book costs {p} yuan. How much do {n} exercise books cost?'],
  ['buy.ruler', '一把直尺 {p} 元，买 {n} 把要多少元？', 'yì bǎ zhí chǐ yuán mǎi bǎ yào duō shao yuán', 'A ruler costs {p} yuan. How much do {n} rulers cost?'],
  ['opMul', '乘 {n}', 'chéng', 'times {n}'],
  ['opDiv', '除以 {n}', 'chú yǐ', 'divided by {n}'],
  ['fan', '{a} 怎样变成 {b}？', 'zěn yàng biàn chéng', 'How do you turn {a} into {b}?'],
  // ── 小数与单位换算 ──
  ['compound', '{a} {ua} {b} {ub}是多少{ua}？', 'shì duō shao', '{a} {ua} {b} {ub} is how many {ua}?'],
  ['tc.yjf', '{x} 元是 {a} 元几角 {c} 分？', 'yuán shì yuán jǐ jiǎo fēn', '{x} yuan is {a} yuan, how many jiao and {c} fen?'],
  ['tc.mcm', '{x} 米是 {a} 米多少厘米？', 'mǐ shì mǐ duō shao lí mǐ', '{x} m is {a} m and how many cm?'],
  ['tc.kgg', '{x} 千克是 {a} 千克多少克？', 'qiān kè shì qiān kè duō shao kè', '{x} kg is {a} kg and how many g?'],
  ['tc.tkg', '{x} 吨是 {a} 吨多少千克？', 'dūn shì dūn duō shao qiān kè', '{x} t is {a} t and how many kg?'],
  ['tallest', '谁最高？', 'shuí zuì gāo', 'Who is the tallest?'],
  ['shortest', '谁最矮？', 'shuí zuì ǎi', 'Who is the shortest?'],
  ['animalMax', '表里哪种动物的体重最大？', 'biǎo lǐ nǎ zhǒng dòng wù de tǐ zhòng zuì dà', 'Which animal in the table is the heaviest?'],
  ['animalMin', '表里哪种动物的体重最小？', 'biǎo lǐ nǎ zhǒng dòng wù de tǐ zhòng zuì xiǎo', 'Which animal in the table is the lightest?'],
  ['animalPair', '{a}和{b}，谁的体重大？', 'hé shuí de tǐ zhòng dà', 'Which is heavier: the {a} or the {b}?'],
  ['cmpU', '{a} {ua} ○ {b} {ub}', '', '{a} {ua} ○ {b} {ub}'],
  ['scaleKg', '秤上的东西有多少千克？', 'chèng shàng de dōng xi yǒu duō shao qiān kè', 'How many kilograms is the thing on the scale?'],
  ['scaleG', '秤上的东西有多少克？', 'chèng shàng de dōng xi yǒu duō shao kè', 'How many grams is the thing on the scale?'],
  ['kmPerMin', '{n} 千米/分', 'qiān mǐ fēn', '{n} km/min'],
  ['mPerMin', '{n} 米/分', 'mǐ fēn', '{n} m/min'],
  ['fastest', '表里哪种动物跑得最快？', 'biǎo lǐ nǎ zhǒng dòng wù pǎo de zuì kuài', 'Which animal in the table runs the fastest?'],
  ['slowest', '表里哪种动物跑得最慢？', 'biǎo lǐ nǎ zhǒng dòng wù pǎo de zuì màn', 'Which animal in the table runs the slowest?'],
  ['fasterPair', '{a}和{b}，谁跑得快？', 'hé shuí pǎo de kuài', 'Which runs faster: the {a} or the {b}?'],
  [
    'data.dive',
    '「奋斗者」号潜水器下潜深度达到了 10909 米，用千米作单位是多少千米？',
    'fèn dòu zhě hào qián shuǐ qì xià qián shēn dù dá dào le mǐ yòng qiān mǐ zuò dān wèi shì duō shao qiān mǐ',
    'The submersible Fendouzhe dove to a depth of 10909 m. How many kilometers is that?',
  ],
  ['data.probe', '嫦娥五号探测器大约有 8.2 吨，用千克作单位是多少千克？', 'cháng é wǔ hào tàn cè qì dà yuē yǒu dūn yòng qiān kè zuò dān wèi shì duō shao qiān kè', 'The Chang’e-5 probe is about 8.2 t. How many kilograms is that?'],
  ['data.marathon', '马拉松比赛全程是 42 千米 195 米，用千米作单位是多少千米？', 'mǎ lā sōng bǐ sài quán chéng shì qiān mǐ mǐ yòng qiān mǐ zuò dān wèi shì duō shao qiān mǐ', 'A marathon is 42 km 195 m long. How many kilometers is that?'],
  ['data.ship', '一艘轮船有 2150000 千克，用吨作单位是多少吨？', 'yì sōu lún chuán yǒu qiān kè yòng dūn zuò dān wèi shì duō shao dūn', 'A ship is 2150000 kg. How many tons is that?'],
  ['data.trench', '马里亚纳海沟最深处达 11034 米，用千米作单位是多少千米？', 'mǎ lǐ yà nà hǎi gōu zuì shēn chù dá mǐ yòng qiān mǐ zuò dān wèi shì duō shao qiān mǐ', 'The deepest point of the Mariana Trench is 11034 m. How many kilometers is that?'],
  ['sound', '声音在空气中大约每秒传播 340 米，每分钟能传播多少千米？', 'shēng yīn zài kōng qì zhōng dà yuē měi miǎo chuán bō mǐ měi fēn zhōng néng chuán bō duō shao qiān mǐ', 'Sound travels about 340 m per second in air. How many kilometers does it travel in a minute?'],
  ['area.ha', '天安门广场占地面积约 44 公顷，是多少平方千米？', 'tiān ān mén guǎng chǎng zhàn dì miàn jī yuē gōng qǐng shì duō shao píng fāng qiān mǐ', 'Tiananmen Square covers about 44 hectares. How many square kilometers is that?'],
  // ── 小数的近似数 ──
  ['roundKeep', '{x} 保留{k}，约是多少？', 'bǎo liú yuē shì duō shao', 'Round {x} to {k}.'],
  ['roundAcc', '{x} 精确到{p}，约是多少？', 'jīng què dào yuē shì duō shao', 'Round {x} to the {p}.'],
  ['roundOmit', '{x} 省略百分位后面的尾数，约是多少？', 'shěng lüè bǎi fēn wèi hòu miàn de wěi shù yuē shì duō shao', 'Leave out the digits after the hundredths place of {x}. About what is it?'],
  ['look', '{x} 保留{k}，要看哪一位上的数？', 'bǎo liú yào kàn nǎ yí wèi shàng de shù', 'To round {x} to {k}, which place do you look at?'],
  ['sheRu', '{x} 保留{k}，要看的那一位上是 {n}，应该怎么办？', 'bǎo liú yào kàn de nà yí wèi shàng shì yīng gāi zěn me bàn', 'To round {x} to {k}, the digit you look at is {n}. What do you do?'],
  ['she', '舍去', 'shě qù', 'Drop it'],
  ['ru', '向前一位进 1', 'xiàng qián yí wèi jìn', 'Carry 1 to the place before it'],
  ['precPlace', '保留{k}，表示精确到哪一位？', 'bǎo liú biǎo shì jīng què dào nǎ yí wèi', 'Rounding to {k} means rounding to which place?'],
  ['precKeep', '精确到{p}，就是保留几位小数？', 'jīng què dào jiù shì bǎo liú jǐ wèi xiǎo shù', 'Rounding to the {p} means keeping how many decimal places?'],
  ['rtf.keep0', '0.984 保留一位小数约是 1.0，末尾的 0 不能去掉，对吗？', 'bǎo liú yí wèi xiǎo shù yuē shì mò wěi de bù néng qù diào duì ma', '0.984 rounded to one decimal place is about 1.0, and the 0 at the end must stay. Right?'],
  ['rtf.d0596', '0.596 保留两位小数是 0.6，对吗？', 'bǎo liú liǎng wèi xiǎo shù shì duì ma', '0.596 rounded to two decimal places is 0.6. Right?'],
  ['rtf.d356', '3.56 精确到十分位是 4，对吗？', 'jīng què dào shí fēn wèi shì duì ma', '3.56 rounded to the tenths place is 4. Right?'],
  ['rtf.d605', '6.05 和 6.0599 保留一位小数都是 6.1，对吗？', 'hé bǎo liú yí wèi xiǎo shù dōu shì duì ma', '6.05 and 6.0599 both round to 6.1 to one decimal place. Right?'],
  ['rtf.d3007', '3.007 保留一位小数是 3.0，对吗？', 'bǎo liú yí wèi xiǎo shù shì duì ma', '3.007 rounded to one decimal place is 3.0. Right?'],
  ['rtf.d529', '5.29 在 5 和 6 之间，它约等于 5，对吗？', 'zài hé zhī jiān tā yuē děng yú duì ma', '5.29 is between 5 and 6, and it is about 5. Right?'],
  ['rtf.d632', '近似数是 6.32 的三位小数不止一个，对吗？', 'jìn sì shù shì de sān wèi xiǎo shù bù zhǐ yí gè duì ma', 'More than one three-place decimal rounds to 6.32. Right?'],
  [
    'rtf.d520',
    '按照「四舍五入」法，近似数是 5.20 的最大的三位小数是 5.204，对吗？',
    'àn zhào sì shě wǔ rù fǎ jìn sì shù shì de zuì dà de sān wèi xiǎo shù shì duì ma',
    'By rounding, the greatest three-place decimal that rounds to 5.20 is 5.204. Right?',
  ],
  ['rtf.dropEnd', '近似数 3.60 末尾的 0 可以去掉，写成 3.6，对吗？', 'jìn sì shù mò wěi de kě yǐ qù diào xiě chéng duì ma', 'The 0 at the end of the approximate number 3.60 can be dropped to write 3.6. Right?'],
  ['toWan', '改写成用「万」作单位的数是多少万？', 'gǎi xiě chéng yòng wàn zuò dān wèi de shù shì duō shao wàn', 'Rewrite it using 万 as the unit. How many 万 is it?'],
  ['toYi', '改写成用「亿」作单位的数是多少亿？', 'gǎi xiě chéng yòng yì zuò dān wèi de shù shì duō shao yì', 'Rewrite it using 亿 as the unit. How many 亿 is it?'],
  ['roundWan', '先改写成用「万」作单位的数，再保留{k}，约是多少万？', 'xiān gǎi xiě chéng yòng wàn zuò dān wèi de shù zài bǎo liú yuē shì duō shao wàn', 'Rewrite it using 万 as the unit, then round to {k}. About how many 万 is it?'],
  ['roundYi', '先改写成用「亿」作单位的数，再保留{k}，约是多少亿？', 'xiān gǎi xiě chéng yòng yì zuò dān wèi de shù zài bǎo liú yuē shì duō shao yì', 'Rewrite it using 亿 as the unit, then round to {k}. About how many 亿 is it?'],
  [
    'rctx.moon',
    '下面是地球与月球的平均距离，单位是千米。改写成用「万」作单位的数是多少万千米？',
    'xià miàn shì dì qiú yǔ yuè qiú de píng jūn jù lí dān wèi shì qiān mǐ gǎi xiě chéng yòng wàn zuò dān wèi de shù shì duō shao wàn qiān mǐ',
    'Below is the average distance between the Earth and the Moon, in km. Rewritten with 万 as the unit, how many 万 km is it?',
  ],
  [
    'rctx.fridge',
    '下面是我国 2021 年冰箱的产量，单位是台。改写成用「万」作单位的数是多少万台？',
    'xià miàn shì wǒ guó nián bīng xiāng de chǎn liàng dān wèi shì tái gǎi xiě chéng yòng wàn zuò dān wèi de shù shì duō shao wàn tái',
    'Below is the number of fridges China made in 2021. Rewritten with 万 as the unit, how many 万 is that?',
  ],
  [
    'rctx.hainan',
    '海南岛是我国第二大岛，下面是它的面积，单位是平方千米。改写成用「万」作单位的数是多少万平方千米？',
    'hǎi nán dǎo shì wǒ guó dì èr dà dǎo xià miàn shì tā de miàn jī dān wèi shì píng fāng qiān mǐ gǎi xiě chéng yòng wàn zuò dān wèi de shù shì duō shao wàn píng fāng qiān mǐ',
    'Hainan Island is China’s second-largest island. Below is its area in km². Rewritten with 万 as the unit, how many 万 km² is it?',
  ],
  [
    'rctx.jupiter',
    '下面是木星与太阳的平均距离，单位是千米。约是多少亿千米？保留一位小数。',
    'xià miàn shì mù xīng yǔ tài yáng de píng jūn jù lí dān wèi shì qiān mǐ yuē shì duō shao yì qiān mǐ bǎo liú yí wèi xiǎo shù',
    'Below is the average distance between Jupiter and the Sun, in km. About how many 亿 km is it, to one decimal place?',
  ],
  [
    'rctx.tv',
    '下面是我国 2021 年电视机的产量，单位是台。约是多少亿台？保留两位小数。',
    'xià miàn shì wǒ guó nián diàn shì jī de chǎn liàng dān wèi shì tái yuē shì duō shao yì tái bǎo liú liǎng wèi xiǎo shù',
    'Below is the number of TV sets China made in 2021. About how many 亿 is that, to two decimal places?',
  ],
  [
    'rctx.people',
    '2020 年第七次全国人口普查，下面是全国总人口，单位是人。约是多少亿人？保留一位小数。',
    'nián dì qī cì quán guó rén kǒu pǔ chá xià miàn shì quán guó zǒng rén kǒu dān wèi shì rén yuē shì duō shao yì rén bǎo liú yí wèi xiǎo shù',
    'The 7th national census in 2020: below is China’s total population. About how many 亿 people is that, to one decimal place?',
  ],
  [
    'rctx.light',
    '下面是光每秒大约传播的距离，单位是千米。约是多少万千米？保留一位小数。',
    'xià miàn shì guāng měi miǎo dà yuē chuán bō de jù lí dān wèi shì qiān mǐ yuē shì duō shao wàn qiān mǐ bǎo liú yí wèi xiǎo shù',
    'Below is about how far light travels in one second, in km. About how many 万 km is that, to one decimal place?',
  ],
  [
    'rctx.taiwan',
    '台湾岛是我国第一大岛，下面是它的面积，单位是平方千米。约是多少万平方千米？保留两位小数。',
    'tái wān dǎo shì wǒ guó dì yī dà dǎo xià miàn shì tā de miàn jī dān wèi shì píng fāng qiān mǐ yuē shì duō shao wàn píng fāng qiān mǐ bǎo liú liǎng wèi xiǎo shù',
    'Taiwan Island is China’s largest island. Below is its area in km². About how many 万 km² is it, to two decimal places?',
  ],
  ['nearInt', '{x} 近似于哪个整数？', 'jìn sì yú nǎ ge zhěng shù', 'Which whole number is {x} closest to?'],
  ['betweenLo', '{x} 在哪两个相邻的整数之间？其中较小的整数是几？', 'zài nǎ liǎng gè xiāng lín de zhěng shù zhī jiān qí zhōng jiào xiǎo de zhěng shù shì jǐ', '{x} lies between which two neighboring whole numbers? What is the smaller one?'],
  ['betweenHi', '{x} 在哪两个相邻的整数之间？其中较大的整数是几？', 'zài nǎ liǎng gè xiāng lín de zhěng shù zhī jiān qí zhōng jiào dà de zhěng shù shì jǐ', '{x} lies between which two neighboring whole numbers? What is the greater one?'],
  ['relAsk', '方框里填「=」还是「≈」？', 'fāng kuàng lǐ tián hái shì', 'Which goes in the box: "=" or "≈"?'],
  ['boxShe', '下面哪个两位小数的百分位「四舍」后成为 {x}？', 'xià miàn nǎ ge liǎng wèi xiǎo shù de bǎi fēn wèi sì shě hòu chéng wéi', 'Which two-place decimal becomes {x} when its hundredths digit is rounded down?'],
  ['boxRu', '下面哪个两位小数的百分位「五入」后成为 {x}？', 'xià miàn nǎ ge liǎng wèi xiǎo shù de bǎi fēn wèi wǔ rù hòu chéng wéi', 'Which two-place decimal becomes {x} when its hundredths digit is rounded up?'],
]

const groups: [string, Row[]][] = [
  ['m4.dec.place', PLACE],
  ['m4.dec.unit', UNIT],
  ['m4.dec.cu', CU],
  ['m4.dec.cu1', CU1],
  ['m4.dec.part', PART],
  ['m4.dec.u', UNITS],
  ['m4.dec.pos', POS],
  ['m4.dec.move', MOVE],
  ['m4.dec.keep', KEEP],
  ['m4.dec.ge', GE],
  ['m4.dec.who', WHO],
  ['m4.dec.animal', ANIMAL],
  ['m4.dec.goods', GOODS],
  ['m4.dec.shop', SHOP],
  ['m4.dec.head', HEAD],
  ['m4.dec', Q],
]
const build = (col: 1 | 2 | 3): Record<string, string> => Object.assign({}, ...groups.map(([prefix, rows]) => table(prefix, rows, col)))

export const ZH: Dict = {
  ...Object.fromEntries(W.map(([k, ch]) => [`m4.dec.w.${k}`, ch])),
  ...seq,
  ...build(1),
}
export const EN: Dict = {
  // 读法中英文都是汉字（英文界面问「How do you read this decimal in Chinese?」）
  ...Object.fromEntries(W.map(([k, ch]) => [`m4.dec.w.${k}`, ch])),
  ...seq,
  ...build(3),
}
export const PY: Record<string, string> = {
  ...Object.fromEntries(W.map(([k, , py]) => [`m4.dec.w.${k}`, py])),
  ...seqPy,
  ...build(2),
}
