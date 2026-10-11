<script setup lang="ts">
import { computed } from 'vue'
import type { BoxSpec } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 带标注的长方体 / 正方体（五下「长方体和正方体」，照课本 p19、p24、p30、p41 的画法）：斜二测——正面是真正的长方形，
 * 往后的棱向右上斜 45°、画一半长（往后一格，图上往右、往上各挪 K 格）。实心的顶面最亮、右面最暗（同 ShapeGlyph / CubeSolids 的颜色）；
 * 线框图（wire）面不涂色、看不见的 3 条棱（都交于左后下顶点）画虚线。
 * 长、宽、高标在交于右前下顶点的三条棱上：长 = 正面的底边（字写在下面）、宽 = 右下那条斜棱（字写在它的右下方）、
 * 高 = 竖着的棱（字写在右面的右边）。图里只写数、字母、「?」（单位写在题目文字里），不注音、不朗读。
 * 三条棱悬殊太大（游泳池 50 × 25 × 2.5）时把短的放长到最长的 MIN 倍，免得扁成一条线——标的数照写，图只是示意。
 * 两个并排时共用一个比例（取出珊瑚石前后的同一个容器）；arrow = 中间画箭头。
 * water = 透明容器（线框、浅色玻璃）里装着水：水画成一个浅蓝的长方体，右边一条竖的尺寸线（两头箭头）旁写 depth；
 * stone = 水底沉着一块灰色的石头（比水面低）。open = 没有盖：顶面画成看得见里面的深色开口。
 * grid = 看得见的三个面按 1 格画细线（小正方体摆成的长方体、棱长 1 分米的正方体分成 1000 个小正方体）。
 * 读屏只说「长方体」「正方体」「装水的长方体容器」，不说标的数。
 */
const props = withDefaults(defineProps<{ items: BoxSpec[]; arrow?: boolean }>(), { arrow: false })

/** 往后一格：图上往右、往上各挪几格（45°、画一半长） */
const K = Math.SQRT1_2 / 2
/** 最短的棱至少画成最长的几倍 */
const MIN = 0.3
const PAD = 6

type Pt = [number, number]
const f1 = (n: number): string => (Math.round(n * 10) / 10).toString()
const pts = (...ps: Pt[]): string => ps.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]]
const up = (a: Pt, d: number): Pt => [a[0], a[1] - d]
/** 字大概多宽（16px 粗体的数字、字母） */
const textW = (s: string | undefined, font: number): number => (s ? s.length * font * 0.62 + 4 : 0)

interface Line {
  a: Pt
  b: Pt
}
interface Drawn {
  width: number
  height: number
  cls: string[]
  front: string
  top: string
  right: string
  hidden: Line[]
  grid: Line[]
  mark: Line | null
  face: string | null
  water: { front: string; top: string; right: string } | null
  stone: string | null
  dim: { x: number; y1: number; y2: number; text: string } | null
  texts: { x: number; y: number; text: string; anchor: 'middle' | 'start'; cls: string }[]
}

const font = computed(() => (props.items.length > 1 ? 14 : 16))

