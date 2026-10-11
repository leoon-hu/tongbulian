<script setup lang="ts">
import { computed } from 'vue'
import type { DivLine, DivMark } from '@/types/models'

/**
 * 除法竖式（三下「除数是一位数的除法」）：照课本画成厂字形——除数写在左边，「)」和上面一横盖住被除数，商写在被除数上面，
 * 下面是一步一步的乘积与差（每个乘积下面一条横线）。位置都按被除数的第几位数（0 = 最高位），数字一位一格，
 * 「除到被除数的哪一位，就把商写在那一位的上面」看得清清楚楚。
 * 「?」是要填的空（虚线框，w 位宽）：answer 是练习页按的数字，右对齐写进空里；done = 已经判完（变绿）。
 * 商那一行的空一律和被除数一样宽，免得框的宽度把商是几位数透露出来。
 * box：被除数的这一位画成空方框（「□72 ÷ 4 的商是三位数，方框里最小填几」），那一位原来的数不显示。
 *
 * 五上「小数除法」的小数模式（divisor / dividend 传字符串时；传数的三下、二下竖式样子不变）：
 * - 小数点画在两列之间的一个点、不占一格（课本「22.4」的写法）；商那一行的「.」画在它前面那一位的右边，和被除数的小数点上下对齐；
 * - cols：一共几列——被除数右边添 0 继续除的列（课本 22 ÷ 4、400 ÷ 75 的被除数上不写 .0），上面那条横线和每条横线跟着延长；
 * - 除数照写（0.85）、一位一格写在「)」左边；moved：除数是小数的划法——除数前面没用的 0 画红斜线、除数的小数点和被除数原来的小数点
 *   画红短斜线，被除数还有小数部分时在「整数部分有 moved 位」的地方点上新的小数点（4.48 → 44.8，课本练习六 2 的写法）；
 * - pad：被除数末尾几个 0 是添上 / 补上的（红字）；hl：绿底标出的几段（例 3 的余数 25）；boxed：商的第几个数字画红框（例 1「表示 5 角」）。
 */
const props = defineProps<{
  divisor: number | string
  dividend: number | string
  quotient?: DivLine
  rows?: DivLine[]
  box?: number
  answer?: string
  done?: boolean
  cols?: number
  moved?: number
  pad?: number
  hl?: DivMark[]
  boxed?: number
}>()

const CW = 22 // 一位的宽
const RH = 30 // 一行的高
const TOP = 3

/** 小数模式：除数或被除数写成字符串（五上） */
const decimal = computed(() => typeof props.divisor === 'string' || typeof props.dividend === 'string')
/** 一个数照写的样子：数字（不含小数点）+ 小数点前面有几个数字（没有小数点是 null） */
function split(s: string): { digits: string[]; point: number | null } {
  const i = s.indexOf('.')
  return { digits: s.replace('.', '').split(''), point: i < 0 ? null : i }
}
const dvd = computed(() => (decimal.value ? split(String(props.dividend)) : { digits: String(props.dividend).split(''), point: null }))
const dvs = computed(() => split(String(props.divisor)))
const digits = computed(() => dvd.value.digits)
const n = computed(() => digits.value.length)
/** 一共几列：被除数的位数，或者添 0 继续除往右多出来的列 */
const ncols = computed(() => (decimal.value ? Math.max(n.value, props.cols ?? 0) : n.value))
/** 被除数第一位的左边：整数竖式固定 40；小数模式按除数的位数留出地方 */
const X0 = computed(() => (decimal.value ? 12 + CW * dvs.value.digits.length + 18 : 40))
const lines = computed(() => props.rows ?? [])
/** 行号：0 商、1 被除数、2… 下面的每一行 */
const baseline = (r: number): number => TOP + RH * r + 22
const colX = (c: number): number => X0.value + CW * c + CW / 2
/** 第 c 列右边那条分界线（小数点画在这里） */
const edgeX = (c: number): number => X0.value + CW * (c + 1)

interface Cell {
  x: number
  y: number
  s: string
  typed?: boolean
  added?: boolean
}
interface Slot {
  x: number
  y: number
  w: number
  h: number
}
interface Dot {
  x: number
  y: number
}

