/** 知识点静态页（搜索引擎用）的专属正文：怎么学 / 常见错误 / 家长怎么陪 / 搜索词。只出现在静态页，不进应用、不注音、不朗读。 */
export interface KpSeo {
  /** 这一课在课本里学什么、怎么学（2–3 句，60–120 字） */
  learn: string
  /** 孩子常见的错误与原因（1–2 句，40–90 字） */
  mistakes: string
  /** 家长怎么陪练、怎么用生活场景练（1–2 句，40–90 字） */
  parent: string
  /** 家长会搜的词，2–4 个，如「五年级上册英语 Unit 1 单词」「PEP 五年级英语拼读练习」 */
  keywords: string[]
}

export const KP_SEO: Record<string, KpSeo> = {
  // ── 上册 Unit 1 Different friends ──
  'e5s1-01-a': {
    learn: "Part A 学描述朋友的样子和性格：What's he like? / He's tall and strong.，再学 lovely、clever、young、hard-working，用 What's Chen Jie like? / She's lovely. 问答，再读写小诗 Chen Jie is different.。",
    mistakes: "What's he like? 问的是「他是什么样的人」，孩子常和 What does he like?（他喜欢什么）弄混；hard-working 中间的连字符常漏写，clever 常拼成 clevar。",
    parent: "请孩子用 He's … / She's … 介绍一位同学，再玩「猜猜他是谁」：家长说 She's clever and hard-working.，孩子来猜，然后交换角色。",
    keywords: ['五年级上册英语 Unit 1 Different friends', "PEP 五年级英语 What's he like 句型", '五年级英语描述性格单词 clever hard-working'],
  },
  'e5s1-01-spell': {
    learn: "Let's spell 学字母组合 ai 和 ay 的发音（都读 /eɪ/）：跟读小狗在雨里玩耍的儿歌 The dog likes to play in the rain.，在 rain、wait、tail、train 和 play、day、say、way 里听音选词，再听写儿歌里的句子。",
    mistakes: 'ai 和 ay 读音一样，听写时常拿不准用哪个：ai 多在词中间（rain、tail），ay 多在词尾（day、play）；train 常漏写 r，wait 常写成 wate。',
    parent: '下雨天和孩子一起念 The dog likes to play in the rain.；家长说一个词（rain、day、tail、play），孩子说出它用的是 ai 还是 ay，再写一写。',
    keywords: ['五年级上册英语 ai ay 拼读', "PEP 五年级 Let's spell ai ay", '五年级英语 rain play day 发音'],
  },
  'e5s1-01-b': {
    learn: 'Part B 学说自己会做什么：What can you do for the festival? / I can make a robot.，再学 robot、jump rope、play the piano、play Chinese chess，读学校才艺表演海报；Reading time 讲坐轮椅的新同学 Grace 给球队画海报。',
    mistakes: 'can 后面用动词原形，孩子常说成 He can plays the piano.；乐器前要加 the，下棋和球类不加（play Chinese chess、play football）。',
    parent: '和孩子比一比各自会做什么：I can play the piano. / Can you jump rope?；一起列一张「我会做」清单，每样用 I can … 说一句，再说一样想学会的本领。',
    keywords: ['五年级上册英语 Unit 1 Part B', 'PEP 五年级英语 What can you do 句型', '五年级英语 robot piano chess 单词'],
  },
  // ── 上册 Unit 2 My feelings ──
  'e5s1-02-a': {
    learn: "Part A 学说出心情和烦恼：You look sad. What's the matter? / I'm so worried!，再学 sad、worried、excited、angry，读 Mike 和小狗 Fido 的心情书：Fido is excited. / Mike is angry.。",
    mistakes: "worried、excited 是形容词，孩子常说成 I'm worry.、I'm excite.；What's the matter? 是问「怎么了」，常被误解成「是什么东西」；angry 常拼成 angery。",
    parent: '每天睡前问孩子 How do you feel today?，让他用 sad、worried、excited、angry 说说今天的心情和原因；看动画片时指着人物问 Is he angry?。',
    keywords: ['五年级上册英语 Unit 2 My feelings', 'PEP 五年级英语心情单词 sad worried excited', "五年级英语 What's the matter 句型"],
  },
  'e5s1-02-spell': {
    learn: "Let's spell 学字母组合 ee 和 ea 的发音（都读 /iː/）：跟读小羊和蜜蜂一起喝茶聊天的儿歌 A sheep meets a friendly bee.，在 see / sheep、eat / meet、tea / team、bee / free 里听音选词，再写一句含 ee 或 ea 的句子。",
    mistakes: 'ee 和 ea 读音一样，听写时常拿不准：sheep、meet、bee、free 是 ee，tea、eat、speak、season 是 ea；meet 和 meat 读音相同，意思不同。',
    parent: '和孩子轮流说带长音 /iː/ 的词，家长写下来、孩子判断是 ee 还是 ea；喝茶、吃饭时顺口说 tea、eat，看到蜜蜂、小羊说 bee、sheep。',
    keywords: ['五年级上册英语 ee ea 拼读', "PEP 五年级 Let's spell ee ea", '五年级英语 sheep tea bee 发音'],
  },
  'e5s1-02-b': {
    learn: "Part B 学帮别人出主意：It's important to listen to each other.，再学 parent、ask，会说 You can ask your teacher for help.；读 Jim 搬家后的求助邮件，Reading time 讲小狗 Benjy 第一次见到雪。",
    mistakes: 'ask … for help 常漏掉 for，talk to、listen to 后面的 to 也容易丢；「父母」是两个人，要写 parents；afraid 常拼成 afriad。',
    parent: "孩子有烦恼时，先用 What's the matter? 问一问，再用 You can … / You need to … 一起想办法；读完 Jim 的邮件，聊聊怎样交新朋友。",
    keywords: ['五年级上册英语 Unit 2 Part B', 'PEP 五年级英语 You can ask your teacher for help', "五年级英语 It's important to 句型"],
  },
  // ── 上册 Unit 3 Work and play ──
  'e5s1-03-a': {
    learn: "Part A 学谈论一周的课：What's your favourite day at school? / It's Tuesday. / What do you have on Tuesdays? / I have maths, Chinese, art and English.，再学 Monday 到 Friday 五个星期词。",
    mistakes: '星期词首字母要大写；Tuesday 和 Thursday 读音相近，容易听混；Wednesday 中间的 d 不发音，常被漏写；说「每逢星期三」要用 on Wednesdays。',
    parent: '和孩子一起看课程表，用 What do you have on Mondays? 问一问，让孩子用 I have … 回答；每天出门前问一句今天星期几，让孩子用英语说。',
    keywords: ['五年级上册英语 Unit 3 Work and play', 'PEP 五年级英语星期单词', '五年级英语 What do you have on 句型'],
  },
  'e5s1-03-spell': {
    learn: "Let's spell 学字母组合 ie 和 igh，它们读音相同，都读 /aɪ/：跟读面包师熬夜做馅饼的儿歌 One night, a baker makes some pies.，在 high、right、pie、tie、lie、light、night 里听音勾词，再听写补全句子。",
    mistakes: 'ie 和 igh 读音一样，听写时容易把 night 写成 nite、把 pie 写成 pigh；igh 里的 gh 不发音，孩子常漏写，或者把 g 也读出来。',
    parent: '和孩子比赛找读 /aɪ/ 的词（night、light、high、pie、tie），家长读一个，孩子说出它是 ie 还是 igh 的写法；睡前关灯时说一声 Good night!。',
    keywords: ['五年级上册英语 ie igh 拼读', "PEP 五年级 Let's spell ie igh", '五年级英语 night light pie 发音'],
  },
  'e5s1-03-b': {
    learn: 'Part B 学谈论周末活动：What do you usually do at the weekend? / I often play football.，再学 Saturday、Sunday、lesson，读 Li Xia 和 Eric 的课后安排；Reading time 是学校写给家长的五条劳逸结合建议。',
    mistakes: 'usually、often、sometimes 分不清频率高低；主语是 she 时动词要变成 does、has，孩子常写成 do、have；on Saturday mornings 的 on 容易漏。',
    parent: '周末和孩子一起排一张作息表，用 What do you do on Saturdays? 问，让孩子用 I usually … / I often … 回答，提醒他学习和玩都要安排上。',
    keywords: ['五年级上册英语 Unit 3 Part B', 'PEP 五年级英语周末活动', '五年级英语 usually often sometimes'],
  },
  // ── 上册 Unit 4 Healthy habits ──
  'e5s1-04-a': {
    learn: 'Part A 学怎样保持健康：How can we stay healthy? / We should eat healthy food. / We should exercise every day.，学 exercise，会说 Drink enough water. / Get enough sleep.，用 You should … 提建议。',
    mistakes: 'should 后面要用动词原形，孩子常说成 You should eats …；exercise 中间是 c、结尾有 e，常拼错；enough 里的 gh 读 /f/，容易读错。',
    parent: '和孩子一起列一张健康习惯清单，早上来不及吃早饭时用 You should eat breakfast. 提醒；晚上到点了，让孩子自己说 I should get enough sleep.。',
    keywords: ['五年级上册英语 Unit 4 Healthy habits', 'PEP 五年级英语 should 提建议', '五年级英语 stay healthy 句型'],
  },
  'e5s1-04-spell': {
    learn: "Let's spell 学字母组合 oa 和 ow，它们读音相同，都读 /əʊ/：跟读冬天穿外套玩雪、喂山羊、用肥皂洗手的儿歌，在 get / goat / got、go / goal / grow、low / slow / snow、red / road / rod 里听音圈词，再听写句子。",
    mistakes: 'oa 和 ow 读音一样，听写 coat、snow 时常用错组合；ow 在 cow、how 里读 /aʊ/，孩子容易把 snow、slow 也读成 /aʊ/；know 的 k 不发音。',
    parent: '和孩子玩「听音圈词」：家长读 goat / got、road / rod，孩子说出哪个里面有 oa；下雪天、穿外套出门时说一说 snow、coat、slow。',
    keywords: ['五年级上册英语 oa ow 拼读', "PEP 五年级 Let's spell oa ow", '五年级英语 coat goat snow 发音'],
  },
  'e5s1-04-b': {
    learn: 'Part B 学保护眼睛和牙齿：You should rest your eyes. / You should brush your teeth twice a day.，学 phone、rest、check、less、brush、tooth，读 David 的健康习惯问卷；Reading time 讲怎样照顾眼睛和牙齿。',
    mistakes: "tooth 的复数是 teeth，孩子常写成 tooths；shouldn't 后面也用动词原形；less 用在 candy 这类不可数名词前，常被拼成 lese。",
    parent: '睡前和孩子一起刷牙，说一句 Brush your teeth twice a day.；孩子看手机、看电视久了，用 You should rest your eyes. 提醒他休息一下眼睛。',
    keywords: ['五年级上册英语 Unit 4 Part B', 'PEP 五年级英语 brush your teeth', "五年级英语 should shouldn't 句型"],
  },
  // ── 上册 Unit 5 Food we eat ──
  'e5s1-05-a': {
    learn: "Part A 学点餐：Mum, I'm hungry. / What would you like to eat? / I'd like beef and rice.，再学 beef、ice cream、dumpling、tea、hamburger 五个食物词，用 What would you like to drink? 互相问答。",
    mistakes: "would like 后面要跟 to eat、to drink，孩子常漏掉 to；I'd 是 I would 的缩写，常写成 Id；dumpling 说多个时要加 s，ice cream 是两个词。",
    parent: "吃饭前让孩子当小服务员，用 What would you like to eat? 问家里每个人，家人用 I'd like … 回答；也可以一起画一张中英文菜单。",
    keywords: ['五年级上册英语 Unit 5 Food we eat', 'PEP 五年级英语食物单词', '五年级英语 What would you like to eat 句型'],
  },
  'e5s1-05-spell': {
    learn: "Let's spell 学字母组合 oo 的两种读音：book、foot、good、cook、look 里读短音，too、tool、zoo、cool、food 里读长音；跟着儿歌 Look! Look! I can cook! 读熟，再按 cook 和 cool 把词分成两组。",
    mistakes: 'oo 有长短两种读音，孩子常把 book、good 读成长音，把 food 读成短音；foot 和 food、cook 和 cool 只差一点，听的时候容易混。',
    parent: '家长读 foot 或 food、cook 或 cool，让孩子说出听到的是哪个；再一起拍手念 Look at my cool cookbook. 这首儿歌。',
    keywords: ['五年级上册英语 oo 拼读', "PEP 五年级 Let's spell oo", '五年级英语 book food cool 发音'],
  },
  'e5s1-05-b': {
    learn: 'Part B 学说食物从哪里来：Where does your coconut come from? / Hainan!，再学植物的 seed、stem、root，读莲子、莲藕、荷叶各怎么吃；Reading time 讲茶的历史，问 Where does your tea come from?。',
    mistakes: 'Where does it come from? 的回答要用 It comes from …，常漏掉 comes 的 s；stem 和 root 容易混：胡萝卜吃的是根 root，芹菜吃的是茎 stem。',
    parent: '买菜时让孩子指着胡萝卜、芹菜说 We eat the root. / We eat the stem.；看看水果包装上的产地，用 It comes from … 说一说。',
    keywords: ['五年级上册英语 Unit 5 Part B', 'PEP 五年级英语 seed stem root', '五年级英语 Where does it come from 句型'],
  },
  // ── 上册 Unit 6 Nature and us ──
  'e5s1-06-a': {
    learn: 'Part A 学介绍自然公园：Is there a waterfall in the forest? / Yes, there is. / Are there any famous mountains? / Yes, there are.，再学 river、waterfall、forest、mountain 四个自然景物词，玩猜公园的游戏。',
    mistakes: 'Is there 要用 Yes, there is. 回答，Are there any 要用 Yes, there are. 回答，孩子常混用；mountains、waterfalls 常漏掉 s。',
    parent: '翻翻出游照片，让孩子用 There is a big forest. 介绍去过的地方；也可以玩猜地方的游戏，用 Is there …? 提问。',
    keywords: ['五年级上册英语 Unit 6 Nature and us', 'PEP 五年级英语 river forest mountain', '五年级英语 Is there a 句型'],
  },
  'e5s1-06-spell': {
    learn: "Let's spell 学字母组合 al、au、aw，它们在 all、tall、walk、small、author、autumn、draw、saw 里读同一个音；跟读 Paul is an author. He draws too. 这首小诗，再在 all / oil、tall / toll、draw / drive 里听音圈词。",
    mistakes: 'walk 里的 l 不发音，孩子常读出 l；al、au、aw 读音一样，写的时候常把 draw 写成 drau、autumn 写成 awtumn。',
    parent: "饭后散步时和孩子说 Let's take a walk.，再比赛找 al、au、aw 的词；家长读 all 或 oil、walk 或 wall，让孩子分辨。",
    keywords: ['五年级上册英语 al au aw 拼读', "PEP 五年级 Let's spell al au aw", '五年级英语 autumn draw walk 发音'],
  },
  'e5s1-06-b': {
    learn: 'Part B 学说坏天气和怎样保证安全：Is there any bad weather here in summer? / Yes. There is heavy rain.，再学 fog、flood、fire，读登山前要知道的安全提示；Reading time 介绍三江源国家公园。',
    mistakes: '大雨、大雪要说 heavy rain、heavy snow，常说成 big rain；Sometimes there are floods. 和 Be careful of fires. 里的 s 常漏掉。',
    parent: '看天气预报时和孩子说 There will be heavy rain tomorrow.，一起商量出门带什么；出游前让孩子说一条安全提示，比如 Bring enough water.。',
    keywords: ['五年级上册英语 Unit 6 Part B', 'PEP 五年级英语 fog flood fire', '五年级英语恶劣天气安全提示'],
  },
  // ── 上册 ☆ Revision: New Year's party ──
  'e5s1-07-revision': {
    learn: '上册总复习，主题是新年联欢会：用 What can you do for the party? / I can … 说能做什么，复习星期、食物、植物和自然灾害的词，读 Miss White 的建议信（按时休息、多喝水、有困难就求助），再玩 Bingo 复习六组元音字母组合。',
    mistakes: '星期的首字母要大写，Tuesday 和 Thursday 常听混、拼混；ice cream 是两个词；book 和 too 都有 oo，读音却不同，know、slow 里的 ow 和 coat 里的 oa 读音一样。',
    parent: '和孩子一起为家里的新年聚会做计划，用 I can … 说能做什么，用 What would you like to eat? 问想吃什么；把 Bingo 里的 18 个词写成卡片，按读音分组念一念。',
    keywords: ["五年级上册英语 Revision New Year's party", 'PEP 五年级英语上册总复习', '五年级英语上册期末复习'],
  },
  // ── 下册 Unit 1 My day ──
  'e5s2-01-a': {
    learn: "Part A 学问做事的时间：When do you get up? / I often get up at 7 o'clock.，学 eat breakfast、play sports、do morning exercises、eat dinner 和 have … class，比一比中国和西班牙孩子的作息。",
    mistakes: "回答 When…? 要说 At 7 o'clock.，孩子常漏掉 at；do morning exercises 的 exercises 要加 s；a.m. 是上午、p.m. 是下午，常记反。",
    parent: "早上问孩子 When do you get up?，晚饭时问 When do you eat dinner?，让他用 At … o'clock. 回答；一起画一张作息表，贴上英文短语。",
    keywords: ['五年级下册英语 Unit 1 My day', 'PEP 五年级英语 When do you get up 句型', '五年级英语 eat breakfast do morning exercises 单词'],
  },
  'e5s2-01-spell': {
    learn: "Let's spell 学辅音连缀 cl 和 pl：跟着儿歌 Class, clock, plate, eggplant, clean, play. 读熟 clean、clock、class、clever、plate、eggplant、please、play，玩 Bingo 找词，再用 Clean the plate, please. 造句。",
    mistakes: 'cl、pl 两个辅音要连着读，孩子常在中间加一个元音，读成「克拉」「坡拉」；clean 和 please、clay 和 play 开头相近，听写时容易把 cl 和 pl 写混。',
    parent: '和孩子比赛说含 cl、pl 的词（clock、plate、people），家长读 clay、play，让孩子说出开头是 cl 还是 pl；洗碗时说 Clean the plate, please.',
    keywords: ['五年级下册英语 cl pl 拼读', "PEP 五年级 Let's spell cl pl", '五年级英语 clean clock plate play 发音'],
  },
  'e5s2-01-b': {
    learn: 'Part B 学说周末做什么：What do you do on the weekend? / I often go shopping.，学 clean my room、go for a walk、go shopping、take a dancing class；读鲁滨孙的一封信，Story time 讲小松鼠 Zip 忙碌的一周。',
    mistakes: 'often、sometimes、always 要放在动词前面，孩子常说成 I go often shopping；go shopping 的 go 后面跟 -ing 形式，常写成 go shop。',
    parent: '周末问孩子 What do you do on the weekend?，让他用 I often… 回答；打扫房间、散步时顺口说出 clean my room、go for a walk。',
    keywords: ['五年级下册英语 Unit 1 Part B', 'PEP 五年级英语 What do you do on the weekend 句型', '五年级英语 go shopping clean my room 单词'],
  },
  // ── 下册 Unit 2 My favourite season ──
  'e5s2-02-a': {
    learn: 'Part A 学谈论最喜欢的季节：Which season do you like best? / Winter. I like snow.，学 spring、summer、autumn、winter 和 season，读四季小诗 Spring is green with flowers and songs.，说说自己喜欢哪个季节。',
    mistakes: 'season 是「季节」，常和 spring 混淆；autumn 末尾的 n 不发音，孩子常漏写；like … best 的 best 要放在句末，常说成 I best like winter。',
    parent: '看着窗外的天气问孩子 Which season do you like best?；春天看花时说 Spring is green.，下雪时说 Winter is white.，把四季的景象和英文对起来。',
    keywords: ['五年级下册英语 Unit 2 My favourite season', 'PEP 五年级英语四季单词 spring summer autumn winter', '五年级英语 Which season do you like best 句型'],
  },
  'e5s2-02-spell': {
    learn: "Let's spell 学辅音连缀 br 和 gr：跟着儿歌读熟 brown、library、brother、umbrella 和 green、grapes、grandpa、grow，把 breakfast、grass、great 等词按 br、gr 分组，再用 Grandpa grows green grapes. 选词造句。",
    mistakes: 'br、gr 两个辅音要连着读，孩子常在中间加元音，读成「布尔」「格尔」；brown 和 grown、brass 和 grass 只差开头一个字母，容易听混。',
    parent: '和孩子一起念 Grandpa grows green grapes.，越念越快当绕口令；在家找棕色、绿色的东西，说 brown、green 时把开头的 br、gr 读清楚。',
    keywords: ['五年级下册英语 br gr 拼读', "PEP 五年级 Let's spell br gr", '五年级英语 brown green grapes 发音'],
  },
  'e5s2-02-b': {
    learn: 'Part B 学说喜欢某个季节的原因：Why? / Because I like summer vacation!，学 go on a picnic、pick apples、make a snowman、go swimming，读 Robin 写四季的短文，Story time 讲澳大利亚的考拉第一次过白色圣诞节。',
    mistakes: '回答 Why? 要用 Because… 开头，孩子常漏掉；go on a picnic 里的 on 和 a 常被漏写；fall 在美式英语里也指「秋天」，孩子常只认得「落下」的意思。',
    parent: '问孩子 Which season do you like best? Why?，让他用 Because I can… 说理由；摘苹果、堆雪人时顺口说出 pick apples、make a snowman。',
    keywords: ['五年级下册英语 Unit 2 Part B', 'PEP 五年级英语 Why Because 句型', '五年级英语 go on a picnic make a snowman 单词'],
  },
  // ── 下册 Unit 3 My school calendar ──
  'e5s2-03-a': {
    learn: "Part A 学一月到六月的英文名称和学校日历上的活动：When is the party? / It's in April.，再学 sports meet、school trip、Labour Day，说说植树节、劳动节、儿童节分别在几月。",
    mistakes: '月份的首字母要大写，孩子常写成小写；February 中间的 r 常漏写；在几月前面用 in，常错说成 on April；June 和 July 读音相近，容易听混。',
    parent: "和孩子一起翻家里的日历，问 When is Children's Day?，让孩子用 It's in June. 回答；也可以把全家人的生日标在日历上，用英语说说各在几月。",
    keywords: ['五年级下册英语 Unit 3 My school calendar', 'PEP 五年级英语月份单词', '五年级英语 When is the party 句型'],
  },
  'e5s2-03-spell': {
    learn: "Let's spell 学字母组合 ch 和 sh 的发音：跟读 China、chicken、lunch、teacher 和 sheep、fish、shirt、shorts，听音给 Chinese children、a short sheep 等短语排序，再用 The teacher is nice. 这样的句子选词说一说。",
    mistakes: 'ch 和 sh 读音相近，cheap 和 sheep 容易听混；sh 在词尾时（fish、English）常读不清或漏写 h；China、Chinese 的首字母要大写。',
    parent: '家长读 cheap 或 sheep，让孩子说出听到的是 ch 还是 sh；吃午饭时说 fish for lunch，换衣服时说 a shirt and shorts，顺口练一练。',
    keywords: ['五年级下册英语 ch sh 拼读', "PEP 五年级 Let's spell ch sh", '五年级英语 chicken sheep fish 发音'],
  },
  'e5s2-03-b': {
    learn: "Part B 学七月到十二月和这几个月里的节日：When is the trip this year? / It's in October.，认识教师节、国庆节、感恩节、圣诞节；读英语晚会的邀请，复习 in、at、on，Story time 跟 Zoom 订暑假计划。",
    mistakes: 'September、November、December 都以 -ber 结尾，孩子常拼混；August 的首字母要大写；几月用 in、几点用 at、星期几用 on，三个介词容易用错。',
    parent: "问孩子 When is Christmas? / When is China's National Day?，让孩子用 It's in … 回答；一起做一张全年节日表，用英语标上月份，贴在家里随时说一说。",
    keywords: ['五年级下册英语 Unit 3 Part B', 'PEP 五年级英语七月到十二月单词', '五年级英语 in at on 时间介词'],
  },
  // ── 下册 ☆ Recycle 1 ──
  'e5s2-04-recycle': {
    learn: '下册 Recycle 1 复习第 1–3 单元：约朋友周末去购物、游泳、野餐，用 When do you go to work? / At 6:00 p.m. 问作息时间，读 Stella 从悉尼发来的邮件（那里四月是秋天），再从小诗 Bed in Summer 里找含 cl、pl、gr、ch、sh 的词。',
    mistakes: '回答几点做某事要说 At 6:00 p.m.，孩子常漏 at；a.m. 是上午、p.m. 是下午，容易记反；南半球的季节和我们相反，悉尼四月是秋天，常被答成春天。',
    parent: '和孩子画一张家人作息表，用 When do you get up? 问爸爸妈妈，用 I usually get up at … 回答；再聊聊这个季节的天气，比如 It is warm in the day.。',
    keywords: ['五年级下册英语 Recycle 1', 'PEP 五年级英语下册 Recycle 1 复习', '五年级英语 When do you 作息时间'],
  },
  // ── 下册 Unit 4 When is the art show? ──
  'e5s2-05-a': {
    learn: "Part A 学序数词 first、second、third、fourth、fifth（1st 到 5th），用 When is the art show? / It's on May 1st. 问答具体日期；还知道母亲节是 the second Sunday in May，说说劳动节、儿童节、国庆节是哪一天。",
    mistakes: '具体到哪一天要用 on，孩子常说成 in May 1st；first、second、third 不是加 th 变来的，常写成 oneth、twoth；fifth 常拼成 fiveth。',
    parent: "翻日历和孩子玩「是哪一天」：问 When is Children's Day?，让孩子说 It's on June 1st.；排队、比赛时用 first、second、third 说说谁排第几。",
    keywords: ['五年级下册英语 Unit 4 When is the art show', 'PEP 五年级英语序数词 first second third', "五年级英语 It's on May 1st 日期表达"],
  },
  'e5s2-05-spell': {
    learn: "Let's spell 学字母组合 th 的两种读音：three、thin、maths 里的 th 不振动声带，this、that、mother 里的 th 要振动声带；听音在 mother 和 maths、there 和 three 里圈出听到的词，再选词说 Thursday is his eleventh birthday.",
    mistakes: 'th 要轻咬舌尖，孩子常读成 s 或 z（three 读成 sree）；this、that 的 th 常读成 d；fifth、maths 词尾的 th 常漏读或写成 f。',
    parent: '对着镜子和孩子练咬舌：先读 three、thin，再读 this、that，摸摸喉咙感受振不振动；介绍家人 mother、father、brother 时也顺便练一练。',
    keywords: ['五年级下册英语 th 拼读', "PEP 五年级 Let's spell th", '五年级英语 three this mother 发音'],
  },
  'e5s2-05-b': {
    learn: 'Part B 学 twelfth、twentieth、twenty-first、twenty-third、thirtieth，用 When is your birthday? / My birthday is on April 4th. 问生日；读 Sarah 写小猫长大的日记，练基数词变序数词；Story time 里 Zoom 为唱歌考试加紧练习。',
    mistakes: 'twelfth 要把 ve 改成 f，常写成 twelveth；twentieth、thirtieth 要把 y 改成 ie 再加 th；日期里的序数词常写成基数词，如 April 4。',
    parent: "把全家人的生日标在日历上，互相问 When is Grandpa's birthday?，用 It's on October 12th. 回答；养宠物或种花时，也可以学 Sarah 记一篇英语小日记。",
    keywords: ['五年级下册英语 Unit 4 Part B', 'PEP 五年级英语序数词 twelfth twentieth', '五年级英语 When is your birthday 句型'],
  },
  // ── 下册 Unit 5 Whose dog is it? ──
  'e5s2-06-a': {
    learn: "Part A 学问东西是谁的：Whose dog is this? / Oh, it's mine. / Is it yours? / No. It's his.，再学名词性物主代词 mine、yours、his、hers、theirs、ours，会说 It's our dog. The dog is ours.。",
    mistakes: "mine、hers 这类词后面不再跟名词，孩子常说成 It's mine dog；my 和 mine、her 和 hers、our 和 ours 容易用混，his 两种用法同形。",
    parent: "把家里人的东西摆在一起，用 Whose book is this? 问孩子，先说 It's my book.，再改说 The book is mine.；换成爸爸妈妈的东西练 his、hers、ours。",
    keywords: ['五年级下册英语 Unit 5 Whose dog is it', 'PEP 五年级英语名词性物主代词', '五年级英语 mine yours his hers 用法'],
  },
  'e5s2-06-spell': {
    learn: "Let's spell 学词尾 ng 和 nk 的发音：跟读 long、sing、ring、young 和 think、ink、trunk、pink，把 song、thing、morning、drink、thank、bank 分进 -ng、-nk 两组，再听写 Zoom is eating. 这样带 -ing 的句子。",
    mistakes: 'ng 只有鼻音，nk 在鼻音后还要轻轻带出 /k/，孩子常把 thing 和 think、sing 和 sink 读混；写 -ing 时常漏掉 g，把 eating 写成 eatin。',
    parent: "家长读 thing / think、thank / thing，让孩子说出词尾是 ng 还是 nk；吃饭、喝水时让孩子说 I'm eating. / I'm drinking.，顺便练 -ing。",
    keywords: ['五年级下册英语 ng nk 拼读', "PEP 五年级 Let's spell ng nk", '五年级英语 sing think thank 发音'],
  },
  'e5s2-06-b': {
    learn: "Part B 学说动物正在做什么：Is he drinking water? / No, he isn't. He's eating.，再学 climbing、eating、playing、jumping、drinking、sleeping；Robin 在动物园学动物的样子，Story time 里 Zip 和 Zoom 给动物拍照。",
    mistakes: '现在进行时要用 be 动词加 -ing，孩子常漏掉 is / are，说成 He eating；climbing 的 b 不发音常被漏写；their 和 theirs 在填空里也常选错。',
    parent: "和孩子看动物视频，暂停时问 What is the panda doing?，让孩子用 It's eating. / It's climbing. 回答；家里人做事时也可以随口问一问。",
    keywords: ['五年级下册英语 Unit 5 Part B', 'PEP 五年级英语现在进行时 climbing eating', '五年级英语 Is he drinking water 句型'],
  },
  // ── 下册 Unit 6 Work quietly! ──
  'e5s2-07-a': {
    learn: "Part A 学说别人正在做什么：What are they doing? / They're eating lunch!，再学 doing morning exercises、having ... class、eating lunch、reading a book、listening to music，说说一天里每个时刻在做什么。",
    mistakes: "-ing 形式常写错，having 写成 haveing，doing 前忘了 be 动词；listening to music 常漏掉 to；its 和 it's 也容易混。",
    parent: "按一天的时间问孩子 What are you doing?，让他用 I'm eating lunch. 这样的句子回答；看大熊猫视频时说 They're eating bamboo.。",
    keywords: ['五年级下册英语 Unit 6 Work quietly', 'PEP 五年级英语 What are they doing 句型', '五年级英语 doing morning exercises 单词'],
  },
  'e5s2-07-spell': {
    learn: "Let's spell 学字母组合 wh 的发音：跟读 what、when、where、whose、who，在 what / white、wait / when、weather / whose、who / wall、where / well 里听音圈词，再写三个 wh 开头的问句，如 What colour is it?。",
    mistakes: "wh 在 what、where 里读 /w/，在 who、whose 里读 /h/，孩子常把 who 读成 /wu/；whose 和 who's 读音一样、意思不同，写的时候常混。",
    parent: '和孩子轮流用 what、when、where、who、whose 各问一个问题，如 Where is my book?；家长读 wait / when、who / wall，让孩子说出哪个是 wh。',
    keywords: ['五年级下册英语 wh 拼读', "PEP 五年级 Let's spell wh", '五年级英语 what when where who whose 发音'],
  },
  'e5s2-07-b': {
    learn: 'Part B 学公共场所的规矩：Talk quietly. / Keep your desk clean. / Keep to the right. / Take turns.，读 The world robot exhibition 里各国机器人正在做的事，Story time 里 Zoom 在电影院吃爆米花被提醒。',
    mistakes: 'Talk quietly 常说成 Talk quiet，keep to the right 常漏掉 to，take turns 常漏掉 s；祈使句不用主语，孩子常在前面加上 You。',
    parent: "去图书馆、电影院前和孩子说说 Talk quietly.，上下楼梯说 Keep to the right.；玩游戏时说 Let's take turns.，让孩子在生活里用起来。",
    keywords: ['五年级下册英语 Unit 6 Part B', 'PEP 五年级英语 Talk quietly Keep to the right', '五年级英语祈使句 take turns'],
  },
  // ── 下册 ☆ Recycle 2 ──
  'e5s2-08-recycle': {
    learn: "下册 Recycle 2 复习第 4–6 单元：念 Thirty days has September … 记每个月的天数，用 When is Children's Day? / It's on June 1st. 说节日日期，用 Whose water bottle is this? 问东西是谁的，说说大家正在做什么，再找含 th、wh、nk、ng 的词。",
    mistakes: '日期要用序数词，June 1st 读作 June first，孩子常读成 June one；mine、yours、hers 后面不再跟名词；说正在做的事常漏掉 is / are，说成 He playing football.。',
    parent: "翻着日历和孩子念家人的生日和节日，用 When is … ? / It's on … 一问一答；收拾东西时拿起一件问 Whose … is this?，让孩子用 It's mine. / It's his. 回答。",
    keywords: ['五年级下册英语 Recycle 2', 'PEP 五年级英语下册 Recycle 2 复习', '五年级英语月份歌 Thirty days has September'],
  },
}
