<script setup lang="ts">
// 🧱 盖楼（建造，竖条）：得一分加一层，第 8 层封顶放旗放烟花
import { computed } from 'vue'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
const cols = computed(() => [
  { team: 'red', score: Math.min(props.red, props.target) },
  { team: 'blue', score: Math.min(props.blue, props.target) },
])
</script>

<template>
  <div class="tower-skin" :style="{ '--n': target }">
    <div v-for="col in cols" :key="col.team" class="col" :class="col.team">
      <span v-if="col.score >= target" class="top">🚩<span v-if="winner === col.team" class="fireworks">🎆</span></span>
      <div class="stack">
        <div v-for="i in col.score" :key="i" class="block" />
      </div>
      <div class="ground" />
    </div>
  </div>
</template>

<style scoped>
.tower-skin {
  display: flex;
  gap: 6px;
  width: 100%;
  height: 100%;
  padding: 4px 6px;
}
.col {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
}
.stack {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
  gap: 2px;
}
.ground {
  width: 100%;
  height: 6px;
  margin-top: 3px;
  border-radius: 3px;
  background: var(--c-line);
}
.col.red .ground {
  background: rgba(255, 107, 107, 0.35);
}
.col.blue .ground {
  background: rgba(74, 163, 255, 0.35);
}
.block {
  position: relative;
  height: calc((100% - 46px) / var(--n));
  min-height: 8px;
  max-height: 22px;
  border-radius: 4px;
  animation: rise 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
  transform-origin: bottom center;
}
.col.red .block {
  background: linear-gradient(180deg, #ff9b9b, #ff6b6b);
}
.col.blue .block {
  background: linear-gradient(180deg, #8fc3ff, #4aa3ff);
}
.top {
  position: relative;
  font-size: 1.4em;
  line-height: 1;
  margin-bottom: 2px;
  animation: rise 0.5s ease;
}
.fireworks {
  position: absolute;
  left: 50%;
  top: -0.9em;
  transform: translateX(-50%);
  animation: burst 0.8s ease-in-out infinite alternate;
}
@keyframes rise {
  from {
    transform: scaleY(0);
    opacity: 0;
  }
  to {
    transform: scaleY(1);
    opacity: 1;
  }
}
@keyframes burst {
  from {
    transform: translateX(-50%) scale(0.8);
    opacity: 0.6;
  }
  to {
    transform: translateX(-50%) scale(1.3);
    opacity: 1;
  }
}
</style>
