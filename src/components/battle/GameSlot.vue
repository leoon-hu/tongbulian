<script setup lang="ts">
// 竞技场盒子里放什么：注册表里的游戏（实时绘图，B34）交给宿主 GameHost 跑；换皮肤 = 换 key 重建宿主。
import type { GameState } from '@/battle/game/contract'
import type { SeqEvent } from '@/battle/protocol'
import type { SkinMeta } from '@/battle/skins'
import GameHost from '@/battle/game/host/GameHost.vue'

defineProps<{
  meta: SkinMeta
  state: GameState
  events: readonly SeqEvent[]
  compact?: boolean
}>()
</script>

<template>
  <GameHost :key="meta.id" :load="meta.game" :state="state" :events="events" :compact="compact" />
</template>
