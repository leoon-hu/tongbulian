<script setup lang="ts">
import { computed } from 'vue'

/**
 * 倍的认识（需求 G6）：按课本「圈一圈」画。每行开头是谁的，同一种实物 per 个圈成一圈（一圈 = 一份）；
 * 第一行只有一圈，第二行有几圈就是几倍。两行的圈从同一条竖线开始，一行放不下就换行。
 */
const props = defineProps<{ icon: string; per: number; rows: { who: string; count: number }[] }>()

const per = computed(() => Math.max(1, props.per))
const lines = computed(() =>
  props.rows.map((row) => {
    const groups = Math.floor(row.count / per.value)
    return { who: row.who, groups, rest: row.count - groups * per.value }
  }),
)
/** 一圈里一排放几个：5 个以内排一排，多了排两排 */
const cols = computed(() => (per.value > 5 ? Math.ceil(per.value / 2) : per.value))
</script>

<template>
  <div class="times">
    <div v-for="(line, r) in lines" :key="r" class="t-row">
      <span class="who">{{ line.who }}</span>
      <div class="groups">
        <span
          v-for="g in line.groups"
          :key="g"
          class="group"
          :style="{ gridTemplateColumns: `repeat(${cols}, var(--cell))` }"
        >
          <span v-for="i in per" :key="i" class="obj">{{ icon }}</span>
        </span>
        <span v-for="i in line.rest" :key="`rest-${i}`" class="obj loose">{{ icon }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.times {
  --cell: 30px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 100%;
}
.t-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: 6px 10px 6px 8px;
}
.who {
  flex: none;
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  line-height: 1;
  border-right: 2px solid var(--c-line);
  padding-right: 6px;
  box-sizing: content-box;
}
.groups {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
/* 一圈 = 一份：一样大的虚线圆角框 */
.group {
  display: grid;
  border: 2.5px dashed var(--c-primary);
  border-radius: 14px;
  padding: 2px 3px;
}
.obj {
  width: var(--cell);
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  line-height: 1;
  animation: pop-in 0.2s ease both;
}
.loose {
  height: 44px;
}
@keyframes pop-in {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .obj {
    animation: none;
  }
}
</style>
