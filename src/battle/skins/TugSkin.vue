<script setup lang="ts">
// 🪢 拔河（拉锯，上方横条）：草地 / 太阳 / 地上的中线，两队各两只动物；绳子上的 🎀 位置 = 比分差，
// 得一分自己这队后仰用力；某队到 6 分起绳子发抖；谁先到 8 分把对方拉过线，输的掉进水坑
import { computed } from 'vue'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
/** -1…1：正数偏红队（左） */
const pull = computed(() => {
  if (props.winner) return props.winner === 'red' ? 1 : -1
  return (props.red - props.blue) / props.target
})
const sprint = computed(() => Math.max(props.red, props.blue) >= props.target - 2)
</script>

<template>
  <div class="scene field" :class="{ ready: phase === 'countdown', sprint, ended: phase === 'ended' }">
    <span class="sun" aria-hidden="true">☀️</span>
    <span class="cloud" aria-hidden="true">☁️</span>
    <div class="ground"><div class="chalk" /></div>
    <div class="puddle l" /><div class="puddle r" />
    <div class="row">
      <span class="side red" :class="{ win: winner === 'red', lose: winner === 'blue' }">
        <span :key="`a${red}`" class="p">🐻</span>
        <span :key="`b${red}`" class="p p2">🐰</span>
      </span>
      <div class="rope">
        <div class="line" />
        <span class="knot" :style="{ '--d': pull }">
          <span :key="red + blue" class="sprite">🎀</span>
        </span>
      </div>
      <span class="side blue" :class="{ win: winner === 'blue', lose: winner === 'red' }">
        <span :key="`c${blue}`" class="p p2">🐨</span>
        <span :key="`d${blue}`" class="p">🐼</span>
      </span>
    </div>
    <span v-if="winner === 'red'" class="splash r" aria-hidden="true">💦</span>
    <span v-if="winner === 'blue'" class="splash l" aria-hidden="true">💦</span>
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
  background: linear-gradient(180deg, #b7e0ff 0%, #e9f6ff 100%);
}
.sun {
  position: absolute;
  right: 6%;
  top: 3px;
  font-size: 1.5em;
  line-height: 1;
  animation: pulse 3s ease-in-out infinite alternate;
}
.cloud {
  position: absolute;
  left: 0;
  top: 4%;
  font-size: 1.2em;
  line-height: 1;
  animation: drift 32s linear infinite;
}
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 44%;
  background: linear-gradient(180deg, #a6e58a, #74c95e);
}
.chalk {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  border-left: 3px dashed rgba(255, 255, 255, 0.85);
}
.puddle {
  position: absolute;
  bottom: 6%;
  width: 11%;
  height: 22%;
  border-radius: 50%;
  background: radial-gradient(ellipse at 40% 40%, #bfe6ff, #5eb8ff);
  opacity: 0.9;
}
.puddle.l {
  left: 1%;
}
.puddle.r {
  right: 1%;
}
.row {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 30%;
  bottom: 22%;
  display: flex;
  align-items: center;
  gap: 6px;
}
.side {
  flex: none;
  display: flex;
  gap: 2px;
  font-size: 1.8em;
  line-height: 1;
  transition: transform 0.7s ease, opacity 0.5s ease;
}
.p {
  display: inline-block;
  transform-origin: 50% 100%;
  animation: bob 1.5s ease-in-out infinite alternate;
}
.side.red .p {
  animation: lean-left 0.6s ease, bob 1.5s ease-in-out 0.6s infinite alternate;
}
.side.blue .p {
  animation: lean-right 0.6s ease, bob 1.5s ease-in-out 0.6s infinite alternate;
}
.p2 {
  animation-delay: 0.2s;
}
.ready .p {
  animation: hop 0.4s ease-in-out infinite alternate;
}
.side.win .p {
  animation: cheer 0.45s ease-in-out infinite alternate;
}
.side.lose {
  opacity: 0.85;
}
.side.red.lose {
  transform: translateX(-70%) rotate(-70deg);
}
.side.blue.lose {
  transform: translateX(70%) rotate(70deg);
}
.rope {
  position: relative;
  flex: 1;
  height: 100%;
}
.line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 6px solid #c9a06a;
  border-radius: 3px;
  box-shadow: 0 2px 0 #a8834f;
}
.sprint .line {
  animation: shiver 0.25s linear infinite;
}
.knot {
  position: absolute;
  top: 50%;
  left: calc(50% - var(--d) * 42%);
  transform: translate(-50%, -50%);
  transition: left 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 1.6em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  animation: tug 0.45s ease;
}
.splash {
  position: absolute;
  bottom: 12%;
  font-size: 1.8em;
  line-height: 1;
  animation: splash 0.9s ease-out infinite;
}
.splash.l {
  left: 2%;
}
.splash.r {
  right: 2%;
}
@keyframes drift {
  from {
    transform: translateX(-16cqw);
  }
  to {
    transform: translateX(112cqw);
  }
}
@keyframes pulse {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.12) rotate(8deg);
  }
}
@keyframes bob {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-6%);
  }
}
@keyframes hop {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-30%);
  }
}
@keyframes lean-left {
  0%,
  100% {
    transform: rotate(0);
  }
  40% {
    transform: rotate(-22deg) translateX(-10%);
  }
}
@keyframes lean-right {
  0%,
  100% {
    transform: rotate(0);
  }
  40% {
    transform: rotate(22deg) translateX(10%);
  }
}
@keyframes cheer {
  from {
    transform: translateY(0) rotate(-10deg);
  }
  to {
    transform: translateY(-30%) rotate(10deg);
  }
}
@keyframes tug {
  0%,
  100% {
    transform: rotate(0);
  }
  50% {
    transform: rotate(18deg) scale(1.2);
  }
}
@keyframes shiver {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(2px);
  }
}
@keyframes splash {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(1) translateY(-8px);
    opacity: 0;
  }
}
@container (max-height: 72px) {
  .sun,
  .cloud,
  .puddle {
    display: none;
  }
  .row {
    top: 12%;
    bottom: 12%;
    left: 4%;
    right: 4%;
  }
  .side {
    font-size: 1.4em;
  }
  .knot {
    font-size: 1.3em;
  }
  .ground {
    height: 30%;
  }
}
</style>
