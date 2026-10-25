// 英语各年级的知识点 / 单元名（英文名 + 中文标题里汉字的拼音）：随目录一起加载——地图、页头、对战页、浏览器标题在内容包
// 按需加载之前就要用（engine/catalog.ts 的 loadCourse）。中文标题的单一事实源是各年级的 curriculum.ts；单元名本来就是英文（课本的单元名）。
import type { KnowledgePoint, Unit } from '@/types/models'
import { registerPinyin, registerTitles } from '@/engine/i18n'

/** 知识点英文名：按 id 的末段定（e<年级>s<册>-<位置两位>-<a | letters | spell | b | revision | recycle>）；n 是课本的单元号（不是目录位置） */
const EN_BY_KIND: Record<string, (n: number, unit: Unit) => string> = {
  a: (n) => `Unit ${n} Part A: Talk and words`,
  letters: (n) => `Unit ${n} Letters and sounds`,
  spell: (n) => `Unit ${n} Let's spell`,
  b: (n) => `Unit ${n} Part B: Talk and words`,
  revision: () => 'Revision',
  // 旧版课本（五下）的复习单元：Recycle 1、Recycle 2
  recycle: (_n, unit) => unit.title,
}
/** 中文标题里汉字的拼音（Unit、A、B、Recycle 这些英文不占位） */
const PY_BY_KIND: Record<string, string> = {
  a: 'duì huà hé dān cí',
  letters: 'zì mǔ hé fā yīn',
  spell: 'pīn dú',
  b: 'duì huà hé dān cí',
  revision: 'fù xí',
  recycle: 'fù xí',
}

/** 注册一个年级的知识点 / 单元名与标题拼音，返回标题拼音表（测试查对齐） */
export function registerEnglishTitles(kps: KnowledgePoint[], units: Unit[]): Record<string, string> {
  const en: Record<string, string> = {}
  const py: Record<string, string> = {}
  for (const kp of kps) {
    const m = /^e\ds\d-\d\d-(\w+)$/.exec(kp.id)
    const unit = units.find((u) => u.id === kp.unitId)
    if (!m || !EN_BY_KIND[m[1]!] || !unit) throw new Error(`英语知识点 id 不对：${kp.id}`)
    en[kp.id] = EN_BY_KIND[m[1]!]!(unit.order, unit)
    py[`kp.${kp.id}`] = PY_BY_KIND[m[1]!]!
  }
  registerTitles(
    { zh: Object.fromEntries(kps.map((kp) => [kp.id, kp.title])), en },
    { zh: Object.fromEntries(units.map((u) => [u.id, u.title])), en: Object.fromEntries(units.map((u) => [u.id, u.title])) },
  )
  registerPinyin(py)
  return py
}
