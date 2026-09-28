// @vitest-environment happy-dom
// 房间页与内容包按需加载（需求 N8）：扫码直接进语文的房间时语文内容包可能还没加载——快照先攒着，加载好再交给比赛。
// 加载由这里控制（什么时候算加载好），生成器本身静态导入（applyState 要查得到）。
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import '@/content/chinese/grade1'
import { FakeWs } from '@/battle/__tests__/fake-socket'
import { createRoom, join, snapshot, type Room } from '../../../server/room'
import { useBattleStore } from '../battle'
import { useRoomStore } from '../room'

const gate = vi.hoisted(() => ({ loaded: false, calls: 0, finish: (): void => {} }))
vi.mock('@/engine/catalog', async (orig) => {
  const real = await orig<typeof import('@/engine/catalog')>()
  return {
    ...real,
    courseLoaded: (id: string) => (id === 'chinese-g1' ? gate.loaded : real.courseLoaded(id)),
    loadCourse: (id: string) => {
      if (id !== 'chinese-g1') return real.loadCourse(id)
      gate.calls += 1
      return new Promise<void>((resolve) => {
        gate.finish = () => {
          gate.loaded = true
          resolve()
        }
      })
    },
  }
})

const KP = 'c1s1-05-qiutian'
const CODE = 'ABC234'
const HOST = 'hhhhhh'

function roomWith(me: string, name = '小兔'): Room {
  const r = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: HOST, name: '主持' }, version: 'v1', now: 1000 })
  return join(r, { clientId: me, name, t: 'red', version: 'v1' }, 2000).room
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  FakeWs.reset()
  gate.loaded = false
  gate.calls = 0
})

describe('房间页：知识点属于还没加载的课（N8）', () => {
  it('快照先攒着（只留最新的）、事件按顺序攒着；加载好了先交快照再交事件，之后的快照直接处理', async () => {
    const room = useRoomStore()
    const battle = useBattleStore()
    const sync = vi.spyOn(battle, 'syncOnline')
    const remote = vi.spyOn(battle, 'onRemoteEvent')
    room.useFactory((url) => new FakeWs(url))
    room.enter(CODE, 'red')
    const ws = FakeWs.last()
    ws.open()
    const me = battle.prefs.clientId
    ws.receive({ type: 'state', room: snapshot(roomWith(me, '第一份')), you: me, now: 5000 })
    ws.receive({ type: 'event', e: { type: 'countdown', startsAt: 9000 } as never })
    ws.receive({ type: 'state', room: snapshot(roomWith(me, '第二份')), you: me, now: 5100 })
    expect(gate.calls).toBe(1)
    expect(room.snapshot).toBeNull()
    expect(sync).not.toHaveBeenCalled()
    expect(remote).not.toHaveBeenCalled()
    expect(room.error).toBeNull()

    gate.finish()
    await flushPromises()
    expect(room.snapshot?.kpId).toBe(KP)
    expect(room.me?.name).toBe('第二份')
    expect(sync).toHaveBeenCalledTimes(1)
    expect(remote).toHaveBeenCalledTimes(1)
    expect(sync.mock.invocationCallOrder[0]!).toBeLessThan(remote.mock.invocationCallOrder[0]!)

    ws.receive({ type: 'state', room: snapshot(roomWith(me, '第三份')), you: me, now: 5200 })
    expect(room.me?.name).toBe('第三份')
    expect(gate.calls).toBe(1)
    room.leave()
  })

  it('加载期间离开或换了房间：加载好也不再处理那份快照', async () => {
    const room = useRoomStore()
    room.useFactory((url) => new FakeWs(url))
    room.enter(CODE, 'red')
    const ws = FakeWs.last()
    ws.open()
    const me = useBattleStore().prefs.clientId
    ws.receive({ type: 'state', room: snapshot(roomWith(me)), you: me, now: 5000 })
    expect(room.snapshot).toBeNull()
    room.leave()
    gate.finish()
    await flushPromises()
    expect(room.snapshot).toBeNull()
    expect(room.error).toBeNull()
  })
})
