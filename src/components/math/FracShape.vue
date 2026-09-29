<script setup lang="ts">
import { computed } from 'vue'
import type { FracPic } from '@/types/models'
import MathText from '@/components/ui/MathText.vue'
import { fracGeometry } from '@/components/math/fracGeometry'

/**
 * 平均分的图（三年级「分数的初步认识」、小数的十等分图）：照课本画——外轮廓实线、切开的地方虚线，涂色的块填浅色。
 * 一幅或几幅并排（比大小时两幅），每幅下面可以写一个数（label，分数画成上下两层）。
 * whole：前面再画几个整个涂满的同样图形（小数 2.5 = 两个整的 + 一个涂了 5 条的）。几何在 fracGeometry.ts。
 */
const props = defineProps<{ items: FracPic[] }>()

const GAP = 8
const figs = computed(() =>
  props.items.map((pic) => {
    const g = fracGeometry(pic)
    const whole = Math.max(0, pic.whole ?? 0)
    const shaded = new Set(pic.shaded)
    const alt = new Set(pic.alt ?? [])
    return {
      ...g,
      label: pic.label,
      // 整个涂满的几个在前面，每个错开一格
      wholes: Array.from({ length: whole }, (_, i) => i * (g.w + GAP)),
      offset: whole * (g.w + GAP),
      totalW: whole * (g.w + GAP) + g.w,
      tone: g.pieces.map((_, i) => (shaded.has(i) ? 'on' : alt.has(i) ? 'alt' : 'off')),
    }
  }),
)
/** 屏幕上每个 viewBox 单位多少像素：一幅时大一点，几幅并排时小一点（手机竖屏两幅也放得下） */
const scale = computed(() => (props.items.length > 1 ? 1 : 1.25))
</script>

<template>
  <div class="frac-shapes" :class="{ many: items.length > 1 }">
    <figure v-for="(fg, i) in figs" :key="i" class="fig">
      <svg
        :viewBox="`0 0 ${fg.totalW} ${fg.h}`"
        :width="fg.totalW * scale"
        :height="fg.h * scale"
        :style="{ maxWidth: '100%', height: 'auto' }"
        aria-hidden="true"
      >
        <g v-for="(x, k) in fg.wholes" :key="`w${k}`" :transform="`translate(${x} 0)`">
          <path class="piece on" :d="fg.outline" />
          <path class="outline" :d="fg.outline" />
        </g>
        <g :transform="`translate(${fg.offset} 0)`">
          <path v-for="(p, k) in fg.pieces" :key="k" class="piece" :class="fg.tone[k]" :d="p.d" />
          <path v-for="(c, k) in fg.cuts" :key="`c${k}`" class="cut" :d="c" />
          <path class="outline" :d="fg.outline" />
        </g>
      </svg>
      <figcaption v-if="fg.label" class="label"><MathText :text="fg.label" /></figcaption>
    </figure>
  </div>
</template>

<style scoped>
.frac-shapes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px 22px;
  max-width: 100%;
  padding: 10px 12px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
.fig {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}
.piece {
  stroke: none;
}
.piece.off {
  fill: var(--c-card);
}
.piece.on {
  fill: var(--c-blue);
  fill-opacity: 0.55;
}
.piece.alt {
  fill: var(--c-primary);
  fill-opacity: 0.6;
}
.cut {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-dasharray: 5 4;
  stroke-opacity: 0.75;
}
.outline {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.label {
  font-size: var(--fs-xl);
  font-weight: 800;
  line-height: 1.1;
  color: var(--c-text);
}
</style>
