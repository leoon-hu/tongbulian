// 四上「万以上数的认识」的词条：亿以内数的认识、亿以上数的认识、数的大小比较、数的改写和求近似数。
// 课本用词：计数单位、数位、数级（个级 / 万级 / 亿级）、十进制计数法、自然数；「读作」「写作」；「改写成用『万』作单位的数」；
// 「省略万位后面的尾数」「近似数」「准确数」「四舍五入」法；比大小写「比一比，填 >、< 或 =」（○ 朗读读「和」）。
// 读法（m4.num.w.* 一个字一条，m4.num.seq.<n> 把 n 个字接起来）中英文都是汉字：考的是汉字读法；「二」不写「两」。
// 朗读注意：括号会读成「括号」，句子里不用；要填的数问「几」「多少」；「长」「重」「只」「载」不用（一圈、有……千克、个、潜水器）。
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
]
/** 读法最长几个字：同 generators/numbers.ts 的 MAX_READ_LEN */
const SEQ_MAX = 40
const seq: Dict = Object.fromEntries(Array.from({ length: SEQ_MAX }, (_, i) => [`m4.num.seq.${i + 1}`, Array.from({ length: i + 1 }, (_, k) => `{c${k}}`).join('')]))
const seqPy: Record<string, string> = Object.fromEntries(Array.from({ length: SEQ_MAX }, (_, i) => [`m4.num.seq.${i + 1}`, '']))

