// 五上「七 可能性」的词条（五年级数学 C，照笔记 D 第七单元写）。
// 课本用词：一定、可能、不可能、肯定、可能性大 / 小 / 最大 / 最小、更容易、一样大、公平、结果可以预测 / 无法预测、试验、推测、
// 记录、次数、合计、单数、双数、点数之和。
// 朗读避坑：不写「转动」「转盘」（转），写「指针」；「写着」「装着」（着）写成「是」「有」；「倒扣」写「背面朝上」；
// 「落下来」写「掉下来」；「说得对」（得）写「这样判断，对吗」；「认为」（为）写「说」；课本的「例 3 的方式」不写（序号是数字）。
// 「哪种」「几种」「还是」照课本，合成后要听一下。
import type { Dict } from '@/engine/i18n'

type Row = [string, string, string, string]

const DICE = '两个正方体的六个面上都分别是 1、2、3、4、5、6。同时掷这两个正方体，'
const DICE_PY = 'liǎng ge zhèng fāng tǐ de liù ge miàn shàng dōu fēn bié shì tóng shí zhì zhè liǎng ge zhèng fāng tǐ'
const DICE_EN = 'Each of two cubes has the faces 1, 2, 3, 4, 5 and 6. Roll both at once. '
const CARDS = '三张卡片上分别是唱歌、跳舞、朗诵'
const CARDS_PY = 'sān zhāng kǎ piàn shàng fēn bié shì chàng gē tiào wǔ lǎng sòng'
const CUBE = '一个正方体的六个面上分别是'
const CUBE_PY = 'yí ge zhèng fāng tǐ de liù ge miàn shàng fēn bié shì'
const PAINT = '给正方体的 6 个面涂上红、蓝两种颜色，要使掷出后红色面朝上的可能性比蓝色面大，'
const PAINT_PY = 'gěi zhèng fāng tǐ de ge miàn tú shàng hóng lán liǎng zhǒng yán sè yào shǐ zhì chū hòu hóng sè miàn cháo shàng de kě néng xìng bǐ lán sè miàn dà'
const PAINT_EN = 'Paint the 6 faces of a cube red and blue so that red is more likely than blue to land on top. '

