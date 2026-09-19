<script setup lang="ts">
// 一个队区：队名条（队色 + 比分大数字；只有一个人时显示他的名字）+ 成员行
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
  operable: string[]
  autoRead: boolean
  compact?: boolean
}>()
const emit = defineEmits<{ answer: [playerId: string, given: unknown]; input: [playerId: string, value: string] }>()

const solo = computed(() => props.rows.length === 1)
const soloPlayer = computed(() => props.rows[0]?.player)
</script>

<template>
  <section class="team" :class="team">
    <header class="team-head">
      <span class="dot" aria-hidden="true">{{ team === 'red' ? '🔴' : '🔵' }}</span>
      <span class="team-name">
        <template v-if="solo && soloPlayer">
          <RubyText v-if="soloPlayer.kind === 'ai'" :text="{ k: 'battle.robot' }" />
          <template v-else>{{ soloPlayer.name }}</template>
        </template>
        <RubyText v-else :text="{ k: `battle.team.${team}` }" />
      </span>
      <span class="score" :aria-label="ui(`battle.team.${team}`)">{{ score }}</span>
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
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
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
.score {
  font-size: var(--fs-xl);
  font-weight: 900;
  line-height: 1;
}
.team.red .score {
  color: var(--c-red);
}
.team.blue .score {
  color: var(--c-blue);
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
</style>
