// 道德与法治各年级共用的题目要求（dq.*）：中英文与中文的拼音（与汉字逐字对齐，占位符、标点、emoji 不占位；
// 一 / 不 标变调）。问题、做法、儿歌、选项是中文内容，不在这里——它们走各年级内容包的词条（用到时注册，拼音查各包的 py.ts）。
import type { Dict } from '@/engine/i18n'
import { registerDict, registerPinyin } from '@/engine/i18n'

const ZH: Dict = {
  'dq.judge': '这样做对吗？',
  'dq.good': '哪种做法是对的？',
  'dq.bad': '哪种做法不对？',
  'dq.cloze': '选一选，把句子补完整。',
  'dq.yes': '✅ 对',
  'dq.no': '❌ 不对',
}

const EN: Dict = {
  'dq.judge': 'Is this the right thing to do?',
  'dq.good': 'Which is the right thing to do?',
  'dq.bad': 'Which is NOT the right thing to do?',
  'dq.cloze': 'Choose the words that complete the line.',
  'dq.yes': '✅ Right',
  'dq.no': '❌ Wrong',
}

const PINYIN: Record<string, string> = {
  'dq.judge': 'zhè yàng zuò duì ma',
  'dq.good': 'nǎ zhǒng zuò fǎ shì duì de',
  'dq.bad': 'nǎ zhǒng zuò fǎ bú duì',
  'dq.cloze': 'xuǎn yi xuǎn bǎ jù zi bǔ wán zhěng',
  'dq.yes': 'duì',
  'dq.no': 'bú duì',
}

registerDict({ zh: ZH, en: EN })
registerPinyin(PINYIN)
