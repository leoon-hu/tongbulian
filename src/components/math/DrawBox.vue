<script setup lang="ts">
import { computed } from 'vue'
import type { ChanceBalls, ChanceColor } from '@/types/models'

/**
 * 摸球盒（五上「可能性」，照课本第 99–106 页画）：顶上开一个圆洞的盒子，前面和右面透明，看得见里面的球；
 * piece = 'pawn' 画成棋子（例 1、例 2 的盒子），bag = 画成下面透明的纸袋（练习十九 4）。一个或几个并排，
 * numbered 时下面标 1、2、3……（选项就是这几个数）。
 * 里面的球按颜色打散排成两三排（同一盒球每次画得一样：打散的顺序只由盒子里的球决定），每盒不超过 15 个、数得清。
 * 图里不写字、不朗读：题目文字里会说清颜色和个数（要数的时候）；读屏只说「盒子里有几个球」。
 * 尺寸按球数算（一盒约 150 × 100），窄屏上等比缩小。
 */
const props = withDefaults(defineProps<{ boxes: ChanceBalls[][]; piece?: 'ball' | 'pawn'; bag?: boolean; numbered?: boolean }>(), {
  piece: 'ball',
  bag: false,
  numbered: false,
})

const FILL: Record<ChanceColor, string> = { red: '#e8453c', yellow: '#f6c445', blue: '#3d8fe0', green: '#45b36b', white: '#ffffff' }
const EDGE: Record<ChanceColor, string> = { red: '#a92a22', yellow: '#b8862a', blue: '#245f9e', green: '#2a7d48', white: '#8a96a3' }

const DEPTH_X = 18
const DEPTH_Y = 11
const PAD = 8

/** 打散：只由球决定的伪随机（同一盒每次画得一样） */
function shuffled(balls: ChanceBalls[]): ChanceColor[] {
  const list = balls.flatMap((b) => Array.from({ length: b.n }, () => b.color))
  let s = balls.reduce((h, b, i) => (h * 31 + b.n * 7 + i * 13 + b.color.length) >>> 0, 17) || 1
  const rnd = (): number => {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0
    return (s >>> 8) / 16777216
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[list[i], list[j]] = [list[j]!, list[i]!]
  }
  return list
}

const figs = computed(() =>
  props.boxes.map((balls) => {
    const list = shuffled(balls)
    const pawn = props.piece === 'pawn'
    const step = pawn ? 16 : 18
    const rowH = pawn ? 22 : 16
    const perRow = Math.max(3, Math.min(pawn ? 7 : 6, Math.ceil(list.length / (pawn ? 2 : 3))))
    const rows = Math.max(1, Math.ceil(list.length / perRow))
    const innerW = perRow * step
    const W = innerW + PAD * 2 + 4
    const H = rows * rowH + PAD * 2 + (pawn ? 8 : 6)
    const x0 = 2
    const y0 = DEPTH_Y + 2
    // 从后排往前排画（后排靠上、稍微往右，像放在盒底）
    const items = list.map((color, k) => {
      const row = Math.floor(k / perRow)
      const col = k % perRow
      const back = rows - 1 - row
      return {
        color,
        x: x0 + PAD + col * step + step / 2 + back * 4,
        y: y0 + H - PAD - row * rowH - (pawn ? 2 : rowH / 2) - back * 3,
        back,
      }
    })
    items.sort((a, b) => b.back - a.back)
    return { W, H, x0, y0, items, total: list.length }
  }),
)

/** 棋子：底座 + 身子 + 圆头（脚下中点在 x, y） */
const pawnPath = (x: number, y: number): string =>
  `M${x - 6.5} ${y} h13 q0 -3 -2.5 -3.5 l-1.8 -8 q2.2 -1.5 0.8 -3.2 h-5 q-1.4 1.7 0.8 3.2 l-1.8 8 q-2.5 0.5 -2.5 3.5 z`
</script>

