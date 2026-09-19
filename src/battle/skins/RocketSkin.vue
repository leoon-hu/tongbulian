<script setup lang="ts">
// 🚀 火箭升空（并行，左右之间的竖条）：星空里两枚火箭平时悬浮、喷小火；得一分升高一段、喷大火；
// 某队到 6 分起目标星星脉动；到 8 分到达星星，星星转起来、放烟花
import { computed } from 'vue'
import { ratio, type SkinProps } from './index'

const props = defineProps<SkinProps>()
const cols = computed(() => [
  { team: 'red', score: props.red },
  { team: 'blue', score: props.blue },
])
const sprint = computed(() => Math.max(props.red, props.blue) >= props.target - 2)

/** 背景星星（固定位置，别每次渲染都跳） */
const STARS = [
  [8, 12, 0], [22, 30, 0.6], [40, 8, 1.1], [58, 26, 0.3], [76, 14, 0.9], [90, 34, 1.5],
  [14, 52, 0.4], [34, 66, 1.2], [52, 46, 0.8], [70, 60, 0.2], [86, 74, 1.4], [26, 84, 0.7],
  [62, 88, 1.0], [46, 94, 0.5],
].map(([left, top, delay]) => ({ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }))
</script>

<template>
  <div class="scene space" :class="{ ready: phase === 'countdown', sprint, ended: phase === 'ended' }">
    <span v-for="(s, i) in STARS" :key="i" class="star" :style="s" aria-hidden="true" />
    <span class="planet" aria-hidden="true">🪐</span>
    <div class="cols">
      <div v-for="col in cols" :key="col.team" class="col" :class="col.team">
        <span class="goal" :class="{ reached: winner === col.team }" aria-hidden="true">🌟</span>
        <div class="rail" />
        <span
          class="rocket"
          :class="{ win: winner === col.team, lose: winner !== null && winner !== col.team }"
          :style="{ '--p': ratio(col.score, target) }"
        >
          <span :key="col.score" class="sprite">🚀</span>
          <span class="flame" aria-hidden="true">🔥</span>
          <span v-if="lastPoint === col.team && col.score > 0" :key="`b${col.score}`" class="boost" aria-hidden="true">🔥</span>
        </span>
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
  background: linear-gradient(180deg, #0b1440 0%, #22225f 55%, #4b2b7c 100%);
}
.star {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 4px #fff;
  animation: twinkle 2.2s ease-in-out infinite alternate;
}
.planet {
  position: absolute;
  left: 50%;
  top: 30%;
  transform: translateX(-50%);
  font-size: 1.4em;
  line-height: 1;
  opacity: 0.9;
  animation: floaty 7s ease-in-out infinite alternate;
}
.cols {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 4px 0;
}
.col {
  position: relative;
  flex: 1;
}
.goal {
  position: absolute;
  left: 50%;
  top: 4px;
  transform: translateX(-50%);
  font-size: 1.5em;
  line-height: 1;
  animation: twinkle 1.8s ease-in-out infinite alternate;
}
.sprint .goal {
  animation: pulse 0.6s ease-in-out infinite alternate;
}
.goal.reached {
  animation: spin 1s linear infinite;
}
.rail {
  position: absolute;
  left: 50%;
  top: 34px;
  bottom: 12px;
  border-left: 2px dashed rgba(255, 255, 255, 0.28);
}
.col.red .rail {
  border-color: rgba(255, 140, 140, 0.55);
}
.col.blue .rail {
  border-color: rgba(140, 190, 255, 0.55);
}
.rocket {
  position: absolute;
  left: 50%;
  bottom: calc(10px + (100% - 78px) * var(--p));
  transform: translateX(-50%);
  transition: bottom 0.8s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 2em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  transform: rotate(-45deg);
  animation: shake 0.5s ease, floaty 2.4s ease-in-out 0.5s infinite alternate;
}
.ready .sprite {
  animation: hop 0.4s ease-in-out infinite alternate;
}
.rocket.win .sprite {
  animation: shake 0.35s ease-in-out infinite;
}
.rocket.lose .sprite {
  animation: none;
  opacity: 0.85;
}
.flame {
  position: absolute;
  left: 50%;
  top: 82%;
  transform: translateX(-50%) scale(0.55);
  font-size: 0.8em;
  line-height: 1;
  animation: flicker 0.22s ease-in-out infinite alternate;
}
.rocket.lose .flame {
  display: none;
}
.boost {
  position: absolute;
  left: 50%;
  top: 80%;
  transform: translateX(-50%);
  font-size: 1em;
  line-height: 1;
  animation: burn 0.8s ease-out forwards;
}
.fireworks {
  position: absolute;
  left: 50%;
  top: 26%;
  transform: translateX(-50%);
  font-size: 1.8em;
  line-height: 1;
  animation: burst 0.8s ease-in-out infinite alternate;
}
@keyframes twinkle {
  from {
    opacity: 0.35;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1.3);
  }
}
@keyframes floaty {
  from {
    transform: translateX(-50%) translateY(0);
  }
  to {
    transform: translateX(-50%) translateY(-6px);
  }
}
.sprite {
  /* 火箭的悬浮不带 translateX，单独一套 */
  animation-name: shake, hover;
}
@keyframes hover {
  from {
    transform: rotate(-45deg) translateY(0);
  }
  to {
    transform: rotate(-45deg) translateY(-5px);
  }
}
@keyframes hop {
  from {
    transform: rotate(-45deg) translateY(0);
  }
  to {
    transform: rotate(-45deg) translateY(-30%);
  }
}
@keyframes shake {
  0%,
  100% {
    transform: rotate(-45deg) translateX(0);
  }
  50% {
    transform: rotate(-45deg) translateX(3px) scale(1.12);
  }
}
@keyframes flicker {
  from {
    transform: translateX(-50%) scale(0.5);
    opacity: 0.8;
  }
  to {
    transform: translateX(-50%) scale(0.7);
    opacity: 1;
  }
}
@keyframes burn {
  from {
    opacity: 1;
    transform: translateX(-50%) scale(1.3);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(22px) scale(0.5);
  }
}
@keyframes pulse {
  from {
    transform: translateX(-50%) scale(1);
  }
  to {
    transform: translateX(-50%) scale(1.45);
  }
}
@keyframes spin {
  from {
    transform: translateX(-50%) rotate(0);
  }
  to {
    transform: translateX(-50%) rotate(360deg);
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
/* 手机横屏的窄竖条：去掉行星 */
@container (max-width: 110px) {
  .planet {
    display: none;
  }
  .rocket {
    font-size: 1.6em;
  }
  .goal {
    font-size: 1.2em;
  }
}
</style>
