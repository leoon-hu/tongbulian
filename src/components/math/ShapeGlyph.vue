<script setup lang="ts">
import { computed } from 'vue'
import type { ShapeKind } from '@/types/models'

/**
 * 单个图形，全部用 CSS 绘制（不用 emoji）：
 * - 每个图形都是「一个」整体，数图形时不会被拆成多个（曾用 🧱 砖块 emoji 会显示成两块，导致数错）。
 * - 立体图形按棱、面比例准确：正方体各棱相等、长方体明显细长、圆柱有上底椭圆、球带高光。
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

// 长方体的正面明显比正方体细长
const box = computed(() => {
  const s = props.size
  return props.shape === 'cube'
    ? { w: s * 0.58, h: s * 0.58, d: s * 0.5 }
    : { w: s * 0.86, h: s * 0.44, d: s * 0.36 }
})
const boxVars = computed(() => ({
  '--w': `${box.value.w}px`,
  '--h': `${box.value.h}px`,
  '--d': `${box.value.d}px`,
  width: `${box.value.w}px`,
  height: `${box.value.h}px`,
}))
</script>

<template>
  <div class="glyph">
    <!-- 正方体 / 长方体：三面立体盒子 -->
    <span v-if="isBox" class="box3d" :style="boxVars">
      <span class="bface bfront" />
      <span class="bface btop" />
      <span class="bface bright" />
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

/* ── 立体盒子（正方体/长方体）：正交投影的三个可见面 ── */
.box3d {
  position: relative;
  transform-style: preserve-3d;
  transform: rotateX(-24deg) rotateY(-34deg);
  margin: calc(var(--d) * 0.5);
}
.bface {
  position: absolute;
  left: 0;
  top: 0;
}
.bfront {
  width: var(--w);
  height: var(--h);
  background: #ffb887;
  transform: translateZ(calc(var(--d) / 2));
}
.btop {
  width: var(--w);
  height: var(--d);
  top: calc(var(--h) / 2 - var(--d) / 2);
  background: #ffd9b0;
  transform: rotateX(90deg) translateZ(calc(var(--h) / 2));
}
.bright {
  width: var(--d);
  height: var(--h);
  left: calc(var(--w) / 2 - var(--d) / 2);
  background: #ec7a2c;
  transform: rotateY(90deg) translateZ(calc(var(--w) / 2));
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
