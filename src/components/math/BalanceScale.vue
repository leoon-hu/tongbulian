<script setup lang="ts">
import { computed } from 'vue'

/**
 * 天平（五下「数学广角——找次品」，照课本第 112–114 页的记录图画）：三角形的支点上一根横杆，横杆两头各竖一小段、托着一块托板，
 * 托板上一样一个地放着东西——shape = box 是方块（例 1 的钙片瓶，「用 □ 代表钙片」），ball 是圆圈（例 2 的零件，「用 ○ 表示零件」），
 * 上面写着号码（left / right 里的字；空串就只画形状）。aside = 没放上天平的，排在右边地上（一排最多 4 个，多了往上摞一排）。
 * tilt：level 平衡；left 左边低（左边重）；right 右边低。横杆斜 9°，两头的东西跟着上下移、自己不歪。
 * 图里只有号码，没有汉字；不朗读。尺寸按东西的多少算，窄屏、对战的窄栏里整张图等比缩小。
 */
const props = withDefaults(
  defineProps<{ left: string[]; right: string[]; aside?: string[]; tilt?: 'level' | 'left' | 'right'; shape?: 'box' | 'ball' }>(),
  { aside: () => [], tilt: 'level', shape: 'box' },
)

const PAD = 4
/** 一样东西的宽、高（圆圈的直径）与之间的缝 */
const IW = 24
const IGAP = 3
const STUB = 9
const TILT_DEG = 9
/** 支点三角形的高、半宽 */
const TRI_H = 22
const TRI_W = 13
/** 旁边地上一排最多几个 */
const ASIDE_ROW = 4

interface Item {
  x: number
  y: number
  label: string
}

const ih = computed(() => (props.shape === 'box' ? 28 : IW))
const panW = (n: number): number => Math.max(1, n) * IW + (Math.max(1, n) - 1) * IGAP

const lay = computed(() => {
  const h = ih.value
  const wl = panW(props.left.length)
  const wr = panW(props.right.length)
  // 横杆半长：两边的托板在中间不碰头，也不太短
  const half = Math.max(52, Math.max(wl, wr) / 2 + 24)
  const rad = (TILT_DEG * Math.PI) / 180
  const dx = half * Math.cos(rad)
  const dy = props.tilt === 'level' ? 0 : half * Math.sin(rad)
  const maxDy = half * Math.sin(rad)
  const cx = PAD + Math.max(wl / 2 + 3, 0) + dx
  const beamY = PAD + h + STUB + 2 + maxDy
  // 左边低（tilt = left）：左端往下、右端往上
  const sign = props.tilt === 'left' ? 1 : props.tilt === 'right' ? -1 : 0
  const lEnd = { x: cx - dx, y: beamY + sign * dy }
  const rEnd = { x: cx + dx, y: beamY - sign * dy }
  const place = (labels: string[], end: { x: number; y: number }, w: number): Item[] =>
    labels.map((label, i) => ({ x: end.x - w / 2 + i * (IW + IGAP), y: end.y - STUB - 2 - h, label }))
  const ground = beamY + TRI_H
  const asideX = cx + dx + wr / 2 + 20
  const asideRows = Math.ceil(props.aside.length / ASIDE_ROW)
  const aside: Item[] = props.aside.map((label, i) => ({
    x: asideX + (i % ASIDE_ROW) * (IW + IGAP),
    y: ground - (Math.floor(i / ASIDE_ROW) + 1) * (h + IGAP) + IGAP,
    label,
  }))
  const asideW = props.aside.length ? Math.min(props.aside.length, ASIDE_ROW) * (IW + IGAP) - IGAP + 20 : 0
  const right = Math.max(cx + dx + wr / 2 + 3, asideX - 20 + asideW)
  // 旁边摞了两排、比天平上的东西还高时，图往上多留一点
  const top = Math.min(0, ground - asideRows * (h + IGAP) - PAD)
  return {
    h,
    cx,
    beamY,
    lEnd,
    rEnd,
    wl,
    wr,
    ground,
    left: place(props.left, lEnd, wl),
    right: place(props.right, rEnd, wr),
    aside,
    top,
    width: Math.ceil(right + PAD),
    height: Math.ceil(ground + PAD - top),
  }
})
</script>

<template>
  <figure class="balance-scale" :data-tilt="tilt">
    <svg
      :viewBox="`0 ${lay.top} ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      aria-label="⚖"
    >
      <!-- 支点 -->
      <path
        :d="`M${lay.cx} ${lay.beamY + 1} L${lay.cx + TRI_W} ${lay.ground} L${lay.cx - TRI_W} ${lay.ground} Z`"
        class="fulcrum"
      />
      <!-- 横杆、两头的竖杆和托板 -->
      <line :x1="lay.lEnd.x" :y1="lay.lEnd.y" :x2="lay.rEnd.x" :y2="lay.rEnd.y" class="beam" />
      <g v-for="(end, k) in [{ e: lay.lEnd, w: lay.wl }, { e: lay.rEnd, w: lay.wr }]" :key="`p${k}`" class="pan">
        <line :x1="end.e.x" :y1="end.e.y" :x2="end.e.x" :y2="end.e.y - STUB" class="stub" />
        <line :x1="end.e.x - end.w / 2 - 3" :y1="end.e.y - STUB" :x2="end.e.x + end.w / 2 + 3" :y2="end.e.y - STUB" class="tray" />
      </g>
      <g
        v-for="(it, i) in [...lay.left.map((x) => ({ ...x, side: 'l' })), ...lay.right.map((x) => ({ ...x, side: 'r' })), ...lay.aside.map((x) => ({ ...x, side: 'a' }))]"
        :key="`i${i}`"
        class="item"
        :class="`side-${it.side}`"
      >
        <rect v-if="shape === 'box'" :x="it.x" :y="it.y" :width="IW" :height="lay.h" rx="3" class="thing" />
        <circle v-else :cx="it.x + IW / 2" :cy="it.y + IW / 2" :r="IW / 2" class="thing" />
        <text :x="it.x + IW / 2" :y="it.y + lay.h / 2 + 4.6" text-anchor="middle" class="label">{{ it.label }}</text>
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.balance-scale {
  margin: 0;
  max-width: 100%;
  padding: 6px 8px;
  border-radius: var(--radius-sm);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.fulcrum {
  fill: #ffffff;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.beam,
.stub,
.tray {
  stroke: var(--c-text);
  stroke-width: 2;
  stroke-linecap: round;
}
.thing {
  fill: #dff3f8;
  stroke: #3aa6c4;
  stroke-width: 1.5;
}
.label {
  fill: var(--c-text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
