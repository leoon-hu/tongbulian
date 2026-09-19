<script setup lang="ts">
// 🧊 融冰（消耗对方，竖条）：我得一分，对方的冰化掉一块；对方冰全化，它的企鹅就滑下来
import { computed } from 'vue'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
/** 每边剩下的冰 = 目标分 − 对方的分 */
const cols = computed(() => [
  { team: 'red', left: Math.max(0, props.target - props.blue) },
  { team: 'blue', left: Math.max(0, props.target - props.red) },
])
</script>

<template>
  <div class="ice-skin" :style="{ '--n': target }">
    <div v-for="col in cols" :key="col.team" class="col" :class="col.team">
      <span class="penguin" :class="{ win: winner === col.team, slide: col.left === 0 }">🐧</span>
      <TransitionGroup name="melt" tag="div" class="stack">
        <div v-for="i in col.left" :key="i" class="cube" />
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.ice-skin {
  display: flex;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 4px 6px;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-height: 0;
}
.penguin {
  font-size: 1.6em;
  line-height: 1;
  margin-bottom: 2px;
  transition: transform 0.6s ease;
}
.penguin.win {
  animation: jump 0.5s ease-in-out infinite alternate;
}
.penguin.slide {
  transform: rotate(90deg) translateX(20%);
  opacity: 0.7;
}
.stack {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
  gap: 2px;
}
.cube {
  height: calc((100% - 40px) / var(--n));
  min-height: 8px;
  max-height: 22px;
  border-radius: 5px;
  background: linear-gradient(180deg, #e6f6ff, #9fd8ff);
  border: 1px solid #bfe6ff;
}
.melt-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.melt-leave-to {
  opacity: 0;
  transform: scale(0.3) translateY(12px);
}
@keyframes jump {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-30%);
  }
}
</style>