const drawn = computed<Drawn[]>(() => {
  const n = props.items.length
  const m = Math.max(...props.items.flatMap((b) => [b.l, b.w, b.h]))
  const norm = (v: number): number => Math.max(v / m, MIN)
  const dims = props.items.map((b) => ({ L: norm(b.l), W: norm(b.w), H: norm(b.h) }))
  // 单个的最高 120：练习页手机竖屏上题干 + 图 + 数字键盘一屏放下（2026-10-11 普查：150 时保温箱那题要往下滚 116px）
  const maxW = n > 1 ? 118 : 210
  const maxH = n > 1 ? 110 : 120
  const s = Math.min(...dims.map((d) => Math.min(maxW / (d.L + d.W * K), maxH / (d.H + d.W * K))))
  const fs = font.value
  return props.items.map((b, i) => {
    const { L, W, H } = dims[i]!
    const ls = L * s
    const hs = H * s
    const dx = W * K * s
    const lab = b.labels ?? {}
    // 右边要放下「高」的字、尺寸线和字；下面要放下「长」的字（宽的字在右下）
    const right = Math.max(PAD, lab.h ? textW(lab.h, fs) + 10 : 0, b.depth ? textW(b.depth, fs) + 22 : 0, lab.w ? textW(lab.w, fs) + 10 - dx / 2 : 0)
    const bottom = lab.l || lab.w ? fs + 10 : PAD
    const x0 = PAD
    const yb = PAD + hs + dx
    const D: Pt = [dx, -dx]
    const FBL: Pt = [x0, yb]
    const FBR: Pt = [x0 + ls, yb]
    const FTL: Pt = up(FBL, hs)
    const FTR: Pt = up(FBR, hs)
    const BBL = add(FBL, D)
    const BBR = add(FBR, D)
    const BTL = add(FTL, D)
    const BTR = add(FTR, D)
    const wire = !!b.wire || b.water !== undefined
    const hidden: Line[] = wire
      ? [
          { a: BBL, b: BTL },
          { a: BBL, b: BBR },
          { a: FBL, b: BBL },
        ]
      : []
    // 1 格 1 根细线：正面横竖、顶面两个方向、右面两个方向
    const grid: Line[] = []
    if (b.grid && [b.l, b.w, b.h].every((v) => Number.isInteger(v) && v <= 12)) {
      for (let k = 1; k < b.l; k++) {
        const x = x0 + (ls * k) / b.l
        grid.push({ a: [x, yb], b: [x, yb - hs] }, { a: [x, yb - hs], b: add([x, yb - hs], D) })
      }
      for (let k = 1; k < b.h; k++) {
        const y = yb - (hs * k) / b.h
        grid.push({ a: [x0, y], b: [x0 + ls, y] }, { a: [x0 + ls, y], b: add([x0 + ls, y], D) })
      }
      for (let k = 1; k < b.w; k++) {
        const o: Pt = [(dx * k) / b.w, (-dx * k) / b.w]
        grid.push({ a: add(FTL, o), b: add(FTR, o) }, { a: add(FBR, o), b: add(FTR, o) })
      }
    }
    const markLine: Record<'l' | 'w' | 'h', Line> = { l: { a: FBL, b: FBR }, w: { a: FBR, b: BBR }, h: { a: FBR, b: FTR } }
    const facePts: Record<'front' | 'top' | 'right', string> = {
      front: pts(FBL, FBR, FTR, FTL),
      top: pts(FTL, FTR, BTR, BTL),
      right: pts(FBR, BBR, BTR, FTR),
    }
    // 水：从底面到水深的一个浅蓝长方体
    let water: Drawn['water'] = null
    let stone: string | null = null
    let dim: Drawn['dim'] = null
    if (b.water !== undefined) {
      const wh = (hs * Math.min(b.water, b.h)) / b.h
      water = {
        front: pts(FBL, FBR, up(FBR, wh), up(FBL, wh)),
        top: pts(up(FBL, wh), up(FBR, wh), up(BBR, wh), up(BBL, wh)),
        right: pts(FBR, BBR, up(BBR, wh), up(FBR, wh)),
      }
      if (b.stone) {
        // 水底正中一块不规则的石头，比水面低
        const cx = x0 + ls / 2 + dx / 2
        const rw = Math.min(ls * 0.22, 26)
        const rh = Math.min(wh * 0.32, 15)
        const cy = yb - dx / 2 - rh
        const shape: Pt[] = [
          [-1, 0.2],
          [-0.7, -0.6],
          [-0.15, -1],
          [0.45, -0.75],
          [1, -0.1],
          [0.8, 0.75],
          [0, 1],
          [-0.75, 0.85],
        ]
        stone = pts(...shape.map(([u, v]): Pt => [cx + u * rw, cy + v * rh]))
      }
      if (b.depth) dim = { x: BBR[0] + 12, y1: BBR[1], y2: BBR[1] - wh, text: b.depth }
    }
    const texts: Drawn['texts'] = []
    if (lab.l) texts.push({ x: x0 + ls / 2, y: yb + fs + 4, text: lab.l, anchor: 'middle', cls: 'lab' })
    if (lab.w) texts.push({ x: FBR[0] + dx / 2 + 6, y: yb - dx / 2 + fs * 0.9, text: lab.w, anchor: 'start', cls: 'lab' })
    if (lab.h) texts.push({ x: BBR[0] + 6, y: BBR[1] - hs / 2 + fs * 0.35, text: lab.h, anchor: 'start', cls: 'lab' })
    if (dim) texts.push({ x: dim.x + 7, y: (dim.y1 + dim.y2) / 2 + fs * 0.35, text: dim.text, anchor: 'start', cls: 'lab' })
    const cls = [wire ? 'wire' : 'solid']
    if (b.water !== undefined) cls.push('tank')
    if (b.open) cls.push('open')
    return {
      width: Math.ceil(x0 + ls + dx + right),
      height: Math.ceil(yb + bottom),
      cls,
      front: facePts.front,
      top: facePts.top,
      right: facePts.right,
      hidden,
      grid,
      mark: b.mark ? markLine[b.mark] : null,
      face: b.face ? facePts[b.face] : null,
      water,
      stone,
      dim,
      texts,
    }
  })
})

