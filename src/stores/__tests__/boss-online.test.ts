// @vitest-environment happy-dom
// 打怪兽的多设备（需求 M13，阶段 3）：状态来自房间快照里的 timed，答案发给服务器，比分与事件等服务器回来；
// 头像条 / 台上台下（M9）、能量拳的声音时刻、输入节流、没有暂停。快照用 battle/timed 的真状态机造（服务器跑的就是它）。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import type { Question } from '@/types/models'
import type { ClientMsg, RoomSnapshot } from '@/battle/protocol'
import { playSfx } from '@/battle/sfx'
import { COUNTDOWN_MS } from '@/battle/match'
import { answer, beginPlay, createTimed, GRACE_MS, tick, type TimedMatch, type TimedPlayerInit } from '@/battle/timed'
import { ENERGY_AT, HIT_AT } from '@/battle/game/boss-contract'
import { STAGE_MIN_MS } from '@/battle/boss/lineup'
import { ANSWER_WAIT_MS } from '../battle'
import { BOSS_FEEDBACK_RIGHT_MS, INPUT_SEND_MS, LINEUP_AFTER_MS, useBossStore } from '../boss'

vi.mock('@/battle/sfx', async (orig) => ({ ...(await orig<typeof import('@/battle/sfx')>()), playSfx: vi.fn() }))

const KP = 's1-05-carry-add'
const T0 = 1_700_000_000_000

function correctOf(q: Question): number | string {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}

const P = (id: string, team: 'red' | 'blue'): TimedPlayerInit => ({ id, name: id, team, avatar: 'rabbit' })

function snap(timed: TimedMatch | null): RoomSnapshot {
  return {
    code: 'ABC234',
    format: 'boss',
    boss: { variant: 'coop', durationS: 90, boss: 'dino' },
    kpId: KP,
    skin: 'race',
    hostId: 'host',
    locked: false,
    createdAt: 0,
    members: [],
    match: null,
    timed,
    passcodes: { red: '111111', blue: '222222', watch: '333333' },
  }
}

function setup(players: TimedPlayerInit[] = [P('me', 'red'), P('you', 'blue')]) {
  const sent: ClientMsg[] = []
  const s = useBossStore()
  s.startOnline({ send: (m) => sent.push(m) })
  let m = createTimed({ kpId: KP, boss: 'dino', variant: 'coop', durationMs: 90_000, players, seeds: Object.fromEntries(players.map((p, i) => [p.id, i + 1])), now: T0 - COUNTDOWN_MS })
  s.syncOnline(snap(m), 'me', T0 - COUNTDOWN_MS)
  s.onRemoteEvent({ type: 'countdown' })
  m = beginPlay(m, T0)
  vi.setSystemTime(T0)
  s.onRemoteEvent({ type: 'go' })
  s.syncOnline(snap(m), 'me', T0)
  const server = {
    get m() {
      return m
    },
    /** 服务器收到一个人的答案：判进状态机、事件先到、快照后到 */
    answer(id: string, correct = true) {
      const p = m.players.find((x) => x.id === id)!
      const res = answer(m, id, p.index, correct, Date.now(), GRACE_MS)
      m = res.match
      for (const e of res.events) s.onRemoteEvent(e)
      s.syncOnline(snap(m), 'me', Date.now())
    },
    set(next: TimedMatch) {
      m = next
      s.syncOnline(snap(m), 'me', Date.now())
    },
  }
  return { s, sent, server }
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.setSystemTime(T0 - COUNTDOWN_MS)
  vi.mocked(playSfx).mockClear()
})
afterEach(() => {
  useBossStore().leave()
  vi.useRealTimers()
})

