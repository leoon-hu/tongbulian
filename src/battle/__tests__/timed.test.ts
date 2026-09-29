import { describe, expect, it } from 'vitest'
import { COUNTDOWN_MS } from '@/battle/match'
import {
  BOSS_HP_AFTER,
  GRACE_MS,
  LAST_TEN_MS,
  TOGETHER_MS,
  answer,
  beginPlay,
  bossHp,
  createTimed,
  downsOf,
  formatClock,
  moveFor,
  pause,
  remainingMs,
  resume,
  setInput,
  starsFor,
  teamScore,
  tick,
  timedElapsedMs,
  topScorers,
  totalDowns,
  versusWinner,
  type TimedEvent,
  type TimedMatch,
  type TimedPlayerInit,
  type TimedVariant,
} from '@/battle/timed'

const T0 = 1_000_000
const SOLO: TimedPlayerInit[] = [{ id: 'a', name: '小兔', team: 'red', avatar: 'rabbit' }]
const DUO: TimedPlayerInit[] = [
  { id: 'a', name: '小兔', team: 'red' },
  { id: 'b', name: '小猫', team: 'blue' },
]

function start(players: TimedPlayerInit[], variant: TimedVariant = 'coop', durationMs = 90_000): TimedMatch {
  const m = createTimed({ kpId: 's1-01-count', boss: 'dino', variant, durationMs, players, seeds: { a: 11, b: 22 }, now: T0 - COUNTDOWN_MS })
  return beginPlay(m, T0)
}

/** 让某人连着答：oks 里每一项是对 / 错，时刻从 at 起每题隔 step 毫秒；返回最后的状态与所有事件 */
function run(m: TimedMatch, id: string, oks: boolean[], at = T0 + 1000, step = 3000): { m: TimedMatch; events: TimedEvent[] } {
  const events: TimedEvent[] = []
  let cur = m
  oks.forEach((ok, k) => {
    const p = cur.players.find((x) => x.id === id)!
    const r = answer(cur, id, p.index, ok, at + k * step)
    cur = r.match
    events.push(...r.events)
  })
  return { m: cur, events }
}

describe('限时比赛：开局与血量（M1 / M3）', () => {
  it('血量表按人数与时长缩放，四舍五入、至少 1', () => {
    expect([1, 2, 3, 4, 7].map((lv) => bossHp(lv, 1, 90_000))).toEqual([5, 10, 15, BOSS_HP_AFTER, BOSS_HP_AFTER])
    expect([1, 2, 3, 4].map((lv) => bossHp(lv, 2, 90_000))).toEqual([10, 20, 30, 40])
    expect([1, 2, 3, 4].map((lv) => bossHp(lv, 1, 60_000))).toEqual([3, 7, 10, 13])
    expect([1, 2, 3, 4].map((lv) => bossHp(lv, 1, 120_000))).toEqual([7, 13, 20, 27])
    expect(bossHp(1, 0, 1000)).toBe(1)
  })

  it('一起打只有一条 Boss 链（血量 × 人数），各打各的红蓝各一条', () => {
    const coop = createTimed({ kpId: 'k', boss: 'dino', variant: 'coop', durationMs: 90_000, players: DUO, seeds: { a: 1, b: 2 }, now: 0 })
    expect(coop.bosses).toEqual([{ side: 'shared', level: 1, hp: 10, max: 10, downs: 0, fighters: 2 }])
    const vs = createTimed({ kpId: 'k', boss: 'dino', variant: 'versus', durationMs: 90_000, players: DUO, seeds: { a: 1, b: 2 }, now: 0 })
    expect(vs.bosses.map((b) => [b.side, b.max])).toEqual([
      ['red', 5],
      ['blue', 5],
    ])
    expect(vs.phase).toBe('countdown')
    expect(vs.players.map((p) => p.seed)).toEqual([1, 2])
  })

  it('倒数结束开打：计时从这一刻算', () => {
    const m = start(SOLO)
    expect(m.phase).toBe('playing')
    expect(m.startedAt).toBe(T0)
    expect(m.endsAt).toBe(T0 + 90_000)
    expect(remainingMs(m, T0 + 30_000)).toBe(60_000)
    expect(beginPlay(m, T0 + 5)).toBe(m)
  })
})

