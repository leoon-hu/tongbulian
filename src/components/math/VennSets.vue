<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 集合图（五下「最大公因数」「最小公倍数」例 1「还可以这样表示」）：两个相交的椭圆，上面写两个圈的名字（「8 的因数」「12 的因数」），
 * 左边那一块写只属于左边的数、中间相交的那一块写公有的数（底色深一点）、右边那一块写只属于右边的数；数之间用中文逗号，
 * 可以以「…」结尾（倍数写不完）。ask = 这一块不写数、画一个大「?」（问这一块是哪些数）；caption = 中间那一块下面
 * 红箭头指着的字（「8 和 12 的公因数」）。图里的字不注音、不朗读；SVG 按 viewBox 缩放，窄栏里随宽缩小。
 */
const props = defineProps<{ left: LStr; right: LStr; only1: string[]; both: string[]; only2: string[]; ask?: 'only1' | 'both' | 'only2'; caption?: LStr }>()

const W = 340
const CY = 100 // 两个椭圆的中心高度
const RX = 105
const RY = 64
const LX = 115 // 左椭圆中心
const RXC = 225 // 右椭圆中心
const ROW = 21 // 一行数的行高

/** 一块里的数排成几行：左右两块一行 3 个，中间一行 2 个（都是一位数时 3 个）；行末带逗号，最后一行不带 */
function rowsOf(items: string[], per: number): string[] {
  const rows: string[] = []
  for (let i = 0; i < items.length; i += per) {
    const chunk = items.slice(i, i + per)
    const last = i + per >= items.length
    rows.push(chunk.join('，') + (last ? '' : '，'))
  }
  return rows
}

const regions = computed(() => {
  const midPer = props.both.every((x) => x.length <= 1) ? 3 : 2
  const list: { key: 'only1' | 'both' | 'only2'; x: number; rows: string[] }[] = [
    { key: 'only1', x: (LX - RX + (RXC - RX)) / 2 + 2, rows: rowsOf(props.only1, 3) },
    { key: 'both', x: (LX + RXC) / 2, rows: rowsOf(props.both, midPer) },
    { key: 'only2', x: (LX + RX + (RXC + RX)) / 2 - 2, rows: rowsOf(props.only2, 3) },
  ]
  return list.map((r) => ({
    ...r,
    ask: props.ask === r.key,
    // 几行数以椭圆中心为中线上下排开（基线比字的中线低 5）
    ys: r.rows.map((_, i) => CY + (i - (r.rows.length - 1) / 2) * ROW + 5),
  }))
})

const H = computed(() => (props.caption ? CY + RY + 54 : CY + RY + 8))
</script>

<template>
  <svg class="venn-sets" :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" role="img" :aria-label="t({ k: 'm5.frac.vennAria' })">
    <ellipse class="set" :cx="LX" :cy="CY" :rx="RX" :ry="RY" />
    <ellipse class="set" :cx="RXC" :cy="CY" :rx="RX" :ry="RY" />
    <text class="name" :x="LX - 10" :y="22" text-anchor="middle">{{ t(left) }}</text>
    <text class="name" :x="RXC + 10" :y="22" text-anchor="middle">{{ t(right) }}</text>
    <g v-for="r in regions" :key="r.key" class="region" :class="r.key">
      <text v-if="r.ask" class="ask" :x="r.x" :y="CY + 10" text-anchor="middle">?</text>
      <template v-else>
        <text v-for="(line, i) in r.rows" :key="i" class="nums" :x="r.x" :y="r.ys[i]" text-anchor="middle">{{ line }}</text>
      </template>
    </g>
    <g v-if="caption" class="cap">
      <line class="pointer" :x1="(LX + RXC) / 2" :y1="CY + RY - 8" :x2="(LX + RXC) / 2" :y2="CY + RY + 22" />
      <path class="tip" :d="`M${(LX + RXC) / 2} ${CY + RY + 28}l-5 -9h10z`" />
      <text class="caption" :x="(LX + RXC) / 2" :y="CY + RY + 46" text-anchor="middle">{{ t(caption) }}</text>
    </g>
  </svg>
</template>

<style scoped>
.venn-sets {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.set {
  fill: var(--c-blue);
  fill-opacity: 0.14;
  stroke: var(--c-blue);
  stroke-width: 1.8;
}
.name,
.caption {
  font-size: 15px;
  font-weight: 700;
  fill: var(--c-text);
}
.nums {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.ask {
  font-size: 30px;
  font-weight: 800;
  fill: var(--c-primary);
}
.pointer {
  stroke: var(--c-red);
  stroke-width: 2;
}
.tip {
  fill: var(--c-red);
}
</style>
