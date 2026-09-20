<script setup lang="ts">
// 结果页（B9）：胜方 + 成员、比分、用时、每人「答 n · 对 m」；输的一方写「差一点点！」；下一章最大（本册最后一个知识点时再来一局最大）
import { computed } from 'vue'
import type { MatchState, Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { ui } from '@/engine/i18n'
import { useShareStore } from '@/stores/share'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 三种模式一模一样（B9，2026-09-20 用户定）：「下一章」（最大）、「再来一局」、「不玩了」；多设备房间里三个角色都一样、谁先点就按谁的。
 * next：本册下一个知识点的 id，上面写着下一章是哪个知识点；null = 这一册已是最后一个，没有这个键、写「这一册都打完啦！」。
 * 怎么执行（单设备接着打 / 线上发给服务器）由竞技场决定，这里只发事件。
 */
const props = defineProps<{ state: MatchState; next: string | null }>()
const emit = defineEmits<{ rematch: []; next: []; quit: [] }>()

const winner = computed<Team>(() => props.state.winner ?? 'red')
const loser = computed<Team>(() => (winner.value === 'red' ? 'blue' : 'red'))
const elapsed = computed(() => formatElapsed(elapsedMs(props.state, Date.now())))
const nameOf = (p: { kind: string; name: string }): string => (p.kind === 'ai' ? ui('battle.robot') : p.name)

/** 「分享战绩」（F1「开源与分享」）：这一局的知识点、比分、谁赢了 + 站点链接；有系统分享面板直接弹，否则复制一段话 */
const shareStore = useShareStore()
function shareResult(): void {
  void shareStore.share(
    ui('share.result', { kp: ui(`kp.${props.state.kpId}`), red: props.state.score.red, blue: props.state.score.blue, winner: ui(`battle.team.${winner.value}`) }),
  )
}
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
    <p v-if="next" class="next-hint"><RubyText :text="{ k: 'battle.next' }" />：<RubyText :text="{ k: `kp.${next}` }" /></p>
    <p v-else class="next-hint done"><RubyText :text="{ k: 'battle.lastChapter' }" /></p>
    <div class="actions">
      <BigButton v-if="next" color="green" class="next-btn" @click="emit('next')"><RubyText :text="{ k: 'battle.next' }" /> ▶</BigButton>
      <BigButton :color="next ? 'blue' : 'green'" class="rematch-btn" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
      <BigButton color="ghost" class="quit-btn" @click="emit('quit')"><RubyText :text="{ k: 'battle.quit' }" /></BigButton>
    </div>
    <button type="button" class="share-btn" @click="shareResult">📣 <RubyText :text="{ k: 'battle.share' }" /></button>
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
.share-btn {
  margin-top: 2px;
  padding: 8px 12px;
  background: none;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
