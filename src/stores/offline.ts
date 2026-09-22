/**
 * 后台把当前语言的朗读片段补进离线缓存（engine/offline.ts）：页面加载完、空闲一会儿后开始；断网 / 失败停下，
 * 回到前台或网络恢复再接着；切语言就换那门语言。只有一份在跑（新的取消旧的）。
 */
import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { lang } from '@/engine/i18n'
import { prefetchAudio, saveData, type PrefetchResult } from '@/engine/offline'

/** 页面加载完再等这么久才开始（让首屏和第一题的音频先走） */
export const START_DELAY_MS = 4000

export const useOfflineStore = defineStore('offline', () => {
  const last = ref<PrefetchResult | null>(null)
  const running = ref(false)
  let controller: AbortController | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  async function run(): Promise<void> {
    if (running.value || saveData()) return
    controller?.abort()
    controller = new AbortController()
    running.value = true
    try {
      last.value = await prefetchAudio(lang.value, undefined, controller.signal)
    } finally {
      running.value = false
    }
  }

  /** 空闲一会儿再开始；重复调用只留最后一次 */
  function schedule(delay = START_DELAY_MS): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void run()
    }, delay)
  }

  function setup(): void {
    if (typeof window === 'undefined' || typeof caches === 'undefined') return
    schedule()
    window.addEventListener('online', () => schedule(1000))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && last.value?.stopped) schedule(1000)
    })
    watch(lang, () => {
      controller?.abort()
      schedule(1000)
    })
  }

  return { last, running, run, schedule, setup }
})
