<script setup lang="ts">
import type { Dir8 } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 指南针（四上「寻找宝藏」认一认，课本 p104）：八个方向的字围成一圈（北在上），红针指北、蓝针指南；
 * ask 的那个方向不写字、画一个虚线圈里的「?」。字一律正着写（课本是顺着圈转的，孩子不好认）；英文写 N、NE…
 * aria-label 只说是指南针。
 */
defineProps<{ ask?: Dir8 }>()

const DIRS: Dir8[] = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']
const C = 100
const R = 64
const at = (i: number, r = R): { x: number; y: number } => ({ x: C + Math.sin((i * Math.PI) / 4) * r, y: C - Math.cos((i * Math.PI) / 4) * r })
const rays = DIRS.map((_, i) => at(i, 42))
</script>

<template>
  <svg class="compass" viewBox="0 0 200 200" width="176" height="176" role="img" :aria-label="t({ k: 'm4.tre.compass' })">
    <circle class="ring" :cx="C" :cy="C" r="95" />
    <circle class="face" :cx="C" :cy="C" r="82" />
    <circle class="inner" :cx="C" :cy="C" r="42" />
    <line v-for="(p, i) in rays" :key="`r${i}`" class="ray" :class="{ main: i % 2 === 0 }" :x1="C" :y1="C" :x2="p.x" :y2="p.y" />
    <path class="needle-n" d="M100 54 L107 100 L93 100 Z" />
    <path class="needle-s" d="M100 146 L107 100 L93 100 Z" />
    <circle class="pivot" :cx="C" :cy="C" r="5" />
    <template v-for="(d, i) in DIRS" :key="d">
      <g v-if="d === ask" class="ask" :data-dir="d">
        <circle :cx="at(i).x" :cy="at(i).y" r="14" />
        <text :x="at(i).x" :y="at(i).y + 6" text-anchor="middle">?</text>
      </g>
      <text v-else class="label" :class="{ main: i % 2 === 0 }" :data-dir="d" :x="at(i).x" :y="at(i).y" text-anchor="middle" dominant-baseline="central">{{ t({ k: `m4.tre.c.${d}` }) }}</text>
    </template>
  </svg>
</template>

<style scoped>
.compass {
  display: block;
  max-width: 100%;
  height: auto;
}
.ring {
  fill: #cfeee0;
  stroke: #2e7d5b;
  stroke-width: 2;
}
.face {
  fill: #f6fcf8;
  stroke: #2e7d5b;
  stroke-width: 1.5;
}
.inner {
  fill: #eef7ff;
  stroke: #2e7d5b;
  stroke-width: 1.2;
}
.ray {
  stroke: #8cc7a8;
  stroke-width: 1.2;
}
.ray.main {
  stroke: #5ea888;
  stroke-width: 1.6;
}
.needle-n {
  fill: var(--c-red);
}
.needle-s {
  fill: #3d7fd6;
}
.pivot {
  fill: #2e5f8a;
}
.label {
  fill: var(--c-text);
  font-size: 13px;
  font-weight: 800;
}
.label.main {
  font-size: 17px;
}
.ask circle {
  fill: #fff3e6;
  stroke: var(--c-primary);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}
.ask text {
  fill: var(--c-primary-dark);
  font-size: 18px;
  font-weight: 800;
}
</style>
