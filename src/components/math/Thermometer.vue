<script setup lang="ts">
import { computed } from 'vue'
import type { ThermoItem } from '@/types/models'
import { hasEntry, lang, t } from '@/engine/i18n'

/**
 * 温度计（六上「生活中的负数」p45 的那支、六下「负数」做一做 1 比温度高低）：竖的玻璃管、下面一个圆泡，
 * min…max 摄氏度，左边每 major 一个长刻度、写数（0 写红字，负数写「−」），每 minor 一个短刻度，管顶左边写「℃」；
 * 液柱（课本是蓝色）从圆泡升到 value。items 一到两支并排，下面写名字（「甲」「乙」，图里的字，不注音、不朗读）。
 * 图里只有数和 ℃，不朗读；读屏只说「温度计」。宽度按 viewBox 缩放。
 */
const props = defineProps<{ items: ThermoItem[]; min: number; max: number; major: number; minor: number }>()

// 一支 96 × 204：练习页手机竖屏上，题目、温度计和选项一屏放得下（同 GeoFigure 一幅图最高 190 左右）
const W = 96
const H = 204
const CX = 62 // 玻璃管中线
const TUBE = 6 // 管里液柱的宽
const TOP = 20 // 最高刻度（max）
const LOW = 164 // 最低刻度（min）
const BULB_Y = 182
const BULB_R = 12

const yOf = (v: number): number => LOW - ((LOW - TOP) * (v - props.min)) / (props.max - props.min || 1)
/** 刻度：从 min 到 max 每 minor 一个，major 的倍数是长刻度、写数 */
const ticks = computed(() => {
  const out: { y: number; long: boolean; text: string; zero: boolean }[] = []
  const step = props.minor > 0 ? props.minor : props.major
  const n = Math.round((props.max - props.min) / step)
  for (let k = 0; k <= n; k++) {
    const v = props.min + k * step
    const long = Math.abs(v / props.major - Math.round(v / props.major)) < 1e-9
    out.push({ y: yOf(v), long, text: long ? (v < 0 ? `−${-v}` : String(v)) : '', zero: v === 0 })
  }
  return out
})
const pics = computed(() =>
  props.items.map((it) => {
    const v = Math.max(props.min, Math.min(props.max, it.value))
    return { top: yOf(v), name: it.name === undefined ? '' : t(it.name) }
  }),
)
/** 读屏的名字：六年级的包没加载时（单独测组件）按语言直接给字 */
const label = computed(() => (hasEntry('m6.neg.ariaThermo') ? t({ k: 'm6.neg.ariaThermo' }) : lang.value === 'zh' ? '温度计' : 'thermometer'))
const tube = `M ${CX - 9} ${BULB_Y - 8} L ${CX - 9} ${TOP - 8} A 9 9 0 0 1 ${CX + 9} ${TOP - 8} L ${CX + 9} ${BULB_Y - 8}`
</script>

<template>
  <div class="thermos" role="img" :aria-label="label">
    <figure v-for="(p, i) in pics" :key="i" class="thermo">
      <svg :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" aria-hidden="true">
        <rect class="board" x="4" y="2" :width="W - 8" :height="H - 4" rx="14" />
        <text class="unit" :x="CX - 26" :y="TOP - 8">℃</text>
        <path class="glass" :d="tube" />
        <circle class="bulb-glass" :cx="CX" :cy="BULB_Y" :r="BULB_R + 3" />
        <rect class="liquid" :x="CX - TUBE / 2" :y="p.top" :width="TUBE" :height="BULB_Y - p.top" />
        <circle class="bulb" :cx="CX" :cy="BULB_Y" :r="BULB_R" />
        <g v-for="(tk, k) in ticks" :key="k">
          <line class="tick" :class="{ long: tk.long }" :x1="tk.long ? CX - 22 : CX - 17" :y1="tk.y" :x2="CX - 11" :y2="tk.y" />
          <text v-if="tk.text" class="num" :class="{ zero: tk.zero }" :x="CX - 25" :y="tk.y + 4">{{ tk.text }}</text>
        </g>
      </svg>
      <figcaption v-if="p.name" class="name">{{ p.name }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.thermos {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 4px 18px;
  max-width: 100%;
}
.thermo {
  margin: 0;
  min-width: 0;
  text-align: center;
}
.thermo svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.board {
  fill: #f4f6f8;
  stroke: #b9c3cc;
  stroke-width: 1.5;
}
.glass {
  fill: #ffffff;
  stroke: #8a9aa8;
  stroke-width: 1.6;
}
.bulb-glass {
  fill: #ffffff;
  stroke: #8a9aa8;
  stroke-width: 1.6;
}
.liquid,
.bulb {
  fill: #3d8fe0; /* 课本的蓝色液柱 */
}
.tick {
  stroke: #4a5a68;
  stroke-width: 1.2;
}
.tick.long {
  stroke-width: 2;
}
.num {
  font-size: 12px;
  font-weight: 700;
  text-anchor: end;
  fill: #33495a;
}
.num.zero {
  fill: var(--c-red);
}
.unit {
  font-size: 13px;
  font-weight: 800;
  fill: #33495a;
}
.name {
  margin-top: 2px;
  font-size: 16px;
  font-weight: 800;
  color: var(--c-text);
}
</style>
