// @vitest-environment happy-dom
// 打怪兽（需求第 10 章）的整站集成：设置页的玩法页签 → 卡片与开关 → 开始 → 竞技场（无全局顶栏、计时器、舞台、作答区）→ 打一局 → 结果页三个按钮
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { setLang } from '@/engine/i18n'
import { nextKp } from '@/engine/catalog'
import { COUNTDOWN_MS } from '@/battle/match'
import { useBossStore } from '@/stores/boss'
import { useBattleStore } from '@/stores/battle'

vi.mock('@/battle/music', () => ({ startMusic: vi.fn(), stopMusic: vi.fn(), setMusicSprint: vi.fn(), musicPlaying: () => false }))
// 视图是按需加载的：先静态引一次，路由跳转时 dynamic import 走缓存
import '@/views/battle/BattleSetupView.vue'
import '@/views/battle/BossArenaView.vue'
import '@/views/TopicMapView.vue'
import resultSource from '@/components/battle/boss/BossResult.vue?raw'

const BATTLE_KEY = 'tongbulian:battle'
/** 上册倒数第二个知识点：结果页「下一章」还有下一个 */
const KP = 's1-04-simple-addsub'

function shown(w: { element: Element }): string {
  const clone = w.element.cloneNode(true) as Element
  clone.querySelectorAll('rt').forEach((rt) => rt.remove())
  return clone.textContent ?? ''
}
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await flushPromises()
}
async function until(pred: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !pred(); i++) await flushPromises()
  expect(pred(), `现在的地址：${router.currentRoute.value.fullPath}`).toBe(true)
  await settle()
}
const pathIs = (path: string) => () => router.currentRoute.value.path === path
function correctOf(q: { answer: { kind: string; value?: number; choiceId?: string } }): number | string {
  return q.answer.kind === 'number' ? q.answer.value! : q.answer.choiceId!
}
async function mountAt(path: string) {
  const pinia = createPinia()
  setActivePinia(pinia)
  await router.replace(path)
  await router.isReady()
  const w = mount(App, { global: { plugins: [router, pinia] } })
  await settle()
  return w
}

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
  setLang('zh')
})

describe('打怪兽：设置页（M5）', () => {
  it('顶上两个玩法页签；打怪兽页签四张卡（一个人打在第一张），和机器人 / 两人一台才有「一起打 / 各打各的」；选了记进偏好', async () => {
    const w = await mountAt(`/battle/new/${KP}`)
    expect(w.findAll('.format').map((f) => f.attributes('data-format'))).toEqual(['battle', 'boss'])
    expect(w.find('.format.on').attributes('data-format')).toBe('battle')
    expect(w.findAll('.mode[data-mode]')).toHaveLength(4)
    await w.find('.format[data-format="boss"]').trigger('click')
    const cards = w.findAll('.mode[data-boss-mode]')
    expect(cards.map((c) => c.attributes('data-boss-mode'))).toEqual(['solo', 'ai', 'duo', 'online'])
    expect(cards.map((c) => c.find('.mode-pic').exists())).toEqual([true, true, true, true])
    expect(cards[0]!.find('.dino').exists()).toBe(true)
    expect(cards[1]!.find('.badge .dino').exists()).toBe(true)
    // 各用各的（M13）：这个地址有对战服务就能选
    expect(cards[3]!.attributes('disabled')).toBeUndefined()
    expect(w.find('.mode[data-boss-mode].on').attributes('data-boss-mode')).toBe('solo')
    expect(w.find('.variants').exists()).toBe(false)
    expect(shown(w.find('.mode-desc'))).toContain('一个人打捣蛋龙')
    await w.find('.mode[data-boss-mode="duo"]').trigger('click')
    expect(w.findAll('.variant').map((v) => v.attributes('data-variant'))).toEqual(['coop', 'versus'])
    await w.find('.variant[data-variant="versus"]').trigger('click')
    expect(shown(w.find('.mode-desc'))).toContain('各打各的')
    // ⚙️ 配置：打怪兽页签下有时长（默认 90 秒）与打哪个怪兽，没有选游戏
    await w.find('.config-btn').trigger('click')
    expect(w.findAll('.config .duration').map((d) => d.attributes('data-duration'))).toEqual(['60', '90', '120'])
    expect(w.find('.config .duration.on').attributes('data-duration')).toBe('90')
    expect(shown(w.find('.config'))).toContain('捣蛋龙')
    expect(w.find('.config .skins').exists()).toBe(false)
    await w.find('.config .duration[data-duration="60"]').trigger('click')
    await w.find('.config .done').trigger('click')
    // 开始：进打怪兽竞技场，地址带玩法与时长；偏好记住页签、卡、开关、时长
    await w.find('.start-btn').trigger('click')
    await until(pathIs(`/boss/local/${KP}`))
    expect(router.currentRoute.value.query).toMatchObject({ mode: 'duo', v: 'versus', t: '60' })
    const prefs = JSON.parse(localStorage.getItem(BATTLE_KEY)!)
    expect(prefs.format).toBe('boss')
    expect(prefs.boss).toEqual({ mode: 'duo', variant: 'versus', durationS: 60 })
    expect(useBossStore().state).toMatchObject({ variant: 'versus', durationMs: 60_000 })
    w.unmount()
  })
})

