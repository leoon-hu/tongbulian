<script setup lang="ts">
import { computed } from 'vue'
import type { TreeStep } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import { t } from '@/engine/i18n'

/**
 * 树状图（四下「括号」练习三 2「按照顺序计算并填写下面的□，然后列出综合算式」）：最上面两个数 a、b 各在一个框里，
 * 两条斜线往下汇到第一步的得数框，运算符号写在两条斜线中间；第二步起每步新加一个数（和上一步的得数框在同一层，
 * 写在左边或右边），再往下汇成这一步的得数框。得数框里写数、空着（''），或是要填的「?」——
 * fill：练习页把按的数字填进「?」那一格（blank.ts）；不传（对战）就画「?」。aria-label 只说是树状图（不透露数）。
 */
const props = withDefaults(defineProps<{ a: string; b: string; steps: TreeStep[]; fill?: BlankFill | null }>(), { fill: null })

const BH = 30 // 框高
const LV = 54 // 一层多高（框顶到下一层框顶）：斜线留 24，三步的树在手机竖屏上也不太高
const DX = 92 // 汇到一起的两个框，中心相距多远
const PAD = 8

interface Box {
  x: number
  y: number
  w: number
  text: string
  res: boolean
  ask: boolean
}
interface Edge {
  x1: number
  y1: number
  x2: number
  y2: number
}

const boxW = (s: string): number => Math.max(50, s.length * 11 + 20)

const layout = computed(() => {
  const boxes: Box[] = []
  const edges: Edge[] = []
  const ops: { x: number; y: number; op: string }[] = []
  const num = (x: number, level: number, text: string): Box => {
    const b: Box = { x, y: level * LV, w: boxW(text), text, res: false, ask: false }
    boxes.push(b)
    return b
  }
  let left = num(0, 0, props.a)
  let right = num(DX, 0, props.b)
  let prev: Box | null = null
  for (let i = 0; i < props.steps.length; i++) {
    const s = props.steps[i]!
    if (i > 0 && prev) {
      const n = num(prev.x + (s.left ? -DX : DX), i, s.n ?? '')
      ;[left, right] = s.left ? [n, prev] : [prev, n]
    }
    const x = (left.x + right.x) / 2
    // 空框与要填的框按 4、5 位数留宽（按的数字要放得下）
    const w = s.v === '?' ? boxW('00000') : s.v === '' ? boxW('0000') : boxW(s.v)
    const res: Box = { x, y: (i + 1) * LV, w, text: s.v, res: true, ask: s.v === '?' }
    boxes.push(res)
    for (const from of [left, right]) edges.push({ x1: from.x, y1: from.y + BH, x2: x, y2: res.y })
    // 运算符号写在两条斜线快汇到一起的地方（字顶不碰上一层的框）
    ops.push({ x, y: res.y - 8, op: s.op })
    prev = res
  }
  const minX = Math.min(...boxes.map((b) => b.x - b.w / 2)) - PAD
  const maxX = Math.max(...boxes.map((b) => b.x + b.w / 2)) + PAD
  const height = props.steps.length * LV + BH + PAD * 2
  return { boxes, edges, ops, minX, width: maxX - minX, height }
})

const askText = computed(() => props.fill?.value || '?')
</script>

<template>
  <svg
    class="calc-tree"
    :viewBox="`${layout.minX} ${-PAD} ${layout.width} ${layout.height}`"
    :width="layout.width"
    :height="layout.height"
    role="img"
    :aria-label="t({ k: 'm4.ops.treeAria' })"
  >
    <line v-for="(e, i) in layout.edges" :key="`e${i}`" class="edge" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" />
    <text v-for="(o, i) in layout.ops" :key="`o${i}`" class="op" :x="o.x" :y="o.y" text-anchor="middle">{{ o.op }}</text>
    <g v-for="(b, i) in layout.boxes" :key="`b${i}`" class="box" :class="{ res: b.res, num: !b.res, ask: b.ask, empty: b.res && !b.ask && b.text === '', filled: b.ask && !!fill && fill.value !== '', done: b.ask && !!fill?.done }">
      <rect :x="b.x - b.w / 2" :y="b.y" :width="b.w" :height="BH" rx="5" />
      <text :x="b.x" :y="b.y + BH / 2 + 6" text-anchor="middle">{{ b.ask ? askText : b.text }}</text>
    </g>
  </svg>
</template>

<style scoped>
.calc-tree {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.edge {
  stroke: #8a7a6d;
  stroke-width: 1.6;
}
.op {
  font-size: 18px;
  font-weight: 800;
  fill: var(--c-text);
}
.box rect {
  fill: #fffbe8;
  stroke: #d9b65c;
  stroke-width: 1.6;
}
.box text {
  font-size: 18px;
  font-weight: 800;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.box.ask rect {
  fill: #fff3e6;
  stroke: var(--c-primary);
  stroke-width: 2.2;
  stroke-dasharray: 5 3;
}
.box.ask text {
  fill: var(--c-locked);
}
.box.ask.filled text {
  fill: var(--c-primary-dark);
}
.box.ask.done rect {
  stroke: var(--c-green);
  stroke-dasharray: none;
}
.box.ask.done text {
  fill: var(--c-green);
}
</style>
