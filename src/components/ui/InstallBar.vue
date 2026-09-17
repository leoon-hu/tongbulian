<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { installStepKeys } from '@/engine/install'
import { ui } from '@/engine/i18n'
import { useInstallStore } from '@/stores/install'

/**
 * 首页顶部的「安装 同步练」提示条（需求 F16）：给家长看的静态一条，不出声、不遮方砖；
 * 「安装」直接弹系统安装框，「怎么做」弹出步骤面板（家长自己点开的，不算弹窗）。
 * 四个站同一套规则与结构：图标 + 粗体标题 + 一句说明 + 主按钮 + ×。
 */
const store = useInstallStore()
const sheet = ref(false)
/** public/ 里的 PWA 图标；base 是 './'，拼 BASE_URL 才能在子路径与 file:// 下都对 */
const iconSrc = `${import.meta.env.BASE_URL}icon-192.png`

// 每次进首页重新取当前时间：静默期到了就重新出现
onMounted(() => store.refresh())

const steps = computed(() => (store.kind && store.kind !== 'prompt' ? installStepKeys(store.kind, { iosSafari: store.isIOSSafari, ipad: store.isIPad }) : []))

function dismiss(): void {
  sheet.value = false
  store.snooze()
}

async function primary(): Promise<void> {
  if (store.kind === 'prompt') await store.install()
  else sheet.value = true
}
</script>

<template>
  <aside v-if="store.kind" class="install" role="note" :aria-label="ui('install.title', { name: ui('brand.title') })">
    <img class="install-icon" :src="iconSrc" alt="" draggable="false" />
    <div class="install-body">
      <strong class="install-title">{{ ui('install.title', { name: ui('brand.title') }) }}</strong>
      <span class="install-desc">{{ ui('install.desc') }}</span>
    </div>
    <button type="button" class="install-btn" @click="primary">{{ ui(store.kind === 'prompt' ? 'install.install' : 'install.how') }}</button>
    <button type="button" class="install-close" :aria-label="ui('install.close')" @click="dismiss">×</button>
  </aside>

  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="sheet" class="sheet-mask" @click.self="dismiss">
        <div class="sheet" role="dialog" aria-modal="true" :aria-label="ui('install.sheetTitle')">
          <h3 class="sheet-title">{{ ui('install.sheetTitle') }}</h3>
          <p class="sheet-desc">{{ ui('install.desc') }}</p>
          <ol class="steps">
            <li v-for="(k, i) in steps" :key="k">
              <span class="step-n">{{ i + 1 }}</span>
              <span class="step-text">
                {{ ui(k) }}
                <svg v-if="k === 'install.step.ios1' || k === 'install.step.ios1ipad'" class="share" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 9H6v12h12V9h-2M12 3v11M8.5 6.5 12 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </li>
          </ol>
          <button type="button" class="sheet-ok" @click="dismiss">{{ ui('install.gotit') }}</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.install {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 840px;
  margin: 8px auto 0;
  padding: 10px 6px 10px 12px;
  background: var(--c-card);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}
.install-icon {
  flex: none;
  width: 44px;
  height: 44px;
  border-radius: 12px;
}
.install-body {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.35;
}
.install-title {
  font-size: var(--fs-sm);
  font-weight: 800;
}
.install-desc {
  font-size: 13px;
  color: var(--c-text-light);
}
/* 家长用的按钮：≥ 44px 就够，不用孩子的 64px */
.install-btn {
  flex: none;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 22px;
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 700;
  transition: transform 0.1s ease;
}
.install-btn:active {
  transform: scale(0.96);
}
.install-close {
  flex: none;
  width: 40px;
  height: 44px;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  color: var(--c-text-light);
  background: none;
}
.install-close:active {
  transform: scale(0.9);
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(61, 44, 30, 0.35);
}
.sheet {
  width: 100%;
  max-width: 520px;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  background: var(--c-card);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  box-shadow: 0 -8px 28px rgba(61, 44, 30, 0.18);
}
.sheet-title {
  margin: 0;
  font-size: var(--fs-lg);
}
.sheet-desc {
  margin: 4px 0 14px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.steps {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.steps li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: var(--fs-md);
  line-height: 1.5;
}
.step-n {
  flex: none;
  width: 26px;
  height: 26px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--c-primary);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 800;
}
.share {
  width: 1.1em;
  height: 1.1em;
  vertical-align: -0.15em;
  color: var(--c-blue);
}
.sheet-ok {
  width: 100%;
  min-height: 52px;
  margin-top: 18px;
  border-radius: var(--radius-md);
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-md);
  font-weight: 800;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.25s ease-out;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(24px);
}
</style>
