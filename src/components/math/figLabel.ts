// 图里括号上写的字（FracArea、FracBars 共用）：数、百分数、「?」原样写；分数「3/4」画成上下两层，
// 带分数「2 1/5」（整数和分数之间是细空格 U+2009，同 engine/fraction 的 mixed）画成整数 + 两层的分数。
// 图里的字不注音、不朗读，题目要问的都写在题干文字里。

export type FigLabel = { text: string } | { n: string; d: string; w?: string }

export function parseFigLabel(label: string): FigLabel {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(label.trim())
  if (!m) return { text: label }
  return m[1] === undefined ? { n: m[2]!, d: m[3]! } : { n: m[2]!, d: m[3]!, w: m[1] }
}

export const isFracLabel = (l: FigLabel): l is { n: string; d: string; w?: string } => !('text' in l)

/** 大约多宽（15px 的粗体字：数字、字母、符号约 9 个单位，汉字 15 个单位），给括号旁边留地方用 */
export function labelWidth(l: FigLabel): number {
  if (!isFracLabel(l)) return [...l.text].reduce((s, ch) => s + (/[㐀-鿿]/.test(ch) ? 15 : 9), 0)
  return Math.max(l.n.length, l.d.length) * 9 + 6 + (l.w ? l.w.length * 10 + 2 : 0)
}
