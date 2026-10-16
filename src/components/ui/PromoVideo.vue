<script setup lang="ts">
/**
 * 首页的宣传片（需求 F1）：15 秒以内，中英文各一版、跟着界面语言换（npm run promo 生成，src/assets/promo/）。
 * - 进到画面里才开始下载、静音循环播放；离开画面、切到后台就暂停（不白费流量和电）。
 * - 点一下视频：从头带声音播（听旁白），再点一下关掉声音；全站静音（顶栏的 🔊）关着时不出声、角上不画声音标记。
 * - 系统设了「减少动画」或开了省流量：不自动播放，只显示封面（对战正热闹的一帧）和播放键，点了才播。
 * - 自动播放被拦（iOS 省电模式之类）也显示播放键。
 * 视频与封面用 import 引用：构建时带内容哈希进 dist/assets/（一年不变的缓存），不进预缓存。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
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
/** 自动播放被浏览器拦下 */
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
  v.muted = !withSound.value
  try {
    const p = v.play() as Promise<void> | undefined
    p?.then(
      () => (blocked.value = false),
      () => (blocked.value = true),
    )
  } catch {
    blocked.value = true
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

function tap(): void {
  const v = video.value
  if (!v) return
  if (showPlay.value || v.paused) {
    // 还没播：点了就播，带声音（全站静音时不带）
    started.value = true
    withSound.value = soundOn.value
    if (withSound.value) v.currentTime = 0
    play()
    return
  }
  if (!soundOn.value) return
  withSound.value = !withSound.value
  v.muted = !withSound.value
  // 打开声音时从头放，旁白从第一句听起
  if (withSound.value) v.currentTime = 0
}

function prefersStill(): boolean {
  const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true
  return reduce || saveData
}

onMounted(() => {
  const v = video.value
  if (!v || !root.value) return
  // iOS 只让静音的视频自动播放：属性也要设上（模板里的 muted 不一定变成属性）
  v.muted = true
  still.value = prefersStill()
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

onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('visibilitychange', sync)
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
// 全站静音：马上不出声
watch(soundOn, (on) => {
  if (on) return
  withSound.value = false
  if (video.value) video.value.muted = true
})
</script>

<template>
  <button ref="root" type="button" class="promo" :aria-label="label" @click="tap">
    <video
      ref="video"
      class="promo-video"
      :poster="poster"
      muted
      loop
      playsinline
      preload="none"
      disablepictureinpicture
      disableremoteplayback
      aria-hidden="true"
      tabindex="-1"
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
