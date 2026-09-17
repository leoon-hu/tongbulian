/** 可注种子的随机数（mulberry32），保证单元测试可复现 */
export interface RNG {
  /** [0, 1) */
  next(): number
  /** [min, max] 闭区间整数 */
  int(min: number, max: number): number
  pick<T>(arr: readonly T[]): T
  shuffle<T>(arr: readonly T[]): T[]
  /** 以概率 p 返回 true */
  chance(p: number): boolean
}

export function createRng(seed: number = Math.floor(Math.random() * 2 ** 31)): RNG {
  let state = seed >>> 0
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1))
    },
    pick(arr) {
      if (arr.length === 0) throw new Error('pick from empty array')
      return arr[Math.floor(next() * arr.length)]!
    },
    shuffle(arr) {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
      }
      return copy
    },
    chance(p) {
      return next() < p
    },
  }
}
