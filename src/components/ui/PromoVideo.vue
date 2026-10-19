<script lang="ts">
/** 这次打开网站已经带声音放完过一遍（或者自己点了关掉声音）：之后不再自动出声。模块级，再回首页也记得 */
let heard = false

/** 测试用：当作重新打开网站 */
export function resetPromoHeard(): void {
  heard = false
}
</script>

<script setup lang="ts">
/**
 * 首页的宣传片（需求 F1）：15 秒以内，中英文各一版、跟着界面语言换（npm run promo 生成，src/assets/promo/）。
 * - 进到画面里才开始下载、自动播放；离开画面、切到后台、离开首页就暂停（不白费流量和电）。
 * - 默认带声音：每次打开网站第一次放时带声音从头放一遍，放完接着静音循环（旁白一直重复太吵），再回首页也是静音循环。
 *   浏览器不让带声音自动播（没点过这个页面）就先静音播，等第一次点页面（点在视频上的照下一条）时从头带声音放。
 * - 点一下视频：静音时从头带声音播，有声音时关掉声音；全站静音（顶栏的 🔊）关着时不出声、角上不画声音标记，打开就从头带声音放（还没听过一遍的话）。
 * - 系统设了「减少动画」或开了省流量：不自动播放，只显示封面（对战正热闹的一帧）和播放键，点了才播。
 * - 静音也被拦（iOS 省电模式之类）就显示播放键。
 * 视频与封面用 import 引用：构建时带内容哈希进 dist/assets/（一年不变的缓存），不进预缓存。
 */
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, routerKey } from 'vue-router'
import { lang, ui } from '@/engine/i18n'
import { soundOn } from '@/engine/sound'
import zhVideo from '@/assets/promo/promo-zh.mp4'
import enVideo from '@/assets/promo/promo-en.mp4'
import zhPoster from '@/assets/promo/promo-zh.webp'
import enPoster from '@/assets/promo/promo-en.webp'

const root = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const src = computed(() => (lang.value === 'en' ? enVideo : zhVideo))
const poster = computed(() => (lang.value === 'en' ? enPoster : zhPoster))
/** 不自动播放（减少动画 / 省流量） */
const still = ref(false)
/** 用户自己点过播放（不自动播放时，之后也跟着进出画面播停） */
const started = ref(false)
/** 静音的自动播放也被浏览器拦下 */
const blocked = ref(false)
const withSound = ref(false)
const showPlay = computed(() => (still.value && !started.value) || blocked.value)
const label = computed(() => ui('promo.label', { action: ui(showPlay.value ? 'promo.play' : withSound.value ? 'promo.mute' : 'promo.unmute') }))

let inView = false
let observer: IntersectionObserver | null = null

/** 第一次要播时才给 src（之前只有封面，不下载视频） */
function arm(v: HTMLVideoElement): void {
  if (!v.getAttribute('src')) v.src = src.value
}

function play(): void {
  const v = video.value
  if (!v) return
  arm(v)
  const audible = withSound.value
  v.muted = !audible
  const done = (ok: boolean): void => {
    if (ok) {
      blocked.value = false
      return
    }
    if (audible && withSound.value) {
      // 带声音被拦（还没点过这个页面）：先静音播，第一次点页面时出声
      withSound.value = false
      v.muted = true
      listenGesture()
      sync()
    } else blocked.value = true
  }
  try {
    const p = v.play() as Promise<void> | undefined
    p?.then(
      () => done(true),
      () => done(false),
    )
  } catch {
    done(false)
  }
}

/** 该不该播：在画面里、页面在前台、能自动播（或用户点过） */
function sync(): void {
  const v = video.value
  if (!v) return
  const want = inView && document.visibilityState !== 'hidden' && (!still.value || started.value)
  if (want && v.paused) play()
  else if (!want && !v.paused) v.pause()
}

/** 从头带声音放（在用户的手势里调，浏览器才让出声） */
function soundFromStart(v: HTMLVideoElement): void {
  withSound.value = true
  v.currentTime = 0
  if (!v.paused) v.muted = false
}

// 带声音的自动播放被拦后，等页面上的第一次点击 / 按键。冒泡阶段听：顶栏 🔊 自己的处理先跑完，这里看到的是切换之后的全站静音
const GESTURES = ['click', 'keydown'] as const
let listening = false

function listenGesture(): void {
  if (listening) return
  listening = true
  for (const t of GESTURES) document.addEventListener(t, onGesture)
}

