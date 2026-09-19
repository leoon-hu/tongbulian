<script setup lang="ts">
// 🚀 火箭升空（并行，左右之间的竖条）：得一分升高一段，到 8 分到达星星
import { computed } from 'vue'
import { ratio, type SkinProps } from './index'

const props = defineProps<SkinProps>()
const cols = computed(() => [
  { team: 'red', score: props.red },
  { team: 'blue', score: props.blue },
])
</script>

<template>
  <div class="rocket-skin">
    <div v-for="col in cols" :key="col.team" class="col" :class="col.team">
      <span class="star" :class="{ reached: winner === col.team }" aria-hidden="true">🌟</span>
      <div class="rail" />
      <span class="rocket" :class="{ win: winner === col.team }" :style="{ '--p': ratio(col.score, target) }">
        <span :key="col.score" class="sprite">🚀</span>
        <span v-if="lastPoint === col.team && col.score > 0" :key="`f${col.score}`" class="flame">🔥</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.rocket-skin {
  display: flex;
  width: 100%;
  height: 100%;
  padding: 6px 0;
}
.col {
  position: relative;
  flex: 1;
}
.rail {
  position: absolute;
  left: 50%;
  top: 30px;
  bottom: 8px;
  border-left: 3px dotted var(--c-line);
}
.col.red .rail {
  border-color: rgba(255, 107, 107, 0.4);
}
.col.blue .rail {
  border-color: rgba(74, 163, 255, 0.4);
}
.star {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  font-size: 1.5em;
  line-height: 1;
  opacity: 0.6;
}
.star.reached {
  opacity: 1;
  animation: twinkle 0.6s ease-in-out infinite alternate;
}
.rocket {
  position: absolute;
  left: 50%;
  bottom: calc(6px + (100% - 70px) * var(--p));
  transform: translateX(-50%);
  transition: bottom 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 1.9em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  transform: rotate(-45deg);
  animation: shake 0.5s ease;
}
.rocket.win .sprite {
  animation: shake 0.4s ease-in-out infinite;
}
.flame {
  position: absolute;
  left: 50%;
  top: 100%;
  transform: translateX(-50%);
  font-size: 0.7em;
  animation: burn 0.7s ease forwards;
}
@keyframes shake {
  0%,
  100% {
    transform: rotate(-45deg) translateX(0);
  }
  50% {
    transform: rotate(-45deg) translateX(3px) scale(1.1);
  }
}
@keyframes burn {
  from {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(14px) scale(0.5);
  }
}
@keyframes twinkle {
  from {
    transform: translateX(-50%) scale(1);
  }
  to {
    transform: translateX(-50%) scale(1.4) rotate(15deg);
  }
}
</style>
