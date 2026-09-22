<script setup lang="ts">
// 竞技场盒子里放什么：注册表里的游戏（实时绘图，B34）交给宿主 GameHost 跑；换皮肤 = 换 key 重建宿主。
// 点按（B59）：按皮肤的位置 / 类别猜点的是哪一队的东西——横条的并行 / 收集类上半红下半蓝，拉锯类与竖条左红右蓝
import type { GameState } from '@/battle/game/contract'
import type { SeqEvent, Team } from '@/battle/protocol'
import type { SkinMeta } from '@/battle/skins'
import GameHost from '@/battle/game/host/GameHost.vue'

const props = defineProps<{
  meta: SkinMeta
  state: GameState
  events: readonly SeqEvent[]
  compact?: boolean
}>()
const emit = defineEmits<{ poke: [team: Team, x: number, y: number] }>()

function sideOf(x: number, y: number, w: number, h: number): Team {
  const byX = props.meta.slot === 'center' || props.meta.kind === 'tug'
  return byX ? (x < w / 2 ? 'red' : 'blue') : y < h / 2 ? 'red' : 'blue'
}
</script>

<template>
  <GameHost :key="meta.id" :load="meta.game" :state="state" :events="events" :compact="compact" :side-of="sideOf" @poke="(t, x, y) => emit('poke', t, x, y)" />
</template>
