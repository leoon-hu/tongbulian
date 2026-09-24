<script setup lang="ts">
// 改名字面板（B17）：「⚙️ 配置」里点名字才出现——一个输入框 + 「🎲 随机」+ 5 个现成名字（不识字也能点，两排三个），最多 8 个字；
// 打开时读「你叫什么？」（B39a）。「🎲 随机」= 清掉自定义的名字，存成空串，开局时用随机点选的（current 是现在随机到的，写在输入框里当提示）
import { computed, onMounted, ref, watch } from 'vue'
import { createRng } from '@/engine'
import { lang, ui } from '@/engine/i18n'
import { sayKeys } from '@/engine/voice'
import { NAME_MAX, cleanName, suggestNames } from '@/battle/names'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

const props = withDefaults(defineProps<{ initial?: string; taken?: string[]; current?: string }>(), { initial: '', taken: () => [], current: '' })
const emit = defineEmits<{ save: [name: string]; close: [] }>()

const value = ref(props.initial)
/** 选的是「🎲 随机」：没自定义过的打开就是它，输入了名字就不是了 */
const random = ref(!props.initial)
watch(value, (v) => {
  if (v) random.value = false
})
function pickRandom(): void {
  value.value = ''
  random.value = true
}
const suggestions = suggestNames(lang.value, createRng(), 5, props.taken)
const cleaned = computed(() => cleanName(value.value))
const canSave = computed(() => !!cleaned.value || random.value)
const input = ref<HTMLInputElement | null>(null)
onMounted(() => {
  input.value?.focus()
  sayKeys(['battle.name.ask'], lang.value, 200)
})

function save(): void {
  if (canSave.value) emit('save', cleaned.value)
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
        :placeholder="random && current ? current : ui('battle.name.hint')"
        autocomplete="off"
        enterkeyhint="done"
      />
      <div class="suggest">
        <button type="button" class="chip random" :class="{ on: random }" @click="pickRandom">🎲 <RubyText :text="{ k: 'avatar.random' }" /></button>
        <button v-for="n in suggestions" :key="n" type="button" class="chip" @click="value = n">{{ n }}</button>
      </div>
      <BigButton color="green" :disabled="!canSave"><RubyText :text="{ k: 'battle.name.ok' }" /></BigButton>
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
.chip.on {
  box-shadow: inset 0 0 0 3px var(--c-primary);
  background: #fff3e6;
}
</style>
