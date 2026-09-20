// @vitest-environment happy-dom
// 提示语自动朗读（B39a）：页面打开 / 换到某个功能 / 弹出面板或提示时，把屏幕上的提示语读出来（还不太会认字的孩子靠听）。
// 这里把 engine/voice 换成记录调用的假的，只看「什么时候读了哪几条词条」；词条都有音频由 audio/__tests__/manifest.test.ts 保证。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { setLang } from '@/engine/i18n'
import { sayKeys } from '@/engine/voice'
import { useBattleStore } from '@/stores/battle'
import { useRoomStore } from '@/stores/room'
import { FakeWs } from '@/battle/__tests__/fake-socket'
import { createRoom, join, snapshot, type Room } from '../../../server/room'
import '@/views/battle/BattleSetupView.vue'
import '@/views/battle/BattleArenaView.vue'
import '@/views/battle/BattleRoomView.vue'

vi.mock('@/engine/voice', async (orig) => ({
  ...(await orig<typeof import('@/engine/voice')>()),
  say: vi.fn(() => Promise.resolve()),
  sayKeys: vi.fn(() => Promise.resolve()),
  hush: vi.fn(),
  warmUp: vi.fn(),
}))

const BATTLE_KEY = 'tongbulian:battle'
const KP = 's1-04-simple-addsub'
const CODE = 'ABC234'

/** 到目前为止读过的词条（按次序） */
const spoken = (): string[][] => vi.mocked(sayKeys).mock.calls.map((c) => c[0])
const lastSpoken = (): string[] | undefined => spoken().at(-1)

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await flushPromises()
}
async function until(pred: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !pred(); i++) await flushPromises()
  expect(pred()).toBe(true)
  await settle()
}

async function mountAt(path: string, before?: () => void) {
  const pinia = createPinia()
  setActivePinia(pinia)
  before?.()
  await router.replace(path)
  await router.isReady()
  const w = mount(App, { global: { plugins: [router, pinia] } })
  await settle()
  return w
}
const named = (): void => localStorage.setItem(BATTLE_KEY, JSON.stringify({ names: { me: '小兔', left: '', right: '' } }))

beforeEach(() => {
  vi.mocked(sayKeys).mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  FakeWs.reset()
  localStorage.clear()
  setLang('zh')
})

describe('对战设置页', () => {
  it('打开读「跟谁打？」+ 当前卡的说明（切页动画后开口）；换卡读那张卡的说明；点开始没名字弹出问名字面板读「你叫什么？」；离开停声', async () => {
    const w = await mountAt(`/battle/new/${KP}`)
    expect(spoken()).toEqual([['battle.who', 'battle.mode.ai.desc']])
    expect(vi.mocked(sayKeys).mock.calls[0]![2]).toBeGreaterThan(0)
    await w.findAll('.mode')[1]!.trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.duo.desc'])
    await w.findAll('.mode')[0]!.trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.ai.desc'])
    await w.find('.start-btn').trigger('click')
    await settle()
    expect(w.find('form.sheet').exists()).toBe(true)
    expect(lastSpoken()).toEqual(['battle.name.ask'])
    const { hush } = await import('@/engine/voice')
    vi.mocked(hush).mockClear()
    w.unmount()
    expect(hush).toHaveBeenCalled()
  })

  it('建房连不上服务：8 秒后的提示也读出来', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/new/${KP}`, named)
    const room = useRoomStore()
    room.useFactory((url) => new FakeWs(url))
    await w.findAll('.mode')[2]!.trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.online.desc'])
    await w.find('.start-btn').trigger('click')
    vi.advanceTimersByTime(8100)
    await settle()
    expect(w.find('.room-error').exists()).toBe(true)
    expect(lastSpoken()).toEqual(['room.connect.slow'])
    w.unmount()
  })
})

describe('竞技场', () => {
  it('点 ✕ 弹出退出确认时读「要退出比赛吗？」', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/local/${KP}?mode=ai`, named)
    expect(spoken()).toEqual([]) // 竞技场里由倒数 / 读题接手，不读别的提示
    await w.find('.bar-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.exit.ask'])
    w.unmount()
  })
})

