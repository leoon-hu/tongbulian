// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { loadState } from '@/engine/storage'
import { useProgressStore } from '@/stores/progress'

const STORAGE_KEY = 'tongbulian:v1'

afterEach(() => localStorage.clear())

describe('进度：已完成/未完成', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('默认未完成；markCompleted 后为已完成', () => {
    const progress = useProgressStore()
    expect(progress.isCompleted('s1-08-carry-add')).toBe(false)
    progress.markCompleted('s1-08-carry-add')
    expect(progress.isCompleted('s1-08-carry-add')).toBe(true)
    // 其它知识点不受影响
    expect(progress.isCompleted('s1-01-count')).toBe(false)
  })

  it('markCompleted 只增不减（重复调用幂等）', () => {
    const progress = useProgressStore()
    progress.markCompleted('s1-01-count')
    progress.markCompleted('s1-01-count')
    expect(progress.isCompleted('s1-01-count')).toBe(true)
  })

  it('toggleCompleted 在已完成/未完成间切换（可不做题手动标记）', () => {
    const progress = useProgressStore()
    expect(progress.isCompleted('s1-02-position')).toBe(false)
    progress.toggleCompleted('s1-02-position') // 手动标记完成
    expect(progress.isCompleted('s1-02-position')).toBe(true)
    progress.toggleCompleted('s1-02-position') // 再点取消
    expect(progress.isCompleted('s1-02-position')).toBe(false)
    // 取消后不残留 false 键
    expect('s1-02-position' in progress.completed).toBe(false)
  })

  it('完成状态持久化到 localStorage', async () => {
    useProgressStore().markCompleted('s2-07-patterns')
    await nextTick() // 等待 store 的 watch 落盘
    expect(loadState().progress.completed['s2-07-patterns']).toBe(true)
  })
})

describe('进度：当前这一轮（进度条与对错数都按一轮计）', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('没做过：没有这一轮，进度 0，统计全 0', () => {
    const progress = useProgressStore()
    expect(progress.roundOf('s1-01-count')).toBeUndefined()
    expect(progress.answeredOf('s1-01-count')).toBe(0)
    expect(progress.isRoundFinished('s1-01-count')).toBe(false)
    expect(progress.statsOf('s1-01-count')).toEqual({ total: 0, correct: 0, wrong: 0 })
  })

  it('开始一轮记 seed，每答一题按顺序记对错，进度 = 已答题数，并落盘', async () => {
    const progress = useProgressStore()
    progress.startRound('s1-01-count', 42)
    progress.answer('s1-01-count', true)
    progress.answer('s1-01-count', false)
    progress.answer('s1-01-count', true)
    expect(progress.roundOf('s1-01-count')).toEqual({ seed: 42, results: [true, false, true] })
    expect(progress.resultsOf('s1-01-count')).toEqual([true, false, true])
    expect(progress.answeredOf('s1-01-count')).toBe(3)
    expect(progress.statsOf('s1-01-count')).toEqual({ total: 3, correct: 2, wrong: 1 })
    expect(progress.isRoundFinished('s1-01-count')).toBe(false)
    // 其它知识点不受影响
    expect(progress.statsOf('s1-01-compare').total).toBe(0)
    await nextTick()
    expect(loadState().progress.rounds['s1-01-count']).toEqual({ seed: 42, results: [true, false, true] })
  })

  it('做满 8 题：这一轮算做完、知识点已完成，记录留给地图看；再开新一轮就重新计数', () => {
    const progress = useProgressStore()
    progress.startRound('s1-01-count', 7)
    for (let i = 0; i < 8; i++) progress.answer('s1-01-count', i % 2 === 0)
    progress.finishRound('s1-01-count')
    expect(progress.isRoundFinished('s1-01-count')).toBe(true)
    expect(progress.isCompleted('s1-01-count')).toBe(true)
    expect(progress.statsOf('s1-01-count')).toEqual({ total: 8, correct: 4, wrong: 4 })

    progress.startRound('s1-01-count', 8)
    expect(progress.statsOf('s1-01-count')).toEqual({ total: 0, correct: 0, wrong: 0 })
    expect(progress.isCompleted('s1-01-count')).toBe(true) // 已完成不因为新开一轮而丢
  })

  it('没开始的一轮 answer 不生效、做满后不再记；家长取消「已完成」时做满的一轮清掉、做到一半的保留', () => {
    const progress = useProgressStore()
    progress.answer('s1-01-count', true)
    expect(progress.roundOf('s1-01-count')).toBeUndefined()

    progress.startRound('s1-01-count', 1)
    for (let i = 0; i < 9; i++) progress.answer('s1-01-count', true) // 第 9 次不记
    expect(progress.answeredOf('s1-01-count')).toBe(8)
    progress.finishRound('s1-01-count')
    progress.toggleCompleted('s1-01-count') // 取消已完成 = 重来
    expect(progress.isCompleted('s1-01-count')).toBe(false)
    expect(progress.roundOf('s1-01-count')).toBeUndefined()

    progress.startRound('s1-02-position', 2)
    progress.answer('s1-02-position', false)
    progress.toggleCompleted('s1-02-position') // 手动标完成
    progress.toggleCompleted('s1-02-position') // 再取消：做到一半的这一轮还在
    expect(progress.roundOf('s1-02-position')).toEqual({ seed: 2, results: [false] })
  })
})

