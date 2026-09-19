<script setup lang="ts">
// 输房间号加入（B20）：6 位、自动大写、只认房间号的字符；对了就进房间页（在那里问名字、自动分队）
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ui } from '@/engine/i18n'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

const props = withDefaults(defineProps<{ autofocus?: boolean }>(), { autofocus: false })
const router = useRouter()
const code = ref('')
const input = ref<HTMLInputElement | null>(null)
const clean = computed(() => code.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, '').slice(0, 6))
const ok = computed(() => clean.value.length === 6)
onMounted(() => {
  if (props.autofocus) input.value?.focus()
})
function onInput(): void {
  code.value = clean.value
}
function join(): void {
  if (ok.value) router.push(`/battle/${clean.value}`)
}
</script>

<template>
  <form class="join" @submit.prevent="join">
    <label class="join-label" for="join-code"><RubyText :text="{ k: 'room.join' }" /></label>
    <div class="join-row">
      <input
        id="join-code"
        ref="input"
        v-model="code"
        class="join-input"
        type="text"
        inputmode="text"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        maxlength="6"
        :placeholder="ui('room.join.hint')"
        @input="onInput"
      />
      <BigButton color="blue" :disabled="!ok" @click="join"><RubyText :text="{ k: 'room.join.go' }" /></BigButton>
    </div>
    <p class="join-where"><RubyText :text="{ k: 'room.join.where' }" /></p>
  </form>
</template>

<style scoped>
.join {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.join-label {
  font-weight: 800;
  color: var(--c-text-light);
}
.join-row {
  display: flex;
  gap: 10px;
}
.join-input {
  width: 168px;
  min-height: var(--tap-min);
  padding: 0 14px;
  border-radius: var(--radius-md);
  border: 3px solid var(--c-line);
  background: var(--c-card);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: var(--fs-xl);
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  color: var(--c-text);
}
.join-input:focus {
  outline: none;
  border-color: var(--c-primary);
}
.join-where {
  margin: 0;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
</style>
