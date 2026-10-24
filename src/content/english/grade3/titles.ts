// 三年级英语的知识点 / 单元名（英文名 + 中文标题里汉字的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是 curriculum.ts；单元名本来就是英文（课本的单元名）。
import { registerPinyin, registerTitles } from '@/engine/i18n'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

/** 知识点英文名：按 id 的末段定 */
const EN_BY_KIND: Record<string, (n: number) => string> = {
  a: (n) => `Unit ${n} Part A: Talk and words`,
  letters: (n) => `Unit ${n} Letters and sounds`,
  spell: (n) => `Unit ${n} Let's spell`,
  b: (n) => `Unit ${n} Part B: Talk and words`,
  revision: () => 'Revision',
}
const PY_BY_KIND: Record<string, string> = {
  a: 'duì huà hé dān cí',
  letters: 'zì mǔ hé fā yīn',
  spell: 'pīn dú',
  b: 'duì huà hé dān cí',
  revision: 'fù xí',
}

const KP_TITLE_EN: Record<string, string> = {}
export const TITLE_PINYIN: Record<string, string> = {}
for (const kp of KNOWLEDGE_POINTS) {
  const m = /^e3s\d-(\d\d)-(\w+)$/.exec(kp.id)!
  KP_TITLE_EN[kp.id] = EN_BY_KIND[m[2]!]!(Number(m[1]))
  TITLE_PINYIN[`kp.${kp.id}`] = PY_BY_KIND[m[2]!]!
}

registerTitles(
  { zh: Object.fromEntries(KNOWLEDGE_POINTS.map((kp) => [kp.id, kp.title])), en: KP_TITLE_EN },
  { zh: Object.fromEntries(UNITS.map((u) => [u.id, u.title])), en: Object.fromEntries(UNITS.map((u) => [u.id, u.title])) },
)
registerPinyin(TITLE_PINYIN)