const label = computed(() => {
  const key = props.items.some((b) => b.water !== undefined)
    ? 'm5.cube.ariaTank'
    : props.items.every((b) => b.l === b.w && b.w === b.h)
      ? 'm5.cube.ariaCube'
      : 'm5.cube.ariaCuboid'
  return t({ k: key })
})
</script>

<template>
  <div class="boxes" :class="{ pair: items.length > 1 }" role="img" :aria-label="label">
    <template v-for="(d, i) in drawn" :key="i">
      <span v-if="arrow && i > 0" class="arrow" aria-hidden="true">→</span>
      <svg :class="d.cls" :viewBox="`0 0 ${d.width} ${d.height}`" :width="d.width" :height="d.height" :font-size="font" aria-hidden="true">
        <line v-for="(h, k) in d.hidden" :key="`h${k}`" class="hidden" :x1="h.a[0]" :y1="h.a[1]" :x2="h.b[0]" :y2="h.b[1]" />
        <polygon v-if="d.stone" class="stone" :points="d.stone" />
        <template v-if="d.water">
          <polygon class="water-front" :points="d.water.front" />
          <polygon class="water-right" :points="d.water.right" />
          <polygon class="water-top" :points="d.water.top" />
        </template>
        <polygon class="face top" :points="d.top" />
        <polygon class="face right" :points="d.right" />
        <polygon class="face front" :points="d.front" />
        <polygon v-if="d.face" class="shade" :points="d.face" />
        <line v-for="(g, k) in d.grid" :key="`g${k}`" class="grid" :x1="g.a[0]" :y1="g.a[1]" :x2="g.b[0]" :y2="g.b[1]" />
        <line v-if="d.mark" class="mark" :x1="d.mark.a[0]" :y1="d.mark.a[1]" :x2="d.mark.b[0]" :y2="d.mark.b[1]" />
        <g v-if="d.dim" class="dim">
          <line :x1="d.dim.x - 9" :y1="d.dim.y1" :x2="d.dim.x + 4" :y2="d.dim.y1" />
          <line :x1="d.dim.x - 9" :y1="d.dim.y2" :x2="d.dim.x + 4" :y2="d.dim.y2" />
          <line :x1="d.dim.x" :y1="d.dim.y1 - 1" :x2="d.dim.x" :y2="d.dim.y2 + 1" />
          <polygon :points="`${d.dim.x},${d.dim.y1} ${d.dim.x - 3.5},${d.dim.y1 - 7} ${d.dim.x + 3.5},${d.dim.y1 - 7}`" />
          <polygon :points="`${d.dim.x},${d.dim.y2} ${d.dim.x - 3.5},${d.dim.y2 + 7} ${d.dim.x + 3.5},${d.dim.y2 + 7}`" />
        </g>
        <text v-for="(tx, k) in d.texts" :key="`t${k}`" :class="tx.cls" :x="tx.x" :y="tx.y" :text-anchor="tx.anchor">{{ tx.text }}</text>
      </svg>
    </template>
  </div>
</template>

<style scoped>
.boxes {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px 8px;
  max-width: 100%;
}
.boxes svg {
  display: block;
  min-width: 0;
  max-width: 100%;
  height: auto;
}
.boxes.pair svg {
  max-width: calc(50% - 20px);
}
.arrow {
  flex: none;
  font-size: 26px;
  font-weight: 800;
  color: #e8875a;
}
.face {
  stroke: #2b4f63;
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.solid .front {
  fill: #a9dcf2;
}
.solid .top {
  fill: #dcf2fc;
}
.solid .right {
  fill: #74bfe3;
}
/* 没有盖：顶面是看得见里面的开口 */
.solid.open .top {
  fill: #5d8ea6;
}
.wire .face {
  fill: none;
}
.tank .face {
  stroke: #3a7f9f;
}
.tank .front {
  fill: rgba(225, 244, 252, 0.35);
}
.hidden {
  stroke: #2b4f63;
  stroke-width: 1.3;
  stroke-dasharray: 5 4;
}
.tank .hidden {
  stroke: #3a7f9f;
}
.shade {
  fill: rgba(255, 165, 82, 0.75);
  stroke: #2b4f63;
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.grid {
  stroke: #2b4f63;
  stroke-width: 0.8;
  opacity: 0.75;
}
.mark {
  stroke: #e53935;
  stroke-width: 4;
  stroke-linecap: round;
}
.water-front {
  fill: rgba(92, 186, 235, 0.55);
}
.water-right {
  fill: rgba(64, 160, 214, 0.6);
}
.water-top {
  fill: rgba(158, 219, 249, 0.9);
}
.stone {
  fill: #8d8a86;
  stroke: #5f5b57;
  stroke-width: 1.2;
}
.dim line {
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.dim polygon {
  fill: var(--c-text);
}
.lab {
  font-weight: 800;
  fill: var(--c-text);
}
</style>
