<script setup lang="ts">
import { computed } from 'vue'
import type { RoundSolidSpec } from '@/types/models'
import { t } from '@/engine/i18n'
import { drawSolids } from '@/components/math/roundSolidGeometry'

/**
 * 圆柱、圆锥立体图（六下「圆柱与圆锥」，照课本斜着往下看的画法）：一个或几个并排，几何在 roundSolidGeometry.ts。
 * 底面是扁椭圆，看不见的那半圈画虚线；朝着人的侧面涂色、底面涂浅色。颜色按 tone（蓝、粉、绿、沙黄），一组图里颜色不跟形状走。
 * 尺寸线、半径线、字母标记画在图外，图里只写数、字母（单位写在题目文字里），不注音、不朗读；读屏只说「圆柱」「圆锥」……
 * numbered = 每个下面标 1、2、3（选项就是这几个数），arrow = 两个中间画箭头。
 */
const props = withDefaults(defineProps<{ items: RoundSolidSpec[]; numbered?: boolean; arrow?: boolean }>(), { numbered: false, arrow: false })

const DEFAULT_TONE: Record<RoundSolidSpec['shape'], number> = { cylinder: 0, cone: 1, frustum: 2, cut: 0, sphere: 2, silo: 0, hopper: 3, bottle: 0 }
const toneOf = (s: RoundSolidSpec): number => Math.abs(Math.trunc(s.tone ?? DEFAULT_TONE[s.shape])) % 4

const pics = computed(() => drawSolids(props.items).map((d, i) => ({ ...d, tone: toneOf(props.items[i]!), glass: props.items[i]!.water !== undefined || props.items[i]!.shape === 'bottle' })))
const label = computed(() => [...new Set(props.items.map((s) => t({ k: `m6.cyl.aria.${s.shape}` })))].join('、'))
</script>

<template>
  <div class="solids" :class="{ many: items.length > 2 }" role="img" :aria-label="label">
    <template v-for="(p, i) in pics" :key="i">
      <span v-if="arrow && i > 0" class="arrow" aria-hidden="true">→</span>
      <figure class="one">
        <svg :class="[`t${p.tone}`, { glass: p.glass }]" :viewBox="`0 0 ${p.width} ${p.height}`" :width="p.width" :height="p.height" aria-hidden="true">
          <path v-for="(f, j) in p.fills" :key="`f${j}`" class="fill" :class="f.cls" :d="f.d" />
          <template v-if="p.water">
            <path v-for="(f, j) in p.water.fills" :key="`w${j}`" class="fill water" :d="f.d" />
            <path class="surface" :d="p.water.surface" />
          </template>
          <path v-for="(d, j) in p.hidden" :key="`h${j}`" class="edge hidden" :d="d" />
          <path v-for="(d, j) in p.edges" :key="`e${j}`" class="edge" :d="d" />
          <path v-for="(d, j) in p.axes" :key="`a${j}`" class="axis" :d="d" />
          <path v-for="(d, j) in p.radii" :key="`r${j}`" class="radius" :d="d" />
          <path v-for="(d, j) in p.dims" :key="`d${j}`" class="dim" :d="d" />
          <circle v-for="(c, j) in p.dots" :key="`c${j}`" class="dot" :cx="c[0]" :cy="c[1]" r="2.6" />
          <text v-for="(tx, j) in p.texts" :key="`t${j}`" class="lbl" :x="tx.x" :y="tx.y" :text-anchor="tx.anchor">{{ tx.text }}</text>
          <g v-for="(b, j) in p.badges" :key="`b${j}`" class="mark">
            <line v-if="b.lead" class="lead" :x1="b.lead[0]" :y1="b.lead[1]" :x2="b.lead[2]" :y2="b.lead[3]" />
            <circle class="badge" :cx="b.x" :cy="b.y" r="11" />
            <text class="badge-txt" :x="b.x" :y="b.y + 5" text-anchor="middle">{{ b.text }}</text>
          </g>
        </svg>
        <figcaption v-if="numbered">{{ i + 1 }}</figcaption>
      </figure>
    </template>
  </div>
</template>

<style scoped>
.solids {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 6px 8px;
  max-width: 100%;
}
.one {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}
.one svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.many .one {
  padding: 4px 5px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.one figcaption {
  min-width: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-md);
  text-align: center;
}
.arrow {
  font-size: 26px;
  font-weight: 800;
  color: var(--c-text-soft, #777);
}

/* 颜色：t0 蓝、t1 粉、t2 绿、t3 沙黄；侧面中间色、底面浅色、轮廓深色 */
.t0 {
  --side: #a9d6f5;
  --side2: #8cc4ec;
  --cap: #dbeffc;
  --ink: #2b6ca3;
}
.t1 {
  --side: #f6bfcd;
  --side2: #ef9fb4;
  --cap: #fde3ea;
  --ink: #b24a6a;
}
.t2 {
  --side: #b5e6cc;
  --side2: #93d6b2;
  --cap: #e1f6ea;
  --ink: #2c8a5f;
}
.t3 {
  --side: #f2d29b;
  --side2: #e9bd73;
  --cap: #fbecd0;
  --ink: #a7692a;
}
.fill {
  stroke: none;
}
.fill.side {
  fill: var(--side);
}
.fill.side2 {
  fill: var(--side2);
}
.fill.cap {
  fill: var(--cap);
}
.fill.glass {
  fill: rgba(220, 238, 250, 0.55);
}
.fill.glass-cap {
  fill: rgba(232, 245, 253, 0.8);
}
.fill.lid,
.fill.lid-top {
  fill: #f08aa6;
}
.fill.lid-top {
  fill: #f7b3c5;
}
.glass .fill.side {
  fill: rgba(220, 238, 250, 0.45);
}
.glass .fill.cap {
  fill: rgba(232, 245, 253, 0.7);
}
.fill.water {
  fill: rgba(92, 186, 235, 0.55);
}
.surface {
  fill: rgba(158, 219, 249, 0.95);
  stroke: #4aa3d8;
  stroke-width: 1.2;
}
.edge {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.8;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.edge.hidden {
  stroke-width: 1.3;
  stroke-dasharray: 5 4;
}
.axis {
  fill: none;
  stroke: var(--ink);
  stroke-width: 1.3;
  stroke-dasharray: 4 3;
}
.radius {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.4;
}
.dim {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.dot {
  fill: var(--c-text);
}
.lbl {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-text);
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3px;
  stroke-linejoin: round;
}
.lead {
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.badge {
  fill: #fff;
  stroke: var(--c-primary-dark, #c45a00);
  stroke-width: 2;
}
.badge-txt {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-primary-dark, #c45a00);
}
</style>
