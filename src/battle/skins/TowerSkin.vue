<script setup lang="ts">
// 🧱 盖楼（建造，左右之间的竖条）：天空有云和飞鸟，地上有草；得一分一块带窗户的砖从天上掉下来弹一下；
// 到 6 分起楼顶上方有星星等着；第 8 层封顶插旗、放烟花
import { computed } from 'vue'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
const cols = computed(() => [
  { team: 'red', score: Math.min(props.red, props.target) },
  { team: 'blue', score: Math.min(props.blue, props.target) },
])
</script>

<template>
  <div class="scene town" :class="{ ready: phase === 'countdown', ended: phase === 'ended' }" :style="{ '--n': target }">
    <div class="sky" aria-hidden="true">
      <span class="cloud c1">☁️</span>
      <span class="cloud c2">☁️</span>
      <span class="bird">🐦</span>
    </div>
    <div class="ground" />
    <div class="cols">
      <div v-for="col in cols" :key="col.team" class="col" :class="[col.team, { win: winner === col.team, lose: winner !== null && winner !== col.team }]">
        <span v-if="col.score >= target" class="roof" aria-hidden="true">🚩</span>
        <span v-else-if="col.score >= target - 2" class="near" aria-hidden="true">⭐</span>
        <div class="stack">
          <div v-for="i in col.score" :key="i" class="block"><i /><i /></div>
        </div>
        <div class="base" />
        <span v-if="winner === col.team" class="fireworks" aria-hidden="true">🎆</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  container-type: size;
  font-size: 16px;
  background: linear-gradient(180deg, #bfe3ff 0%, #eef8ff 100%);
}
.sky {
  position: absolute;
  inset: 0;
}
.cloud {
  position: absolute;
  left: 0;
  font-size: 1.2em;
  line-height: 1;
  animation: drift linear infinite;
}
.c1 {
  top: 6%;
  animation-duration: 26s;
}
.c2 {
  top: 40%;
  font-size: 0.9em;
  animation-duration: 34s;
  animation-delay: -20s;
}
.bird {
  position: absolute;
  top: 20%;
  left: 0;
  font-size: 0.9em;
  line-height: 1;
  animation: fly 16s linear infinite, flap 0.5s ease-in-out infinite alternate;
}
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 10%;
  background: linear-gradient(180deg, #8fd66c, #6cc253);
  border-top: 3px solid #5cb043;
}
.cols {
  position: absolute;
  left: 7%;
  right: 7%;
  top: 6%;
  bottom: 10%;
  display: flex;
  gap: 8px;
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
.block {
  position: relative;
  height: calc((100cqh - 48px) / var(--n));
  min-height: 9px;
  max-height: 26px;
  border-radius: 4px;
  animation: drop 0.55s cubic-bezier(0.34, 1.4, 0.64, 1);
}
.col.red .block {
  background: linear-gradient(180deg, #ff9b9b, #ff6b6b);
  box-shadow: inset 0 -2px 0 #e05252;
}
.col.blue .block {
  background: linear-gradient(180deg, #8fc3ff, #4aa3ff);
  box-shadow: inset 0 -2px 0 #2f7fd6;
}
.block i {
  position: absolute;
  top: 24%;
  height: 52%;
  width: 22%;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.75);
}
.block i:first-child {
  left: 16%;
}
.block i:last-child {
  right: 16%;
}
.base {
  width: 108%;
  height: 5px;
  margin-top: 2px;
  border-radius: 3px;
  background: #b8a07c;
}
.roof,
.near {
  font-size: 1.4em;
  line-height: 1;
  margin-bottom: 3px;
}
.roof {
  animation: hop 0.5s ease-in-out infinite alternate;
}
.near {
  animation: twinkle 0.9s ease-in-out infinite alternate;
}
.ready .stack {
  animation: hop 0.4s ease-in-out infinite alternate;
}
.col.win .stack {
  animation: cheer 0.5s ease-in-out infinite alternate;
}
.col.lose .stack {
  opacity: 0.8;
}
.fireworks {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translateX(-50%);
  font-size: 1.8em;
  line-height: 1;
  animation: burst 0.8s ease-in-out infinite alternate;
}
@keyframes drift {
  from {
    transform: translateX(-20cqw);
  }
  to {
    transform: translateX(120cqw);
  }
}
@keyframes fly {
  from {
    transform: translateX(-30cqw);
  }
  to {
    transform: translateX(130cqw);
  }
}
@keyframes flap {
  from {
    margin-top: 0;
  }
  to {
    margin-top: 4px;
  }
}
@keyframes drop {
  0% {
    transform: translateY(-70px);
    opacity: 0;
  }
  55% {
    transform: translateY(5px);
    opacity: 1;
  }
  78% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0);
  }
}
@keyframes hop {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-4px);
  }
}
@keyframes cheer {
  from {
    transform: translateY(0) rotate(-2deg);
  }
  to {
    transform: translateY(-5px) rotate(2deg);
  }
}
@keyframes twinkle {
  from {
    transform: scale(0.9);
    opacity: 0.7;
  }
  to {
    transform: scale(1.3);
    opacity: 1;
  }
}
@keyframes burst {
  from {
    transform: translateX(-50%) scale(0.7);
    opacity: 0.6;
  }
  to {
    transform: translateX(-50%) scale(1.3);
    opacity: 1;
  }
}
@container (max-width: 110px) {
  .cloud,
  .bird {
    display: none;
  }
  .cols {
    gap: 4px;
    left: 5%;
    right: 5%;
  }
  .block {
    height: calc((100cqh - 40px) / var(--n));
  }
  .roof,
  .near {
    font-size: 1.1em;
  }
}
</style>