describe('打怪兽多设备：快照与事件（M13）', () => {
  it('快照里的 timed 就是这一局；我是选手就只有我能按；倒数 / 开打的事件入队；剩余时间按服务器时钟', () => {
    const { s } = setup()
    expect(s.mode).toBe('online')
    expect(s.operable).toEqual(['me'])
    expect(s.state!.phase).toBe('playing')
    expect(s.events.map((x) => x.e.type)).toEqual(['countdown', 'go'])
    expect(s.intro).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(s.remaining).toBe(85_000)
    // 服务器比本机快 2 秒：剩余时间按服务器算
    s.syncOnline(snap(s.state!), 'me', Date.now() + 2000)
    s.advance(Date.now() + 2000)
    expect(s.remaining).toBe(83_000)
  })

  it('答题：本机判分、答案发给服务器；打中的声音等服务器的 hit 回来、按拳头打到的时刻放；反馈窗口等快照里题号推进才关', () => {
    const { s, sent, server } = setup()
    const q = s.questionOf(s.state!.players[0]!)
    s.submit('me', correctOf(q))
    expect(sent.at(-1)).toEqual({ type: 'answer', index: 0, given: String(correctOf(q)), correct: true })
    expect(s.pending.me?.correct).toBe(true)
    // 服务器还没回：窗口时间到了也不关
    vi.advanceTimersByTime(BOSS_FEEDBACK_RIGHT_MS)
    expect(s.pending.me).toBeDefined()
    vi.mocked(playSfx).mockClear()
    server.answer('me')
    expect(s.pending.me).toBeUndefined()
    expect(s.state!.players[0]!.score).toBe(1)
    expect(s.timeline).toEqual([{ t: BOSS_FEEDBACK_RIGHT_MS, id: 'me', score: 1 }])
    vi.advanceTimersByTime(HIT_AT.jab * 1000)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('punch')
  })

  it('答案丢了（快照一直不推进）：等 ANSWER_WAIT_MS 放开这题', () => {
    const { s } = setup()
    s.submit('me', correctOf(s.questionOf(s.state!.players[0]!)))
    vi.advanceTimersByTime(BOSS_FEEDBACK_RIGHT_MS)
    s.syncOnline(snap(s.state!), 'me', Date.now())
    expect(s.pending.me).toBeDefined()
    vi.advanceTimersByTime(ANSWER_WAIT_MS)
    expect(s.pending.me).toBeUndefined()
  })

  it('正在按的内容节流发给服务器；没有暂停；再来一局 / 下一章 / 不玩了发消息', () => {
    const { s, sent } = setup()
    s.setInput('me', '1')
    s.setInput('me', '12')
    expect(sent.filter((m) => m.type === 'input')).toEqual([])
    vi.advanceTimersByTime(INPUT_SEND_MS)
    expect(sent.filter((m) => m.type === 'input')).toEqual([{ type: 'input', input: '12' }])
    s.pause()
    expect(s.state!.phase).toBe('playing')
    s.rematch()
    s.nextChapter('s1-04-simple-addsub', 'race')
    s.quit()
    expect(sent.slice(-3)).toEqual([{ type: 'rematch' }, { type: 'next', kpId: 's1-04-simple-addsub', skin: 'race' }, { type: 'quit' }])
  })

  it('本机的计时器到 0 了、服务器还没宣布结束：不再收答案', () => {
    const { s, sent } = setup()
    vi.advanceTimersByTime(90_000)
    s.submit('me', correctOf(s.questionOf(s.state!.players[0]!)))
    expect(sent.filter((m) => m.type === 'answer')).toEqual([])
    expect(s.pending.me).toBeUndefined()
  })

  it('最后 10 秒、时间到都是服务器的事件；结束后时钟停', () => {
    const { s, server } = setup()
    vi.advanceTimersByTime(80_000)
    let res = tick(server.m, Date.now())
    for (const e of res.events) s.onRemoteEvent(e)
    server.set(res.match)
    expect(s.callout?.key).toBe('boss.lastTen')
    vi.advanceTimersByTime(10_000 + GRACE_MS)
    res = tick(server.m, Date.now(), GRACE_MS)
    for (const e of res.events) s.onRemoteEvent(e)
    server.set(res.match)
    expect(s.state!.phase).toBe('ended')
    expect(s.events.map((x) => x.e.type).slice(-2)).toEqual(['timeUp', 'finished'])
    expect(s.record).toBeNull()
  })

  it('新的一局（种子变了）：清掉上一局的反馈与走势；事件队列留着（新一局的 countdown 先于快照到）', () => {
    const { s, server } = setup()
    server.answer('me')
    expect(s.timeline).toHaveLength(1)
    s.onRemoteEvent({ type: 'countdown' })
    const again = createTimed({ kpId: KP, boss: 'dino', variant: 'coop', durationMs: 90_000, players: [P('me', 'red'), P('you', 'blue')], seeds: { me: 7, you: 8 }, now: Date.now() })
    server.set(again)
    expect(s.state!.phase).toBe('countdown')
    expect(s.timeline).toEqual([])
    expect(s.events.at(-1)!.e.type).toBe('countdown')
  })
})

describe('台上台下与能量拳（M9）', () => {
  const six = [P('me', 'red'), P('r2', 'red'), P('r3', 'red'), P('b1', 'blue'), P('b2', 'blue'), P('b3', 'blue')]

  it('人多时每队最近打中的两个在台上；台下的人打中：「嘭」晚到能量拳打到的时刻，拳打完再看要不要换他上台', () => {
    const { s, server } = setup(six)
    expect(s.stage).toEqual(['me', 'r2', 'b1', 'b2'])
    vi.advanceTimersByTime(STAGE_MIN_MS)
    vi.mocked(playSfx).mockClear()
    server.answer('r3')
    vi.advanceTimersByTime(HIT_AT.jab * 1000)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).not.toContain('punch')
    vi.advanceTimersByTime(ENERGY_AT * 1000 - HIT_AT.jab * 1000)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('punch')
    expect(s.stage).toEqual(['me', 'r2', 'b1', 'b2'])
    vi.advanceTimersByTime(LINEUP_AFTER_MS)
    // 台上的 me、r2 都没打中过、都待满了：换下按原来顺序排在前面的那个
    expect(s.stage).toEqual(['r3', 'r2', 'b1', 'b2'])
  })

  it('有人发了表情：进游戏的事件队列（台下的举牌、台上的挥手）；不是这一局的人不进', () => {
    const { s } = setup()
    s.onEmote('you')
    s.onEmote('nobody')
    expect(s.events.at(-1)!.e).toEqual({ type: 'emote', playerId: 'you' })
    expect(s.events.filter((x) => x.e.type === 'emote')).toHaveLength(1)
  })
})