describe('限时比赛：得分与连击（M2）', () => {
  it('答对 1 分，连击第 3 题起每题 +1，答错断掉连击、不扣分', () => {
    const { m, events } = run(start(SOLO), 'a', [true, true, true, true, false, true])
    const hits = events.filter((e) => e.type === 'hit')
    expect(hits.map((e) => (e.type === 'hit' ? e.points : 0))).toEqual([1, 1, 2, 2, 1])
    expect(events.filter((e) => e.type === 'miss')).toHaveLength(1)
    const p = m.players[0]!
    expect(p.score).toBe(7)
    expect(p.correct).toBe(5)
    expect(p.index).toBe(6)
    expect(p.streak).toBe(1)
    expect(p.bestStreak).toBe(4)
  })

  it('最后 10 秒每题再 +1，和连击叠起来最多 3 分', () => {
    let m = start(SOLO)
    const late = m.endsAt - LAST_TEN_MS + 1
    const r = run(m, 'a', [true, true, true], late, 1000)
    expect(r.events.filter((e) => e.type === 'hit').map((e) => (e.type === 'hit' ? e.points : 0))).toEqual([2, 2, 3])
    m = r.m
    expect(m.players[0]!.score).toBe(7)
  })

  it('招式看连击到第几题', () => {
    expect([1, 2, 3, 4, 5, 9].map(moveFor)).toEqual(['jab', 'jab', 'hook', 'upper', 'super', 'super'])
  })

  it('题号不对、没开打、时间到了的答案都不算；多设备的宽限里还算', () => {
    const m = start(SOLO)
    expect(answer(m, 'a', 3, true, T0 + 1000).events).toEqual([])
    expect(answer(m, 'zz', 0, true, T0 + 1000).events).toEqual([])
    const cd = createTimed({ kpId: 'k', boss: 'dino', variant: 'coop', durationMs: 90_000, players: SOLO, seeds: {}, now: 0 })
    expect(answer(cd, 'a', 0, true, 10).events).toEqual([])
    expect(answer(m, 'a', 0, true, m.endsAt).events).toEqual([])
    expect(answer(m, 'a', 0, true, m.endsAt + GRACE_MS - 1, GRACE_MS).events.map((e) => e.type)).toEqual(['hit'])
    expect(answer(m, 'a', 0, true, m.endsAt + GRACE_MS, GRACE_MS).events).toEqual([])
  })

  it('答完清掉正在按的内容', () => {
    let m = setInput(start(SOLO), 'a', '12')
    expect(m.players[0]!.input).toBe('12')
    m = answer(m, 'a', 0, true, T0 + 1000).match
    expect(m.players[0]!.input).toBe('')
    expect(setInput(m, 'a', '')).toBe(m)
  })
})

describe('限时比赛：Boss 链（M3）', () => {
  it('打光一只就打倒、下一只更大的上场；多出来的伤害算到下一只身上', () => {
    // 一个人 90 秒：第 1 只 5 血。连对 4 题 = 1 + 1 + 2 + 2 = 6 分 → 打倒第 1 只，多 1 分打在第 2 只（10 血）上
    const { m, events } = run(start(SOLO), 'a', [true, true, true, true])
    expect(events.map((e) => e.type)).toEqual(['hit', 'hit', 'hit', 'hit', 'bossDown', 'bossIn'])
    expect(events.at(-2)).toEqual({ type: 'bossDown', side: 'shared', level: 1 })
    expect(events.at(-1)).toEqual({ type: 'bossIn', side: 'shared', level: 2 })
    expect(m.bosses[0]).toMatchObject({ level: 2, hp: 9, max: 10, downs: 1 })
    expect(totalDowns(m)).toBe(1)
    expect(starsFor(totalDowns(m))).toBe(1)
  })

  it('血很少的时候一拳可以连着打倒几只（60 秒一个人第 1 只只有 3 血）', () => {
    let m = start(SOLO, 'coop', 60_000)
    m = { ...m, bosses: [{ ...m.bosses[0]!, hp: 1 }], players: [{ ...m.players[0]!, streak: 4 }] }
    const r = answer(m, 'a', 0, true, m.endsAt - 1000)
    // 连击第 5 题 + 最后 10 秒 = 3 分：第 1 只剩 1 血被打倒，多出的 2 分打在第 2 只（7 血）上
    expect(r.events.map((e) => e.type)).toEqual(['hit', 'bossDown', 'bossIn'])
    expect(r.match.bosses[0]).toMatchObject({ level: 2, hp: 5, max: 7, downs: 1 })
  })

  it('一起打的两个人打同一只；各打各的只打自己那一边', () => {
    let coop = start(DUO, 'coop')
    coop = run(coop, 'a', [true], T0 + 1000).m
    coop = run(coop, 'b', [true], T0 + 5000).m
    expect(coop.bosses[0]!.hp).toBe(8)

    let vs = start(DUO, 'versus')
    vs = run(vs, 'a', [true, true], T0 + 1000).m
    expect(vs.bosses.find((b) => b.side === 'red')!.hp).toBe(3)
    expect(vs.bosses.find((b) => b.side === 'blue')!.hp).toBe(5)
    expect(downsOf(vs, 'blue')).toBe(0)
  })

  it('星星最多 3 颗', () => {
    expect([0, 1, 2, 3, 4, 9].map(starsFor)).toEqual([0, 1, 2, 3, 3, 3])
  })
})

