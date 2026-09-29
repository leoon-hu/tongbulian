import { describe, expect, it } from 'vitest'
import { COUNTDOWN_MS } from '@/battle/match'
import type { BossRoomOpts, ClientMsg, Team } from '@/battle/protocol'
import { GRACE_MS, LAST_TEN_MS, bossHp } from '@/battle/timed'
import {
  HOST_GRACE_MS,
  MATCH_MAX_ANSWERS,
  ROOM_IDLE_MS,
  ROOM_LIFE_MS,
  ROOM_MAX,
  TEAM_MAX,
  apply,
  autoStart,
  createRoom,
  expired,
  findByPasscode,
  isCode,
  isPasscode,
  join,
  makeCode,
  makePasscode,
  makePasscodes,
  reassignHost,
  roomPlayOf,
  setOnline,
  snapshot,
  tick,
  type Effect,
  type Room,
  type RoomEvent,
} from '../room'

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
const events = (r: Room, from: string, msg: ClientMsg): RoomEvent[] =>
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

describe('口令（B19）', () => {
  it('6 位数字、首位不为 0；三个身份互不相同、避开别的房间的；快照里带着；按口令找到房间与身份', () => {
    expect(makePasscode(() => 0)).toBe('100000')
    expect(makePasscode(() => 0.999999)).toBe('999999')
    expect(isPasscode('123456')).toBe(true)
    expect(isPasscode('012345')).toBe(false)
    expect(isPasscode('12345')).toBe(false)
    expect(isPasscode('1234567')).toBe(false)
    expect(isPasscode(123456)).toBe(false)
    let n = 0
    const seq = (): number => ((n += 1) % 7) / 7 // 会撞的伪随机：撞了要换一个
    const taken = new Set([makePasscode(() => 1 / 7)])
    const ps = makePasscodes(taken, seq)
    const all = Object.values(ps)
    expect(all.every(isPasscode)).toBe(true)
    expect(new Set(all).size).toBe(3)
    expect(all.some((p) => taken.has(p))).toBe(false)
    const r = fresh()
    expect(Object.keys(r.passcodes).sort()).toEqual(['blue', 'red', 'watch'])
    expect(snapshot(r).passcodes).toEqual(r.passcodes)
    const other = createRoom({ code: 'ZZZZZZ', kpId: 'x', skin: 'race', host: { clientId: 'h2', name: 'h2' }, version: V, now: T0, passcodes: { red: '111111', blue: '222222', watch: '333333' } })
    expect(findByPasscode([r, other], '222222')).toEqual({ code: 'ZZZZZZ', t: 'blue' })
    expect(findByPasscode([r, other], r.passcodes.watch)).toEqual({ code: 'ABCDEF', t: 'watch' })
    expect(findByPasscode([r, other], '000000')).toBeUndefined()
  })
})

