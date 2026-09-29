<script setup lang="ts">
import { computed } from 'vue'
import type { ViewKind } from '@/types/models'

/**
 * 从某个方向看到的样子（三年级「观察物体」）：课本画成实心色块、没有方格。
 * 单个立体图形：长方形（横放长方体从前面看的「又长又扁」、从左 / 右面看的「短」）、正方形、圆；
 * 组合体（圆柱立在长方体上 / 旁边，颜色、比例同 SolidScene：长方体绿、圆柱红）：从前面、左面、上面、右面看。
 * 从上面看一律当成人站在前面往下看（前面朝下），课本里按人站的位置画成竖着的，这里不出那种要看人站哪儿的题。
 * 一组图时下面标 1、2、3……（numbered），选项就是这几个数。
 */
const props = withDefaults(defineProps<{ items: ViewKind[]; numbered?: boolean; size?: number }>(), { numbered: false, size: 96 })

interface Block {
  x: number
  y: number
  w: number
  h: number
  round?: boolean
  color: 'wood' | 'box' | 'cyl'
}

/** 每种样子在 100 × 100 的格子里画哪几块（底边对齐 90） */
function blocks(v: ViewKind): Block[] {
  switch (v) {
    case 'square':
      return [{ x: 25, y: 40, w: 50, h: 50, color: 'wood' }]
    case 'rect-long':
      // ShapeGlyph 的长方体：正面宽 : 高 = 2 : 1、左面（进深 : 高）= 1.25 : 1
      return [{ x: 5, y: 45, w: 90, h: 45, color: 'wood' }]
    case 'rect-short':
      return [{ x: 27, y: 54, w: 46, h: 36, color: 'wood' }]
    case 'circle':
      return [{ x: 25, y: 40, w: 50, h: 50, round: true, color: 'wood' }]
    case 'on-front':
      return [
        { x: 5, y: 66, w: 90, h: 24, color: 'box' },
        { x: 38, y: 30, w: 24, h: 36, color: 'cyl' },
      ]
    case 'on-side':
      return [
        { x: 24, y: 66, w: 52, h: 24, color: 'box' },
        { x: 38, y: 30, w: 24, h: 36, color: 'cyl' },
      ]
    case 'on-top':
      return [
        { x: 5, y: 24, w: 90, h: 52, color: 'box' },
        { x: 35.5, y: 35.5, w: 29, h: 29, round: true, color: 'cyl' },
      ]
    case 'beside-front':
      return [
        { x: 2, y: 66, w: 66, h: 24, color: 'box' },
        { x: 74, y: 57, w: 22, h: 33, color: 'cyl' },
      ]
    case 'beside-top':
      return [
        { x: 2, y: 31, w: 66, h: 38, color: 'box' },
        { x: 74, y: 39, w: 22, h: 22, round: true, color: 'cyl' },
      ]
    case 'beside-right':
      // 从右面看：圆柱挡在长方体的端面前面（圆柱比长方体高，上面露出一截）
      return [
        { x: 31, y: 66, w: 38, h: 24, color: 'box' },
        { x: 39, y: 57, w: 22, h: 33, color: 'cyl' },
      ]
  }
}

const pics = computed(() => props.items.map((v) => blocks(v)))
</script>

<template>
  <div class="views">
    <figure v-for="(bs, i) in pics" :key="i" class="view">
      <svg viewBox="0 0 100 100" :width="size" :height="size" role="img">
        <template v-for="(b, k) in bs" :key="k">
          <ellipse v-if="b.round" :class="b.color" :cx="b.x + b.w / 2" :cy="b.y + b.h / 2" :rx="b.w / 2" :ry="b.h / 2" />
          <rect v-else :class="b.color" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="1.5" />
        </template>
      </svg>
      <figcaption v-if="numbered">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.views {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 14px;
}
.view {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.view figcaption {
  min-width: 34px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-lg);
  text-align: center;
}
.wood {
  fill: #e0b27a;
  stroke: #8a5a2b;
  stroke-width: 1.5;
}
.box {
  fill: #3ecf8e;
  stroke: #1d7a4f;
  stroke-width: 1.5;
}
.cyl {
  fill: #ff6b6b;
  stroke: #a3262a;
  stroke-width: 1.5;
}
</style>
