<script setup lang="ts">
import { computed } from 'vue'
import RubyText from '@/components/ui/RubyText.vue'
/**
 * 一排/一列物体，用于「位置：上下前后左右、第几」。
 * axis='lr' 横排标左右，'ud' 竖列标上下，'fb' 横排标前后；highlight 高亮某一个（可选）。
 */
const props = withDefaults(
  defineProps<{ items: string[]; highlight?: number; axis?: 'lr' | 'ud' | 'fb' }>(),
  { axis: 'lr' },
)

const isColumn = computed(() => props.axis === 'ud')
const ENDS: Record<'lr' | 'ud' | 'fb', [string, string]> = {
  lr: ['lineup.left', 'lineup.right'],
  ud: ['lineup.up', 'lineup.down'],
  fb: ['lineup.front', 'lineup.back'],
}
const startLabel = computed(() => ({ k: ENDS[props.axis][0] }))
const endLabel = computed(() => ({ k: ENDS[props.axis][1] }))
</script>

<template>
  <div class="lineup-wrap" :class="isColumn ? 'col' : 'row'">
    <template v-if="isColumn">
      <span class="end"><RubyText :text="startLabel" /></span>
      <div class="lineup col">
        <span
          v-for="(it, i) in items"
          :key="i"
          class="slot"
          :class="{ hi: highlight === i }"
          >{{ it }}</span
        >
      </div>
      <span class="end"><RubyText :text="endLabel" /></span>
    </template>
    <template v-else>
      <div class="ends">
        <span><RubyText :text="startLabel" /></span>
        <span><RubyText :text="endLabel" /></span>
      </div>
      <div class="lineup row">
        <span
          v-for="(it, i) in items"
          :key="i"
          class="slot"
          :class="{ hi: highlight === i }"
          >{{ it }}</span
        >
      </div>
    </template>
  </div>
</template>

<style scoped>
.lineup-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 440px;
}
.lineup-wrap.col {
  align-items: center;
  gap: 8px;
}
.ends {
  display: flex;
  justify-content: space-between;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
  font-weight: 700;
  padding: 0 4px;
}
.end {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
  font-weight: 700;
}
.lineup {
  display: flex;
  gap: 10px;
  justify-content: center;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  padding: 12px;
}
.lineup.row {
  flex-direction: row;
}
.lineup.col {
  flex-direction: column;
}
.slot {
  font-size: 42px;
  line-height: 1;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
}
.slot.hi {
  background: #fff3e0;
  box-shadow: 0 0 0 3px var(--c-primary);
}
</style>
