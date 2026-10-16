<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 线段比例尺（六下「比例尺」p51–53，照课本画）：一条分成 segs 段的短横线，两头和分段处有朝上的短竖线（课本的「└──┘」），
 * 左端上面写 0，每段右端上面写 per、2 × per……，最后一个数后面写单位（米 / 千米）。per 不填，右端写「?」（例 3「0 (  ) m」要填的数）。
 * 屏幕上一段不是真实的 1 厘米，一律画 54 像素；题干文字说「图上 1 厘米表示……」。图里的字不注音、不朗读，aria-label 只说「线段比例尺」。
 */
const props = withDefaults(defineProps<{ per?: number; segs?: number; unit: LStr }>(), { per: undefined, segs: 1 })

const PAD = 8
const SEG = 54
const F = 14
const BASE = 30
const TICK = 8

/** 估一段字的宽度（像素）：汉字一个字号宽，数字、拉丁字母约 0.58 个 */
function textW(s: string, f: number): number {
  let w = 0
  for (const ch of s) w += /[⺀-鿿　-〿＀-￯]/.test(ch) ? f : 0.58 * f
  return w
}
const num = (v: number): string => String(Number(v.toFixed(4)))

const lay = computed(() => {
  const n = Math.max(1, props.segs)
  const x0 = PAD + 6
  const xs = Array.from({ length: n + 1 }, (_, i) => x0 + i * SEG)
  const labels = xs.map((x, i) => ({ x, s: i === 0 ? '0' : props.per === undefined ? '?' : num(props.per * i), ask: i > 0 && props.per === undefined }))
  const unit = t(props.unit)
  const last = labels[labels.length - 1]!
  const ux = last.x + textW(last.s, F) / 2 + 5
  return { xs, labels, unit, ux, width: Math.ceil(ux + textW(unit, F) + PAD), height: BASE + 6 }
})

const aria = computed(() => t({ k: 'm6.prop.scaleBarAria' }))
</script>

<template>
  <figure class="scale-bar">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="aria"
      :data-per="per"
      :data-segs="segs"
    >
      <line class="bar" :x1="lay.xs[0]" :y1="BASE" :x2="lay.xs[lay.xs.length - 1]" :y2="BASE" />
      <line v-for="(x, i) in lay.xs" :key="`k${i}`" class="tick" :x1="x" :y1="BASE" :x2="x" :y2="BASE - TICK" />
      <text v-for="(l, i) in lay.labels" :key="`t${i}`" :x="l.x" :y="BASE - TICK - 5" class="label" :class="{ ask: l.ask }" text-anchor="middle" :font-size="F">{{ l.s }}</text>
      <text class="unit" :x="lay.ux" :y="BASE - TICK - 5" text-anchor="start" :font-size="F">{{ lay.unit }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.scale-bar {
  margin: 0;
  max-width: 100%;
  padding: 6px 10px 4px;
  border-radius: var(--radius-sm);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.bar,
.tick {
  stroke: var(--c-text);
  stroke-width: 2;
  stroke-linecap: square;
}
text {
  fill: var(--c-text);
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}
.label {
  font-weight: 700;
}
.label.ask {
  fill: #d9483b;
  font-weight: 800;
}
.unit {
  fill: var(--c-text-light);
  font-weight: 700;
}
</style>
