// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import router from '@/router'
import App from '@/App.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { setLang } from '@/engine/i18n'
import { liveCourses } from '@/engine/catalog'
import { SISTER_SITES } from '@/engine/sites'
import { coursePath } from '@/seo/site'
import { useInstallStore } from '@/stores/install'
import { useBattleStore } from '@/stores/battle'
// 对战的两个视图是按需加载的：先静态导入一次，路由里的 import() 就不用在用例中途等模块转换
import '@/views/battle/BattleSetupView.vue'
import '@/views/battle/BattleArenaView.vue'

// 语言是模块级单例 + 本地存储持久化——每个用例后复位，保证相互独立。
afterEach(() => {
  localStorage.clear()
  setLang('zh')
})

/** 页面上看得见的正文：去掉拼音注音（<rt>），否则「凑十法」会变成「凑còu十shí法fǎ」。 */
function shown(w: { element: Element }): string {
  const clone = w.element.cloneNode(true) as Element
  clone.querySelectorAll('rt').forEach((rt) => rt.remove())
  return clone.textContent ?? ''
}

// 一年级数学课程的导航路径
const MAP = '/s/math/g/g1'
const practice = (kpId: string): string => `${MAP}/practice/${kpId}`

/** 挂载完整应用（App + 路由 + Pinia + localStorage），验证集成无运行时错误。 */
async function mountAt(path: string) {
  const pinia = createPinia()
  await router.replace(path)
  await router.isReady()
  const wrapper = mount(App, { global: { plugins: [router, pinia] } })
  await flushPromises() // 等待懒加载视图与首次渲染
  await flushPromises()
  return wrapper
}

