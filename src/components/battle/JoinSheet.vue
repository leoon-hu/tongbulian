<script setup lang="ts">
// 全局「加入对战」面板（B19）：顶栏的「🔑 加入对战」打开（App 渲染，任何页面都能用——口令是全局的，不挂在某个知识点的对战页上）。
// 输 6 位数字口令 → room.lookup → 服务器回 found（房间号 + 身份）→ 按链接的方式进房；口令不对 / 连不上留在面板里提示。
// 打开时读「输入口令 · 问建房间的人要口令…」，出错时读错误提示（B39a）。
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { lang, ui } from '@/engine/i18n'
import { sayKeys } from '@/engine/voice'
import { FATAL_ERRORS, useRoomStore } from '@/stores/room'
import { AUTOJOIN_KEY, remember, takeIntent } from '@/engine/update'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** 查口令超过这么久没回音：提示连不上（与建房一样） */
const LOOKUP_TIMEOUT_MS = 8000

const emit = defineEmits<{ close: [] }>()
const room = useRoomStore()
const route = useRoute()
const router = useRouter()

const value = ref('')
const busy = ref(false)
/** 面板里要显示的错误词条键 */
const error = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
const input = ref<HTMLInputElement | null>(null)
onMounted(() => {
  input.value?.focus()
  // 上一次输口令时页面更新重载了：接着用那个口令进（B43）
  const pending = takeIntent(AUTOJOIN_KEY)
  if (pending && /^[1-9][0-9]{5}$/.test(pending)) {
    value.value = pending
    submit()
    return
  }
  sayKeys(['room.join.title', 'room.join.hint'], lang.value, 200)
})
watch(error, (e) => {
  if (e) sayKeys([e], lang.value)
})

/** 只留数字、最多 6 位（手机数字键盘也可能输进空格 / 横线） */
function onInput(e: Event): void {
  const el = e.target as HTMLInputElement
  value.value = el.value.replace(/\D/g, '').slice(0, 6)
  el.value = value.value
}
function stop(): void {
  busy.value = false
  if (timer) clearTimeout(timer)
  timer = null
}
function submit(): void {
  if (value.value.length !== 6 || busy.value) return
  error.value = null
  busy.value = true
  // 已经在某个房间里（二维码页 / 连接状态窗口）：先离开那个房间，释放座位
  if (room.snapshot) room.leave()
  room.lookup(value.value)
  timer = setTimeout(() => {
    if (!busy.value) return
    stop()
    room.leave()
    error.value = 'room.connect.slow'
  }, LOOKUP_TIMEOUT_MS)
}
watch(
  () => room.found,
  (f) => {
    if (!busy.value || !f) return
    stop()
    const path = `/battle/${f.code}`
    // 同一个地址（正在这个房间里又输了它的口令）不会重挂载房间页，直接进
    const same = route.path === path
    void router.push({ path, query: { t: f.t } })
    if (same) room.enter(f.code, f.t)
    emit('close')
  },
)
watch(
  () => room.error,
  (e) => {
    if (busy.value && e && FATAL_ERRORS.includes(e)) {
      if (e === 'version' && room.updating) {
        // 本页版本旧了：页面正在自己更新重载（B43），重载后接着用这个口令进
        remember(AUTOJOIN_KEY, value.value)
        if (timer) clearTimeout(timer)
        timer = null
        error.value = 'room.updating'
        return
      }
      stop()
      room.leave()
      error.value = e === 'noRoom' ? 'room.join.wrong' : `room.error.${e}`
    }
  },
)
// 自动更新没成功（同版本已重载过）：按平常的错误处理
watch(
  () => room.updating,
  (u) => {
    if (!u && busy.value && room.error === 'version') {
      stop()
      room.leave()
      error.value = 'room.error.version'
    }
  },
)
onBeforeUnmount(() => {
  // 关掉面板时还在查：断开
  if (busy.value) room.leave()
  stop()
})
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
