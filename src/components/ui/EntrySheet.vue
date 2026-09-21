<script setup lang="ts">
// 点了知识点后弹出的「自己练，还是对战？」（需求 B26）：知识点图标 + 标题、一句问话（带拼音、打开时朗读 B39a）、
// 「📖 自己练」→ 练习页、「⚔️ 对战模式」→ 对战设置页；✕ 或点空白处关掉留在地图。
// 不 Teleport：和 NameSheet 一样直接画在视图里，集成测试在 App 里就能找到。
import { onMounted } from 'vue'
import type { KnowledgePoint } from '@/types/models'
import { kpTitleKey, lang, ui } from '@/engine/i18n'
import { hush, sayKeys } from '@/engine/voice'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{ kp: KnowledgePoint }>()
const emit = defineEmits<{ practice: []; battle: []; close: [] }>()

onMounted(() => sayKeys(['entry.ask'], lang.value, 200))

function close(): void {
  hush()
  emit('close')
}
</script>

<template>
  <div class="sheet-mask" @click.self="close">
    <div class="entry-sheet" role="dialog" aria-modal="true" :aria-label="ui('entry.ask')">
      <button type="button" class="close" aria-label="close" @click="close">✕</button>
      <div class="kp">
        <span class="kp-icon">{{ kp.icon }}</span>
        <h2 class="kp-title"><RubyText :text="{ k: kpTitleKey(kp) }" /></h2>
      </div>
      <p class="ask"><RubyText :text="{ k: 'entry.ask' }" /></p>
      <button type="button" class="entry-btn practice" @click="emit('practice')">
        <span class="btn-icon">📖</span>
        <span class="btn-text">
          <span class="btn-label"><RubyText :text="{ k: 'entry.practice' }" /></span>
          <span class="btn-desc">{{ ui('entry.practice.desc') }}</span>
        </span>
      </button>
      <button type="button" class="entry-btn battle" @click="emit('battle')">
        <span class="btn-icon">⚔️</span>
        <span class="btn-text">
          <span class="btn-label"><RubyText :text="{ k: 'entry.battle' }" /></span>
          <span class="btn-desc">{{ ui('entry.battle.desc') }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(61, 44, 30, 0.35);
}
.entry-sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(440px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 22px 20px 20px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.close {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--c-bg);
  color: var(--c-text-light);
  font-size: 20px;
  font-weight: 700;
}
.kp {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 44px;
}
.kp-icon {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--grad-node);
  font-size: 28px;
}
.kp-title {
  font-size: var(--fs-md);
  font-weight: 800;
  text-wrap: balance;
}
.ask {
  margin-top: 4px;
  font-size: var(--fs-lg);
  font-weight: 800;
}
/* 两个大按钮：≥ 64px 高（U1），图标 + 名字 + 一句小字说明；两张长得一样，对战那张只是名字用主色（用户定：不要描边） */
.entry-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 76px;
  padding: 12px 18px;
  border: 3px solid var(--c-line);
  border-radius: var(--radius-md);
  background: var(--c-bg);
  color: var(--c-text);
  text-align: left;
  transition: transform 0.08s ease;
}
.entry-btn:active {
  transform: scale(0.97);
}
.btn-icon {
  flex: none;
  font-size: 32px;
}
.btn-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.btn-label {
  font-size: var(--fs-lg);
  font-weight: 800;
}
.battle .btn-label {
  color: var(--c-primary-dark);
}
.btn-desc {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
</style>
