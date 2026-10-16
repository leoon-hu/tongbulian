// 六下「5 数学广角——鸽巢问题」的词条（六年级数学 A，照笔记 A 写），键一律以「m6.pigeon.」开头。
// 课本用词：总有、至少、不管怎么放、尽量平均分、多出的、鸽笼、抽屉、同色、保证、颜色种数、抽屉原理、鸽巢原理。
// 朗读避坑：「属相相同」（相 xiàng / xiāng 挨着）写「生肖相同」；「六（2）班」的括号会读出来，写「二班」；
// 「5镖」「41环」的镖、环不在量词表里，写「投了 5 次飞镖」「成绩一共是 41 环」；数是 2 的「种」写汉字「两种」（「2种」会读「二种」）；
// 算式里的「……」读不出「余」，写「商是 2，余数是 1」；不写「还」「得」「量」；「鸽笼」笼读 lóng（合成后要听）。
import type { Dict } from '@/engine/i18n'

type Row = [string, string, string, string]

const ROWS: Row[] = [
  ['yes', '对', 'duì', 'Right'],
  ['no', '不对', 'bú duì', 'Not right'],
  ['aria', '放法图', 'fàng fǎ tú', 'How the things are placed'],
  // ── 例 1、做一做、你知道吗 ──
  ['ex1.pencil', '把 {n} 支铅笔放进 {k} 个笔筒中，不管怎么放，总有 1 个笔筒里至少有几支铅笔？', 'bǎ zhī qiān bǐ fàng jìn ge bǐ tǒng zhōng bù guǎn zěn me fàng zǒng yǒu ge bǐ tǒng lǐ zhì shǎo yǒu jǐ zhī qiān bǐ', 'However you put {n} pencils into {k} pen holders, at least how many pencils must one holder get?'],
  ['ex1.apple', '把 {n} 个苹果放进 {k} 个抽屉里，不管怎么放，总有 1 个抽屉里至少有几个苹果？', 'bǎ ge píng guǒ fàng jìn ge chōu ti lǐ bù guǎn zěn me fàng zǒng yǒu ge chōu ti lǐ zhì shǎo yǒu jǐ ge píng guǒ', 'However you put {n} apples into {k} drawers, at least how many apples must one drawer get?'],
  ['ex1.pigeon', '{n} 只鸽子飞进了 {k} 个鸽笼，总有 1 个鸽笼至少飞进了几只鸽子？', 'zhī gē zi fēi jìn le ge gē lóng zǒng yǒu ge gē lóng zhì shǎo fēi jìn le jǐ zhī gē zi', '{n} pigeons fly into {k} pigeon cages. At least how many pigeons must fly into one of the cages?'],
  ['ex1.nest', '{n} 只鸽子飞进 {k} 个鸽巢，总有 1 个鸽巢至少飞进了几只鸽子？', 'zhī gē zi fēi jìn ge gē cháo zǒng yǒu ge gē cháo zhì shǎo fēi jìn le jǐ zhī gē zi', '{n} pigeons fly into {k} nests. At least how many pigeons must fly into one of the nests?'],
  ['ex1.tf', '把 {n} 支铅笔放进 {k} 个笔筒中，不管怎么放，总有 1 个笔筒里至少有 {c} 支铅笔，对吗？', 'bǎ zhī qiān bǐ fàng jìn ge bǐ tǒng zhōng bù guǎn zěn me fàng zǒng yǒu ge bǐ tǒng lǐ zhì shǎo yǒu zhī qiān bǐ duì ma', 'However you put {n} pencils into {k} pen holders, one holder always gets at least {c} pencils. Is that right?'],
  ['enum', '把 {n} 支铅笔放进 {k} 个笔筒，只看每个笔筒里放几支、不看是哪个笔筒，一共有几种不同的放法？', 'bǎ zhī qiān bǐ fàng jìn ge bǐ tǒng zhǐ kàn měi ge bǐ tǒng lǐ fàng jǐ zhī bú kàn shì nǎ ge bǐ tǒng yí gòng yǒu jǐ zhǒng bù tóng de fàng fǎ', 'Put {n} pencils into {k} pen holders. Counting only how many go in each holder, not which holder, how many different ways are there?'],
  ['hyp.max', '如果每个笔筒里最多放 1 支铅笔，{k} 个笔筒一共最多放几支？', 'rú guǒ měi ge bǐ tǒng lǐ zuì duō fàng zhī qiān bǐ ge bǐ tǒng yí gòng zuì duō fàng jǐ zhī', 'If each pen holder holds at most 1 pencil, at most how many pencils can {k} holders hold?'],
  ['hyp.left', '有 {n} 支铅笔，{k} 个笔筒里各放 1 支，多出几支？', 'yǒu zhī qiān bǐ ge bǐ tǒng lǐ gè fàng zhī duō chū jǐ zhī', 'There are {n} pencils. Put 1 in each of the {k} pen holders. How many are left over?'],
  ['hyp.book', '如果每个抽屉最多放 {q} 本书，{k} 个抽屉一共最多放几本？', 'rú guǒ měi ge chōu ti zuì duō fàng běn shū ge chōu ti yí gòng zuì duō fàng jǐ běn', 'If each drawer holds at most {q} books, at most how many books can {k} drawers hold?'],
  ['zodiac', '随意找 {n} 位老师，他们中至少有几个人的生肖相同？', 'suí yì zhǎo wèi lǎo shī tā men zhōng zhì shǎo yǒu jǐ ge rén de shēng xiào xiāng tóng', 'Pick any {n} teachers. At least how many of them share the same Chinese zodiac animal?'],
  ['zodiacRev', '至少要找几位老师，才能保证有 2 个人的生肖相同？', 'zhì shǎo yào zhǎo jǐ wèi lǎo shī cái néng bǎo zhèng yǒu ge rén de shēng xiào xiāng tóng', 'At least how many teachers must you pick to be sure that 2 of them share a zodiac animal?'],
  // ── 例 2、做一做 ──
  ['ex2.book', '把 {n} 本书放进 {k} 个抽屉，不管怎么放，总有 1 个抽屉里至少放进几本书？', 'bǎ běn shū fàng jìn ge chōu ti bù guǎn zěn me fàng zǒng yǒu ge chōu ti lǐ zhì shǎo fàng jìn jǐ běn shū', 'However you put {n} books into {k} drawers, at least how many books must one drawer get?'],
  ['div', '把 {n} 本书放进 {k} 个抽屉。{n} ÷ {k} 的商是 {q}，余数是 {r}。总有 1 个抽屉里至少放进几本书？', 'bǎ běn shū fàng jìn ge chōu ti de shāng shì yú shù shì zǒng yǒu ge chōu ti lǐ zhì shǎo fàng jìn jǐ běn shū', 'Put {n} books into {k} drawers. {n} ÷ {k} gives {q} remainder {r}. At least how many books must one drawer get?'],
  ['poker', '一副扑克牌取出大小王后有 52 张，共 4 种花色。{n} 人每人随意抽 1 张，至少有几张牌是相同的花色？', 'yí fù pū kè pái qǔ chū dà xiǎo wáng hòu yǒu zhāng gòng zhǒng huā sè rén měi rén suí yì chōu zhāng zhì shǎo yǒu jǐ zhāng pái shì xiāng tóng de huā sè', 'A pack of cards without the jokers has 52 cards in 4 suits. {n} people each draw 1 card at random. At least how many of the cards are of the same suit?'],
  // ── 例 3、做一做 ──
  ['ball2', '盒子里有同样大小的红球和蓝球各 {m} 个。要保证摸出的球里一定有 2 个同色的，至少要摸出几个球？', 'hé zi lǐ yǒu tóng yàng dà xiǎo de hóng qiú hé lán qiú gè ge yào bǎo zhèng mō chū de qiú lǐ yí dìng yǒu ge tóng sè de zhì shǎo yào mō chū jǐ ge qiú', 'A box holds {m} red balls and {m} blue balls of the same size. At least how many balls must you take out to be sure that 2 of them are the same colour?'],
  ['ballK', '盒子里有 {k} 种颜色的球，每种颜色的球各 {m} 个。至少要摸出几个球，才能保证有 2 个球同色？', 'hé zi lǐ yǒu zhǒng yán sè de qiú měi zhǒng yán sè de qiú gè ge zhì shǎo yào mō chū jǐ ge qiú cái néng bǎo zhèng yǒu ge qiú tóng sè', 'A box holds balls of {k} colours, {m} of each colour. At least how many balls must you take out to be sure that 2 are the same colour?'],
  ['bag', '把{colors}的球各 {m} 个放到一个袋子里。至少取多少个球，才能保证取到两个颜色相同的球？', 'bǎ de qiú gè ge fàng dào yí gè dài zi lǐ zhì shǎo qǔ duō shao ge qiú cái néng bǎo zhèng qǔ dào liǎng ge yán sè xiāng tóng de qiú', 'Put {m} balls of each of {colors} into a bag. At least how many balls must you take to be sure of two of the same colour?'],
  ['cl.3', '红、黄、蓝 3 种颜色', 'hóng huáng lán zhǒng yán sè', 'red, yellow and blue (3 colours)'],
  ['cl.4', '红、黄、蓝、白 4 种颜色', 'hóng huáng lán bái zhǒng yán sè', 'red, yellow, blue and white (4 colours)'],
  ['cl.5', '红、黄、蓝、白、绿 5 种颜色', 'hóng huáng lán bái lǜ zhǒng yán sè', 'red, yellow, blue, white and green (5 colours)'],
  ['cc.2', '蓝、黄两种颜色', 'lán huáng liǎng zhǒng yán sè', 'blue and yellow (2 colours)'],
  ['bday.day', '六年级有 {n} 名学生，至少有几个人在同一天过生日？', 'liù nián jí yǒu míng xué shēng zhì shǎo yǒu jǐ ge rén zài tóng yì tiān guò shēng rì', 'There are {n} pupils in Grade 6. At least how many of them have their birthday on the same day?'],
  ['bday.month', '二班有 {n} 名学生，至少有几个人在同一个月过生日？', 'èr bān yǒu míng xué shēng zhì shǎo yǒu jǐ ge rén zài tóng yí gè yuè guò shēng rì', 'Class 2 has {n} pupils. At least how many of them have their birthday in the same month?'],
  ['bday.tf', '二班有 {n} 名学生，至少有 {c} 个人在同一个月过生日，对吗？', 'èr bān yǒu míng xué shēng zhì shǎo yǒu ge rén zài tóng yí gè yuè guò shēng rì duì ma', 'Class 2 has {n} pupils, so at least {c} of them have their birthday in the same month. Is that right?'],
  // ── 练习十三 ──
  ['darts', '张叔叔投了 {n} 次飞镖，成绩一共是 {s} 环。他至少有一次不低于几环？', 'zhāng shū shu tóu le cì fēi biāo chéng jì yí gòng shì huán tā zhì shǎo yǒu yí cì bù dī yú jǐ huán', 'Uncle Zhang throws {n} darts and scores {s} points in all. At least one throw scores at least how many points?'],
  ['cube', '给一个正方体木块的 6 个面涂上{colors}，不论怎么涂，至少有几个面涂的颜色相同？', 'gěi yí gè zhèng fāng tǐ mù kuài de ge miàn tú shàng bú lùn zěn me tú zhì shǎo yǒu jǐ ge miàn tú de yán sè xiāng tóng', 'Paint the 6 faces of a wooden cube with {colors}. However you paint it, at least how many faces have the same colour?'],
  ['chop', '把{colors}的筷子各 {m} 根混在一起。闭上眼睛，最少拿出几根，才能保证有 2 根同色的筷子？', 'bǎ de kuài zi gè gēn hùn zài yì qǐ bì shàng yǎn jing zuì shǎo ná chū jǐ gēn cái néng bǎo zhèng yǒu gēn tóng sè de kuài zi', 'Mix {m} chopsticks of each of {colors}. With your eyes closed, at least how many must you take to be sure of 2 chopsticks of the same colour?'],
  ['chop2', '把{colors}的筷子各 {m} 根混在一起。闭上眼睛，最少拿出几根，才能保证有 2 双不同颜色的筷子？', 'bǎ de kuài zi gè gēn hùn zài yì qǐ bì shàng yǎn jing zuì shǎo ná chū jǐ gēn cái néng bǎo zhèng yǒu shuāng bù tóng yán sè de kuài zi', 'Mix {m} chopsticks of each of {colors}. With your eyes closed, at least how many must you take to be sure of 2 pairs in two different colours?'],
  ['parity', '任意给出 3 个不同的自然数，其中一定有 2 个数的和是偶数，对吗？', 'rèn yì gěi chū ge bù tóng de zì rán shù qí zhōng yí dìng yǒu ge shù de hé shì ǒu shù duì ma', 'Pick any 3 different whole numbers. Two of them always add up to an even number. Is that right?'],
  ['parity2', '任意给出 2 个不同的自然数，它们的和一定是偶数，对吗？', 'rèn yì gěi chū ge bù tóng de zì rán shù tā men de hé yí dìng shì ǒu shù duì ma', 'Pick any 2 different whole numbers. Their sum is always even. Is that right?'],
  ['cols.ways', '每一列有 {r} 个格子，每个格子涂上红色或蓝色。一列一共有几种不同的涂法？', 'měi yí liè yǒu ge gé zi měi ge gé zi tú shàng hóng sè huò lán sè yí liè yí gòng yǒu jǐ zhǒng bù tóng de tú fǎ', 'Each column has {r} squares, and each square is painted red or blue. How many different ways can one column be painted?'],
  ['cols.same', '给{rows} {c} 列的格子涂色，每个格子涂红色或蓝色。至少有几列的涂色方式相同？', 'gěi liè de gé zi tú sè měi ge gé zi tú hóng sè huò lán sè zhì shǎo yǒu jǐ liè de tú sè fāng shì xiāng tóng', 'Paint a grid of {rows} and {c} columns, each square red or blue. At least how many columns must be painted the same way?'],
  ['rows.2', '两行', 'liǎng háng', '2 rows'],
  ['rows.3', '三行', 'sān háng', '3 rows'],
  ['rev.obj', '把一些书放进 {k} 个抽屉，要保证总有 1 个抽屉里至少放进 {m} 本，至少要放几本书？', 'bǎ yì xiē shū fàng jìn ge chōu ti yào bǎo zhèng zǒng yǒu ge chōu ti lǐ zhì shǎo fàng jìn běn zhì shǎo yào fàng jǐ běn shū', 'You put some books into {k} drawers and want to be sure one drawer gets at least {m} books. At least how many books do you need?'],
  ['twoRed', '盒子里有红球、蓝球各 {m} 个。至少摸出几个，才能保证摸到 2 个红球？', 'hé zi lǐ yǒu hóng qiú lán qiú gè ge zhì shǎo mō chū jǐ ge cái néng bǎo zhèng mō dào ge hóng qiú', 'A box has {m} red balls and {m} blue balls. At least how many must you take out to be sure of getting 2 red balls?'],
  ['monthRev', '至少要多少人，才能保证有 {c} 个人在同一个月过生日？', 'zhì shǎo yào duō shao rén cái néng bǎo zhèng yǒu ge rén zài tóng yí gè yuè guò shēng rì', 'At least how many people do you need to be sure that {c} of them have birthdays in the same month?'],
]

const table = (col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m6.pigeon.${r[0]}`, r[col]]))

export const ZH: Dict = table(1)
export const EN: Dict = table(3)
export const PY: Record<string, string> = table(2)
