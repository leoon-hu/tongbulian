<script setup lang="ts">
// 🐢🐇 赛跑（并行，上方横条）：得一分自己的动物向终点跑一格，先冲线的撒花
import { computed } from 'vue'
import { ratio, type SkinProps } from './index'

const props = defineProps<SkinProps>()
const lanes = computed(() => [
  { team: 'red', icon: '🐢', score: props.red },
  { team: 'blue', icon: '🐇', score: props.blue },
])
</script>

<template>
  <div class="race">
    <div v-for="lane in lanes" :key="lane.team" class="lane" :class="lane.team">
      <div class="track" />
      <span class="flag" aria-hidden="true">🏁</span>
      <span
        class="runner"
        :class="{ win: winner === lane.team }"
        :style="{ '--p': ratio(lane.score, target) }"
      >
        <span :key="lane.score" class="sprite">{{ lane.icon }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.race {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 4px 8px;
}
.lane {
  position: relative;
  flex: 1;
  min-height: 0;
}
.track {
  position: absolute;
  left: 20px;
  right: 40px;
  top: 50%;
  border-top: 3px dashed var(--c-line);
}
.lane.red .track {
  border-color: rgba(255, 107, 107, 0.45);
}
.lane.blue .track {
  border-color: rgba(74, 163, 255, 0.45);
}
.flag {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.4em;
  line-height: 1;
}
.runner {
  position: absolute;
  top: 50%;
  left: calc(12px + (100% - 76px) * var(--p));
  transform: translateY(-50%);
  transition: left 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 1.8em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  animation: hop 0.5s ease;
}
.runner.win .sprite {
  animation: cheer 0.5s ease-in-out infinite alternate;
}
@keyframes hop {
  0% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-40%) scale(1.15);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes cheer {
  from {
    transform: translateY(0) rotate(-12deg);
  }
  to {
    transform: translateY(-30%) rotate(12deg);
  }
}
</style>
