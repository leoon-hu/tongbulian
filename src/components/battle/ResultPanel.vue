<script setup lang="ts">
// 结果页（B9）：胜方 + 成员、比分、用时、每人「答 n · 对 m」；输的一方写「差一点点！」；再来一局最大
import { computed } from 'vue'
import type { MatchState, Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { ui } from '@/engine/i18n'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

const props = defineProps<{ state: MatchState }>()
const emit = defineEmits<{ rematch: []; changeSkin: []; exit: [] }>()

const winner = computed<Team>(() => props.state.winner ?? 'red')
const loser = computed<Team>(() => (winner.value === 'red' ? 'blue' : 'red'))
const elapsed = computed(() => formatElapsed(elapsedMs(props.state, Date.now())))
const nameOf = (p: { kind: string; name: string }): string => (p.kind === 'ai' ? ui('battle.robot') : p.name)
</script>

<template>
  <div class="result">
    <div class="trophy">🏆</div>
    <h2 class="title" :class="winner"><RubyText :text="{ k: `battle.win.${winner}` }" /></h2>
    <p class="members">{{ teamPlayers(state, winner).map(nameOf).join('、') }}</p>
    <p class="score">
      <span class="red">{{ state.score.red }}</span> : <span class="blue">{{ state.score.blue }}</span>
    </p>
    <p class="time"><RubyText :text="{ k: 'battle.time' }" /> {{ elapsed }}</p>
    <ul class="stats">
      <li v-for="p in state.players" :key="p.id" :class="p.team">
        <span class="who">{{ nameOf(p) }}</span>
        <span>{{ ui('battle.stats', { n: p.index, m: p.correct }) }}</span>
        <span v-if="p.team === loser" class="close"><RubyText :text="{ k: 'battle.close' }" /></span>
      </li>
    </ul>
    <div class="actions">
      <BigButton color="green" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
      <BigButton color="blue" @click="emit('changeSkin')"><RubyText :text="{ k: 'battle.changeSkin' }" /></BigButton>
      <BigButton color="ghost" @click="emit('exit')"><RubyText :text="{ k: 'battle.exit' }" /></BigButton>
    </div>
  </div>
</template>

<style scoped>
.result {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: rgba(253, 246, 236, 0.96);
  overflow: auto;
}
.trophy {
  font-size: 64px;
  line-height: 1;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.title {
  font-size: var(--fs-xl);
}
.title.red {
  color: var(--c-red);
}
.title.blue {
  color: var(--c-blue);
}
.members {
  font-size: var(--fs-md);
  color: var(--c-text-light);
}
.score {
  font-size: var(--fs-huge);
  font-weight: 900;
  line-height: 1.1;
}
.score .red {
  color: var(--c-red);
}
.score .blue {
  color: var(--c-blue);
}
.time {
  font-size: var(--fs-md);
  color: var(--c-text-light);
}
.stats {
  list-style: none;
  padding: 0;
  margin: 4px 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  font-size: var(--fs-sm);
}
.stats li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.who {
  font-weight: 800;
}
.stats li.red .who {
  color: var(--c-red);
}
.stats li.blue .who {
  color: var(--c-blue);
}
.close {
  color: var(--c-primary-dark);
  font-weight: 700;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}
@keyframes pop {
  from {
    transform: scale(0) rotate(-30deg);
  }
  to {
    transform: scale(1) rotate(0);
  }
}
</style>
