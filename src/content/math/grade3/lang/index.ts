// 三年级数学的题目 / 选项 / 教具词条与拼音：每个单元一个文件（lang/<单元>.ts 导出 ZH / EN / PY），这里合起来注册。
// 词条键一律以「m3.」开头（全局字典，别和一、二年级的 q.* / opt.* 重名）；图形名、运算符读法、emoji 名字是各年级共用的表，
// 这里也注册一份（单独加载三年级也能读、能注音）。
import type { Dict } from '@/engine/i18n'
import { registerDict, registerPinyin } from '@/engine/i18n'
import type { ShapeKind } from '@/types/models'
import { SHAPE_NAMES, SHAPE_NAMES_EN, SHAPE_PINYIN, SYMBOL_WORDS } from '@/content/math/shared/labels'
import { EMOJI_EN, EMOJI_ZH } from '@/content/math/shared/emoji'
import * as views from './views'
import * as mixed from './mixed'
import * as length from './length'
import * as mass from './mass'
import * as multiply from './multiply'
import * as coding from './coding'
import * as lines from './lines'
import * as fractions from './fractions'
import * as motion from './motion'
import * as divide from './divide'
import * as rect from './rect'
import * as area from './area'
import * as data from './data'
import * as calendar from './calendar'
import * as decimals from './decimals'

/** 每个单元的词条文件 */
export const UNIT_LANGS: { ZH: Dict; EN: Dict; PY: Record<string, string> }[] = [views, mixed, length, mass, multiply, coding, lines, fractions, motion, divide, rect, area, data, calendar, decimals]

const shapeDict = (names: Record<ShapeKind, string>): Dict =>
  Object.fromEntries((Object.keys(names) as ShapeKind[]).map((s) => [`shape.${s}`, names[s]]))

/** 本包自己的中文词条（测试查拼音用）：全部 m3.* 键 */
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
