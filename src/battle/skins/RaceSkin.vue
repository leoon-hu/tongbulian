<script setup lang="ts">
// 🐢🐇 赛跑（并行，上方横条）：天空 / 太阳 / 飘云 / 草地跑道 / 格子终点线 / 观众；
// 得一分自己的动物向终点跑一格并扬起尘土，某队到 6 分起终点旗挥得更快，冲线后观众跳起来
import { computed } from 'vue'
import { ratio, type SkinProps } from './index'

const props = defineProps<SkinProps>()
const lanes = computed(() => [
  { team: 'red', icon: '🐢', score: props.red },
  { team: 'blue', icon: '🐇', score: props.blue },
])
const sprint = computed(() => Math.max(props.red, props.blue) >= props.target - 2)
</script>

<template>
  <div class="scene race" :class="{ ready: phase === 'countdown', sprint, ended: phase === 'ended' }">
    <div class="sky" aria-hidden="true">
      <span class="sun">☀️</span>
      <span class="cloud c1">☁️</span>
      <span class="cloud c2">☁️</span>
      <span class="cloud c3">🌥️</span>
    </div>
    <div class="ground" />
    <div class="finish" aria-hidden="true">
      <div class="checker" />
      <span class="flag">🏁</span>
      <span class="crowd" :class="{ jump: !!winner }">🐵🐶🐷</span>
    </div>
    <div class="lanes">
      <div v-for="lane in lanes" :key="lane.team" class="lane" :class="lane.team">
        <div class="track" />
        <span
          class="runner"
          :class="{ win: winner === lane.team, lose: winner !== null && winner !== lane.team }"
          :style="{ '--p': ratio(lane.score, target) }"
        >
          <span v-if="lane.score > 0 && phase !== 'ended'" :key="`d${lane.score}`" class="dust" aria-hidden="true">💨</span>
          <span :key="lane.score" class="sprite">{{ lane.icon }}</span>
        </span>
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
  background: linear-gradient(180deg, #b7e0ff 0%, #e9f6ff 100%);
}
.sky {
  position: absolute;
  inset: 0;
}
.sun {
  position: absolute;
  right: 16%;
  top: 3px;
  font-size: 1.7em;
  line-height: 1;
  animation: pulse 3s ease-in-out infinite alternate;
}
.cloud {
  position: absolute;
  top: 6%;
  left: 0;
  font-size: 1.4em;
  line-height: 1;
  opacity: 0.95;
  animation: drift linear infinite;
}
.c1 {
  animation-duration: 30s;
}
.c2 {
  top: 24%;
  font-size: 1em;
  animation-duration: 38s;
  animation-delay: -16s;
}
.c3 {
  top: 2%;
  font-size: 1.1em;
  animation-duration: 44s;
  animation-delay: -30s;
}
.ground {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 64%;
  background: linear-gradient(180deg, #a6e58a, #74c95e);
}
.lanes {
  position: absolute;
  left: 2%;
  right: 11%;
  top: 40%;
  bottom: 5%;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}
.lane {
  position: relative;
  height: 42%;
}
.track {
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: #f3dcaa;
  box-shadow: inset 0 0 0 2px #e4c48c;
}
.track::after {
  content: '';
  position: absolute;
  left: 8px;
  right: 8px;
  top: 50%;
  border-top: 2px dashed rgba(255, 255, 255, 0.8);
}
.finish {
  position: absolute;
  right: 6%;
  top: 38%;
  bottom: 4%;
  width: 10px;
}
.checker {
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: repeating-conic-gradient(#3d2c1e 0 25%, #fff 0 50%) 0 0 / 10px 10px;
}
.flag {
  position: absolute;
  left: -2px;
  top: -1.35em;
  font-size: 1.4em;
  line-height: 1;
  transform-origin: 15% 100%;
  animation: wave 1.4s ease-in-out infinite;
}
.sprint .flag {
  animation-duration: 0.45s;
}
.crowd {
  position: absolute;
  left: 16px;
  top: -1.25em;
  font-size: 1em;
  line-height: 1;
  white-space: nowrap;
}
.crowd.jump {
  animation: hop 0.45s ease-in-out infinite alternate;
}
.runner {
  position: absolute;
  top: 50%;
  left: calc(4px + (100% - 46px) * var(--p));
  transform: translateY(-50%);
  transition: left 0.75s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 1.9em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  animation: dash 0.55s ease, bob 1.4s ease-in-out 0.55s infinite alternate;
}
.ready .sprite {
  animation: hop 0.4s ease-in-out infinite alternate;
}
.runner.win .sprite {
  animation: cheer 0.45s ease-in-out infinite alternate;
}
.runner.lose .sprite {
  animation: none;
  opacity: 0.8;
}
.dust {
  position: absolute;
  right: 85%;
  top: 30%;
  font-size: 0.7em;
  animation: puff 0.7s ease-out forwards;
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
@keyframes wave {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(10deg);
  }
}
@keyframes bob {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-9%);
  }
}
@keyframes hop {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-35%);
  }
}
@keyframes dash {
  0% {
    transform: translateY(0) scaleX(1);
  }
  35% {
    transform: translateY(-38%) scaleX(1.2);
  }
  100% {
    transform: translateY(0) scaleX(1);
  }
}
@keyframes cheer {
  from {
    transform: translateY(0) rotate(-12deg);
  }
  to {
    transform: translateY(-32%) rotate(12deg);
  }
}
@keyframes puff {
  from {
    opacity: 1;
    transform: translateX(0) scale(0.8);
  }
  to {
    opacity: 0;
    transform: translateX(-16px) scale(1.4);
  }
}
/* 手机横屏的矮横条：只留跑道与角色 */
@container (max-height: 72px) {
  .sun,
  .cloud,
  .crowd {
    display: none;
  }
  .lanes {
    top: 10%;
    bottom: 8%;
  }
  .finish {
    top: 8%;
    bottom: 6%;
  }
  .flag {
    top: -0.2em;
    left: 12px;
    font-size: 1.1em;
  }
  .runner {
    font-size: 1.5em;
  }
}
</style>
