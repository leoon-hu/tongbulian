// @vitest-environment happy-dom
// 隔离回归门（需求 B34a ⑦）：用每一种皮肤挂载竞技场，同一 slot 下盒子（.strip）之外的 DOM 必须完全一致；
// 给某个皮肤临时挂上 canvas 版游戏后，盒子之外也不能有任何变化。
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import { setLang } from '@/engine/i18n'
import { SKINS, type SkinMeta } from '@/battle/skins'
import { createFallbackGame } from '@/battle/game/fallback'
import { useBattleStore } from '@/stores/battle'
import '@/views/battle/BattleArenaView.vue'

const KP = 's1-05-carry-add'
const SEEDS = { left: 11, right: 22 }

afterEach(() => {
  localStorage.clear()
  setLang('zh')
  vi.useRealTimers()
})

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await flushPromises()
}

/** 挂载竞技场并换成指定皮肤的固定种子对局，返回盒子之外的 DOM（盒子内容清空）与盒子本身的属性 */
async function snapshot(skin: SkinMeta): Promise<{ outside: string; strip: string; host: boolean }> {
  localStorage.setItem('tongbulian:battle', JSON.stringify({ names: { me: '小兔', left: '', right: '小虎' }, skin: skin.id }))
  const pinia = createPinia()
  await router.replace(`/battle/local/${KP}?mode=duo`)
  await router.isReady()
  const w = mount(App, { global: { plugins: [router, pinia] } })
  await settle()
  const store = useBattleStore()
  store.startLocal({ kpId: KP, mode: 'duo', skin: skin.id, seeds: SEEDS, now: 1000 })
  store.beginPlay(2000)
  await settle()
  const arena = w.find('.arena').element.cloneNode(true) as HTMLElement
  const strips = Array.from(arena.querySelectorAll('.strip'))
  expect(strips).toHaveLength(1)
  const strip = strips[0]!
  const host = strip.querySelector('.game-host') !== null
  const stripAttrs = Array.from(strip.attributes)
    .map((a) => `${a.name}=${a.value}`)
    .sort()
    .join(' ')
  strip.innerHTML = ''
  const outside = arena.outerHTML
  w.unmount()
  return { outside, strip: stripAttrs, host }
}

describe('竞技场隔离（B34a ⑦）', () => {
  it('同一 slot 下，换任何皮肤，盒子之外的 DOM 与盒子本身的属性都完全一致', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    for (const slot of ['top', 'center'] as const) {
      const skins = SKINS.filter((s) => s.slot === slot)
      expect(skins.length).toBeGreaterThan(1)
      const first = await snapshot(skins[0]!)
      expect(first.outside).toContain('class="strip')
      for (const skin of skins.slice(1)) {
        const snap = await snapshot(skin)
        expect(snap.outside, `${skin.id} 与 ${skins[0]!.id} 盒子之外的 DOM 不同`).toBe(first.outside)
        expect(snap.strip, `${skin.id} 盒子属性不同`).toBe(first.strip)
      }
    }
  })

  it('给皮肤挂上 canvas 版游戏后，盒子里是宿主、盒子之外与 CSS 版一模一样', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    // 拿一个上方横条的皮肤，先关掉它的 canvas 版截一份（CSS 版），再挂上 canvas 版截一份，两份盒子之外必须一样
    const skin = SKINS.find((s) => s.slot === 'top')!
    const saved = skin.game
    try {
      skin.game = undefined
      const css = await snapshot(skin)
      expect(css.host).toBe(false)
      skin.game = () => Promise.resolve(createFallbackGame)
      const canvas = await snapshot(skin)
      expect(canvas.host).toBe(true)
      expect(canvas.outside).toBe(css.outside)
      expect(canvas.strip).toBe(css.strip)
    } finally {
      skin.game = saved
    }
  })
})