describe('多设备房间', () => {
  it('建房的设备：进二维码页读扫码说明；一队进来读「已进入 / 以另一队进入」的提示；以观战方进入读连接状态窗口的两句；显示二维码再读一遍', async () => {
    // 有名字的设备一挂就连：假 socket 要在挂载前装好
    const w = await mountAt(`/battle/${CODE}?t=watch`, () => {
      named()
      useRoomStore().useFactory((url) => new FakeWs(url))
    })
    const battle = useBattleStore()
    const ws = FakeWs.last()
    ws.open()
    expect(spoken()).toEqual([]) // 正在连接：不读
    const me = battle.prefs.clientId
    let r: Room = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: me, name: '小兔' }, version: 'v1', now: 1000 })
    const push = (): void => ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })
    push()
    await settle()
    expect(w.find('.codes-page').exists()).toBe(true)
    expect(spoken()).toEqual([['room.scan']])
    push() // 同一画面再来一份快照：不重复读
    await settle()
    expect(spoken()).toHaveLength(1)
    r = join(r, { clientId: 'rrrrrr', name: '小猫', t: 'red', version: 'v1' }, 2500).room
    push()
    await settle()
    expect(lastSpoken()).toEqual(['room.enter.hint.red'])
    await w.find('.code-card.watch .chip.enter').trigger('click')
    await settle()
    expect(w.find('.wait').exists()).toBe(true)
    expect(lastSpoken()).toEqual(['room.wait.title', 'room.wait.sub'])
    await w.find('.chip.codes-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['room.enter.hint.red'])
    w.unmount()
  })

  it('扫红队码进来：先问名字（面板自己读）→ 进房读连接状态窗口的两句 → 连太久读「连不上」→ 提示条（比赛已经开始）也读 → 房间关了读错误', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/${CODE}?t=red`)
    const room = useRoomStore()
    const battle = useBattleStore()
    room.useFactory((url) => new FakeWs(url))
    expect(spoken()).toEqual([['battle.name.ask']])
    await w.find('.sheet .chip').trigger('click')
    await w.find('form.sheet').trigger('submit')
    await settle()
    const ws = FakeWs.last()
    ws.open()
    expect(spoken()).toHaveLength(1)
    vi.advanceTimersByTime(8100)
    await settle()
    expect(lastSpoken()).toEqual(['room.connect.slow'])
    const me = battle.prefs.clientId
    let r: Room = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: 'hhhhhh', name: '主持' }, version: 'v1', now: 1000 })
    r = join(r, { clientId: me, name: '小猫', t: 'red', version: 'v1' }, 2000).room
    ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })
    await settle()
    expect(w.find('.wait').exists()).toBe(true)
    expect(lastSpoken()).toEqual(['room.wait.title', 'room.wait.sub'])
    ws.receive({ type: 'error', error: 'teamFull' })
    await settle()
    expect(lastSpoken()).toEqual(['room.error.teamFull'])
    ws.receive({ type: 'error', error: 'closed' })
    await settle()
    expect(lastSpoken()).toEqual(['room.error.closed'])
    w.unmount()
  })

  it('顶栏「加入对战」面板打开读「输入口令」+ 说明；口令不对读提示', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt('/', named)
    const room = useRoomStore()
    room.useFactory((url) => new FakeWs(url))
    await w.find('.app-header .nav-btn.join').trigger('click')
    await settle()
    expect(spoken()).toEqual([['room.join.title', 'room.join.hint']])
    await w.find('.join-sheet input').setValue('123456')
    await w.find('form.join-sheet').trigger('submit')
    const ws = FakeWs.last()
    ws.open()
    ws.receive({ type: 'error', error: 'noRoom' })
    await settle()
    expect(lastSpoken()).toEqual(['room.join.wrong'])
    await until(() => !!w.find('.join-sheet .error').exists())
    w.unmount()
  })
})
