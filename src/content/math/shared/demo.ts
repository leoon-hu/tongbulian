import type { DemoSpec } from '@/types/models'

export interface TenFrameProps {
  filled: number
  extra: number
  mode: 'add' | 'sub'
  remove: number
}

/** 把答错讲解配置映射成 TenFrame 的 props（凑十 / 破十共用一个教具）。 */
export function tenFrameProps(demo: DemoSpec): TenFrameProps {
  if (demo.kind === 'make-ten') {
    return { filled: demo.a, extra: demo.b, mode: 'add', remove: 0 }
  }
  // break-ten：满十格 + 个位余数，从格内拿走减数
  return { filled: 10, extra: demo.minuend - 10, mode: 'sub', remove: demo.subtrahend }
}