describe('App 集成冒烟', () => {
  it('顶层选择页列出各学科（数学可进，语文/英语占位）', async () => {
    const w = await mountAt('/')
    expect(shown(w)).toContain('同步练') // 品牌
    expect(shown(w)).toContain('数学')
    expect(shown(w)).toContain('语文')
    expect(shown(w)).toContain('英语')
    w.unmount()
  })

  it('首页：品牌名是唯一的 <h1>，底部有各上线课程的知识点清单链接（静态页地址）与另外三个站的链接；子页标题跟随页面', async () => {
    const w = await mountAt('/')
    expect(w.findAll('h1')).toHaveLength(1)
    expect(w.find('h1').text()).toBe('同步练')
    expect(w.find('main').exists()).toBe(true)
    const links = w.findAll('footer.about .about-links a')
    expect(links.map((a) => a.text())).toEqual(['一年级数学知识点清单', '二年级数学知识点清单'])
    expect(links.map((a) => a.attributes('href'))).toEqual(liveCourses().map((lc) => `./${coursePath(lc.course)}`))
    const sites = w.findAll('footer.about .about-sites a')
    expect(sites.map((a) => a.attributes('href'))).toEqual(SISTER_SITES.map((s) => s.url))
    expect(sites.map((a) => a.attributes('target'))).toEqual(['_blank', '_blank', '_blank'])
    expect(sites.map((a) => a.text())).toEqual(['AI加词背单词', '拼音学习机拼音点读、拼读、测验', '识字卡片2–4 岁看图听音认知卡片'])
    w.unmount()

    const map = await mountAt(MAP)
    expect(map.findAll('h1')).toHaveLength(1)
    expect(document.title).toBe('一年级数学 · 同步练')
    map.unmount()
    const p = await mountAt(practice('s1-05-carry-add'))
    expect(document.title).toBe('凑十法 · 一年级数学 · 同步练')
    setLang('en')
    await flushPromises()
    expect(document.title).toBe('Make-Ten Addition · Grade 1 Math · Chapter Practice')
    p.unmount()
  })

  it('知识点地图渲染出单元与知识点', async () => {
    const w = await mountAt(MAP)
    expect(shown(w)).toContain('凑十法')
    expect(shown(w)).toContain('上册')
    w.unmount()
  })

  it('数学的选年级页：一、二年级可进，三年级起占位', async () => {
    const w = await mountAt('/s/math')
    const cards = w.findAll('button.card')
    const byTitle = (t: string) => cards.find((c) => c.text().includes(t))!
    expect(byTitle('一年级').attributes('disabled')).toBeUndefined()
    expect(byTitle('二年级').attributes('disabled')).toBeUndefined()
    expect(byTitle('三年级').attributes('disabled')).toBeDefined()
    expect(byTitle('三年级').text()).toContain('敬请期待')
    w.unmount()
  })

  it('二年级数学地图：上册 6 个单元、下册 5 个单元，知识点都可点；综合与实践显示 ☆；练习页能渲染', async () => {
    const w = await mountAt('/s/math/g/g2')
    expect(shown(w)).toContain('1. 分类与整理')
    expect(shown(w)).toContain('☆ 校园小导游')
    expect(shown(w)).toContain('认识厘米和米')
    expect(shown(w)).toContain('1~6 的表内乘法')
    expect(shown(w)).not.toContain('万以内数的认识')
    expect(w.findAll('.unit')).toHaveLength(6)
    expect(w.findAll('.node.soon')).toHaveLength(0)
    const tab = w.findAll('button.tab').find((b) => b.text() === '下册')!
    await tab.trigger('click')
    await flushPromises()
    expect(shown(w)).toContain('☆ 时间在哪里')
    expect(shown(w)).toContain('万以内数的认识')
    expect(shown(w)).toContain('有余数的除法')
    expect(w.findAll('.unit')).toHaveLength(5)
    expect(w.findAll('.node.soon')).toHaveLength(0)
    w.unmount()

    const p = await mountAt('/s/math/g/g2/practice/m2s2-05-add')
    expect(shown(p)).toContain('三位数加法')
    expect(p.find('.vertical').exists()).toBe(true)
    expect(p.findAll('button').length).toBeGreaterThan(0)
    expect(p.findAll('.dot')).toHaveLength(8)
    p.unmount()
  })

  it('一年级地图按新版教材：数学游戏显示 ☆，上册 6 个单元、下册 7 个单元', async () => {
    const w = await mountAt(MAP)
    expect(shown(w)).toContain('☆ 数学游戏')
    expect(shown(w)).toContain('1. 5 以内数的认识和加、减法')
    expect(w.findAll('.unit')).toHaveLength(6)
    const tab = w.findAll('button.tab').find((b) => b.text() === '下册')!
    await tab.trigger('click')
    await flushPromises()
    expect(shown(w)).toContain('☆ 欢乐购物街')
    expect(shown(w)).toContain('笔算加法')
    expect(w.findAll('.unit')).toHaveLength(7)
    w.unmount()
  })

  it('上册/下册用页签切换（只显示当前册的知识点）', async () => {
    const w = await mountAt(MAP)
    // 默认在上册：出现上册的「凑十法」，不出现下册的「破十法」
    expect(shown(w)).toContain('凑十法')
    expect(shown(w)).not.toContain('破十法')

    // 点「下册」页签
    const tab = w.findAll('button.tab').find((b) => b.text() === '下册')
    expect(tab).toBeTruthy()
    await tab!.trigger('click')
    await flushPromises()

    // 切到下册：出现「破十法」，不再出现上册的「凑十法」
    expect(shown(w)).toContain('破十法')
    expect(shown(w)).not.toContain('凑十法')
    w.unmount()
  })

  it('练习页用真实题目渲染出作答按钮', async () => {
    const w = await mountAt(practice('s1-05-carry-add'))
    expect(shown(w)).toContain('凑十法')
    expect(w.findAll('button').length).toBeGreaterThan(0)
    w.unmount()
  })

  it('任意知识点点一下就直接进入练习（已无锁）', async () => {
    const w = await mountAt(MAP)
    // 已去除解锁：地图上不再出现 🔒
    expect(shown(w)).not.toContain('🔒')
    const nodes = w.findAll('button.node')
    expect(nodes.length).toBeGreaterThan(1)
    // 旧版需前置星才解锁的第 2 个知识点，现在应直接进入练习（无确认弹层）
    await nodes[1]!.trigger('click')
    await flushPromises()
    await flushPromises()
    expect(router.currentRoute.value.path).toContain('/practice/')
    w.unmount()
  })

  it('点中/EN 开关后顶层选择页切到英文', async () => {
    const w = await mountAt('/')
    expect(shown(w)).toContain('同步练')
    expect(shown(w)).toContain('数学')

    // 点语言开关（中文时按钮显示 "EN"）
    const toggle = w.findAll('button').find((b) => b.text() === 'EN')
    expect(toggle).toBeTruthy()
    await toggle!.trigger('click')
    await flushPromises()

    // 品牌与学科名都变英文，且不再出现对应中文
    expect(shown(w)).toContain('Chapter Practice')
    expect(shown(w)).toContain('Math')
    expect(shown(w)).not.toContain('同步练')
    expect(shown(w)).not.toContain('数学')
    w.unmount()
  })

  it('点击知识节点下方状态即可手动切换已完成/未完成（无需做题）', async () => {
    const w = await mountAt(MAP)
    const badge = w.find('button.status')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('未完成')

    await badge.trigger('click') // 手动标记完成
    await flushPromises()
    expect(w.find('button.status').text()).toContain('已完成')

    await w.find('button.status').trigger('click') // 再点切回未完成
    await flushPromises()
    expect(w.find('button.status').text()).toContain('未完成')
    w.unmount()
  })

  it('做完一整轮练习后，该知识点在地图上标记为「已完成」（不再有星星）', async () => {
    const pinia = createPinia()
    const kpId = 's1-05-carry-add'

    await router.replace(practice(kpId))
    await router.isReady()
    const w = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()

    // 逐题作答到结算：每题故意答错（-999 恒判错），走同步的「我知道了」分支，
    // 答错也算完成——验证「做完 = 已完成」不看正确率。
    for (let i = 0; i < 8; i++) {
      w.findComponent(AnswerPanel).vm.$emit('answer', -999)
      await flushPromises()
      const gotit = w.findAll('button').find((b) => shown(b) === '我知道了')
      expect(gotit, `第 ${i + 1} 题应出现「我知道了」`).toBeTruthy()
      await gotit!.trigger('click')
      await flushPromises()
    }
    expect(shown(w)).toContain('闯关完成') // 结算页
    expect(w.findAll('.dot.wrong')).toHaveLength(8) // 全答错：进度点全红
    expect(w.findAll('.dot.right')).toHaveLength(0)
    w.unmount()

    // 复用同一 pinia 回地图：该知识点显示「已完成」与这一轮的统计（8 题全错），已完成的不再有进度条
    await router.replace(MAP)
    const map = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    expect(shown(map)).toContain('已完成')
    const stats = map.find('.stats')
    expect(stats.exists()).toBe(true)
    expect(stats.find('.stat.total').text()).toBe('8 题')
    expect(stats.find('.stat.right').text()).toBe('对 0')
    expect(stats.find('.stat.wrong').text()).toBe('错 8')
    // 没做过的知识点不显示统计；做完的那个不再显示进度条（未完成的都有）
    expect(map.findAll('.stats')).toHaveLength(1)
    expect(map.findAll('.node-wrap').filter((n) => n.find('.round').exists() && n.find('.status.done').exists())).toHaveLength(0)
    expect(shown(map)).not.toContain('★') // 没有星级；单元标题前的「☆」是教材里综合与实践的记号，不是星级
    map.unmount()

    // 做满一轮后再进：开新的一轮，从第 1 题开始、统计重新计
    await router.replace(practice(kpId))
    const again = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    expect(again.findAll('.dot.right, .dot.wrong')).toHaveLength(0)
    expect(again.findAll('.dot.now')).toHaveLength(1)
    again.unmount()
    await router.replace(MAP)
    const map2 = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    expect(map2.findAll('.stats')).toHaveLength(0) // 新一轮还没答题，统计不显示
    expect(shown(map2)).toContain('已完成') // 已完成不因为新开一轮而丢
    map2.unmount()
  })

  it('无效的学科 / 年级 / 知识点地址都会被送回上一级或顶层', async () => {
    let w = await mountAt('/s/nope')
    expect(router.currentRoute.value.path).toBe('/')
    w.unmount()

    w = await mountAt('/s/math/g/g9')
    expect(router.currentRoute.value.path).toBe('/')
    w.unmount()

    w = await mountAt(practice('nope'))
    expect(router.currentRoute.value.path).toBe(MAP)
    w.unmount()
  })

  it('练习页题目可点读（第一行开头有喇叭）；顶部栏的声音开关会持久化', async () => {
    const w = await mountAt(practice('s1-05-carry-add'))
    expect(w.find('.question[role="button"]').exists()).toBe(true)
    expect(w.find('.question .speaker').exists()).toBe(true)
    const sound = w.find('button.sound')
    expect(sound.text()).toBe('🔊')
    await sound.trigger('click')
    await flushPromises()
    expect(w.find('button.sound').text()).toBe('🔇')
    expect(JSON.parse(localStorage.getItem('tongbulian:v1')!).settings.soundEnabled).toBe(false)
    w.unmount()
  })

  it('做到一半退出：地图上显示进度条，再进来从断点接着做同一组题', async () => {
    const pinia = createPinia()
    const kpId = 's1-00-count'
    await router.replace(practice(kpId))
    await router.isReady()
    let w = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    const firstIds = w.findAll('.dot').length // 8 个进度点
    expect(firstIds).toBe(8)
    // 答 3 题：错、错、对（答对的走 1.4 秒计时器，用假时钟推进）
    const wrongOnce = async () => {
      w.findComponent(AnswerPanel).vm.$emit('answer', -999)
      await flushPromises()
      await w.findAll('button').find((b) => shown(b) === '我知道了')!.trigger('click')
      await flushPromises()
    }
    await wrongOnce()
    await wrongOnce()
    vi.useFakeTimers()
    const q3 = w.findComponent(AnswerPanel).props('question')
    w.findComponent(AnswerPanel).vm.$emit('answer', q3.answer.kind === 'number' ? q3.answer.value : q3.answer.choiceId)
    await flushPromises()
    vi.advanceTimersByTime(1500)
    vi.useRealTimers()
    await flushPromises()
    const dots = w.findAll('.dot')
    expect(dots.map((d) => d.classes().filter((c) => c !== 'dot').join())).toEqual([
      'wrong', 'wrong', 'right', 'now', '', '', '', '',
    ])
    w.unmount()

    // 地图：该节点未完成，进度条前三格红红绿、统计是这一轮的 3 题；没开始的节点全灰、无统计
    await router.replace(MAP)
    const map = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    const bars = map.findAll('.round')
    expect(bars.length).toBeGreaterThan(1)
    expect(bars[0]!.findAll('.seg').map((s) => s.classes().filter((c) => c !== 'seg').join())).toEqual([
      'wrong', 'wrong', 'right', '', '', '', '', '',
    ])
    expect(bars[1]!.findAll('.seg.right, .seg.wrong')).toHaveLength(0)
    expect(map.find('.stats .stat.total').text()).toBe('3 题')
    expect(map.find('.stats .stat.right').text()).toBe('对 1')
    expect(map.find('.stats .stat.wrong').text()).toBe('错 2')
    expect(map.findAll('.stats')).toHaveLength(1)
    map.unmount()

    // 再进练习页：从第 4 题接着做，前 3 个点的颜色恢复
    await router.replace(practice(kpId))
    w = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    expect(w.findAll('.dot').slice(0, 4).map((d) => d.classes().filter((c) => c !== 'dot').join())).toEqual([
      'wrong', 'wrong', 'right', 'now',
    ])
    w.unmount()
  })

  it('首页顶部的安装提示条（F16）：拿到安装事件才显示「安装」，关掉后 3 天内不再出现、写进单独的 key', async () => {
    const pinia = createPinia()
    await router.replace('/')
    await router.isReady()
    let w = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    await flushPromises()
    // 测试环境不是触屏、也没有安装事件：默认不显示
    const store = useInstallStore(pinia)
    expect(w.find('.install').exists()).toBe(false)

    // 模拟 Chrome 发来的 beforeinstallprompt：出现提示条，主按钮是「安装」
    let prompted = 0
    const fakePrompt = Object.assign(new Event('beforeinstallprompt'), {
      prompt: async () => {
        prompted += 1
      },
      userChoice: Promise.resolve({ outcome: 'dismissed' as const }),
    })
    store.$patch({ prompt: fakePrompt })
    await flushPromises()
    expect(w.find('.install').exists()).toBe(true)
    expect(shown(w)).toContain('安装 同步练')
    expect(w.find('.install-btn').text()).toBe('安装')

    // 点「安装」→ 调了系统框；用户拒绝 → 当关掉，3 天内不再出现
    await w.find('.install-btn').trigger('click')
    await flushPromises()
    await flushPromises()
    expect(prompted).toBe(1)
    expect(w.find('.install').exists()).toBe(false)
    const until = JSON.parse(localStorage.getItem('tongbulian:install')!).until as number
    expect(until - Date.now()).toBeGreaterThan(3 * 24 * 3600 * 1000 - 5000)
    expect(until - Date.now()).toBeLessThanOrEqual(3 * 24 * 3600 * 1000)
    w.unmount()

    // 静默期内再拿到事件也不出现
    w = mount(App, { global: { plugins: [router, pinia] } })
    await flushPromises()
    store.$patch({ prompt: fakePrompt })
    await flushPromises()
    expect(w.find('.install').exists()).toBe(false)
    w.unmount()
  })

  it('英文模式下练习页题目用英文渲染', async () => {
    // 先在顶层切到英文（写入持久化），再进入练习页
    const home = await mountAt('/')
    await home.findAll('button').find((b) => b.text() === 'EN')!.trigger('click')
    await flushPromises()
    home.unmount()

    const w = await mountAt(practice('s1-03-solid-shapes'))
    expect(shown(w)).toContain('Solid Shapes')
    // 该知识点题干为「这是什么图形？/数一数，有几个X？」——英文下不应出现中文题干
    expect(shown(w)).not.toContain('这是什么图形')
    expect(shown(w)).not.toContain('数一数')
    w.unmount()
  })
})