function unlistenGesture(): void {
  if (!listening) return
  listening = false
  for (const t of GESTURES) document.removeEventListener(t, onGesture)
}

function onGesture(e: Event): void {
  // 点在视频上的交给 tap
  if (root.value && e.target instanceof Node && root.value.contains(e.target)) return
  // Esc 之类不算用户激活：等下一次
  const activation = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation
  if (activation && !activation.isActive) return
  if (heard || withSound.value) {
    unlistenGesture()
    return
  }
  // 全站静音关着：接着等，打开之后的那一下再出声
  if (!soundOn.value) return
  unlistenGesture()
  const v = video.value
  if (v) soundFromStart(v)
}

function tap(): void {
  const v = video.value
  if (!v) return
  unlistenGesture()
  if (showPlay.value || v.paused) {
    // 还没播：点了就播，带声音（全站静音时不带）
    started.value = true
    withSound.value = soundOn.value
    if (withSound.value) v.currentTime = 0
    play()
    return
  }
  if (!soundOn.value) return
  if (withSound.value) {
    withSound.value = false
    v.muted = true
    heard = true
    return
  }
  // 打开声音时从头放，旁白从第一句听起
  soundFromStart(v)
}

/** 放完一遍：带声音的那一遍算听过了，之后静音循环 */
function onEnded(): void {
  const v = video.value
  if (!v) return
  if (withSound.value) {
    heard = true
    withSound.value = false
  }
  v.currentTime = 0
  sync()
}

function prefersStill(): boolean {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  return reduce || saveData
}

onMounted(() => {
  const v = video.value
  if (!v || !root.value) return
  // iOS 只让静音的视频自动播放：属性也要设上（模板里的 muted 不一定变成属性）；要带声音时 play() 里再改
  v.muted = true
  still.value = prefersStill()
  withSound.value = soundOn.value && !heard
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((e) => e.isIntersecting)
        sync()
      },
      { threshold: 0.35 },
    )
    observer.observe(root.value)
  } else {
    inView = true
    sync()
  }
  document.addEventListener('visibilitychange', sync)
})

// 离开首页马上停：页面切换的淡出期间还挂着，点卡片的那一下刚好把声音打开了也不会冒出来
if (inject(routerKey, null)) onBeforeRouteLeave(() => video.value?.pause())

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
  unlistenGesture()
  video.value?.pause()
})

// 换语言：换成那一版，正在播就接着播
watch(src, (s) => {
  const v = video.value
  if (!v || !v.getAttribute('src')) return
  const wasPlaying = !v.paused
  v.src = s
  if (wasPlaying) play()
})
// 全站静音：马上不出声；打开时还没听过一遍就从头带声音放（点 🔊 的手势里，浏览器让出声）
watch(soundOn, (on) => {
  const v = video.value
  if (!on) {
    withSound.value = false
    if (v) v.muted = true
    return
  }
  if (!heard && v && !withSound.value) soundFromStart(v)
})
</script>

<template>
  <button ref="root" type="button" class="promo" :aria-label="label" @click="tap">
    <video
      ref="video"
      class="promo-video"
      :poster="poster"
      muted
      playsinline
      preload="none"
      disablepictureinpicture
      disableremoteplayback
      aria-hidden="true"
      tabindex="-1"
      @ended="onEnded"
    ></video>
    <span v-if="showPlay" class="promo-play" aria-hidden="true">▶</span>
    <span v-else-if="soundOn" class="promo-sound" aria-hidden="true">{{ withSound ? '🔊' : '🔇' }}</span>
  </button>
</template>

<style scoped>
.promo {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  padding: 0;
  border-radius: 18px;
  overflow: hidden;
  background: var(--c-bg);
}
.promo-video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.promo-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--shadow-card);
  color: var(--c-primary-dark);
  font-size: 34px;
  line-height: 76px;
  text-indent: 6px;
}
/* 右下角的声音标记（只是提示，点整段视频都行）：画面里的字幕最宽 1040 / 1280，到不了这个角 */
.promo-sound {
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(61, 44, 30, 0.18);
  font-size: 14px;
  line-height: 26px;
  text-align: center;
}
@media (min-width: 600px) {
  .promo-sound {
    right: 10px;
    bottom: 10px;
    width: 40px;
    height: 40px;
    font-size: 21px;
    line-height: 40px;
  }
}
</style>