<template>
  <div class="draw-boxes" :class="{ single: boxes.length === 1 }">
    <figure v-for="(f, i) in figs" :key="i" class="draw-box">
      <svg
        :viewBox="`0 0 ${f.W + DEPTH_X + 4} ${f.H + DEPTH_Y + 4}`"
        :width="f.W + DEPTH_X + 4"
        :height="f.H + DEPTH_Y + 4"
        role="img"
        :aria-label="`${f.total}`"
      >
        <template v-if="bag">
          <!-- 纸袋：上口一圈锯齿边，下面透明 -->
          <path
            class="bag"
            :d="`M${f.x0 + 4} ${f.y0 - 4} L${f.x0 + f.W + 6} ${f.y0 - 4} L${f.x0 + f.W + 2} ${f.y0 + f.H} Q${f.x0 + f.W / 2 + 4} ${f.y0 + f.H + 8} ${f.x0} ${f.y0 + f.H} Z`"
          />
          <path class="bag-window" :d="`M${f.x0 + 3} ${f.y0 + f.H * 0.42} L${f.x0 + f.W + 3} ${f.y0 + f.H * 0.42} L${f.x0 + f.W + 1} ${f.y0 + f.H - 1} Q${f.x0 + f.W / 2 + 3} ${f.y0 + f.H + 6} ${f.x0 + 2} ${f.y0 + f.H - 1} Z`" />
          <line class="bag-fold" :x1="f.x0 + 14" :y1="f.y0 - 2" :x2="f.x0 + 10" :y2="f.y0 + f.H - 4" />
        </template>
        <template v-else>
          <!-- 盒子：右面、顶面（开圆洞）、透明的前面 -->
          <path class="side" :d="`M${f.x0 + f.W} ${f.y0} l${DEPTH_X} ${-DEPTH_Y} v${f.H} l${-DEPTH_X} ${DEPTH_Y} z`" />
          <path class="top" :d="`M${f.x0} ${f.y0} l${DEPTH_X} ${-DEPTH_Y} h${f.W} l${-DEPTH_X} ${DEPTH_Y} z`" />
          <ellipse class="hole" :cx="f.x0 + f.W / 2 + DEPTH_X / 2" :cy="f.y0 - DEPTH_Y / 2" :rx="Math.min(18, f.W / 5)" ry="3.2" />
          <path class="floor" :d="`M${f.x0} ${f.y0 + f.H} l${DEPTH_X} ${-DEPTH_Y} h${f.W} l${-DEPTH_X} ${DEPTH_Y} z`" />
        </template>
        <g v-for="(b, k) in f.items" :key="k">
          <path v-if="piece === 'pawn'" class="pawn" :d="pawnPath(b.x, b.y)" :fill="FILL[b.color]" :stroke="EDGE[b.color]" />
          <template v-else>
            <circle class="ball" :cx="b.x" :cy="b.y" r="7.4" :fill="FILL[b.color]" :stroke="EDGE[b.color]" />
            <circle class="shine" :cx="b.x - 2.4" :cy="b.y - 2.6" r="1.9" />
          </template>
        </g>
        <rect v-if="!bag" class="front" :x="f.x0" :y="f.y0" :width="f.W" :height="f.H" />
      </svg>
      <figcaption v-if="numbered" class="no">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.draw-boxes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px 18px;
  max-width: 100%;
}
.draw-box {
  margin: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.single svg {
  width: min(100%, 200px);
}
.side {
  fill: #c9d0d8;
  fill-opacity: 0.55;
  stroke: #4a5560;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.top {
  fill: #ead6ad;
  stroke: #4a5560;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.hole {
  fill: #5d4e3c;
}
.floor {
  fill: #6f7781;
  fill-opacity: 0.35;
}
.front {
  fill: #dfe6ee;
  fill-opacity: 0.18;
  stroke: #4a5560;
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.bag {
  fill: #d9b98a;
  stroke: #8a6a3e;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.bag-window {
  fill: #f4ead9;
  stroke: #8a6a3e;
  stroke-width: 1;
  stroke-dasharray: 3 2;
}
.bag-fold {
  stroke: #a98552;
  stroke-width: 1;
}
.ball,
.pawn {
  stroke-width: 1;
}
.shine {
  fill: #fff;
  fill-opacity: 0.7;
}
.no {
  margin-top: 2px;
  font-size: 17px;
  font-weight: 800;
  color: var(--c-text);
}
</style>
