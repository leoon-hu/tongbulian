<script setup lang="ts">
import { computed } from 'vue'

/**
 * 通知示意图（五下「☆ 怎样通知最快」，照课本第 102–103 页画）。蓝色方块是老师（课本是队长），圆圈是同学：
 * - mode = group（分组通知）：最上面老师，下面 groups 个橙色圆圈是每组先接到通知的同学，每个下面连着 per 个浅蓝圆圈（本组其他同学）；
 * - mode = double（接到通知的人都继续通知别人）：老师在最左边，往右一列是一分钟；圈里的数是第几分钟接到的通知，同一分钟一个颜色，
 *   画到第 minutes 分钟（1–4）。照课本的摆法：每个人接到通知后，下一分钟通知的人画在他右边同一行，再往后通知的人另起一行、画在下面。
 * 图里只有数，没有汉字（谁是谁写在题目里）；不朗读。尺寸按人数算，窄屏、对战的窄栏里整张图等比缩小。
 */
const props = withDefaults(defineProps<{ mode: 'group' | 'double'; groups?: number; per?: number; minutes?: number }>(), {
  groups: 3,
  per: 4,
  minutes: 3,
})

const PAD = 4
const R = 11
const SQ = 22

interface Node {
  x: number
  y: number
  /** 0 = 老师；分组图里 1 = 每组先接到的同学、2 = 组员；翻倍图里是第几分钟 */
  level: number
}
interface Edge {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** 分组通知：三层（圆圈里不写数，画小一点：一组 5 人、4 组也放得下） */
const GR = 9
function groupLayout(k: number, m: number): { nodes: Node[]; edges: Edge[]; width: number; height: number } {
  const LS = 22
  const GS = 12
  const yRoot = PAD + SQ / 2
  const yHead = yRoot + 50
  const yLeaf = yHead + 48
  const nodes: Node[] = []
  const edges: Edge[] = []
  const heads: { x: number }[] = []
  let x = PAD + GR
  for (let g = 0; g < k; g++) {
    const leaves: number[] = []
    for (let j = 0; j < m; j++) {
      leaves.push(x)
      x += LS
    }
    x += GS
    const hx = (leaves[0]! + leaves[leaves.length - 1]!) / 2
    heads.push({ x: hx })
    for (const lx of leaves) {
      nodes.push({ x: lx, y: yLeaf, level: 2 })
      edges.push({ x1: hx, y1: yHead, x2: lx, y2: yLeaf })
    }
  }
  const rx = (heads[0]!.x + heads[heads.length - 1]!.x) / 2
  for (const h of heads) {
    nodes.push({ x: h.x, y: yHead, level: 1 })
    edges.push({ x1: rx, y1: yRoot, x2: h.x, y2: yHead })
  }
  nodes.push({ x: rx, y: yRoot, level: 0 })
  const width = Math.max(x - LS - GS + GR + PAD, rx + SQ / 2 + PAD)
  return { nodes, edges, width, height: yLeaf + GR + PAD }
}

/** 接到通知的人都继续通知：一行一条「接力」，往右一列一分钟 */
function doubleLayout(t: number): { nodes: Node[]; edges: Edge[]; width: number; height: number } {
  const CW = 44
  const RH = 30
  const at = (minute: number, row: number): { x: number; y: number } => ({ x: PAD + SQ / 2 + minute * CW, y: PAD + R + row * RH })
  const nodes: Node[] = []
  const edges: Edge[] = []
  let rows = 0
  const link = (from: { minute: number; row: number }, to: { minute: number; row: number }): void => {
    const a = at(from.minute, from.row)
    const b = at(to.minute, to.row)
    edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
  }
  // 从 start 起往右接力到第 t 分钟；再从后往前，给这一行上每个人后来通知的人各起一行
  const chain = (start: { minute: number; row: number }): void => {
    const seq = [start]
    while (seq[seq.length - 1]!.minute < t) {
      const prev = seq[seq.length - 1]!
      const next = { minute: prev.minute + 1, row: start.row }
      link(prev, next)
      seq.push(next)
    }
    for (const n of seq) nodes.push({ ...at(n.minute, n.row), level: n.minute })
    for (let i = seq.length - 1; i >= 0; i--) {
      const n = seq[i]!
      for (let m = n.minute + 2; m <= t; m++) {
        const child = { minute: m, row: ++rows }
        link(n, child)
        chain(child)
      }
    }
  }
  chain({ minute: 0, row: 0 })
  return { nodes, edges, width: at(t, 0).x + R + PAD, height: at(0, rows).y + R + PAD }
}

const lay = computed(() =>
  props.mode === 'group'
    ? groupLayout(Math.max(1, props.groups), Math.max(1, props.per))
    : doubleLayout(Math.min(4, Math.max(1, props.minutes))),
)
</script>

<template>
  <figure class="notify-tree" :data-mode="mode">
    <svg :viewBox="`0 0 ${lay.width} ${lay.height}`" :width="lay.width" :height="lay.height" role="img" aria-label="📞">
      <line v-for="(e, i) in lay.edges" :key="`e${i}`" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" class="edge" />
      <g v-for="(n, i) in lay.nodes" :key="`n${i}`" class="node" :class="n.level === 0 ? 'teacher' : mode === 'group' ? `g${n.level}` : `m${n.level}`">
        <rect v-if="n.level === 0" :x="n.x - SQ / 2" :y="n.y - SQ / 2" :width="SQ" :height="SQ" rx="3" class="shape" />
        <circle v-else :cx="n.x" :cy="n.y" :r="mode === 'group' ? GR : R" class="shape" />
        <text v-if="mode === 'double' && n.level > 0" :x="n.x" :y="n.y + 4.3" text-anchor="middle" class="minute">{{ n.level }}</text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.notify-tree {
  margin: 0;
  max-width: 100%;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: #fff8f0;
  box-shadow: var(--shadow-card);
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.edge {
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.shape {
  stroke-width: 1.5;
}
.teacher .shape {
  fill: #7cc6e8;
  stroke: #2f7bd6;
}
.g1 .shape {
  fill: #f6a26b;
  stroke: #d9590f;
}
.g2 .shape {
  fill: #dff3f8;
  stroke: #3aa6c4;
}
.m1 .shape {
  fill: #ffffff;
  stroke: #e2483d;
}
.m2 .shape {
  fill: #ffe08a;
  stroke: #d9a400;
}
.m3 .shape {
  fill: #f6a26b;
  stroke: #d9590f;
}
.m4 .shape {
  fill: #c9b6f2;
  stroke: #7a5cc9;
}
.minute {
  fill: var(--c-text);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 800;
}
</style>
