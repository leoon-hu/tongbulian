<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onTap } from '@/components/ui/tap'

/**
 * hideDisplay：不画显示框，由外层用 input 事件自己画（对战手机紧凑版把它放到题干那一栏，省高度）。
 * layout：grid = 手机键盘式 3 × 4（练习页）；wide = 两行六键「1 2 3 4 5 ⌫ / 6 7 8 9 0 ✓」（对战 iPad，矮一半，给题干留高度）
 */
const props = withDefaults(defineProps<{ maxLen?: number; hideDisplay?: boolean; layout?: 'grid' | 'wide' }>(), {
  maxLen: 3,
  hideDisplay: false,
  layout: 'grid',
})

type Key = { kind: 'digit'; d: number } | { kind: 'back' } | { kind: 'ok' }
const DIGITS = (ds: number[]): Key[] => ds.map((d) => ({ kind: 'digit', d }))
const keys = computed<Key[]>(() =>
  props.layout === 'wide'
    ? [...DIGITS([1, 2, 3, 4, 5]), { kind: 'back' }, ...DIGITS([6, 7, 8, 9, 0]), { kind: 'ok' }]
    : [...DIGITS([1, 2, 3, 4, 5, 6, 7, 8, 9]), { kind: 'back' }, ...DIGITS([0]), { kind: 'ok' }],
)
/** input：显示框里的内容每次变化都发出去（对战里对手 / 观战者要看到他正在按什么） */
const emit = defineEmits<{ confirm: [value: number]; input: [value: string] }>()

const value = ref('')
watch(value, (v) => emit('input', v))

function tapDigit(d: number): void {
  if (value.value.length >= props.maxLen) return
  if (value.value === '' && d === 0) {
    value.value = '0'
    return
  }
  value.value = value.value === '0' ? String(d) : value.value + String(d)
}

function backspace(): void {
  value.value = value.value.slice(0, -1)
}

function confirm(): void {
  if (value.value === '') return
  emit('confirm', parseInt(value.value, 10))
}
</script>

<template>
  <!-- 只把 wide 当 class 挂上去：默认值 grid 若也挂上，会和下面键盘容器的 .grid 撞名，外层也变成三列网格（撞过） -->
  <div class="numpad" :class="{ wide: layout === 'wide' }">
    <div v-if="!hideDisplay" class="display" :class="{ empty: value === '' }">
      {{ value === '' ? '?' : value }}
    </div>
    <div class="grid">
      <template v-for="(k, i) in keys" :key="i">
        <button v-if="k.kind === 'digit'" class="key" @pointerup="onTap($event, () => tapDigit(k.d))" @click="onTap($event, () => tapDigit(k.d))">{{ k.d }}</button>
        <button v-else-if="k.kind === 'back'" class="key func" @pointerup="onTap($event, backspace)" @click="onTap($event, backspace)">⌫</button>
        <button v-else class="key ok" :disabled="value === ''" @pointerup="onTap($event, confirm)" @click="onTap($event, confirm)">✓</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.numpad {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}
.display {
  min-width: 140px;
  padding: 4px 24px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 3px dashed var(--c-primary);
  font-size: var(--fs-huge);
  font-weight: 800;
  text-align: center;
  color: var(--c-primary-dark);
}
.display.empty {
  color: var(--c-locked);
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  width: 100%;
}
.key {
  height: var(--tap-min);
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-xl);
  font-weight: 700;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.key:active {
  transform: scale(0.92);
}
.key.func {
  color: var(--c-red);
}
.key.ok {
  background: var(--c-green);
  color: #fff;
}
.key.ok:disabled {
  background: var(--c-locked);
}
/* 两行六键：更宽、更矮 */
.numpad.wide {
  max-width: 480px;
  gap: 10px;
}
.numpad.wide .grid {
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.numpad.wide .display {
  padding: 0 20px;
  font-size: 36px;
  line-height: 1.5;
}
</style>
