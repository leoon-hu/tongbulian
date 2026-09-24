// @vitest-environment happy-dom
// 提示语自动朗读（B39a）：页面打开 / 换到某个功能 / 弹出面板或提示时，把屏幕上的提示语读出来（还不太会认字的孩子靠听）。
// 这里把 engine/voice 换成记录调用的假的，只看「什么时候读了哪几条词条」；词条都有音频由 audio/__tests__/manifest.test.ts 保证。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { setLang } from '@/engine/i18n'
import { forget, hush, say, sayKeys } from '@/engine/voice'
import { useBattleStore } from '@/stores/battle'
import { useRoomStore } from '@/stores/room'
import { useVoiceStore } from '@/stores/voice'
import { FakeWs } from '@/battle/__tests__/fake-socket'
import { fakePeerDeps, fakeStream } from '@/battle/__tests__/fake-rtc'
import { createRoom, join, snapshot, type Room } from '../../../server/room'
import '@/views/battle/BattleSetupView.vue'
import '@/views/battle/BattleArenaView.vue'
import '@/views/battle/BattleRoomView.vue'
// 「加入对战」面板在 App 里是按需加载的（N8）：这里先静态引一次，dynamic import 走缓存立刻就绪，用例不用等编译
import '@/components/battle/JoinSheet.vue'

