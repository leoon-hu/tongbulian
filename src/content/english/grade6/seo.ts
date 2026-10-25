/** 知识点静态页（搜索引擎用）的专属正文：怎么学 / 常见错误 / 家长怎么陪 / 搜索词。只出现在静态页，不进应用、不注音、不朗读。 */
export interface KpSeo {
  /** 这一课在课本里学什么、怎么学（2–3 句，60–120 字） */
  learn: string
  /** 孩子常见的错误与原因（1–2 句，40–90 字） */
  mistakes: string
  /** 家长怎么陪练、怎么用生活场景练（1–2 句，40–90 字） */
  parent: string
  /** 家长会搜的词，2–4 个，如「六年级上册英语 Unit 1 单词」「PEP 六年级英语过去式练习」 */
  keywords: string[]
}

export const KP_SEO: Record<string, KpSeo> = {
  // ── 上册 Unit 1 Amazing places ──
  'e6s1-01-a': {
    learn: 'Part A 学谈论上个周末：How was your weekend? / It was great! I climbed the Great Wall.，学 was 和 climb；再看照片墙，用 walked、visited、climbed、travelled、watched 说说同学们暑假去过的名胜。',
    mistakes: '说过去的事要用过去式，孩子常说成 I climb the Great Wall last weekend.；travel 的过去式要双写 l，写成 travelled；visited 的 -ed 读 /ɪd/。',
    parent: '周一问孩子 How was your weekend? What did you do last weekend?，让他用 I visited … / I climbed … 回答；翻出旅行照片，用过去式说一说。',
    keywords: ['六年级上册英语 Unit 1 Amazing places', 'PEP 六年级英语 How was your weekend 句型', '六年级英语规则动词过去式 climbed visited'],
  },
  'e6s1-01-b': {
    learn: "Part B 学谈论假期旅行：Where did you go over the summer holidays? / I went to Xi'an with my family.，学 go、see、eat、take 和它们的过去式 went、saw、ate、took，读井冈山的旅行点评；Reading time 介绍三星堆、西湖等四处名胜。",
    mistakes: 'went、saw、ate、took 是不规则过去式，孩子常写成 goed、seed、eated；took a trip、took photos 里的 take 不是「拿」，而是「进行、做」某个动作。',
    parent: '和孩子回忆一次出游，用 Where did you go? / What did you do there? 互相问答，让他用 went、saw、ate、took 各说一句；再一起给去过的地方写一句点评。',
    keywords: ['六年级上册英语 Unit 1 Part B', 'PEP 六年级英语不规则过去式 went saw ate took', '六年级英语 Where did you go 句型'],
  },
  // ── 上册 Unit 2 Getting together ──
  'e6s1-02-a': {
    learn: 'Part A 学谈论节日里和家人做的事：How was your Mid-Autumn Festival holiday? / Did you eat mooncakes? / Yes, we did.，学 paste、dress、count down，用 cleaned、pasted、dressed、counted down 说说春节怎么过。',
    mistakes: "Did you …? 后面用动词原形，孩子常说成 Did you ate mooncakes?；回答要用 did（Yes, we did. / No, we didn't.），常错答成 Yes, we are.。",
    parent: "过节时和孩子一起贴福字，顺口说 We pasted fu on the door.；节后用 Did you …? 问问孩子做了什么，让他用 Yes, I did. / No, I didn't. 回答。",
    keywords: ['六年级上册英语 Unit 2 Getting together', 'PEP 六年级英语 Did you 一般过去时问答', '六年级英语 paste dress count down 单词'],
  },
  'e6s1-02-b': {
    learn: 'Part B 学谈论参加过的活动：What did you do last weekend? / I joined an online book fair.，学 run、read、make、sing、wear 和过去式 ran、read、made、sang、wore，读赛龙舟的日记；Reading time 是课本剧《年的故事》。',
    mistakes: 'read 的过去式拼写不变，但读音变成 /red/，孩子常照原形读；ran、sang、wore、made 常被写成 runned、singed、weared、maked。',
    parent: '运动会、书展、演出之后问孩子 How was it? / What did you like about it?，让他用 ran、sang、made 这些过去式说一说；春节前一起读一读年兽的故事。',
    keywords: ['六年级上册英语 Unit 2 Part B', 'PEP 六年级英语不规则过去式 ran sang wore', '六年级英语 What did you like about it 句型'],
  },
  // ── 上册 Unit 3 Healthy life ──
  'e6s1-03-a': {
    learn: "Part A 学说哪里不舒服：What's the matter? / I have a bad cold. My head hurts and I have a runny nose.，再学 cold、runny nose、fever、cough，用 He has a fever. / She has a cough. 说别人生了什么病。",
    mistakes: 'cold 在这里是名词「感冒」，常和「冷的」弄混：I have a cold. 是「我感冒了」，I feel cold. 是「我觉得冷」；has a fever、has a cough 里的 a 常漏掉。',
    parent: "家里有人不舒服时，让孩子用 What's the matter? 问一问，再用 You should … 给个建议，比如 drink some water、have a rest、see a doctor。",
    keywords: ['六年级上册英语 Unit 3 Healthy life', "PEP 六年级英语 What's the matter 句型", '六年级英语 cold fever cough runny nose 单词'],
  },
  'e6s1-03-b': {
    learn: "Part B 学怎样健康生活：How can we live a healthy life? / We need to eat healthy food.，再学 Have a healthy diet.、Don't stay up late.；读 Miss White 怎样开导伤心的 Liu Jia，Reading time 讲两只手怎样帮小主人保持健康。",
    mistakes: "stay up（熬夜）和 get up（起床）常弄混：Don't stay up late. 是「别熬夜」；diet 是「日常饮食」，不只是「节食」；should 后跟动词原形，不说 We should exercises.。",
    parent: "和孩子列一张「健康生活」清单，每条用 We should … 或 Don't … 说一句；孩子不开心时，学 Miss White 陪他想想 happy things，或者给好朋友打个电话。",
    keywords: ['六年级上册英语 Unit 3 Part B', 'PEP 六年级英语 How can we live a healthy life', '六年级英语 diet stay up 单词'],
  },
  // ── 上册 Unit 4 Managing money well ──
  'e6s1-04-a': {
    learn: "Part A 学说零花钱打算怎么花：How are you going to spend your pocket money? / I'm going to buy a schoolbag.，再学 money、goods、drink、service、haircut，知道钱能买商品（food and drink），也能付服务的钱（haircuts）。",
    mistakes: "goods（商品）总用复数，不说 a good；drink 在这里是名词「饮料」；be going to 后面跟动词原形，常说成 I'm going to buying …。",
    parent: "逛超市、去理发店时问孩子 Is it goods or a service?；让他用 I'm going to buy … 说说这个月的零花钱怎么花，再一起分一分「需要」和「想要」。",
    keywords: ['六年级上册英语 Unit 4 Managing money well', 'PEP 六年级英语 How are you going to spend your pocket money', '六年级英语 money goods service haircut 单词'],
  },
  'e6s1-04-b': {
    learn: 'Part B 学聪明地用钱：How can we use our money wisely? / We can write a spending plan.，再学 save up、sale 和 wait for a sale；读 Chen Jie 把钱分进 spend、share、save 三个罐子，Reading time 讲从以物易物到手机付钱的变化。',
    mistakes: 'sale（特价销售）和 sell（卖）长得像，常混用：wait for a sale 是「等打折」；save up for 后面跟要攒钱买的东西，for 常漏掉。',
    parent: "和孩子一起写下个月的 spending plan，分「需要 / 想要」两栏；想买贵的东西就说 I'm going to save up for …，再准备几个罐子学 Chen Jie 分钱。",
    keywords: ['六年级上册英语 Unit 4 Part B', 'PEP 六年级英语 save up wait for a sale', '六年级英语 spending plan 零花钱'],
  },
  // ── 上册 Unit 5 Exploring space ──
  'e6s1-05-a': {
    learn: "Part A 学说天上和太空里能看到什么：What can you see in the sky? / We can see the Sun and clouds.，再学 planet、earth、moon、star、space、space station、satellite，读地球的自我介绍 I'm a planet.。",
    mistakes: 'Earth、the Sun、the Moon 首字母要大写；复数主语后面的动词不加 s（Satellites travel around me.），单数要加（It travels around me too.）。',
    parent: '晚上带孩子看月亮、找星星，问一句 What can you see in the sky?，让孩子用 We can see the Moon and the stars. 回答。',
    keywords: ['六年级上册英语 Unit 5 Exploring space', 'PEP 六年级英语太空单词 planet satellite', '六年级英语 What can you see in the sky 句型'],
  },
  'e6s1-05-b': {
    learn: 'Part B 学谈论火星和探索太空：Is there any water on Mars? / Yes, there is.，再学 telescope、astronaut、spaceship，会说 We can look into space with telescopes.；读中国航天员在太空的一天，Reading time 讲太阳系的趣味知识。',
    mistakes: "Are there any aliens? 要用 there are / there aren't 回答，不能说 Yes, there is.；spaceship 是一个词，中间不空格；telescope 常漏掉词尾的 e。",
    parent: '和孩子一起看「天宫课堂」或航天新闻，用 What do astronauts do? 聊聊航天员在太空里怎么洗脸、刷牙、种菜；再说说探索太空要用到的 telescope、spaceship、satellite。',
    keywords: ['六年级上册英语 Unit 5 Part B', 'PEP 六年级英语 Is there any water on Mars', '六年级英语 astronaut telescope spaceship 单词'],
  },
  // ── 上册 Unit 6 Energy, nature and us ──
  'e6s1-06-a': {
    learn: 'Part A 学谈论能源从哪里来：Running water can make electricity.，再学 power、solar 和动词 light、heat、cool、run（照亮、加热、使变凉、使运转），会说 We use green energy to light, heat and cool our homes.。',
    mistakes: '这一课的 light、heat、cool、run 都当动词用，孩子常只记得「灯」「热的」「凉的」「跑」，run cars 是让汽车跑起来；solar 是「太阳的」，solar power 才是太阳能。',
    parent: '在家里找一找用电的东西，和孩子一起说 We use electricity to light a bulb.；看到太阳能板、风力发电机时，问一句 What can make electricity?。',
    keywords: ['六年级上册英语 Unit 6 Energy, nature and us', 'PEP 六年级英语 solar power 绿色能源', '六年级英语 light heat cool run 动词用法'],
  },
  'e6s1-06-b': {
    learn: 'Part B 学怎样节约能源：How can we save energy? / We can take quick showers.，再学 reduce、reuse 和「3R」原则（减少、再利用、回收），读节约能源的三条建议、给编辑写回信；Reading time 讲爷爷和斌斌用太阳能「烤箱」做饭。',
    mistakes: 'reduce（减少）和 reuse（再次使用）只差中间几个字母，常混；should 后面用动词原形，常错写成 We should saves energy.；use air conditioners less 是「少开空调」。',
    parent: '和孩子列一张家庭节能清单：Take quick showers. / Turn off the lights.，每做到一条就用英语说一句；洗菜的水拿去浇花，就是 reuse。',
    keywords: ['六年级上册英语 Unit 6 Part B', 'PEP 六年级英语 How can we save energy', '六年级英语 3R reduce reuse recycle'],
  },
  // ── 上册 ☆ Revision: Learning in museums ──
  'e6s1-07-revision': {
    learn: '上册总复习，主题是在博物馆里学习：用 What do you want to learn about? 说想了解什么，读 Zhang Peng 去长城博物馆的计划（要带多少钱、先去理发）；再当小记者用 What did you see? / I saw a big spaceship. 采访同学，读嫦娥和后羿的短剧，最后读博物馆「减压区」的健康小贴士。',
    mistakes: '不规则过去式要记牢：see → saw、go → went、sing → sang，孩子常写成 seed、goed；did 后面跟动词原形，What did you saw? 是错的。',
    parent: "和孩子一起做个参观博物馆的计划，用 I'm going to visit … 说说去哪儿、带多少钱；回来后让孩子当小记者，用 What did you see? 采访家人，再用 I saw … 讲讲见闻。",
    keywords: ['六年级上册英语 Revision Learning in museums', 'PEP 六年级英语上册总复习', '六年级英语上册期末复习 过去式'],
  },
  // ── 下册 Unit 1 How tall are you? ──
  'e6s2-01-a': {
    learn: "Part A 在恐龙博物馆里比身高、比年龄：How tall are you? / I'm 1.65 metres.，学 taller、shorter、older、younger、longer，会说 I'm taller than this dinosaur.，再做一次身高、年龄小调查。",
    mistakes: "比较级后面要接 than，孩子常说成 I'm taller you.；shorter 既是「更矮的」也是「更短的」，比长短用 longer，比身高用 taller；metres 的 s 常漏写。",
    parent: '量一量全家人的身高，用 How tall are you? 互相问，再用 Dad is taller than Mum. 比一比；看全家福时说说 Grandpa is older than Dad.。',
    keywords: ['六年级下册英语 Unit 1 How tall are you', 'PEP 六年级英语比较级 taller shorter older younger', '六年级英语 How tall are you 句型'],
  },
  'e6s2-01-b': {
    learn: "Part B 在鞋店里比鞋码、比体重：What size are your shoes? / Size 7.、How heavy are you? / I'm 48 kilograms.，学 thinner、heavier、bigger、smaller、stronger，读小鸭子和影子的故事，Story time 里动物们挑守门员。",
    mistakes: 'thin、big 要双写末尾字母再加 er（thinner、bigger），heavy 要变 y 为 i 再加 er（heavier）；问体重用 How heavy，问鞋码用 What size，常和 How tall 混用。',
    parent: "和孩子一起称体重，用 How heavy are you? 问一问；比比全家人的鞋，说 Dad's shoes are bigger than mine.；傍晚出门看看影子有多长。",
    keywords: ['六年级下册英语 Unit 1 Part B', 'PEP 六年级英语比较级 bigger heavier thinner', '六年级英语 How heavy are you 句型'],
  },
  // ── 下册 Unit 2 Last weekend ──
  'e6s2-02-a': {
    learn: 'Part A 学谈论上个周末：How was your weekend? / It was fine, thanks. / What did you do? / I watched TV.，学 cleaned my room、washed my clothes、stayed at home、watched TV，听 Mike 打电话和爷爷聊周末。',
    mistakes: '说过去的事动词要用过去式，孩子常说成 I clean my room last weekend.；问句 What did you do? 的 do 用原形，常写成 did；cleaned 的 -ed 常漏写。',
    parent: '周一放学问孩子 How was your weekend? What did you do?，让他用 I cleaned my room. / I watched TV. 回答，把做过的事都用过去式说一说。',
    keywords: ['六年级下册英语 Unit 2 Last weekend', 'PEP 六年级英语一般过去时 规则动词 -ed', '六年级英语 What did you do last weekend 句型'],
  },
  'e6s2-02-b': {
    learn: 'Part B 学说过去做过的事：What did you do last weekend? / I saw a film.，学 had a cold、slept、read a book、saw a film 和 yesterday、the day before yesterday，读给旅馆的意见信，Story time 里 Zoom 过了个忙碌的周末。',
    mistakes: 'saw、slept、had 是不规则变化，孩子常写成 seed、sleeped、haved；read 的过去式写法不变、读音变成 /red/；the day before yesterday 是「前天」，常被当成「昨天」。',
    parent: '睡前问孩子 What did you do yesterday?，让他用过去式说两三件事；看完电影说 We saw a film.，感冒好了说 I had a cold last week.。',
    keywords: ['六年级下册英语 Unit 2 Part B', 'PEP 六年级英语不规则动词过去式 saw slept had', '六年级英语 yesterday the day before yesterday 时间词'],
  },
  // ── 下册 Unit 3 Where did you go? ──
  'e6s2-03-a': {
    learn: 'Part A 学谈论假期去了哪里、做了什么：Where did you go? / Did you go to Turpan? / Yes, I did.，再学 went、rode、hurt 和 went camping、went fishing；读 John 骑车摔伤了脚、劳动节在新疆骑马的对话。',
    mistakes: 'went、rode 是 go、ride 的过去式，孩子常写成 goed、rided；hurt 的过去式还是 hurt；Did you … ? 后面用动词原形，常说成 Did you went …?。',
    parent: '和孩子翻看假期照片，用 Where did you go? / What did you do there? 一问一答，让孩子用 I went … / I rode … 回答。',
    keywords: ['六年级下册英语 Unit 3 Where did you go', 'PEP 六年级英语一般过去时 went rode', '六年级英语 went camping went fishing 单词'],
  },
  'e6s2-03-b': {
    learn: 'Part B 学说假期怎么去、做了什么：How did you go there? / We went there by plane.，再学 ate、took pictures、bought gifts；读吴斌斌一家「糟糕却又开心」的一天，Story time 里 Zoom 梦见坐飞船去了月亮。',
    mistakes: 'ate、took、bought 是不规则过去式，常写成 eated、taked、buyed；How did you go there? 问交通方式，要用 by plane 回答，孩子常答成地点。',
    parent: '假期回来和孩子做一份旅行小报：贴上照片，用 I went to … / I took pictures of … / I bought … 各写一句。',
    keywords: ['六年级下册英语 Unit 3 Part B', 'PEP 六年级英语 How did you go there 句型', '六年级英语过去式 ate took bought'],
  },
  // ── 下册 Unit 4 Then and now ──
  'e6s2-04-a': {
    learn: "Part A 学比较过去和现在：There was no gym in my school thirty years ago. / Now there's a new one.，再学 dining hall、gym、grass 和 … years ago；读爷爷讲他小时候的学校：山上只有一栋小楼，没有电脑和互联网。",
    mistakes: 'There was 跟单数、There were 跟复数，孩子常一律用 was；句子里有 … years ago 时要用 was / were，常错用 is / are。',
    parent: '翻出爸爸妈妈小时候的照片，和孩子用 There was … / There were … 说说那时的学校，再用 Now there is … 说说现在的学校，一起找找变化。',
    keywords: ['六年级下册英语 Unit 4 Then and now', 'PEP 六年级英语 There was There were 句型', '六年级英语 dining hall gym grass 单词'],
  },
  'e6s2-04-b': {
    learn: "Part B 学说人的变化：Before, I was quiet. Now, I'm very active in class.，再学 go cycling、ice-skate、play badminton；读吴斌斌的梦 What a dream!（和爸爸赛跑，喝了水跑得像猎豹一样快，一跤摔醒），Story time 看地球从过去到现在的变化。",
    mistakes: 'go cycling 用 go、play badminton 用 play，孩子常说反；thought、felt、woke 是不规则过去式，常写成 thinked、feeled、waked。',
    parent: "翻看孩子小时候的照片，用 Before, I … Now, I … 说说他的变化，如 Before, I couldn't ride a bike. Now, I go cycling.。",
    keywords: ['六年级下册英语 Unit 4 Part B', 'PEP 六年级英语 Before Now 说变化', '六年级英语 go cycling ice-skate badminton'],
  },
  // ── 下册 ☆ Recycle: Mike's happy days ──
  'e6s2-05-recycle': {
    learn: '下册 Recycle 跟着 Mike 快乐的八天复习全册：用 a、an、some 说农场里看到的东西，用 bigger / smaller than 比大小，用过去式讲 Mike 周六做了什么，读 Bill 的海报比较他以前、现在和将来，再读告别聚会的邀请信、念告别儿歌，最后读 Zip 和 Zoom 分别的故事。',
    mistakes: 'a 和 an 看后面单词的第一个音：an egg、an elephant，复数前用 some；比较级后面要跟 than，孩子常说成 Bill is tall than before.；will 后面跟动词原形。',
    parent: "翻出孩子小时候的照片，用 I was smaller before. / Now I'm taller. 比一比；再一起写张聚会邀请卡，用 We will … 写聚会上要做的事。",
    keywords: ["六年级下册英语 Recycle Mike's happy days", 'PEP 六年级英语下册总复习', '六年级英语下册期末复习 比较级 过去式'],
  },
}
