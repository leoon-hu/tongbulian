// 英语各年级共用的题目要求（eq.*，需求 §11 E4）：中英文与中文的拼音（与汉字逐字对齐，占位符、字母、数字、标点不占位；
// 一 / 不 标变调，「听一听」这类的一读轻声）。单词、句子、要听的词是英文内容，不在这里（英文不注音，E5 用英文的声音读）；
// 单词的中文意思、中文的问题走各年级内容包的 ew.* 词条（用到时注册，拼音查各包的 py.ts）。makers.ts 导入本文件。
import type { Dict } from '@/engine/i18n'
import { registerDict, registerPinyin } from '@/engine/i18n'

const ZH: Dict = {
  // 单词
  'eq.listenWord': '听一听，选出你听到的单词。',
  'eq.picWord': '看图，选出对应的单词。',
  'eq.wordPic': '看单词，选出对应的图。',
  'eq.meaning': '这个单词是什么意思？',
  'eq.zh2en': '「{w}」用英语怎么说？',
  'eq.listenPic': '听一听，选出对应的图。',
  'eq.spelling': '听一听，这个单词缺了哪个字母？',
  'eq.digraph': '听一听，这个单词缺了哪两个字母？',
  // 词形（六年级）
  'eq.pastOf': '这个词的过去式是哪一个？',
  'eq.comparativeOf': '这个词的比较级是哪一个？',
  // 字母与发音
  'eq.lower': '这个大写字母的小写是哪一个？',
  'eq.upper': '这个小写字母的大写是哪一个？',
  'eq.listenLetter': '听一听，选出你听到的字母。',
  'eq.after': '字母表里，这个字母后面的字母是哪一个？',
  'eq.before': '字母表里，这个字母前面的字母是哪一个？',
  'eq.firstSound': '听一听，这个单词是以哪个字母开头的？',
  'eq.spellHear': '听一听，选出你听到的单词。',
  // 对话与句子
  'eq.reply': '听到这句话，怎么回答？',
  'eq.cloze': '选一选，填一填。',
  'eq.listenSentence': '听一听，选出你听到的句子。',
  'eq.sentMeaning': '这句话是什么意思？',
  // 数字
  'eq.howMany': '数一数有几个，选出对应的英语单词。',
  'eq.numWord': '这个单词是数字几？按一按。',
  'eq.whichNum': '数字 {n} 用英语怎么说？',
}

const EN: Dict = {
  'eq.listenWord': 'Listen. Which word did you hear?',
  'eq.picWord': 'Look at the picture. Which word is it?',
  'eq.wordPic': 'Read the word. Which picture is it?',
  'eq.meaning': 'What does this word mean?',
  'eq.zh2en': 'How do you say "{w}" in English?',
  'eq.listenPic': 'Listen. Which picture is it?',
  'eq.spelling': 'Listen. Which letter is missing?',
  'eq.digraph': 'Listen. Which two letters are missing?',
  'eq.pastOf': 'Which is the past tense of this word?',
  'eq.comparativeOf': 'Which is the comparative of this word?',
  'eq.lower': 'Which is the small letter for this capital?',
  'eq.upper': 'Which is the capital for this small letter?',
  'eq.listenLetter': 'Listen. Which letter did you hear?',
  'eq.after': 'In the alphabet, which letter comes after this one?',
  'eq.before': 'In the alphabet, which letter comes before this one?',
  'eq.firstSound': 'Listen. Which letter does the word begin with?',
  'eq.spellHear': 'Listen. Which word did you hear?',
  'eq.reply': 'How do you reply?',
  'eq.cloze': 'Choose the word and fill in the blank.',
  'eq.listenSentence': 'Listen. Which sentence did you hear?',
  'eq.sentMeaning': 'What does this sentence mean?',
  'eq.howMany': 'Count. Which English word is the number?',
  'eq.numWord': 'Which number is this word? Tap it.',
  'eq.whichNum': 'How do you say {n} in English?',
}

export const PINYIN: Record<string, string> = {
  'eq.listenWord': 'tīng yi tīng xuǎn chū nǐ tīng dào de dān cí',
  'eq.picWord': 'kàn tú xuǎn chū duì yìng de dān cí',
  'eq.wordPic': 'kàn dān cí xuǎn chū duì yìng de tú',
  'eq.meaning': 'zhè ge dān cí shì shén me yì si',
  'eq.zh2en': 'yòng yīng yǔ zěn me shuō',
  'eq.listenPic': 'tīng yi tīng xuǎn chū duì yìng de tú',
  'eq.spelling': 'tīng yi tīng zhè ge dān cí quē le nǎ ge zì mǔ',
  'eq.digraph': 'tīng yi tīng zhè ge dān cí quē le nǎ liǎng ge zì mǔ',
  'eq.pastOf': 'zhè ge cí de guò qù shì shì nǎ yí gè',
  'eq.comparativeOf': 'zhè ge cí de bǐ jiào jí shì nǎ yí gè',
  'eq.lower': 'zhè ge dà xiě zì mǔ de xiǎo xiě shì nǎ yí gè',
  'eq.upper': 'zhè ge xiǎo xiě zì mǔ de dà xiě shì nǎ yí gè',
  'eq.listenLetter': 'tīng yi tīng xuǎn chū nǐ tīng dào de zì mǔ',
  'eq.after': 'zì mǔ biǎo lǐ zhè ge zì mǔ hòu miàn de zì mǔ shì nǎ yí gè',
  'eq.before': 'zì mǔ biǎo lǐ zhè ge zì mǔ qián miàn de zì mǔ shì nǎ yí gè',
  'eq.firstSound': 'tīng yi tīng zhè ge dān cí shì yǐ nǎ ge zì mǔ kāi tóu de',
  'eq.spellHear': 'tīng yi tīng xuǎn chū nǐ tīng dào de dān cí',
  'eq.reply': 'tīng dào zhè jù huà zěn me huí dá',
  'eq.cloze': 'xuǎn yi xuǎn tián yi tián',
  'eq.listenSentence': 'tīng yi tīng xuǎn chū nǐ tīng dào de jù zi',
  'eq.sentMeaning': 'zhè jù huà shì shén me yì si',
  'eq.howMany': 'shǔ yi shǔ yǒu jǐ gè xuǎn chū duì yìng de yīng yǔ dān cí',
  'eq.numWord': 'zhè ge dān cí shì shù zì jǐ àn yi àn',
  'eq.whichNum': 'shù zì yòng yīng yǔ zěn me shuō',
}

registerDict({ zh: ZH, en: EN })
registerPinyin(PINYIN)
