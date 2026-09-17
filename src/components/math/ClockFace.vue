<script setup lang="ts">
import { computed } from 'vue'

/**
 * 钟面：显示指定时刻（一年级整时 / 半时，二年级任意几时几分）。
 * 时针角度含分钟带来的偏移，半时时时针指在两数中间——这正是孩子最容易读错的地方。
 * 表盘外圈 60 个分钟刻度（每 5 分一个大格），读几时几分时可以顺着数。
 */
const props = withDefaults(
  defineProps<{ hour: number; minute: number; size?: number }>(),
  { size: 180 },
)

const ticks = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const angle = (n * 30 * Math.PI) / 180
    const r = 0.4 // 数字所在半径（相对 0.5）
    return {
      n,
      left: `${50 + Math.sin(angle) * r * 100}%`,
      top: `${50 - Math.cos(angle) * r * 100}%`,
    }
  }),
)

const hourAngle = computed(() => (props.hour % 12) * 30 + props.minute * 0.5)
const minuteAngle = computed(() => props.minute * 6)

const marks = Array.from({ length: 60 }, (_, i) => ({ i, big: i % 5 === 0, angle: i * 6 }))
</script>

<template>
  <div class="clock" :style="{ width: `${size}px`, height: `${size}px` }">
    <span
      v-for="m in marks"
      :key="`m${m.i}`"
      class="mark"
      :class="{ big: m.big }"
      :style="{ transform: `translateX(-50%) rotate(${m.angle}deg)` }"
    />
    <span
      v-for="t in ticks"
      :key="t.n"
      class="tick"
      :style="{ left: t.left, top: t.top }"
      >{{ t.n }}</span
    >
    <div class="hand hour" :style="{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }" />
    <div
      class="hand minute"
      :style="{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }"
    />
    <div class="pivot" />
  </div>
</template>

<style scoped>
.clock {
  position: relative;
  border-radius: 50%;
  background: var(--c-card);
  border: 6px solid var(--c-primary);
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
}
.tick {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-text);
}
.mark {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 100%;
  transform-origin: center center;
  background: linear-gradient(to bottom, var(--c-locked) 0 5%, transparent 5%);
  pointer-events: none;
}
.mark.big {
  width: 3px;
  background: linear-gradient(to bottom, var(--c-primary-dark) 0 8%, transparent 8%);
}
.hand {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: bottom center;
  border-radius: 4px;
}
.hand.hour {
  width: 7px;
  height: 26%;
  background: var(--c-text);
}
.hand.minute {
  width: 5px;
  height: 36%;
  background: var(--c-blue);
}
.pivot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--c-primary-dark);
  transform: translate(-50%, -50%);
}
</style>
