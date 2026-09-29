<script setup lang="ts">
import { computed } from 'vue'

/**
 * 把一些物体看作一个整体（三年级「进一步认识分数」）：groups 份、每份 per 个，前 shaded 份涂色。
 * - 不填 dir：一份一个虚线框（boxed = false 不画框，每份只有 1 个时用：8 个圆涂 5 个）；
 * - dir = row：每份排成一排、上下叠（12 个圆排 3 排，涂 2 排）；dir = col：每份排成一列、左右并排（15 个圆排 5 列，涂 3 列）。
 * icon = 'dot' 画圆点（涂色的实心、没涂的空心）；别的 emoji 涂色是在那一份底下铺一层颜色。
 */
// boxed 不给默认值：QuestionRenderer 总是把它传进来（没写就是 undefined），按每份几个决定画不画框
const props = defineProps<{ icon: string; groups: number; per: number; shaded: number; dir?: 'row' | 'col'; boxed?: boolean }>()

const list = computed(() => Array.from({ length: Math.max(0, props.groups) }, (_, i) => i < props.shaded))
const framed = computed(() => props.boxed ?? props.per > 1)
/** 虚线框里一排几个：4 个以内排一排，多了排两排 */
const cols = computed(() => (props.dir === 'row' ? props.per : props.dir === 'col' ? 1 : props.per > 4 ? Math.ceil(props.per / 2) : props.per))
const dot = computed(() => props.icon === 'dot')
</script>

<template>
  <div class="frac-set" :class="[dir ? `dir-${dir}` : 'flow', { framed, dots: dot }]">
    <span
      v-for="(on, g) in list"
      :key="g"
      class="grp"
      :class="{ on }"
      :style="{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }"
    >
      <span v-for="k in per" :key="k" class="obj" :class="{ on }">{{ dot ? '' : icon }}</span>
    </span>
  </div>
</template>

<style scoped>
.frac-set {
  --cell: 30px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 10px 12px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
/* 每份排一排：一排一排上下叠 */
.frac-set.dir-row {
  flex-direction: column;
  flex-wrap: nowrap;
}
.frac-set.dir-col {
  flex-wrap: nowrap;
}
.grp {
  position: relative;
  display: grid;
  justify-items: center;
  align-items: center;
  gap: 2px;
  padding: 3px 4px;
  border: 2.5px dashed transparent;
  border-radius: 12px;
}
.framed .grp {
  border-color: var(--c-primary);
}
/* 涂色：那一份底下铺一层浅色 */
.grp.on::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 10px;
  background: var(--c-blue);
  opacity: 0.28;
}
.dots .grp.on::before {
  display: none;
}
.obj {
  position: relative;
  width: var(--cell);
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  line-height: 1;
}
/* 圆点：没涂的空心、涂色的实心 */
.dots .obj::after {
  content: '';
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid var(--c-text);
  background: var(--c-card);
  box-sizing: border-box;
}
.dots .obj.on::after {
  background: var(--c-blue);
  border-color: var(--c-blue);
}
</style>
