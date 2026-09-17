<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { LStr } from '@/types/models'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 十格阵：2 行 × 5 列。
 * - 展示：filled 个橙点在格内，extra 个蓝点在格外
 * - mode='add' 演示凑十：蓝点逐个移入格内直到满 10，同步显示算式讲解
 * - mode='sub' 演示破十：格子从满 10 起，逐个拿走 remove 个，剩下的加外面的
 */
const props = withDefaults(
  defineProps<{
    filled: number
    extra?: number
    /** 'add' 凑十 / 'sub' 破十 */
    mode?: 'add' | 'sub'
    /** 破十时从格内拿走的个数 */
    remove?: number
    /** 挂载后自动播放动画（答错讲解用） */
    autoDemo?: boolean
  }>(),
  { extra: 0, mode: 'add', remove: 0, autoDemo: false },
)

const frameCount = ref(clampFrame(props.filled))
const extraCount = ref(props.extra)
const caption = ref<LStr>('')
let timers: number[] = []

watch(
  () => [props.filled, props.extra],
  () => reset(),
)

function clampFrame(n: number): number {
  return Math.max(0, Math.min(10, n))
}

function reset(): void {
  stopTimers()
  frameCount.value = clampFrame(props.filled)
  extraCount.value = props.extra
  caption.value = ''
}

function stopTimers(): void {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

function later(fn: () => void, ms: number): void {
  timers.push(window.setTimeout(fn, ms))
}

function playDemo(): void {
  if (props.mode === 'sub') return playSub()
  return playAdd()
}

function playAdd(): void {
  reset()
  const a = frameCount.value
  const b = extraCount.value
  const need = Math.min(10 - a, b)
  if (need <= 0) return
  caption.value = { k: 'tf.add.need', p: { n: 10 - a } }
  for (let i = 1; i <= need; i++) {
    later(() => {
      frameCount.value += 1
      extraCount.value -= 1
    }, 500 + i * 550)
  }
  later(() => {
    caption.value = { k: 'tf.add.split', p: { a, need, b, rest: b - need } }
  }, 700 + need * 550)
  later(() => {
    caption.value = { k: 'tf.add.result', p: { rest: b - need, sum: a + b, a, b } }
  }, 2100 + need * 550)
}

function playSub(): void {
  reset()
  const loose = extraCount.value // 个位剩下的
  const minuend = 10 + loose
  const take = Math.min(props.remove, 10)
  const left = 10 - take
  const answer = minuend - props.remove
  if (take <= 0) return
  caption.value = { k: 'tf.sub.take', p: { take } }
  for (let i = 1; i <= take; i++) {
    later(() => {
      frameCount.value -= 1
    }, 500 + i * 550)
  }
  later(() => {
    caption.value = `10 - ${take} = ${left}`
  }, 700 + take * 550)
  later(() => {
    caption.value = { k: 'tf.sub.result', p: { left, loose, answer, minuend, remove: props.remove } }
  }, 2100 + take * 550)
}

const cells = computed(() => Array.from({ length: 10 }, (_, i) => i < frameCount.value))

onUnmounted(stopTimers)

defineExpose({ playDemo })

if (props.autoDemo) {
  later(() => playDemo(), 600)
}
</script>

<template>
  <div class="tenframe">
    <div class="row">
      <div class="frame">
        <div v-for="(isFilled, i) in cells" :key="i" class="cell">
          <Transition name="dot">
            <span v-if="isFilled" class="dot orange" />
          </Transition>
        </div>
      </div>
      <TransitionGroup v-if="extraCount > 0" name="dot" tag="div" class="extras">
        <span v-for="i in extraCount" :key="i" class="dot blue" />
      </TransitionGroup>
    </div>
    <p v-if="caption" class="caption"><RubyText :text="caption" /></p>
  </div>
</template>

<style scoped>
.tenframe {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 18px;
}
.frame {
  display: grid;
  grid-template-columns: repeat(5, 44px);
  grid-template-rows: repeat(2, 44px);
  border: 3px solid var(--c-text);
  border-radius: 8px;
  background: var(--c-card);
}
.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--c-line);
  background: transparent;
}
.dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-block;
}
.dot.orange {
  background: radial-gradient(circle at 35% 30%, #ffb37d, var(--c-primary-dark));
}
.dot.blue {
  background: radial-gradient(circle at 35% 30%, #9fceff, #2f7fd6);
}
.extras {
  display: grid;
  grid-template-columns: repeat(3, 34px);
  gap: 6px;
}
.caption {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-primary-dark);
  min-height: 1.6em;
  text-align: center;
}
.dot-enter-active,
.dot-leave-active {
  transition: all 0.35s ease;
}
.dot-enter-from,
.dot-leave-to {
  opacity: 0;
  transform: scale(0.3);
}
</style>
