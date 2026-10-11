<script setup lang="ts">
import { computed } from 'vue'
import type { BeakerItem } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 烧杯（五下例 6「排水法」，照课本 p39 的 500 mL 烧杯）：圆底直筒，杯口两边往外翻一点；刻度在杯身中间偏右，
 * 0…max 毫升平均分成 10 小格，每 2 小格（max/5）一根长刻度、右边写数，最上面那根写「500 mL」。
 * 水是浅蓝色，到 water 那一格；thing = 水底沉着的东西（土豆：褐色椭圆，石块：灰色多边形，鸡蛋：米白色竖椭圆），
 * 整个在水里（生成器保证水面比它高：放进去以前也至少有 max 的 30%）。一幅或两幅并排（arrow = 中间画箭头：放进去以前 → 以后）。
 * 图里只写数和 mL，不注音、不朗读；读屏只说「烧杯」。
 */
const props = withDefaults(defineProps<{ max: number; items: BeakerItem[]; arrow?: boolean }>(), { arrow: false })

const W = 136
const H = 172
/** 杯身：左右边、杯底；刻度 0 在杯底上面一点，max 在杯口下面；刻度和数都在杯里（「1000 mL」也放得下） */
const LEFT = 10
const RIGHT = 126
const BOTTOM = 160
const Y0 = 154
const YMAX = 38
const yOf = (v: number): number => Y0 - ((Y0 - YMAX) * v) / props.max

const ticks = computed(() =>
  Array.from({ length: 10 }, (_, i) => {
    const v = ((i + 1) * props.max) / 10
    const long = (i + 1) % 2 === 0
    return { y: yOf(v), long, text: long ? (i === 9 ? `${v} mL` : String(v)) : '' }
  }),
)

/** 杯身的轮廓（不封口）与水（封口，底是圆角） */
const body = `M ${LEFT - 6} 16 Q ${LEFT} 18 ${LEFT} 26 L ${LEFT} ${BOTTOM - 12} Q ${LEFT} ${BOTTOM} ${LEFT + 12} ${BOTTOM} L ${RIGHT - 12} ${BOTTOM} Q ${RIGHT} ${BOTTOM} ${RIGHT} ${BOTTOM - 12} L ${RIGHT} 26 Q ${RIGHT} 18 ${RIGHT + 6} 16`
const waterPath = (v: number): string => {
  const y = yOf(v)
  const l = LEFT + 1.5
  const r = RIGHT - 1.5
  const b = BOTTOM - 1.5
  return `M ${l} ${y} L ${l} ${b - 11} Q ${l} ${b} ${l + 11} ${b} L ${r - 11} ${b} Q ${r} ${b} ${r} ${b - 11} L ${r} ${y} Z`
}

const pics = computed(() => props.items.map((it) => ({ water: waterPath(it.water), surface: yOf(it.water), thing: it.thing })))
const label = computed(() => t({ k: 'm5.cube.ariaBeaker' }))
</script>

<template>
  <div class="beakers" role="img" :aria-label="label">
    <template v-for="(p, i) in pics" :key="i">
      <span v-if="arrow && i > 0" class="arrow" aria-hidden="true">→</span>
      <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" aria-hidden="true">
        <path class="water" :d="p.water" />
        <line class="surface" :x1="LEFT + 1.5" :y1="p.surface" :x2="RIGHT - 1.5" :y2="p.surface" />
        <ellipse v-if="p.thing === 'potato'" class="potato" cx="37" :cy="BOTTOM - 17" rx="22" ry="14" />
        <polygon
          v-else-if="p.thing === 'stone'"
          class="stone"
          :points="`16,${BOTTOM - 4} 20,${BOTTOM - 22} 33,${BOTTOM - 30} 50,${BOTTOM - 26} 58,${BOTTOM - 12} 52,${BOTTOM - 3}`"
        />
        <ellipse v-else-if="p.thing === 'egg'" class="egg" cx="36" :cy="BOTTOM - 19" rx="13" ry="17" />
        <path class="glass" :d="body" />
        <line class="scale" x1="68" :y1="yOf(0)" x2="68" :y2="YMAX" />
        <template v-for="(tk, k) in ticks" :key="k">
          <line class="tick" :x1="tk.long ? 62 : 65" :y1="tk.y" :x2="tk.long ? 74 : 71" :y2="tk.y" />
          <text v-if="tk.text" class="num" x="77" :y="tk.y + 4">{{ tk.text }}</text>
        </template>
      </svg>
    </template>
  </div>
</template>

<style scoped>
.beakers {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px 8px;
  max-width: 100%;
}
.beakers svg {
  display: block;
  min-width: 0;
  max-width: calc(50% - 20px);
  height: auto;
}
.beakers svg:only-child {
  max-width: 100%;
}
.arrow {
  flex: none;
  font-size: 26px;
  font-weight: 800;
  color: #e8875a;
}
.water {
  fill: rgba(92, 186, 235, 0.55);
}
.surface {
  stroke: #3d9ad1;
  stroke-width: 1.5;
}
.glass {
  fill: none;
  stroke: #46677a;
  stroke-width: 2.4;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.scale,
.tick {
  stroke: #33495a;
  stroke-width: 1.4;
}
.num {
  font-size: 11px;
  font-weight: 700;
  fill: #b03a85;
}
.potato {
  fill: #c9a064;
  stroke: #8a6634;
  stroke-width: 1.4;
}
.stone {
  fill: #9a9794;
  stroke: #5f5b57;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.egg {
  fill: #fbf2e1;
  stroke: #bfa57a;
  stroke-width: 1.4;
}
</style>
