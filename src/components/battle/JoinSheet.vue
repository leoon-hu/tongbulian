<script setup lang="ts">
// 「加入对战」面板（B19 / B27）：输 6 位数字口令，以口令对应的身份进房；口令由建房的设备显示在各自的二维码下面（红队 / 蓝队 / 观战各一个）
import { onMounted, ref } from 'vue'
import { ui } from '@/engine/i18n'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** busy = 正在查口令；error = 要显示的词条键（口令不对 / 连不上） */
const props = defineProps<{ busy?: boolean; error?: string | null }>()
const emit = defineEmits<{ join: [pass: string]; close: [] }>()

const value = ref('')
const input = ref<HTMLInputElement | null>(null)
onMounted(() => input.value?.focus())

/** 只留数字、最多 6 位（手机数字键盘也可能输进空格 / 横线） */
function onInput(e: Event): void {
  const el = e.target as HTMLInputElement
  value.value = el.value.replace(/\D/g, '').slice(0, 6)
  el.value = value.value
}
function submit(): void {
  if (value.value.length === 6 && !props.busy) emit('join', value.value)
}
</script>

<template>
  <div class="sheet-mask" @click.self="emit('close')">
    <form class="join-sheet" @submit.prevent="submit">
      <button type="button" class="close" :aria-label="ui('room.join.close')" @click="emit('close')">✕</button>
      <h2 class="ask"><RubyText :text="{ k: 'room.join.title' }" /></h2>
      <p class="hint"><RubyText :text="{ k: 'room.join.hint' }" /></p>
      <input
        ref="input"
        class="input"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength="6"
        autocomplete="one-time-code"
        enterkeyhint="go"
        :placeholder="ui('room.join.placeholder')"
        :value="value"
        @input="onInput"
      />
      <p v-if="error" class="error" role="alert"><RubyText :text="{ k: error }" /></p>
      <BigButton color="green" :disabled="value.length !== 6 || busy"><RubyText :text="{ k: busy ? 'room.connecting' : 'room.join.go' }" /></BigButton>
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
.join-sheet {
  position: relative;
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
.close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--c-bg);
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text-light);
}
.ask {
  font-size: var(--fs-lg);
}
.hint {
  margin: 0;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.input {
  width: 100%;
  height: var(--tap-min);
  padding: 0 16px;
  border-radius: var(--radius-md);
  border: 3px solid var(--c-line);
  font: inherit;
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.3em;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
  background: var(--c-bg);
}
.input::placeholder {
  letter-spacing: normal;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-light);
  opacity: 0.7;
}
.input:focus {
  outline: none;
  border-color: var(--c-primary);
}
.error {
  margin: 0;
  text-align: center;
  font-weight: 700;
  color: var(--c-primary-dark);
}
</style>
