/** 知识点静态页（搜索引擎用）的专属正文：怎么学 / 常见错误 / 家长怎么陪 / 搜索词。只出现在静态页，不进应用、不注音、不朗读。 */
export interface KpSeo {
  /** 这一课在课本里学什么、怎么学（2–3 句，60–120 字） */
  learn: string
  /** 孩子常见的错误与原因（1–2 句，40–90 字） */
  mistakes: string
  /** 家长怎么陪练、怎么用生活场景练（1–2 句，40–90 字） */
  parent: string
  /** 家长会搜的词，2–4 个，如「四年级上册英语 Unit 1 单词」「PEP 四年级英语拼读练习」 */
  keywords: string[]
}

export const KP_SEO: Record<string, KpSeo> = {
  // ── 上册 Unit 1 Helping at home ──
  'e4s1-01-a': {
    learn: "Part A 学问家人的职业：What's your mother's job? / She's a doctor. / Doctors are great!，再学 doctor、farmer、nurse、office worker、factory worker 五种职业，用 What's Mike's job? 互相问答。",
    mistakes: "doctor 和 nurse 都穿白大褂，孩子常弄混；office worker、factory worker 容易漏写 worker；问职业时 mother's 的 's 常被漏掉。",
    parent: "和孩子聊聊家里人做什么工作，用 What's your father's job? 问，让孩子用 He's a … 回答；在医院、田边见到时顺口说出英语。",
    keywords: ['四年级上册英语 Unit 1 Helping at home', 'PEP 四年级英语职业单词', "四年级英语 What's your mother's job 句型"],
  },
  'e4s1-01-spell': {
    learn: "Let's spell 学字母组合 ch 的发音：跟读 My grandpa can teach Chinese. 等四句，在 lunch、much、China、Chinese、chair、child、kitchen、teacher 里听出 ch，再听写 teacher、China 补全句子。",
    mistakes: 'ch 和 sh 读音相近，chair、share 这样的词容易听混；kitchen 里的 tch 也读 ch 的音，孩子常漏写 t；China、Chinese 的首字母要大写。',
    parent: '和孩子比赛找带 ch 的词（chair、lunch、teacher），家长读 chip / ship、chop / shop，让孩子说出哪个是 ch；吃午饭时说一说 lunch。',
    keywords: ['四年级上册英语 ch 拼读', "PEP 四年级 Let's spell ch", '四年级英语 chair child lunch 发音'],
  },
  'e4s1-01-b': {
    learn: 'Part B 学怎样帮家人分担：What can we do for them? / We can do some chores. / I can cook.，再学 cook、look after、sweep、floor，读 Xiao Lin 和妈妈的便条；Reading time 讲孩子们给忙碌的妈妈做小猫煎蛋。',
    mistakes: 'look after 是一个词组，孩子常只写 look；sweep the floor 的 the 容易漏；can 后面用动词原形，常说成 I can cooking。',
    parent: '请孩子每天做一件家务，边做边说 I sweep the floor. / I look after my sister.；周末一起做饭时说 We cook together.。',
    keywords: ['四年级上册英语 Unit 1 Part B', 'PEP 四年级英语家务 sweep the floor', '四年级英语 look after 句型'],
  },
  // ── 上册 Unit 2 My friends ──
  'e4s1-02-a': {
    learn: "Part A 学向家人介绍新朋友：Mum, I have a new friend. / His name is Zhang Peng. / He's tall and strong.，再学 tall and strong、short and thin、long hair、short hair、kind、quiet，描述朋友的样子和性格。",
    mistakes: "He's 和 He has 容易混，说成 He's short hair；his 和 her 分不清男女；quiet 常和 quite 拼混，kind 在这里是「友好的」。",
    parent: "拿出孩子和同学的合照，让孩子用 He's tall and strong. / She has long hair. 介绍朋友，家长猜是谁；也可以反过来由家长描述、孩子来猜。",
    keywords: ['四年级上册英语 Unit 2 My friends', 'PEP 四年级英语描述朋友外貌', "四年级英语 He's tall and strong 句型"],
  },
  'e4s1-02-spell': {
    learn: "Let's spell 学字母组合 sh 的发音：跟读寄居蟹和海葵分享贝壳的小故事 I have no shell. Can we share?，在 English、fish、share、she、ship、shop 里听出 sh，再听写 True friends share. Tall or short …。",
    mistakes: 'sh 和 ch、s 容易听混（ship 和 chip、she 和 see）；sh 在词尾时（fish、English）孩子常读不清或漏写 h。',
    parent: '和孩子玩「找 sh」：家里的 fish、shoes、shirt 都可以指一指、说一说；家长读 ship / chip、she / see，看孩子能不能分出哪个是 sh。',
    keywords: ['四年级上册英语 sh 拼读', "PEP 四年级 Let's spell sh", '四年级英语 ship shop fish 发音'],
  },
  'e4s1-02-b': {
    learn: "Part B 学谈论最好的朋友：Who's your best friend? / Chen Jie. She's funny.，再学 read、Chinese、play、game、football，会说 We play football together.；Reading time 里的好朋友原来是一只小狗。",
    mistakes: '主语是 he、she、my friend 时动词要加 s（reads、plays、helps），孩子常漏掉；play football 前不加 the；Chinese 的首字母要大写。',
    parent: "问孩子 Who's your best friend?，让他说说和朋友一起做什么（We play games together.）；陪读时说 I read books with you.。",
    keywords: ['四年级上册英语 Unit 2 Part B', "PEP 四年级 Who's your best friend 句型", '四年级英语第三人称单数 reads plays'],
  },
  // ── 上册 Unit 3 Places we live in ──
  'e4s1-03-a': {
    learn: 'Part A 学介绍社区里有什么：There is a playground. / There is also a nice park over there.，再学 playground、park、hospital、shop、toilet、bus stop 六个地点词，用 There is a … 说说自己住的社区。',
    mistakes: 'There is a park. 常被说成 There have a park.；hospital 中间的 i 常漏写，toilet 常拼成 toliet；bus stop 是两个词，容易连在一起写。',
    parent: '带孩子在小区散步时，指着游乐场、商店、公交车站用 There is a … 说一说；也可以一起画一张社区地图，贴上 park、hospital、shop 的英文标签。',
    keywords: ['四年级上册英语 Unit 3 Places we live in', 'PEP 四年级英语 There is a 句型', '四年级英语社区地点单词'],
  },
  'e4s1-03-spell': {
    learn: "Let's spell 学字母组合 ck 的发音：ck 跟在短元音后面，两个字母只读一个 /k/，如 duck、back、black、sock、tick；跟着儿歌 Some ducks are in the park. 读熟，再按 Read, listen and tick 听音勾词，Look, listen and write 听写句子。",
    mistakes: 'ck 只读一个 /k/，孩子常把 duck 写成 duk 或 duc；back 和 black 只差一个 l，听音时容易混；sock 和 socks、duck 和 ducks 末尾的 s 常漏读漏写。',
    parent: '和孩子一起找含 ck 的词（duck、sock、black、back），读的时候把 ck 读得短促有力；家长读 back 或 black，让孩子指出听到的是哪一个。',
    keywords: ['四年级上册英语 ck 拼读', "PEP 四年级 Let's spell ck", '四年级英语 duck sock black 发音'],
  },
  'e4s1-03-b': {
    learn: "Part B 学说在社区里做什么：This is a library. / Great! Let's do some sports.，再学 go shopping、take a walk、do sports、see a doctor，用 I often … there. 说常去的地方；Reading time 跟 Peter 逛成都。",
    mistakes: 'do sports 的 sports 常漏掉 s，take a walk 常说成 take walk；there 要放在句末，孩子常说成 I often there take a walk。',
    parent: '出门时和孩子说 There is a park. I often take a walk there.，让他照样说说去商店、医院做什么；读 Reading time 时问问 Peter 在成都看到了什么。',
    keywords: ['四年级上册英语 Unit 3 Part B', 'PEP 四年级英语 take a walk do sports', '四年级英语 There is a … I often … there 句型'],
  },
  // ── 上册 Unit 4 Helping in the community ──
  'e4s1-04-a': {
    learn: "Part A 学说社区里重要的工作：He's a school bus driver. / That's an important job too!，再学 driver、cleaner、cook、delivery worker、police officer 五种职业，用 He's / She's a … 介绍身边帮助大家的人。",
    mistakes: 'an important job 的 an 常写成 a；cook 既是「做饭」也是「厨师」，孩子常把厨师说成 cooker；police officer、delivery worker 常只说一半。',
    parent: "出门看到清洁工、快递员、公交司机，和孩子用 He's a cleaner. / She's a delivery worker. 说一说，再问问他们为社区做了什么；也可以玩「我演你猜」的职业游戏。",
    keywords: ['四年级上册英语 Unit 4 Helping in the community', 'PEP 四年级英语职业单词', "四年级英语 He's a driver 句型"],
  },
  'e4s1-04-spell': {
    learn: "Let's spell 学字母组合 ph 的发音：ph 读得和 f 一样，如 Philip、phone、photo、elephant；跟着儿歌 Philip has a phone. 读熟，再按 Read, listen and number 听音排序，Look, listen and write 听写句子。",
    mistakes: 'ph 读 /f/，孩子常把 p 和 h 分开读；写的时候常把 phone、photo 写成 fone、foto；elephant 中间的 ph 常漏掉 h。',
    parent: '和孩子一起找含 ph 的词（phone、photo、elephant），读的时候提醒 ph 和 f 是一个音；用手机给家人拍张照片，说一句 This is a photo from my phone.。',
    keywords: ['四年级上册英语 ph 拼读', "PEP 四年级 Let's spell ph", '四年级英语 phone photo elephant 发音'],
  },
  'e4s1-04-b': {
    learn: "Part B 学说同学们为社区做什么：He's singing old songs. / Binbin and John are telling funny stories.，学 old、tell 和 is / are + -ing 的说法；Reading time 跟警察叔叔学安全：Don't cross at a red light!",
    mistakes: 'is / are + -ing 常漏掉 is / are（He singing），或忘了加 -ing；making 常写成 makeing；单个人用 is、几个人用 are，孩子容易用反。',
    parent: "做家务时用英语说 I'm making the bed.，让孩子说说家人正在做什么；过马路时提醒 Don't cross at a red light!，也可以带孩子给老人唱首歌、讲个故事。",
    keywords: ['四年级上册英语 Unit 4 Part B', 'PEP 四年级英语现在进行时', '四年级英语 making the bed telling stories'],
  },
  // ── 上册 Unit 5 The weather and us ──
  'e4s1-05-a': {
    learn: "Part A 学谈论天气：What's the weather like in Sydney? / Well, it's sunny today. / Is it hot? / No, it isn't.，再学 sunny、windy、cloudy、rainy、snowy 和 cool、warm、hot、cold 九个天气词，看天气预报说各地天气。",
    mistakes: "cool 和 cold、warm 和 hot 意思接近，孩子常分不清；rainy 和 snowy 拼写相近容易写错；What's the weather like? 里的 like 不是「喜欢」，常理解错。",
    parent: "出门前让孩子看看窗外，用 It's cold and windy. 这样的句子说今天的天气；看天气预报时问 What's the weather like in Harbin?，让孩子用英语回答。",
    keywords: ['四年级上册英语 Unit 5 The weather and us', 'PEP 四年级英语天气单词', "四年级英语 What's the weather like 句型"],
  },
  'e4s1-05-spell': {
    learn: "Let's spell 学字母组合 th 的两种读音：thin、thirsty、thank、think、three 里读清音，these、they、them、there 里读浊音；跟读小熊冬眠醒来、朋友送礼物的小故事，按 Read, listen and circle 分辨 thank / think、there / three，再听音写句子。",
    mistakes: '孩子常把 th 读成 s 或 z（thank 读成 sank），或者读成 f（three 读成 free）；thank 和 think、there 和 three 听起来很像，听和写都容易混。',
    parent: '和孩子对着镜子练 th：舌尖轻轻放在上下牙之间送气；把 thank / think、there / three 写在卡片上，家长读一个、孩子指一个。',
    keywords: ['四年级上册英语 th 拼读', "PEP 四年级 Let's spell th", '四年级英语 th 发音练习'],
  },
  'e4s1-05-b': {
    learn: "Part B 学不同天气里能做什么：It's raining now. / We can't play basketball in the park. / Let's go and see a film.，再学 fly a kite、see a film、make a snowman，读爸爸从悉尼寄来的明信片和小雨滴看孩子们玩耍的故事。",
    mistakes: "see a film 常说成 look a film；can't 的 t 很轻，听的时候容易当成 can，意思就反了；On snowy days 常漏掉 days 的 s。",
    parent: "看着窗外问孩子 What can we do?，让他用 We can fly a kite. 回答；下雨天一起看场电影，顺口说 Let's go and see a film.",
    keywords: ['四年级上册英语 Unit 5 Part B', "PEP 四年级英语 Let's go and see a film", '四年级英语 fly a kite make a snowman'],
  },
  // ── 上册 Unit 6 Changing for the seasons ──
  'e4s1-06-a': {
    learn: "Part A 学问衣物是谁的：Whose sweater is this, Mum? / It's your dad's. / Whose socks are these? / They're mine.，再学 sweater、socks、shirt、coat、dress 五种衣物，按天气选衣服。",
    mistakes: "Whose ... is this? 和 Whose ... are these? 单复数常搭错，回答的 It's / They're 也跟着混；dad's、Mum's 的 's 常漏掉。",
    parent: "收衣服时拿起一件问孩子 Whose coat is this?，让他用 It's Dad's. / They're mine. 回答；出门前一起看天气，说 It's cold. Wear a coat.",
    keywords: ['四年级上册英语 Unit 6 Changing for the seasons', 'PEP 四年级英语衣物单词', '四年级英语 Whose sweater is this 句型'],
  },
  'e4s1-06-spell': {
    learn: "Let's spell 学字母组合 wh：why、what、where、white、which 里 wh 读 /w/，who、whose 里读 /h/；跟读雪地里找手套的儿歌，按 Read, listen and circle 分辨 where / who、what / which、who / whose，再听音写句子。",
    mistakes: 'who 和 whose 常把 wh 读成 /w/；where 常写成 were、what 常写成 wat，漏掉不发音的 h；what 和 which 开头一样，听的时候容易圈错。',
    parent: '把 why、what、where、who、whose 写成问题卡，和孩子玩一问一答：Where is my glove? / Who can tell me?，边问边在家里找东西。',
    keywords: ['四年级上册英语 wh 拼读', "PEP 四年级 Let's spell wh", '四年级英语 who whose where 发音'],
  },
  'e4s1-06-b': {
    learn: 'Part B 学四季和喜欢的季节：Which season do you like? / Winter. It snows a lot. I can make a snowman.，再学 spring、summer、autumn、winter，读小诗 Colourful seasons, colourful life! 和考拉雪天过圣诞节的故事。',
    mistakes: 'autumn 末尾的 n 不发音，常漏写；in winter 常说成 on winter；Which season do you like? 常答成 Yes, I like.，要直接说出季节。',
    parent: '和孩子聊 Which season do you like? Why?，让他用 I like ... I can ... 说理由；翻看不同季节的照片，说说那时穿什么、玩什么。',
    keywords: ['四年级上册英语 Unit 6 Part B', 'PEP 四年级英语四季单词', '四年级英语 Which season do you like 句型'],
  },
  // ── 上册 ☆ Revision: Let's help! ──
  'e4s1-07-revision': {
    learn: "上册总复习，主题是 Let's help! 帮助社区：用 How can you help your community? / We can help the cleaners. 说能做什么，复习职业、社区地点和天气，读吴斌斌一家在儿童中心帮忙的短文，再念复习 ch、sh、th、ph、ck、wh 的儿歌。",
    mistakes: '职业词前要加 a（My dad is a doctor.），孩子常漏；cook 既是「做饭」又是「厨师」容易混；说别人做什么要用 He plays、She cooks，常忘了加 s。',
    parent: '和孩子订一个帮助社区的小计划，用 We can… 说去哪里（park、hospital）、做什么（sweep the floor）；再指着家人用 My dad is a… 介绍职业。',
    keywords: ["四年级上册英语 Revision Let's help", 'PEP 四年级英语上册总复习', '四年级英语上册期末复习'],
  },
  // ── 下册 Unit 1 Class rules ──
  'e4s2-01-a': {
    learn: "Part A 学说班级规则：Jack, you can't take toys to school. / Hurry up! Don't be late for class!，学 late、classroom、turn off、light，读懂 Keep the classroom clean. 这样的班规。",
    mistakes: "Don't be late 常漏掉 be（说成 Don't late）；turn off（关掉）和 turn on（打开）容易记反；light 和 late 读音很像，常听混。",
    parent: "出门前和孩子说 Hurry up! Don't be late!；睡前让孩子提醒家人 Turn off the lights.，再一起用 Don't… 定几条书桌规矩。",
    keywords: ['四年级下册英语 Unit 1 Class rules', 'PEP 四年级英语班级规则句型', "四年级英语 Don't be late 单词"],
  },
  'e4s2-01-spell': {
    learn: "Let's spell 学字母组合 ar 的发音（像拉长的「啊」）：跟着儿歌 I draw a farmer on a card. 读熟 farmer、card、hard、farm、park，再给 arm、car、card、far、farm、hard 听音排序，最后听音写句子。",
    mistakes: '孩子常把 ar 读成短音、读得像 cat 里的 a，或把 r 卷得太重；car 和 card、far 和 farm 只差末尾一个字母，听写时容易漏掉。',
    parent: '和孩子一起找含 ar 的词（car、park、farm、card），把 car / card、far / farm 成对读给孩子听，让他说出哪个多了一个音。',
    keywords: ['四年级下册英语 ar 拼读', "PEP 四年级 Let's spell ar", '四年级英语 farmer card park 发音'],
  },
  'e4s2-01-b': {
    learn: "Part B 学说值日：Who's on duty today? / We are, Miss White. / I can sweep the floor.，学 desk、chair、door、window、fan，读短文 Helping hands in class，Reading time 讲一只蜜蜂飞进教室的故事。",
    mistakes: 'I can 后面的动词用原形，孩子常写成 I can sweeps；desks and chairs、close the windows 要用复数，常漏写 s。',
    parent: "放学后问孩子 Who's on duty today?，让他用 I can… 说说自己能做的值日；在家指着门、窗户、椅子、风扇说一说英语。",
    keywords: ['四年级下册英语 Unit 1 Part B', "PEP 四年级 Who's on duty today 句型", '四年级英语教室物品单词 desk chair door window fan'],
  },
  // ── 下册 Unit 2 Family rules ──
  'e4s2-02-a': {
    learn: "Part A 学说家规：Mum, can I watch TV? / No. You have to do your homework first.，学 homework、living room、word、wash，读懂 Don't run in the living room. / Use kind words. 这样的家规。",
    mistakes: 'have to 后面用动词原形，孩子常说成 have to doing；homework 不加 s，也不说 a homework；wash 和 watch 读音很像，常听混。',
    parent: '和孩子写几条家规贴在墙上（Do your homework first. / Wash your hands.）；孩子想看电视时，让他用 Mum, can I watch TV? 来问。',
    keywords: ['四年级下册英语 Unit 2 Family rules', 'PEP 四年级英语 You have to 句型', '四年级英语 homework living room 单词'],
  },
  'e4s2-02-spell': {
    learn: "Let's spell 学字母组合 er 在词尾的发音（轻轻的「呃」）：跟着儿歌 In the summer, after dinner, Father is reading a newspaper. 读熟 summer、dinner、father，再读一读、划一划 ruler、computer、winter 等词。",
    mistakes: '孩子常把词尾的 er 读得太重、读成卷舌的「儿」；写的时候容易把 er 写成 ar；dinner 和 winter、river 和 clever 容易听混。',
    parent: '和孩子比赛找身边含 er 的东西（ruler、eraser、computer、water），每说一个就把末尾的 er 读轻读短；念儿歌时在 er 上拍一下手。',
    keywords: ['四年级下册英语 er 拼读', "PEP 四年级 Let's spell er", '四年级英语 summer dinner water 发音'],
  },
  'e4s2-02-b': {
    learn: "Part B 学说家里的房间和规矩：Where is Mum? / She's in the kitchen. / Shh. Don't be so loud!，学 bedroom、kitchen、study、bathroom，读短文 Rules，Reading time 讲 Jack 在家里到处玩闹的故事。",
    mistakes: "study 在这里是「书房」，孩子常理解成「学习」；Where is Mum? 要用 She's in the… 回答，常漏掉 the；bedroom 和 bathroom 容易写混。",
    parent: "在家指着房间问答 Where is Mum? / She's in the kitchen.；做饭时提醒孩子 Don't touch hot things.，让他用 OK. 回答。",
    keywords: ['四年级下册英语 Unit 2 Part B', 'PEP 四年级 Where is Mum 句型', '四年级英语房间单词 bedroom kitchen study bathroom'],
  },
  // ── 下册 Unit 3 Time for school ──
  'e4s2-03-a': {
    learn: "Part A 学问时间、说该做什么：What time is it? / It's 5 o'clock. / It's time for dinner.，学 dinner、art、lunch、maths 四个词，比一比北京、纽约、伦敦同一时刻各是几点，配合「Listen and do」边听边做。",
    mistakes: "It's time for 后面跟名词（lunch），It's time to 后面跟动作（go home），孩子常混用；整点才说 o'clock；maths 的 s 常漏写。",
    parent: "在家看钟时随口问 What time is it?，让孩子答 It's 6 o'clock.；吃饭前说 It's time for dinner.，让他接着说 Let's eat some rice.。",
    keywords: ['四年级下册英语 Unit 3 Time for school', 'PEP 四年级英语 What time is it 句型', '四年级英语 lunch dinner maths 单词'],
  },
  'e4s2-03-spell': {
    learn: "Let's spell 学字母组合 or 的两种读音：fork、horse、morning、sport、short 里读 /ɔː/，w 后面的 or（work、world、word、worth）读 /ɜː/；跟着小松鼠 Ford 的儿歌读，再在 fork / horse、word / worth 这些对子里听音圈词。",
    mistakes: '孩子常把 work、word 也读成 /ɔː/，work 读得像 walk；word 和 world、sport 和 short 听音时容易混；morning 的 or 常写成 ar。',
    parent: '把 or 的词分两组读：fork、horse、short 一组，work、word、world 一组，让孩子说说两组读音有什么不同；再一起念 Ford 的儿歌。',
    keywords: ['四年级下册英语 or 拼读', "PEP 四年级 Let's spell or", '四年级英语 fork horse work world 发音'],
  },
  'e4s2-03-b': {
    learn: "Part B 学说一天的作息：It's 7 o'clock. It's time to get up. / It's time to go to school.，学 get up、go to school、go home、go to bed，读 Mike 的一天，Reading time 讲 Sam 学会按计划安排时间。",
    mistakes: 'go home 中间不加 to，孩子常说成 go to home；get up 和 go to bed 容易记反；8:30 读作 eight thirty，孩子常一个数字一个数字地读。',
    parent: "起床、出门、放学、睡前，家长说 It's 7 o'clock. It's time to get up.，让孩子接着说该做什么；也可以和孩子画一张周末作息表，用英语说一说。",
    keywords: ['四年级下册英语 Unit 3 Part B', "PEP 四年级英语 It's time to 句型", '四年级英语 get up go to bed 作息'],
  },
  // ── 下册 Unit 4 Going shopping ──
  'e4s2-04-a': {
    learn: "Part A 学买衣服前和家人商量：Mum, my trousers are too short. Can I buy a new pair? / Sure. Let's go to the clothes shop.，学 trousers、shorts、jacket、skirt，再看购物清单分清需要的和想要的。",
    mistakes: 'trousers、shorts 总用复数，一条要说 a pair of trousers，孩子常说成 a trouser；shorts 和 short 容易混；听写时 skirt 常拼成 skurt。',
    parent: '整理衣柜时让孩子用英语说 My trousers are too short. / My skirt is too small.；去商场前一起列购物清单，分成 I need 和 I want 两栏。',
    keywords: ['四年级下册英语 Unit 4 Going shopping', 'PEP 四年级英语衣服单词 trousers shorts', '四年级英语 Can I buy 句型'],
  },
  'e4s2-04-spell': {
    learn: "Let's spell 学字母组合 ir 和 ur，两个都读 /ɜː/：girl、skirt、bird、first、shirt 和 hurt、nurse、fur、turn；跟着小女孩救小鸟的儿歌读，再在 bird / girl、shirt / skirt、hurt / nurse 这些对子里听音圈词。",
    mistakes: 'ir 和 ur 读音一样，孩子写的时候常把 bird 写成 burd、nurse 写成 nirse；shirt 和 skirt、fur 和 turn 只差一两个字母，听音时容易混。',
    parent: '和孩子把 ir、ur 的词分两列抄一抄、读一读，记住读音一样、写法要分清；再一起念 A girl buys a pretty skirt.，边念边指出 ir 和 ur。',
    keywords: ['四年级下册英语 ir ur 拼读', "PEP 四年级 Let's spell ir ur", '四年级英语 bird girl nurse 发音'],
  },
  'e4s2-04-b': {
    learn: "Part B 学在商店里问价、做选择：Can I help you? / How much is it? / It's 180 yuan. / That's expensive.，学 expensive、cheap、beautiful、shoes、hat、sunglasses，读打折广告和购物清单，Reading time 讲 Ben 攒钱买自行车。",
    mistakes: '问一件东西用 How much is it?，问 shoes、sunglasses 要用 How much are they?，孩子常混用；expensive 和 cheap 意思相反，常常记反。',
    parent: "逛商场时让孩子指着价签问 How much is it?，家长答 It's 20 yuan.，他再说 That's cheap! 或 That's expensive.；在家也可以玩开小商店。",
    keywords: ['四年级下册英语 Unit 4 Part B', 'PEP 四年级英语 How much is it 句型', '四年级英语 expensive cheap 单词'],
  },
  // ── 下册 Unit 5 Farms and us ──
  'e4s2-05-a': {
    learn: 'Part A 学聊农场里的动物：What animals do you have on the farm? / I have cows. / How many cows do you have? / I have 20.，新学 cow、horse、sheep、pig、chicken 五种农场动物，再读 Read and guess 的谜语猜动物。',
    mistakes: 'sheep 的复数还是 sheep，孩子常写成 sheeps；cows、horses、pigs 复数要加 s，常被漏掉；What animals 问种类、How many 问数量，孩子常答反。',
    parent: '看农场绘本或动画时用 What animals can you see? / How many pigs? 和孩子一问一答；也可以像书上那样轮流出谜语：I can lay eggs. What am I?',
    keywords: ['四年级下册英语 Unit 5 Farms and us', 'PEP 四年级英语农场动物单词', '四年级英语 How many cows do you have 句型'],
  },
  'e4s2-05-spell': {
    learn: "Let's spell 学字母组合 air 的发音 /eə/：air、chair、fair、hair、pair，跟着歌谣 A boy with fair hair, sits down on his chair. 读熟，再听音给单词排序，听写 There is a pair of shoes under the chair.",
    mistakes: '孩子常把 air 拆成 a、i 两个音来读；hair 和 here、hear 听起来很像，容易听混；pair（一双）和 pear（梨）读音一样，写的时候要看意思选拼写。',
    parent: '和孩子找身边含 air 的东西说一说（chair、hair、a pair of shoes）；家长读 air、chair、fair、hair、pair 中的一个让孩子指出来，再换孩子读、家长指。',
    keywords: ['四年级下册英语 air 拼读', "PEP 四年级 Let's spell air", '四年级英语 chair hair pair 发音'],
  },
  'e4s2-05-b': {
    learn: "Part B 学问「这些、那些是什么」：What are these? / They're tomatoes. / What are those? / They're bee boxes.，新学 tomato、carrot、potato 三个蔬菜词，读王叔叔农场上忙碌的一天；Reading time 讲我们的食物大多来自农场。",
    mistakes: "tomato、potato 的复数加 es，孩子常只加 s；these 指近处、those 指远处，常用反；What are these? 要用 They're … 回答，孩子常答成 It's …。",
    parent: "做饭时拿起西红柿、胡萝卜、土豆问 What are these?，让孩子用 They're … 回答；逛菜市场时指着远一点的菜问 What are those?，聊聊菜从哪里来。",
    keywords: ['四年级下册英语 Unit 5 Part B', 'PEP 四年级英语蔬菜单词 tomato carrot potato', '四年级英语 What are these 句型'],
  },
  // ── 下册 Unit 6 From farm to table ──
  'e4s2-06-a': {
    learn: "Part A 学在农场帮忙干活：Let's feed the chickens. / Good idea! / Can you please pass me the vegetables? / Sure. Here you are.，新学 feed（喂）、pick（摘）、milk（挤奶）三个动作词，配合 Listen and do 边听边做动作。",
    mistakes: 'milk 在这一课是动词「挤奶」，孩子只认得「牛奶」，看到 They milk cows. 就读不懂；pick 和 pig 读音很像，要听清结尾是 k 还是 g。',
    parent: '和孩子玩「农场小帮手」：家长说 Feed the cow. / Pick the tomatoes. / Milk the cow.，孩子做动作，再换过来；在家浇花、摘菜时也用英语说一说。',
    keywords: ['四年级下册英语 Unit 6 From farm to table', "PEP 四年级英语 Let's feed the chickens 句型", '四年级英语 feed pick milk 单词'],
  },
  'e4s2-06-spell': {
    learn: "Let's spell 学字母组合 ear 的发音 /ɪə/：dear、ear、year、fear、hear、near、clear，而 bear、wear、pear 里的 ear 读 /eə/；跟着歌谣 My dear bear, do you hear? 读熟，再在 bear / dear、pear / year 这样的对子里听音圈词。",
    mistakes: '孩子常把 bear、pear、wear 也读成 /ɪə/；hear 和 here、dear 和 deer、pear 和 pair 读音一样，写的时候要看意思；year 开头的 y 常被吞掉，听起来像 ear。',
    parent: '把 dear / bear、year / pear、ear / wear 写成对子，家长读一个孩子指，再换过来；过年写贺卡时一起写 Happy Chinese New Year, Dear Grandma!',
    keywords: ['四年级下册英语 ear 拼读', "PEP 四年级 Let's spell ear", '四年级英语 bear dear year 发音'],
  },
  'e4s2-06-b': {
    learn: "Part B 学餐桌礼仪：Would you like a knife and fork? / No, thank you. I can use chopsticks. / Don't waste food, please.，新学 knife、fork、chopsticks、bowl、spoon 五个餐具词，读陈杰在家种西红柿的短文和机器人农场的故事。",
    mistakes: 'chopsticks 常用复数，孩子常说成 a chopstick；Would you like …? 要答 Yes, please. 或 No, thank you.；knife 开头的 k 不发音，常被读出来。',
    parent: "开饭前请孩子用英语摆餐具（Let's set the table.），边摆边说 bowl、spoon、chopsticks；吃完一起说 Let's clear the table.，再聊聊为什么不浪费粮食。",
    keywords: ['四年级下册英语 Unit 6 Part B', 'PEP 四年级英语餐具单词 knife fork chopsticks', "四年级英语 Don't waste food 餐桌礼仪"],
  },
  // ── 下册 ☆ Revision: A great weekend plan ──
  'e4s2-07-revision': {
    learn: "下册总复习，主题是周末计划：用 What's the weather like this weekend? 问天气、商量穿什么，读 Sarah 一家去农场、Mike 一家去汽车博物馆的短文，用 Can I help you? / How much are they? 买东西，再唱复习 ar、er、or、ir、ur、air 的歌。",
    mistakes: "milk the cows 的 milk 是「挤奶」，孩子常只认「牛奶」；cheap 和 expensive 常记反；How much are they? 要答 They're…yuan，别只说数字。",
    parent: "周末前和孩子一起做计划：查天气说 It's sunny.，挑衣服说 I'd like to wear my shorts.；去超市让孩子用 How much are they? 问价钱。",
    keywords: ['四年级下册英语 Revision A great weekend plan', 'PEP 四年级英语下册总复习', '四年级英语下册期末复习'],
  },
}