describe('房间状态机（B13–B25、B41–B45）', () => {
  it('建房：建房的设备只观战、没锁、没比赛；快照不带版本；加入：版本不一致拒绝、满了拒绝、同一 clientId 回来接回座位', () => {
    expect(fresh().members[0]!.role).toBe('watch')
    const r = room()
    expect(r.hostId).toBe('host01')
    expect(r.members[0]!.role).toBe('watch')
    expect(r.match).toBeNull()
    // 不带玩法的是对战房间（M13）：快照里 format 是 battle、timed 一直是 null、没有 boss
    expect(r.format).toBe('battle')
    expect(snapshot(r)).toMatchObject({ format: 'battle', timed: null })
    expect(Object.keys(snapshot(r))).not.toContain('boss')
    expect(snapshot(playing())).toMatchObject({ format: 'battle', timed: null, match: { phase: 'playing' } })
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
    // 结束后观众可以进队，再来一局带上他；再来一局谁都能按（B9）
    r = ok(r, 'host01', { type: 'team', role: 'blue' })
    r = ok(r, 'blue01', { type: 'rematch' })
    expect(r.match!.phase).toBe('countdown')
    expect(r.match!.players.map((p) => p.id)).toEqual(['host01', 'red001', 'blue01'])
    expect(r.match!.players.map((p) => p.seed)).not.toEqual(seedsBefore)
    r = ok(r, 'host01', { type: 'end' })
    expect(r.match).toBeNull()
  })

  it('下一章（B9）：谁都能按、上一局结束后才算（比赛中忽略不报错）；换成新的知识点与皮肤重新倒数、种子重发；kpId / 皮肤不合法报 bad；之后再来一局仍在新知识点上；不玩了关房间', () => {
    let r = playing()
    expect(apply(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: 'car' }, T0 + 10, seeds)).toEqual({ room: r, effects: [] }) // 还在比赛：忽略
    expect(apply(r, 'red001', { type: 'rematch' }, T0 + 10, seeds)).toEqual({ room: r, effects: [] })
    expect(apply(r, 'red001', { type: 'quit' }, T0 + 10, seeds)).toEqual({ room: r, effects: [] })
    for (let i = 0; i < 8; i++) r = ok(r, 'red001', { type: 'answer', index: i, given: '3', correct: true })
    expect(r.match!.phase).toBe('ended')
    expect(errorOf(r, 'red001', { type: 'next', kpId: '', skin: 'car' })).toBe('bad')
    expect(errorOf(r, 'host01', { type: 'next', kpId: '', skin: 'car' })).toBe('bad')
    expect(errorOf(r, 'host01', { type: 'next', kpId: 'x'.repeat(65), skin: 'car' })).toBe('bad')
    expect(errorOf(r, 'host01', { type: 'next', kpId: 's1-06-x', skin: '' })).toBe('bad')
    const seedsBefore = r.match!.players.map((p) => p.seed)
    expect(events(r, 'red001', { type: 'next', kpId: 's1-06-x', skin: 'car' }).map((e) => e.type)).toEqual(['countdown'])
    r = ok(r, 'red001', { type: 'next', kpId: 's1-06-x', skin: 'car' }) // 红队按的，不是主持人
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
    r = ok(r, 'blue01', { type: 'rematch' })
    expect(r.match!.kpId).toBe('s1-06-x')
    expect(r.match!.skin).toBe('car')
    // 不玩了（B9）：结束后谁都能按，效果是关房间
    r = tick(r, T0 + 10 + COUNTDOWN_MS).room
    for (let i = 0; i < 8; i++) r = ok(r, 'red001', { type: 'answer', index: i, given: '3', correct: true })
    expect(apply(r, 'blue01', { type: 'quit' }, T0 + 10, seeds).effects).toEqual([{ type: 'close' }])
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

describe('语音（B57）', () => {
  it('voice 开 / 关进成员的 voice 并广播、重复不广播；新加入的人默认关；掉线保留、离开就没了；rtc / turn 到状态机是空操作', () => {
    let r = joined(joined(room(), 'r1', 'red'), 'b1', 'blue')
    expect(r.members.every((m) => m.voice === false)).toBe(true)
    const res = apply(r, 'r1', { type: 'voice', on: true }, T0 + 10, seeds)
    expect(res.effects).toEqual([{ type: 'broadcast' }])
    r = res.room
    expect(r.members.find((m) => m.clientId === 'r1')!.voice).toBe(true)
    expect(snapshot(r).members.find((m) => m.clientId === 'r1')!.voice).toBe(true)
    expect(apply(r, 'r1', { type: 'voice', on: true }, T0 + 10, seeds).effects).toEqual([])
    r = setOnline(r, 'r1', false, T0 + 20).room
    expect(r.members.find((m) => m.clientId === 'r1')!.voice).toBe(true)
    r = setOnline(r, 'r1', true, T0 + 30).room
    r = ok(r, 'r1', { type: 'voice', on: false })
    expect(r.members.find((m) => m.clientId === 'r1')!.voice).toBe(false)
    r = ok(r, 'b1', { type: 'voice', on: true })
    r = ok(r, 'b1', { type: 'leave' })
    expect(r.members.find((m) => m.clientId === 'b1')).toBeUndefined()
    expect(apply(r, 'r1', { type: 'turn' }, T0 + 40, seeds).effects).toEqual([])
    expect(apply(r, 'r1', { type: 'rtc', to: 'host01', data: { candidates: [] } }, T0 + 40, seeds).effects).toEqual([])
    // 比赛中也能开关（不影响比赛）
    let p = playing()
    p = ok(p, 'red001', { type: 'voice', on: true })
    expect(p.match?.phase).toBe('playing')
    expect(p.members.find((m) => m.clientId === 'red001')!.voice).toBe(true)
  })
})

describe('自我保护（N6 ⑨）', () => {
  it('说话名额：第 5 个开麦不进快照也不报错；刷新回来的人 voice 清零', () => {
    let r = room()
    for (const id of ['a', 'b', 'c', 'd', 'e']) r = joined(r, id, 'watch')
    for (const id of ['a', 'b', 'c', 'd']) r = ok(r, id, { type: 'voice', on: true })
    const res = apply(r, 'e', { type: 'voice', on: true }, T0 + 10, seeds)
    expect(res.effects).toEqual([])
    expect(res.room.members.filter((m) => m.voice)).toHaveLength(4)
    // a 刷新页面重连：座位上的麦克风跟着关掉，e 就能开了
    r = join(r, { clientId: 'a', name: 'a', version: V }, T0 + 20).room
    expect(r.members.find((m) => m.clientId === 'a')!.voice).toBe(false)
    expect(ok(r, 'e', { type: 'voice', on: true }).members.find((m) => m.clientId === 'e')!.voice).toBe(true)
  })

  it('比赛中离开又回来的选手接回原来的队，不会以观战身份继续答题', () => {
    let r = playing()
    r = ok(r, 'red001', { type: 'leave' })
    expect(r.members.find((m) => m.clientId === 'red001')).toBeUndefined()
    const back = join(r, { clientId: 'red001', name: '回来了', t: 'watch', version: V }, T0 + 50)
    expect(back.error).toBeUndefined()
    expect(back.room.members.find((m) => m.clientId === 'red001')!.role).toBe('red')
    expect(back.room.match!.players.find((p) => p.id === 'red001')!.online).toBe(true)
  })

  it('一局的作答次数有上限：超过 MATCH_MAX_ANSWERS 报 bad', () => {
    let r = playing()
    const p = () => r.match!.players.find((x) => x.id === 'red001')!
    r = { ...r, match: { ...r.match!, players: r.match!.players.map((x) => (x.id === 'red001' ? { ...x, index: 400 } : x)) } }
    expect(errorOf(r, 'red001', { type: 'answer', index: p().index, given: '1', correct: false })).toBe('bad')
  })

  it('房间号与口令默认用加密随机数（注入的 random 仍可复现）', () => {
    const seq = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]
    let i = 0
    const rnd = () => seq[i++ % seq.length]!
    const first = makeCode(rnd)
    i = 0
    expect(makeCode(rnd)).toBe(first)
    const codes = new Set(Array.from({ length: 50 }, () => makeCode()))
    expect(codes.size).toBeGreaterThan(45)
    expect(isPasscode(makePasscode())).toBe(true)
  })
})

describe('随机的名字与小动物（B17）', () => {
  const host = (): Room => createRoom({ code: 'ABC234', kpId: 's1-05-carry-add', skin: 'race', host: { clientId: 'host01', name: '小兔', avatar: 'rabbit' }, version: V, now: T0 })
  const member = (r: Room, id: string) => r.members.find((m) => m.clientId === id)!

  it('新进来的人随机的小动物跟房间里的撞了：换一只没人用的，名字跟着换（语言照原来的）；不撞就不动', () => {
    let r = join(host(), { clientId: 'red001', name: '小兔', t: 'red', version: V, avatar: 'rabbit', auto: { name: true, avatar: true } }, T0 + 1).room
    expect(member(r, 'red001')).toMatchObject({ name: '小猫', avatar: 'cat' }) // 从小兔往后轮着找：小猫没人用
    r = join(r, { clientId: 'blue01', name: 'Cat', t: 'blue', version: V, avatar: 'cat', auto: { name: true, avatar: true } }, T0 + 2).room
    expect(member(r, 'blue01')).toMatchObject({ name: 'Bear', avatar: 'bear' })
    r = join(r, { clientId: 'watch1', name: '熊猫', t: 'watch', version: V, avatar: 'panda', auto: { name: true, avatar: true } }, T0 + 3).room
    expect(member(r, 'watch1')).toMatchObject({ name: '熊猫', avatar: 'panda' })
  })

  it('自己选的不动：自定义的名字只换小动物；自定义的小动物只换名字；都自定义了撞了也不改；没带 auto 的老页面照旧', () => {
    let r = join(host(), { clientId: 'red001', name: '阿狐', t: 'red', version: V, avatar: 'rabbit', auto: { avatar: true } }, T0 + 1).room
    expect(member(r, 'red001')).toMatchObject({ name: '阿狐', avatar: 'cat' })
    r = join(host(), { clientId: 'red001', name: '小兔', t: 'red', version: V, avatar: 'rabbit', auto: { name: true } }, T0 + 1).room
    expect(member(r, 'red001').avatar).toBe('rabbit')
    expect(member(r, 'red001').name).not.toBe('小兔')
    r = join(host(), { clientId: 'red001', name: '小兔', t: 'red', version: V, avatar: 'rabbit' }, T0 + 1).room
    expect(member(r, 'red001')).toMatchObject({ name: '小兔', avatar: 'rabbit' })
  })

  it('重连回来：随机的那几样沿用座位上的（页面刷新后重新随机的不算数），自定义的照新的', () => {
    let r = join(host(), { clientId: 'red001', name: '小兔', t: 'red', version: V, avatar: 'rabbit', auto: { name: true, avatar: true } }, T0 + 1).room
    r = setOnline(r, 'red001', false, T0 + 2).room
    r = join(r, { clientId: 'red001', name: '小猪', version: V, avatar: 'pig', auto: { name: true, avatar: true } }, T0 + 3).room
    expect(member(r, 'red001')).toMatchObject({ name: '小猫', avatar: 'cat', online: true })
    r = join(r, { clientId: 'red001', name: '阿狐', version: V, avatar: 'monkey' }, T0 + 4).room
    expect(member(r, 'red001')).toMatchObject({ name: '阿狐', avatar: 'monkey' })
  })
})

describe('打怪兽房间（M5 / M13）', () => {
  const COOP: BossRoomOpts = { variant: 'coop', durationS: 60, boss: 'dino' }
  const D = 60_000
  function bossRoom(boss: Partial<BossRoomOpts> = {}): Room {
    return createRoom({ code: 'BOSS23', kpId: 's1-05-carry-add', skin: 'race', host: { clientId: 'host01', name: '主持人' }, version: V, now: T0, format: 'boss', boss: { ...COOP, ...boss } })
  }
  const at = (r: Room, from: string, msg: ClientMsg, now: number) => apply(r, from, msg, now, seeds)
  const types = (res: { effects: Effect[] }): string[] => res.effects.flatMap((e) => (e.type === 'event' ? [e.e.type] : []))
  const hit = (r: Room, id: string, index: number, now: number, correct = true) => at(r, id, { type: 'answer', index, given: '3', correct }, now)
  const player = (r: Room, id: string) => r.timed!.players.find((p) => p.id === id)!
  /** 两个人进来（一起打默认都在红队）→ 自动倒数 → 开打 */
  function bossPlaying(boss: Partial<BossRoomOpts> = {}, teams: [Team, Team] = ['red', 'red']): Room {
    let r = joined(joined(bossRoom(boss), 'p1', teams[0]), 'p2', teams[1])
    r = autoStart(r, T0 + 5, seeds).room
    return tick(r, r.timed!.startedAt).room
  }

  it('建房的玩法：不带 / battle 是对战房间；boss 要 variant、durationS、boss 都合法，合法的只留这三个字段；快照带 format / boss / timed、不带服务器自己的字段', () => {
    expect(roomPlayOf(undefined, undefined)).toEqual({ format: 'battle' })
    expect(roomPlayOf('battle', { variant: 'nope' })).toEqual({ format: 'battle' })
    expect(roomPlayOf('boss', { ...COOP, extra: 1 })).toEqual({ format: 'boss', boss: COOP })
    expect(roomPlayOf('boss', { variant: 'versus', durationS: 120, boss: 'dino-2' })).toEqual({ format: 'boss', boss: { variant: 'versus', durationS: 120, boss: 'dino-2' } })
    const bad: unknown[] = [
      undefined,
      null,
      'dino',
      { ...COOP, variant: 'solo' },
      { ...COOP, durationS: 30 },
      { ...COOP, durationS: '90' },
      { ...COOP, boss: 'Dino' },
      { ...COOP, boss: '../x' },
      { ...COOP, boss: '' },
      { ...COOP, boss: 'x'.repeat(33) },
      { variant: 'coop', durationS: 90 },
    ]
    for (const b of bad) expect(roomPlayOf('boss', b), JSON.stringify(b)).toBeUndefined()
    expect(roomPlayOf('race', COOP)).toBeUndefined()
    expect(Object.keys(snapshot(room()))).toEqual(['code', 'format', 'kpId', 'skin', 'hostId', 'locked', 'createdAt', 'members', 'match', 'timed', 'passcodes'])
    const r = bossRoom()
    expect(Object.keys(snapshot(r))).toEqual(['code', 'format', 'boss', 'kpId', 'skin', 'hostId', 'locked', 'createdAt', 'members', 'match', 'timed', 'passcodes'])
    expect(snapshot(r)).toMatchObject({ format: 'boss', boss: COOP, match: null, timed: null })
    const p = snapshot(bossPlaying())
    expect(p.match).toBeNull()
    expect(p.timed).toMatchObject({ format: 'timed', phase: 'playing' })
  })

  it('一起打：2 个参赛者在线（哪队都行）就自动开始，1 个 / 1 个在线 1 个掉线都不开始；主持人按开始同一规矩；各打各的要红蓝两队都有人', () => {
    const one = joined(bossRoom(), 'p1', 'red')
    expect(autoStart(one, T0 + 5, seeds).room).toBe(one)
    expect(errorOf(one, 'host01', { type: 'start' })).toBe('bad')
    const two = joined(one, 'p2', 'red')
    const off = setOnline(two, 'p2', false, T0 + 5).room
    expect(autoStart(off, T0 + 5, seeds).room).toBe(off)
    expect(errorOf(off, 'host01', { type: 'start' })).toBe('bad')
    const started = autoStart(two, T0 + 5, seeds)
    expect(started.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }])
    expect(started.room.match).toBeNull()
    expect(started.room.matchNo).toBe(1)
    const m = started.room.timed!
    expect(m).toMatchObject({ format: 'timed', kpId: 's1-05-carry-add', boss: 'dino', variant: 'coop', durationMs: D, phase: 'countdown', startedAt: T0 + 5 + COUNTDOWN_MS })
    expect(m.players.map((p) => [p.id, p.team, p.online, p.score])).toEqual([
      ['p1', 'red', true, 0],
      ['p2', 'red', true, 0],
    ])
    expect(new Set(m.players.map((p) => p.seed)).size).toBe(2)
    expect(m.bosses).toEqual([{ side: 'shared', level: 1, hp: bossHp(1, 2, D), max: bossHp(1, 2, D), downs: 0, fighters: 2 }])
    expect(autoStart(started.room, T0 + 6, seeds).room).toBe(started.room)
    expect(ok(two, 'host01', { type: 'start' }).timed!.phase).toBe('countdown')

    const reds = joined(joined(bossRoom({ variant: 'versus' }), 'p1', 'red'), 'p2', 'red')
    expect(autoStart(reds, T0 + 5, seeds).room).toBe(reds)
    expect(errorOf(reds, 'host01', { type: 'start' })).toBe('bad')
    const vs = autoStart(joined(reds, 'p3', 'blue'), T0 + 5, seeds).room.timed!
    expect(vs.variant).toBe('versus')
    expect(vs.bosses.map((b) => [b.side, b.fighters, b.max])).toEqual([
      ['red', 2, bossHp(1, 2, D)],
      ['blue', 1, bossHp(1, 1, D)],
    ])
  })

  it('倒数到点 tick 开打发 go、定下 endsAt；答对 hit、答错 miss；最后 10 秒 tick 发 lastTen（只一次）；endsAt + 宽限内到的答案还算，之后 tick 发 timeUp → finished；再晚的答案静默忽略', () => {
    let r = joined(joined(bossRoom(), 'p1', 'red'), 'p2', 'blue')
    r = autoStart(r, T0 + 5, seeds).room
    const go0 = r.timed!.startedAt
    expect(tick(r, go0 - 1)).toEqual({ room: r, effects: [] })
    const go = tick(r, go0 + 7)
    expect(go.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'go' } }])
    r = go.room
    expect(r.timed).toMatchObject({ phase: 'playing', startedAt: go0 + 7, endsAt: go0 + 7 + D })
    const ends = r.timed!.endsAt
    expect(tick(r, ends - LAST_TEN_MS - 1).room).toBe(r)

    let res = hit(r, 'p1', 0, go0 + 1000)
    expect(res.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'hit', playerId: 'p1', team: 'red', side: 'shared', points: 1, streak: 1, move: 'jab', together: false } }])
    r = res.room
    res = hit(r, 'p2', 0, go0 + 2000, false)
    expect(res.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'miss', playerId: 'p2', team: 'blue', side: 'shared' } }])
    r = res.room

    res = tick(r, ends - LAST_TEN_MS)
    expect(res.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'lastTen' } }])
    r = res.room
    expect(tick(r, ends - LAST_TEN_MS + 5).room).toBe(r)
    res = hit(r, 'p1', 1, ends - 5000)
    expect(res.effects).toContainEqual({ type: 'event', e: expect.objectContaining({ type: 'hit', points: 2, streak: 2 }) }) // 最后 10 秒 +1
    r = res.room

    // 到了 endsAt 但还在宽限里：没结束，这时到的答案还算（连击第 3 题 +1、最后 10 秒 +1）
    expect(tick(r, ends + GRACE_MS - 1).room).toBe(r)
    res = hit(r, 'p1', 2, ends + GRACE_MS - 1)
    expect(res.effects).toContainEqual({ type: 'event', e: expect.objectContaining({ type: 'hit', points: 3, streak: 3, move: 'hook' }) })
    r = res.room
    expect(player(r, 'p1').score).toBe(6)

    res = tick(r, ends + GRACE_MS)
    expect(res.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'timeUp' } }, { type: 'event', e: { type: 'finished', winner: null } }])
    r = res.room
    expect(r.timed).toMatchObject({ phase: 'ended', endedAt: ends })
    expect(tick(r, ends + 99_999).room).toBe(r)
    expect(hit(r, 'p2', 1, ends + GRACE_MS + 5)).toEqual({ room: r, effects: [] })
  })

  it('作答：重复 / 乱序 / 观众 / 倒数中 / 没开局的静默忽略；形状不对、超过作答上限才 bad；定时回调晚了，先补上最后 10 秒 / 时间到再判这一题；input 进快照', () => {
    const r = bossPlaying()
    const s = r.timed!.startedAt
    const ends = r.timed!.endsAt
    expect(hit(r, 'p1', 5, s + 100)).toEqual({ room: r, effects: [] }) // 乱序
    const once = hit(r, 'p1', 0, s + 100).room
    expect(hit(once, 'p1', 0, s + 200)).toEqual({ room: once, effects: [] }) // 重复
    expect(hit(r, 'host01', 0, s + 100)).toEqual({ room: r, effects: [] }) // 观众
    const cd = autoStart(joined(joined(bossRoom(), 'p1', 'red'), 'p2', 'red'), T0 + 5, seeds).room
    expect(hit(cd, 'p1', 0, T0 + 6)).toEqual({ room: cd, effects: [] }) // 倒数中
    const lobby = joined(bossRoom(), 'p1', 'red')
    expect(hit(lobby, 'p1', 0, T0 + 6)).toEqual({ room: lobby, effects: [] }) // 没开局
    expect(errorOf(r, 'p1', { type: 'answer', index: -1, given: '3', correct: true })).toBe('bad')
    expect(errorOf(r, 'p1', { type: 'answer', index: 0.5, given: '3', correct: true })).toBe('bad')
    expect(errorOf(r, 'p1', { type: 'answer', index: 0, given: 3 as never, correct: true })).toBe('bad')
    const capped: Room = { ...r, timed: { ...r.timed!, players: r.timed!.players.map((p) => (p.id === 'p1' ? { ...p, index: MATCH_MAX_ANSWERS } : p)) } }
    expect(errorOf(capped, 'p1', { type: 'answer', index: MATCH_MAX_ANSWERS, given: '3', correct: true })).toBe('bad')

    expect(types(hit(r, 'p1', 0, ends - 3000))).toEqual(['lastTen', 'hit'])
    const late = hit(r, 'p1', 0, ends + GRACE_MS)
    expect(types(late)).toEqual(['timeUp', 'finished'])
    expect(late.room.timed!.phase).toBe('ended')
    expect(player(late.room, 'p1').score).toBe(0)

    const typed = ok(r, 'p1', { type: 'input', input: '12' })
    expect(player(typed, 'p1').input).toBe('12')
    expect(apply(typed, 'p1', { type: 'input', input: '12' }, T0 + 10, seeds).effects).toEqual([])
    expect(apply(r, 'host01', { type: 'input', input: '1' }, T0 + 10, seeds).effects).toEqual([])
    expect(apply(cd, 'p1', { type: 'input', input: '1' }, T0 + 10, seeds).effects).toEqual([])
  })

  it('比赛中（倒数或打）新来的人只能观战并收到 started，也不能换队；掉线 / 离开再回来的选手接回原来的队，比赛里的在线状态与名字跟上', () => {
    let r = bossPlaying()
    const late = join(r, { clientId: 'late01', name: '晚', t: 'red', version: V }, T0 + 20)
    expect(late.error).toBe('started')
    expect(late.room.members.find((m) => m.clientId === 'late01')!.role).toBe('watch')
    expect(late.room.timed!.players.map((p) => p.id)).toEqual(['p1', 'p2'])
    expect(errorOf(late.room, 'late01', { type: 'team', role: 'red' })).toBe('started')
    const cd = autoStart(joined(joined(bossRoom(), 'p1', 'red'), 'p2', 'red'), T0 + 5, seeds).room
    expect(join(cd, { clientId: 'late02', name: '晚', version: V }, T0 + 6).error).toBe('started')

    r = setOnline(r, 'p2', false, T0 + 30).room
    expect(player(r, 'p2').online).toBe(false)
    r = join(r, { clientId: 'p2', name: '新名字', version: V }, T0 + 40).room
    expect(player(r, 'p2')).toMatchObject({ online: true, name: '新名字' })
    r = ok(r, 'p1', { type: 'leave' })
    expect(r.members.find((m) => m.clientId === 'p1')).toBeUndefined()
    expect(player(r, 'p1').online).toBe(false)
    const back = join(r, { clientId: 'p1', name: 'p1', t: 'watch', version: V }, T0 + 50)
    expect(back.error).toBeUndefined()
    expect(back.room.members.find((m) => m.clientId === 'p1')!.role).toBe('red')
    expect(player(back.room, 'p1').online).toBe(true)
  })

  it('再来一局 / 下一章 / 不玩了：比赛中忽略不报错，时间到之后谁都能按；下一章换知识点、种子重发、分数清零、Boss 回到第 1 只；一起打只剩 1 个参赛者再来一局报 bad；主持人中途结束回大厅', () => {
    let r = bossPlaying()
    for (const msg of [{ type: 'rematch' }, { type: 'next', kpId: 's1-06-x', skin: 'car' }, { type: 'quit' }] as ClientMsg[]) expect(at(r, 'p1', msg, T0 + 10)).toEqual({ room: r, effects: [] })
    const ends = r.timed!.endsAt
    r = hit(r, 'p1', 0, r.timed!.startedAt + 100).room
    r = tick(r, ends + GRACE_MS).room
    expect(r.timed!.phase).toBe('ended')
    const seedsBefore = r.timed!.players.map((p) => p.seed)
    expect(errorOf(r, 'p2', { type: 'next', kpId: '', skin: 'race' })).toBe('bad')
    const nx = at(r, 'p2', { type: 'next', kpId: 's1-06-x', skin: 'car' }, ends + 5000)
    expect(nx.effects).toEqual([{ type: 'broadcast' }, { type: 'event', e: { type: 'countdown' } }])
    r = nx.room
    expect(r).toMatchObject({ kpId: 's1-06-x', skin: 'car', format: 'boss', boss: COOP, match: null, matchNo: 2 })
    expect(r.timed).toMatchObject({ kpId: 's1-06-x', boss: 'dino', variant: 'coop', phase: 'countdown', startedAt: ends + 5000 + COUNTDOWN_MS, lastTen: false, winner: null })
    expect(r.timed!.players.map((p) => [p.id, p.score, p.index])).toEqual([
      ['p1', 0, 0],
      ['p2', 0, 0],
    ])
    expect(r.timed!.players.map((p) => p.seed)).not.toEqual(seedsBefore)
    expect(r.timed!.bosses).toEqual([{ side: 'shared', level: 1, hp: bossHp(1, 2, D), max: bossHp(1, 2, D), downs: 0, fighters: 2 }])

    const finish = (x: Room): Room => {
      const p = tick(x, x.timed!.startedAt).room
      return tick(p, p.timed!.endsAt + GRACE_MS).room
    }
    r = ok(finish(r), 'p1', { type: 'rematch' })
    expect(r.timed).toMatchObject({ kpId: 's1-06-x', phase: 'countdown' })
    expect(r.matchNo).toBe(3)
    r = finish(r)
    expect(apply(r, 'host01', { type: 'quit' }, T0 + 10, seeds).effects).toEqual([{ type: 'close' }])
    const alone = ok(r, 'p2', { type: 'leave' })
    expect(errorOf(alone, 'p1', { type: 'rematch' })).toBe('bad')

    let e = bossPlaying()
    expect(errorOf(e, 'p1', { type: 'end' })).toBe('notHost')
    e = ok(e, 'host01', { type: 'end' })
    expect(e.timed).toBeNull()
    expect(e.match).toBeNull()
  })

  it('各打各的：两边各打自己的 Boss，时间到按队合计得分定胜负', () => {
    let r = bossPlaying({ variant: 'versus' }, ['red', 'blue'])
    const s = r.timed!.startedAt
    const res = hit(r, 'p2', 0, s + 100)
    expect(res.effects).toContainEqual({ type: 'event', e: expect.objectContaining({ type: 'hit', side: 'blue', together: false }) })
    r = res.room
    const blue = r.timed!.bosses.find((b) => b.side === 'blue')!
    expect(blue.hp).toBe(blue.max - 1)
    expect(r.timed!.bosses.find((b) => b.side === 'red')!.hp).toBe(bossHp(1, 1, D))
    expect(tick(r, r.timed!.endsAt + GRACE_MS).effects).toContainEqual({ type: 'event', e: { type: 'finished', winner: 'blue' } })
  })
})