describe('打怪兽：结果页的样式', () => {
  it('没有裸的 .red / .blue 规则：scoped 样式会套到 BigButton 的根元素上，蓝色的「再来一局」变成蓝底蓝字（多设备有下一章时撞过）', () => {
    const css = resultSource.slice(resultSource.indexOf('<style'))
    expect(css).not.toMatch(/^\.(red|blue)\s*[{,]/m)
  })
})

describe('打怪兽：竞技场（M6 / M7）', () => {
  it('一个人打：没有全局顶栏，顶栏计时器 1:30、舞台、一栏作答区；打一局，时间到出结果页（横幅、三个按钮），「下一章」换知识点接着打，「不玩了」回地图', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/boss/local/${KP}?mode=solo`)
    const store = useBossStore()
    expect(store.state?.kpId).toBe(KP)
    expect(w.find('.app-header').exists()).toBe(false)
    expect(w.find('.boss-arena').classes()).toContain('lay-solo')
    expect(w.find('.stage').exists()).toBe(true)
    expect(w.findAll('.boss-arena .side')).toHaveLength(1)
    expect(w.find('.countdown').exists()).toBe(true)
    expect(document.title).toMatch(/^打怪兽 · /)
    store.beginPlay()
    await settle()
    expect(w.find('.countdown').exists()).toBe(false)
    expect(shown(w.find('.timer'))).toContain('1:30')
    // 连对 4 题：打倒第一只（5 血）
    for (let i = 0; i < 4; i++) {
      const p = store.state!.players[0]!
      store.submit('left', correctOf(store.questionOf(p)))
      vi.advanceTimersByTime(400)
      await settle()
    }
    expect(store.state!.bosses[0]!.downs).toBe(1)
    expect(shown(w.find('.side-head'))).toContain('6 分')
    expect(shown(w.find('.downs'))).toContain('×1')
    // 时间到 → 终局特写 → 结果页
    vi.advanceTimersByTime(90_000)
    await settle()
    expect(store.state!.phase).toBe('ended')
    vi.advanceTimersByTime(3100)
    await settle()
    const result = w.find('.result')
    expect(result.exists()).toBe(true)
    expect(shown(result.find('.title'))).toContain('把捣蛋龙打倒了 1 次')
    expect(result.findAll('.star-slot.on')).toHaveLength(1)
    expect(result.findAll('.big-btn')).toHaveLength(3)
    expect(['next-btn', 'rematch-btn', 'quit-btn'].map((c) => result.find(`.big-btn.${c}`).exists())).toEqual([true, true, true])
    // 下一章：同一个视图换知识点
    const arena = w.find('.boss-arena').element
    await result.find('.next-btn').trigger('click')
    await until(pathIs(`/boss/local/${nextKp(KP)}`))
    expect(store.state?.kpId).toBe(nextKp(KP))
    expect(store.state?.phase).toBe('countdown')
    expect(w.find('.boss-arena').element).toBe(arena)
    // 退出 → 回地图
    await w.find('.bar-btn').trigger('click')
    await w.findAll('.confirm .big-btn')[1]!.trigger('click')
    await until(() => router.currentRoute.value.path.startsWith('/s/math/g/g1'))
    expect(store.state).toBeNull()
    w.unmount()
  })

  it('暂停（M1）：⏸ → 盖住题目、计时停；「继续打」先 3-2-1 再接着打；切到后台自动暂停；打出新纪录结果页写「新纪录！」，设置页一个人打的卡上写最好成绩', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    const w = await mountAt(`/boss/local/${KP}?mode=solo`)
    const store = useBossStore()
    expect(w.find('.pause-btn').exists()).toBe(false) // 倒数时没有
    store.beginPlay()
    await settle()
    vi.advanceTimersByTime(5000)
    await settle()
    expect(shown(w.find('.timer'))).toContain('1:25')
    await w.find('.pause-btn').trigger('click')
    expect(store.state!.phase).toBe('paused')
    expect(w.find('.pause-mask').exists()).toBe(true)
    expect(w.find('.pause-btn').exists()).toBe(false)
    vi.advanceTimersByTime(30_000)
    await settle()
    expect(shown(w.find('.timer'))).toContain('1:25')
    await w.find('.resume-btn').trigger('click')
    expect(shown(w.find('.resume-count'))).toBe('3')
    vi.advanceTimersByTime(700)
    await settle()
    expect(shown(w.find('.resume-count'))).toBe('2')
    expect(store.state!.phase).toBe('paused')
    vi.advanceTimersByTime(1400)
    await settle()
    expect(store.state!.phase).toBe('playing')
    expect(w.find('.pause-mask').exists()).toBe(false)
    // 切到后台：自动暂停
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    await settle()
    expect(store.state!.phase).toBe('paused')
    await w.find('.resume-btn').trigger('click')
    vi.advanceTimersByTime(2100)
    await settle()
    // 答对一题、时间到：第一次打、得分不是 0 → 新纪录
    const p = store.state!.players[0]!
    store.submit('left', correctOf(store.questionOf(p)))
    vi.advanceTimersByTime(95_000)
    await settle()
    vi.advanceTimersByTime(3100)
    await settle()
    expect(shown(w.find('.result .record'))).toContain('新纪录')
    w.unmount()
    const w2 = await mountAt(`/battle/new/${KP}`)
    await w2.find('.format[data-format="boss"]').trigger('click')
    expect(shown(w2.find('.mode[data-boss-mode="solo"] .best'))).toContain('最好 1 分')
    w2.unmount()
  })

  it('两人一台一起打：两栏作答区（红左蓝右）、两个人都能按；机器人一起打时机器人那栏是作答显示', async () => {
    const w = await mountAt(`/boss/local/${KP}?mode=duo&v=coop`)
    const store = useBossStore()
    expect(w.find('.boss-arena').classes()).toContain('lay-duo')
    expect(w.findAll('.boss-arena .side').map((s) => s.classes().find((c) => c === 'red' || c === 'blue'))).toEqual(['red', 'blue'])
    expect(store.operable).toEqual(['left', 'right'])
    w.unmount()
    localStorage.setItem(BATTLE_KEY, JSON.stringify({ names: { me: '小兔', left: '', right: '' } }))
    const w2 = await mountAt(`/boss/local/${KP}?mode=ai&v=coop`)
    const s2 = useBossStore()
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    s2.beginPlay(Date.now())
    await settle()
    expect(s2.operable).toEqual(['left'])
    expect(shown(w2.find('.side.red'))).toContain('小兔')
    expect(shown(w2.find('.side.blue'))).toContain('机器人')
    expect(useBattleStore().prefs.boss.mode).toBe('solo') // 直接开地址不改偏好
    vi.advanceTimersByTime(COUNTDOWN_MS)
    w2.unmount()
  })
})
