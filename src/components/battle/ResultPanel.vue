<script setup lang="ts">
// 结果页（B9）：胜方 + 成员、比分、用时、每人「答 n · 对 m」；输的一方写「差一点点！」；单设备再来一局最大，线上下一章最大
import { computed } from 'vue'
import type { MatchState, Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { ui } from '@/engine/i18n'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * online（多设备房间，B9）：三个角色的结果页一模一样——「下一章」（最大）、「再来一局」、「不玩了」，谁都能点，谁先点就按谁的；没有「换个游戏」；
 * next（线上「下一章」）：本册下一个知识点的 id，上面写着下一章是哪个知识点；null = 这一册已是最后一个，写「这一册都打完啦！」；
 * 单设备（online = false）：「再来一局」「换个游戏」「退出」
 */
const props = withDefaults(defineProps<{ state: MatchState; online?: boolean; next?: string | null }>(), { online: false })
const emit = defineEmits<{ rematch: []; changeSkin: []; next: []; quit: []; exit: [] }>()

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
    <p v-if="online && next" class="next-hint"><RubyText :text="{ k: 'battle.next' }" />：<RubyText :text="{ k: `kp.${next}` }" /></p>
    <p v-else-if="online && next === null" class="next-hint done"><RubyText :text="{ k: 'battle.lastChapter' }" /></p>
    <div class="actions">
      <template v-if="online">
        <BigButton v-if="next" color="green" class="next-btn" @click="emit('next')"><RubyText :text="{ k: 'battle.next' }" /> ▶</BigButton>
        <BigButton :color="next ? 'blue' : 'green'" class="rematch-btn" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
        <BigButton color="ghost" class="quit-btn" @click="emit('quit')"><RubyText :text="{ k: 'battle.quit' }" /></BigButton>
      </template>
      <template v-else>
        <BigButton color="green" class="rematch-btn" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
        <BigButton color="blue" @click="emit('changeSkin')"><RubyText :text="{ k: 'battle.changeSkin' }" /></BigButton>
        <BigButton color="ghost" @click="emit('exit')"><RubyText :text="{ k: 'battle.exit' }" /></BigButton>
      </template>
    </div>
  </div>
</template>

<style scoped>
.next-hint {
  margin: 4px 0 0;
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-light);
  text-align: center;
}
.next-hint.done {
  color: var(--c-primary-dark);
}
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
  background: rgba(253, 246, 236, 0.9);
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
