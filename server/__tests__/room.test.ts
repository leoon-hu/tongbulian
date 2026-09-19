import { describe, expect, it } from 'vitest'
import { COUNTDOWN_MS } from '@/battle/match'
import type { ArenaEvent, ClientMsg } from '@/battle/protocol'
import { HOST_GRACE_MS, ROOM_IDLE_MS, ROOM_LIFE_MS, ROOM_MAX, TEAM_MAX, apply, autoStart, createRoom, expired, isCode, join, makeCode, reassignHost, setOnline, snapshot, tick, type Room } from '../room'

const V = 'v1'
const T0 = 1_700_000_000_000
let seedN = 100
const seeds = (): number => ++seedN

/** 建好的房间，建房的设备只观战（主持人）；两队各进一个人 */
function fresh(): Room {
  return createRoom({ code: 'ABCDEF', kpId: 's1-05-carry-add', skin: 'race', host: { clientId: 'host01', name: '主持人' }, version: V, now: T0 })
}
function room(): Room {
  return apply(fresh(), 'host01', { type: 'team', role: 'watch' }, T0, seeds).room
}
function joined(r: Room, id: string, t?: 'red' | 'blue' | 'watch', name = id): Room {
  const res = join(r, { clientId: id, name, t, version: V }, T0 + 1)
  expect(res.error).toBeUndefined()
  return res.room
}
function ok(r: Room, from: string, msg: ClientMsg): Room {
  const res = apply(r, from, msg, T0 + 10, seeds)
  const errors = res.effects.filter((e) => e.type === 'error')
  expect(errors, `${from} ${msg.type} 不该报错：${JSON.stringify(errors)}`).toEqual([])
  return res.room
}
function errorOf(r: Room, from: string, msg: ClientMsg): string | undefined {
  const res = apply(r, from, msg, T0 + 10, seeds)
  const e = res.effects.find((x) => x.type === 'error')
  return e && e.type === 'error' ? e.error : undefined
}
const events = (r: Room, from: string, msg: ClientMsg): ArenaEvent[] =>
  apply(r, from, msg, T0 + 10, seeds)
    .effects.filter((e) => e.type === 'event')
    .map((e) => (e.type === 'event' ? e.e : { type: 'go' }))

/** 两队各一人、主持人观战 → 开始 → 开打（不用举手） */
function playing(): Room {
  let r = joined(joined(room(), 'red001', 'red'), 'blue01', 'blue')
  r = ok(r, 'host01', { type: 'start' })
  return tick(r, T0 + 10 + COUNTDOWN_MS).room
}

describe('房间号（B19）', () => {
  it('6 位、不含 0 O 1 I L；isCode 认格式', () => {
    let x = 0
    const code = makeCode(() => ((x += 0.137) % 1))
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
    expect(isCode('ABCDEF')).toBe(true)
    expect(isCode('ABC0EF')).toBe(false)
    expect(isCode('abcdef')).toBe(false)
    expect(isCode('ABCDEFG')).toBe(false)
  })
})

