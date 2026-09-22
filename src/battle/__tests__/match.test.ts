import { describe, expect, it } from 'vitest'
import {
  COUNTDOWN_MS,
  luckyIndexFor,
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
    // 连对 3 / 5 题弹提示，到 7 分弹「还差一分」；0 : 0 平局起步不算「反超」
    const extra: Record<number, string[]> = { 3: ['streak'], 4: ['half'], 5: ['streak'], 7: ['nearWin'] }
    for (let i = 1; i <= 7; i++) {
      r = answer(m, 'a', i, true, 'x', 2000 + i)
      m = r.state
      expect(m.phase).toBe('playing')
      // 幸运题（B65）那一题会多一条 lucky，这里不看它
      expect(r.events.map((e) => e.type).filter((t) => t !== 'lucky')).toEqual(['answered', 'point', ...(extra[i] ?? [])])
      expect(findPlayer(m, 'a')!.streak).toBe(i)
    }
    expect(m.score.red).toBe(7)
    expect(m.lastPoint).toBe('red')
    expect(r.events).toContainEqual({ type: 'nearWin', team: 'red' })
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

  it('反超：从落后变成领先才弹，追平不弹；答错连对归零', () => {
    let m = playing()
    m = answer(m, 'b', 0, true, 'x', 1).state // 蓝 1 : 0
    m = answer(m, 'b', 1, true, 'x', 1).state // 蓝 2 : 0
    let r = answer(m, 'a', 0, true, 'x', 1) // 红 1 : 2，还落后
    expect(r.events.map((e) => e.type)).toEqual(['answered', 'point'])
    r = answer(r.state, 'a', 1, true, 'x', 1) // 2 : 2 追平：不弹
    expect(r.events.map((e) => e.type)).toEqual(['answered', 'point'])
    r = answer(r.state, 'a', 2, true, 'x', 1) // 红 3 : 2 反超（同时连对 3）
    expect(r.events.map((e) => e.type)).toEqual(['answered', 'point', 'streak', 'lead'])
    expect(r.events).toContainEqual({ type: 'lead', team: 'red' })
    r = answer(r.state, 'a', 3, false, 'x', 1)
    expect(findPlayer(r.state, 'a')!.streak).toBe(0)
    expect(r.events).toHaveLength(1)
    // 结束那一题只发 finished，不再发连对 / 反超
    let e = r.state
    for (let i = 4; i < 9; i++) e = answer(e, 'a', i, true, 'x', 1).state
    expect(e.score.red).toBe(8)
    expect(e.winner).toBe('red')
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

describe('决胜题（B62）', () => {
  it('两队都到 7 分时发一次 deuce（后到 7 的那一分），之后再得分不再发；先到 7 的只有 nearWin', () => {
    let m = startMatch(createMatch({ kpId: 's1-05-carry-add', skin: 'race', players: [{ id: 'a', name: 'A', team: 'red' }, { id: 'b', name: 'B', team: 'blue' }] }), { a: 1, b: 2 }, 0)
    m = beginPlay(m, 100)
    const types: string[][] = []
    const score = (id: string, n: number): void => {
      for (let i = 0; i < n; i++) {
        const p = m.players.find((x) => x.id === id)!
        const res = answer(m, id, p.index, true, '1', 200)
        m = res.state
        types.push(res.events.map((e) => e.type))
      }
    }
    score('a', 7)
    expect(types.at(-1)).toEqual(['answered', 'point', 'nearWin'])
    expect(types.flat()).not.toContain('deuce')
    score('b', 7)
    expect(types.at(-1)).toEqual(['answered', 'point', 'nearWin', 'deuce'])
    expect(types.flat().filter((t) => t === 'deuce')).toHaveLength(1)
    score('a', 1)
    expect(types.at(-1)).toEqual(['answered', 'point', 'finished'])
    expect(m.winner).toBe('red')
  })
})

describe('幸运题（B65）', () => {
  it('每人由 seed 定一题（0 起 1…6），确定的；答对那一题发 lucky（分数照旧 +1），答错 / 别的题不发', () => {
    for (let seed = 0; seed < 200; seed++) {
      const i = luckyIndexFor(seed)
      expect(i).toBeGreaterThanOrEqual(1)
      expect(i).toBeLessThanOrEqual(6)
      expect(luckyIndexFor(seed)).toBe(i)
    }
    expect(new Set(Array.from({ length: 60 }, (_, s) => luckyIndexFor(s))).size).toBe(6)
    let m = startMatch(createMatch({ kpId: 's1-05-carry-add', skin: 'race', players: [{ id: 'a', name: 'A', team: 'red' }, { id: 'b', name: 'B', team: 'blue' }] }), { a: 5, b: 9 }, 0)
    m = beginPlay(m, 100)
    const lucky = luckyIndexFor(5)
    const seen: string[][] = []
    for (let i = 0; i < 7; i++) {
      const p = m.players.find((x) => x.id === 'a')!
      const res = answer(m, 'a', p.index, i !== lucky, '1', 200)
      m = res.state
      seen.push(res.events.map((e) => e.type))
    }
    // 幸运题那一题故意答错：不发 lucky；别的题答对也不发
    expect(seen.flat()).not.toContain('lucky')
    m = startMatch(m, { a: 5, b: 9 }, 300)
    m = beginPlay(m, 400)
    for (let i = 0; i <= lucky; i++) {
      const p = m.players.find((x) => x.id === 'a')!
      const res = answer(m, 'a', p.index, true, '1', 500)
      m = res.state
      if (i === lucky) {
        expect(res.events.map((e) => e.type)).toContain('lucky')
        expect(res.events.find((e) => e.type === 'lucky')).toEqual({ type: 'lucky', team: 'red', playerId: 'a' })
      } else expect(res.events.map((e) => e.type)).not.toContain('lucky')
    }
    expect(m.score.red).toBe(lucky + 1)
  })
})
