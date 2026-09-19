<script setup lang="ts">
// 胜利（B6）：全屏撒队色彩纸 + 🏆 + 队名；结果页 2 秒后叠在上面，彩纸继续飘
import { computed } from 'vue'
import type { Team } from '@/battle/protocol'
import RubyText from '@/components/ui/RubyText.vue'

/** quiet：结果页叠上来之后只留彩纸，横幅收起（不然两层「红队获胜」叠在一起） */
const props = defineProps<{ team: Team; quiet?: boolean }>()

const PALETTE: Record<Team, string[]> = {
  red: ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b', '#ffd6a5'],
  blue: ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff', '#a5e3ff'],
}

/** 60 片彩纸：位置、颜色、节奏各不相同 */
const pieces = computed(() =>
  Array.from({ length: 60 }, (_, i) => ({
    left: `${(i * 37) % 100}%`,
    background: PALETTE[props.team][i % PALETTE[props.team].length],
    animationDelay: `${(i % 12) * 0.12}s`,
    animationDuration: `${2 + (i % 5) * 0.35}s`,
    width: `${8 + (i % 3) * 4}px`,
    height: `${10 + (i % 4) * 4}px`,
    borderRadius: i % 2 ? '50%' : '3px',
  })),
)
</script>

<template>
  <div class="victory" :class="team" aria-hidden="true">
    <span v-for="(p, i) in pieces" :key="i" class="confetti" :style="p" />
    <div v-if="!quiet" class="banner">
      <span class="trophy">🏆</span>
      <span class="text"><RubyText :text="{ k: `battle.win.${team}` }" /></span>
      <span class="party">🎉</span>
    </div>
  </div>
</template>

<style scoped>
.victory {
  position: absolute;
  inset: 0;
  z-index: 28;
  overflow: hidden;
  pointer-events: none;
}
.confetti {
  position: absolute;
  top: -20px;
  animation: fall linear forwards;
}
.banner {
  position: absolute;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 32px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 30px rgba(61, 44, 30, 0.2);
  animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.victory.red .banner {
  border: 4px solid var(--c-red);
  color: var(--c-red);
}
.victory.blue .banner {
  border: 4px solid var(--c-blue);
  color: var(--c-blue);
}
.trophy,
.party {
  font-size: 56px;
  line-height: 1;
}
.trophy {
  animation: swing 0.7s ease-in-out infinite alternate;
}
.party {
  animation: swing 0.7s ease-in-out 0.35s infinite alternate-reverse;
}
.text {
  font-size: var(--fs-huge);
  font-weight: 900;
  white-space: nowrap;
}
@keyframes fall {
  to {
    transform: translateY(110vh) rotate(720deg);
  }
}
@keyframes pop {
  from {
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}
@keyframes swing {
  from {
    transform: rotate(-15deg) translateY(0);
  }
  to {
    transform: rotate(15deg) translateY(-8px);
  }
}
</style>
