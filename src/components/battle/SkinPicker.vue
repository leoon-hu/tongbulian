<script setup lang="ts">
// 选游戏（B36）：🎲 随机 + 注册表里的每种皮肤一张小卡（emoji + 名字，注音）
import { RANDOM_SKIN, SKINS } from '@/battle/skins'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()
const RANDOM = RANDOM_SKIN
</script>

<template>
  <div class="skins" role="radiogroup">
    <button
      type="button"
      class="tile"
      :class="{ on: modelValue === RANDOM }"
      role="radio"
      :aria-checked="modelValue === RANDOM"
      @click="emit('update:modelValue', RANDOM)"
    >
      <span class="icon">🎲</span>
      <RubyText :text="{ k: 'battle.skin.random' }" />
    </button>
    <button
      v-for="s in SKINS"
      :key="s.id"
      type="button"
      class="tile"
      :class="{ on: modelValue === s.id }"
      role="radio"
      :aria-checked="modelValue === s.id"
      @click="emit('update:modelValue', s.id)"
    >
      <span class="icon">{{ s.icon }}</span>
      <RubyText :text="{ k: `skin.${s.id}` }" />
    </button>
  </div>
</template>

<style scoped>
.skins {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 84px;
  padding: 8px 4px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.tile:active {
  transform: scale(0.94);
}
.tile.on {
  border-color: var(--c-primary);
  background: #fff3e6;
}
.icon {
  font-size: 32px;
  line-height: 1;
}
</style>
