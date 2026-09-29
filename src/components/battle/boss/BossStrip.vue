<script setup lang="ts">
// 多设备打怪兽的头像条（需求 M6）：每台设备只放自己那一栏作答区，房间里的其他人缩成一排小动物头像——
// 队色描边、名字、得分、正在按（三个跳动的点）、连击 🔥、开着麦 🎤、掉线变淡；结束后得分最高的戴 👑。观战的设备只有舞台 + 这一排。
// 人多时横着滚。只画，不朗读。
import type { TimedPlayer } from '@/battle/timed'
import { avatarEmoji } from '@/battle/avatars'
import { ui } from '@/engine/i18n'

defineProps<{
  players: readonly TimedPlayer[]
  /** 比赛中才显示「正在按」 */
  playing: boolean
  /** 谁开着麦 / 正在说话（B57） */
  voiceOf?: (id: string) => 'on' | 'talking' | null
  /** 本局之星（结束后） */
  stars?: ReadonlySet<string>
}>()
</script>

<template>
  <ul class="strip" :aria-label="ui('boss.strip')">
    <li
      v-for="p in players"
      :key="p.id"
      class="chip"
      :class="[p.team, { off: !p.online, typing: playing && !!p.input }]"
      :data-player="p.id"
    >
      <span class="face" aria-hidden="true">{{ p.kind === 'ai' ? '🤖' : avatarEmoji(p.avatar) }}</span>
      <span class="name">{{ p.kind === 'ai' ? ui('battle.robot') : p.name }}</span>
      <span v-if="stars?.has(p.id)" class="crown" aria-hidden="true">👑</span>
      <span v-if="p.streak >= 2" class="fire">🔥{{ p.streak }}</span>
      <span v-if="voiceOf?.(p.id)" class="mic" :class="voiceOf(p.id)" aria-hidden="true">🎤</span>
      <span v-if="!p.online" class="gone" aria-hidden="true">📶</span>
      <span v-if="playing && p.input" class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      <span :key="p.score" class="pts">{{ ui('boss.points', { n: p.score }) }}</span>
    </li>
  </ul>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 6px;
  margin: 0;
  padding: 2px 0;
  list-style: none;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
}
.strip::-webkit-scrollbar {
  display: none;
}
.chip {
  flex: none;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
  padding: 0 10px 0 6px;
  border-radius: 999px;
  background: var(--c-card);
  border: 2px solid var(--c-locked);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-sm);
  font-weight: 800;
  white-space: nowrap;
  transition: opacity 0.2s ease;
}
.chip.red {
  border-color: var(--c-red);
  background: #fff1ef;
}
.chip.blue {
  border-color: var(--c-blue);
  background: #edf5ff;
}
.chip.off {
  opacity: 0.45;
}
.face {
  font-size: 20px;
}
.name {
  max-width: 6em;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pts {
  font-variant-numeric: tabular-nums;
  animation: pop 0.3s ease-out;
}
.fire {
  font-size: 13px;
}
.mic.talking {
  animation: pulse 0.6s ease-in-out infinite alternate;
}
.dots {
  display: inline-flex;
  gap: 2px;
}
.dots i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.6;
  animation: dot 0.9s ease-in-out infinite;
}
.dots i:nth-child(2) {
  animation-delay: 0.15s;
}
.dots i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes dot {
  50% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
@keyframes pop {
  from {
    transform: scale(1.4);
  }
}
@keyframes pulse {
  to {
    transform: scale(1.25);
  }
}
@media (prefers-reduced-motion: reduce) {
  .pts,
  .mic.talking,
  .dots i {
    animation: none;
  }
}
</style>
