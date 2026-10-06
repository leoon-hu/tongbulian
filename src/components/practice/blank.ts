import type { Question } from '@/types/models'

/**
 * 练习页「答案填在题目里」（U5）：数字键盘题的题干里有要填的空——算式里的「?」或竖式横线下面那一行——
 * 按的数字就直接显示在空里，数字键盘不再单独画显示框（手机上省出约 70px，题目和键盘一屏放得下）。
 * 纯文字的应用题没有空可填，照旧用显示框。
 */
export function hasBlank(q: Question): boolean {
  return (
    q.input === 'numpad' &&
    q.stem.some(
      (p) =>
        (p.kind === 'expr' && p.expr.includes('?')) ||
        p.kind === 'vertical' ||
        // 除法竖式里「?」的那一格（商那一行 / 最后一行的余数）
        (p.kind === 'long-division' && [p.quotient, ...(p.rows ?? [])].some((r) => r?.text === '?')) ||
        // 统计表里要填的那一格（null，三下「数据的收集与整理」）
        (p.kind === 'stat-table' && p.rows.some((r) => r.includes(null))) ||
        // 四年级数学（各行写成「(p.kind === '…' && …) ||」插在自己的注释后面）
        // 四年级数学 A
        // 大数卡右边的「= ?万」「≈ ?亿」（改写、求近似数）
        (p.kind === 'big-num' && p.rhs === '?') ||
        // 四年级数学 B
        // 四年级数学 C
        // 乘数是两位数的竖式：没有 work（写好的竖式）的，按的数填在积那一行
        (p.kind === 'mul-vertical' && !p.work) ||
        // 四年级数学 D
        // 四年级数学下册 A
        // 树状图（「括号」练习三 2）里要填的得数框
        (p.kind === 'calc-tree' && p.steps.some((s) => s.v === '?')) ||
        // 四年级数学下册 B
        // 四年级数学下册 C
        // 四年级数学下册 D
        // 四年级数学下册 E
        false,
    )
  )
}

/** 空里显示什么：value 是数字串（'' = 还没按），done = 已经判完（答对的数 / 答错后的正确答案，绿色） */
export interface BlankFill {
  value: string
  done: boolean
}

/**
 * 语文的选择题里也有「空」：课文句子挖掉的词（verse 的 blank）、大字算式里的「？」（日＋月＝？）——
 * 答完（答对或答错）把正确答案填进去，孩子看到完整的句子 / 字（需求 Y2）。统计表要填的那一格（选择题）同样答完填上。
 */
export function hasChoiceBlank(q: Question): boolean {
  return (
    q.input === 'choice' &&
    q.stem.some((p) => (p.kind === 'verse' && !!p.blank) || (p.kind === 'hanzi' && /[？?]/.test(p.text)) || (p.kind === 'stat-table' && p.rows.some((r) => r.includes(null))))
  )
}
