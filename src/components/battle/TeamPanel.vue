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
  /** 本机操作的行在这个队：队名条标「我」 */
  mine?: boolean
  /** 本机是参赛的（有可操作的行）：不能操作的行盖遮罩，自己队的写「队友」、对方队的写「对方」 */
  masks?: boolean
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
      <span v-if="mine" class="me-tag"><RubyText :text="{ k: 'battle.me' }" /></span>
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
        :masked="masks && !operable.includes(row.player.id) ? (mine ? 'mate' : 'theirs') : null"
        :voice="row.voice ?? null"
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
.me-tag {
  flex: none;
  padding: 1px 10px;
  border-radius: 999px;
  background: #fff;
  color: var(--team-dark);
  font-size: var(--fs-sm);
  font-weight: 900;
}
/* 队区（B32：一眼分清红队 / 蓝队）：队色描边、实心队名条白字、淡队色底；队色变量给下面的成员行与按钮用 */
.team {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.6);
  border: 3px solid var(--team);
  overflow: hidden;
}
.team.red {
  --team: var(--c-red);
  --team-dark: #d94c4c;
  --team-soft: #fff1ef;
  --team-line: #ffb8b8;
}
.team.blue {
  --team: var(--c-blue);
  --team-dark: #2f7fd6;
  --team-soft: #edf5ff;
  --team-line: #b3d6ff;
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
  color: #fff;
  background: var(--team-dark);
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
  background: rgba(255, 255, 255, 0.35);
  transition: transform 0.25s ease, background 0.25s ease;
}
.progress i.on {
  background: #fff;
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
.score {
  color: #fff;
}
.plus {
  position: absolute;
  right: 0;
  top: -0.2em;
  font-size: var(--fs-md);
  font-weight: 900;
  color: #ffe27a;
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
