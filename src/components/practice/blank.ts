import type { Question } from '@/types/models'

/**
 * 练习页「答案填在题目里」（U5）：数字键盘题的题干里有要填的空——算式里的「?」或竖式横线下面那一行——
 * 按的数字就直接显示在空里，数字键盘不再单独画显示框（手机上省出约 70px，题目和键盘一屏放得下）。
 * 纯文字的应用题没有空可填，照旧用显示框。
 */
export function hasBlank(q: Question): boolean {
  return q.input === 'numpad' && q.stem.some((p) => (p.kind === 'expr' && p.expr.includes('?')) || p.kind === 'vertical')
}

/** 空里显示什么：value 是数字串（'' = 还没按），done = 已经判完（答对的数 / 答错后的正确答案，绿色） */
export interface BlankFill {
  value: string
  done: boolean
}
