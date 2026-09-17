import { ref } from 'vue'
import type { Lang, LParam, LStr } from '@/types/models'
import { SHELL_EN, SHELL_PINYIN, SHELL_ZH } from '@/locales/shell'

export type { Lang, LParam, LStr }

/** 词条：带 {name} 占位的模板串，或需要按数值算文案的格式化函数（金额 / 时刻）。 */
export type Entry = string | ((p: Record<string, string | number>) => string)
export type Dict = Record<string, Entry>

// 全局字典 = 外壳词条（locales/shell.ts）+ 各内容包注册的词条。
const ZH: Dict = { ...SHELL_ZH }
const EN: Dict = { ...SHELL_EN }
const DICTS: Record<Lang, Dict> = { zh: ZH, en: EN }

/** 内容包注册自己的题目/选项词条（并入全局字典）。 */
export function registerDict(entries: { zh: Dict; en: Dict }): void {
  Object.assign(ZH, entries.zh)
  Object.assign(EN, entries.en)
}

/**
 * 内容包注册知识点 / 单元标题：中文来自 curriculum（单一事实源），英文由内容包给。
 * 标题以 `kp.<id>` / `unit.<id>` 进全局字典，于是它也是普通词条——能配拼音、能当 LStr 渲染。
 */
export function registerTitles(
  kp: { zh: Record<string, string>; en: Record<string, string> },
  unit: { zh: Record<string, string>; en: Record<string, string> },
): void {
  for (const [id, title] of Object.entries(kp.zh)) ZH[`kp.${id}`] = title
  for (const [id, title] of Object.entries(kp.en)) EN[`kp.${id}`] = title
  for (const [id, title] of Object.entries(unit.zh)) ZH[`unit.${id}`] = title
  for (const [id, title] of Object.entries(unit.en)) EN[`unit.${id}`] = title
}

// ── 拼音：按词条键存一条与模板汉字逐字对齐的拼音（音节以空格分隔；占位符、数字、标点、emoji 不占位）。
// 金额 / 时刻这类按数值算出来的词条没有固定模板，靠 CHAR_PINYIN 逐字兜底（只有元、角、时、半这几个字）。
const PINYIN: Record<string, string> = { ...SHELL_PINYIN }
const CHAR_PINYIN: Record<string, string> = {}

/** 内容包注册词条拼音（键与字典相同）与单字兜底表。 */
export function registerPinyin(entries: Record<string, string>, chars: Record<string, string> = {}): void {
  Object.assign(PINYIN, entries)
  Object.assign(CHAR_PINYIN, chars)
}

export function pinyinOf(key: string): string | undefined {
  return PINYIN[key]
}

const HAN = /\p{Script=Han}/u

export function isHan(ch: string): boolean {
  return HAN.test(ch)
}

/** 带注音的显示片段：py 有值的是一个汉字及其拼音，没有的是原样显示的文字（数字、emoji、标点、外文）。 */
export interface RubySeg {
  text: string
  py?: string
}

/** 把一段文字逐字对上拼音：syllables 依次给汉字，不够时查单字兜底表，再没有就不注音。 */
function alignRuby(text: string, syllables: string[], out: RubySeg[]): void {
  let plain = ''
  const flush = (): void => {
    if (plain) out.push({ text: plain })
    plain = ''
  }
  for (const ch of text) {
    if (!isHan(ch)) {
      plain += ch
      continue
    }
    flush()
    const py = syllables.shift() ?? CHAR_PINYIN[ch]
    out.push(py ? { text: ch, py } : { text: ch })
  }
  flush()
}

const PLACEHOLDER = /\{(\w+)\}/g

/**
 * 把 LStr 解析成带拼音的片段（只在中文模式下注音；英文模式返回整段纯文本）。
 * 词条模板按占位符切开：模板自己的汉字用该词条的拼音，参数递归（数字原样、LStr 各用各的拼音）。
 */
export function rubySegments(l: LStr, target: Lang = lang.value): RubySeg[] {
  if (target !== 'zh') return [{ text: translate(l, target) }]
  const out: RubySeg[] = []
  collectRuby(l, out)
  // 相邻的纯文本片段合并，减少 DOM 节点
  return out.reduce<RubySeg[]>((acc, seg) => {
    const last = acc[acc.length - 1]
    if (!seg.py && last && !last.py) last.text += seg.text
    else acc.push({ ...seg })
    return acc
  }, [])
}

function collectRuby(l: LStr, out: RubySeg[]): void {
  if (typeof l === 'string') {
    alignRuby(l, [], out)
    return
  }
  const entry = ZH[l.k]
  if (entry === undefined) {
    out.push({ text: l.k })
    return
  }
  if (typeof entry === 'function') {
    alignRuby(translate(l, 'zh'), [], out)
    return
  }
  const syllables = PINYIN[l.k] ? PINYIN[l.k]!.split(/\s+/) : []
  let cursor = 0
  for (const m of entry.matchAll(PLACEHOLDER)) {
    alignRuby(entry.slice(cursor, m.index), syllables, out)
    const v = l.p?.[m[1]!]
    if (v === undefined) out.push({ text: '' })
    else if (typeof v === 'object') collectRuby(v, out)
    else out.push({ text: String(v) })
    cursor = m.index + m[0].length
  }
  alignRuby(entry.slice(cursor), syllables, out)
}

/** 当前语言（运行时的唯一真值，模块级 reactive 源）。settings store 负责持久化与初始化。 */
export const lang = ref<Lang>('zh')

export function setLang(l: Lang): void {
  lang.value = l
}

/** 把 LStr 按指定语言解析成最终显示字符串。 */
export function translate(l: LStr, target: Lang): string {
  if (typeof l === 'string') return l
  const entry = DICTS[target][l.k] ?? DICTS.zh[l.k] ?? l.k
  const params: Record<string, string | number> = {}
  if (l.p) {
    for (const [key, v] of Object.entries(l.p)) {
      params[key] = typeof v === 'object' ? translate(v, target) : v
    }
  }
  if (typeof entry === 'function') return entry(params)
  return entry.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

/** 按当前语言解析 LStr（模板里对题目文本/选项用）。读取 lang.value → 语言切换即时重渲染。 */
export function t(l: LStr): string {
  return translate(l, lang.value)
}

/** 按当前语言解析一个界面词条键（可带参数）。 */
export function ui(key: string, p?: Record<string, LParam>): string {
  return translate({ k: key, p }, lang.value)
}

/** 某语言字典里的全部词条键（测试与语料收集用）。 */
export function dictKeys(target: Lang): string[] {
  return Object.keys(DICTS[target])
}

/** 是否有这个词条（按指定语言，不含中文回退）。 */
export function hasEntry(key: string, target: Lang = lang.value): boolean {
  return key in DICTS[target]
}

/** 知识点标题的词条键（渲染拼音时用它构造 LStr）。 */
export function kpTitleKey(kp: { id: string }): string {
  return `kp.${kp.id}`
}

/** 知识点标题（响应当前语言；没注册过就退回 curriculum 里的中文）。 */
export function kpTitle(kp: { id: string; title: string }): string {
  return kpTitleKey(kp) in ZH ? ui(kpTitleKey(kp)) : kp.title
}

/** 单元标题（响应当前语言）。 */
export function unitTitle(u: { id: string; title: string }): string {
  return `unit.${u.id}` in ZH ? ui(`unit.${u.id}`) : u.title
}
