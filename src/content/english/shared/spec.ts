// 英语一个知识点的出题材料（需求 §11 E1）：纯数据，由内容包的 units 文件填写，makers.ts 把它变成题目条目。
// 英文照课本原样写（大小写、标点都照课本）；中文只写汉字，拼音统一查内容包的拼音表（py.ts），测试保证查得到、音节数与汉字数相等。

/**
 * 一个知识点（Part A / 字母与发音 / Part B / Revision）的材料。字段都是可选的，有什么出什么；mix 决定各档出哪些模板、各占多少：
 * 模板名见 makers.ts 的 unitItems（listen / pic / wordpic / meaning / zh2en / listenpic / spelling / digraph / upper / lower / listenletter /
 * after / before / sound / decode / spell / talk / cloze / listensent / ask / count / numword / num2word）。
 * 每道题都要考到英语（E3）：中文问题配中文答案的问答不许写，数数要选英文数词。
 */
export interface UnitSpec {
  /** 知识点 id */
  kp: string
  /**
   * 单词：「word 中文 emoji」，emoji 可省（没有合适的图就不写）；英文可以是几个词——第一个汉字之前的都是英文。
   * **只写课本单元词汇表里的黑体词**（要求理解、运用的；白体词只要求在语境中理解，只在句子里出现，不单独考意思，E1），
   * Part A / B 写这一部分页码上的，Revision 写本册学过的。中文意思简短、孩子平常的说法（「耳朵」「橙子」「男人」），
   * 同一个词各处一样；图只给一眼认得出、和别的词的图分得清的（动词别配身体部位的图：👀 会被看成 eye）
   */
  words?: string[]
  /**
   * 拼读词：「cab 🚕」「bad」——字母课的例词与「Can you read the words?」里只要求会读、不要求懂意思的词，
   * 只出听音选词（decode）、补全字母、听首字母（sound，有图的把图画出来作提示），不考意思、不进全年级的词池
   */
  read?: string[]
  /** 本课的字母（三上 Letters and sounds）：「Aa Bb Cc Dd」 */
  letters?: string
  /** 字母的发音例词（三上 Letters and sounds）：「a apple bag」= 字母 + 课本里的例词（以这个字母开头的用于「听音选首字母」） */
  sounds?: string[]
  /**
   * 拼读（三下、四上、四下 Let's spell）：「a-e cake name make|cat hat」= 字母组合 + 含它的词 | 对比词（不含它的，或者字母一样、
   * 读音不一样的：ear 组的 bear、pear）；这些词也算拼读词。四上的辅音字母组合（ch sh th ph wh ck）还能出补全字母组合（digraph）
   */
  spell?: string[]
  /** 对话：「Hello! I'm Mike.=Hi! I'm Sarah.|Thank you./Goodbye.」= 一句话 + 合适的应答 | 不合适的应答（2–3 条，用 / 分开） */
  talk?: string[]
  /** 选词填空：「I [like] apples.|have/am」挖掉的词用 [ ] 括起来，| 后是干扰词（2–3 个，用 / 分开）；「\n」换行 */
  cloze?: string[]
  /**
   * 问答：「Where is Amy from?=the UK/China/Canada」= 问题 + 答案 / 错 / 错。英文句子配中文选项是「这句话是什么意思」，
   * 中文问题配英文选项也行（「爸爸的爸爸用英语怎么说？=grandpa/grandma/dad」）；**中文问题配中文选项不许写**（没考到英语）。
   * 答案要能从这句话本身或课文里知道，只有看课本插图才知道的不出。「=#3」= 数字键盘答 3（问题必须是英文）
   */
  ask?: string[]
  /** 数字（Unit 6）：「one two three four five」→ 数数题、数词 ↔ 数字 */
  numbers?: string
  /** 各档的模板与权重：「listen:3 pic:3 meaning:2」（第 1 档是练习的主体） */
  mix: Record<1 | 2 | 3, string>
}