describe('对战模式（§8，第 1 阶段：单设备）', () => {
  const BATTLE_KEY = 'tongbulian:battle'
  const KP = 's1-05-carry-add'

  /** 竞技场与皮肤组件都是按需加载的，多刷几轮 */
  async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) await flushPromises()
  }
  /** 等到条件成立（路由跳转要等懒加载的视图），最多刷 200 轮 */
  async function until(pred: () => boolean): Promise<void> {
    for (let i = 0; i < 200 && !pred(); i++) await flushPromises()
    expect(pred()).toBe(true)
    await settle()
  }
  const pathIs = (path: string) => () => router.currentRoute.value.path === path
  function fakeTimers(): void {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  }
  function correctOf(q: { answer: { kind: string; value?: number; choiceId?: string } }): number | string {
    return q.answer.kind === 'number' ? q.answer.value! : q.answer.choiceId!
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('地图上的「⚔️ 对战」开关 → 设置页先问名字 → 开始进竞技场（无全局顶栏、标题带「对战」）', async () => {
    const w = await mountAt(MAP)
    const toggle = w.find('.tab.battle')
    expect(toggle.exists()).toBe(true)
    await toggle.trigger('click')
    await w.find('.node.open').trigger('click')
    await until(pathIs('/battle/new/s1-00-count'))
    expect(shown(w)).toContain('跟谁打')
    expect(document.title).toContain('对战')
    // 第一次进对战先问名字：点一个现成名字就行
    expect(shown(w)).toContain('你叫什么')
    const chip = w.find('.sheet .chip')
    const picked = chip.text()
    await chip.trigger('click')
    await w.find('form.sheet').trigger('submit')
    await flushPromises()
    expect(w.find('.sheet').exists()).toBe(false)
    expect(JSON.parse(localStorage.getItem(BATTLE_KEY)!).names.me).toBe(picked)
    expect(w.find('.name-chip.red .nm').text()).toBe(picked)
    expect(shown(w)).toContain('机器人快慢')
    // 选一个皮肤后开始
    await w.findAll('.skins .tile')[1]!.trigger('click')
    await w.find('.start-btn').trigger('click')
    await until(pathIs('/battle/local/s1-00-count'))
    expect(router.currentRoute.value.query.mode).toBe('ai')
    expect(w.find('.app-header').exists()).toBe(false)
    expect(w.find('.arena').exists()).toBe(true)
    expect(w.find('.countdown').exists()).toBe(true)
    w.unmount()
  })

  it('两人同屏：左右各一个可操作的区域，红队答对 8 题出结果页，「再来一局」重新倒数', async () => {
    fakeTimers()
    localStorage.setItem(BATTLE_KEY, JSON.stringify({ names: { me: '小兔', left: '', right: '小虎' }, skin: 'tug' }))
    const w = await mountAt(`/battle/local/${KP}?mode=duo`)
    await settle()
    const store = useBattleStore()
    expect(store.state?.phase).toBe('countdown')
    store.beginPlay()
    await settle()
    expect(w.findAll('.team')).toHaveLength(2)
    expect(w.findAll('.row.operable')).toHaveLength(2)
    expect(w.find('.team.red .team-name').text()).toBe('小兔')
    expect(w.find('.team.blue .team-name').text()).toBe('小虎')
    expect(w.find('.strip.top').exists()).toBe(true) // 拔河在上方横条

    // 第一题从界面上答：数字键盘按数字再 ✓，选择题点正确的那张卡
    const left = store.state!.players[0]!
    const q = store.questionOf(left)
    const ans = q.answer
    const redRow = w.find('.team.red .row.operable')
    if (ans.kind === 'number') {
      for (const d of String(ans.value)) {
        await redRow.findAll('.key').find((k) => k.text() === d)!.trigger('click')
      }
      await redRow.find('.key.ok').trigger('click')
    } else {
      const i = q.choices!.findIndex((c) => c.id === ans.choiceId)
      await redRow.findAll('.cards .card')[i]!.trigger('click')
    }
    await flushPromises()
    expect(store.state!.score.red).toBe(1)
    expect(w.find('.team.red .score').text()).toBe('1')
    expect(w.find('.team.red .feedback.right').exists()).toBe(true)
    vi.advanceTimersByTime(700)
    await flushPromises()
    expect(w.find('.team.red .feedback').exists()).toBe(false)

    for (let i = 1; i < 8; i++) {
      store.submit('left', correctOf(store.questionOf(store.state!.players[0]!)))
      // 连对 3 / 5 题、到 7 分会弹提示（B5a），反馈窗口延长到 1.4 秒
      vi.advanceTimersByTime(1500)
    }
    await settle()
    expect(store.state!.phase).toBe('ended')
    expect(w.find('.result').exists()).toBe(false) // 先播胜利动画
    vi.advanceTimersByTime(2100)
    await settle()
    expect(w.find('.result').exists()).toBe(true)
    expect(shown(w)).toContain('红队获胜')
    expect(shown(w)).toContain('差一点点')
    expect(w.find('.result .score').text().replace(/\s/g, '')).toBe('8:0')

    await w.findAll('.result .big-btn')[0]!.trigger('click') // 再来一局
    await settle()
    expect(store.state!.phase).toBe('countdown')
    expect(store.state!.score).toEqual({ red: 0, blue: 0 })
    expect(w.find('.countdown').exists()).toBe(true)
    w.unmount()
    expect(store.state).toBeNull()
  })

  it('打机器人：只有左边可操作，机器人那行是「作答显示」；退出要确认后回地图', async () => {
    fakeTimers()
    localStorage.setItem(BATTLE_KEY, JSON.stringify({ names: { me: '小兔', left: '', right: '' }, skin: 'rocket' }))
    const w = await mountAt(`/battle/local/${KP}?mode=ai`)
    await settle()
    const store = useBattleStore()
    store.beginPlay()
    await settle()
    expect(w.findAll('.row.operable')).toHaveLength(1)
    expect(shown(w.find('.team.blue .team-name'))).toBe('机器人')
    expect(w.find('.team.blue .watch').exists()).toBe(true)
    expect(shown(w.find('.team.blue'))).toContain('想一想')
    expect(w.find('.strip.center').exists()).toBe(true) // 火箭在左右之间

    await w.find('.bar-btn').trigger('click')
    expect(shown(w)).toContain('要退出比赛吗')
    await w.findAll('.confirm .big-btn')[1]!.trigger('click')
    await until(pathIs(MAP))
    expect(store.state).toBeNull()
    w.unmount()
  })

  it('练习页页头的 ⚔️ 进对战设置页；没有名字时直接打开竞技场地址会退回设置页', async () => {
    const w = await mountAt(practice(KP))
    await w.find('.battle-btn').trigger('click')
    await until(pathIs(`/battle/new/${KP}`))
    w.unmount()

    const w2 = await mountAt(`/battle/local/${KP}?mode=duo`)
    await until(pathIs(`/battle/new/${KP}`))
    w2.unmount()
  })
})
