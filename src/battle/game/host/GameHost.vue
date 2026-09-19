<script setup lang="ts">
/**
 * 游戏宿主（需求 B34 / B34a）：竞技场盒子里唯一的 Vue 组件。
 * - 建 canvas、量盒子尺寸（ResizeObserver）、像素比、是否减少动画；
 * - 按需加载游戏模块（独立 chunk），喂快照与带序号的事件，跑 rAF 循环，切后台暂停；
 * - 游戏的每一次调用都包在 try/catch 里：加载失败或运行时抛错 → 卸掉它换成保底画面（两条队色进度条），
 *   保底画面也出错就停止绘制；比赛照常，不冒泡到页面。
 * - 根元素 pointer-events: none（inline 也写一份，别靠样式表），游戏永远拿不到触摸。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SeqEvent } from '@/battle/protocol'
import type { GameEvent, GameHostInfo, GameLoader, GameModule, GameState } from '../contract'
import { deviceScale, prefersReducedMotion } from '../engine/canvas'
import { Loop } from '../engine/loop'
import { createFallbackGame } from '../fallback'

const props = defineProps<{
  load: GameLoader
  state: GameState
  events: readonly SeqEvent[]
  compact?: boolean
}>()

export type HostStatus = 'loading' | 'game' | 'fallback' | 'dead'

const root = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const status = ref<HostStatus>('loading')
/** 降级等级（只读，给测试 / 调试看） */
const level = ref(0)

let mod: GameModule | null = null
let info: GameHostInfo | null = null
let lastSeq = 0
const backlog: GameEvent[] = []
let unmounted = false
let ro: ResizeObserver | null = null

const loop = new Loop({
  frame: (dt) => {
    if (mod) guard(() => mod!.tick(dt))
  },
  degrade: (lv) => {
    level.value = lv
    if (mod?.degrade) guard(() => mod!.degrade!(lv))
  },
})

function measure(): { width: number; height: number } {
  const el = root.value
  const r = el?.getBoundingClientRect()
  return { width: Math.max(1, Math.round(r?.width ?? 1)), height: Math.max(1, Math.round(r?.height ?? 1)) }
}

function warn(msg: string, e: unknown): void {
  console.warn(`[game] ${msg}`, e)
}

/** 游戏出错：第一次换保底画面，保底画面也错就停 */
function fail(e: unknown): void {
  if (status.value === 'fallback' || status.value === 'dead') {
    status.value = 'dead'
    loop.stop()
    warn('保底画面也出错，停止绘制', e)
    mod = null
    return
  }
  warn('游戏出错，换成保底画面', e)
  const old = mod
  mod = null
  try {
    old?.destroy()
  } catch {
    /* 已经在出错了 */
  }
  useModule(createFallbackGame(), 'fallback')
}

function guard(fn: () => void): void {
  try {
    fn()
  } catch (e) {
    fail(e)
  }
}

function useModule(m: GameModule, s: HostStatus): void {
  const canvas = canvasEl.value
  if (!canvas || unmounted) return
  const { width, height } = measure()
  info = { canvas, width, height, dpr: deviceScale(), compact: !!props.compact, reducedMotion: prefersReducedMotion() }
  mod = m
  status.value = s
  const pending = backlog.splice(0)
  guard(() => {
    m.mount(info!)
    m.setState(props.state)
    for (const e of pending) m.onEvent(e)
  })
  if (typeof document === 'undefined' || !document.hidden) loop.start()
}

function onResize(): void {
  if (!info) return
  const { width, height } = measure()
  info.width = width
  info.height = height
  info.dpr = deviceScale()
  info.compact = !!props.compact
  if (mod) guard(() => mod!.resize(width, height, info!.dpr))
}

function onVisibility(): void {
  if (document.hidden) {
    loop.pause()
    if (mod) guard(() => mod!.pause())
  } else {
    if (mod) guard(() => mod!.resume())
    loop.resume()
  }
}

onMounted(async () => {
  // 挂载前的事件是历史（阶段已经在快照里），不重放
  for (const s of props.events) if (s.seq > lastSeq) lastSeq = s.seq
  if (typeof ResizeObserver !== 'undefined' && root.value) {
    ro = new ResizeObserver(onResize)
    ro.observe(root.value)
  }
  document.addEventListener('visibilitychange', onVisibility)
  let factory: (() => GameModule) | null = null
  try {
    factory = await props.load()
  } catch (e) {
    if (unmounted) return
    warn('游戏加载失败，换成保底画面', e)
    useModule(createFallbackGame(), 'fallback')
    return
  }
  if (unmounted) return
  let m: GameModule | null = null
  try {
    m = factory()
  } catch (e) {
    warn('游戏创建失败，换成保底画面', e)
    useModule(createFallbackGame(), 'fallback')
    return
  }
  useModule(m, 'game')
})

watch(
  () => props.state,
  (s) => {
    if (mod) guard(() => mod!.setState(s))
  },
  { deep: true },
)

watch(
  () => props.events,
  (list) => {
    for (const s of list) {
      if (s.seq <= lastSeq) continue
      lastSeq = s.seq
      if (mod) guard(() => mod!.onEvent(s.e))
      else backlog.push(s.e)
    }
  },
  { deep: true },
)

watch(() => props.compact, onResize)

onBeforeUnmount(() => {
  unmounted = true
  loop.stop()
  ro?.disconnect()
  document.removeEventListener('visibilitychange', onVisibility)
  const m = mod
  mod = null
  try {
    m?.destroy()
  } catch (e) {
    warn('游戏销毁时出错', e)
  }
})

defineExpose({ status, level })
</script>

<template>
  <div ref="root" class="game-host" :data-status="status" style="pointer-events: none" aria-hidden="true">
    <canvas ref="canvasEl" class="game-canvas" />
  </div>
</template>

<style scoped>
.game-host {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
