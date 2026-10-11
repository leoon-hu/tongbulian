<script setup lang="ts">
import { computed } from 'vue'
import type { PatternFig } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 找规律的图（五上「用字母表示 ax+b 的数量关系」，照课本画）：几幅并排、底边对齐，圆圈里都不写字。
 * tables：例 4（每张桌子上下各坐 1 人）、练习十三 6（上下各坐 2 人）——长方形桌子一张接一张拼成一排，整排两头各坐 1 人；
 * rows：练习十二 1 的圆片，从上往下一排一排、每排居中；
 * stones：练习十二 5 的棋子，r 行 r + 1 列，从上往下第 i 行前 i 个是黑棋（左下角是黑棋的台阶）。
 * more：最后画「……」（照这样拼 / 摆下去）；numbered：每幅下面标 1、2、3（课本的 ①②③）。
 * 图里没有字，不注音、不朗读（题目要说的都写在题干文字里）；整张图按 viewBox 等比缩放，窄栏里不会伸出去。
 */
const props = withDefaults(defineProps<{ figs: PatternFig[]; more?: boolean; numbered?: boolean }>(), { more: false, numbered: false })

/** 四周留白、幅与幅之间的空 */
const PAD = 4
const GAP = 20
/** 「……」占的宽 */
const MORE_W = 34
/** 编号那一行的高 */
const NUM_H = 26

/** 拼桌子：座位半径、座位和桌边的空、桌子高、一张桌子的宽（上下各坐 1 人 / 2 人） */
const SEAT_R = 6.5
const SEAT_GAP = 3
const TABLE_H = 18
const TABLE_W = { 1: 26, 2: 44 } as const
/** 圆片、棋子：圆心距与半径 */
const DISC_D = 17
const DISC_R = 7
const STONE_D = 18
const STONE_R = 7.5

type Shape =
  | { k: 'table'; x: number; y: number; w: number; h: number }
  | { k: 'seat' | 'disc' | 'black' | 'white'; x: number; y: number; r: number }

interface Drawn {
  w: number
  h: number
  shapes: Shape[]
}

const r1 = (n: number): number => Math.round(n * 10) / 10

/** 一幅图在自己的坐标里（左上角 0, 0）画成哪些形状 */
function draw(f: PatternFig): Drawn {
  const shapes: Shape[] = []
  if (f.t === 'tables') {
    const tw = TABLE_W[f.side]
    const edge = 2 * SEAT_R + SEAT_GAP // 一圈座位占的宽 / 高
    const top = edge
    for (let i = 0; i < f.n; i++) {
      const x = edge + i * tw
      shapes.push({ k: 'table', x, y: top, w: tw, h: TABLE_H })
      for (let s = 0; s < f.side; s++) {
        const cx = x + (tw * (2 * s + 1)) / (2 * f.side)
        shapes.push({ k: 'seat', x: cx, y: SEAT_R, r: SEAT_R })
        shapes.push({ k: 'seat', x: cx, y: top + TABLE_H + SEAT_GAP + SEAT_R, r: SEAT_R })
      }
    }
    const cy = top + TABLE_H / 2
    shapes.push({ k: 'seat', x: SEAT_R, y: cy, r: SEAT_R })
    shapes.push({ k: 'seat', x: edge + f.n * tw + SEAT_GAP + SEAT_R, y: cy, r: SEAT_R })
    return { w: 2 * edge + f.n * tw, h: 2 * edge + TABLE_H, shapes }
  }
  if (f.t === 'rows') {
    const most = Math.max(...f.counts)
    const w = most * DISC_D
    f.counts.forEach((c, row) => {
      const x0 = (w - c * DISC_D) / 2 + DISC_D / 2
      for (let i = 0; i < c; i++) shapes.push({ k: 'disc', x: x0 + i * DISC_D, y: row * DISC_D + DISC_D / 2, r: DISC_R })
    })
    return { w, h: f.counts.length * DISC_D, shapes }
  }
  for (let row = 0; row < f.r; row++) {
    for (let col = 0; col <= f.r; col++) {
      shapes.push({ k: col <= row ? 'black' : 'white', x: col * STONE_D + STONE_D / 2, y: row * STONE_D + STONE_D / 2, r: STONE_R })
    }
  }
  return { w: (f.r + 1) * STONE_D, h: f.r * STONE_D, shapes }
}

const lay = computed(() => {
  const pics = props.figs.map(draw)
  const tallest = Math.max(...pics.map((p) => p.h))
  let x = PAD
  const placed = pics.map((p) => {
    const at = { dx: x, dy: PAD + tallest - p.h, ...p }
    x += p.w + GAP
    return at
  })
  const right = x - GAP
  const width = Math.ceil(right + (props.more ? MORE_W : 0) + PAD)
  const height = Math.ceil(PAD + tallest + (props.numbered ? NUM_H : 0) + PAD)
  return { placed, tallest, right, width, height }
})
</script>

<template>
  <figure class="pattern-dots">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="t({ k: 'm5.let.pat.aria' })"
    >
      <g v-for="(p, i) in lay.placed" :key="i" class="fig" :transform="`translate(${r1(p.dx)} ${r1(p.dy)})`">
        <template v-for="(s, j) in p.shapes" :key="j">
          <rect v-if="s.k === 'table'" class="table" :x="r1(s.x)" :y="r1(s.y)" :width="r1(s.w)" :height="r1(s.h)" />
          <circle v-else :class="s.k" :cx="r1(s.x)" :cy="r1(s.y)" :r="s.r" />
        </template>
      </g>
      <template v-if="numbered">
        <g v-for="(p, i) in lay.placed" :key="`n${i}`" class="num">
          <circle :cx="r1(p.dx + p.w / 2)" :cy="r1(PAD + lay.tallest + NUM_H / 2 + 1)" r="9" class="num-ring" />
          <text :x="r1(p.dx + p.w / 2)" :y="r1(PAD + lay.tallest + NUM_H / 2 + 5.5)" text-anchor="middle" class="num-txt">{{ i + 1 }}</text>
        </g>
      </template>
      <text v-if="more" class="more" :x="r1(lay.right + MORE_W / 2)" :y="r1(PAD + lay.tallest / 2 + 4)" text-anchor="middle">……</text>
    </svg>
  </figure>
</template>

<style scoped>
.pattern-dots {
  margin: 0;
  max-width: 100%;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.table {
  fill: #fbd8c3;
  stroke: #c8835f;
  stroke-width: 1.5;
}
.seat,
.disc {
  fill: #cfe7fa;
  stroke: #3d85c6;
  stroke-width: 1.5;
}
.black {
  fill: #2b2b2b;
  stroke: #2b2b2b;
  stroke-width: 1;
}
.white {
  fill: #fff;
  stroke: #2b2b2b;
  stroke-width: 1.2;
}
.num-ring {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.num-txt {
  font-size: 13px;
  font-weight: 700;
  fill: var(--c-text);
}
.more {
  font-size: 16px;
  font-weight: 700;
  fill: var(--c-text-light);
}
</style>
