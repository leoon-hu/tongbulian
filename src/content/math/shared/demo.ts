import type { DemoSpec } from '@/types/models'

export interface TenFrameProps {
  filled: number
  extra: number
  mode: 'add' | 'sub'
  remove: number
  swapped: boolean
}

/**
 * 把答错讲解配置映射成 TenFrame 的 props（凑十 / 破十共用一个教具）。
 * 凑十默认格里放第一个加数、拆第二个去凑（9 + 4、8 + 9 拆 9，课本一上 p89 / p100）；
 * 「5、4、3、2 加几」第一个加数小（5 + 8）：课本 p93 是拆小数凑大数——格里放 8、拆 5，最后一句仍说「所以 5 + 8 = 13」。
 */
export function tenFrameProps(demo: DemoSpec): TenFrameProps {
  if (demo.kind === 'make-ten') {
    if (demo.a < demo.b && demo.a <= 5) return { filled: demo.b, extra: demo.a, mode: 'add', remove: 0, swapped: true }
    return { filled: demo.a, extra: demo.b, mode: 'add', remove: 0, swapped: false }
  }
  // break-ten：满十格 + 个位余数，从格内拿走减数
  return { filled: 10, extra: demo.minuend - 10, mode: 'sub', remove: demo.subtrahend, swapped: false }
}