describe('限时比赛：合力拳（M4）', () => {
  it('一起打时两个人 1.5 秒内先后打中算一次合力拳，不加分', () => {
    let m = start(DUO, 'coop')
    m = answer(m, 'a', 0, true, T0 + 1000).match
    const r = answer(m, 'b', 0, true, T0 + 1000 + TOGETHER_MS)
    const hit = r.events[0]!
    expect(hit).toMatchObject({ type: 'hit', together: true, points: 1 })
    expect(r.match.players.find((p) => p.id === 'b')!.together).toBe(1)
    // 同一个人自己连着打不算；隔太久不算
    const self = answer(r.match, 'b', 1, true, T0 + 1500 + TOGETHER_MS)
    expect(self.events[0]).toMatchObject({ together: false })
    const slow = answer(self.match, 'a', 1, true, T0 + 1500 + TOGETHER_MS * 3)
    expect(slow.events[0]).toMatchObject({ together: false })
  })

  it('各打各的没有合力拳', () => {
    let m = start(DUO, 'versus')
    m = answer(m, 'a', 0, true, T0 + 1000).match
    expect(answer(m, 'b', 0, true, T0 + 1200).events[0]).toMatchObject({ together: false })
  })
})

describe('限时比赛：计时、结束、暂停（M1 / M4）', () => {
  it('进入最后 10 秒发一次 lastTen；到点发 timeUp → finished', () => {
    let m = start(SOLO)
    expect(tick(m, T0 + 50_000).events).toEqual([])
    let r = tick(m, m.endsAt - LAST_TEN_MS)
    expect(r.events).toEqual([{ type: 'lastTen' }])
    m = r.match
    expect(tick(m, m.endsAt - 5000).events).toEqual([])
    r = tick(m, m.endsAt)
    expect(r.events).toEqual([{ type: 'timeUp' }, { type: 'finished', winner: null }])
    expect(r.match.phase).toBe('ended')
    expect(r.match.endedAt).toBe(m.endsAt)
    expect(remainingMs(r.match, m.endsAt + 5)).toBe(0)
    expect(timedElapsedMs(r.match, m.endsAt + 5)).toBe(90_000)
    // 结束后不再动
    expect(tick(r.match, m.endsAt + 9999).events).toEqual([])
  })

  it('时间跳过了最后 10 秒（切后台回来）直接结束，不补发 lastTen', () => {
    const m = start(SOLO)
    expect(tick(m, m.endsAt + 5000).events.map((e) => e.type)).toEqual(['timeUp', 'finished'])
  })

  it('服务器带宽限：到点后宽限里还没结束', () => {
    const m = start(SOLO)
    expect(tick(m, m.endsAt + GRACE_MS - 1, GRACE_MS).match.phase).toBe('playing')
    expect(tick(m, m.endsAt + GRACE_MS, GRACE_MS).match.phase).toBe('ended')
  })

  it('各打各的比两边得分，一样是平局；一起打没有胜负', () => {
    let m = start(DUO, 'versus')
    m = run(m, 'a', [true, true, true], T0 + 1000).m
    m = run(m, 'b', [true, false, true], T0 + 1000).m
    expect([teamScore(m, 'red'), teamScore(m, 'blue')]).toEqual([4, 2])
    expect(versusWinner(m)).toBe('red')
    const end = tick(m, m.endsAt)
    expect(end.events.at(-1)).toEqual({ type: 'finished', winner: 'red' })
    expect(end.match.winner).toBe('red')

    let tie = start(DUO, 'versus')
    tie = run(tie, 'a', [true], T0 + 1000).m
    tie = run(tie, 'b', [true], T0 + 1000).m
    expect(tick(tie, tie.endsAt).match.winner).toBeNull()

    let coop = start(DUO, 'coop')
    coop = run(coop, 'a', [true, true], T0 + 1000).m
    expect(versusWinner(coop)).toBeNull()
  })

  it('本局之星：得分最高的（一样高都算，都是 0 分没有）', () => {
    let m = start(DUO, 'coop')
    expect(topScorers(m)).toEqual([])
    m = run(m, 'a', [true, true], T0 + 1000).m
    expect(topScorers(m)).toEqual(['a'])
    m = run(m, 'b', [true, true], T0 + 1000).m
    expect(topScorers(m)).toEqual(['a', 'b'])
  })

  it('暂停时计时停住、题目不能答；继续后时间到的时刻往后挪', () => {
    let m = start(SOLO)
    m = pause(m, T0 + 30_000)
    expect(m.phase).toBe('paused')
    expect(remainingMs(m, T0 + 99_999)).toBe(60_000)
    expect(answer(m, 'a', 0, true, T0 + 31_000).events).toEqual([])
    expect(tick(m, T0 + 200_000).events).toEqual([])
    m = resume(m, T0 + 100_000)
    expect(m.phase).toBe('playing')
    expect(m.endsAt).toBe(T0 + 160_000)
    expect(remainingMs(m, T0 + 100_000)).toBe(60_000)
    expect(timedElapsedMs(m, T0 + 100_000)).toBe(30_000)
    expect(pause(pause(m, T0 + 101_000), T0 + 102_000).leftMs).toBe(59_000)
  })
})

describe('计时器的显示', () => {
  it('m:ss，向上取整', () => {
    expect([90_000, 89_001, 89_000, 60_000, 9_500, 1, 0, -5].map(formatClock)).toEqual(['1:30', '1:30', '1:29', '1:00', '0:10', '0:01', '0:00', '0:00'])
  })
})
