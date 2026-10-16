// 六下「2 百分数（二）」，另有六上「百分数」的折扣、利率的词条（六年级数学 F），键一律以「m6.pct2.」开头。
// 课本用词：打折、几折、原价、现价、便宜、成数、几成、增产、节电、税率、应纳税额、增值税、个人所得税、消费税、劳务报酬、免税、
// 储蓄、本金、利息、利率、存期、活期、整存整取、定期、连本带息、促销、每满……减……、标价、折上折、国债、理财产品、年收益率。
// 写法：几折、几成照课本写汉字（八五折、二成五），英文写「8.5 zhe」「2.5 cheng」并在说明里交代 zhe / cheng 是十分之几。
// 朗读避坑：「应付」「应缴纳」（应）写「要付」「要缴纳」，术语「应纳税额」照写；「相差」（差）写「便宜多少元」；「可得」（得）写「可以得到」；
// 「增长」写「增加」、「产量」（量）写「收了多少吨」；「两种」（种）不写；「接着」（着）写「继续」；「晚 8:00」写「晚上 8 点」。
import type { Dict } from '@/engine/i18n'

type Row = [string, string, string, string]

const DIGIT = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const DIGIT_PY = ['', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ']

/** 几折：10 → 一折（yì zhé），85 → 八五折，57 → 五七折（两次打折「相当于打几折」要用到） */
function zheRows(): Row[] {
  const out: Row[] = []
  for (let p = 10; p <= 99; p++) {
    const t = Math.floor(p / 10)
    const o = p % 10
    const zh = `${DIGIT[t]}${o ? DIGIT[o] : ''}折`
    // 「一折」读 yì zhé（折是第二声）；「一五折」是数字连读，一读 yī
    const py = [t === 1 && !o ? 'yì' : DIGIT_PY[t], ...(o ? [DIGIT_PY[o]] : []), 'zhé'].join(' ')
    out.push([`z.${p}`, zh, py, `${p / 10} zhe`])
  }
  return out
}
/** 几成：10 → 一成，25 → 二成五（成是第二声，「一成」读 yì chéng） */
function chengRows(): Row[] {
  const out: Row[] = []
  for (let p = 10; p <= 95; p += 5) {
    const t = Math.floor(p / 10)
    const o = p % 10
    const zh = `${DIGIT[t]}成${o ? DIGIT[o] : ''}`
    const py = [t === 1 ? 'yì' : DIGIT_PY[t], 'chéng', ...(o ? [DIGIT_PY[o]] : [])].join(' ')
    out.push([`c.${p}`, zh, py, `${p / 10} cheng`])
  }
  out.push(['c.two', '两成', 'liǎng chéng', '2 cheng'])
  return out
}
const digitRows = (): Row[] => DIGIT.slice(1).map((d, i) => [`d.${i + 1}`, d, DIGIT_PY[i + 1]!, String(i + 1)])

const ROWS: Row[] = [
  ...zheRows(),
  ...chengRows(),
  ...digitRows(),
  // 折扣
  ['zhe.rule', '几折就是十分之几，也就是百分之几十。', 'jǐ zhé jiù shì shí fēn zhī jǐ yě jiù shì bǎi fēn zhī jǐ shí', '“n zhe” means paying n tenths of the original price, that is, n × 10 percent of it.'],
  ['zhe.toPct', '打{z}就是按原价的百分之几出售？', 'dǎ jiù shì àn yuán jià de bǎi fēn zhī jǐ chū shòu', 'Selling at {z} means selling at what percent of the original price?'],
  ['zhe.fromPct', '按原价的 {p}% 出售，就是打几折？', 'àn yuán jià de chū shòu jiù shì dǎ jǐ zhé', 'Selling at {p}% of the original price is how many zhe?'],
  ['zhe.jOff', '打{z}就是比原价便宜了 {p}%，对吗？', 'dǎ jiù shì bǐ yuán jià pián yi le duì ma', 'Selling at {z} means it is {p}% cheaper than the original price. Is that right?'],
  ['zhe.jAt', '打{z}就是按原价的 {p}% 出售，对吗？', 'dǎ jiù shì àn yuán jià de chū shòu duì ma', 'Selling at {z} means selling at {p}% of the original price. Is that right?'],
  ['zhe.which', '原价 {p} 元的东西，现在卖 {q} 元，打了几折？', 'yuán jià yuán de dōng xi xiàn zài mài yuán dǎ le jǐ zhé', 'Something was {p} yuan and now sells for {q} yuan. How many zhe is that?'],
  ['zhe.off', '打{z}，比原价便宜了百分之几？', 'dǎ bǐ yuán jià pián yi le bǎi fēn zhī jǐ', 'At {z}, what percent cheaper is it than the original price?'],
  ['fromNow.q', '一件东西打{z}后卖 {v} 元，它的原价是多少元？', 'yí jiàn dōng xi dǎ hòu mài yuán tā de yuán jià shì duō shao yuán', 'After {z}, something sells for {v} yuan. What was its original price?'],
  ['price.q', '{it}原价 {p} 元，现在打{z}出售，现价是多少元？', 'yuán jià yuán xiàn zài dǎ chū shòu xiàn jià shì duō shao yuán', 'The price of the {it} was {p} yuan, and now it sells at {z}. What is the price now?'],
  ['save.q', '{it}原价 {p} 元，现在打{z}出售，比原价便宜了多少元？', 'yuán jià yuán xiàn zài dǎ chū shòu bǐ yuán jià pián yi le duō shao yuán', 'The price of the {it} was {p} yuan, and now it sells at {z}. How much cheaper is it than before?'],
  ['formula.save', '{it}原价 {p} 元，打{z}出售。求比原价便宜了多少元，下面哪个算式是对的？', 'yuán jià yuán dǎ chū shòu qiú bǐ yuán jià pián yi le duō shao yuán xià miàn nǎ ge suàn shì shì duì de', 'The price of the {it} was {p} yuan, and it sells at {z}. Which number sentence finds how much cheaper it is?'],
  ['formula.now', '{it}原价 {p} 元，打{z}出售。求现价是多少元，下面哪个算式是对的？', 'yuán jià yuán dǎ chū shòu qiú xiàn jià shì duō shao yuán xià miàn nǎ ge suàn shì shì duì de', 'The price of the {it} was {p} yuan, and it sells at {z}. Which number sentence finds the price now?'],
  ['it.bike', '自行车', 'zì xíng chē', 'bike'],
  ['it.kettle', '电水壶', 'diàn shuǐ hú', 'electric kettle'],
  ['it.ball', '篮球', 'lán qiú', 'basketball'],
  ['it.bag', '书包', 'shū bāo', 'schoolbag'],
  ['it.book', '书', 'shū', 'book'],
  ['it.table', '桌子', 'zhuō zi', 'table'],
  ['it.chair', '椅子', 'yǐ zi', 'chair'],
  ['it.bed', '床', 'chuáng', 'bed'],
  ['it.wardrobe', '衣柜', 'yī guì', 'wardrobe'],
  ['it.lamp', '台灯', 'tái dēng', 'desk lamp'],
  ['it.coat', '外套', 'wài tào', 'coat'],
  ['it.racket', '球拍', 'qiú pāi', 'racket'],
  ['it.tv', '电视机', 'diàn shì jī', 'TV'],
  ['it.skirt', '裙子', 'qún zi', 'skirt'],
  ['it.sneakers', '运动鞋', 'yùn dòng xié', 'trainers'],
  ['it.shoes', '鞋', 'xié', 'shoes'],
  ['it.books', '书', 'shū', 'books'],
  ['it.suit', '运动服', 'yùn dòng fú', 'sportswear'],
  ['bread.rule', '面包店晚上 8 点以后，面包一律打五折。', 'miàn bāo diàn wǎn shàng diǎn yǐ hòu miàn bāo yí lǜ dǎ wǔ zhé', 'After 8 in the evening, all bread in the bakery sells at 5 zhe (half price).'],
  ['bread.one', '标价 {p} 元的面包，打折后多少元？', 'biāo jià yuán de miàn bāo dǎ zhé hòu duō shao yuán', 'How much is a {p}-yuan loaf after the discount?'],
  ['bread.buy', '玲玲买了 {a} 个 {p} 元的面包和 {b} 个 {q} 元的面包，打折后一共要付多少元？', 'líng líng mǎi le ge yuán de miàn bāo hé ge yuán de miàn bāo dǎ zhé hòu yí gòng yào fù duō shao yuán', 'Lingling buys {a} loaves at {p} yuan and {b} loaves at {q} yuan. How much does she pay in all after the discount?'],
  ['bread.max', '玲玲拿了 10 元，打折后最多能买几个 {p} 元的面包？', 'líng líng ná le yuán dǎ zhé hòu zuì duō néng mǎi jǐ ge yuán de miàn bāo', 'Lingling has 10 yuan. After the discount, at most how many {p}-yuan loaves can she buy?'],
  ['furn.rule', '周年店庆，家具一律打八折。', 'zhōu nián diàn qìng jiā jù yí lǜ dǎ bā zhé', 'For the store’s anniversary, all furniture sells at 8 zhe.'],
  ['furn.q', '标价 {p} 元的{it}，打折后要付多少元？', 'biāo jià yuán de dǎ zhé hòu yào fù duō shao yuán', 'The {it} is marked {p} yuan. How much do you pay after the discount?'],
  ['orig.q', '书店凭优惠卡买书可以打{z}。小明用优惠卡买了一套书，省了 {s} 元。这套书原价多少元？', 'shū diàn píng yōu huì kǎ mǎi shū kě yǐ dǎ xiǎo míng yòng yōu huì kǎ mǎi le yí tào shū shěng le yuán zhè tào shū yuán jià duō shao yuán', 'With a member card, books in the bookshop sell at {z}. Xiaoming used the card to buy a set of books and saved {s} yuan. What was the original price?'],
  ['mv.price', '票价', 'piào jià', 'ticket'],
  ['mv.each', '每张 80 元', 'měi zhāng yuán', '80 yuan each'],
  ['mv.am', '上午场', 'shàng wǔ chǎng', 'morning show'],
  ['mv.pm', '下午场', 'xià wǔ chǎng', 'afternoon show'],
  ['mv.two1', '买二送一', 'mǎi èr sòng yī', 'buy 2, get 1 free'],
  ['mv.q', '小华和两个朋友一起去看电影，优惠后票价一共节省了 {s} 元。他们看的是哪个场次？', 'xiǎo huá hé liǎng ge péng you yì qǐ qù kàn diàn yǐng yōu huì hòu piào jià yí gòng jié shěng le yuán tā men kàn de shì nǎ ge chǎng cì', 'Xiaohua and two friends went to a film and saved {s} yuan on tickets in all. Which show did they see?'],
  ['profit.cost', '一台洗衣机按 50% 的利润率定价，然后打八折出售，可以获利 1200 元。这台洗衣机的成本价是多少元？', 'yì tái xǐ yī jī àn de lì rùn lǜ dìng jià rán hòu dǎ bā zhé chū shòu kě yǐ huò lì yuán zhè tái xǐ yī jī de chéng běn jià shì duō shao yuán', 'A washing machine is priced at its cost plus 50% profit, then sold at 8 zhe, making a profit of 1200 yuan. What did it cost?'],
  ['profit.most', '一台洗衣机的成本价是 6000 元，按 50% 的利润率定价。如果想至少得到 2100 元利润，最多打几折出售？', 'yì tái xǐ yī jī de chéng běn jià shì yuán àn de lì rùn lǜ dìng jià rú guǒ xiǎng zhì shǎo dé dào yuán lì rùn zuì duō dǎ jǐ zhé chū shòu', 'A washing machine cost 6000 yuan and is priced at cost plus 50% profit. To make at least 2100 yuan of profit, what is the biggest discount (fewest zhe) it can be sold at?'],
  ['show.q', '剧院原来的门票是 20 元一张。门票打折以后，观众人数增加了 1 倍，门票总收入增加了 50%。门票打了几折？', 'jù yuàn yuán lái de mén piào shì yuán yì zhāng mén piào dǎ zhé yǐ hòu guān zhòng rén shù zēng jiā le bèi mén piào zǒng shōu rù zēng jiā le mén piào dǎ le jǐ zhé', 'A theatre ticket used to cost 20 yuan. After a discount, the audience doubled and the ticket income grew by 50%. How many zhe was the discount?'],
  // 打折与满减
  ['st.A', 'A 商场', 'shāng chǎng', 'Store A'],
  ['st.B', 'B 商场', 'shāng chǎng', 'Store B'],
  ['st.Ashop', 'A 店', 'diàn', 'Shop A'],
  ['st.Bshop', 'B 店', 'diàn', 'Shop B'],
  ['st.jia', '甲品牌', 'jiǎ pǐn pái', 'Brand Jia'],
  ['st.yi', '乙品牌', 'yǐ pǐn pái', 'Brand Yi'],
  ['st.same', '一样多', 'yí yàng duō', 'the same'],
  // 「在 A 商场」：字母前后空一格（「在{st}」直接拼会成「在A 商场」）
  ['at.A', '在 A 商场', 'zài shāng chǎng', 'at Store A'],
  ['at.B', '在 B 商场', 'zài shāng chǎng', 'at Store B'],
  ['at.Ashop', '在 A 店', 'zài diàn', 'at Shop A'],
  ['at.Bshop', '在 B 店', 'zài diàn', 'at Shop B'],
  ['at.jia', '在甲品牌', 'zài jiǎ pǐn pái', 'at Brand Jia'],
  ['at.yi', '在乙品牌', 'zài yǐ pǐn pái', 'at Brand Yi'],
  ['sale.ruleZhe', '{st}打{z}', 'dǎ', '{st}: {z}'],
  ['sale.ruleFull', '{st}每满 {t} 元减 {m} 元', 'měi mǎn yuán jiǎn yuán', '{st}: {m} yuan off for every full {t} yuan'],
  ['sale.ruleTwice', '{st}先打{z1}，再打{z2}', 'xiān dǎ zài dǎ', '{st}: first {z1}, then {z2} on top'],
  ['sale.ctx', '{it}标价 {p} 元：{r1}；{r2}。', 'biāo jià yuán', 'The {it} is marked {p} yuan. {r1}; {r2}.'],
  ['sale.payAt', '{at}买，要付多少元？', 'mǎi yào fù duō shao yuán', 'How much do you pay {at}?'],
  ['sale.which', '在哪里买更省钱？', 'zài nǎ lǐ mǎi gèng shěng qián', 'Where is it cheaper to buy?'],
  ['sale.cheaper', '{atA}买比{atB}买便宜多少元？', 'mǎi bǐ mǎi pián yi duō shao yuán', 'How much cheaper is it {atA} than {atB}?'],
  ['sale.minus', '每满 {t} 元减 {m} 元。买标价 {p} 元的东西，一共可以减去多少元？', 'měi mǎn yuán jiǎn yuán mǎi biāo jià yuán de dōng xi yí gòng kě yǐ jiǎn qù duō shao yuán', '{m} yuan off for every full {t} yuan. If something is marked {p} yuan, how much is taken off in all?'],
  ['sale.asZhe', '先打{z1}，再打{z2}，相当于打几折？', 'xiān dǎ zài dǎ xiāng dāng yú dǎ jǐ zhé', 'First {z1}, then {z2} on top: how many zhe is that in all?'],
  // 成数
  ['ch.rule', '成数表示一个数是另一个数的十分之几，通称几成。', 'chéng shù biǎo shì yí gè shù shì lìng yí gè shù de shí fēn zhī jǐ tōng chēng jǐ chéng', '“Cheng” tells how many tenths one number is of another: n cheng means n tenths.'],
  ['ch.toPct', '{c}改写成百分数是多少？', 'gǎi xiě chéng bǎi fēn shù shì duō shao', 'Write {c} as a percentage.'],
  ['ch.toFrac', '{c}就是十分之几？', 'jiù shì shí fēn zhī jǐ', '{c} is how many tenths?'],
  ['tenths', '十分之{w}', 'shí fēn zhī', '{w}/10'],
  ['hundredths', '百分之{w}', 'bǎi fēn zhī', '{w}/100'],
  ['over', '{w}分之一', 'fēn zhī yī', '1/{w}'],
  ['ch.fromPct', '{p}% 是几成？', 'shì jǐ chéng', '{p}% is how many cheng?'],
  ['ch.save', '某工厂去年用电 {a} 万千瓦时，今年比去年节电{c}。今年用电多少万千瓦时？', 'mǒu gōng chǎng qù nián yòng diàn wàn qiān wǎ shí jīn nián bǐ qù nián jié diàn jīn nián yòng diàn duō shao wàn qiān wǎ shí', 'A factory used {a} ten-thousand kWh of electricity last year. This year it used {c} less. How much (in ten-thousand kWh) did it use this year?'],
  ['ch.back', '某市今年接待游客约 {b} 万人次，比去年增加{c}。去年约接待游客多少万人次？', 'mǒu shì jīn nián jiē dài yóu kè yuē wàn rén cì bǐ qù nián zēng jiā qù nián yuē jiē dài yóu kè duō shao wàn rén cì', 'A city had about {b} ten-thousand tourist visits this year, {c} more than last year. About how many (in ten-thousands) were there last year?'],
  ['ch.up', '某县前年收了 {a} 万吨秋粮，去年比前年增产{c}。去年收了多少万吨秋粮？', 'mǒu xiàn qián nián shōu le wàn dūn qiū liáng qù nián bǐ qián nián zēng chǎn qù nián shōu le duō shao wàn dūn qiū liáng', 'A county harvested {a} ten-thousand tonnes of autumn grain the year before last. Last year the harvest was up {c}. How much did it harvest last year?'],
  ['ch.car', '某汽车公司 2 月出口汽车 {b} 万辆，比 1 月增加{c}。1 月出口汽车多少万辆？', 'mǒu qì chē gōng sī yuè chū kǒu qì chē wàn liàng bǐ yuè zēng jiā yuè chū kǒu qì chē duō shao wàn liàng', 'A car company exported {b} ten-thousand cars in February, {c} more than in January. How many (in ten-thousands) did it export in January?'],
  ['ch.j', '今年比去年增产{c}，就是今年收的粮食是去年的 {p}%，对吗？', 'jīn nián bǐ qù nián zēng chǎn jiù shì jīn nián shōu de liáng shi shì qù nián de duì ma', 'This year’s grain is up {c} on last year, so this year’s harvest is {p}% of last year’s. Is that right?'],
  ['ch.mean', '今年比去年增产{c}，今年多收的粮食是去年的百分之几？', 'jīn nián bǐ qù nián zēng chǎn jīn nián duō shōu de liáng shi shì qù nián de bǎi fēn zhī jǐ', 'This year’s grain is up {c} on last year. The extra grain is what percent of last year’s harvest?'],
  ['ch.how', '去年收了 {a} 吨粮食，今年收了 {b} 吨，今年比去年增产了几成？', 'qù nián shōu le dūn liáng shi jīn nián shōu le dūn jīn nián bǐ qù nián zēng chǎn le jǐ chéng', 'Last year {a} tonnes of grain were harvested, and this year {b} tonnes. By how many cheng did it go up?'],
  ['ch.tv', '2021 年我国生产液晶电视机 17424.3 万台，比 2020 年减少了 9.5%。2020 年约生产多少万台？结果保留一位小数。', 'nián wǒ guó shēng chǎn yè jīng diàn shì jī wàn tái bǐ nián jiǎn shǎo le nián yuē shēng chǎn duō shao wàn tái jié guǒ bǎo liú yí wèi xiǎo shù', 'In 2021 China made 17424.3 ten-thousand LCD TVs, 9.5% fewer than in 2020. About how many (in ten-thousands) were made in 2020? Round to one decimal place.'],
  // 税率
  ['tax.whatAmount', '缴纳的税款叫作什么？', 'jiǎo nà de shuì kuǎn jiào zuò shén me', 'What is the tax you pay called?'],
  ['tax.whatRate', '应纳税额与收入中要纳税部分的比率叫作什么？', 'yīng nà shuì é yǔ shōu rù zhōng yào nà shuì bù fen de bǐ lǜ jiào zuò shén me', 'What is the ratio of the tax payable to the taxable part of the income called?'],
  ['w.taxAmount', '应纳税额', 'yīng nà shuì é', 'tax payable'],
  ['w.taxRate', '税率', 'shuì lǜ', 'tax rate'],
  ['w.sales', '销售额', 'xiāo shòu é', 'sales'],
  ['w.rate', '利率', 'lì lǜ', 'interest rate'],
  ['w.discount', '折扣', 'zhé kòu', 'discount'],
  ['w.principal', '本金', 'běn jīn', 'principal'],
  ['w.interest', '利息', 'lì xī', 'interest'],
  ['w.term', '存期', 'cún qī', 'term'],
  ['tax.vat', '某企业按销售额的 {r} 缴纳增值税。{m} 月要纳税的销售额是 {s} 万元，要缴纳增值税多少万元？', 'mǒu qǐ yè àn xiāo shòu é de jiǎo nà zēng zhí shuì yuè yào nà shuì de xiāo shòu é shì wàn yuán yào jiǎo nà zēng zhí shuì duō shao wàn yuán', 'A company pays value-added tax at {r} of its sales. In month {m} its taxable sales were {s} ten-thousand yuan. How much tax (in ten-thousand yuan) does it pay?'],
  ['tax.wage', '李阿姨这个月工资中要纳税的部分是 {s} 元，按 {r} 的税率缴纳个人所得税，要缴多少元？', 'lǐ ā yí zhè ge yuè gōng zī zhōng yào nà shuì de bù fen shì yuán àn de shuì lǜ jiǎo nà gè rén suǒ dé shuì yào jiǎo duō shao yuán', 'Aunt Li’s taxable wage this month is {s} yuan. She pays income tax at a rate of {r}. How much tax does she pay?'],
  ['tax.consume', '一瓶化妆品售价 {p} 元，其中消费税占售价的 {r}。消费税是多少元？', 'yì píng huà zhuāng pǐn shòu jià yuán qí zhōng xiāo fèi shuì zhàn shòu jià de xiāo fèi shuì shì duō shao yuán', 'A bottle of skin cream sells for {p} yuan, and consumption tax is {r} of the price. How much is the tax?'],
  ['tax.labor', '小明的爸爸得到一笔 {p} 元的劳务报酬，其中 800 元免税，其余部分按 20% 的税率缴税。一共要缴税多少元？', 'xiǎo míng de bà ba dé dào yì bǐ yuán de láo wù bào chóu qí zhōng yuán miǎn shuì qí yú bù fen àn de shuì lǜ jiǎo shuì yí gòng yào jiǎo shuì duō shao yuán', 'Xiaoming’s dad was paid {p} yuan for some work. 800 yuan of it is tax-free, and the rest is taxed at 20%. How much tax does he pay in all?'],
  ['tax.j', '税率就是要缴纳的税款，对吗？', 'shuì lǜ jiù shì yào jiǎo nà de shuì kuǎn duì ma', 'The tax rate is the amount of tax you pay. Is that right?'],
  ['tax.rateBack', '某店这个月要纳税的营业额是 {s} 元，缴纳了 {t} 元税款。税率是多少？', 'mǒu diàn zhè ge yuè yào nà shuì de yíng yè é shì yuán jiǎo nà le yuán shuì kuǎn shuì lǜ shì duō shao', 'A shop’s taxable turnover this month is {s} yuan, and it paid {t} yuan of tax. What is the tax rate?'],
  ['tax.baseBack', '按 {r} 的税率缴纳个人所得税，李阿姨这个月缴了 {t} 元。她工资中要纳税的部分是多少元？', 'àn de shuì lǜ jiǎo nà gè rén suǒ dé shuì lǐ ā yí zhè ge yuè jiǎo le yuán tā gōng zī zhōng yào nà shuì de bù fen shì duō shao yuán', 'Aunt Li pays income tax at {r} and paid {t} yuan this month. How much of her wage is taxable?'],
  ['tax.left', '一瓶化妆品售价 {p} 元，其中消费税占售价的 {r}。除去消费税，剩下多少元？', 'yì píng huà zhuāng pǐn shòu jià yuán qí zhōng xiāo fèi shuì zhàn shòu jià de chú qù xiāo fèi shuì shèng xià duō shao yuán', 'A bottle of skin cream sells for {p} yuan, and consumption tax is {r} of the price. How much is left after the tax?'],
  // 利率
  ['th.title', '存款年利率', 'cún kuǎn nián lì lǜ', 'Yearly deposit rates'],
  ['th.term', '存期', 'cún qī', 'term'],
  ['th.rate', '年利率/%', 'nián lì lǜ', 'yearly rate/%'],
  ['th.periods', '分期数', 'fēn qī shù', 'instalments'],
  ['th.prate', '每期分期利率', 'měi qī fēn qī lì lǜ', 'rate per instalment'],
  ['term.live', '活期', 'huó qī', 'demand deposit'],
  ['term.m3', '三个月', 'sān ge yuè', '3 months'],
  ['term.m6', '六个月', 'liù ge yuè', '6 months'],
  ['term.y1', '一年', 'yì nián', '1 year'],
  ['term.y2', '二年', 'èr nián', '2 years'],
  ['term.y3', '三年', 'sān nián', '3 years'],
  ['who.wang', '王奶奶', 'wáng nǎi nai', 'Granny Wang'],
  ['who.zhang', '张爷爷', 'zhāng yé ye', 'Grandpa Zhang'],
  ['who.ming', '小明', 'xiǎo míng', 'Xiaoming'],
  ['who.mom', '妈妈', 'mā ma', 'Mum'],
  ['who.li', '李阿姨', 'lǐ ā yí', 'Aunt Li'],
  ['int.ctx', '{who}把 {p} 元存入银行，存{term}定期，年利率是 {r}。', 'bǎ yuán cún rù yín háng cún dìng qī nián lì lǜ shì', '{who} puts {p} yuan in the bank for a fixed term of {term} at a yearly rate of {r}.'],
  ['int.q.interest', '到期时可以得到多少元利息？', 'dào qī shí kě yǐ dé dào duō shao yuán lì xī', 'How much interest is paid at the end of the term?'],
  ['int.q.total', '到期时连本带息一共可以取出多少元？', 'dào qī shí lián běn dài xī yí gòng kě yǐ qǔ chū duō shao yuán', 'At the end of the term, how much can be taken out in all, principal plus interest?'],
  ['int.q.formula', '求到期时一共可以取出多少元，下面哪个算式是对的？', 'qiú dào qī shí yí gòng kě yǐ qǔ chū duō shao yuán xià miàn nǎ ge suàn shì shì duì de', 'Which number sentence finds how much can be taken out in all at the end of the term?'],
  ['int.what.principal', '存入银行的钱叫作什么？', 'cún rù yín háng de qián jiào zuò shén me', 'What is the money put in the bank called?'],
  ['int.what.interest', '取款时，银行多支付的钱叫作什么？', 'qǔ kuǎn shí yín háng duō zhī fù de qián jiào zuò shén me', 'When you take your money out, what is the extra money the bank pays called?'],
  ['int.what.rate', '单位时间内利息与本金的比率叫作什么？', 'dān wèi shí jiān nèi lì xī yǔ běn jīn de bǐ lǜ jiào zuò shén me', 'What is the ratio of interest to principal per unit of time called?'],
  ['int.what.term', '王奶奶存了二年定期，这里的二年叫作什么？', 'wáng nǎi nai cún le èr nián dìng qī zhè lǐ de èr nián jiào zuò shén me', 'Granny Wang made a 2-year fixed deposit. What is “2 years” here called?'],
  ['int.formula.q', '利息怎样算？', 'lì xī zěn yàng suàn', 'How is interest worked out?'],
  ['f.right', '本金 × 利率 × 存期', 'běn jīn lì lǜ cún qī', 'principal × rate × term'],
  ['f.noTerm', '本金 × 利率', 'běn jīn lì lǜ', 'principal × rate'],
  ['f.plus', '本金 + 利率 × 存期', 'běn jīn lì lǜ cún qī', 'principal + rate × term'],
  ['f.div', '本金 × 存期 ÷ 利率', 'běn jīn cún qī lì lǜ', 'principal × term ÷ rate'],
  ['int.table.q', '整存整取{term}的年利率是多少？', 'zhěng cún zhěng qǔ de nián lì lǜ shì duō shao', 'What is the yearly rate for a fixed deposit of {term}?'],
  ['int.table.live', '活期的年利率是多少？', 'huó qī de nián lì lǜ shì duō shao', 'What is the yearly rate for a demand deposit?'],
  ['int.jRight', '利息 = 本金 × 利率 × 存期，对吗？', 'lì xī běn jīn lì lǜ cún qī duì ma', 'Interest = principal × rate × term. Is that right?'],
  ['int.jWrong', '利息 = 本金 × 利率，对吗？', 'lì xī běn jīn lì lǜ duì ma', 'Interest = principal × rate. Is that right?'],
  ['int.more', '二年定期的年利率是 2.10%，三年定期的年利率是 2.75%。{p} 元存三年定期，比存二年定期多得到多少元利息？', 'èr nián dìng qī de nián lì lǜ shì sān nián dìng qī de nián lì lǜ shì yuán cún sān nián dìng qī bǐ cún èr nián dìng qī duō dé dào duō shao yuán lì xī', 'A 2-year fixed deposit pays 2.10% a year and a 3-year one pays 2.75% a year. How much more interest does {p} yuan earn on the 3-year deposit?'],
  ['period', '{n} 期', 'qī', '{n} instalments'],
  ['card.q', '信用卡账单 10000 元，分 {n} 期付清，每期另外按总额的 {r} 付利息。一共要付多少元利息？', 'xìn yòng kǎ zhàng dān yuán fēn qī fù qīng měi qī lìng wài àn zǒng é de fù lì xī yí gòng yào fù duō shao yuán lì xī', 'A credit card bill of 10000 yuan is paid off in {n} instalments. Each instalment also charges {r} of the whole bill as interest. How much interest is paid in all?'],
  ['bond.q', '妈妈有 1 万元，买了三年期国债，年利率是 {r}。到期时可以得到多少元利息？', 'mā ma yǒu wàn yuán mǎi le sān nián qī guó zhài nián lì lǜ shì dào qī shí kě yǐ dé dào duō shao yuán lì xī', 'Mum has 10000 yuan and buys 3-year government bonds at a yearly rate of {r}. How much interest does she get at the end?'],
  ['bond.cmp1', '妈妈有 1 万元：买三年期国债，年利率是 2.38%；或者存一年定期，年利率是 1.5%，每年到期后连本带息继续存。3 年后，买国债比存一年定期多得到多少元利息？', 'mā ma yǒu wàn yuán mǎi sān nián qī guó zhài nián lì lǜ shì huò zhě cún yì nián dìng qī nián lì lǜ shì měi nián dào qī hòu lián běn dài xī jì xù cún nián hòu mǎi guó zhài bǐ cún yì nián dìng qī duō dé dào duō shao yuán lì xī', 'Mum has 10000 yuan. She can buy 3-year bonds at 2.38% a year, or make 1-year deposits at 1.5% a year, putting the principal and interest back in each year. After 3 years, how much more interest do the bonds earn?'],
  ['bond.cmp2', '妈妈有 1 万元：买三年期国债，年利率是 3.35%；或者买一年期理财产品，年收益率是 3.6%，每年到期后连本带息继续买。3 年后，买理财产品比买国债多得到多少元？', 'mā ma yǒu wàn yuán mǎi sān nián qī guó zhài nián lì lǜ shì huò zhě mǎi yì nián qī lǐ cái chǎn pǐn nián shōu yì lǜ shì měi nián dào qī hòu lián běn dài xī jì xù mǎi nián hòu mǎi lǐ cái chǎn pǐn bǐ mǎi guó zhài duō dé dào duō shao yuán', 'Mum has 10000 yuan. She can buy 3-year bonds at 3.35% a year, or a 1-year investment product earning 3.6% a year, putting the principal and earnings back in each year. After 3 years, how much more does the investment product earn?'],
  ['about', '约 {n} 元', 'yuē yuán', 'about {n} yuan'],
]

const table = (col: 1 | 2 | 3): Record<string, string> => Object.fromEntries(ROWS.map((r) => [`m6.pct2.${r[0]}`, r[col]]))

export const ZH: Dict = table(1)
export const EN: Dict = table(3)
export const PY: Record<string, string> = table(2)