describe('存储：健壮性', () => {
  afterEach(() => localStorage.clear())

  it('本地数据损坏时回退到默认状态，应用仍能启动', () => {
    localStorage.setItem(STORAGE_KEY, '{not json')
    const state = loadState()
    expect(state.progress.completed).toEqual({})
    expect(state.settings.lang).toBe('zh')
  })

  it('缺字段的旧数据会补齐默认值并盖上当前版本号', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: { completed: { 's1-01-count': true } } }))
    const state = loadState()
    expect(state.progress.completed['s1-01-count']).toBe(true)
    expect(state.settings.soundEnabled).toBe(true)
    expect(typeof state.version).toBe('number')
  })

  it('子对象缺字段或类型不对时逐字段回退默认，进度 store 仍能正常工作', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress: {}, settings: { lang: 'fr', soundEnabled: 'yes' } }))
    const state = loadState()
    expect(state.progress.completed).toEqual({})
    expect(state.settings).toEqual({ lang: 'zh', soundEnabled: true })

    setActivePinia(createPinia())
    const progress = useProgressStore()
    expect(progress.isCompleted('s1-01-count')).toBe(false)
    progress.markCompleted('s1-01-count')
    expect(progress.isCompleted('s1-01-count')).toBe(true)
  })

  it('v1 的老数据（没有 rounds）升到当前版本，这一轮的表为空', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, progress: { completed: { 's1-01-count': true } } }))
    const state = loadState()
    expect(state.version).toBe(2)
    expect(state.progress.completed).toEqual({ 's1-01-count': true })
    expect(state.progress.rounds).toEqual({})
  })

  it('rounds 里坏掉的条目（超过一轮题数、非布尔、坏 seed、非对象）会被清掉', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        progress: {
          completed: {},
          rounds: {
            ok: { seed: 7, results: [true, false, true] },
            fresh: { seed: 3, results: [] },
            full: { seed: 1, results: [true, true, true, true, false, false, false, false] },
            over: { seed: 1, results: [true, true, true, true, true, true, true, true, true] },
            notBool: { seed: 1, results: [1, 0] },
            notArray: { seed: 1, results: 'tf' },
            badSeed: { seed: 'x', results: [true] },
            str: 'x',
          },
        },
      }),
    )
    expect(loadState().progress.rounds).toEqual({
      ok: { seed: 7, results: [true, false, true] },
      fresh: { seed: 3, results: [] },
      full: { seed: 1, results: [true, true, true, true, false, false, false, false] },
    })
  })

  it('根节点不是对象、completed 里混入非 true 的值都会被清掉', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]))
    expect(loadState().progress.completed).toEqual({})

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ progress: { completed: { a: true, b: false, c: 'yes', d: 1 } } }),
    )
    expect(loadState().progress.completed).toEqual({ a: true })
  })
})
