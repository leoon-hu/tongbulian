<script setup lang="ts">
// 对战配置面板（B27 ③）：机器人快慢、选游戏、名字与小动物——设置页默认不展示这些，页头「⚙️ 配置」才打开。
// 快慢、名字、小动物改了立刻记进偏好；游戏是这一次的（默认按章节排到的那个，由设置页持有），不记偏好。
// 名字那一格显示现在用的名字与小动物（没自定义的是随机点选的，带 🎲，B17）
import { computed } from 'vue'
import { AI_LEVELS, type AiLevel } from '@/battle/ai'
import { avatarEmoji } from '@/battle/avatars'
import { ui } from '@/engine/i18n'
import { useBattleStore } from '@/stores/battle'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'
import SkinPicker from './SkinPicker.vue'
import AvatarPicker from './AvatarPicker.vue'

defineProps<{ skin: string }>()
const emit = defineEmits<{ close: []; rename: [which: 'me' | 'right']; 'update:skin': [id: string] }>()
const store = useBattleStore()
const AI_ICONS: Record<AiLevel, string> = { auto: '🐾', slow: '🐢', mid: '🐰', fast: '🚀' }
const ids = computed(() => store.identities())
</script>

<template>
  <div class="config-mask" @click.self="emit('close')">
    <div class="config" role="dialog" :aria-label="ui('battle.config')">
      <h2 class="title"><RubyText :text="{ k: 'battle.config' }" /></h2>

      <section class="part">
        <h3 class="label"><RubyText :text="{ k: 'battle.ai.speed' }" /></h3>
        <div class="levels" role="radiogroup">
          <button
            v-for="lv in AI_LEVELS"
            :key="lv"
            type="button"
            class="level"
            :class="{ on: store.prefs.aiLevel === lv }"
            role="radio"
            :aria-checked="store.prefs.aiLevel === lv"
            @click="store.prefs.aiLevel = lv"
          >
            <span class="level-icon">{{ AI_ICONS[lv] }}</span>
            <RubyText :text="{ k: `battle.ai.${lv}` }" />
          </button>
        </div>
      </section>

      <section class="part">
        <h3 class="label"><RubyText :text="{ k: 'battle.pickSkin' }" /></h3>
        <p class="hint"><RubyText :text="{ k: 'battle.skin.once' }" /></p>
        <SkinPicker :model-value="skin" @update:model-value="(id) => emit('update:skin', id)" />
      </section>

      <section class="part">
        <h3 class="label"><RubyText :text="{ k: 'battle.names' }" /></h3>
        <div class="names">
          <button type="button" class="name-chip red" @click="emit('rename', 'me')">
            <span class="who"><RubyText :text="{ k: 'battle.name.me' }" /></span>
            <span class="nm">{{ avatarEmoji(ids.me.avatar) }}{{ ids.me.name }}</span>
            <span v-if="!store.prefs.names.me" class="dice" :title="ui('avatar.random')">🎲</span>
            <span class="edit" :aria-label="ui('battle.name.edit')">✏️</span>
          </button>
          <button type="button" class="name-chip blue" @click="emit('rename', 'right')">
            <span class="who"><RubyText :text="{ k: 'battle.mode.duo' }" /> · <RubyText :text="{ k: 'battle.name.right' }" /></span>
            <span class="nm">{{ avatarEmoji(ids.right.avatar) }}{{ ids.right.name }}</span>
            <span v-if="!store.prefs.names.right" class="dice" :title="ui('avatar.random')">🎲</span>
            <span class="edit" :aria-label="ui('battle.name.edit')">✏️</span>
          </button>
        </div>
      </section>

      <section class="part">
        <h3 class="label"><RubyText :text="{ k: 'battle.music' }" /></h3>
        <button type="button" class="music-toggle" :class="{ on: store.prefs.music }" :aria-pressed="store.prefs.music" @click="store.prefs.music = !store.prefs.music">
          🎵 <RubyText :text="{ k: store.prefs.music ? 'battle.music.on' : 'battle.music.off' }" />
        </button>
      </section>

      <section class="part">
        <h3 class="label"><RubyText :text="{ k: 'battle.avatar' }" /></h3>
        <AvatarPicker :model-value="store.prefs.avatars.me" @update:model-value="(id) => store.setAvatar('me', id)" />
        <p class="hint sub"><RubyText :text="{ k: 'battle.mode.duo' }" /> · <RubyText :text="{ k: 'battle.name.right' }" /></p>
        <AvatarPicker :model-value="store.prefs.avatars.right" @update:model-value="(id) => store.setAvatar('right', id)" />
      </section>

      <div class="actions">
        <BigButton color="primary" class="done" @click="emit('close')"><RubyText :text="{ k: 'battle.name.ok' }" /></BigButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.35);
}
@media (min-width: 640px) {
  .config-mask {
    align-items: center;
  }
}
.config {
  width: min(100%, 760px);
  max-height: 92vh;
  overflow: auto;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  background: var(--c-bg);
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.15);
}
@media (min-width: 640px) {
  .config {
    border-radius: var(--radius-lg);
  }
}
.title {
  margin: 0 0 6px;
  font-size: var(--fs-xl);
}
.part {
  padding: 8px 0;
}
.label {
  margin: 0 0 8px;
  font-size: var(--fs-md);
  color: var(--c-primary-dark);
}
.hint {
  margin: 0 0 8px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.hint.sub {
  margin: 10px 0 6px;
}
.levels {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.level {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: var(--tap-min);
  padding: 10px 8px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.level:active {
  transform: scale(0.96);
}
.level.on {
  border-color: var(--c-primary);
  background: #fff3e6;
}
.level-icon {
  font-size: 30px;
  line-height: 1;
}
.names {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
/* 背景音乐开关（B68） */
.music-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--tap-min);
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text-light);
}
.music-toggle.on {
  border-color: var(--c-primary);
  background: #fff3e6;
  color: var(--c-text);
}
.name-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--tap-min);
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text);
  border: 3px solid transparent;
}
.name-chip.red {
  border-color: rgba(255, 107, 107, 0.45);
}
.name-chip.blue {
  border-color: rgba(74, 163, 255, 0.45);
}
.who {
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.nm {
  font-size: var(--fs-lg);
}
.edit,
.dice {
  font-size: var(--fs-sm);
}
.actions {
  display: flex;
  justify-content: center;
  padding-top: 12px;
}
.done {
  min-width: 180px;
}
</style>
