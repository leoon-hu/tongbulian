<script setup lang="ts">
import { computed } from 'vue'
import type { LStr, PlanMark, PlanPlace } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 平面图（四上「寻找宝藏」的藏宝图、复习里的动物园导游图）：3 × 3 的格子，上北下南、左西右东，右上角画「北」和朝上的箭头
 * （课本 p103、p105、p113 的画法）。每格是一个地方（小图 + 名字）或空地；marks 是编号的宝藏（黄圆圈，画在那个地方的
 * 哪个角 / 哪一边）；roads 画出路（中间到四周八处、外圈相邻的地方之间——动物园导游图）。
 * 名字不注音、不朗读（同统计表），题目文字里会说出问的是哪个地方；英文首字母大写。aria-label 只说图题。
 */
const props = withDefaults(defineProps<{ cells: (PlanPlace | null)[][]; marks?: PlanMark[]; roads?: boolean; title?: LStr }>(), {
  marks: () => [],
  roads: false,
  title: undefined,
})

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const marksAt = (r: number, c: number): PlanMark[] => props.marks.filter((m) => m.r === r && m.c === c)

/** 路：外圈相邻的两处之间、中间到四周每一处（两头都有地方才画） */
const roadLines = computed(() => {
  if (!props.roads) return []
  const has = (r: number, c: number): boolean => !!props.cells[r]?.[c]
  const ring: [number, number][] = [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
    [2, 2],
    [2, 1],
    [2, 0],
    [1, 0],
  ]
  const out: { x1: number; y1: number; x2: number; y2: number }[] = []
  const link = (a: [number, number], b: [number, number]): void => {
    if (has(...a) && has(...b)) out.push({ x1: a[1] + 0.5, y1: a[0] + 0.5, x2: b[1] + 0.5, y2: b[0] + 0.5 })
  }
  ring.forEach((p, i) => {
    link(p, ring[(i + 1) % ring.length]!)
    link([1, 1], p)
  })
  return out
})
const label = computed(() => (props.title ? cap(t(props.title)) : t({ k: 'm4.tre.aria' })))
</script>

<template>
  <figure class="plan-map" role="img" :aria-label="label">
    <div class="head">
      <span v-if="title" class="title">{{ cap(t(title)) }}</span>
      <span class="north" aria-hidden="true">
        <span class="n">{{ t({ k: 'm4.tre.north' }) }}</span>
        <svg viewBox="0 0 12 22" width="12" height="20"><path d="M6 1 L11.5 9 H7.6 V21 H4.4 V9 H0.5 Z" /></svg>
      </span>
    </div>
    <div class="board">
      <svg v-if="roads" class="roads" viewBox="0 0 3 3" preserveAspectRatio="none" aria-hidden="true">
        <line v-for="(rd, i) in roadLines" :key="i" :x1="rd.x1" :y1="rd.y1" :x2="rd.x2" :y2="rd.y2" />
      </svg>
      <template v-for="(row, r) in cells" :key="r">
        <div v-for="(cell, c) in row" :key="`${r}-${c}`" class="cell" :data-r="r" :data-c="c">
          <div v-if="cell" class="place">
            <span v-if="cell.icon" class="icon">{{ cell.icon }}</span>
            <span class="name">{{ cap(t(cell.label)) }}</span>
            <span v-for="mk in marksAt(r, c)" :key="mk.n" class="mark" :class="`at-${mk.at}`" :data-n="mk.n">{{ t({ k: 'm4.tre.mark', p: { n: mk.n } }) }}</span>
          </div>
        </div>
      </template>
    </div>
  </figure>
</template>

<style scoped>
.plan-map {
  margin: 0;
  width: min(340px, 100%);
  padding: 6px 10px 12px;
  border-radius: var(--radius-sm);
  background: #fbf8ef;
  box-shadow: var(--shadow-card);
}
.head {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  margin-bottom: 6px;
}
.title {
  font-size: 15px;
  font-weight: 800;
  color: var(--c-text);
}
.north {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--c-red);
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
}
.north path {
  fill: var(--c-red);
}
.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(3, 58px);
  gap: 10px;
}
.roads {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.roads line {
  stroke: #b7dbe9;
  stroke-width: 9;
  stroke-linecap: round;
  vector-effect: non-scaling-stroke;
}
.cell {
  position: relative;
  display: flex;
  min-width: 0;
}
.place {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  padding: 2px 4px;
  border: 2px solid #6bb38a;
  border-radius: 10px;
  background: #e9f6ee;
  text-align: center;
}
.icon {
  font-size: 18px;
  line-height: 1;
}
.name {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.15;
  color: var(--c-text);
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.mark {
  position: absolute;
  z-index: 1;
  min-width: 26px;
  height: 22px;
  padding: 0 4px;
  border: 2px solid #e0a800;
  border-radius: 11px;
  background: #ffd84d;
  color: var(--c-text);
  font-size: 12px;
  font-weight: 800;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
}
.at-ne {
  top: -12px;
  right: -12px;
}
.at-nw {
  top: -12px;
  left: -12px;
}
.at-se {
  bottom: -12px;
  right: -12px;
}
.at-sw {
  bottom: -12px;
  left: -12px;
}
.at-n {
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
}
.at-s {
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
}
.at-e {
  top: 50%;
  right: -14px;
  transform: translateY(-50%);
}
.at-w {
  top: 50%;
  left: -14px;
  transform: translateY(-50%);
}
</style>
