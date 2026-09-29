<script setup lang="ts">
import { computed } from 'vue'

/**
 * 组合立体图（三年级「观察物体」）：绿色长方体（斜二测，同 ShapeGlyph 的画法）+ 红色圆柱。
 * on：圆柱立在长方体顶面正中（做一做 2）；beside：圆柱立在长方体右边的桌面上、进深居中（练习一 2）。
 * 颜色照课本：长方体绿、圆柱红，和「看到的样子」（ViewGlyph）同色，孩子才对得上。
 */
const props = withDefaults(defineProps<{ arrangement: 'on' | 'beside'; size?: number }>(), { size: 150 })

const geo = computed(() => {
  const s = props.size
  const a = s * 0.62 // 长方体正面宽
  const h = s * 0.22 // 正面高
  const d = s * 0.36 // 进深
  const r = (d / 2) * Math.SQRT1_2
  const cylW = s * 0.2 // 圆柱直径
  const cylH = s * 0.3 // 圆柱高
  const ry = cylW * 0.18 // 圆柱上下底椭圆的半短轴
  const top = cylH + ry + 4
  const x0 = 2
  const y0 = top + r
  const pt = (x: number, y: number): string => `${x.toFixed(1)},${y.toFixed(1)}`
  const front = [pt(x0, y0), pt(x0 + a, y0), pt(x0 + a, y0 + h), pt(x0, y0 + h)].join(' ')
  const topFace = [pt(x0, y0), pt(x0 + r, y0 - r), pt(x0 + a + r, y0 - r), pt(x0 + a, y0)].join(' ')
  const right = [pt(x0 + a, y0), pt(x0 + a + r, y0 - r), pt(x0 + a + r, y0 + h - r), pt(x0 + a, y0 + h)].join(' ')
  // 圆柱底面中心：立在顶面正中，或立在长方体右边的桌面上（进深居中，从右面看正挡在端面前面）
  const cx = props.arrangement === 'on' ? x0 + a / 2 + r / 2 : x0 + a + r / 2 + cylW * 0.9
  const baseY = props.arrangement === 'on' ? y0 - r / 2 : y0 + h - r / 2
  const width = props.arrangement === 'on' ? a + r + 4 : cx + cylW / 2 + 4
  const height = y0 + h + 4
  return { a, h, r, cylW, cylH, ry, front, topFace, right, cx, baseY, width, height, stroke: Math.max(1.5, s / 70) }
})
</script>

<template>
  <svg class="scene" :width="geo.width" :height="geo.height" :viewBox="`0 0 ${geo.width} ${geo.height}`" role="img">
    <g class="box" :stroke-width="geo.stroke">
      <polygon class="btop" :points="geo.topFace" />
      <polygon class="bright" :points="geo.right" />
      <polygon class="bfront" :points="geo.front" />
    </g>
    <g class="cyl" :stroke-width="geo.stroke">
      <path
        class="cbody"
        :d="`M ${geo.cx - geo.cylW / 2} ${geo.baseY - geo.cylH} L ${geo.cx - geo.cylW / 2} ${geo.baseY} A ${geo.cylW / 2} ${geo.ry} 0 0 0 ${geo.cx + geo.cylW / 2} ${geo.baseY} L ${geo.cx + geo.cylW / 2} ${geo.baseY - geo.cylH} Z`"
      />
      <ellipse class="ctop" :cx="geo.cx" :cy="geo.baseY - geo.cylH" :rx="geo.cylW / 2" :ry="geo.ry" />
    </g>
  </svg>
</template>

<style scoped>
.scene {
  display: block;
  margin: 0 auto;
  overflow: visible;
}
.box polygon,
.cyl path,
.cyl ellipse {
  stroke-linejoin: round;
}
.btop {
  fill: #9be7c0;
  stroke: #1d7a4f;
}
.bfront {
  fill: #3ecf8e;
  stroke: #1d7a4f;
}
.bright {
  fill: #25a86e;
  stroke: #1d7a4f;
}
.cbody {
  fill: #ff6b6b;
  stroke: #a3262a;
}
.ctop {
  fill: #ffa3a3;
  stroke: #a3262a;
}
</style>
