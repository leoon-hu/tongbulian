<script setup lang="ts">
import { computed } from 'vue'
import type { DivLine } from '@/types/models'

/**
 * 除法竖式（三下「除数是一位数的除法」）：照课本画成厂字形——除数写在左边，「)」和上面一横盖住被除数，商写在被除数上面，
 * 下面是一步一步的乘积与差（每个乘积下面一条横线）。位置都按被除数的第几位数（0 = 最高位），数字一位一格，
 * 「除到被除数的哪一位，就把商写在那一位的上面」看得清清楚楚。
 * 「?」是要填的空（虚线框，w 位宽）：answer 是练习页按的数字，右对齐写进空里；done = 已经判完（变绿）。
 * 商那一行的空一律和被除数一样宽，免得框的宽度把商是几位数透露出来。
 * box：被除数的这一位画成空方框（「□72 ÷ 4 的商是三位数，方框里最小填几」），那一位原来的数不显示。
 */
const props = defineProps<{ divisor: number; dividend: number; quotient?: DivLine; rows?: DivLine[]; box?: number; answer?: string; done?: boolean }>()

const CW = 22 // 一位的宽
const RH = 30 // 一行的高
const X0 = 40 // 被除数第一位的左边
const TOP = 3

const digits = computed(() => String(props.dividend).split(''))
const n = computed(() => digits.value.length)
const lines = computed(() => props.rows ?? [])
/** 行号：0 商、1 被除数、2… 下面的每一行 */
const baseline = (r: number): number => TOP + RH * r + 22
const colX = (c: number): number => X0 + CW * c + CW / 2

interface Cell {
  x: number
  y: number
  s: string
  typed?: boolean
}
interface Slot {
  x: number
  y: number
  w: number
  h: number
}

/** 一行字右对齐到 end：空格留空位；「?」换成按的数字（没按显示「?」） */
function place(line: DivLine, r: number, cells: Cell[], slots: Slot[]): void {
  if (line.text === '?') {
    const w = line.w ?? 1
    slots.push({ x: X0 + CW * (line.end - w + 1) + 1, y: TOP + RH * r + 2, w: CW * w - 2, h: RH - 3 })
    const typed = props.answer ?? ''
    if (typed === '') {
      cells.push({ x: X0 + CW * (line.end - w + 1) + (CW * w) / 2, y: baseline(r), s: '?', typed: true })
      return
    }
    const chars = typed.split('')
    chars.forEach((s, k) => cells.push({ x: colX(line.end - (chars.length - 1 - k)), y: baseline(r), s, typed: true }))
    return
  }
  const chars = line.text.split('')
  chars.forEach((s, k) => {
    const c = line.end - (chars.length - 1 - k)
    if (s !== ' ' && c >= 0) cells.push({ x: colX(c), y: baseline(r), s })
  })
}

const layout = computed(() => {
  const cells: Cell[] = []
  const slots: Slot[] = []
  const boxes: Slot[] = []
  const rules: number[] = []
  if (props.quotient) place(props.quotient, 0, cells, slots)
  digits.value.forEach((s, c) => {
    if (c === props.box) boxes.push({ x: X0 + CW * c + 4, y: TOP + RH + 5, w: CW - 6, h: RH - 8 })
    else cells.push({ x: colX(c), y: baseline(1), s })
  })
  lines.value.forEach((line, i) => {
    place(line, i + 2, cells, slots)
    if (line.line) rules.push(TOP + RH * (i + 3) - 1)
  })
  return { cells, slots, boxes, rules }
})

const width = computed(() => X0 + CW * n.value + 10)
const height = computed(() => TOP + RH * (2 + lines.value.length) + 4)
/** 只有题目（没有下面的过程）时画大一点 */
const scale = computed(() => (lines.value.length ? 1.15 : 1.7))
const vinculum = TOP + RH + 1
const bracket = `M ${X0 - 3} ${vinculum} Q ${X0 + 4} ${vinculum + RH / 2} ${X0 - 9} ${vinculum + RH - 3}`
</script>

<template>
  <div class="long-division" :class="{ done }">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width * scale" :height="height * scale" role="img">
      <text class="num" :x="16" :y="baseline(1)">{{ divisor }}</text>
      <path class="bar" :d="bracket" />
      <line class="bar" :x1="X0 - 3" :y1="vinculum" :x2="X0 + CW * n + 6" :y2="vinculum" />
      <line v-for="(y, i) in layout.rules" :key="`r${i}`" class="rule" :x1="X0 - 6" :y1="y" :x2="X0 + CW * n + 4" :y2="y" />
      <rect v-for="(b, i) in layout.slots" :key="`s${i}`" class="slot" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="5" />
      <rect v-for="(b, i) in layout.boxes" :key="`b${i}`" class="box" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
      <text v-for="(c, i) in layout.cells" :key="`c${i}`" class="num" :class="{ typed: c.typed }" :x="c.x" :y="c.y">{{ c.s }}</text>
    </svg>
  </div>
</template>

<style scoped>
.long-division {
  display: inline-flex;
  justify-content: center;
  padding: 8px 14px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  max-width: 100%;
}
.long-division svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.num {
  font-size: 25px;
  font-weight: 800;
  fill: var(--c-text);
  text-anchor: middle;
  font-variant-numeric: tabular-nums;
}
.bar {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 2.5;
  stroke-linecap: round;
}
.rule {
  stroke: var(--c-text);
  stroke-width: 2;
}
.slot {
  fill: #fff;
  stroke: var(--c-primary);
  stroke-width: 2;
  stroke-dasharray: 5 4;
}
.num.typed {
  fill: var(--c-primary-dark);
}
.box {
  fill: #fff;
  stroke: var(--c-text);
  stroke-width: 2;
}
.done .slot {
  stroke: var(--c-green);
  stroke-dasharray: none;
}
.done .num.typed {
  fill: var(--c-green);
}
</style>