vi.mock('@/engine/voice', async (orig) => ({
  ...(await orig<typeof import('@/engine/voice')>()),
  say: vi.fn(() => Promise.resolve()),
  sayKeys: vi.fn(() => Promise.resolve()),
  hush: vi.fn(),
  forget: vi.fn(),
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
  vi.mocked(say).mockClear()
  vi.mocked(forget).mockClear()
})
afterEach(() => {
  vi.useRealTimers()
  FakeWs.reset()
  localStorage.clear()
  setLang('zh')
})

describe('知识点地图', () => {
  it('地图本身不读；点知识点直接到设置页，读「怎么练？」+ 选着的那张卡的说明（B26：没有中间的选择面板）', async () => {
    const w = await mountAt('/s/math/g/g1')
    expect(spoken()).toEqual([])
    await w.find('.node.open').trigger('click')
    await until(() => w.find('.setup').exists())
    await settle()
    expect(spoken()).toEqual([['battle.how', 'battle.mode.practice.desc']]) // 默认选着自己练
    await w.find('.mode[data-mode="ai"]').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.ai.desc'])
    w.unmount()
  })
})

describe('对战设置页', () => {
  it('打开读「怎么练？」+ 当前卡的说明（切页动画后开口）；换卡读那张卡的说明；配置里点名字弹出改名字面板读「你叫什么？」；离开停声', async () => {
    const w = await mountAt(`/battle/new/${KP}`)
    expect(spoken()).toEqual([['battle.how', 'battle.mode.practice.desc']])
    expect(vi.mocked(sayKeys).mock.calls[0]![2]).toBeGreaterThan(0)
    await w.find('.mode[data-mode="duo"]').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.duo.desc'])
    await w.find('.mode[data-mode="ai"]').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.mode.ai.desc'])
    await w.find('.config-btn').trigger('click')
    await w.find('.config .name-chip.red').trigger('click')
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
    await w.find('.mode[data-mode="online"]').trigger('click')
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
  it('点 ✕ 弹出退出确认时读「要退出比赛吗？」（排在读题后面）；「继续比赛」关掉就撤回', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/local/${KP}?mode=ai`, named)
    expect(spoken()).toEqual([]) // 竞技场里由倒数 / 读题接手，不读别的提示
    await w.find('.bar-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['battle.exit.ask'])
    expect(vi.mocked(sayKeys).mock.calls.at(-1)![3]).toEqual({ mode: 'wait', key: 'exit' })
    await w.find('.confirm-actions button').trigger('click')
    await settle()
    expect(w.find('.confirm').exists()).toBe(false)
    expect(forget).toHaveBeenCalledWith('exit')
    w.unmount()
  })

  // B37：点 🔊 读题必须播完，自己再点、另一方点都不打断（排在后面）；自动读的也排在它后面；弹出提示不打断
  it('两人同屏点 🔊：每一行按自己的 key 以「必须播完」的播法读，另一行点了不 hush', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    localStorage.setItem(BATTLE_KEY, JSON.stringify({ names: { me: '小兔', left: '', right: '小虎' } }))
    const w = await mountAt(`/battle/local/${KP}?mode=duo`)
    const store = useBattleStore()
    store.beginPlay()
    await settle()
    vi.mocked(say).mockClear()
    vi.mocked(hush).mockClear()
    await w.find('.team.red .row.operable .q').trigger('click')
    await w.find('.team.blue .row.operable .q').trigger('click')
    await w.find('.team.red .row.operable .q').trigger('click')
    const calls = vi.mocked(say).mock.calls
    expect(calls.map((c) => c[3])).toEqual([
      { mode: 'hold', key: 'q:left' },
      { mode: 'hold', key: 'q:right' },
      { mode: 'hold', key: 'q:left' },
    ])
    expect(calls[0]![0].length).toBeGreaterThan(0) // 读的是题干
    expect(hush).not.toHaveBeenCalled()
    w.unmount()
  })

  it('打机器人：进题自动读的排在必须播完的后面（wait，按行的 key）；弹出提示 skip；播报 wait', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/local/${KP}?mode=ai`, named)
    const store = useBattleStore()
    vi.mocked(say).mockClear()
    store.beginPlay()
    await settle()
    const auto = vi.mocked(say).mock.calls.find((c) => c[3]?.key === 'q:left')
    expect(auto?.[2]).toBe(150)
    expect(auto?.[3]).toEqual({ mode: 'wait', key: 'q:left' })
    vi.mocked(say).mockClear()
    store.callout = { id: 1, key: 'battle.streak', p: { n: 3 }, team: 'red' }
    await settle()
    expect(vi.mocked(say).mock.calls.at(-1)![3]).toEqual({ mode: 'skip' })
    vi.mocked(say).mockClear()
    store.state = { ...store.state!, phase: 'ended', winner: 'red' }
    await settle()
    vi.advanceTimersByTime(1000)
    await settle()
    // 播报是 wait（机器人开局那句「我准备好啦」也在这段时间里读了，所以不看最后一条）
    expect(vi.mocked(say).mock.calls.some((c) => c[3]?.mode === 'wait' && c[3]?.key === 'finish')).toBe(true)
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

  it('扫红队码进来：不问名字直接连 → 进房读连接状态窗口的两句 → 连太久读「连不上」→ 提示条（比赛已经开始）也读 → 房间关了读错误', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/battle/${CODE}?t=red`, () => useRoomStore().useFactory((url) => new FakeWs(url)))
    const battle = useBattleStore()
    await settle()
    expect(w.find('form.sheet').exists()).toBe(false)
    const ws = FakeWs.last()
    ws.open()
    expect(spoken()).toHaveLength(0)
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
    await until(() => w.find('.join-sheet').exists())
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

  it('语音（B57）：点 🎤 开了读「语音开了」、关了读「语音关了」；拒绝权限读「没有拿到麦克风的权限」', async () => {
    const w = await mountAt(`/battle/${CODE}?t=red`, () => {
      named()
      useRoomStore().useFactory((url) => new FakeWs(url))
      useVoiceStore().useDeps({ getUserMedia: async () => fakeStream(), supported: () => true, peer: fakePeerDeps() })
    })
    const battle = useBattleStore()
    const ws = FakeWs.last()
    ws.open()
    const me = battle.prefs.clientId
    let r: Room = createRoom({ code: CODE, kpId: KP, skin: 'race', host: { clientId: 'hhhhhh', name: '主持' }, version: 'v1', now: 1000 })
    r = join(r, { clientId: me, name: '小兔', t: 'red', version: 'v1' }, 2000).room
    ws.receive({ type: 'state', room: snapshot(r), you: me, now: 5000 })
    await settle()
    expect(lastSpoken()).toEqual(['room.wait.title', 'room.wait.sub'])
    await w.find('.wait .mic-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['mic.on'])
    await w.find('.wait .mic-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['mic.off'])
    useVoiceStore().useDeps({
      getUserMedia: async () => {
        throw new Error('NotAllowedError')
      },
      supported: () => true,
      peer: fakePeerDeps(),
    })
    await w.find('.wait .mic-btn').trigger('click')
    await settle()
    expect(lastSpoken()).toEqual(['mic.denied'])
    expect(w.find('.wait .voice-msg').exists()).toBe(true)
    w.unmount()
  })
})

describe('表情（B58）', () => {
  it('🔥 加油飞出去时读一声「加油！」（skip 播法，正在读题就不读）；别的表情不读', async () => {
    named()
    const w = await mountAt(`/battle/local/${KP}?mode=ai`)
    const store = useBattleStore()
    store.beginPlay()
    await settle()
    vi.mocked(say).mockClear()
    await w.find('.emotes.side-red [data-emote="laugh"]').trigger('click')
    await settle()
    const cheerCalls = () => vi.mocked(say).mock.calls.filter((c) => c[0].join('').includes('加油'))
    expect(cheerCalls()).toHaveLength(0)
    store.sendEmote('red', 'cheer', Date.now() + 1000)
    await settle()
    expect(cheerCalls()).toHaveLength(1)
    expect(cheerCalls()[0]![3]).toEqual({ mode: 'skip' })
    w.unmount()
  })
})

describe('机器人说话（B61）', () => {
  it('气泡出现就朗读那一句（skip 播法、速率 1.2 像机器人）', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    named()
    const w = await mountAt(`/battle/local/${KP}?mode=ai`)
    const store = useBattleStore()
    store.beginPlay()
    await settle()
    vi.mocked(say).mockClear()
    vi.advanceTimersByTime(500)
    await settle()
    const calls = vi.mocked(say).mock.calls.filter((c) => c[0].join('').includes('我准备好啦'))
    expect(calls).toHaveLength(1)
    expect(calls[0]![3]).toEqual({ mode: 'skip', rate: 1.2 })
    w.unmount()
  })
})

describe('角色的台词（B71）', () => {
  it('点游戏盒子：角色的台词冒出来就朗读（skip 播法、按角色的速率），气泡在盒子里', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    named()
    const w = await mountAt(`/battle/local/${KP}?mode=ai`)
    const store = useBattleStore()
    store.beginPlay()
    await settle()
    vi.mocked(say).mockClear()
    await w.find('.strip canvas').trigger('pointerdown', { clientX: 30, clientY: 30 })
    await settle()
    expect(w.find('.strip .char-bubble').exists()).toBe(true)
    expect(store.charLine?.key.startsWith('char.')).toBe(true)
    const calls = vi.mocked(say).mock.calls.filter((c) => c[3]?.rate !== undefined && c[3]?.mode === 'skip')
    expect(calls).toHaveLength(1)
    expect(calls[0]![3]).toEqual({ mode: 'skip', rate: store.charLine!.rate })
    expect(calls[0]![0].length).toBeGreaterThan(0)
    w.unmount()
  })
})
