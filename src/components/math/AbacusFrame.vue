<script setup lang="ts">
import { computed } from 'vue'
import { lang } from '@/engine/i18n'

/**
 * 算盘（四上练习二 7 的图）：13 档，横梁上面每档 2 颗上珠、下面每档 5 颗下珠（课本画的是这种大算盘），棕色木框、深灰珠子。
 * 靠梁的珠子才算数：上珠靠梁一颗当 5，下珠靠梁一颗当 1；n 右对齐拨在最右边几档（最右一档是个位，上面写「个位」，图里的字不注音）。
 * SVG，随宽度缩放。
 */
const props = defineProps<{ n: string }>()

const RODS = 13
/** 档距、珠子宽高、框的边、梁的粗细、上下两格的高 */
const W = 24
const BW = 20
const BH = 9
const FRAME = 7
const BEAM = 6
const UP_H = BH * 2 + 14
const LOW_H = BH * 5 + 16
const LABEL_H = 18

const width = FRAME * 2 + RODS * W
const top = LABEL_H
const beamY = top + FRAME + UP_H
const height = beamY + BEAM + LOW_H + FRAME + 2

interface Bead {
  x: number
  y: number
}
/** 每档的数字（右对齐，前面补 0）和它的珠子位置 */
const rods = computed(() => {
  const digits = props.n.padStart(RODS, '0').slice(-RODS).split('').map(Number)
  return digits.map((d, i) => {
    const cx = FRAME + i * W + W / 2
    const up: Bead[] = []
    // 上珠：2 颗；拨了 5 的那一颗靠梁，另一颗贴着上框
    const fiveDown = d >= 5
    up.push({ x: cx, y: top + FRAME + BH / 2 })
    up.push({ x: cx, y: fiveDown ? beamY - BH / 2 : top + FRAME + BH * 1.5 })
    // 下珠：5 颗；拨上去的 d % 5 颗靠梁，其余贴着下框
    const ones = d % 5
    const low: Bead[] = []
    const lowTop = beamY + BEAM
    const lowBottom = lowTop + LOW_H
    for (let k = 0; k < ones; k++) low.push({ x: cx, y: lowTop + BH / 2 + k * BH })
    for (let k = 0; k < 5 - ones; k++) low.push({ x: cx, y: lowBottom - BH / 2 - k * BH })
    return { i, cx, d, beads: [...up, ...low] }
  })
})
const onesLabel = computed(() => (lang.value === 'zh' ? '个位' : 'ones'))
const label = computed(() => (lang.value === 'zh' ? '算盘' : 'abacus'))
</script>

<template>
  <div class="abacus">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width * 1.15" :height="height * 1.15" role="img" :aria-label="label">
      <text class="ones" :x="FRAME + (RODS - 1) * W + W / 2" :y="LABEL_H - 5" text-anchor="middle">{{ onesLabel }}</text>
      <rect class="frame" :x="1" :y="top" :width="width - 2" :height="height - top - 1" rx="3" />
      <rect class="inner" :x="FRAME" :y="top + FRAME" :width="width - FRAME * 2" :height="height - top - FRAME * 2 - 1" />
      <g v-for="r in rods" :key="r.i" class="rod" :data-digit="r.d">
        <line class="stick" :x1="r.cx" :x2="r.cx" :y1="top + FRAME" :y2="height - FRAME - 1" />
        <ellipse v-for="(b, k) in r.beads" :key="k" class="bead" :cx="b.x" :cy="b.y" :rx="BW / 2" :ry="BH / 2 - 0.3" />
      </g>
      <rect class="beam" :x="FRAME" :y="beamY" :width="width - FRAME * 2" :height="BEAM" />
    </svg>
  </div>
</template>

<style scoped>
.abacus {
  max-width: 100%;
  padding: 6px 8px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
.abacus svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.frame {
  fill: #8a5a35;
  stroke: #4a2c16;
  stroke-width: 1.5;
}
.inner {
  fill: #fbf7f1;
}
.beam {
  fill: #8a5a35;
  stroke: #4a2c16;
  stroke-width: 1;
}
.stick {
  stroke: #9a6a45;
  stroke-width: 2;
}
.bead {
  fill: #5b5b5b;
  stroke: #2b2b2b;
  stroke-width: 1;
}
.ones {
  font-size: 12px;
  font-weight: 700;
  fill: var(--c-text);
}
</style>
