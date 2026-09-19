import { describe, expect, it } from 'vitest'
import {
  COUNTDOWN_MS,
  answer,
  beginPlay,
  canStart,
  createMatch,
  elapsedMs,
  findPlayer,
  formatElapsed,
  setInput,
  startMatch,
  teamPlayers,
} from '../match'

const players = [
  { id: 'a', name: 'A', team: 'red' as const },
  { id: 'b', name: 'B', team: 'blue' as const, kind: 'ai' as const },
]

function playing(now = 1000) {
  return beginPlay(startMatch(createMatch({ kpId: 'k', skin: 'race', players }), { a: 11, b: 22 }, now), now + COUNTDOWN_MS)
}

describe('比赛状态机（B1–B9）', () => {
  it('创建 → 倒数 → 开打：目标分 8、seed 分配、计数清零', () => {
    const m = createMatch({ kpId: 'k', skin: 'race', players })
    expect(m.phase).toBe('lobby')
    expect(m.target).toBe(8)
    expect(canStart(m)).toBe(true)
    expect(canStart(createMatch({ kpId: 'k', skin: 'race', players: [players[0]!] }))).toBe(false)
    const cd = startMatch(m, { a: 11, b: 22 }, 1000)
    expect(cd.phase).toBe('countdown')
    expect(cd.startedAt).toBe(1000 + COUNTDOWN_MS)
    expect(findPlayer(cd, 'a')!.seed).toBe(11)
    expect(findPlayer(cd, 'b')!.kind).toBe('ai')
    const p = beginPlay(cd, 5000)
    expect(p.phase).toBe('playing')
    expect(p.startedAt).toBe(5000)
    // 不在倒数阶段 beginPlay 不改状态
    expect(beginPlay(p, 6000)).toBe(p)
  })

  it('答对加一分、答错不加不扣；到 8 分结束并判胜方', () => {
    let m = playing()
    let r = answer(m, 'a', 0, false, '3', 2000)
    expect(r.state.score).toEqual({ red: 0, blue: 0 })
    expect(r.state.players[0]).toMatchObject({ index: 1, correct: 0 })
    expect(r.events).toEqual([{ type: 'answered', playerId: 'a', index: 0, correct: false, given: '3' }])
    m = r.state
    for (let i = 1; i <= 7; i++) {
      r = answer(m, 'a', i, true, 'x', 2000 + i)
      m = r.state
      expect(m.phase).toBe('playing')
      expect(r.events.map((e) => e.type)).toEqual(['answered', 'point'])
    }
    expect(m.score.red).toBe(7)
    expect(m.lastPoint).toBe('red')
    r = answer(m, 'a', 8, true, 'x', 9999)
    expect(r.state.phase).toBe('ended')
    expect(r.state.winner).toBe('red')
    expect(r.state.endedAt).toBe(9999)
    expect(r.state.score.red).toBe(8)
    expect(r.events.map((e) => e.type)).toEqual(['answered', 'point', 'finished'])
    // 结束后再提交被忽略
    expect(answer(r.state, 'b', 0, true, 'x', 10000).state).toBe(r.state)
  })

  it('乱序 / 重复 / 未开始 / 不存在的人：提交被忽略', () => {
    const lobby = createMatch({ kpId: 'k', skin: 'race', players })
    expect(answer(lobby, 'a', 0, true, 'x', 1).state).toBe(lobby)
    const m = playing()
    expect(answer(m, 'a', 1, true, 'x', 1).state).toBe(m)
    expect(answer(m, 'zzz', 0, true, 'x', 1).state).toBe(m)
    const once = answer(m, 'a', 0, true, 'x', 1).state
    expect(answer(once, 'a', 0, true, 'x', 1).state).toBe(once)
  })

  it('各答各的：两队的分数互不影响，先到 8 的赢', () => {
    let m = playing()
    for (let i = 0; i < 7; i++) {
      m = answer(m, 'a', i, true, 'x', 1).state
      m = answer(m, 'b', i, true, 'x', 1).state
    }
    expect(m.score).toEqual({ red: 7, blue: 7 })
    m = answer(m, 'b', 7, true, 'x', 1).state
    expect(m.winner).toBe('blue')
    expect(teamPlayers(m, 'blue').map((p) => p.id)).toEqual(['b'])
  })

  it('再来一局：比分、计数、胜负清零，seed 换新', () => {
    let m = playing()
    for (let i = 0; i < 8; i++) m = answer(m, 'a', i, true, 'x', 1).state
    const again = startMatch(m, { a: 33, b: 44 }, 5000)
    expect(again.phase).toBe('countdown')
    expect(again.score).toEqual({ red: 0, blue: 0 })
    expect(again.winner).toBeNull()
    expect(again.lastPoint).toBeNull()
    expect(again.players.map((p) => [p.seed, p.index, p.correct])).toEqual([
      [33, 0, 0],
      [44, 0, 0],
    ])
  })

  it('setInput 只改那个人，值没变时返回原对象', () => {
    const m = playing()
    const n = setInput(m, 'b', '12')
    expect(findPlayer(n, 'b')!.input).toBe('12')
    expect(findPlayer(n, 'a')!.input).toBe('')
    expect(setInput(n, 'b', '12')).toBe(n)
    // 提交后输入清空
    expect(findPlayer(answer(n, 'b', 0, true, '12', 1).state, 'b')!.input).toBe('')
  })

  it('用时：比赛中按当前时刻算，结束后固定；mm:ss', () => {
    const m = playing(1000)
    expect(elapsedMs(m, 1000 + COUNTDOWN_MS + 65000)).toBe(65000)
    let e = m
    for (let i = 0; i < 8; i++) e = answer(e, 'a', i, true, 'x', 1000 + COUNTDOWN_MS + 125000).state
    expect(elapsedMs(e, 999999)).toBe(125000)
    expect(formatElapsed(125000)).toBe('02:05')
    expect(formatElapsed(0)).toBe('00:00')
    expect(elapsedMs(createMatch({ kpId: 'k', skin: 'race', players }), 5)).toBe(0)
  })
})
