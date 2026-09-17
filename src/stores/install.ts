import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { INSTALL_FOREVER, INSTALL_SNOOZE_MS, installKind, type InstallEnv } from '@/engine/install'

/** Chrome / Edge 的安装事件：lib.dom 里没有类型，只声明用到的两个成员 */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * 静默期单独存一个 key（不进 engine/storage 的根 key）：装到主屏幕后是另一份存储，本来就该各自提示；
 * 也不用为它升 schema 版本。值 { until } = 这个时刻之前不提示，INSTALL_FOREVER = 装好了
 */
const KEY = 'tongbulian:install'

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches
/** iPadOS 13 起 Safari 的 UA 与桌面 Mac 一样，靠触点数区分；iPad 的分享按钮在右上角，指引要分开写 */
const isIPad = /iPad/.test(ua) || (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isIOS = /iPhone|iPod/.test(ua) || isIPad
const isInApp = /MicroMessenger|\bQQ\/|Weibo|FBAN|FBAV|Instagram|Line\//.test(ua)
/** iOS 上只有 Safari 的分享菜单里有「添加到主屏幕」；Chrome / Edge / Firefox for iOS 与内置浏览器都要先换 Safari */
const isIOSSafari = isIOS && /Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPT\/|DuckDuckGo/.test(ua) && !isInApp
const isStandalone =
  mq('(display-mode: standalone)') ||
  mq('(display-mode: fullscreen)') ||
  (typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true)
const isTouch = mq('(pointer: coarse)')

function readUntil(): number {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const { until } = JSON.parse(raw) as { until?: unknown }
    return typeof until === 'number' && Number.isFinite(until) ? until : 0
  } catch {
    return 0
  }
}

function writeUntil(until: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ until }))
  } catch {
    // 隐私模式等存不下：下次再提示一次也无妨
  }
}

export const useInstallStore = defineStore('install', () => {
  const prompt = ref<BeforeInstallPromptEvent | null>(null)
  const until = ref(readUntil())
  /** 每次算都取当前时间：静默期到了、页面还开着的话下一次进首页就会重新出现 */
  const tick = ref(Date.now())

  const env = computed<InstallEnv>(() => ({
    standalone: isStandalone,
    installed: until.value === INSTALL_FOREVER,
    hasPrompt: prompt.value !== null,
    touch: isTouch,
    inApp: isInApp,
    ios: isIOS,
  }))
  const kind = computed(() => installKind(env.value, until.value, tick.value))

  /** main.ts 启动时调一次，要在 beforeinstallprompt 触发之前（页面加载后 Chrome 很快就发） */
  function setup(): void {
    if (typeof window === 'undefined') return
    window.addEventListener('beforeinstallprompt', (e) => {
      // 拦下浏览器自己的小条，时机与文案由提示条统一控制
      e.preventDefault()
      prompt.value = e as BeforeInstallPromptEvent
    })
    window.addEventListener('appinstalled', markInstalled)
  }

  function markInstalled(): void {
    prompt.value = null
    until.value = INSTALL_FOREVER
    writeUntil(INSTALL_FOREVER)
  }

  /** 提示条每次挂载时调：静默期到了、页面还一直开着的话，下一次回到首页就重新出现 */
  function refresh(): void {
    tick.value = Date.now()
  }

  /** 关掉 / 关了步骤面板 / 系统框里拒绝：3 天内不再提示 */
  function snooze(): void {
    until.value = Date.now() + INSTALL_SNOOZE_MS
    writeUntil(until.value)
  }

  /** 点「安装」：弹系统安装框。事件只能用一次，用完清掉；装了记永久，拒绝了当关掉 */
  async function install(): Promise<'accepted' | 'dismissed'> {
    const e = prompt.value
    prompt.value = null
    if (!e) return 'dismissed'
    let outcome: 'accepted' | 'dismissed' = 'dismissed'
    try {
      await e.prompt()
      outcome = (await e.userChoice).outcome
    } catch {
      outcome = 'dismissed'
    }
    if (outcome === 'accepted') markInstalled()
    else snooze()
    return outcome
  }

  // prompt 也导出：集成测试里用 $patch 模拟「拿到安装事件」
  return { kind, isIOSSafari, isIPad, prompt, setup, refresh, install, snooze, markInstalled }
})
