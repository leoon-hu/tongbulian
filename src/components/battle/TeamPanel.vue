<script setup lang="ts">
// 一个队区：队名条（队色 + 比分大数字 + 8 颗进度点；只有一个人时显示他的名字）+ 成员行。
// 得分时（B5a）：队区闪一下队色、飘一个「+1」、比分数字弹一下、进度点亮一颗。
import { computed } from 'vue'
import type { Team } from '@/battle/protocol'
import { ui } from '@/engine/i18n'
import RubyText from '@/components/ui/RubyText.vue'
import PlayerRow from './PlayerRow.vue'
import type { RowData } from './rows'

const props = defineProps<{
  team: Team
  rows: RowData[]
  score: number
  target: number
  operable: string[]
  autoRead: boolean
  compact?: boolean
}>()
const emit = defineEmits<{ answer: [playerId: string, given: unknown]; input: [playerId: string, value: string] }>()

const solo = computed(() => props.rows.length === 1)
const soloPlayer = computed(() => props.rows[0]?.player)
const dots = computed(() => Array.from({ length: props.target }, (_, i) => i < props.score))
</script>

<template>
  <section class="team" :class="team">
    <span v-if="score > 0" :key="`flash${score}`" class="flash" aria-hidden="true" />
    <header class="team-head">
      <span class="dot" aria-hidden="true">{{ team === 'red' ? '🔴' : '🔵' }}</span>
      <span class="team-name">
        <template v-if="solo && soloPlayer">
          <RubyText v-if="soloPlayer.kind === 'ai'" :text="{ k: 'battle.robot' }" />
          <template v-else>{{ soloPlayer.name }}</template>
        </template>
        <RubyText v-else :text="{ k: `battle.team.${team}` }" />
      </span>
      <span class="progress" role="progressbar" :aria-valuenow="score" :aria-valuemax="target">
        <i v-for="(on, i) in dots" :key="i" :class="{ on }" />
      </span>
      <span class="score-wrap">
        <span v-if="score > 0" :key="`plus${score}`" class="plus" aria-hidden="true">+1</span>
        <span :key="score" class="score" :aria-label="ui(`battle.team.${team}`)">{{ score }}</span>
      </span>
    </header>
    <div class="rows">
      <PlayerRow
        v-for="row in rows"
        :key="row.player.id"
        :player="row.player"
        :question="row.question"
        :feedback="row.feedback"
        :operable="operable.includes(row.player.id)"
        :auto-read="autoRead && operable.includes(row.player.id)"
        :solo="solo"
        :compact="compact"
        @answer="(g) => emit('answer', row.player.id, g)"
        @input="(v) => emit('input', row.player.id, v)"
      />
    </div>
  </section>
</template>

<style scoped>
.team {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
}
.flash {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
  animation: flash 0.6s ease-out forwards;
}
.team.red .flash {
  background: rgba(255, 107, 107, 0.35);
}
.team.blue .flash {
  background: rgba(74, 163, 255, 0.35);
}
.team-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  font-weight: 800;
  font-size: var(--fs-md);
}
.team.red .team-head {
  background: rgba(255, 107, 107, 0.16);
}
.team.blue .team-head {
  background: rgba(74, 163, 255, 0.16);
}
.team-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.progress {
  display: flex;
  gap: 3px;
  flex: none;
}
.progress i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(61, 44, 30, 0.12);
  transition: transform 0.25s ease, background 0.25s ease;
}
.team.red .progress i.on {
  background: var(--c-red);
  transform: scale(1.2);
}
.team.blue .progress i.on {
  background: var(--c-blue);
  transform: scale(1.2);
}
.score-wrap {
  position: relative;
  flex: none;
  min-width: 1.2em;
  text-align: right;
}
.score {
  display: inline-block;
  font-size: var(--fs-xl);
  font-weight: 900;
  line-height: 1;
  animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.team.red .score {
  color: var(--c-red);
}
.team.blue .score {
  color: var(--c-blue);
}
.plus {
  position: absolute;
  right: 0;
  top: -0.2em;
  font-size: var(--fs-md);
  font-weight: 900;
  color: var(--c-green);
  animation: rise 0.9s ease-out forwards;
  pointer-events: none;
}
.rows {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
}
@keyframes flash {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes rise {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-28px);
  }
}
</style>
