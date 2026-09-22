<script setup lang="ts">
// 表情 / 加油的一排键（需求 B58）：固定 4 个 emoji，没有文字；放在竞技场顶栏里，红队的在左、蓝队的在右、观战的在时钟旁。
// 点一下只发一个事件，飞出去的动画由 EmoteLayer 画、节流由 store 管（同一排 0.7 秒一个）。
import { EMOTES, type EmoteId } from '@/battle/emotes'
import type { Role } from '@/battle/protocol'
import { ui } from '@/engine/i18n'

defineProps<{ side: Role }>()
const emit = defineEmits<{ send: [id: EmoteId] }>()
</script>

<template>
  <span class="emotes" :class="`side-${side}`" role="group" :aria-label="ui('emote.group')">
    <button v-for="e in EMOTES" :key="e.id" type="button" class="emote-btn" :data-emote="e.id" :aria-label="ui(`emote.${e.id}`)" @click="emit('send', e.id)">
      {{ e.emoji }}
    </button>
  </span>
</template>

<style scoped>
.emotes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}
.emotes.side-red {
  box-shadow: inset 0 0 0 2px rgba(255, 107, 107, 0.45);
}
.emotes.side-blue {
  box-shadow: inset 0 0 0 2px rgba(74, 163, 255, 0.45);
}
.emotes.side-watch {
  box-shadow: inset 0 0 0 2px rgba(61, 44, 30, 0.2);
}
.emote-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: 22px;
  line-height: 1;
  transition: transform 0.08s ease;
}
.emote-btn:active {
  transform: scale(0.85);
}
</style>