describe('房间状态机（B13–B25、B41–B45）', () => {
  it('建房：建房的设备只观战、没锁、没比赛；快照不带版本；加入：版本不一致拒绝、满了拒绝、同一 clientId 回来接回座位', () => {
    expect(fresh().members[0]!.role).toBe('watch')
    const r = room()
    expect(r.hostId).toBe('host01')
    expect(r.members[0]!.role).toBe('watch')
    expect(r.match).toBeNull()
    expect(Object.keys(snapshot(r))).not.toContain('version')
    expect(join(r, { clientId: 'x', name: 'x', version: 'v2' }, T0).error).toBe('version')
    let full = r
    for (let i = 1; i < ROOM_MAX; i++) full = joined(full, `c${String(i).padStart(4, '0')}`, 'watch')
    expect(join(full, { clientId: 'one-more', name: '多', version: V }, T0).error).toBe('full')
    const back = join(full, { clientId: 'c0003', name: '新名字', version: V }, T0 + 5)
    expect(back.error).toBeUndefined()
    expect(back.room.members).toHaveLength(ROOM_MAX)
    expect(back.room.members.find((m) => m.clientId === 'c0003')!.name).toBe('新名字')
  })

  it('进队：不指定队就分到人少的队（一样多进红队）；链接指定的队默认进去；这队满了进另一队并提示、都满了观战；比赛中只能观战；大厅里能换队（换队清掉举手）；锁队后非主持人不能换', () => {
    // 建房的设备观战，不带 t 的人第一个进红队，第二个进蓝队，第三个再进红队
    let auto = joined(fresh(), 'auto01')
    expect(auto.members.find((m) => m.clientId === 'auto01')!.role).toBe('red')
    auto = joined(auto, 'auto02')
    expect(auto.members.find((m) => m.clientId === 'auto02')!.role).toBe('blue')
    auto = joined(auto, 'auto03')
    expect(auto.members.find((m) => m.clientId === 'auto03')!.role).toBe('red')
    expect(joined(auto, 'auto04', 'watch').members.find((m) => m.clientId === 'auto04')!.role).toBe('watch')

    let r = joined(room(), 'red001', 'red')
    for (let i = 2; i <= TEAM_MAX; i++) r = joined(r, `red00${i}`, 'red')
    const seventh = join(r, { clientId: 'red007', name: '七', t: 'red', version: V }, T0)
    expect(seventh.error).toBe('teamFull')
    expect(seventh.room.members.find((m) => m.clientId === 'red007')!.role).toBe('blue')
    let both = seventh.room
    for (let i = 2; i <= TEAM_MAX; i++) both = joined(both, `blue0${i}`, 'blue')
    const stuck = join(both, { clientId: 'anyone', name: '满', version: V }, T0)
    expect(stuck.error).toBe('teamFull')
    expect(stuck.room.members.find((m) => m.clientId === 'anyone')!.role).toBe('watch')
    r = joined(r, 'blue01', 'blue')
    r = ok(r, 'blue01', { type: 'ready', ready: true })
    expect(r.members.find((m) => m.clientId === 'blue01')!.ready).toBe(true)
    r = ok(r, 'blue01', { type: 'team', role: 'watch' })
    expect(r.members.find((m) => m.clientId === 'blue01')!.ready).toBe(false)
    expect(errorOf(r, 'blue01', { type: 'team', role: 'red' })).toBe('teamFull')
    r = ok(r, 'blue01', { type: 'team', role: 'blue' })
    r = ok(r, 'host01', { type: 'lock', locked: true })
    expect(errorOf(r, 'blue01', { type: 'team', role: 'watch' })).toBe('locked')
    expect(errorOf(r, 'blue01', { type: 'lock', locked: false })).toBe('notHost')
    r = ok(r, 'host01', { type: 'team', role: 'blue' })
    expect(r.members.find((m) => m.clientId === 'host01')!.role).toBe('blue')
    const p = playing()
    const late = join(p, { clientId: 'late01', name: '晚', t: 'red', version: V }, T0 + 20)
    expect(late.error).toBe('started')
    expect(late.room.members.find((m) => m.clientId === 'late01')!.role).toBe('watch')
    expect(errorOf(late.room, 'late01', { type: 'team', role: 'red' })).toBe('started')
    const lateAuto = join(p, { clientId: 'late02', name: '更晚', version: V }, T0 + 20)
    expect(lateAuto.error).toBe('started')
    expect(lateAuto.room.members.find((m) => m.clientId === 'late02')!.role).toBe('watch')
  })

  it('开始：只有主持人、两队都至少 1 人在线才行（举手不是条件）；开始后进入倒数、发 countdown；到点 tick 开打发 go；举手清零', () => {
    let r = joined(room(), 'red001', 'red')
    expect(errorOf(r, 'host01', { type: 'start' })).toBe('bad')
    r = joined(r, 'blue01', 'blue')
    expect(errorOf(r, 'red001', { type: 'start' })).toBe('notHost')
    const blueOff = setOnline(r, 'blue01', false, T0 + 5).room
    expect(errorOf(blueOff, 'host01', { type: 'start' })).toBe('bad')
    r = ok(r, 'red001', { type: 'ready', ready: true })
    expect(events(r, 'host01', { type: 'start' })).toEqual([{ type: 'countdown' }])
    r = ok(r, 'host01', { type: 'start' })
    expect(r.match!.phase).toBe('countdown')
    expect(r.match!.players.map((p) => [p.id, p.team])).toEqual([
      ['red001', 'red'],
      ['blue01', 'blue'],
    ])
    expect(new Set(r.match!.players.map((p) => p.seed)).size).toBe(2)
    expect(r.members.every((m) => !m.ready)).toBe(true)
    expect(tick(r, T0 + 10 + COUNTDOWN_MS - 1).effects).toEqual([])
    const go = tick(r, T0 + 10 + COUNTDOWN_MS)
    expect(go.room.match!.phase).toBe('playing')
    expect(go.effects).toContainEqual({ type: 'event', e: { type: 'go' } })
    // 倒数中不能换队 / 再开始
    expect(errorOf(r, 'red001', { type: 'team', role: 'watch' })).toBe('started')
    expect(errorOf(r, 'host01', { type: 'start' })).toBe('bad')
  })

  it('自动开始（B21）：两队都有人在线且没开过局才开始；只有一队 / 一方掉线 / 已经在打 / 打完了都不动', () => {
    const one = joined(room(), 'red001', 'red')
    expect(autoStart(one, T0 + 5, seeds).room).toBe(one)
    const both = joined(one, 'blue01', 'blue')
    const off = setOnline(both, 'blue01', false, T0 + 5).room
    expect(autoStart(off, T0 + 5, seeds).room).toBe(off)
    const started = autoStart(both, T0 + 5, seeds)
    expect(started.room.match!.phase).toBe('countdown')
    expect(started.room.match!.players.map((p) => p.id)).toEqual(['red001', 'blue01'])
    expect(started.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }])
    expect(autoStart(started.room, T0 + 6, seeds).room).toBe(started.room)
    let done = playing()
    for (let i = 0; i < 8; i++) done = ok(done, 'red001', { type: 'answer', index: i, given: '3', correct: true })
    expect(done.match!.phase).toBe('ended')
    expect(autoStart(done, T0 + 99, seeds).room).toBe(done)
  })

  it('答题：对了加分发 point 等事件、错了只发 answered；题号不对报 bad；到 8 分结束；再来一局换种子重新倒数；主持人可以中途结束回大厅', () => {
    let r = playing()
    expect(events(r, 'red001', { type: 'answer', index: 0, given: '3', correct: true }).map((e) => e.type)).toEqual(['answered', 'point'])
    r = ok(r, 'red001', { type: 'answer', index: 0, given: '3', correct: true })
    expect(r.match!.score.red).toBe(1)
    expect(errorOf(r, 'red001', { type: 'answer', index: 0, given: '3', correct: true })).toBe('bad')
    expect(events(r, 'blue01', { type: 'answer', index: 0, given: '9', correct: false }).map((e) => e.type)).toEqual(['answered'])
    r = ok(r, 'red001', { type: 'input', input: '12' })
    expect(r.match!.players[0]!.input).toBe('12')
    const seedsBefore = r.match!.players.map((p) => p.seed)
    for (let i = 1; i < 8; i++) r = ok(r, 'red001', { type: 'answer', index: i, given: '3', correct: true })
    expect(r.match!.phase).toBe('ended')
    expect(r.match!.winner).toBe('red')
    expect(errorOf(r, 'red001', { type: 'answer', index: 8, given: '3', correct: true })).toBe('bad')
    expect(errorOf(r, 'blue01', { type: 'rematch' })).toBe('notHost')
    // 结束后观众可以进队，再来一局带上他
    r = ok(r, 'host01', { type: 'team', role: 'blue' })
    r = ok(r, 'host01', { type: 'rematch' })
    expect(r.match!.phase).toBe('countdown')
    expect(r.match!.players.map((p) => p.id)).toEqual(['host01', 'red001', 'blue01'])
    expect(r.match!.players.map((p) => p.seed)).not.toEqual(seedsBefore)
    r = ok(r, 'host01', { type: 'end' })
    expect(r.match).toBeNull()
  })

  it('下一章（B9）：只有主持人、上一局结束后才行；换成新的知识点与皮肤重新倒数、种子重发；kpId / 皮肤不合法报 bad；之后再来一局仍在新知识点上', () => {
    let r = playing()
    expect(errorOf(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: 'car' })).toBe('bad') // 还在比赛
    for (let i = 0; i < 8; i++) r = ok(r, 'red001', { type: 'answer', index: i, given: '3', correct: true })
    expect(r.match!.phase).toBe('ended')
    expect(errorOf(r, 'red001', { type: 'next', kpId: 's1-06-x', skin: 'car' })).toBe('notHost')
    expect(errorOf(r, 'host01', { type: 'next', kpId: '', skin: 'car' })).toBe('bad')
    expect(errorOf(r, 'host01', { type: 'next', kpId: 'x'.repeat(65), skin: 'car' })).toBe('bad')
    expect(errorOf(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: '' })).toBe('bad')
    const seedsBefore = r.match!.players.map((p) => p.seed)
    expect(events(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: 'car' }).map((e) => e.type)).toEqual(['countdown'])
    r = ok(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: 'car' })
    expect(r.kpId).toBe('s1-06-x')
    expect(r.skin).toBe('car')
    expect(r.match!.phase).toBe('countdown')
    expect(r.match!.kpId).toBe('s1-06-x')
    expect(r.match!.skin).toBe('car')
    expect(r.match!.score).toEqual({ red: 0, blue: 0 })
    expect(r.match!.players.map((p) => p.id)).toEqual(['red001', 'blue01'])
    expect(r.match!.players.map((p) => p.seed)).not.toEqual(seedsBefore)
    r = tick(r, T0 + 10 + COUNTDOWN_MS).room
    for (let i = 0; i < 8; i++) r = ok(r, 'blue01', { type: 'answer', index: i, given: '3', correct: true })
    expect(r.match!.winner).toBe('blue')
    r = ok(r, 'host01', { type: 'rematch' })
    expect(r.match!.kpId).toBe('s1-06-x')
    expect(r.match!.skin).toBe('car')
  })

  it('换皮肤只有主持人、比赛中不行', () => {
    let r = joined(joined(room(), 'red001', 'red'), 'blue01', 'blue')
    expect(errorOf(r, 'red001', { type: 'skin', skin: 'tug' })).toBe('notHost')
    r = ok(r, 'host01', { type: 'skin', skin: 'tug' })
    expect(r.skin).toBe('tug')
    r = ok(r, 'host01', { type: 'start' })
    expect(r.match!.skin).toBe('tug')
    expect(errorOf(r, 'host01', { type: 'skin', skin: 'race' })).toBe('bad')
  })

  it('掉线与主持：主持人掉线 20 秒内不换人，超过才交给最早在线的参赛者，回来不抢回；比赛里的人标掉线、离开的人也算掉线；离开释放座位并立刻交接；过期判断', () => {
    let r = joined(joined(joined(room(), 'watch1', 'watch'), 'red001', 'red'), 'blue01', 'blue')
    r = setOnline(r, 'host01', false, T0 + 30).room
    expect(r.hostId).toBe('host01')
    expect(r.members[0]!.offlineAt).toBe(T0 + 30)
    expect(reassignHost(r, T0 + 30 + HOST_GRACE_MS - 1).room).toBe(r)
    const back = setOnline(r, 'host01', true, T0 + 40).room
    expect(back.hostId).toBe('host01')
    expect(back.members[0]!.offlineAt).toBeUndefined()
    r = reassignHost(r, T0 + 30 + HOST_GRACE_MS).room
    expect(r.hostId).toBe('red001')
    r = setOnline(r, 'host01', true, T0 + 100).room
    expect(r.hostId).toBe('red001')
    expect(reassignHost(r, T0 + 200).room).toBe(r)
    let p = playing()
    p = ok(p, 'blue01', { type: 'leave' })
    expect(p.match!.players.find((x) => x.id === 'blue01')!.online).toBe(false)
    p = playing()
    p = setOnline(p, 'blue01', false, T0 + 50).room
    expect(p.match!.players.find((x) => x.id === 'blue01')!.online).toBe(false)
    expect(p.members.find((m) => m.clientId === 'blue01')!.online).toBe(false)
    p = setOnline(p, 'blue01', true, T0 + 60).room
    expect(p.match!.players.find((x) => x.id === 'blue01')!.online).toBe(true)
    r = ok(r, 'watch1', { type: 'leave' })
    expect(r.members.map((m) => m.clientId)).toEqual(['host01', 'red001', 'blue01'])
    r = ok(r, 'red001', { type: 'leave' })
    expect(r.hostId).toBe('blue01')
    let all = room()
    expect(expired(all, T0 + ROOM_IDLE_MS + 1)).toBe(false)
    all = setOnline(all, 'host01', false, T0 + 100).room
    expect(expired(all, T0 + 100 + ROOM_IDLE_MS - 1)).toBe(false)
    expect(expired(all, T0 + 100 + ROOM_IDLE_MS + 1)).toBe(true)
    expect(expired(room(), T0 + ROOM_LIFE_MS + 1)).toBe(true)
    expect(apply(room(), 'nobody', { type: 'ready', ready: true }, T0).effects).toEqual([{ type: 'error', to: 'nobody', error: 'bad' }])
  })
})
