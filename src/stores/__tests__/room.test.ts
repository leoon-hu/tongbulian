// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import type { Question } from '@/types/models'
import { COUNTDOWN_MS } from '@/battle/match'
import { FakeWs } from '@/battle/__tests__/fake-socket'
import { apply, createRoom, join, snapshot, tick, type Room } from '../../../server/room'
import { nextKp } from '@/engine/catalog'
import { chapterSkin } from '@/battle/skins'
import { ANSWER_WAIT_MS, FEEDBACK_RIGHT_MS, useBattleStore } from '../battle'
import { useRoomStore } from '../room'
import { reloadForNewVersion } from '@/engine/update'

vi.mock('@/engine/update', async (orig) => ({ ...(await orig<typeof import('@/engine/update')>()), reloadForNewVersion: vi.fn(async () => true) }))

/** 上册倒数第二个知识点：「下一章」还有下一个（s1-05-carry-add 是最后一个） */
const KP = 's1-04-simple-addsub'
const CODE = 'ABC234'
const HOST = 'hhhhhh'
let seedN = 0
const seeds = (): number => ++seedN

function correctOf(q: Question): number | string {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}

/** 服务器那边的房间：主持人 hhhhhh 建房（观战），me 从红队链接进来 */
function roomWith(me: string): Room {
  const r = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: HOST, name: '主持' }, version: 'v1', now: 1000 })
  return join(r, { clientId: me, name: '小兔', t: 'red', version: 'v1' }, 2000).room
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  FakeWs.reset()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('房间 store（B19–B25）', () => {
  it('进房：连上后 hello 带房间号与身份；快照进来后 me / isHost / 名单都对；提示类错误 3 秒自己清、致命的留着；离开释放座位', () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    battle.setName('me', '小兔')
    room.useFactory((url) => new FakeWs(url))
    expect(room.available).toBe(true)
    room.enter(CODE, 'red')
    expect(room.status).toBe('connecting')
    expect(room.code).toBe(CODE)
    expect(battle.mode).toBe('online')
    const ws = FakeWs.last()
    ws.open()
    expect(room.status).toBe('open')
    const me = battle.prefs.clientId
    expect(ws.msgs[0]).toMatchObject({ type: 'hello', clientId: me, name: '小兔', code: CODE, t: 'red' })

    let r = roomWith(me)
    ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })
    expect(room.you).toBe(me)
    expect(room.me?.role).toBe('red')
    expect(room.isHost).toBe(false)
    expect(room.participants.map((m) => m.clientId)).toEqual([me])
    expect(room.watchers.map((m) => m.clientId)).toEqual([HOST])
    expect(room.teamMembers('red').map((m) => m.name)).toEqual(['小兔'])
    expect(room.teamMembers('blue')).toEqual([])
    expect(room.inMatch).toBe(false)
    expect(battle.state).toBeNull()
    expect(battle.online).toEqual({ you: me, hostId: HOST })

    ws.receive({ type: 'state', room: snapshot(r), you: HOST, now: 5000 })
    expect(room.isHost).toBe(true)
    ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })

    ws.receive({ type: 'error', error: 'teamFull' })
    expect(room.error).toBe('teamFull')
    vi.advanceTimersByTime(3000)
    expect(room.error).toBeNull()
    ws.receive({ type: 'error', error: 'closed' })
    vi.advanceTimersByTime(10_000)
    expect(room.error).toBe('closed')

    ws.sent.length = 0
    room.leave()
    expect(ws.msgs).toEqual([{ type: 'leave' }])
    expect(ws.closed).toBe(true)
    expect(room.status).toBe('idle')
    expect(room.snapshot).toBeNull()
    expect(room.code).toBeNull()
    expect(battle.mode).toBeNull()
  })

  it('建房：连上后先 hello（不带房间号）再 create；拿到快照就有房间号、自己是主持人、只观战', () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    battle.setName('me', '小兔')
    room.useFactory((url) => new FakeWs(url))
    room.create(KP, 'race')
    const ws = FakeWs.last()
    expect(ws.sent).toEqual([])
    ws.open()
    const me = battle.prefs.clientId
    expect(ws.msgs).toEqual([
      { type: 'hello', clientId: me, name: '小兔', version: expect.any(String) },
      { type: 'create', kpId: KP, skin: 'race' },
    ])
    const r = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: me, name: '小兔' }, version: 'v1', now: 1000 })
    ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })
    expect(room.code).toBe(CODE)
    expect(room.isHost).toBe(true)
    expect(room.me?.role).toBe('watch') // 建房的设备只观战
  })

  it('版本旧了（B43）：收到 version 就标 updating 并自己更新重载；重载不了（同版本试过）就 updating 归 false、错误留着', async () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    battle.setName('me', '小兔')
    room.useFactory((url) => new FakeWs(url))
    const reload = vi.mocked(reloadForNewVersion)
    reload.mockClear()
    room.enter(CODE, 'red')
    const ws = FakeWs.last()
    ws.open()
    ws.receive({ type: 'error', error: 'version' })
    expect(room.error).toBe('version')
    expect(room.updating).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)
    await Promise.resolve()
    expect(room.updating).toBe(true) // 返回 true：页面马上重载，保持「正在更新」
    room.leave()
    reload.mockResolvedValueOnce(false)
    room.enter(CODE, 'red')
    FakeWs.last().open()
    FakeWs.last().receive({ type: 'error', error: 'version' })
    expect(room.updating).toBe(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(room.updating).toBe(false)
    expect(room.error).toBe('version')
  })

  it('口令（B19）：lookup 连上先 hello（不带房间号）再发 lookup；found 进 room.found；不认识的口令是致命错误留着', () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    battle.setName('me', '小兔')
    room.useFactory((url) => new FakeWs(url))
    room.lookup('123456')
    const ws = FakeWs.last()
    ws.open()
    expect(ws.msgs).toEqual([
      { type: 'hello', clientId: battle.prefs.clientId, name: '小兔', version: expect.any(String) },
      { type: 'lookup', pass: '123456' },
    ])
    expect(room.found).toBeNull()
    ws.receive({ type: 'found', code: CODE, t: 'blue' })
    expect(room.found).toEqual({ code: CODE, t: 'blue' })
    room.lookup('654321')
    expect(room.found).toBeNull()
    expect(ws.closed).toBe(true)
    const ws2 = FakeWs.last()
    ws2.open()
    ws2.receive({ type: 'error', error: 'noRoom' })
    vi.advanceTimersByTime(5000)
    expect(room.error).toBe('noRoom')
    room.leave()
    expect(room.error).toBeNull()
  })

  it('比赛：快照里的 match 进 battle store，只有自己那行可操作；输入节流发出；答题只发消息、反馈等服务器推进了题号才关；事件进队列；再来一局 / 下一章发给服务器；观战者没有可操作行', () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    battle.setName('me', '小兔')
    room.useFactory((url) => new FakeWs(url))
    room.enter(CODE, 'red')
    const ws = FakeWs.last()
    ws.open()
    const me = battle.prefs.clientId
    let r = roomWith(me)
    r = apply(r, HOST, { type: 'team', role: 'blue' }, 3000, seeds).room
    let serverNow = 5000
    const feed = (): void => ws.receive({ type: 'state', room: snapshot(r), you: me, now: serverNow })
    const applyAndFeed = (from: string, msg: Parameters<typeof apply>[2], now: number): void => {
      const res = apply(r, from, msg, now, seeds)
      r = res.room
      for (const e of res.effects) if (e.type === 'event') ws.receive({ type: 'event', e: e.e })
      feed()
    }

    // 服务器时钟比本机快 1 小时：用时按服务器时钟算，不会算出负数
    serverNow = Date.now() + 3_600_000
    applyAndFeed(HOST, { type: 'start' }, 3000)
    expect(battle.now() - Date.now()).toBeGreaterThan(3_599_000)
    expect(battle.state?.phase).toBe('countdown')
    expect(battle.operable).toEqual([me])
    expect(room.inMatch).toBe(true)
    expect(battle.events[battle.events.length - 1]?.e).toEqual({ type: 'countdown' })
    expect(battle.intro).toBe(false)
    battle.beginPlay() // 线上模式：开打由服务器定，这里不动
    expect(battle.state?.phase).toBe('countdown')

    r = tick(r, 3000 + COUNTDOWN_MS).room
    ws.receive({ type: 'event', e: { type: 'go' } })
    feed()
    expect(battle.state?.phase).toBe('playing')
    expect(battle.events[battle.events.length - 1]?.e).toEqual({ type: 'go' })

    ws.sent.length = 0
    battle.setInput(me, '1')
    battle.setInput(me, '12')
    expect(ws.msgs).toEqual([])
    vi.advanceTimersByTime(100)
    expect(ws.msgs).toEqual([{ type: 'input', input: '12' }])

    const p = battle.state!.players.find((x) => x.id === me)!
    const q = battle.questionOf(p)
    ws.sent.length = 0
    battle.submit(me, correctOf(q))
    expect(ws.msgs).toEqual([{ type: 'answer', index: 0, given: String(correctOf(q)), correct: true }])
    expect(battle.pending[me]?.correct).toBe(true)
    expect(battle.state!.score.red).toBe(0) // 本地不加分，等服务器
    battle.submit(me, correctOf(q)) // 反馈窗口里再按不重复发
    expect(ws.msgs).toHaveLength(1)
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 100)
    expect(battle.pending[me]).toBeDefined() // 快照还没推进题号
    applyAndFeed(me, { type: 'answer', index: 0, given: '7', correct: true }, 8000)
    expect(battle.pending[me]).toBeUndefined()
    // 消息丢了：等 ANSWER_WAIT_MS 没等到快照推进就放开这题
    ws.sent.length = 0
    battle.submit(me, correctOf(battle.questionOf(battle.state!.players.find((x) => x.id === me)!)))
    expect(ws.msgs).toHaveLength(1)
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + ANSWER_WAIT_MS - 10)
    expect(battle.pending[me]).toBeDefined()
    vi.advanceTimersByTime(20)
    expect(battle.pending[me]).toBeUndefined()
    expect(battle.state!.score.red).toBe(1)
    expect(battle.events.some((x) => x.e.type === 'point')).toBe(true)

    for (let i = 1; i < 8; i++) applyAndFeed(me, { type: 'answer', index: i, given: '7', correct: true }, 8000 + i)
    expect(battle.state!.phase).toBe('ended')
    expect(battle.state!.winner).toBe('red')
    expect(battle.events[battle.events.length - 1]?.e).toEqual({ type: 'finished', winner: 'red' })

    ws.sent.length = 0
    battle.rematch()
    expect(ws.msgs).toEqual([{ type: 'rematch' }])
    applyAndFeed(HOST, { type: 'rematch' }, 20_000)
    expect(battle.state?.phase).toBe('countdown')
    expect(battle.state?.score).toEqual({ red: 0, blue: 0 })
    expect(battle.pending).toEqual({})
    expect(battle.events[battle.events.length - 1]?.e).toEqual({ type: 'countdown' }) // 事件先于快照到，不能被清掉

    // 下一章（B9）：发 next 带本册下一个知识点与它按章节排到的皮肤；服务器开新一局后本机状态换成新知识点、比分清零
    r = tick(r, 20_000 + COUNTDOWN_MS).room
    ws.receive({ type: 'event', e: { type: 'go' } })
    feed()
    for (let i = 0; i < 8; i++) applyAndFeed(me, { type: 'answer', index: i, given: '7', correct: true }, 30_000 + i)
    expect(battle.state?.phase).toBe('ended')
    const NEXT = nextKp(KP)!
    expect(NEXT).toBeTruthy()
    ws.sent.length = 0
    battle.nextChapter(NEXT, chapterSkin(NEXT))
    expect(ws.msgs).toEqual([{ type: 'next', kpId: NEXT, skin: chapterSkin(NEXT) }])
    applyAndFeed(HOST, { type: 'next', kpId: NEXT, skin: chapterSkin(NEXT) }, 40_000)
    expect(battle.state?.kpId).toBe(NEXT)
    expect(battle.state?.skin).toBe(chapterSkin(NEXT))
    expect(battle.state?.phase).toBe('countdown')
    expect(battle.state?.score).toEqual({ red: 0, blue: 0 })
    expect(battle.pending).toEqual({})
    expect(battle.operable).toEqual([me])
    expect(battle.questionOf(battle.state!.players.find((x) => x.id === me)!)).toBeTruthy()
    // 不玩了（B9）：发 quit；服务器关房间发 closed → 致命错误留着
    ws.sent.length = 0
    battle.quit()
    expect(ws.msgs).toEqual([{ type: 'quit' }])

    ws.receive({ type: 'state', room: snapshot(r), you: 'zzzzzz', now: 5000 })
    expect(battle.operable).toEqual([])
    room.leave()
    expect(battle.state).toBeNull()
  })
})