/** 一行字右对齐到 end：空格留空位；「?」换成按的数字（没按显示「?」）；「.」不占位，画成前一位右边的小数点 */
function place(line: DivLine, r: number, cells: Cell[], slots: Slot[], dots: Dot[]): void {
  if (line.text === '?') {
    const w = line.w ?? 1
    slots.push({ x: X0.value + CW * (line.end - w + 1) + 1, y: TOP + RH * r + 2, w: CW * w - 2, h: RH - 3 })
    const typed = props.answer ?? ''
    if (typed === '') {
      cells.push({ x: X0.value + CW * (line.end - w + 1) + (CW * w) / 2, y: baseline(r), s: '?', typed: true })
      return
    }
    const chars = typed.split('')
    chars.forEach((s, k) => cells.push({ x: colX(line.end - (chars.length - 1 - k)), y: baseline(r), s, typed: true }))
    return
  }
  const chars = line.text.split('')
  const count = chars.filter((s) => s !== '.').length
  let k = 0
  for (const s of chars) {
    const c = line.end - (count - 1 - k)
    if (s === '.') {
      dots.push({ x: edgeX(c - 1), y: baseline(r) - 2 })
      continue
    }
    if (s !== ' ' && c >= 0) cells.push({ x: colX(c), y: baseline(r), s })
    k += 1
  }
}

const layout = computed(() => {
  const cells: Cell[] = []
  const slots: Slot[] = []
  const boxes: Slot[] = []
  const dots: Dot[] = []
  const rules: number[] = []
  if (props.quotient) place(props.quotient, 0, cells, slots, dots)
  const added = n.value - (props.pad ?? 0)
  digits.value.forEach((s, c) => {
    if (c === props.box) boxes.push({ x: X0.value + CW * c + 4, y: TOP + RH + 5, w: CW - 6, h: RH - 8 })
    else cells.push({ x: colX(c), y: baseline(1), s, added: decimal.value && c >= added })
  })
  lines.value.forEach((line, i) => {
    place(line, i + 2, cells, slots, dots)
    if (line.line) rules.push(TOP + RH * (i + 3) - 1)
  })
  return { cells, slots, boxes, dots, rules }
})

/** 小数模式的除数：一位一格写在「)」左边，小数点在两格之间；moved 时前面没用的 0 画红斜线 */
const divisorCells = computed(() => {
  const ds = dvs.value.digits
  const right = X0.value - 18
  const lead = props.moved === undefined ? 0 : ds.findIndex((d) => d !== '0')
  return ds.map((s, j) => ({ x: right - CW * (ds.length - j) + CW / 2, s, struck: props.moved !== undefined && j < lead }))
})
const divisorPoint = computed(() => {
  const p = dvs.value.point
  if (p === null) return null
  return { x: X0.value - 18 - CW * (dvs.value.digits.length - p), y: baseline(1) - 2 }
})
/** 被除数的小数点：原来的（moved 时划掉）和移动后新点上的（还有小数部分才点） */
const dividendPoints = computed(() => {
  const out: { x: number; y: number; crossed: boolean }[] = []
  const p = dvd.value.point
  if (p !== null && p > 0) out.push({ x: X0.value + CW * p, y: baseline(1) - 2, crossed: props.moved !== undefined })
  const m = props.moved
  if (m !== undefined && m > 0 && m < n.value && m !== p) out.push({ x: X0.value + CW * m, y: baseline(1) - 2, crossed: false })
  return out
})
/** 绿底的几段：[行号, 左边几个字] */
const marks = computed(() =>
  (props.hl ?? []).flatMap(([row, k]) => {
    const line = lines.value[row]
    if (!line) return []
    const len = line.text.replace(/\./g, '').length
    const from = line.end - len + 1
    return [{ x: X0.value + CW * from + 1, y: TOP + RH * (row + 2) + 3, w: CW * k - 2, h: RH - 5 }]
  }),
)
/** 商里画红框的那个数字 */
const boxedCell = computed(() => {
  if (props.boxed === undefined || !props.quotient || props.quotient.text === '?') return null
  const count = props.quotient.text.replace(/\./g, '').length
  const c = props.quotient.end - (count - 1 - props.boxed)
  return { x: X0.value + CW * c + 2, y: TOP + 3, w: CW - 4, h: RH - 4 }
})

