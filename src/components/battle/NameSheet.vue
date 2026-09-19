<script setup lang="ts">
// 昵称面板（B17）：一个输入框 + 6 个现成名字（不识字也能点），最多 8 个字
import { computed, onMounted, ref } from 'vue'
import { createRng } from '@/engine'
import { lang, ui } from '@/engine/i18n'
import { NAME_MAX, cleanName, suggestNames } from '@/battle/names'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

const props = withDefaults(defineProps<{ initial?: string; taken?: string[] }>(), { initial: '', taken: () => [] })
const emit = defineEmits<{ save: [name: string]; close: [] }>()

const value = ref(props.initial)
const suggestions = suggestNames(lang.value, createRng(), 6, props.taken)
const cleaned = computed(() => cleanName(value.value))
const input = ref<HTMLInputElement | null>(null)
onMounted(() => input.value?.focus())

function save(): void {
  if (cleaned.value) emit('save', cleaned.value)
}
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <form class="sheet" @submit.prevent="save">
      <h2 class="ask"><RubyText :text="{ k: 'battle.name.ask' }" /></h2>
      <input
        ref="input"
        v-model="value"
        class="input"
        type="text"
        :maxlength="NAME_MAX * 2"
        :placeholder="ui('battle.name.hint')"
        autocomplete="off"
        enterkeyhint="done"
      />
      <div class="suggest">
        <button v-for="n in suggestions" :key="n" type="button" class="chip" @click="value = n">{{ n }}</button>
      </div>
      <BigButton color="green" :disabled="!cleaned"><RubyText :text="{ k: 'battle.name.ok' }" /></BigButton>
    </form>
  </div>
</template>

<style scoped>
.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 44, 30, 0.35);
  padding: 16px;
}
.sheet {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(480px, 100%);
  max-height: 100%;
  overflow: auto;
  padding: 20px 20px 24px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.ask {
  font-size: var(--fs-lg);
}
.input {
  width: 100%;
  height: var(--tap-min);
  padding: 0 16px;
  border-radius: var(--radius-md);
  border: 3px solid var(--c-line);
  font: inherit;
  font-size: var(--fs-lg);
  font-weight: 700;
  text-align: center;
  color: var(--c-text);
  background: var(--c-bg);
}
.input:focus {
  outline: none;
  border-color: var(--c-primary);
}
.suggest {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}
.chip {
  min-height: 52px;
  padding: 6px 8px;
  border-radius: 999px;
  background: var(--c-bg);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.chip:active {
  transform: scale(0.94);
}
</style>
