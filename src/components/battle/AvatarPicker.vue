<script setup lang="ts">
// 选小动物（需求 B66）：一排 6 个，emoji + 名字（注音），点了就记进偏好；配置面板里用。
// 最前面一个「🎲 随机」（B17）：null = 没选，每次打开页面随机一只、跟对方不一样
import { AVATARS, type AvatarId } from '@/battle/avatars'
import { ui } from '@/engine/i18n'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{ modelValue: AvatarId | null }>()
const emit = defineEmits<{ 'update:modelValue': [id: AvatarId | null] }>()
</script>

<template>
  <div class="avatars" role="radiogroup" :aria-label="ui('battle.avatar')">
    <button
      type="button"
      class="avatar-btn random"
      :class="{ on: modelValue === null }"
      data-avatar="random"
      role="radio"
      :aria-checked="modelValue === null"
      @click="emit('update:modelValue', null)"
    >
      <span class="avatar-emoji" aria-hidden="true">🎲</span>
      <RubyText :text="{ k: 'avatar.random' }" />
    </button>
    <button
      v-for="a in AVATARS"
      :key="a.id"
      type="button"
      class="avatar-btn"
      :class="{ on: modelValue === a.id }"
      :data-avatar="a.id"
      role="radio"
      :aria-checked="modelValue === a.id"
      @click="emit('update:modelValue', a.id)"
    >
      <span class="avatar-emoji" aria-hidden="true">{{ a.emoji }}</span>
      <RubyText :text="{ k: `avatar.${a.id}` }" />
    </button>
  </div>
</template>

<style scoped>
.avatars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}
.avatar-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: var(--tap-min);
  padding: 6px 2px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.avatar-btn:active {
  transform: scale(0.94);
}
.avatar-btn.on {
  border-color: var(--c-primary);
  background: #fff3e6;
}
.avatar-emoji {
  font-size: 30px;
  line-height: 1;
}
@media (max-width: 480px) {
  .avatars {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