const width = computed(() => X0.value + CW * ncols.value + 10)
const height = computed(() => TOP + RH * (2 + lines.value.length) + 4)
/** 只有题目（没有下面的过程）时画大一点；小数模式下面的行多（例 3 除了 8 行）时小一点，手机竖屏一屏放得下 */
const scale = computed(() => (lines.value.length ? (decimal.value && lines.value.length > 5 ? 0.85 : 1.15) : 1.7))
const vinculum = TOP + RH + 1
const bracket = computed(() => {
  const x = X0.value
  return `M ${x - 3} ${vinculum} Q ${x + 4} ${vinculum + RH / 2} ${x - 9} ${vinculum + RH - 3}`
})
</script>

<template>
  <div class="long-division" :class="{ done }">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width * scale" :height="height * scale" role="img">
      <rect v-for="(m, i) in marks" :key="`h${i}`" class="mark" :x="m.x" :y="m.y" :width="m.w" :height="m.h" rx="3" />
      <template v-if="decimal">
        <text v-for="(c, i) in divisorCells" :key="`d${i}`" class="num" :x="c.x" :y="baseline(1)">{{ c.s }}</text>
        <line
          v-for="(c, i) in divisorCells.filter((x) => x.struck)"
          :key="`z${i}`"
          class="strike"
          :x1="c.x - 7"
          :y1="baseline(1) - 19"
          :x2="c.x + 7"
          :y2="baseline(1) + 2"
        />
        <template v-if="divisorPoint">
          <circle class="pt" :cx="divisorPoint.x" :cy="divisorPoint.y" r="2.4" />
          <line v-if="moved !== undefined" class="strike" :x1="divisorPoint.x - 4" :y1="divisorPoint.y - 6" :x2="divisorPoint.x + 4" :y2="divisorPoint.y + 4" />
        </template>
        <template v-for="(p, i) in dividendPoints" :key="`p${i}`">
          <circle class="pt" :cx="p.x" :cy="p.y" r="2.4" />
          <line v-if="p.crossed" class="strike" :x1="p.x - 4" :y1="p.y - 6" :x2="p.x + 4" :y2="p.y + 4" />
        </template>
      </template>
      <text v-else class="num" :x="16" :y="baseline(1)">{{ divisor }}</text>
      <path class="bar" :d="bracket" />
      <line class="bar" :x1="X0 - 3" :y1="vinculum" :x2="X0 + CW * ncols + 6" :y2="vinculum" />
      <line v-for="(y, i) in layout.rules" :key="`r${i}`" class="rule" :x1="X0 - 6" :y1="y" :x2="X0 + CW * ncols + 4" :y2="y" />
      <rect v-for="(b, i) in layout.slots" :key="`s${i}`" class="slot" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="5" />
      <rect v-for="(b, i) in layout.boxes" :key="`b${i}`" class="box" :x="b.x" :y="b.y" :width="b.w" :height="b.h" />
      <rect v-if="boxedCell" class="boxed" :x="boxedCell.x" :y="boxedCell.y" :width="boxedCell.w" :height="boxedCell.h" />
      <text v-for="(c, i) in layout.cells" :key="`c${i}`" class="num" :class="{ typed: c.typed, added: c.added }" :x="c.x" :y="c.y">{{ c.s }}</text>
      <circle v-for="(p, i) in layout.dots" :key="`q${i}`" class="pt" :cx="p.x" :cy="p.y" r="2.4" />
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
/* 小数模式（五上）：小数点、划掉的红线、添上的 0、绿底、红框 */
.pt {
  fill: var(--c-text);
}
.strike {
  stroke: #e2483d;
  stroke-width: 2.2;
  stroke-linecap: round;
}
.num.added {
  fill: #e2483d;
}
.mark {
  fill: #bfe8cf;
}
.boxed {
  fill: none;
  stroke: #e2483d;
  stroke-width: 2;
}
</style>
