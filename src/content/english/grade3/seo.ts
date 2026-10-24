/** 知识点静态页（搜索引擎用）的专属正文：怎么学 / 常见错误 / 家长怎么陪 / 搜索词。只出现在静态页，不进应用、不注音、不朗读。 */
export interface KpSeo {
  /** 这一课在课本里学什么、怎么学（2–3 句，60–120 字） */
  learn: string
  /** 孩子常见的错误与原因（1–2 句，40–90 字） */
  mistakes: string
  /** 家长怎么陪练、怎么用生活场景练（1–2 句，40–90 字） */
  parent: string
  /** 家长会搜的词，2–4 个，如「三年级上册英语 Unit 1 单词」「PEP 三年级英语字母练习」 */
  keywords: string[]
}

export const KP_SEO: Record<string, KpSeo> = {
  // ── 上册 Unit 1 Making friends ──
  'e3s1-01-a': {
    learn: "Part A 学打招呼和自我介绍：Hello! I'm Mike Black. / Hi! My name is Wu Binbin. / Nice to meet you. / Nice to meet you too.，再学五个身体部位的词 ear、eye、mouth、hand、arm，配合「Listen and do」边听边指。",
    mistakes: "I'm 和 My name is 两种说法容易混着用（I'm name is…）；ear 和 eye 拼写只差一个字母，常认错；Nice to meet you 的回答要加 too。",
    parent: '在家用英语互相打招呼、介绍自己，家长说 Point to your ear.、Wave your hand.，让孩子做动作；也可以指着家人的眼睛、嘴巴说英语。',
    keywords: ['三年级上册英语 Unit 1 Making friends', 'PEP 三年级英语打招呼句型', '三年级英语身体部位单词'],
  },
  'e3s1-01-letters': {
    learn: '认读和书写字母 Aa、Bb、Cc、Dd，听出单词开头的音：a 如 apple、bag，b 如 bed、Bob，c 如 cat、can，d 如 dog、sad；还要能拼读 bad、cab、dad 这样的三字母词。',
    mistakes: 'b 和 d 的小写方向容易写反、认反；字母名（A /eɪ/）和字母在单词里的发音（apple 里的 /æ/）分不清；cat 和 can 开头的 c 容易听成 k。',
    parent: '和孩子一起找身边以 a、b、c、d 开头的东西说一说（apple、bag、cat、dog）；用手指在桌上写大小写字母，边写边说字母名和它的发音。',
    keywords: ['三年级英语字母 Aa Bb Cc Dd', 'PEP 三年级 Letters and sounds', '三年级英语字母发音练习'],
  },
  'e3s1-01-b': {
    learn: "Part B 学怎样做个好朋友：Oh no! / It's OK. / We can share. / Thank you.，和 smile、listen、help、share 四个动作词，读短文 I am a good friend，Reading time 讲 Zoom 和 Zip 成为好朋友的故事。",
    mistakes: "share 常被拼成 shar 或 sheer；It's OK 用来安慰别人，孩子有时当成「好的」来回答请求；friend 的 ie 常写反。",
    parent: '遇到孩子和伙伴分东西、帮忙时顺口说 We can share. / Let me help.；睡前一起读 Reading time 的小故事，问问 Zoom 和 Zip 一起做了什么。',
    keywords: ['三年级上册英语 Unit 1 Part B', 'PEP 三年级 We can share 句型', '三年级英语 I am a good friend'],
  },
  // ── 上册 Unit 2 Different families ──
  'e3s1-02-a': {
    learn: 'Part A 学把朋友介绍给家人：Mum! Dad! This is my friend, Sarah Miller. / This is my grandma. / Nice to meet you.，再学 mum、dad、grandma、grandpa、mother、father、sister、me 这些家人的词，配 chant 把一家人介绍一遍。',
    mistakes: 'grandma 和 grandpa 只差一个字母，听和写都容易混；mother / mum、father / dad 是同一个人的两种叫法，孩子常当成两个人。',
    parent: '拿出全家福让孩子用 This is my mum. / This is my grandpa. 一个个介绍；家里来客人时请孩子用英语介绍家人，再唱 Daddy Finger 手指歌。',
    keywords: ['三年级上册英语 Unit 2 Different families', 'PEP 三年级英语家庭成员单词', '三年级英语 This is my family 句型'],
  },
  'e3s1-02-letters': {
    learn: '认读和书写字母 Ee、Ff、Gg、Hh，听出单词开头的音：e 如 egg、nest，f 如 fish、beef，g 如 girl、pig，h 如 hot、hat；还要能拼读 bed、fed、gab、had 这样的三字母词。',
    mistakes: '大写 E 和 F 只差底下一横，常写混；小写 g 的下半截容易写成 q 的样子；h 开头的音很轻（hot、hat），孩子听的时候容易漏掉，当成元音开头。',
    parent: '和孩子找身边以 e、f、g、h 开头的东西说一说（egg、fish、girl、hat）；用手指在桌上写大小写字母，边写边说字母名和它在单词里的发音。',
    keywords: ['三年级英语字母 Ee Ff Gg Hh', 'PEP 三年级 Letters and sounds', '三年级英语字母发音练习'],
  },
  'e3s1-02-b': {
    learn: "Part B 学问「这是你哥哥吗」并回答：Is this your sister? / No, it's my cousin. / Is that your brother? / Yes, it is.，再学 uncle、aunt、cousin、brother、baby sister，读短文和两首家庭小诗。",
    mistakes: 'Is this your ...? 要用 it 回答（Yes, it is.），孩子常答成 Yes, I am.；uncle 和 aunt 哪个是男的哪个是女的容易混。',
    parent: "翻家里的相册问孩子 Is this your uncle?，让孩子用 Yes, it is. / No, it's my ... 回答；也可以一起画一棵 family tree。",
    keywords: ['三年级上册英语 Unit 2 Part B', 'PEP 三年级 Is this your brother 句型', '三年级英语 uncle aunt cousin 单词'],
  },
  // ── 上册 Unit 3 Our animal friends ──
  'e3s1-03-a': {
    learn: "Part A 学到朋友家做客和聊宠物：I like your dog. / Do you have a pet? / Yes, I do. I have a cat. / No, I don't.，再学 dog、cat、fish、bird、rabbit 五种宠物，配 Listen and do 学小动物跑、跳、游。",
    mistakes: "Do you have ...? 要用 do 回答（Yes, I do. / No, I don't.），孩子常答成 Yes, I have.；rabbit 里有两个 b，常漏写一个。",
    parent: '在家问孩子 Do you have a pet?，没有宠物就拿玩具或图片来问；看到小区里的猫狗鸟顺口说 I like cats.，再让孩子像小狗一样跑、像小兔一样跳。',
    keywords: ['三年级上册英语 Unit 3 Our animal friends', 'PEP 三年级英语 Do you have a pet 句型', '三年级英语宠物单词'],
  },
  'e3s1-03-letters': {
    learn: '认读和书写字母 Ii、Jj、Kk、Ll，听出单词开头的音：i 如 ill、kid，j 如 job、jet，k 如 Kim、kite，l 如 leg、lion；还要能拼读 big、dig、Jim、lab、led 这样的三字母词。',
    mistakes: '大写 I 和小写 l 长得几乎一样，孩子常认错；小写 i 和 j 上面的点容易漏掉；字母 i 的名字读 /aɪ/，在 ill、kid 里却读 /ɪ/，两种音要分清。',
    parent: '和孩子找身边以 i、j、k、l 开头的东西说一说（kite、leg、lion）；用手指在桌上写大小写字母，边写边说字母名和它在单词里的发音，特别比一比 I 和 l。',
    keywords: ['三年级英语字母 Ii Jj Kk Ll', 'PEP 三年级 Letters and sounds', '三年级英语字母发音练习'],
  },
  'e3s1-03-b': {
    learn: "Part B 学去动物园问「这是什么」：What's this? / It's a fox. / What's that? / It's a red panda. / It's cute!，再学 panda、monkey、tiger、elephant、lion，读短文认识 tall、fast、big、small。",
    mistakes: "elephant 前面要用 an（It's an elephant.），孩子常写成 a；this 和 that 分不清远近；panda 和 red panda 是两种动物。",
    parent: "去动物园或看动物片时让孩子指着问 What's this? / What's that?，家长用 It's a ... 回答再交换；也可以玩手影游戏，猜一猜是哪种动物。",
    keywords: ['三年级上册英语 Unit 3 Part B', "PEP 三年级 What's this 句型", '三年级英语野生动物单词'],
  },
  // ── 上册 Unit 4 Plants around us ──
  'e3s1-04-a': {
    learn: "Part A 学问别人喜不喜欢某种水果：Do you like apples? / Yes, I do. And you? / No, I don't. I like bananas.，再学四种水果 apple、banana、orange、grape 和 farm、air，在农场里说 I like the fresh air.。",
    mistakes: "Yes, I do. 和 No, I don't. 常答反或漏掉 do；问的是 apples 答成 apple，单复数混着用；orange 和 grape 的拼写容易丢字母。",
    parent: "吃水果时用英语问一句 Do you like bananas?，让孩子用 Yes, I do. / No, I don't. 回答；去菜市场、果园也可以指着水果说英语名字。",
    keywords: ['三年级上册英语 Unit 4 Plants around us', 'PEP 三年级英语 Do you like 句型', '三年级英语水果单词'],
  },
  'e3s1-04-letters': {
    learn: '认读和书写字母 Mm、Nn、Oo、Pp，听出单词开头的音：m 如 map、mum，n 如 new、fan，o 如 orange、fox，p 如 pen、cup；还要能拼读 nod、hop、men、nap、pig 这样的三字母词。',
    mistakes: 'm 和 n 听起来接近，小写 n 常多写一个弯写成 m；o 的字母名和它在 fox、hop 里的短音分不清；p 和 b 的小写方向容易写反。',
    parent: '和孩子一起找身边以 m、n、o、p 开头的东西（map、nose、orange、pen），说字母名再说单词；用手指在桌上写大小写字母，边写边说它的发音。',
    keywords: ['三年级英语字母 Mm Nn Oo Pp', 'PEP 三年级 Letters and sounds', '三年级英语字母发音练习'],
  },
  'e3s1-04-b': {
    learn: 'Part B 学怎样帮助植物：The school gardens need help. / We can water the flowers. / We can plant new trees.，认识 sun、water、tree、flower、grass 等词，Reading time 讲一家人种下一棵苹果树。',
    mistakes: 'water 既是「水」也是「浇水」，We can water the flowers. 里常漏掉它；tree 和 trees 的单复数混用；flower 容易写成 flowr。',
    parent: '给花浇水时顺口说 We can water the flowers.；睡前读 Reading time，问问苹果树的家人帮了它什么、它给了家人什么。',
    keywords: ['三年级上册英语 Unit 4 Part B', 'PEP 三年级 Plants need air water and sun', '三年级英语植物单词'],
  },
  // ── 上册 Unit 5 The colourful world ──
  'e3s1-05-a': {
    learn: "Part A 学问颜色：What colour is it? / It's orange.，知道 Red and blue make purple.、Blue and yellow make green.，再学 orange、green、red、blue、purple、brown、yellow 七种颜色和 bear、duck、sea。",
    mistakes: "colour 是英式拼法，常写成 color；回答 What colour is it? 时多写一个 a（It's a green.）；yellow 的两个 l 常少写一个。",
    parent: "指着身边的东西问 What colour is it?，让孩子用 It's… 回答；画画时把两种颜料调在一起，说 Red and blue make purple.，让孩子猜。",
    keywords: ['三年级上册英语 Unit 5 The colourful world', 'PEP 三年级英语 What colour is it 句型', '三年级英语颜色单词'],
  },
  'e3s1-05-letters': {
    learn: '认读和书写字母 Qq、Rr、Ss、Tt、Uu，听出单词开头的音：q 如 quiet、queen，r 如 red、ruler，s 如 see、bus，t 如 Ted、sit，u 如 up、run；还要能拼读 cut、quit、rot、set、tap、tub 这样的三字母词。',
    mistakes: 'q 后面总跟着 u，拼读 quit、queen 时常漏掉 u；小写 q 和 p 的方向容易写反；u 的字母名和它在 up、cut 里的短音分不清；r 容易读成汉语拼音的 r。',
    parent: '和孩子一起找身边以 q、r、s、t、u 开头的东西（queen、ruler、sun、table、umbrella），说字母名再说单词；用手指在桌上写大小写字母，边写边说它的发音。',
    keywords: ['三年级英语字母 Qq Rr Ss Tt Uu', 'PEP 三年级 Letters and sounds', '三年级英语字母发音练习'],
  },
  'e3s1-05-b': {
    learn: 'Part B 学说自己喜欢的颜色：What colours do you like? / I like red and pink.，再学 pink、white、black，读短文 Colours can talk!，Reading time 讲一棵向日葵一年里颜色的变化。',
    mistakes: 'What colours do you like? 回答时常忘了 and；pink 和 purple 容易混；white 的 wh 常写成 w，black 的 ck 常写成 k。',
    parent: '画画时问 What colours do you like?，让孩子答 I like… and…；过马路时指着红绿灯说 Red can say No! Green can say Go!。',
    keywords: ['三年级上册英语 Unit 5 Part B', 'PEP 三年级 What colours do you like 句型', '三年级英语 Colours can talk'],
  },
  // ── 上册 Unit 6 Useful numbers ──
  'e3s1-06-a': {
    learn: "Part A 学问年龄：How old are you? / I'm five years old. / Me too.，也会介绍家人 This is my brother, Sam.；再学数词 one、two、three、four、five，跟着「Jump! Jump! Jump! One, two, three!」的儿歌边跳边数。",
    mistakes: "How old are you? 常被当成「你好吗」来回答；I'm five years old 里的 years 或 old 常漏掉一个；two 和 too 读音一样、拼写容易混。",
    parent: "在家指着家里人问 How old are you?，让孩子用 I'm … years old 回答；上楼梯、摆碗筷时用英语从 one 数到 five，再倒着数回来。",
    keywords: ['三年级上册英语 Unit 6 Useful numbers', 'PEP 三年级英语 How old are you', '三年级英语数字单词 one to five'],
  },
  'e3s1-06-letters': {
    learn: '认读和书写字母表最后五个字母 Vv、Ww、Xx、Yy、Zz，听出单词里的音：v 如 van、vet，w 如 we、win，x 在词尾如 box、six，y 如 yellow、yo-yo，z 如 Zip、quiz；还要能拼读 wet、yes、yum 这样的短词。到这里 26 个字母就学完了。',
    mistakes: 'v 和 w 的发音常混（van 读成 wan）；x 的音在词尾（box、six），孩子常以为也在开头；小写 y 的尾巴容易不出格，大写 Z 和数字 2 容易写混。',
    parent: '和孩子一起唱一遍字母歌，从 A 唱到 Z；找找身边以 v、w、y 开头或以 x、z 结尾的东西（van、yo-yo、box、quiz），用手指在桌上写一写这五个字母的大小写。',
    keywords: ['三年级英语字母 Vv Ww Xx Yy Zz', 'PEP 三年级 Letters and sounds Unit 6', '三年级英语 26 个字母发音练习'],
  },
  'e3s1-06-b': {
    learn: "Part B 学问数量和买东西：How many apples? / Two. / That's ten yuan, please.，再学数词 six、seven、eight、nine、ten；Start to read 讲过生日切蛋糕（Happy birthday!），Reading time 认识汉字「六」和甲骨文的六。",
    mistakes: 'How many 后面的名词要用复数（apples、bananas），孩子常漏掉 s；eight 的 gh 不发音、拼写容易写错；seven 和 six 开头都是 s，听音时容易选错。',
    parent: "买东西、吃饭时问 How many apples?，让孩子数一数再用数词回答；用几枚硬币演一演 That's ten yuan, please. / Here you are.，换着角色演。",
    keywords: ['三年级上册英语 Unit 6 Part B', 'PEP 三年级英语 How many 句型', '三年级英语数字单词 six to ten'],
  },
  // ── 上册 ☆ Revision: Being a good guest ──
  'e3s1-07-revision': {
    learn: '上册总复习，主题是做个好客人：到朋友家问候 Nice to meet you too.，送礼物说 This is for you. / Thank you.，再复习身体部位、宠物、颜色、水果和 How many、Do you like 这些句型，最后唱字母歌、读 How can we be a good guest?。',
    mistakes: 'Do you like 用 Yes, I do、Is that 用 Yes, it is 回答，孩子常混着用；Nice to meet you 的回答忘了加 too；字母歌里 b、d、i、l 常漏唱。',
    parent: '去别人家做客前把 Knock! Knock! Say "Hello!" / Say "Goodbye!" 演一遍；在家把上册的单词卡按身体、动物、水果、颜色分组，说得出就收走一张。',
    keywords: ['三年级上册英语 Revision Being a good guest', 'PEP 三年级英语上册总复习', '三年级英语上册期末复习'],
  },
  // ── 下册 Unit 1 Meeting new people ──
  'e3s2-01-a': {
    learn: "Part A 学认识新同学怎么问答：What's your name? / My name's Amy Green. / Where are you from? / I'm from the UK. / What about you?，再学四个国家名 China、UK、Canada、USA 和 teacher、student。",
    mistakes: "UK、USA 前面要加 the（I'm from the UK），China、Canada 不加，孩子常混；Where 和 What 开头的问句容易听混；USA、UK 的字母顺序常写错。",
    parent: "在家假装初次见面，互相问 What's your name? Where are you from?；看到国旗、地图或新闻里的国家，顺口用英语说一说 China、UK、Canada、USA。",
    keywords: ['三年级下册英语 Unit 1 Meeting new people', 'PEP 三年级英语 Where are you from', '三年级英语国家名单词'],
  },
  'e3s2-01-spell': {
    learn: "Let's spell 学字母组合 a-e 的发音：a 后面隔一个辅音再跟 e，a 就读字母本身的音，如 cake、name、make、game；和 cat、dad、hat 对比着听，再按 Listen, circle and write 听音写词。",
    mistakes: '孩子常把 cake 读成 cat、把 name 的 a 读成短音；写的时候容易漏掉末尾不发音的 e（make 写成 mak）；hat 和 hate、dad 和 date 容易听混。',
    parent: '和孩子一起找含 a-e 的词（cake、name、game、date），把 cat / cake、hat / hate 这样的词对读给孩子听，让他说出哪个有「不发音的 e」。',
    keywords: ['三年级下册英语 a-e 拼读', "PEP 三年级 Let's spell a-e", '三年级英语 cake name make 发音'],
  },
  'e3s2-01-b': {
    learn: "Part B 学礼貌用语和介绍身边的人：Let me help. / After you! / Thank you. / You're welcome. / Who's that girl? / That's our new neighbour, Amy.，学 boy、girl、man、woman，读短文介绍同学和老师。",
    mistakes: "Who's that man? 要用 That's… 回答，孩子常答成 He's… 或直接说名字；After you 不是「在你后面」而是「您先请」；neighbour 字母多，常漏写 gh 或 u。",
    parent: "进出门、递东西时用 After you! / Let me help. / Thank you. 互相说；散步时指着邻居问 Who's that man?，让孩子用 That's… 回答。",
    keywords: ['三年级下册英语 Unit 1 Part B', "PEP 三年级 Who's that girl 句型", '三年级英语礼貌用语 After you'],
  },
  // ── 下册 Unit 2 My words and actions ──
  'e3s2-02-a': {
    learn: "Part A 学用 It has… 描述动物的样子：Your dog is cute. It has a long body and short legs. / Yes, that's right.，学 long、short、fat、thin、slow、body、leg、tail，Look, say and guess 里听描述猜动物，再唱老猫的歌谣。",
    mistakes: 'It has 的 has 常写成 have；long / short、fat / thin 两对反义词容易记混；legs 要加 s，tail 常写成 tale。',
    parent: "看小区里的猫狗或动物园的动物时，用英语说 It has a long tail. It's fat.；也可以玩「我说你猜」：家长描述一种动物的身体，孩子猜是什么。",
    keywords: ['三年级下册英语 Unit 2 My words and actions', 'PEP 三年级 It has a long body 句型', '三年级英语描述动物单词 long short fat thin'],
  },
  'e3s2-02-spell': {
    learn: "Let's spell 学词尾 e 的发音：he、she、me、we、be 里 e 在词尾读字母本身的音，和 bed、red 里中间的 e 对比着听；跟着歌谣 He likes to run. She likes to jump. 读熟，再按 Read, listen and number 听音排序。",
    mistakes: '孩子常把词尾的 e 读成短音，或把 she 读得像 see；he / she / we / me 只差开头一个音，听音时容易混；写 she 时常漏掉 h。',
    parent: '和孩子轮流指着家人说 He… / She…，再一起说 We…，让他把每个词末尾的 e 读得又长又清楚；听写 be、he、me、she、we 五个词，看能不能一次写对。',
    keywords: ['三年级下册英语 -e 拼读', "PEP 三年级 Let's spell he she we", '三年级英语 be he me she we 发音'],
  },
  'e3s2-02-b': {
    learn: "Part B 学怎样表达对家人的爱：Do you often say that to your mum? / Yes, I do. / No, I don't. I often make her gifts.，学 draw a picture、make a card、sing and dance，Reading time 讲用水果做动物来表达自己。",
    mistakes: "Do you often…? 要用 Yes, I do. / No, I don't. 回答，孩子常答成 Yes, I am.；her 和 she 常用反；sing 和 song 容易混。",
    parent: '母亲节、父亲节或家人生日前，和孩子一起 make a card、draw a picture，边做边说英语；平时问孩子 Do you often say that to Mum?，让他用英语回答。',
    keywords: ['三年级下册英语 Unit 2 Part B', 'PEP 三年级 Do you often 句型', '三年级英语 make a card draw a picture'],
  },
  // ── 下册 Unit 3 Tools and senses for learning ──
  'e3s2-03-a': {
    learn: 'Part A 学借文具的礼貌用语：Excuse me. Can I use your eraser, please? / Sure. Here you are. / No problem.，再学六个文具词 bag、book、pencil、paper、pen、ruler，配合「Listen and do」听指令做动作。',
    mistakes: 'Can I use 后面常忘了加 please；Here you are 是递东西时说的，No problem 是回答 Thanks 的，容易用反；pen 和 pencil 听音时常选错。',
    parent: '借东西时让孩子问 Can I use your pen, please?，家长回 Here you are.；再说 Put the book in your bag.，让孩子边听边做。',
    keywords: ['三年级下册英语 Unit 3 Tools and senses for learning', 'PEP 三年级英语文具单词', '三年级英语 Can I use your 句型'],
  },
  'e3s2-03-spell': {
    learn: "学字母组合 i-e 在单词里的发音（kite、write、nine、nice、five 里的 /aɪ/），跟着儿歌 Let's make a kite. 读，再在 big / bike、sit / size、lip / like、fin / fine 这些对子里听出哪个词有 i-e。",
    mistakes: 'i-e 末尾的 e 不发音，孩子常把 bike 读成两个音节；big 和 bike、fin 和 fine 只差一个 e，听音时容易混，拼写时也常漏掉末尾的 e。',
    parent: '和孩子一起找身边含 i-e 的词（kite、bike、nine、five），读的时候用手指出末尾不发音的 e；也可以玩「big 还是 bike」的听音游戏，家长读、孩子指。',
    keywords: ['三年级英语 i-e 拼读', "PEP 三年级下册 Let's spell", '三年级英语 kite bike 发音'],
  },
  'e3s2-03-b': {
    learn: "Part B 学问东西的句型 What's this? / It's a pencil. / What are these? / They're grapes.，和五个感官动词 see、smell、taste、hear、touch，读短句 I smell with my nose.，Reading time 讲动物也用感官学习。",
    mistakes: "this 和 these 分不清，问 What's this? 却用 They're 来答；hear 和 ear 容易混写；smell 和 taste 常对不上鼻子和舌头。",
    parent: "指着一样东西问 What's this?、几样问 What are these?，让孩子用 It's / They're 答；吃水果时说 Smell it. Taste it. 让他做。",
    keywords: ['三年级下册英语 Unit 3 Part B', 'PEP 三年级英语五种感官单词', '三年级英语 What are these 句型'],
  },
  // ── 下册 Unit 4 Healthy food ──
  'e3s2-04-a': {
    learn: "Part A 学吃早餐的对话：Breakfast time! / I'd like some bread and eggs, please. / Here you are. Have some milk too.，再学六个食物词 noodles、egg、cake、juice、bread、milk，配合「Listen and do」边听边做吃喝的动作。",
    mistakes: "I'd like 常被说成 I like（想要和喜欢不一样）；some 后面的 egg 要加 s；milk、juice 要用 drink，eat 和 drink 常搭配错。",
    parent: "早餐时让孩子用 I'd like some… 点餐，家长端上来时说 Here you are.，再加一句 Have some milk too.，把早餐都用英语说一遍。",
    keywords: ['三年级下册英语 Unit 4 Healthy food', 'PEP 三年级英语食物单词', "三年级英语 I'd like some 句型"],
  },
  'e3s2-04-spell': {
    learn: '学字母组合 o-e 在单词里的发音（home、cone、joke、hope、note、bone 里的 /əʊ/），跟着儿歌 Joe Jones eats at home. 读，再在 not / note、hot / home、John / Jones、box / bone 这些对子里听出哪个词有 o-e。',
    mistakes: 'o-e 末尾的 e 不发音，孩子常把 home 读成两个音节；hot 和 home、not 和 note 只差一个 e，听音时容易混，写的时候也常漏掉末尾的 e。',
    parent: '和孩子一起找身边含 o-e 的词（home、note、bone），读的时候用手指出末尾不发音的 e；也可以玩「hot 还是 home」的听音游戏，家长读、孩子指。',
    keywords: ['三年级英语 o-e 拼读', "PEP 三年级下册 Let's spell", '三年级英语 home note 发音'],
  },
  'e3s2-04-b': {
    learn: 'Part B 学请人吃东西的句型 Would you like some rice and meat? / Yes, please. / No, thank you.，和五个食物词 rice、soup、fruit、meat、vegetables，读短文 Rice and noodles are good. 知道什么是健康的食物。',
    mistakes: 'Would you like 常被答成 Yes, I do；拒绝时只说 No 漏掉 thank you；healthy 的 th 常写成 t，meat 和 milk 听音时选错。',
    parent: '吃饭时问 Would you like some rice?，让孩子用 Yes, please. / No, thank you. 答；再指着盘子说 This is my healthy plate.。',
    keywords: ['三年级下册英语 Unit 4 Part B', 'PEP 三年级英语 Would you like 句型', '三年级英语健康食物单词'],
  },
  // ── 下册 Unit 5 Old things ──
  'e3s2-05-a': {
    learn: 'Part A 学谈论旧东西：Do you have old things? / Yes, I do. I have some old books. / This boat is cool. / You can keep it.，再学四个玩具词 ball、doll、boat、car，跟着 chant 说 I have a ball.。',
    mistakes: 'Do you have…? 要用 Yes, I do. 回答，孩子常答成 Yes, it is.；boat 和 ball 开头一样，听音时容易混；doll 的两个 l 常漏写一个。',
    parent: '收拾旧玩具时用英语问 Do you have old things at home?，让孩子举着东西说 I have a ball.；看到喜欢的就说 This boat is cool.。',
    keywords: ['三年级下册英语 Unit 5 Old things', 'PEP 三年级英语 Do you have old things', '三年级英语玩具单词 ball doll boat car'],
  },
  'e3s2-05-spell': {
    learn: '学字母组合 u-e 的发音：cute、use、tube、mute、excuse 里的 u 因为词尾不发音的 e 读成长音，和 cut、us、fun、up、bus、mum 里的短音对比；跟读儿歌 One cute cat uses two old balls.，再听音圈出 u 还是 u-e。',
    mistakes: '孩子常把 cute 读成 cut、use 读成 us——没注意词尾不发音的 e 会把 u 变成长音；mum 和 mute 也容易听混，拼写时常漏掉词尾的 e。',
    parent: '把 cut / cute、us / use、mum / mute 写成两列，家长读一个让孩子指出来，再换过来让孩子读；找找身边的 u-e 词（cute 的猫、use 的笔），边说边比。',
    keywords: ['三年级下册英语 u-e 发音', "PEP 三年级 Let's spell u-e", '三年级英语 cute cut 拼读'],
  },
  'e3s2-05-b': {
    learn: "Part B 学问东西在哪里：Mum, where is my animal book? / Is it on the shelf? / It's in the box.，三个方位词 in、on、under 配上 cap、map、box，Listen and do 边听边做，Reading time 讲小熊用旧玩具修好机器人。",
    mistakes: "in、on、under 要靠图记，孩子常把「在盒子里」说成 on the box；Is it…? 要用 Yes, it is. / No, it isn't. 回答，常答成 Yes, I do.。",
    parent: "把帽子、地图、盒子摆在家里不同的位置，家长问 Where is the cap?，孩子答 It's on the box.；也可以玩书上的猜猜看 Is it in the bag?",
    keywords: ['三年级下册英语 Unit 5 Part B', 'PEP 三年级英语 in on under', '三年级英语 Where is my map'],
  },
  // ── 下册 Unit 6 Numbers in life ──
  'e3s2-06-a': {
    learn: 'Part A 学用数字数东西：How many books do we have? / We have fifteen books. / We need three boxes.，新学 eleven、twelve、thirteen、fourteen、fifteen，再跟着 chant 做加法 Five and six makes eleven.。',
    mistakes: 'eleven、twelve 和后面带 -teen 的不一样，孩子常说成 oneteen、twoteen；thirteen 不是 threeteen、fifteen 不是 fiveteen，拼写常照数字写错。',
    parent: '数家里的筷子、书、积木，用 How many … do we have? 问，让孩子一个一个数到 fifteen；上下楼梯、等红灯时也可以一起从 eleven 数到 fifteen。',
    keywords: ['三年级下册英语 Unit 6 Numbers in life', 'PEP 三年级英语数字 eleven 到 fifteen', '三年级英语 How many 句型'],
  },
  'e3s2-06-spell': {
    learn: '学字母 c、g、l、y 在词头和词尾的不同读音：cat、cake 的 c 和 face、rice 词尾的 -ce，girl 的 g 和 age、orange 的 -ge，legs、long 的 l 和 cool、tell 的 -l，yes、yellow 的 y 和 my 的 -y；先读故事 My cat has a big face.，再听音打勾。',
    mistakes: '孩子常把 face、rice 结尾的 ce 读成 k 的音、把 orange 结尾读成 g 的音；my 的 y 容易读成 yes 里的音；cool、tell 结尾的 l 常被吞掉。',
    parent: '把 cake / face、cool / long、girl / orange、my / yellow 写成对子，家长随机读一个让孩子指，再让孩子读给家长听；读书上的故事时把红色字母的音读清楚。',
    keywords: ['三年级下册英语 c g l y 发音', "PEP 三年级 Let's spell Unit 6", '三年级英语 ce ge 拼读'],
  },
  'e3s2-06-b': {
    learn: "Part B 学用数字买东西：How much is this bag? / It's twenty yuan. / Six yuan, or three for seventeen yuan.，新学 sixteen 到 twenty 五个数词，Read and write 讲存钱罐里的钱怎么花、怎么存。",
    mistakes: 'How much 问价钱、How many 问数量，孩子常混用；eighteen 容易写成 eightteen，twenty 不是 twoteen；回答价钱别忘了加 yuan。',
    parent: "在家摆个小跳蚤市场，给旧玩具标上 11 到 20 元的价钱，孩子问 How much is this car?，家长答 It's eighteen yuan.，再换过来让孩子当老板。",
    keywords: ['三年级下册英语 Unit 6 Part B', 'PEP 三年级英语 How much is this bag', '三年级英语数字 sixteen 到 twenty'],
  },
  // ── 下册 ☆ Revision: Going to a school fair ──
  'e3s2-07-revision': {
    learn: "Revision 围绕「去校园集市」复习下册：和妈妈商量去集市、早餐要 bread and milk，用 What's your name? / Where are you from? 配对话，读 Mike 买铅笔盒和水果拼盘的对话算花了多少钱，再把 school things 和 toys 分开。",
    mistakes: 'Would you like…? 要答 Yes, please.，不是 Yes, I do.；Where are you from? 常答成名字；three for thirteen yuan 只看第一个数。',
    parent: '在家摆个小集市，给玩具、文具贴价签，家长用 How much is this book? 向孩子买；早餐时问 Would you like some milk?，让孩子答 Yes, please.',
    keywords: ['三年级下册英语 Revision 复习', 'PEP 三年级英语下册期末复习', '三年级英语 Going to a school fair'],
  },
}
