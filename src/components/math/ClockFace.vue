<script setup lang="ts">
import { computed } from 'vue'

/**
 * 钟面：显示指定时刻（一年级整时 / 半时，二年级任意几时几分）。
 * 时针角度含分钟带来的偏移，半时时时针指在两数中间——这正是孩子最容易读错的地方。
 * 表盘外圈 60 个分钟刻度（每 5 分一个大格），读几时几分时可以顺着数。
 * 五年级加的（都可选，不传和原来一样）：hand = 只画一根指针、指着这个数（1–12，不画时针和分针；五上「旋转」例 6）；
 * from = 指针原来指着几（画成虚线指针，再画一条从 from 顺时针转到 hand 的红色弧形箭头）；center = 中心旁边标的字母（「O」）。
 */
const props = withDefaults(
  defineProps<{ hour: number; minute: number; size?: number; hand?: number; from?: number; center?: string }>(),
  { size: 180, hand: undefined, from: undefined, center: undefined },
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

/** 一根指针（hand）与它原来的位置（from）：从 12 起顺时针量的角度 */
const handAngle = computed(() => ((props.hand ?? 12) % 12) * 30)
const fromAngle = computed(() => ((props.from ?? 12) % 12) * 30)

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString()
/** 从 from 顺时针转到 hand 的红色弧形箭头（viewBox 0–100，圆心 50,50）：两头离指针各让 4°，箭头在 hand 那头 */
const arc = computed(() => {
  if (props.hand === undefined || props.from === undefined) return null
  const sweep = (handAngle.value - fromAngle.value + 360) % 360
  if (sweep === 0) return null
  const R = 30
  const a0 = fromAngle.value + 4
  const a1 = fromAngle.value + sweep - 4
  const at = (deg: number): [number, number] => [50 + R * Math.sin((deg * Math.PI) / 180), 50 - R * Math.cos((deg * Math.PI) / 180)]
  const [x0, y0] = at(a0)
  const [x1, y1] = at(a1)
  // 顺时针走的切线方向（屏幕坐标 y 向下）
  const rad = (a1 * Math.PI) / 180
  const tx = Math.cos(rad)
  const ty = Math.sin(rad)
  const tip: [number, number] = [x1 + tx * 6, y1 + ty * 6]
  const back: [number, number] = [x1 - tx * 2, y1 - ty * 2]
  const p1: [number, number] = [back[0] - ty * 4.5, back[1] + tx * 4.5]
  const p2: [number, number] = [back[0] + ty * 4.5, back[1] - tx * 4.5]
  return {
    d: `M ${f1(x0)} ${f1(y0)} A ${R} ${R} 0 ${sweep - 8 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`,
    head: `M ${f1(tip[0])} ${f1(tip[1])} L ${f1(p1[0])} ${f1(p1[1])} L ${f1(p2[0])} ${f1(p2[1])} Z`,
  }
})
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
    <template v-if="hand === undefined">
      <div class="hand hour" :style="{ transform: `translate(-50%, -100%) rotate(${hourAngle}deg)` }" />
      <div
        class="hand minute"
        :style="{ transform: `translate(-50%, -100%) rotate(${minuteAngle}deg)` }"
      />
    </template>
    <template v-else>
      <div v-if="from !== undefined" class="hand single ghost" :data-at="from" :style="{ transform: `translate(-50%, -100%) rotate(${fromAngle}deg)` }" />
      <div class="hand single" :data-at="hand" :style="{ transform: `translate(-50%, -100%) rotate(${handAngle}deg)` }" />
      <svg v-if="arc" class="arc" viewBox="0 0 100 100" aria-hidden="true">
        <path class="arc-line" :d="arc.d" />
        <path class="arc-head" :d="arc.head" />
      </svg>
    </template>
    <div class="pivot" />
    <span v-if="center" class="center">{{ center }}</span>
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
/* 五年级「旋转」：一根指针（原来的位置画虚线）、红色弧形箭头、中心的字母 O */
.hand.single {
  width: 6px;
  height: 36%;
  background: var(--c-text);
}
.hand.single.ghost {
  background: transparent;
  border: 2px dashed #8a7a6d;
}
.arc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.arc-line {
  fill: none;
  stroke: #e53935;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.arc-head {
  fill: #e53935;
}
.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-150%, 15%);
  font-family: 'Times New Roman', serif;
  font-style: italic;
  font-weight: 700;
  font-size: 17px;
  color: #e53935;
}
</style>