/** 一组词条：[键尾, 中文, 拼音, 英文] */
type Row = [string, string, string, string]
const table = (prefix: string, rows: Row[], col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(rows.map((r) => [`${prefix}.${r[0]}`, r[col]]))

/** 计数单位「一万、十万……一千亿」（10 的几次方） */
const POW: Row[] = [
  ['3', '一千', 'yì qiān', 'one thousand'],
  ['4', '一万', 'yí wàn', 'ten thousand'],
  ['5', '十万', 'shí wàn', 'one hundred thousand'],
  ['6', '一百万', 'yì bǎi wàn', 'one million'],
  ['7', '一千万', 'yì qiān wàn', 'ten million'],
  ['8', '一亿', 'yí yì', 'one hundred million'],
  ['9', '十亿', 'shí yì', 'one billion'],
  ['10', '一百亿', 'yì bǎi yì', 'ten billion'],
  ['11', '一千亿', 'yì qiān yì', 'one hundred billion'],
]
/** 数位（第几位：0 = 个位） */
const PLACE: Row[] = [
  ['0', '个位', 'gè wèi', 'ones place'],
  ['1', '十位', 'shí wèi', 'tens place'],
  ['2', '百位', 'bǎi wèi', 'hundreds place'],
  ['3', '千位', 'qiān wèi', 'thousands place'],
  ['4', '万位', 'wàn wèi', 'ten-thousands place'],
  ['5', '十万位', 'shí wàn wèi', 'hundred-thousands place'],
  ['6', '百万位', 'bǎi wàn wèi', 'millions place'],
  ['7', '千万位', 'qiān wàn wèi', 'ten-millions place'],
  ['8', '亿位', 'yì wèi', 'hundred-millions place'],
  ['9', '十亿位', 'shí yì wèi', 'billions place'],
  ['10', '百亿位', 'bǎi yì wèi', 'ten-billions place'],
  ['11', '千亿位', 'qiān yì wèi', 'hundred-billions place'],
]
/** 计数单位（「8个十」「7578个一」「61个亿」） */
const UNIT: Row[] = [
  ['0', '一', 'yī', 'one'],
  ['1', '十', 'shí', 'ten'],
  ['2', '百', 'bǎi', 'hundred'],
  ['3', '千', 'qiān', 'thousand'],
  ['4', '万', 'wàn', 'ten thousand'],
  ['5', '十万', 'shí wàn', 'hundred thousand'],
  ['6', '百万', 'bǎi wàn', 'million'],
  ['7', '千万', 'qiān wàn', 'ten million'],
  ['8', '亿', 'yì', 'hundred million'],
  ['9', '十亿', 'shí yì', 'billion'],
  ['10', '百亿', 'bǎi yì', 'ten billion'],
  ['11', '千亿', 'qiān yì', 'hundred billion'],
]
/** 几位数 */
const LEN: Row[] = [
  ['5', '五位数', 'wǔ wèi shù', 'five-digit number'],
  ['6', '六位数', 'liù wèi shù', 'six-digit number'],
  ['7', '七位数', 'qī wèi shù', 'seven-digit number'],
  ['8', '八位数', 'bā wèi shù', 'eight-digit number'],
  ['9', '九位数', 'jiǔ wèi shù', 'nine-digit number'],
  ['10', '十位数', 'shí wèi shù', 'ten-digit number'],
  ['11', '十一位数', 'shí yī wèi shù', 'eleven-digit number'],
  ['12', '十二位数', 'shí èr wèi shù', 'twelve-digit number'],
]
const LEVEL: Row[] = [
  ['0', '个级', 'gè jí', 'the ones group'],
  ['1', '万级', 'wàn jí', 'the 万 group'],
  ['2', '亿级', 'yì jí', 'the 亿 group'],
]
/** 术语（选项） */
const TERM: Row[] = [
  ['unit', '计数单位', 'jì shù dān wèi', 'Counting units'],
  ['place', '数位', 'shù wèi', 'Places'],
  ['level', '数级', 'shù jí', 'Groups of places'],
  ['decimal', '十进制计数法', 'shí jìn zhì jì shù fǎ', 'The decimal system'],
  ['natural', '自然数', 'zì rán shù', 'Natural numbers'],
  ['round', '「四舍五入」法', 'sì shě wǔ rù fǎ', 'Rounding'],
  ['approx', '近似数', 'jìn sì shù', 'Approximate number'],
  ['exact', '准确数', 'zhǔn què shù', 'Exact number'],
]
/** 农产品（例 6）、行星（练习三 5）、地区（第七次人口普查，p1 / 练习三 3） */
const CROP: Row[] = [
  ['rice', '稻谷', 'dào gǔ', 'rice'],
  ['wheat', '小麦', 'xiǎo mài', 'wheat'],
  ['corn', '玉米', 'yù mǐ', 'corn'],
  ['soy', '大豆', 'dà dòu', 'soybeans'],
]
const PLANET: Row[] = [
  ['mercury', '水星', 'shuǐ xīng', 'Mercury'],
  ['venus', '金星', 'jīn xīng', 'Venus'],
  ['earth', '地球', 'dì qiú', 'Earth'],
  ['mars', '火星', 'huǒ xīng', 'Mars'],
  ['jupiter', '木星', 'mù xīng', 'Jupiter'],
  ['saturn', '土星', 'tǔ xīng', 'Saturn'],
  ['uranus', '天王星', 'tiān wáng xīng', 'Uranus'],
  ['neptune', '海王星', 'hǎi wáng xīng', 'Neptune'],
]
const REGION: Row[] = [
  ['beijing', '北京', 'běi jīng', 'Beijing'],
  ['guangdong', '广东', 'guǎng dōng', 'Guangdong'],
  ['shandong', '山东', 'shān dōng', 'Shandong'],
  ['henan', '河南', 'hé nán', 'Henan'],
  ['jiangsu', '江苏', 'jiāng sū', 'Jiangsu'],
  ['sichuan', '四川', 'sì chuān', 'Sichuan'],
  ['shanghai', '上海', 'shàng hǎi', 'Shanghai'],
  ['shanxi', '山西', 'shān xī', 'Shanxi'],
  ['zhejiang', '浙江', 'zhè jiāng', 'Zhejiang'],
  ['hunan', '湖南', 'hú nán', 'Hunan'],
  ['guangxi', '广西', 'guǎng xī', 'Guangxi'],
  ['yunnan', '云南', 'yún nán', 'Yunnan'],
]

/** 题目（键尾、中文、拼音、英文） */
const Q: Row[] = [
  // ── 读、写 ──
  ['readAs', '这个数读作什么？', 'zhè ge shù dú zuò shén me', 'How do you read this number in Chinese?'],
  ['writeAs', '这个数写作多少？', 'zhè ge shù xiě zuò duō shao', 'Write this number in digits.'],
  [
    'ctx.bell',
    '北京大钟寺的永乐大钟内外共铸了二十三万零一百八十四个字，这个数写作多少？',
    'běi jīng dà zhōng sì de yǒng lè dà zhōng nèi wài gòng zhù le èr shí sān wàn líng yì bǎi bā shí sì gè zì zhè ge shù xiě zuò duō shao',
    'The Yongle Bell at the Big Bell Temple in Beijing has 二十三万零一百八十四 characters cast on it, inside and out. Write this number in digits.',
  ],
  [
    'ctx.light',
    '光每秒大约传播二十九万九千八百千米，这个数写作多少？',
    'guāng měi miǎo dà yuē chuán bō èr shí jiǔ wàn jiǔ qiān bā bǎi qiān mǐ zhè ge shù xiě zuò duō shao',
    'Light travels about 二十九万九千八百 km every second. Write this number in digits.',
  ],
  [
    'ctx.dragonfly',
    '蜻蜓的眼睛最多由二万八千多个小眼组成，这个数写作多少？',
    'qīng tíng de yǎn jing zuì duō yóu èr wàn bā qiān duō gè xiǎo yǎn zǔ chéng zhè ge shù xiě zuò duō shao',
    'A dragonfly’s eye is made of up to 二万八千-odd tiny eyes. Write this number in digits.',
  ],
  [
    'ctx.heart',
    '一个人的心脏一年大约跳动四千二百万次，这个数写作多少？',
    'yí gè rén de xīn zàng yì nián dà yuē tiào dòng sì qiān èr bǎi wàn cì zhè ge shù xiě zuò duō shao',
    'A person’s heart beats about 四千二百万 times a year. Write this number in digits.',
  ],
  [
    'ctx.equator',
    '地球赤道一圈大约有四千零七万五千七百米，这个数写作多少？',
    'dì qiú chì dào yì quān dà yuē yǒu sì qiān líng qī wàn wǔ qiān qī bǎi mǐ zhè ge shù xiě zuò duō shao',
    'Once around the Earth’s equator is about 四千零七万五千七百 m. Write this number in digits.',
  ],
  [
    'ctx.whale',
    '一头蓝鲸大约有十二万五千千克，这个数写作多少？',
    'yì tóu lán jīng dà yuē yǒu shí èr wàn wǔ qiān qiān kè zhè ge shù xiě zuò duō shao',
    'A blue whale is about 十二万五千 kg. Write this number in digits.',
  ],
  [
    'ctx.world',
    '全球人口大约有八十亿人，这个数写作多少？',
    'quán qiú rén kǒu dà yuē yǒu bā shí yì rén zhè ge shù xiě zuò duō shao',
    'There are about 八十亿 people in the world. Write this number in digits.',
  ],
  [
    'ctx.grain',
    '2024 年，我国粮食产量为七亿零六百四十九万八千九百吨，这个数写作多少？',
    'nián wǒ guó liáng shi chǎn liàng wéi qī yì líng liù bǎi sì shí jiǔ wàn bā qiān jiǔ bǎi dūn zhè ge shù xiě zuò duō shao',
    'In 2024, China’s grain output was 七亿零六百四十九万八千九百 tons. Write this number in digits.',
  ],
  [
    'ctx.tour',
    '2024 年，我国国内旅游总人次为五十六亿一千五百万，这个数写作多少？',
    'nián wǒ guó guó nèi lǚ yóu zǒng rén cì wéi wǔ shí liù yì yì qiān wǔ bǎi wàn zhè ge shù xiě zuò duō shao',
    'In 2024, people in China made 五十六亿一千五百万 trips within the country. Write this number in digits.',
  ],
  // ── 计数单位、进率 ──
  ['cnt', '{n}个{u}', 'gè', '{n} {u}s'],
  ['cnt1', '{n}个{u}', 'gè', '{n} {u}'],
  ['tenOf', '10个{a}是多少？', 'gè shì duō shao', 'What do 10 lots of {a} make?'],
  ['howManyIn', '{a}里面有几个{b}？', 'lǐ miàn yǒu jǐ gè', 'How many lots of {b} make {a}?'],
  ['tenIsOne', '10个{a}是1个什么？', 'gè shì gè shén me', '10 {a}s make 1 what?'],
  ['oneIsTen', '1个{a}是10个什么？', 'gè shì gè shén me', '1 {a} is 10 of what?'],
  ['oneIsHowMany', '1个{a}是几个{b}？', 'gè shì jǐ gè', '1 {a} is how many {b}s?'],
  ['tenIsHowMany', '10个{a}是几个{b}？', 'gè shì jǐ gè', '10 {a}s make how many {b}s?'],
  ['radix', '每相邻两个计数单位之间的进率都是多少？', 'měi xiāng lín liǎng gè jì shù dān wèi zhī jiān de jìn lǜ dōu shì duō shao', 'What is the rate between every two neighboring counting units?'],
  // ── 数位、数级、数位顺序表 ──
  ['placeOrder', '从个位起，第几位是{p}？', 'cóng gè wèi qǐ dì jǐ wèi shì', 'Counting from the ones place as place 1, which place number is the {p}?'],
  ['leftOf', '{p}的左面一位是什么数位？', 'de zuǒ miàn yí wèi shì shén me shù wèi', 'Which place is just to the left of the {p}?'],
  ['rightOf', '{p}的右面一位是什么数位？', 'de yòu miàn yí wèi shì shén me shù wèi', 'Which place is just to the right of the {p}?'],
  ['levelOf', '{p}在哪一级？', 'zài nǎ yì jí', 'Which group of places is the {p} in?'],
  ['tableAsk', '数位顺序表里，打问号的那一格是什么数位？', 'shù wèi shùn xù biǎo lǐ dǎ wèn hào de nà yì gé shì shén me shù wèi', 'In the place-value chart, which place goes where the question mark is?'],
  ['highest', '一个{k}，它的最高位是什么位？', 'yí gè tā de zuì gāo wèi shì shén me wèi', 'What is the highest place of a {k}?'],
  ['digitsOf', '这个数是几位数？', 'zhè ge shù shì jǐ wèi shù', 'How many digits does this number have?'],
  ['highestOf', '这个数的最高位是什么位？', 'zhè ge shù de zuì gāo wèi shì shén me wèi', 'What is the highest place of this number?'],
  ['digitAt', '这个数{p}上的数字是几？', 'zhè ge shù shàng de shù zì shì jǐ', 'Which digit is in the {p} of this number?'],
  ['digitMeans', '画横线的数字表示什么？', 'huà héng xiàn de shù zì biǎo shì shén me', 'What does the underlined digit stand for?'],
  ['maxLen', '最大的{k}是多少？', 'zuì dà de shì duō shao', 'What is the greatest {k}?'],
  ['minLen', '最小的{k}是多少？', 'zuì xiǎo de shì duō shao', 'What is the smallest {k}?'],
  // ── 数的组成 ──
  ['comp.Wan.a', '这个数由几个万组成？', 'zhè ge shù yóu jǐ gè wàn zǔ chéng', 'This number is made of how many ten thousands?'],
  ['comp.WanOne.a', '这个数由几个万和{b}个一组成？', 'zhè ge shù yóu jǐ gè wàn hé gè yī zǔ chéng', 'This number is made of how many ten thousands and {b} ones?'],
  ['comp.WanOne.b', '这个数由{a}个万和几个一组成？', 'zhè ge shù yóu gè wàn hé jǐ gè yī zǔ chéng', 'This number is made of {a} ten thousands and how many ones?'],
  ['comp.Yi.a', '这个数由几个亿组成？', 'zhè ge shù yóu jǐ gè yì zǔ chéng', 'This number is made of how many hundred millions?'],
  ['comp.YiWan.a', '这个数由几个亿和{b}个万组成？', 'zhè ge shù yóu jǐ gè yì hé gè wàn zǔ chéng', 'This number is made of how many hundred millions and {b} ten thousands?'],
  ['comp.YiWan.b', '这个数由{a}个亿和几个万组成？', 'zhè ge shù yóu gè yì hé jǐ gè wàn zǔ chéng', 'This number is made of {a} hundred millions and how many ten thousands?'],
  ['comp.YiOne.a', '这个数由几个亿和{b}个一组成？', 'zhè ge shù yóu jǐ gè yì hé gè yī zǔ chéng', 'This number is made of how many hundred millions and {b} ones?'],
  ['comp.YiOne.b', '这个数由{a}个亿和几个一组成？', 'zhè ge shù yóu gè yì hé jǐ gè yī zǔ chéng', 'This number is made of {a} hundred millions and how many ones?'],
  ['comp.YiWanOne.a', '这个数由几个亿、{b}个万和{c}个一组成？', 'zhè ge shù yóu jǐ gè yì gè wàn hé gè yī zǔ chéng', 'This number is made of how many hundred millions, {b} ten thousands and {c} ones?'],
  ['comp.YiWanOne.b', '这个数由{a}个亿、几个万和{c}个一组成？', 'zhè ge shù yóu gè yì jǐ gè wàn hé gè yī zǔ chéng', 'This number is made of {a} hundred millions, how many ten thousands and {c} ones?'],
  ['comp.YiWanOne.c', '这个数由{a}个亿、{b}个万和几个一组成？', 'zhè ge shù yóu gè yì gè wàn hé jǐ gè yī zǔ chéng', 'This number is made of {a} hundred millions, {b} ten thousands and how many ones?'],
  ['made2', '由{a}和{b}组成的数是多少？', 'yóu hé zǔ chéng de shù shì duō shao', 'What number is made of {a} and {b}?'],
  ['made3', '由{a}、{b}和{c}组成的数是多少？', 'yóu hé zǔ chéng de shù shì duō shao', 'What number is made of {a}, {b} and {c}?'],
  ['made4', '由{a}、{b}、{c}和{d}组成的数是多少？', 'yóu hé zǔ chéng de shù shì duō shao', 'What number is made of {a}, {b}, {c} and {d}?'],
  ['askBox', '问号处应该是多少？', 'wèn hào chù yīng gāi shì duō shao', 'What number goes where the question mark is?'],
  ['counterRead', '计数器上表示的数是多少？', 'jì shù qì shàng biǎo shì de shù shì duō shao', 'What number does the counter show?'],
  ['abacusRead', '算盘上表示的数是多少？', 'suàn pán shàng biǎo shì de shù shì duō shao', 'What number does the abacus show?'],
  ['countOn', '{s}{s}地数：{a}，{b}，{c}，下一个数是多少？', 'de shǔ xià yí gè shù shì duō shao', 'Count on by {s} each time: {a}, {b}, {c}. What comes next?'],
  // ── 自然数（p3）──
  ['natMin', '最小的自然数是几？', 'zuì xiǎo de zì rán shù shì jǐ', 'What is the smallest natural number?'],
  ['nat.zero', '0 也是自然数，对吗？', 'yě shì zì rán shù duì ma', '0 is a natural number too. Is that right?'],
  ['nat.min1', '最小的自然数是 1，对吗？', 'zuì xiǎo de zì rán shù shì duì ma', 'The smallest natural number is 1. Is that right?'],
  ['nat.min0', '最小的自然数是 0，对吗？', 'zuì xiǎo de zì rán shù shì duì ma', 'The smallest natural number is 0. Is that right?'],
  ['nat.noMax', '没有最大的自然数，对吗？', 'méi yǒu zuì dà de zì rán shù duì ma', 'There is no greatest natural number. Is that right?'],
  ['nat.finite', '自然数的个数是有限的，对吗？', 'zì rán shù de gè shù shì yǒu xiàn de duì ma', 'The natural numbers stop somewhere. Is that right?'],
  ['nat.infinite', '自然数的个数是无限的，对吗？', 'zì rán shù de gè shù shì wú xiàn de duì ma', 'The natural numbers go on forever. Is that right?'],
  ['nat.int', '所有的自然数都是整数，对吗？', 'suǒ yǒu de zì rán shù dōu shì zhěng shù duì ma', 'All natural numbers are whole numbers. Is that right?'],
  ['nat.count', '表示物体个数的 1、2、3……都是自然数，对吗？', 'biǎo shì wù tǐ gè shù de dōu shì zì rán shù duì ma', 'Numbers like 1, 2, 3… that count things are all natural numbers. Is that right?'],
  ['yes', '对', 'duì', 'Right'],
  ['no', '不对', 'bú duì', 'Not right'],
  // ── 术语（p2、p10）──
  ['def.unit', '个、十、百、千、万、十万、百万、千万、亿……都是什么？', 'gè shí bǎi qiān wàn shí wàn bǎi wàn qiān wàn yì dōu shì shén me', 'Ones, tens, hundreds, thousands, ten thousands… hundred millions: what are they all called?'],
  [
    'def.place',
    '计数单位按一定的顺序排列起来，它们所占的位置叫作什么？',
    'jì shù dān wèi àn yí dìng de shùn xù pái liè qǐ lái tā men suǒ zhàn de wèi zhì jiào zuò shén me',
    'When the counting units are lined up in order, what are the positions they take called?',
  ],
  [
    'def.level',
    '从右边起，每四个数位是一级，个级、万级、亿级叫作什么？',
    'cóng yòu biān qǐ měi sì gè shù wèi shì yì jí gè jí wàn jí yì jí jiào zuò shén me',
    'Counting from the right, every four places make one group: the ones group, the 万 group, the 亿 group. What are these groups called?',
  ],
  [
    'def.decimal',
    '每相邻两个计数单位之间的进率都是 10，这样的计数方法叫作什么？',
    'měi xiāng lín liǎng gè jì shù dān wèi zhī jiān de jìn lǜ dōu shì zhè yàng de jì shù fāng fǎ jiào zuò shén me',
    'The rate between every two neighboring counting units is 10. What is this way of counting called?',
  ],
  // ── 说法合不合理（练习二 8）──
  ['sense', '「{s}」这样说合理，对吗？', 'zhè yàng shuō hé lǐ duì ma', '“{s}” Is that a sensible thing to say?'],
  ['say.school', '我们学校有十万人。', 'wǒ men xué xiào yǒu shí wàn rén', 'Our school has one hundred thousand pupils.'],
  ['say.icecream', '我今天卖了两千多万根冰棍。', 'wǒ jīn tiān mài le liǎng qiān duō wàn gēn bīng gùn', 'I sold more than twenty million ice lollies today.'],
  ['say.library', '我们学校图书馆有八万册藏书。', 'wǒ men xué xiào tú shū guǎn yǒu bā wàn cè cáng shū', 'Our school library has eighty thousand books.'],
  ['say.class', '我们班有四十五名同学。', 'wǒ men bān yǒu sì shí wǔ míng tóng xué', 'There are forty-five pupils in our class.'],
  ['say.china', '我国的人口有十四亿多。', 'wǒ guó de rén kǒu yǒu shí sì yì duō', 'China has more than 1.4 billion people.'],
  ['say.beijing', '北京市的人口有两千多万。', 'běi jīng shì de rén kǒu yǒu liǎng qiān duō wàn', 'Beijing has more than twenty million people.'],
  ['say.book', '一本数学书有一亿页。', 'yì běn shù xué shū yǒu yí yì yè', 'A maths book has one hundred million pages.'],
  ['say.pencil', '我的铅笔盒里有一万支铅笔。', 'wǒ de qiān bǐ hé lǐ yǒu yí wàn zhī qiān bǐ', 'My pencil case holds ten thousand pencils.'],
  // ── 数的大小比较 ──
  ['compare', '比一比，填 >、< 或 =。', 'bǐ yi bǐ tián huò', 'Compare: fill in >, < or =.'],
  ['maxOf', '下面哪个数最大？', 'xià miàn nǎ ge shù zuì dà', 'Which number is the greatest?'],
  ['minOf', '下面哪个数最小？', 'xià miàn nǎ ge shù zuì xiǎo', 'Which number is the smallest?'],
  [
    'cropMax',
    '下表是 2024 年全国主要农产品的产量，单位是吨。哪种农产品的产量最高？',
    'xià biǎo shì nián quán guó zhǔ yào nóng chǎn pǐn de chǎn liàng dān wèi shì dūn nǎ zhǒng nóng chǎn pǐn de chǎn liàng zuì gāo',
    'The table shows China’s output of major crops in 2024, in tons. Which crop has the greatest output?',
  ],
  [
    'cropMin',
    '下表是 2024 年全国主要农产品的产量，单位是吨。哪种农产品的产量最低？',
    'xià biǎo shì nián quán guó zhǔ yào nóng chǎn pǐn de chǎn liàng dān wèi shì dūn nǎ zhǒng nóng chǎn pǐn de chǎn liàng zuì dī',
    'The table shows China’s output of major crops in 2024, in tons. Which crop has the smallest output?',
  ],
  ['head.crop', '农产品', 'nóng chǎn pǐn', 'crop'],
  ['head.output', '产量/吨', 'chǎn liàng dūn', 'output / t'],
  ['head.planet', '行星', 'xíng xīng', 'planet'],
  ['head.dist', '平均距离/千米', 'píng jūn jù lí qiān mǐ', 'average distance / km'],
  [
    'planetNear',
    '下表是几颗行星到太阳的平均距离，单位是千米。哪颗行星离太阳最近？',
    'xià biǎo shì jǐ kē xíng xīng dào tài yáng de píng jūn jù lí dān wèi shì qiān mǐ nǎ kē xíng xīng lí tài yáng zuì jìn',
    'The table shows how far some planets are from the Sun on average, in km. Which planet is nearest to the Sun?',
  ],
  [
    'planetFar',
    '下表是几颗行星到太阳的平均距离，单位是千米。哪颗行星离太阳最远？',
    'xià biǎo shì jǐ kē xíng xīng dào tài yáng de píng jūn jù lí dān wèi shì qiān mǐ nǎ kē xíng xīng lí tài yáng zuì yuǎn',
    'The table shows how far some planets are from the Sun on average, in km. Which planet is farthest from the Sun?',
  ],
  ['boxOnly', '方框里能填几？', 'fāng kuàng lǐ néng tián jǐ', 'Which digit can go in the box?'],
  ['boxMin', '方框里最小能填几？', 'fāng kuàng lǐ zuì xiǎo néng tián jǐ', 'What is the smallest digit that can go in the box?'],
  ['boxMax', '方框里最大能填几？', 'fāng kuàng lǐ zuì dà néng tián jǐ', 'What is the greatest digit that can go in the box?'],
  // ── 数的改写和求近似数 ──
  ['u.wan', '万', 'wàn', '万'],
  ['u.yi', '亿', 'yì', '亿'],
  ['toWan', '改写成用「万」作单位的数。', 'gǎi xiě chéng yòng wàn zuò dān wèi de shù', 'Rewrite it using 万, ten thousand, as the unit.'],
  ['toYi', '改写成用「亿」作单位的数。', 'gǎi xiě chéng yòng yì zuò dān wèi de shù', 'Rewrite it using 亿, a hundred million, as the unit.'],
  [
    'bloodRed',
    '一小滴血液里大约有这么多个红细胞，改写成用「万」作单位的数。',
    'yì xiǎo dī xuè yè lǐ dà yuē yǒu zhè me duō gè hóng xì bāo gǎi xiě chéng yòng wàn zuò dān wèi de shù',
    'A tiny drop of blood has about this many red blood cells. Rewrite the number using 万, ten thousand, as the unit.',
  ],
  [
    'bloodWhite',
    '一小滴血液里大约有这么多个白细胞，改写成用「万」作单位的数。',
    'yì xiǎo dī xuè yè lǐ dà yuē yǒu zhè me duō gè bái xì bāo gǎi xiě chéng yòng wàn zuò dān wèi de shù',
    'A tiny drop of blood has about this many white blood cells. Rewrite the number using 万, ten thousand, as the unit.',
  ],
  ['roundWan', '省略万位后面的尾数，求出近似数。', 'shěng lüè wàn wèi hòu miàn de wěi shù qiú chū jìn sì shù', 'Leave out the digits after the ten-thousands place and find the approximate number.'],
  ['roundYi', '省略亿位后面的尾数，求出近似数。', 'shěng lüè yì wèi hòu miàn de wěi shù qiú chū jìn sì shù', 'Leave out the digits after the hundred-millions place and find the approximate number.'],
  ['roundFullWan', '省略万位后面的尾数，这个数约是多少？', 'shěng lüè wàn wèi hòu miàn de wěi shù zhè ge shù yuē shì duō shao', 'Leave out the digits after the ten-thousands place. About what is this number?'],
  ['sheRuWan', '省略万位后面的尾数，这个数要「舍」还是要「入」？', 'shěng lüè wàn wèi hòu miàn de wěi shù zhè ge shù yào shě hái shì yào rù', 'Leaving out the digits after the ten-thousands place: do you round this number down or up?'],
  ['sheRuYi', '省略亿位后面的尾数，这个数要「舍」还是要「入」？', 'shěng lüè yì wèi hòu miàn de wěi shù zhè ge shù yào shě hái shì yào rù', 'Leaving out the digits after the hundred-millions place: do you round this number down or up?'],
  ['she', '舍', 'shě', 'Round down'],
  ['ru', '入', 'rù', 'Round up'],
  ['lookWan', '省略万位后面的尾数，要看哪一位上的数？', 'shěng lüè wàn wèi hòu miàn de wěi shù yào kàn nǎ yí wèi shàng de shù', 'To leave out the digits after the ten-thousands place, which place’s digit do you look at?'],
  ['lookYi', '省略亿位后面的尾数，要看哪一位上的数？', 'shěng lüè yì wèi hòu miàn de wěi shù yào kàn nǎ yí wèi shàng de shù', 'To leave out the digits after the hundred-millions place, which place’s digit do you look at?'],
  ['relAsk', '方框里应该填「=」还是「≈」？', 'fāng kuàng lǐ yīng gāi tián hái shì', 'Should the box hold = or ≈?'],
  ['ae.height', '小明身高约 140 厘米，这里的 140 是近似数还是准确数？', 'xiǎo míng shēn gāo yuē lí mǐ zhè lǐ de shì jìn sì shù hái shì zhǔn què shù', 'Xiaoming is about 140 cm tall. Is 140 here an approximate number or an exact number?'],
  ['ae.weight', '小明体重约 35 千克，这里的 35 是近似数还是准确数？', 'xiǎo míng tǐ zhòng yuē qiān kè zhè lǐ de shì jìn sì shù hái shì zhǔn què shù', 'Xiaoming weighs about 35 kg. Is 35 here an approximate number or an exact number?'],
  ['ae.class', '四年级二班有 45 人，这里的 45 是近似数还是准确数？', 'sì nián jí èr bān yǒu rén zhè lǐ de shì jìn sì shù hái shì zhǔn què shù', 'Class 2 of Grade 4 has 45 pupils. Is 45 here an approximate number or an exact number?'],
  ['ae.school', '全校有 730 人，这里的 730 是近似数还是准确数？', 'quán xiào yǒu rén zhè lǐ de shì jìn sì shù hái shì zhǔn què shù', 'The whole school has 730 pupils. Is 730 here an approximate number or an exact number?'],
  [
    'ae.everest',
    '珠穆朗玛峰海拔为 8800 多米，这里的 8800 多是近似数还是准确数？',
    'zhū mù lǎng mǎ fēng hǎi bá wéi duō mǐ zhè lǐ de duō shì jìn sì shù hái shì zhǔn què shù',
    'Mount Qomolangma is a little over 8800 m high. Is “a little over 8800” an approximate number or an exact number?',
  ],
  [
    'ae.volunteer',
    '2022 年北京冬奥会期间，城市志愿者参与服务约 200000 人次，这里的 200000 是近似数还是准确数？',
    'nián běi jīng dōng ào huì qī jiān chéng shì zhì yuàn zhě cān yù fú wù yuē rén cì zhè lǐ de shì jìn sì shù hái shì zhǔn què shù',
    'During the 2022 Beijing Winter Olympics, city volunteers helped out about 200000 times. Is 200000 here an approximate number or an exact number?',
  ],
  [
    'ae.steps',
    '李阿姨说：「我大约走了 22 万步。」这里的 22 万是近似数还是准确数？',
    'lǐ ā yí shuō wǒ dà yuē zǒu le wàn bù zhè lǐ de wàn shì jìn sì shù hái shì zhǔn què shù',
    'Aunt Li says: “I walked about 220 thousand steps.” Is 220 thousand an approximate number or an exact number?',
  ],
  [
    'ae.phone',
    '李阿姨的手机上显示本月步数是 218309，这里的 218309 是近似数还是准确数？',
    'lǐ ā yí de shǒu jī shàng xiǎn shì běn yuè bù shù shì zhè lǐ de shì jìn sì shù hái shì zhǔn què shù',
    'Aunt Li’s phone shows 218309 steps this month. Is 218309 here an approximate number or an exact number?',
  ],
  ['ae.page', '一本故事书有 128 页，这里的 128 是近似数还是准确数？', 'yì běn gù shi shū yǒu yè zhè lǐ de shì jìn sì shù hái shì zhǔn què shù', 'A storybook has 128 pages. Is 128 here an approximate number or an exact number?'],
  [
    'popRound',
    '第七次全国人口普查，{r}的人口是下面这个数。省略万位后面的尾数，约是多少万人？',
    'dì qī cì quán guó rén kǒu pǔ chá de rén kǒu shì xià miàn zhè ge shù shěng lüè wàn wèi hòu miàn de wěi shù yuē shì duō shao wàn rén',
    'In the seventh national census, the population of {r} was this number. Leaving out the digits after the ten-thousands place, about how many 万 people is it?',
  ],
  [
    'evRound',
    '{y} 年我国纯电动汽车的销量是下面这个数，单位是辆。省略万位后面的尾数，约是多少万辆？',
    'nián wǒ guó chún diàn dòng qì chē de xiāo liàng shì xià miàn zhè ge shù dān wèi shì liàng shěng lüè wàn wèi hòu miàn de wěi shù yuē shì duō shao wàn liàng',
    'This is how many battery-electric cars were sold in China in {y}. Leaving out the digits after the ten-thousands place, about how many 万 cars is it?',
  ],
  [
    'planetWan',
    '{p}到太阳的平均距离是下面这个数，单位是千米。改写成用「万」作单位的数，是多少万千米？',
    'dào tài yáng de píng jūn jù lí shì xià miàn zhè ge shù dān wèi shì qiān mǐ gǎi xiě chéng yòng wàn zuò dān wèi de shù shì duō shao wàn qiān mǐ',
    'This is the average distance from {p} to the Sun, in km. Using 万, ten thousand, as the unit, how many 万 km is it?',
  ],
  [
    'rctx.collection',
    '2017 年，故宫博物院有藏品一百八十六万二千六百九十件。省略万位后面的尾数，约是多少万件？',
    'nián gù gōng bó wù yuàn yǒu cáng pǐn yì bǎi bā shí liù wàn èr qiān liù bǎi jiǔ shí jiàn shěng lüè wàn wèi hòu miàn de wěi shù yuē shì duō shao wàn jiàn',
    'In 2017, the Palace Museum had 一百八十六万二千六百九十 items in its collection. Leaving out the digits after the ten-thousands place, about how many 万 items is that?',
  ],
  [
    'rctx.relics',
    '2017 年，故宫博物院有珍贵文物一百六十八万三千三百三十六件。省略万位后面的尾数，约是多少万件？',
    'nián gù gōng bó wù yuàn yǒu zhēn guì wén wù yì bǎi liù shí bā wàn sān qiān sān bǎi sān shí liù jiàn shěng lüè wàn wèi hòu miàn de wěi shù yuē shì duō shao wàn jiàn',
    'In 2017, the Palace Museum had 一百六十八万三千三百三十六 precious relics. Leaving out the digits after the ten-thousands place, about how many 万 relics is that?',
  ],
  [
    'rctx.dive',
    '2020 年，「奋斗者」号潜水器成功下潜到一万零九百零九米深的海沟。省略万位后面的尾数，约是多少万米？',
    'nián fèn dòu zhě hào qián shuǐ qì chéng gōng xià qián dào yí wàn líng jiǔ bǎi líng jiǔ mǐ shēn de hǎi gōu shěng lüè wàn wèi hòu miàn de wěi shù yuē shì duō shao wàn mǐ',
    'In 2020, the submersible “Fendouzhe” dived to the bottom of a trench 一万零九百零九 m deep. Leaving out the digits after the ten-thousands place, about how many 万 m is that?',
  ],
  [
    'rctx.grain',
    '2024 年，我国粮食产量为七亿零六百四十九万八千九百吨。省略亿位后面的尾数，约是多少亿吨？',
    'nián wǒ guó liáng shi chǎn liàng wéi qī yì líng liù bǎi sì shí jiǔ wàn bā qiān jiǔ bǎi dūn shěng lüè yì wèi hòu miàn de wěi shù yuē shì duō shao yì dūn',
    'In 2024, China’s grain output was 七亿零六百四十九万八千九百 tons. Leaving out the digits after the hundred-millions place, about how many 亿 tons is that?',
  ],
  [
    'rctx.tour',
    '2024 年，我国国内旅游总人次为五十六亿一千五百万。省略亿位后面的尾数，约是多少亿？',
    'nián wǒ guó guó nèi lǚ yóu zǒng rén cì wéi wǔ shí liù yì yì qiān wǔ bǎi wàn shěng lüè yì wèi hòu miàn de wěi shù yuē shì duō shao yì',
    'In 2024, people in China made 五十六亿一千五百万 trips within the country. Leaving out the digits after the hundred-millions place, about how many 亿 is that?',
  ],
  [
    'rctx.tourUp',
    '2024 年，我国国内旅游总人次比上年增加七亿二千四百万。省略亿位后面的尾数，约是多少亿？',
    'nián wǒ guó guó nèi lǚ yóu zǒng rén cì bǐ shàng nián zēng jiā qī yì èr qiān sì bǎi wàn shěng lüè yì wèi hòu miàn de wěi shù yuē shì duō shao yì',
    'In 2024, people in China made 七亿二千四百万 more trips within the country than the year before. Leaving out the digits after the hundred-millions place, about how many 亿 is that?',
  ],
]

const groups: [string, Row[]][] = [
  ['m4.num.pow', POW],
  ['m4.num.place', PLACE],
  ['m4.num.unit', UNIT],
  ['m4.num.len', LEN],
  ['m4.num.level', LEVEL],
  ['m4.num.term', TERM],
  ['m4.num.crop', CROP],
  ['m4.num.planet', PLANET],
  ['m4.num.region', REGION],
  ['m4.num', Q],
]
const build = (col: 1 | 2 | 3): Record<string, string> => Object.assign({}, ...groups.map(([prefix, rows]) => table(prefix, rows, col)))

export const ZH: Dict = {
  ...Object.fromEntries(W.map(([k, ch]) => [`m4.num.w.${k}`, ch])),
  ...seq,
  ...build(1),
}
export const EN: Dict = {
  // 读法中英文都是汉字（英文界面问「How do you read this number in Chinese?」）
  ...Object.fromEntries(W.map(([k, ch]) => [`m4.num.w.${k}`, ch])),
  ...seq,
  ...build(3),
}
export const PY: Record<string, string> = {
  ...Object.fromEntries(W.map(([k, , py]) => [`m4.num.w.${k}`, py])),
  ...seqPy,
  ...build(2),
}
