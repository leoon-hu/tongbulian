<script setup lang="ts">
import { computed } from 'vue'
import type { CubeViewFig } from '@/types/models'
import { hasEntry, lang, t } from '@/engine/i18n'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 从某个位置看到的图形（四下「观察物体（二）」）：照课本画成同色的正方形连在一起、每格深色边线，不画方格纸；
 * 长方体看到的那一面（练习四 2）是一整条橙色、中间不画线。一组图共用一个格子大小（2 格和 3 格看得出长短），底边对齐；
 * numbered 时下面标 1、2、3……（选项就是这几个数），caption 是图下面写的字（「从前面看」，注音、不朗读）。
 * nums（五年级加的，可选）：每幅图每一块里写的数，和 blocks 一一对应——标数的俯视图（五上练习一 9：这个位置摞了几个小正方体），
 * 有数的图浅色底、格子画大一点，数不朗读。读屏只说「看到的图形」。
 */
const props = withDefaults(defineProps<{ items: CubeViewFig[]; numbered?: boolean; nums?: number[][] }>(), { numbered: false, nums: undefined })

/** 四周留白（像素，边线不被裁掉） */
const PAD = 2

const sizeOf = (f: CubeViewFig): { w: number; h: number } => ({
  w: Math.max(...f.blocks.map((b) => b.x + (b.w ?? 1))),
  h: Math.max(...f.blocks.map((b) => b.y + 1)),
})

/** 图下面写了字的，这一格至少要这么宽（「cóng shàng miàn kàn」的拼音） */
const CAPTION_W = 80
/** 一幅图左右的留白 + 图与图之间的空（像素，和下面的样式一致） */
const SIDE = 12
const GAP = 8

/** 共用的格子大小：一幅时大一点；几幅时排得下一行（手机竖屏 360 宽里放 300 像素），也别太高 */
const cell = computed(() => {
  const n = props.items.length
  const dims = props.items.map(sizeOf)
  const maxH = Math.max(...dims.map((d) => d.h))
  const room = 300 - n * SIDE - (n - 1) * GAP
  const fits = (c: number): boolean =>
    props.items.reduce((a, f, i) => a + Math.max(f.caption ? CAPTION_W : 0, dims[i]!.w * c), 0) <= room
  // 格子里写数的（标数的俯视图）画大一点，数看得清
  let c = Math.min(props.nums ? 40 : n === 1 ? 30 : 24, 96 / maxH)
  while (c > 12 && !fits(c)) c -= 1
  return Math.max(12, c)
})

const pics = computed(() =>
  props.items.map((f, i) => {
    const c = cell.value
    const { w, h } = sizeOf(f)
    const rects = f.blocks.map((b, j) => ({
      b,
      x: PAD + b.x * c,
      y: PAD + (h - 1 - b.y) * c,
      w: (b.w ?? 1) * c,
      h: c,
      n: props.nums?.[i]?.[j],
    }))
    return { width: Math.ceil(w * c + 2 * PAD), height: Math.ceil(h * c + 2 * PAD), rects }
  }),
)

/** 读屏的字：四年级的词条在就用它；只加载了别的年级时（按需加载，没有 m4.* 词条）用这里的 */
const label = computed(() => (hasEntry('m4.obs.ariaView') ? t({ k: 'm4.obs.ariaView' }) : lang.value === 'zh' ? '看到的图形' : 'shape seen'))
</script>

<template>
  <div class="cviews" :class="{ many: items.length > 1 }" role="img" :aria-label="label">
    <figure v-for="(pic, i) in pics" :key="i" class="cview">
      <svg :viewBox="`0 0 ${pic.width} ${pic.height}`" :width="pic.width" :height="pic.height" aria-hidden="true">
        <rect
          v-for="(r, j) in pic.rects"
          :key="j"
          :class="[r.b.tone === 'bar' ? 'bar' : 'cube', { numbered: r.n !== undefined }]"
          :x="r.x"
          :y="r.y"
          :width="r.w"
          :height="r.h"
          :data-x="r.b.x"
          :data-y="r.b.y"
          :data-w="r.b.w ?? 1"
        />
        <template v-for="(r, j) in pic.rects" :key="`n${j}`">
          <text v-if="r.n !== undefined" class="cell-n" :x="r.x + r.w / 2" :y="r.y + r.h / 2" :font-size="Math.round(r.h * 0.56)">{{ r.n }}</text>
        </template>
      </svg>
      <figcaption v-if="numbered" class="num">{{ i + 1 }}</figcaption>
      <figcaption v-if="items[i]?.caption" class="cap"><RubyText :text="items[i]!.caption!" /></figcaption>
    </figure>
  </div>
</template>

<style scoped>
.cviews {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px 8px;
  max-width: 100%;
}
.cview {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-width: 48px;
  padding: 8px 6px 6px;
  border-radius: var(--radius-md);
  background: #fff;
  box-shadow: inset 0 0 0 2px var(--c-line);
}
.cview svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.num {
  min-width: 34px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-lg);
  text-align: center;
}
.cap {
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text);
  white-space: nowrap;
}
rect {
  stroke: #2b4f63;
  stroke-width: 1.5;
}
.cube {
  fill: #a9dcf2;
}
.bar {
  fill: #fcc69a;
}
/* 标数的俯视图：浅色底，数字深色、居中 */
.cube.numbered {
  fill: #e4f4fb;
}
.cell-n {
  fill: var(--c-text);
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
