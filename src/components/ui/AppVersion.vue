<script setup lang="ts">
// 首页页脚最上面的「版本与更新」卡片（需求 F1，child-education 三个静态站统一）：应用图标 + 当前版本 + 「检查更新」。
// 有新版本就让 Service Worker 取新的、装好接管后自动重新载入；重新载入后卡片滚到眼前，说「已更新」或「更新没有完成」。
// 检查过、慢、失败时给「重新安装」（先确认连得上服务器，再清掉缓存重新下载）。最下面一行是离线朗读包下到哪了（N8 ⑦）。
// 给家长看的：跟随界面语言，不注音、不朗读。逻辑在 engine/version.ts。
import { computed, onMounted, ref } from 'vue'
import { lang, ui } from '@/engine/i18n'
import { APP_VERSION, applyUpdate, checkVersion, noteUpdate, reinstall, takeUpdateNote } from '@/engine/version'
import { useOfflineStore } from '@/stores/offline'

type State =
  | 'idle'
  | 'checking'
  | 'latest'
  | 'found'
  | 'slow'
  | 'offline'
  | 'failed'
  | 'installFailed'
  | 'updated'
  | 'reinstalled'
  | 'incomplete'
  | 'reinstalling'

const iconSrc = `${import.meta.env.BASE_URL}icon-192.png`
const state = ref<State>('idle')
const found = ref('')
const root = ref<HTMLElement | null>(null)

const busy = computed(() => state.value === 'checking' || state.value === 'found' || state.value === 'slow' || state.value === 'reinstalling')
const canReinstall = computed(() => ['latest', 'failed', 'installFailed', 'incomplete', 'slow'].includes(state.value))
const buttonText = computed(() => {
  if (state.value === 'checking') return ui('version.checking')
  return busy.value ? ui('version.updating') : ui('version.check')
})
const message = computed(() => (state.value === 'idle' || state.value === 'checking' ? '' : ui(`version.${state.value}`, { version: found.value })))
const tone = computed(() => {
  if (['latest', 'updated', 'reinstalled'].includes(state.value)) return 'ok'
  if (['offline', 'failed', 'installFailed', 'incomplete'].includes(state.value)) return 'warn'
  return 'info'
})

async function check(): Promise<void> {
  if (busy.value) return
  state.value = 'checking'
  const r = await checkVersion(APP_VERSION)
  if (r.kind !== 'newer') {
    state.value = r.kind
    return
  }
  found.value = r.version
  state.value = 'found'
  noteUpdate('update', r.version)
  state.value = (await applyUpdate()) === 'slow' ? 'slow' : 'installFailed'
}

/** 重新安装前先确认连得上服务器：没网时清掉离线包，重新载入就打不开了 */
async function redo(): Promise<void> {
  if (busy.value) return
  state.value = 'reinstalling'
  const r = await checkVersion(APP_VERSION)
  if (r.kind === 'offline' || r.kind === 'failed') {
    state.value = r.kind
    return
  }
  noteUpdate('reinstall', r.kind === 'newer' ? r.version : APP_VERSION)
  await reinstall()
}

// 刚为更新 / 重新安装重新载入过：说结果，并把卡片滚到眼前（家长点完「检查更新」页面刷新回到顶上了）。
// 等页面载入完再过一小会儿才滚：浏览器重新载入后会恢复原来的滚动位置（在 load 前后），得在它之后
onMounted(() => {
  const outcome = takeUpdateNote(APP_VERSION)
  if (!outcome) return
  state.value = outcome
  const show = (): void => void setTimeout(() => root.value?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
  if (document.readyState === 'complete') show()
  else window.addEventListener('load', show, { once: true })
})

const offline = useOfflineStore()
const offlineLine = computed(() => {
  const r = offline.last
  const name = lang.value === 'zh' ? '中文' : 'English'
  if (!r) return ui('version.offlineWait')
  if (r.cached >= r.total && r.total > 0) return ui('version.offlineDone', { lang: name })
  return ui('version.offlinePack', { lang: name, cached: r.cached, total: r.total })
})
</script>

<template>
  <section ref="root" class="ver" :aria-label="ui('version.label')">
    <div class="ver-main">
      <img class="ver-icon" :src="iconSrc" alt="" draggable="false" />
      <p class="ver-text">
        <span class="ver-label">{{ ui('version.label') }}</span>
        <span class="ver-num">{{ APP_VERSION }}</span>
      </p>
      <button type="button" class="ver-btn" :disabled="busy" @click="check">
        <span v-if="busy" class="ver-spin" aria-hidden="true" />{{ buttonText }}
      </button>
    </div>
    <p class="ver-status" :class="tone" role="status">{{ message }}</p>
    <p v-if="canReinstall" class="ver-more">{{ ui('version.stale') }}<button type="button" class="ver-redo" @click="redo">{{ ui('version.reinstall') }}</button>{{ ui('version.reinstallHint') }}</p>
    <p class="ver-offline">{{ offlineLine }}</p>
  </section>
</template>

<style scoped>
.ver {
  width: min(100%, 440px);
  margin: 0 auto;
  padding: 12px 14px;
  border: 1.5px solid var(--c-line);
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  text-align: left;
  color: var(--c-text);
}
.ver-main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ver-icon {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
}
.ver-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  margin: 0;
  line-height: 1.3;
}
.ver-label {
  font-size: 13px;
  color: var(--c-text-light);
}
.ver-num {
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.ver-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}
.ver-btn:active:not(:disabled) {
  transform: scale(0.96);
}
.ver-btn:disabled {
  opacity: 0.75;
}
.ver-spin {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ver-spin 0.8s linear infinite;
}
@keyframes ver-spin {
  to {
    transform: rotate(360deg);
  }
}
.ver-status {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}
.ver-status:empty {
  display: none;
}
.ver-status.ok {
  color: #1f8a55;
}
.ver-status.warn {
  color: #b4441c;
}
.ver-status.info {
  color: var(--c-text-light);
}
.ver-more {
  margin: 2px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--c-text-light);
}
.ver-redo {
  padding: 6px 2px;
  background: none;
  color: var(--c-text);
  font-size: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.ver-offline {
  margin: 10px 0 0;
  padding-top: 8px;
  border-top: 1px dashed var(--c-line);
  font-size: 13px;
  line-height: 1.5;
  color: var(--c-text-light);
}
</style>
