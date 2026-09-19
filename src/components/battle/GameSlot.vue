<script setup lang="ts">
// 竞技场盒子里放什么：注册表里有 game（实时绘图）就放宿主 GameHost，没有就放旧的 CSS 皮肤组件。
// 五种皮肤可以逐个迁移，没迁的完全不受影响（B34）。
import { computed, defineAsyncComponent, type Component } from 'vue'
import type { GameState } from '@/battle/game/contract'
import type { SeqEvent } from '@/battle/protocol'
import type { SkinMeta } from '@/battle/skins'
import GameHost from '@/battle/game/host/GameHost.vue'

const props = defineProps<{
  meta: SkinMeta
  state: GameState
  events: readonly SeqEvent[]
  compact?: boolean
}>()

const cssComps = new Map<string, Component>()
const CssComp = computed<Component | null>(() => {
  const m = props.meta
  if (m.game) return null
  let c = cssComps.get(m.id)
  if (!c) {
    c = defineAsyncComponent(m.load)
    cssComps.set(m.id, c)
  }
  return c
})
</script>

<template>
  <GameHost v-if="meta.game" :key="meta.id" :load="meta.game" :state="state" :events="events" :compact="compact" />
  <component :is="CssComp" v-else-if="CssComp" v-bind="state" />
</template>
