// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import type { Player } from '@/battle/protocol'
import { AI_ID } from '@/battle/ai'
import type { Question } from '@/types/models'
import { FEEDBACK_CALLOUT_MS, FEEDBACK_RIGHT_MS, FEEDBACK_WRONG_MS, useBattleStore } from '../battle'

const KP = 's1-05-carry-add'

function correctOf(q: Question): number | string {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('对战偏好（B50）', () => {
  it('昵称、皮肤、机器人快慢记在 tongbulian:battle，重开还在；坏数据回默认', () => {
    const s = useBattleStore()
    expect(s.prefs.names.me).toBe('')
    s.setName('me', '  🐰 小兔 ')
    s.setName('right', '小虎')
    s.prefs.skin = 'tug'
    s.prefs.aiLevel = 'fast'
    const raw = JSON.parse(localStorage.getItem('tongbulian:battle')!)
    expect(raw.names).toEqual({ me: '🐰 小兔', left: '', right: '小虎' })
    expect(raw.skin).toBe('tug')
    const clientId = raw.clientId
    setActivePinia(createPinia())
    const again = useBattleStore()
    expect(again.prefs.names.me).toBe('🐰 小兔')
    expect(again.prefs.aiLevel).toBe('fast')
    expect(again.prefs.clientId).toBe(clientId)

    localStorage.setItem('tongbulian:battle', '{"skin":"nope","aiLevel":"turbo","names":5,"difficulty":9')
    setActivePinia(createPinia())
    const broken = useBattleStore()
    expect(broken.prefs.skin).toBe('random')
    expect(broken.prefs.aiLevel).toBe('mid')
    expect(broken.prefs.difficulty).toBe(1)
    localStorage.setItem('tongbulian:battle', JSON.stringify({ skin: 'nope', aiLevel: 'turbo', names: 5, difficulty: 9 }))
    setActivePinia(createPinia())
    expect(useBattleStore().prefs.skin).toBe('random')
  })
})

describe('两人同屏（B12）', () => {
  it('倒数 → 开打 → 左边连对 8 题 → 红队赢；反馈窗口按对错停留后清掉', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.setName('right', '小虎')
    s.startLocal({ kpId: KP, mode: 'duo', skin: 'race', seeds: { left: 1, right: 2 } })
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.skin).toBe('race')
    expect(s.state!.players.map((p) => [p.id, p.name, p.team])).toEqual([
      ['left', '小兔', 'red'],
      ['right', '小虎', 'blue'],
    ])
    expect(s.operable).toEqual(['left', 'right'])
    s.beginPlay()
    expect(s.state!.phase).toBe('playing')

    // 先答错一题：不加分，反馈窗口 1.2 秒
    const left = (): Player => s.state!.players[0]!
    const q0 = s.questionOf(left())
    s.submit('left', q0.answer.kind === 'number' ? -1 : 'zzz')
    expect(s.state!.score.red).toBe(0)
    expect(s.pending.left).toMatchObject({ correct: false })
    // 窗口期内再提交被忽略
    s.submit('left', correctOf(s.questionOf(left())))
    expect(left().index).toBe(1)
    vi.advanceTimersByTime(FEEDBACK_WRONG_MS - 1)
    expect(s.pending.left).toBeDefined()
    vi.advanceTimersByTime(2)
    expect(s.pending.left).toBeUndefined()

    for (let i = 0; i < 8; i++) {
      s.submit('left', correctOf(s.questionOf(left())))
      expect(s.pending.left).toMatchObject({ correct: true })
      // 连对 3 / 5 题与到 7 分会弹提示（B5a），弹的时候反馈窗口延长到 1.4 秒
      const score = i + 1
      if (score === 3 || score === 5) expect(s.callout).toMatchObject({ key: 'battle.streak', team: 'red', p: { n: score } })
      else if (score === 7) expect(s.callout).toMatchObject({ key: 'battle.nearWin', team: 'red' })
      vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
      if (s.pending.left) vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS - FEEDBACK_RIGHT_MS)
      expect(s.pending.left).toBeUndefined()
    }
    expect(s.state!.phase).toBe('ended')
    expect(s.state!.winner).toBe('red')
    expect(s.state!.score).toEqual({ red: 8, blue: 0 })
    expect(left()).toMatchObject({ index: 9, correct: 8 })
    expect(s.lastEvent).toEqual({ type: 'finished', winner: 'red' })
    // 结束后提交无效
    s.submit('right', correctOf(s.questionOf(s.state!.players[1]!)))
    expect(s.state!.score.blue).toBe(0)

    s.rematch({ left: 5, right: 6 })
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.score).toEqual({ red: 0, blue: 0 })
    expect(s.state!.players[0]!.seed).toBe(5)
    s.leave()
    expect(s.state).toBeNull()
  })
})

describe('打机器人（B11）', () => {
  it('机器人自己答题：一个一个按出来，最后有一方到 8 分', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'tower', aiLevel: 'fast', aiSeed: 7, seeds: { left: 1, [AI_ID]: 2 } })
    const ai = (): Player => s.state!.players.find((p) => p.id === AI_ID)!
    expect(ai().kind).toBe('ai')
    expect(s.operable).toEqual(['left'])
    s.beginPlay()
    // 观察到它在「按」：输入框里出现过内容
    let sawInput = false
    for (let t = 0; t < 120_000 && s.state!.phase === 'playing'; t += 100) {
      vi.advanceTimersByTime(100)
      if (ai().input !== '') sawInput = true
    }
    expect(sawInput).toBe(true)
    expect(s.state!.phase).toBe('ended')
    expect(s.state!.winner).toBe('blue')
    expect(ai().correct).toBe(8)
    expect(ai().index).toBeGreaterThanOrEqual(8)
  })
})
