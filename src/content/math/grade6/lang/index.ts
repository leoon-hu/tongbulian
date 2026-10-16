// 六年级数学的题目 / 选项 / 教具词条与拼音：每个单元一个文件（lang/<单元>.ts 导出 ZH / EN / PY），这里合起来注册。
// 词条键一律以「m6.」开头（全局字典，别和别的年级重名）；图形名、运算符读法、emoji 名字是各年级共用的表，
// 这里也注册一份（单独加载六年级也能读、能注音）。
import type { Dict } from '@/engine/i18n'
import { registerDict, registerPinyin } from '@/engine/i18n'
import type { ShapeKind } from '@/types/models'
import { SHAPE_NAMES, SHAPE_NAMES_EN, SHAPE_PINYIN, SYMBOL_WORDS } from '@/content/math/shared/labels'
import { EMOJI_EN, EMOJI_ZH } from '@/content/math/shared/emoji'
import * as position from './position'
import * as fracmul from './fracmul'
import * as fracdiv from './fracdiv'
import * as lifeneg from './lifeneg'
import * as circle from './circle'
import * as sports from './sports'
import * as percent from './percent'
import * as water from './water'
import * as negative from './negative'
import * as percent2 from './percent2'
import * as cylinder from './cylinder'
import * as proportion from './proportion'
import * as bike from './bike'
import * as pigeon from './pigeon'

/** 每个单元的词条文件 */
export const UNIT_LANGS: { ZH: Dict; EN: Dict; PY: Record<string, string> }[] = [
  position, fracmul, fracdiv, lifeneg, circle, sports, percent, water,
  negative, percent2, cylinder, proportion, bike, pigeon,
]

const shapeDict = (names: Record<ShapeKind, string>): Dict =>
  Object.fromEntries((Object.keys(names) as ShapeKind[]).map((s) => [`shape.${s}`, names[s]]))

/** 本包自己的中文词条（测试查拼音用）：全部 m6.* 键 */
export const ZH: Dict = Object.assign({}, ...UNIT_LANGS.map((l) => l.ZH))
export const EN: Dict = Object.assign({}, ...UNIT_LANGS.map((l) => l.EN))
export const PINYIN: Record<string, string> = Object.assign({}, ...UNIT_LANGS.map((l) => l.PY))

registerDict({
  zh: { ...ZH, ...shapeDict(SHAPE_NAMES), ...SYMBOL_WORDS.zh, ...EMOJI_ZH },
  en: { ...EN, ...shapeDict(SHAPE_NAMES_EN), ...SYMBOL_WORDS.en, ...EMOJI_EN },
})
registerPinyin({
  ...PINYIN,
  ...Object.fromEntries((Object.keys(SHAPE_PINYIN) as ShapeKind[]).map((s) => [`shape.${s}`, SHAPE_PINYIN[s]])),
})
