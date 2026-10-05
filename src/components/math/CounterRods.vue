<script setup lang="ts">
import { computed } from 'vue'
import { lang } from '@/engine/i18n'

/**
 * 计数器（四上 p2 / p9 / p10 的图）：一排竖杆，杆下一排黄底小格写数位名（亿、千万、百万……个，两个字上下叠写），
 * 橙色扁圆珠子从杆底往上摞，每根杆上的颗数就是这一位上的数字；10 颗时最上面那颗隔开一点（满十进一的那一颗，课本「10 个一万是十万」）。
 * top：最左一根是第几位（8 = 亿位，9 根杆；11 = 千亿位，12 根杆）；beads[i]：从左数第 i 根杆上几颗。
 * 杆下的字是图里的字（不注音、不朗读，同月历的表头），英文写 100M、10K 这样的位值。SVG，随宽度缩放。
 */
const props = defineProps<{ top: number; beads: number[] }>()

const ZH: Record<number, string> = { 0: '个', 1: '十', 2: '百', 3: '千', 4: '万', 5: '十万', 6: '百万', 7: '千万', 8: '亿', 9: '十亿', 10: '百亿', 11: '千亿' }
const EN: Record<number, string> = { 0: '1', 1: '10', 2: '100', 3: '1K', 4: '10K', 5: '100K', 6: '1M', 7: '10M', 8: '100M', 9: '1B', 10: '10B', 11: '100B' }

/** 杆距、珠子的宽高、杆高、标签格高 */
const W = 30
const BEAD_W = 22
const BEAD_H = 9
const ROD_H = 128
const LABEL_H = 34
const PAD = 4

const rods = computed(() =>
  props.beads.map((count, i) => {
    const place = props.top - i
    const cx = PAD + i * W + W / 2
    const base = PAD + ROD_H
    const beads = Array.from({ length: Math.min(count, 10) }, (_, k) => ({
      cy: base - BEAD_H / 2 - k * BEAD_H - (k >= 9 ? BEAD_H * 0.9 : 0),
    }))
    const label = (lang.value === 'zh' ? ZH : EN)[place] ?? ''
    // 两个字的数位名上下叠写
    const lines = lang.value === 'zh' && label.length === 2 ? [label[0]!, label[1]!] : [label]
    return { i, cx, beads, lines, count }
  }),
)
const width = computed(() => PAD * 2 + props.beads.length * W)
const zh = computed(() => lang.value === 'zh')
const height = PAD + ROD_H + LABEL_H + PAD
const labelY = PAD + ROD_H
</script>

<template>
  <div class="counter">
    <svg :viewBox="`0 0 ${width} ${height}`" :width="width * 1.2" :height="height * 1.2" role="img" :aria-label="zh ? '计数器' : 'counter'">
      <g v-for="r in rods" :key="r.i" class="rod">
        <line class="stick" :x1="r.cx" :x2="r.cx" :y1="PAD + 2" :y2="labelY" />
        <ellipse v-for="(b, k) in r.beads" :key="k" class="bead" :cx="r.cx" :cy="b.cy" :rx="BEAD_W / 2" :ry="BEAD_H / 2 - 0.4" />
        <rect class="label-box" :x="r.cx - W / 2" :y="labelY" :width="W" :height="LABEL_H" />
        <text
          v-for="(line, k) in r.lines"
          :key="`t${k}`"
          class="label"
          :class="{ small: !zh }"
          :x="r.cx"
          :y="labelY + (r.lines.length === 2 ? 13 + k * 14 : LABEL_H / 2 + 5)"
          text-anchor="middle"
        >
          {{ line }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.counter {
  max-width: 100%;
  padding: 6px 8px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
.counter svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.stick {
  stroke: #7a4a2a;
  stroke-width: 2;
}
.bead {
  fill: #f39a3c;
  stroke: #b85a12;
  stroke-width: 1;
}
.label-box {
  fill: #fde9a8;
  stroke: #c9a24a;
  stroke-width: 1;
}
.label {
  font-size: 13px;
  font-weight: 700;
  fill: var(--c-text);
}
.label.small {
  font-size: 10px;
}
</style>
