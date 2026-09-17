<script setup lang="ts">
import { computed } from 'vue'

/**
 * 数轴：from…to，自动选步长（跨度 ≤20 逐格，否则每 10 一格）。
 * marks 里的数字用橙点高亮，用于「加减法直观」「100 以内数」「比大小」。
 */
const props = withDefaults(
  defineProps<{ from: number; to: number; marks?: number[] }>(),
  { marks: () => [] },
)

const span = computed(() => props.to - props.from)
const step = computed(() => (span.value <= 20 ? 1 : 10))

const points = computed(() => {
  const pts: number[] = []
  for (let v = props.from; v <= props.to; v += step.value) pts.push(v)
  return pts
})

// 同一个数只标一次（比大小出「=」时两个标记会重合，还会撞 key）
const uniqueMarks = computed(() => [...new Set(props.marks)])

function pct(v: number): string {
  return span.value > 0 ? `${((v - props.from) / span.value) * 100}%` : '0%'
}
</script>

<template>
  <div class="numline">
    <div class="axis" />
    <div v-for="v in points" :key="v" class="tick" :style="{ left: pct(v) }">
      <span class="stem" />
      <span class="num">{{ v }}</span>
    </div>
    <div v-for="m in uniqueMarks" :key="`m${m}`" class="mark" :style="{ left: pct(m) }">
      <span class="mark-num">{{ m }}</span>
      <span class="mark-arrow">▼</span>
    </div>
  </div>
</template>

<style scoped>
.numline {
  position: relative;
  width: 100%;
  max-width: 460px;
  height: 64px;
  margin: 28px auto 4px;
}
.axis {
  position: absolute;
  top: 26px;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--c-text);
  border-radius: 2px;
}
.tick {
  position: absolute;
  top: 20px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.stem {
  width: 3px;
  height: 14px;
  background: var(--c-text);
}
.num {
  font-size: 13px;
  font-weight: 700;
  margin-top: 2px;
}
.mark {
  position: absolute;
  top: -6px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  color: var(--c-primary);
  animation: drop 0.4s ease;
}
.mark-num {
  font-size: 13px;
  font-weight: 800;
}
.mark-arrow {
  font-size: 18px;
}
@keyframes drop {
  from {
    transform: translate(-50%, -8px);
    opacity: 0;
  }
}
</style>
