<script setup lang="ts">
import { computed } from 'vue'
import type { ShapeKind } from '@/types/models'

/**
 * 单个图形，自己画（不用 emoji）：
 * - 每个图形都是「一个」整体，数图形时不会被拆成多个（曾用 🧱 砖块 emoji 会显示成两块，导致数错）。
 * - 正方体 / 长方体用 SVG 按教材的斜二测画法：正面是真正的正方形 / 长方形，往后的棱 45° 画一半长，三面明暗 + 描边
 *   （2026-09-20 用户说 CSS 3D 版「不太像正方体」：那版正面是歪的平行四边形、没有棱，改成这样）；
 *   圆柱有上底椭圆、球带高光，平面图形用 CSS。
 */
const props = withDefaults(defineProps<{ shape: ShapeKind; size?: number }>(), { size: 72 })

const FLAT_COLOR: Partial<Record<ShapeKind, string>> = {
  square: '#4aa3ff',
  rectangle: '#3ecf8e',
  triangle: '#ff8a3d',
  circle: '#a78bfa',
  parallelogram: '#ff6b6b',
  pentagon: '#f7b731',
  hexagon: '#26c6da',
  trapezoid: '#8bc34a',
  'right-triangle': '#ff7eb6',
}

const isBox = computed(() => props.shape === 'cube' || props.shape === 'cuboid')
const isCylinder = computed(() => props.shape === 'cylinder')
const isSphere = computed(() => props.shape === 'sphere')
const isFlat = computed(() => props.shape in FLAT_COLOR)

/**
 * 斜二测的三个面（多边形顶点）：正面 a × h，深 d 的棱按 45°、一半长画成 r = d / 2 / √2 的水平与垂直位移。
 * 正方体三棱相等；长方体的正面明显比正方体细长。
 */
const box = computed(() => {
  const s = props.size
  const cube = props.shape === 'cube'
  const a = cube ? s * 0.6 : s * 0.8
  const h = cube ? a : s * 0.4
  const d = cube ? a : s * 0.5
  const r = (d / 2) * Math.SQRT1_2
  const x0 = 0
  const y0 = r
  const pt = (x: number, y: number): string => `${x.toFixed(1)},${y.toFixed(1)}`
  const stroke = Math.max(1.5, s / 48)
  return {
    width: a + r,
    height: h + r,
    stroke,
    front: [pt(x0, y0), pt(x0 + a, y0), pt(x0 + a, y0 + h), pt(x0, y0 + h)].join(' '),
    top: [pt(x0, y0), pt(x0 + r, y0 - r), pt(x0 + a + r, y0 - r), pt(x0 + a, y0)].join(' '),
    right: [pt(x0 + a, y0), pt(x0 + a + r, y0 - r), pt(x0 + a + r, y0 + h - r), pt(x0 + a, y0 + h)].join(' '),
  }
})
const boxView = computed(() => {
  const m = box.value.stroke
  return `${-m} ${-m} ${box.value.width + m * 2} ${box.value.height + m * 2}`
})
</script>

<template>
  <div class="glyph">
    <!-- 正方体 / 长方体：斜二测画法的三个面 + 描边 -->
    <span v-if="isBox" class="box3d" :class="shape">
      <svg :width="box.width + box.stroke * 2" :height="box.height + box.stroke * 2" :viewBox="boxView" aria-hidden="true">
        <polygon class="bface btop" :points="box.top" />
        <polygon class="bface bright" :points="box.right" />
        <polygon class="bface bfront" :points="box.front" />
        <g class="bedges" :stroke-width="box.stroke">
          <polygon :points="box.front" />
          <polygon :points="box.top" />
          <polygon :points="box.right" />
        </g>
      </svg>
    </span>

    <!-- 圆柱 -->
    <span
      v-else-if="isCylinder"
      class="cyl"
      :style="{ width: `${size * 0.62}px`, height: `${size * 0.8}px` }"
    >
      <span class="cyl-body" />
      <span class="cyl-top" />
    </span>

    <!-- 球 -->
    <span
      v-else-if="isSphere"
      class="sphere"
      :style="{ width: `${size * 0.82}px`, height: `${size * 0.82}px` }"
    />

    <!-- 平面图形 -->
    <span
      v-else-if="isFlat"
      class="flat"
      :class="shape"
      :style="{ '--s': `${size}px`, '--col': FLAT_COLOR[shape] }"
    />
  </div>
</template>

<style scoped>
.glyph {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

/* ── 立体盒子（正方体/长方体）：斜二测的三个可见面，正面亮、顶面更亮、右面暗，棱描边 ── */
.box3d {
  display: inline-flex;
  line-height: 0;
}
.box3d svg {
  display: block;
  overflow: visible;
}
.bfront {
  fill: #ffb887;
}
.btop {
  fill: #ffd9b0;
}
.bright {
  fill: #e9772a;
}
.bedges {
  fill: none;
  stroke: #7a3e12;
  stroke-linejoin: round;
}

/* ── 圆柱 ── */
.cyl {
  position: relative;
}
.cyl-body {
  position: absolute;
  left: 0;
  top: 8%;
  width: 100%;
  height: 92%;
  background: linear-gradient(to right, #a7d2ff, #3f8fdf 55%, #2f7fd6);
  border-radius: 0 0 50% 50% / 0 0 22% 22%;
}
.cyl-top {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 22%;
  background: #cfe6ff;
  border: 2px solid #7fb3ec;
  border-radius: 50%;
  box-sizing: border-box;
}

/* ── 球 ── */
.sphere {
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #b9f0d6, #3ecf8e 62%, #2fa877);
}

/* ── 平面图形 ── */
.flat {
  display: inline-block;
}
.flat.square {
  width: var(--s);
  height: var(--s);
  background: var(--col);
  border-radius: 6px;
}
.flat.rectangle {
  width: calc(var(--s) * 1.5);
  height: var(--s);
  background: var(--col);
  border-radius: 6px;
}
.flat.circle {
  width: var(--s);
  height: var(--s);
  background: var(--col);
  border-radius: 50%;
}
.flat.triangle {
  width: 0;
  height: 0;
  border-left: calc(var(--s) * 0.55) solid transparent;
  border-right: calc(var(--s) * 0.55) solid transparent;
  border-bottom: var(--s) solid var(--col);
}
.flat.parallelogram {
  width: calc(var(--s) * 1.3);
  height: calc(var(--s) * 0.72);
  background: var(--col);
  transform: skewX(-20deg);
  border-radius: 4px;
}
/* 二年级的多边形：正五边形、正六边形、等腰梯形、直角三角形（clip-path 裁出直边） */
.flat.pentagon {
  width: var(--s);
  height: var(--s);
  background: var(--col);
  clip-path: polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%);
}
.flat.hexagon {
  width: calc(var(--s) * 1.1);
  height: var(--s);
  background: var(--col);
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}
.flat.trapezoid {
  width: calc(var(--s) * 1.4);
  height: calc(var(--s) * 0.8);
  background: var(--col);
  clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
}
.flat.right-triangle {
  width: calc(var(--s) * 1.2);
  height: var(--s);
  background: var(--col);
  clip-path: polygon(0% 0%, 0% 100%, 100% 100%);
}
</style>