const ROWS: Row[] = [
  ['yes', '对', 'duì', 'Right'],
  ['no', '不对', 'bú duì', 'Not right'],
  ['c.red', '红', 'hóng', 'red'],
  ['c.yellow', '黄', 'huáng', 'yellow'],
  ['c.blue', '蓝', 'lán', 'blue'],
  ['c.green', '绿', 'lǜ', 'green'],
  ['c.white', '白', 'bái', 'white'],
  ['ball.c', '{c}球', 'qiú', '{c} ball'],
  ['pawn.c', '{c}棋子', 'qí zǐ', '{c} piece'],
  ['has.ball', '{c}球 {n} 个', 'qiú ge', '{n} {c} balls'],
  ['has.pawn', '{c}棋子 {n} 个', 'qí zǐ ge', '{n} {c} pieces'],
  ['and', '{a}、{b}', '', '{a}, {b}'],
  ['region', '{c}色', 'sè', '{c}'],
  ['no.box', '{n} 号盒子', 'hào hé zi', 'box {n}'],
  ['no.wheel', '{n} 号', 'hào', 'No. {n}'],
  ['will.sure', '一定会', 'yí dìng huì', 'Certainly'],
  ['will.maybe', '可能会', 'kě néng huì', 'Maybe'],
  ['will.never', '不可能', 'bù kě néng', 'Impossible'],
  // ── 认识可能性：导入、例 1、做一做 ──
  ['intro.sun', '太阳会从西边升起吗？', 'tài yáng huì cóng xī biān shēng qǐ ma', 'Will the sun rise in the west?'],
  ['intro.drop', '把一枚硬币抛起来，它会掉下来吗？', 'bǎ yì méi yìng bì pāo qǐ lái tā huì diào xià lái ma', 'Toss a coin up. Will it come down?'],
  ['intro.coin', '掷一枚硬币，会正面朝上吗？', 'zhì yì méi yìng bì huì zhèng miàn cháo shàng ma', 'Toss a coin. Will it land heads up?'],
  ['intro.flower', '击鼓传花，花会传到小明手里吗？', 'jī gǔ chuán huā huā huì chuán dào xiǎo míng shǒu lǐ ma', "In 'pass the flower to the drumbeat', will the flower end up in Xiaoming's hands?"],
  ['show.sing', '唱歌', 'chàng gē', 'singing'],
  ['show.dance', '跳舞', 'tiào wǔ', 'dancing'],
  ['show.recite', '朗诵', 'lǎng sòng', 'reciting'],
  ['draw.0', `${CARDS}，背面朝上放在桌上，小丽、小红、小明抽签表演节目。小明第一个抽，他会抽到{p}吗？`, `${CARDS_PY} bèi miàn cháo shàng fàng zài zhuō shàng xiǎo lì xiǎo hóng xiǎo míng chōu qiān biǎo yǎn jié mù xiǎo míng dì yī ge chōu tā huì chōu dào ma`, 'Three cards say singing, dancing and reciting, face down on the table. Xiaoli, Xiaohong and Xiaoming draw lots for their shows. Xiaoming draws first. Will he get {p}?'],
  ['draw.1', `${CARDS}，背面朝上放在桌上。小明抽到了{x}，接下来小丽会抽到{p}吗？`, `${CARDS_PY} bèi miàn cháo shàng fàng zài zhuō shàng xiǎo míng chōu dào le jiē xià lái xiǎo lì huì chōu dào ma`, 'Three cards say singing, dancing and reciting, face down on the table. Xiaoming got {x}. Will Xiaoli get {p} next?'],
  ['draw.2', `${CARDS}。小明抽到了{x}，小丽抽到了{y}，最后只有一张了。小红会抽到{p}吗？`, `${CARDS_PY} xiǎo míng chōu dào le xiǎo lì chōu dào le zuì hòu zhǐ yǒu yì zhāng le xiǎo hóng huì chōu dào ma`, 'Three cards say singing, dancing and reciting. Xiaoming got {x} and Xiaoli got {y}, so one card is left. Will Xiaohong get {p}?'],
  ['draw.last', `${CARDS}。小明抽到了{x}，小丽抽到了{y}，最后只有一张了。小红会抽到什么节目？`, `${CARDS_PY} xiǎo míng chōu dào le xiǎo lì chōu dào le zuì hòu zhǐ yǒu yì zhāng le xiǎo hóng huì chōu dào shén me jié mù`, 'Three cards say singing, dancing and reciting. Xiaoming got {x} and Xiaoli got {y}, so one card is left. Which show will Xiaohong get?'],
  ['two.sure', '分别从两个盒子里摸棋子。哪个盒子里肯定能摸出{c}棋子？', 'fēn bié cóng liǎng ge hé zi lǐ mō qí zǐ nǎ ge hé zi lǐ kěn dìng néng mō chū qí zǐ', 'Take pieces from each of the two boxes. From which box are you sure to get a {c} piece?'],
  ['two.maybe', '分别从两个盒子里摸棋子。哪个盒子里可能摸出{c}棋子？', 'fēn bié cóng liǎng ge hé zi lǐ mō qí zǐ nǎ ge hé zi lǐ kě néng mō chū qí zǐ', 'Take pieces from each of the two boxes. From which box might you get a {c} piece?'],
  ['two.never', '分别从两个盒子里摸棋子。哪个盒子里不可能摸出{c}棋子？', 'fēn bié cóng liǎng ge hé zi lǐ mō qí zǐ nǎ ge hé zi lǐ bù kě néng mō chū qí zǐ', 'Take pieces from each of the two boxes. From which box can you never get a {c} piece?'],
  ['one.ask', '从这个盒子里摸出一个球，结果会是什么？', 'cóng zhè ge hé zi lǐ mō chū yí ge qiú jié guǒ huì shì shén me', 'Take one ball from this box. What will happen?'],
  ['one.sure', '一定摸到{c}球', 'yí dìng mō dào qiú', 'Certainly a {c} ball'],
  ['one.maybe', '可能摸到{c}球', 'kě néng mō dào qiú', 'Maybe a {c} ball'],
  ['one.never', '不可能摸到{c}球', 'bù kě néng mō dào qiú', 'Never a {c} ball'],
  // ── 认识可能性：练习十九 7、9，练习二十 4 ──
  ['three.sure', '每个盒子里有 5 个球。从哪个盒子里摸出的一定是{c}球？', 'měi ge hé zi lǐ yǒu ge qiú cóng nǎ ge hé zi lǐ mō chū de yí dìng shì qiú', 'Each box holds 5 balls. From which box is the ball you take sure to be {c}?'],
  ['three.never', '每个盒子里有 5 个球。从哪个盒子里摸出的不可能是{c}球？', 'měi ge hé zi lǐ yǒu ge qiú cóng nǎ ge hé zi lǐ mō chū de bù kě néng shì qiú', 'Each box holds 5 balls. From which box can the ball you take never be {c}?'],
  ['three.maybe', '每个盒子里有 5 个球。从哪个盒子里摸出的可能是{c}球？', 'měi ge hé zi lǐ yǒu ge qiú cóng nǎ ge hé zi lǐ mō chū de kě néng shì qiú', 'Each box holds 5 balls. From which box might the ball you take be {c}?'],
  ['threeof.ask', '盒子里有红棋子 7 个、蓝棋子 3 个、黄棋子 2 个。一次摸出 3 个棋子，可能 3 个都是{c}棋子吗？', 'hé zi lǐ yǒu hóng qí zǐ ge lán qí zǐ ge huáng qí zǐ ge yí cì mō chū ge qí zǐ kě néng ge dōu shì qí zǐ ma', 'A box holds 7 red, 3 blue and 2 yellow pieces. Take 3 pieces at once. Could all 3 be {c}?'],
  ['threeof.kinds', '盒子里有红棋子 7 个、蓝棋子 3 个、黄棋子 2 个。一次摸出 3 个棋子，看颜色，一共可能出现多少种结果？', 'hé zi lǐ yǒu hóng qí zǐ ge lán qí zǐ ge huáng qí zǐ ge yí cì mō chū ge qí zǐ kàn yán sè yí gòng kě néng chū xiàn duō shao zhǒng jié guǒ', 'A box holds 7 red, 3 blue and 2 yellow pieces. Take 3 pieces at once. Looking only at the colours, how many different results are possible?'],
  ['can.maybe', '可能', 'kě néng', 'Possible'],
  ['can.never', '不可能', 'bù kě néng', 'Impossible'],
  ['judge.coin2', '掷一枚硬币，第一次正面朝上，第二次一定是反面朝上，对吗？', 'zhì yì méi yìng bì dì yī cì zhèng miàn cháo shàng dì èr cì yí dìng shì fǎn miàn cháo shàng duì ma', 'Toss a coin. If it lands heads up the first time, it must land tails up the second time. Is that right?'],
  ['judge.sum', '两个数的和不可能大于这两个数的积，对吗？', 'liǎng ge shù de hé bù kě néng dà yú zhè liǎng ge shù de jī duì ma', 'The sum of two numbers can never be greater than their product. Is that right?'],
  ['judge.tri', '三角形的内角和可能是 179°，对吗？', 'sān jiǎo xíng de nèi jiǎo hé kě néng shì duì ma', 'The angles of a triangle can add up to 179°. Is that right?'],
  ['judge.onlyRed', '盒子里只有红球，从中摸出一个球，一定是红球，对吗？', 'hé zi lǐ zhǐ yǒu hóng qiú cóng zhōng mō chū yí ge qiú yí dìng shì hóng qiú duì ma', 'A box holds only red balls. A ball taken from it is certainly red. Is that right?'],
  ['judge.coinBack', '掷一枚硬币，可能反面朝上，对吗？', 'zhì yì méi yìng bì kě néng fǎn miàn cháo shàng duì ma', 'Toss a coin: it might land tails up. Is that right?'],
  ['predict.ask', '下面这件事的结果，可以预测吗？', 'xià miàn zhè jiàn shì de jié guǒ kě yǐ yù cè ma', 'Can the result of this be predicted?'],
  ['predict.drop', '把一枚硬币抛起来，它会不会掉下来。', 'bǎ yì méi yìng bì pāo qǐ lái tā huì bú huì diào xià lái', 'Whether a coin tossed up will come down.'],
  ['predict.face', '掷一枚硬币，哪一面朝上。', 'zhì yì méi yìng bì nǎ yí miàn cháo shàng', 'Which side lands up when you toss a coin.'],
  ['predict.sun', '太阳从哪边升起。', 'tài yáng cóng nǎ biān shēng qǐ', 'Which side the sun rises from.'],
  ['predict.flower', '击鼓传花，花会传到谁手里。', 'jī gǔ chuán huā huā huì chuán dào shuí shǒu lǐ', "Whose hands the flower ends up in when it is passed to the drumbeat."],
  ['predict.can', '可以预测', 'kě yǐ yù cè', 'Yes, it can'],
  ['predict.cannot', '无法预测', 'wú fǎ yù cè', 'No, it cannot'],
  // ── 可能性的大小 ──
  ['ex2', '盒子里有 4 个红棋子、1 个蓝棋子，每次摸出一个，记下颜色再放回去，摸了 20 次。再摸一次，摸出哪种颜色棋子的可能性大？', 'hé zi lǐ yǒu ge hóng qí zǐ ge lán qí zǐ měi cì mō chū yí ge jì xià yán sè zài fàng huí qù mō le cì zài mō yí cì mō chū nǎ zhǒng yán sè qí zǐ de kě néng xìng dà', 'A box holds 4 red pieces and 1 blue piece. One piece was taken each time, its colour noted, and it was put back, 20 times in all. If you take one more, which colour is more likely?'],
  ['most.max', '盒子里有{x}。摸出一个棋子，摸出哪种颜色棋子的可能性最大？', 'hé zi lǐ yǒu mō chū yí ge qí zǐ mō chū nǎ zhǒng yán sè qí zǐ de kě néng xìng zuì dà', 'A box holds {x}. If you take one piece, which colour is most likely?'],
  ['most.min', '盒子里有{x}。摸出一个棋子，摸出哪种颜色棋子的可能性最小？', 'hé zi lǐ yǒu mō chū yí ge qí zǐ mō chū nǎ zhǒng yán sè qí zǐ de kě néng xìng zuì xiǎo', 'A box holds {x}. If you take one piece, which colour is least likely?'],
  ['spin.big', '指针停在哪种颜色上的可能性大？', 'zhǐ zhēn tíng zài nǎ zhǒng yán sè shàng de kě néng xìng dà', 'On which colour is the pointer more likely to stop?'],
  ['spin.small', '指针停在哪种颜色上的可能性小？', 'zhǐ zhēn tíng zài nǎ zhǒng yán sè shàng de kě néng xìng xiǎo', 'On which colour is the pointer less likely to stop?'],
  ['cards.max', '从 9 张卡片中抽出一张，最有可能抽到什么卡片？', 'cóng zhāng kǎ piàn zhōng chōu chū yì zhāng zuì yǒu kě néng chōu dào shén me kǎ piàn', 'Draw one of the 9 cards. Which card are you most likely to get?'],
  ['cards.min', '从 9 张卡片中抽出一张，抽到哪种卡片的可能性最小？', 'cóng zhāng kǎ piàn zhōng chōu chū yì zhāng chōu dào nǎ zhǒng kǎ piàn de kě néng xìng zuì xiǎo', 'Draw one of the 9 cards. Which card are you least likely to get?'],
  ['card.story', '讲故事卡片', 'jiǎng gù shi kǎ piàn', 'story card'],
  ['card.sing', '唱歌卡片', 'chàng gē kǎ piàn', 'singing card'],
  ['card.dance', '跳舞卡片', 'tiào wǔ kǎ piàn', 'dancing card'],
  ['cards', '{n} 张', 'zhāng', '{n} cards'],
  ['bag', '袋子里有 8 个红球、2 个蓝球。从袋子里摸出一个球，摸出哪种球的可能性大？', 'dài zi lǐ yǒu ge hóng qiú ge lán qiú cóng dài zi lǐ mō chū yí ge qiú mō chū nǎ zhǒng qiú de kě néng xìng dà', 'A bag holds 8 red balls and 2 blue balls. Take one ball. Which kind is more likely?'],
  ['easier', '两个盒子里各有 15 个球。从哪个盒子里更容易摸到{c}球？', 'liǎng ge hé zi lǐ gè yǒu ge qiú cóng nǎ ge hé zi lǐ gèng róng yì mō dào qiú', 'Each box holds 15 balls. From which box is it easier to get a {c} ball?'],
  ['oddeven.ask', `${CUBE} 1、2、3、4、5、6。掷一次，单数朝上和双数朝上，哪个可能性大？`, `${CUBE_PY} zhì yí cì dān shù cháo shàng hé shuāng shù cháo shàng nǎ ge kě néng xìng dà`, 'The six faces of a cube show 1, 2, 3, 4, 5 and 6. Roll it once. Which is more likely on top: an odd number or an even number?'],
  ['oddeven.tf', `${CUBE} 1、2、3、4、5、6。掷一次，单数朝上和双数朝上的可能性一样大，对吗？`, `${CUBE_PY} zhì yí cì dān shù cháo shàng hé shuāng shù cháo shàng de kě néng xìng yí yàng dà duì ma`, 'The six faces of a cube show 1, 2, 3, 4, 5 and 6. Roll it once: an odd number on top is just as likely as an even number. Is that right?'],
  ['odd', '单数', 'dān shù', 'Odd number'],
  ['even', '双数', 'shuāng shù', 'Even number'],
  ['same', '一样大', 'yí yàng dà', 'Equally likely'],
  ['paint.ask', `${PAINT}可以怎样涂？`, `${PAINT_PY} kě yǐ zěn yàng tú`, `${PAINT_EN}Which way works?`],
  ['paint.min', `${PAINT}红色的面至少要涂几个？`, `${PAINT_PY} hóng sè de miàn zhì shǎo yào tú jǐ ge`, `${PAINT_EN}At least how many faces must be red?`],
  ['paint.opt', '红色 {r} 个面，蓝色 {b} 个面', 'hóng sè ge miàn lán sè ge miàn', '{r} faces red, {b} faces blue'],
  ['wheel.full', '哪一个符合要求：红、黄、蓝都有，指针停在蓝色的可能性最大，停在红色的可能性最小？', 'nǎ yí ge fú hé yāo qiú hóng huáng lán dōu yǒu zhǐ zhēn tíng zài lán sè de kě néng xìng zuì dà tíng zài hóng sè de kě néng xìng zuì xiǎo', 'Which one fits: it has red, yellow and blue, the pointer is most likely to stop on blue and least likely to stop on red?'],
  ['wheel.three', '下面哪一个的指针可能停在红色、黄色或蓝色区域？', 'xià miàn nǎ yí ge de zhǐ zhēn kě néng tíng zài hóng sè huáng sè huò lán sè qū yù', 'For which one might the pointer stop on red, yellow or blue?'],
  ['fair.half', '指针停在红色小明赢，停在蓝色小红赢。这个游戏公平吗？', 'zhǐ zhēn tíng zài hóng sè xiǎo míng yíng tíng zài lán sè xiǎo hóng yíng zhè ge yóu xì gōng píng ma', 'If the pointer stops on red, Xiaoming wins; on blue, Xiaohong wins. Is this game fair?'],
  ['fair.uneven', '指针停在红色小明赢，停在蓝色小红赢。这个游戏公平吗？', 'zhǐ zhēn tíng zài hóng sè xiǎo míng yíng tíng zài lán sè xiǎo hóng yíng zhè ge yóu xì gōng píng ma', 'If the pointer stops on red, Xiaoming wins; on blue, Xiaohong wins. Is this game fair?'],
  ['fair.coin', '足球比赛前，裁判通过掷硬币确定哪个队先开球。这样公平吗？', 'zú qiú bǐ sài qián cái pàn tōng guò zhì yìng bì què dìng nǎ ge duì xiān kāi qiú zhè yàng gōng píng ma', 'Before a football match, the referee tosses a coin to decide which team kicks off. Is that fair?'],
  ['fair', '公平', 'gōng píng', 'Fair'],
  ['unfair', '不公平', 'bù gōng píng', 'Not fair'],
  ['faces', `${CUBE} 1、1、1、2、2、3。掷一次，掷出几的可能性最大？`, `${CUBE_PY} zhì yí cì zhì chū jǐ de kě néng xìng zuì dà`, 'The six faces of a cube show 1, 1, 1, 2, 2 and 3. Roll it once. Which number is most likely?'],
  ['dice.min', `${DICE}点数之和最小是几？`, `${DICE_PY} diǎn shù zhī hé zuì xiǎo shì jǐ`, `${DICE_EN}What is the smallest possible sum?`],
  ['dice.max', `${DICE}点数之和最大是几？`, `${DICE_PY} diǎn shù zhī hé zuì dà shì jǐ`, `${DICE_EN}What is the largest possible sum?`],
  ['dice.seven', `${DICE}点数之和是 7，一共有几种不同的情况？`, `${DICE_PY} diǎn shù zhī hé shì yí gòng yǒu jǐ zhǒng bù tóng de qíng kuàng`, `${DICE_EN}In how many different ways can the sum be 7?`],
  ['dice.best', `${DICE}点数之和是几的可能性最大？`, `${DICE_PY} diǎn shù zhī hé shì jǐ de kě néng xìng zuì dà`, `${DICE_EN}Which sum is most likely?`],
  ['dice.game', `${DICE}如果点数之和是 5、6、7、8、9 老师赢，否则同学们赢。这个游戏公平吗？`, `${DICE_PY} rú guǒ diǎn shù zhī hé shì lǎo shī yíng fǒu zé tóng xué men yíng zhè ge yóu xì gōng píng ma`, `${DICE_EN}If the sum is 5, 6, 7, 8 or 9, the teacher wins; otherwise the students win. Is this game fair?`],
  ['ten.ask', '把 10 张数字卡片放进纸袋，随意摸一张。要使摸出 1 的可能性最大，摸出 5 的可能性最小，摸出 3 和 7 的可能性一样大，下面哪一组卡片可以？', 'bǎ zhāng shù zì kǎ piàn fàng jìn zhǐ dài suí yì mō yì zhāng yào shǐ mō chū de kě néng xìng zuì dà mō chū de kě néng xìng zuì xiǎo mō chū hé de kě néng xìng yí yàng dà xià miàn nǎ yì zǔ kǎ piàn kě yǐ', 'Put 10 number cards in a paper bag and take one at random. To make 1 the most likely, 5 the least likely, and 3 and 7 equally likely, which set of cards works?'],
  ['ten.opt', '1 有 {a} 张，3 有 {b} 张，7 有 {c} 张，5 有 {e} 张', 'yǒu zhāng yǒu zhāng yǒu zhāng yǒu zhāng', '{a} cards of 1, {b} of 3, {c} of 7, {e} of 5'],
  // ── 根据试验数据推测 ──
  ['group', '盒子里有红、黄两种颜色的球。一个小组每次摸出一个球，记下颜色再放回去摇匀，摸了 20 次，记录如下。', 'hé zi lǐ yǒu hóng huáng liǎng zhǒng yán sè de qiú yí ge xiǎo zǔ měi cì mō chū yí ge qiú jì xià yán sè zài fàng huí qù yáo yún mō le cì jì lù rú xià', 'A box holds red and yellow balls. A group took out one ball at a time, noted the colour and put it back, 20 times in all. Here is the record.'],
  ['more.ask', '盒子里可能是红球多还是黄球多？', 'hé zi lǐ kě néng shì hóng qiú duō hái shì huáng qiú duō', 'Are there probably more red balls or more yellow balls in the box?'],
  ['more', '{c}球多', 'qiú duō', 'More {c} balls'],
  ['groups', '盒子里有红、黄两种颜色的球，每个小组摸 20 次，摸出后放回去摇匀。下面是八个小组的统计情况。', 'hé zi lǐ yǒu hóng huáng liǎng zhǒng yán sè de qiú měi ge xiǎo zǔ mō cì mō chū hòu fàng huí qù yáo yún xià miàn shì bā ge xiǎo zǔ de tǒng jì qíng kuàng', 'A box holds red and yellow balls. Each group drew 20 times, putting the ball back each time. Here are the results of eight groups.'],
  ['t.title', '摸球的次数', 'mō qiú de cì shù', 'Number of draws'],
  ['t.group', '小组', 'xiǎo zǔ', 'group'],
  ['t.total', '合计', 'hé jì', 'total'],
  ['t.red', '红球', 'hóng qiú', 'red'],
  ['t.yellow', '黄球', 'huáng qiú', 'yellow'],
  ['t.color', '颜色', 'yán sè', 'colour'],
  ['t.times', '次数', 'cì shù', 'times'],
  ['do3.most', '某小组在装有红、蓝、黄三种颜色小球的盒子里摸球，每次摸出后放回去摇匀，记录如下。盒子里可能哪种颜色的球最多？', 'mǒu xiǎo zǔ zài zhuāng yǒu hóng lán huáng sān zhǒng yán sè xiǎo qiú de hé zi lǐ mō qiú měi cì mō chū hòu fàng huí qù yáo yún jì lù rú xià hé zi lǐ kě néng nǎ zhǒng yán sè de qiú zuì duō', 'A group drew balls from a box of red, blue and yellow balls, putting each one back. Here is the record. Which colour probably has the most balls?'],
  ['do3.liang', '小亮说：摸出黄球的次数比摸出蓝球的次数多，所以盒子里的黄球一定比蓝球多。这样判断，对吗？', 'xiǎo liàng shuō mō chū huáng qiú de cì shù bǐ mō chū lán qiú de cì shù duō suǒ yǐ hé zi lǐ de huáng qiú yí dìng bǐ lán qiú duō zhè yàng pàn duàn duì ma', 'Xiaoliang says: yellow was drawn more often than blue, so there must be more yellow balls than blue balls in the box. Is that right?'],
  ['p6.max', '盒子里有红、黄、白三种颜色的球。小明每次摸出一个，记下颜色后放回摇匀，一共摸了 60 次。盒子里可能哪种颜色的球最多？', 'hé zi lǐ yǒu hóng huáng bái sān zhǒng yán sè de qiú xiǎo míng měi cì mō chū yí ge jì xià yán sè hòu fàng huí yáo yún yí gòng mō le cì hé zi lǐ kě néng nǎ zhǒng yán sè de qiú zuì duō', 'A box holds red, yellow and white balls. Xiaoming took one at a time and put it back, 60 times in all. Which colour probably has the most balls?'],
  ['p6.min', '盒子里有红、黄、白三种颜色的球。小明每次摸出一个，记下颜色后放回摇匀，一共摸了 60 次。盒子里可能哪种颜色的球最少？', 'hé zi lǐ yǒu hóng huáng bái sān zhǒng yán sè de qiú xiǎo míng měi cì mō chū yí ge jì xià yán sè hòu fàng huí yáo yún yí gòng mō le cì hé zi lǐ kě néng nǎ zhǒng yán sè de qiú zuì shǎo', 'A box holds red, yellow and white balls. Xiaoming took one at a time and put it back, 60 times in all. Which colour probably has the fewest balls?'],
  ['total.red', '八个小组一共摸出红球多少次？', 'bā ge xiǎo zǔ yí gòng mō chū hóng qiú duō shao cì', 'How many times did the eight groups draw red in all?'],
  ['total.yellow', '八个小组一共摸出黄球多少次？', 'bā ge xiǎo zǔ yí gòng mō chū huáng qiú duō shao cì', 'How many times did the eight groups draw yellow in all?'],
  ['total.all', '八个小组一共摸了多少次？', 'bā ge xiǎo zǔ yí gòng mō le duō shao cì', 'How many draws did the eight groups make in all?'],
  ['rest', '每个小组摸 20 次。{g}摸出红球 {r} 次，摸出黄球多少次？', 'měi ge xiǎo zǔ mō cì mō chū hóng qiú cì mō chū huáng qiú duō shao cì', 'Each group drew 20 times. {g} drew red {r} times. How many times did it draw yellow?'],
  ['g1', '第一小组', 'dì yī xiǎo zǔ', 'Group 1'],
  ['g2', '第二小组', 'dì èr xiǎo zǔ', 'Group 2'],
  ['g3', '第三小组', 'dì sān xiǎo zǔ', 'Group 3'],
  ['g4', '第四小组', 'dì sì xiǎo zǔ', 'Group 4'],
  ['g5', '第五小组', 'dì wǔ xiǎo zǔ', 'Group 5'],
  ['g6', '第六小组', 'dì liù xiǎo zǔ', 'Group 6'],
  ['g7', '第七小组', 'dì qī xiǎo zǔ', 'Group 7'],
  ['g8', '第八小组', 'dì bā xiǎo zǔ', 'Group 8'],
  ['judge.has', '摸了 20 次，摸出过 5 次黄球，说明盒子里一定有黄球，对吗？', 'mō le cì mō chū guò cì huáng qiú shuō míng hé zi lǐ yí dìng yǒu huáng qiú duì ma', 'Out of 20 draws, yellow came up 5 times. So there must be yellow balls in the box. Is that right?'],
  ['judge.more', '摸出红球的次数比黄球多，说明盒子里的红球一定比黄球多，对吗？', 'mō chū hóng qiú de cì shù bǐ huáng qiú duō shuō míng hé zi lǐ de hóng qiú yí dìng bǐ huáng qiú duō duì ma', 'Red was drawn more often than yellow. So there must be more red balls than yellow balls in the box. Is that right?'],
]

const table = (col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m5.chance.${r[0]}`, r[col]]))

export const ZH: Dict = table(1)
export const EN: Dict = table(3)
export const PY: Record<string, string> = table(2)
