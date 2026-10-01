<script setup lang="ts">
import { computed } from 'vue'
import type { ShapeKind } from '@/types/models'

/**
 * 单个图形，自己画（不用 emoji）：
 * - 每个图形都是「一个」整体，数图形时不会被拆成多个（曾用 🧱 砖块 emoji 会显示成两块，导致数错）。
 * - 正方体 / 长方体用 SVG 按教材的斜二测画法：正面是真正的正方形 / 长方形，往后的棱 45° 画一半长，三面明暗 + 描边
 *   （2026-09-20 用户说 CSS 3D 版「不太像正方体」：那版正面是歪的平行四边形、没有棱，改成这样）；
 *   圆柱有上底椭圆、球带高光。
 * - 平面图形是 SVG 多边形（直角、没有圆角）。颜色不跟图形走（2026-10-01 按课本核对：原来正方形固定蓝、长方形固定绿，孩子能靠颜色认），
 *   tone 选色板里的一种（不填都是第一种）；turn 转一个角度（课本一下 p1 有斜放的正方形、各种方向的三角形）；
 *   form 换三角形的样子（0 等腰、1 直角、2 一般三角形）。
 */
const props = withDefaults(defineProps<{ shape: ShapeKind; size?: number; tone?: number; turn?: number; form?: number }>(), { size: 72 })

/** 平面图形的色板（tone 是下标）：每种图形都可能是任何一种颜色 */
const TONES = ['#4aa3ff', '#3ecf8e', '#ff8a3d', '#a78bfa', '#ff6b6b', '#f7b731']

type Pt = [number, number]
/** 平面图形的顶点（以 size 为 1 的坐标；圆另画） */
const FLAT_POINTS: Partial<Record<ShapeKind, Pt[]>> = {
  square: [[0, 0], [1, 0], [1, 1], [0, 1]],
  rectangle: [[0, 0], [1.5, 0], [1.5, 0.9], [0, 0.9]],
  parallelogram: [[0.32, 0], [1.4, 0], [1.08, 0.75], [0, 0.75]],
  pentagon: [[0.5, 0], [1, 0.38], [0.81, 1], [0.19, 1], [0, 0.38]],
  hexagon: [[0.275, 0], [0.825, 0], [1.1, 0.5], [0.825, 1], [0.275, 1], [0, 0.5]],
  trapezoid: [[0.35, 0], [1.05, 0], [1.4, 0.8], [0, 0.8]],
  'right-triangle': [[0, 0], [0, 1], [1.2, 1]],
}
/** 三角形的三种样子：等腰、直角、一般 */
const TRIANGLES: Pt[][] = [
  [[0.55, 0], [1.1, 1], [0, 1]],
  [[0, 0], [0, 1], [1.15, 1]],
  [[0.25, 0], [1.3, 1], [0, 0.82]],
]

const isBox = computed(() => props.shape === 'cube' || props.shape === 'cuboid')
const isCylinder = computed(() => props.shape === 'cylinder')
const isSphere = computed(() => props.shape === 'sphere')
const isCircle = computed(() => props.shape === 'circle')
const isFlat = computed(() => isCircle.value || props.shape === 'triangle' || props.shape in FLAT_POINTS)
const flatColor = computed(() => TONES[Math.abs(Math.trunc(props.tone ?? 0)) % TONES.length]!)

/** 平面多边形：按 size 放大、绕中心转 turn 度，再按转完的外框定 SVG 大小 */
const flat = computed(() => {
  const s = props.size
  const base = props.shape === 'triangle' ? TRIANGLES[Math.abs(Math.trunc(props.form ?? 0)) % TRIANGLES.length]! : (FLAT_POINTS[props.shape] ?? [])
  const pts = base.map(([x, y]) => [x * s, y * s] as Pt)
  const cx = pts.reduce((a, p) => a + p[0], 0) / (pts.length || 1)
  const cy = pts.reduce((a, p) => a + p[1], 0) / (pts.length || 1)
  const rad = ((props.turn ?? 0) * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const rot = pts.map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos] as Pt)
  const xs = rot.map((p) => p[0])
  const ys = rot.map((p) => p[1])
  const stroke = Math.max(1.5, s / 40)
  const minX = Math.min(...xs) - stroke
  const minY = Math.min(...ys) - stroke
  const w = Math.max(...xs) - Math.min(...xs) + stroke * 2
  const h = Math.max(...ys) - Math.min(...ys) + stroke * 2
  return {
    width: w,
    height: h,
    stroke,
    viewBox: `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`,
    points: rot.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '),
  }
})

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

    <!-- 平面图形：圆 / 多边形（颜色、角度由 tone / turn 定，与图形无关） -->
    <svg
      v-else-if="isCircle"
      class="flat circle"
      :width="size + 4"
      :height="size + 4"
      :viewBox="`-2 -2 ${size + 4} ${size + 4}`"
      aria-hidden="true"
    >
      <circle class="fshape" :cx="size / 2" :cy="size / 2" :r="size / 2" :fill="flatColor" :stroke-width="Math.max(1.5, size / 40)" />
    </svg>
    <svg
      v-else-if="isFlat"
      class="flat"
      :class="shape"
      :width="flat.width"
      :height="flat.height"
      :viewBox="flat.viewBox"
      aria-hidden="true"
    >
      <polygon class="fshape" :points="flat.points" :fill="flatColor" :stroke-width="flat.stroke" />
    </svg>
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

/* ── 平面图形：SVG 直边、尖角（stroke-linejoin: miter），描一圈深色边 ── */
.flat {
  display: block;
  overflow: visible;
}
.fshape {
  stroke: rgba(0, 0, 0, 0.28);
  stroke-linejoin: miter;
}
</style>
