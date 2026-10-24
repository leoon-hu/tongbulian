// 英语一个知识点的出题材料（需求 §11 E1）：纯数据，由内容包的 units 文件填写，makers.ts 把它变成题目条目。
// 英文照课本原样写（大小写、标点都照课本）；中文只写汉字，拼音统一查内容包的拼音表（py.ts），测试保证查得到、音节数与汉字数相等。

/**
 * 一个知识点（Part A / 字母与发音 / Part B / Revision）的材料。字段都是可选的，有什么出什么；mix 决定各档出哪些模板、各占多少：
 * 模板名见 makers.ts 的 unitItems（listen / pic / wordpic / meaning / zh2en / listenpic / spelling / upper / lower / listenletter /
 * after / before / sound / spell / spellgroup / talk / cloze / listensent / ask / count / numword / num2word）。
 */
export interface UnitSpec {
  /** 知识点 id */
  kp: string
  /**
   * 单词：「word 中文 emoji」，emoji 可省（没有合适的图就不写）；英文可以是几个词（red panda 小熊猫 🐼）——第一个汉字
   * 之前的都是英文。中文意思写课本词汇表里的第一个义项，简短（「耳朵」「橙子」）
   */
  words?: string[]
  /** 本课的字母（三上 Letters and sounds）：「Aa Bb Cc Dd」 */
  letters?: string
  /** 字母的发音例词（三上 Letters and sounds）：「a apple bag」= 字母 + 课本里的例词（以这个字母开头的用于「听音选首字母」） */
  sounds?: string[]
  /** 拼读（三下 Let's spell）：「a-e cake name make|cat hat」= 字母组合 + 含它的词 | 对比词（不含它的） */
  spell?: string[]
  /** 对话：「Hello! I'm Mike.=Hi! I'm Sarah.|Thank you./Goodbye.」= 一句话 + 合适的应答 | 不合适的应答（2–3 条，用 / 分开） */
  talk?: string[]
  /** 选词填空：「I [like] apples.|have/am」挖掉的词用 [ ] 括起来，| 后是干扰词（2–3 个，用 / 分开）；「\n」换行 */
  cloze?: string[]
  /**
   * 问答：「Where is Amy from?=the UK/China/Canada」= 问题 + 答案 / 错 / 错；问题和选项可以是中文（「Amy 来自哪个国家？=英国/中国」），
   * 「=#3」= 数字键盘答 3
   */
  ask?: string[]
  /** 数字（Unit 6）：「one two three four five」→ 数数题、数词 ↔ 数字 */
  numbers?: string
  /** 各档的模板与权重：「listen:3 pic:3 meaning:2」（第 1 档是练习的主体） */
  mix: Record<1 | 2 | 3, string>
}
