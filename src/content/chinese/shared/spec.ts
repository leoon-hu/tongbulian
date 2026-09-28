// 一课的出题材料（需求 §9 Y1）：纯数据，由内容包的 lessons 文件填写，makers.ts 把它变成题目条目。
// 中文都只写汉字，拼音统一查内容包的拼音表（py.ts），测试保证查得到、音节数与汉字数相等。

/** 拼音课（上册第二至四单元）的材料 */
export interface PinyinSpec {
  /** 本课的声母 / 韵母 / 整体认读音节，空格分隔（「b p m f」「zi ci si」） */
  letters: string
  /** 本课的音节 + 读法（一个读音唯一的同音字，Y4）：「bā八 bá拔 guā瓜」 */
  syl: string
  /** 看图选音节 / 看拼音选图：「图 音节 读法」，几个音节用 - 连（「🍉 xī-guā 西瓜」） */
  pic?: string[]
  /** 看拼音选词（楷体词语）：「dà-dì 大地」 */
  words?: string[]
  /** 分类题：initial 声母 / final 韵母 / whole 整体认读 / compound 复韵母 / front 前鼻 / back 后鼻，空格分隔 */
  kinds?: string
  /** 顺序题：initials 声母表 / finals 韵母表（学完才有整张表） */
  order?: string
}

/**
 * 一课（或一个语文园地）的材料。字段都是可选的，有什么出什么；mix 决定各档出哪些模板、各占多少：
 * 模板名见 makers.ts 的 lessonItems（listen / pyzi / zipy / pic / zipic / strokes / first / digit / cloze / ask /
 * compose / radical / poet / anto / syn / poly / pyci / cilisten / bushou / bushouN / alphabet / yinxu）与拼音课的
 * （tone / picktone / spell / hear / picpy / pypic / pyword / kind / initial / final / flat / nasal / order）。
 */
export interface LessonSpec {
  /** 知识点 id */
  kp: string
  /** 本课的生字（识字表），空格分隔：听音选字、看拼音选字、看字选读音 */
  zi?: string
  /** 会写的字：「口3竖」= 字 + 笔画数 + 第一笔（横 / 竖 / 撇 / 点，别的笔画不写），空格分隔 */
  xie?: string
  /** 看图：「图 字或词 读法」，读法不写就读字（「☀️ 日 太阳」「✏️ 铅笔」） */
  pic?: string[]
  /** 数字 ↔ 汉字：「1一 2二」 */
  digits?: string
  /** 选词填空：「句子，挖掉的用 [ ] 括起来|干扰/干扰/干扰」；「\n」换行；开头 ! = 选项是不注音的楷体字（考认字） */
  cloze?: string[]
  /** 问答：「问题=答案/错/错/错」，答案前可带 emoji（「🐒猴子」）；开头 ! = 楷体字选项；「=#5」= 数字键盘答 5 */
  ask?: string[]
  /** 加一加 / 减一减：「日+月=明」「飘-风=票」 */
  compose?: string[]
  /** 偏旁：「妈 女 女字旁」= 字 偏旁 名称 */
  radical?: string[]
  /** 古诗的作者：「静夜思 李白」 */
  poet?: string[]
  /** 反义词：两个字一对（「开关」），或两个词用 - 连（「高兴-难过」），空格分隔 */
  anto?: string
  /** 近义词：两个词用 - 连，空格分隔（「美丽-漂亮 高兴-快乐」，二年级起） */
  syn?: string
  /** 词语表里本课的词，空格分隔：看拼音选词语、听音选词语（二年级起） */
  ci?: string
  /**
   * 多音字：「词语 字 读音=同音字 读音=同音字…」，第一个读音是这个字在这个词里的读法；同音字挑只有这一个读音的常用字
   * （朗读用，Y4）。例「长大 长 zhǎng=掌 cháng=常」。只出课本本课 / 园地里教的多音字（二年级起）
   */
  poly?: string[]
  /** 部首查字法：「字 部首 部首名称 除去部首的画数」（「湖 氵 三点水 9」，二年级起） */
  bushou?: string[]
  /** 大小写与字母表顺序（一下语文园地一） */
  alphabet?: boolean
  /** 音序查字：这些字各查一次（一下语文园地三），空格分隔 */
  yinxu?: string
  /** 拼音课 */
  py?: PinyinSpec
  /** 各档的模板与权重：「listen:3 pic:2 cloze:3」（第 1 档是练习的主体，Y5） */
  mix: Record<1 | 2 | 3, string>
}
