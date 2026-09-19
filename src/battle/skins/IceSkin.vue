<script setup lang="ts">
// 🧊 融冰（消耗对方，左右之间的竖条）：天上飘雪，底下是水面有鱼游；我得一分，对方的冰先裂再化成水滴；
// 对方冰全化，它的企鹅滑进水里溅水花，赢的企鹅跳
import { computed } from 'vue'
import { otherTeam, type Team } from '../protocol'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
/** 每边剩下的冰 = 目标分 − 对方的分 */
const cols = computed(() => [
  { team: 'red' as Team, left: Math.max(0, props.target - props.blue) },
  { team: 'blue' as Team, left: Math.max(0, props.target - props.red) },
])

/** 雪花（固定的横向位置与节奏） */
const FLAKES = [
  [6, 7, 0], [22, 9, -3], [38, 6, -1.5], [54, 8, -5], [70, 7, -2.5], [86, 10, -4], [14, 11, -6], [62, 9, -7],
].map(([left, dur, delay]) => ({ left: `${left}%`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }))
</script>

<template>
  <div class="scene polar" :class="{ ready: phase === 'countdown', ended: phase === 'ended' }" :style="{ '--n': target }">
    <span v-for="(f, i) in FLAKES" :key="i" class="flake" :style="f" aria-hidden="true">❄️</span>
    <div class="water" aria-hidden="true"><span class="fish">🐟</span></div>
    <div class="cols">
      <div v-for="col in cols" :key="col.team" class="col" :class="col.team">
        <span class="penguin" :class="{ win: winner === col.team, slide: col.left === 0 }">🐧</span>
        <TransitionGroup name="melt" tag="div" class="stack">
          <div v-for="i in col.left" :key="i" class="cube" />
        </TransitionGroup>
        <span
          v-if="col.left > 0 && col.left < target && lastPoint === otherTeam(col.team) && phase !== 'ended'"
          :key="`drip${col.left}`"
          class="drip"
          aria-hidden="true"
        >
          💧
        </span>
      </div>
    </div>
    <span v-if="winner" class="splash" :class="winner === 'red' ? 'r' : 'l'" aria-hidden="true">💦</span>
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
  background: linear-gradient(180deg, #dff1ff 0%, #f4faff 100%);
}
.flake {
  position: absolute;
  top: -1.2em;
  font-size: 0.7em;
  line-height: 1;
  opacity: 0.85;
  animation: fall linear infinite;
}
.water {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 16%;
  background: linear-gradient(180deg, #9fd8ff, #4aa3ff);
  border-top: 3px solid #cdeeff;
}
.fish {
  position: absolute;
  left: 0;
  bottom: 12%;
  font-size: 0.9em;
  line-height: 1;
  animation: swim 9s ease-in-out infinite alternate;
}
.cols {
  position: absolute;
  left: 6%;
  right: 6%;
  top: 4%;
  bottom: 16%;
  display: flex;
  gap: 6px;
}
.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  min-height: 0;
  position: relative;
}
.penguin {
  font-size: 1.7em;
  line-height: 1;
  margin-bottom: 2px;
  transform-origin: 50% 100%;
  transition: transform 0.7s ease-in, opacity 0.5s ease;
  animation: waddle 1.6s ease-in-out infinite alternate;
}
.ready .penguin {
  animation: hop 0.4s ease-in-out infinite alternate;
}
.penguin.win {
  animation: jump 0.45s ease-in-out infinite alternate;
}
.penguin.slide {
  transform: rotate(80deg) translateX(30%) translateY(10%);
  opacity: 0.8;
  animation: none;
}
.stack {
  display: flex;
  flex-direction: column-reverse;
  width: 100%;
  gap: 2px;
}
.cube {
  height: calc((100cqh - 58px) / var(--n));
  min-height: 9px;
  max-height: 24px;
  border-radius: 5px;
  background: linear-gradient(180deg, #f2fbff, #a9dcff);
  border: 1px solid #bfe6ff;
  box-shadow: inset 2px 2px 0 rgba(255, 255, 255, 0.9), inset -2px -2px 0 rgba(120, 190, 240, 0.5);
}
.melt-leave-active {
  animation: melt 0.75s ease-in forwards;
}
.drip {
  position: absolute;
  left: 50%;
  bottom: -4px;
  transform: translateX(-50%);
  font-size: 0.9em;
  line-height: 1;
  animation: drip 0.8s ease-in forwards;
}
.splash {
  position: absolute;
  bottom: 6%;
  font-size: 1.8em;
  line-height: 1;
  animation: splash 0.9s ease-out infinite;
}
.splash.l {
  left: 8%;
}
.splash.r {
  right: 8%;
}
@keyframes fall {
  from {
    transform: translateY(0) rotate(0);
  }
  to {
    transform: translateY(110cqh) rotate(360deg);
  }
}
@keyframes swim {
  0% {
    transform: translateX(0) scaleX(-1);
  }
  49% {
    transform: translateX(calc(100cqw - 1.2em)) scaleX(-1);
  }
  51% {
    transform: translateX(calc(100cqw - 1.2em)) scaleX(1);
  }
  100% {
    transform: translateX(0) scaleX(1);
  }
}
@keyframes waddle {
  from {
    transform: rotate(-5deg);
  }
  to {
    transform: rotate(5deg);
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
@keyframes jump {
  from {
    transform: translateY(0) rotate(-8deg);
  }
  to {
    transform: translateY(-35%) rotate(8deg);
  }
}
@keyframes melt {
  0% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
  35% {
    transform: scale(1.05) rotate(5deg);
    opacity: 1;
  }
  100% {
    transform: scaleY(0.1) translateY(14px);
    opacity: 0;
  }
}
@keyframes drip {
  from {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  to {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
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
@container (max-width: 110px) {
  .flake {
    display: none;
  }
  .cols {
    gap: 4px;
    left: 4%;
    right: 4%;
  }
  .penguin {
    font-size: 1.3em;
  }
  .cube {
    height: calc((100cqh - 46px) / var(--n));
  }
}
</style>
