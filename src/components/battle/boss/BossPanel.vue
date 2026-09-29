<script setup lang="ts">
// 打怪兽的一个作答区（M6）：队色描边 + 头部「小动物 + 名字 + 得分（加分时飘 +n）+ 连击 🔥×n」+ 作答行（复用对战的 PlayerRow：
// 题干、数字键盘 / 选项卡、题干按栏缩放、紧凑版键盘缩放；机器人那一行是作答显示）。没有 8 颗进度点。
import { computed, ref, watch } from 'vue'
import type { Team } from '@/battle/protocol'
import { avatarEmoji } from '@/battle/avatars'
import { ui } from '@/engine/i18n'
import RubyText from '@/components/ui/RubyText.vue'
import PlayerRow from '../PlayerRow.vue'
import type { RowData } from '../rows'

const props = defineProps<{
  team: Team
  rows: RowData[]
  score: number
  /** 这一边现在的连击（队里连得最多的那个人） */
  streak: number
  operable: string[]
  autoRead: boolean
  compact?: boolean
  /** 得分最高（本局之星，结束后才标） */
  star?: boolean
}>()
const emit = defineEmits<{ answer: [playerId: string, given: unknown]; input: [playerId: string, value: string] }>()

const solo = computed(() => props.rows.length === 1)
const soloPlayer = computed(() => props.rows[0]?.player)
/** 刚加了几分：飘一个 +n，0.9 秒后收起 */
const plus = ref<{ id: number; n: number } | null>(null)
let plusSeq = 0
let plusTimer: ReturnType<typeof setTimeout> | null = null
watch(
  () => props.score,
  (now, before) => {
    if (now <= before) return
    const id = ++plusSeq
    plus.value = { id, n: now - before }
    if (plusTimer) clearTimeout(plusTimer)
    plusTimer = setTimeout(() => {
      if (plus.value?.id === id) plus.value = null
    }, 900)
  },
)
</script>

<template>
  <!-- compact：作答行题干与键盘左右并排（PlayerRow 的紧凑样式要祖先上有 compact 类名；只加在这一栏上，
       不像对战的紧凑版那样整页缩字号与按键，iPad 上按键照旧是大的） -->
  <section class="side" :class="[team, { compact }]">
    <header class="side-head">
      <span class="who">
        <template v-if="solo && soloPlayer">
          <RubyText v-if="soloPlayer.kind === 'ai'" :text="{ k: 'battle.robot' }" />
          <template v-else><span v-if="soloPlayer.avatar" class="avatar" aria-hidden="true">{{ avatarEmoji(soloPlayer.avatar) }}</span>{{ soloPlayer.name }}</template>
        </template>
        <RubyText v-else :text="{ k: `battle.team.${team}` }" />
        <span v-if="star" class="star" :title="ui('boss.star')">👑</span>
      </span>
      <span v-if="streak >= 2" :key="streak" class="streak" :title="ui('battle.streakBadge')">🔥 ×{{ streak }}</span>
      <span class="score-wrap">
        <span v-if="plus" :key="plus.id" class="plus" aria-hidden="true">+{{ plus.n }}</span>
        <span :key="score" class="score">{{ ui('boss.points', { n: score }) }}</span>
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
/* 队色变量同对战的队区（TeamPanel），成员行与按钮（PlayerRow 的 :deep 样式）用它们 */
.side {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.6);
  border: 3px solid var(--team);
  overflow: hidden;
}
.side.red {
  --team: var(--c-red);
  --team-dark: #d94c4c;
  --team-soft: #fff1ef;
  --team-line: #ffb8b8;
}
.side.blue {
  --team: var(--c-blue);
  --team-dark: #2f7fd6;
  --team-soft: #edf5ff;
  --team-line: #b3d6ff;
}
.side-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--team-dark);
  color: #fff;
  font-weight: 900;
}
.who {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--fs-md);
}
.avatar {
  margin-right: 2px;
}
.star {
  animation: pop 0.4s ease-out;
}
.streak {
  flex: none;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: var(--fs-sm);
  animation: pop 0.3s ease-out;
}
.score-wrap {
  position: relative;
  flex: none;
}
.score {
  display: inline-block;
  font-size: var(--fs-lg);
  font-variant-numeric: tabular-nums;
  animation: pop 0.3s ease-out;
}
/* 飘的 +n 放在分数左边往上飘：原来贴在分数上面，刚开始那几帧压在数字上，「+2」和「6 分」连成了「+26 分」 */
.plus {
  position: absolute;
  right: calc(100% + 6px);
  bottom: 0;
  font-size: var(--fs-md);
  color: #ffe066;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
  animation: float-up 0.9s ease-out forwards;
  pointer-events: none;
}
@keyframes pop {
  from {
    transform: scale(1.35);
  }
}
@keyframes float-up {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-18px);
  }
}
.rows {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.rows > :deep(*) {
  flex: 1;
  min-height: 0;
}
@media (prefers-reduced-motion: reduce) {
  .star,
  .streak,
  .score,
  .plus {
    animation: none;
  }
}
</style>
