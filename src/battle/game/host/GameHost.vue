<script setup lang="ts">
/**
 * 游戏宿主（需求 B34 / B34a）：竞技场盒子里唯一的 Vue 组件。
 * - 建 canvas、量盒子尺寸（ResizeObserver）、像素比、是否减少动画；
 * - 按需加载游戏模块（独立 chunk），喂快照与带序号的事件，跑 rAF 循环，切后台暂停；
 * - 游戏的每一次调用都包在 try/catch 里：加载失败或运行时抛错 → 卸掉它换成保底画面（两条队色进度条），
 *   保底画面也出错就停止绘制；比赛照常，不冒泡到页面。
 * - 根元素 pointer-events: none（inline 也写一份，别靠样式表），只有 canvas 收点按（B59）：宿主算出盒子里的坐标与
 *   按位置猜的一方交给游戏的 poke，自己在点按处画一圈涟漪，并把这一下报给竞技场放声音；游戏仍拿不到事件对象。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { SeqEvent, Team } from '@/battle/protocol'
import type { GameEvent, GameHostInfo, GameLoader, GameModule, GameState } from '../contract'
import { deviceScale, prefersReducedMotion } from '../engine/canvas'
import { Loop } from '../engine/loop'
import { createFallbackGame } from '../fallback'

const props = defineProps<{
  load: GameLoader
  state: GameState
  events: readonly SeqEvent[]
  compact?: boolean
  /** 点按位置 → 猜是哪一队的东西（B59；由 GameSlot 按皮肤的位置 / 类别给），不传就上半红下半蓝 */
  sideOf?: (x: number, y: number, w: number, h: number) => Team
}>()
const emit = defineEmits<{ poke: [team: Team, x: number, y: number] }>()

/** 两次点按至少隔多久才转给游戏（孩子连点也别把游戏刷爆）；涟漪显示多久 */
const POKE_MIN_GAP_MS = 150
const RIPPLE_MS = 500
const ripples = ref<{ id: number; x: number; y: number }[]>([])
let rippleSeq = 0
let lastPoke = -Infinity

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
    const wasLowRes = level.value >= 3
    level.value = lv
    if (mod?.degrade) guard(() => mod!.degrade!(lv))
    // 从「降像素比」那一级恢复回来：重排一次，画布换回正常的像素比
    if (wasLowRes && lv < 3 && info && mod) guard(() => mod!.resize(info!.width, info!.height, info!.dpr))
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
  const dpr = deviceScale()
  const compact = !!props.compact
  // 尺寸没变就不重排：ResizeObserver 会因为邻居的重排、字号缩放等再报一次同样的盒子，重排要重新分配画布与离屏背景
  if (info.width === width && info.height === height && info.dpr === dpr && info.compact === compact) return
  info.width = width
  info.height = height
  info.dpr = dpr
  info.compact = compact
  if (mod) guard(() => mod!.resize(width, height, info!.dpr))
}

/** 盒子被点了一下（B59）：坐标换成盒子里的 CSS 像素，转给游戏，画涟漪，报给竞技场 */
function onPointer(e: PointerEvent): void {
  const canvas = canvasEl.value
  if (!canvas || !info) return
  const t = Date.now()
  if (t - lastPoke < POKE_MIN_GAP_MS) return
  lastPoke = t
  const r = canvas.getBoundingClientRect()
  const x = (e.clientX ?? 0) - (r?.left ?? 0)
  const y = (e.clientY ?? 0) - (r?.top ?? 0)
  const w = info.width
  const h = info.height
  const team: Team = props.sideOf ? props.sideOf(x, y, w, h) : y < h / 2 ? 'red' : 'blue'
  if (mod?.poke) guard(() => mod!.poke!(x, y, team))
  const id = ++rippleSeq
  ripples.value = [...ripples.value.slice(-5), { id, x, y }]
  setTimeout(() => {
    ripples.value = ripples.value.filter((p) => p.id !== id)
  }, RIPPLE_MS)
  emit('poke', team, x, y)
}

function onVisibility(): void {
  if (document.hidden) {
    loop.pause()
    if (mod) guard(() => mod!.pause())
  } else {
    if (mod) guard(() => mod!.resume())
    // 页面在后台时挂载的（扫码后切回来）：循环还没 start 过，resume 是空操作，这里补上
    if (loop.running || loop.started) loop.resume()
    else if (mod) loop.start()
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
// 结果页 / 大厅盖在画面上的时候隔帧画（约 30 fps）：胜利的彩纸看不出差别，省一半电
watch(
  () => props.state.phase,
  (p) => {
    loop.idle = p === 'ended' || p === 'lobby'
  },
  { immediate: true },
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

/** 终局特写（B63）：问游戏这一队的角色现在在盒子里的哪个点（CSS 像素，夹在盒子内）；游戏没报就 null */
function focusOf(team: Team): { x: number; y: number } | null {
  if (!mod?.focus || !info) return null
  let p: { x: number; y: number } | null = null
  guard(() => {
    p = mod!.focus!(team)
  })
  const q = p as { x: number; y: number } | null
  if (!q || !Number.isFinite(q.x) || !Number.isFinite(q.y)) return null
  return { x: Math.min(info.width, Math.max(0, q.x)), y: Math.min(info.height, Math.max(0, q.y)) }
}

defineExpose({ status, level, focusOf })
</script>

<template>
  <div ref="root" class="game-host" :data-status="status" style="pointer-events: none" aria-hidden="true">
    <canvas ref="canvasEl" class="game-canvas" @pointerdown="onPointer" />
    <span v-for="p in ripples" :key="p.id" class="ripple" :style="{ left: `${p.x}px`, top: `${p.y}px` }" />
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
  pointer-events: auto;
  touch-action: manipulation;
}
/* 点按处的涟漪（B59）：DOM 画的，不进 canvas */
.ripple {
  position: absolute;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 2px rgba(61, 44, 30, 0.25);
  pointer-events: none;
  animation: ripple 0.5s ease-out forwards;
}
@keyframes ripple {
  from {
    transform: scale(0.3);
    opacity: 1;
  }
  to {
    transform: scale(1.6);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ripple {
    animation-duration: 0.25s;
  }
}
</style>
