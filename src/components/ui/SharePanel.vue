<script setup lang="ts">
import { ui } from '@/engine/i18n'
import { useShareStore } from '@/stores/share'

/**
 * 「分享给朋友」面板（需求 F1「开源与分享」）：底部弹出的一张卡，家长自己点开的、不出声。
 * 微信 / QQ 里：教用右上角「···」；没有系统分享面板时：一段话 + 链接，已复制就说已复制，也能手动选中。
 * 只在 stores/share 的 panel 有值时挂（App.vue），系统分享面板能用的环境不会走到这里。
 */
const store = useShareStore()
</script>

<template>
  <Teleport to="body">
    <div v-if="store.panel" class="sheet-mask" @click.self="store.close()">
      <div class="sheet" role="dialog" aria-modal="true" :aria-label="ui('share.title')">
        <h3 class="sheet-title">{{ ui('share.title') }}</h3>
        <p class="sheet-desc">{{ ui(store.panel.way === 'wechat' ? 'share.wechatHint' : store.panel.copied ? 'share.copiedHint' : 'share.copyHint') }}</p>
        <pre class="message">{{ store.panel.message }}</pre>
        <button v-if="store.panel.way === 'copy'" type="button" class="sheet-ok" @click="store.copy()">
          {{ ui(store.panel.copied ? 'share.copied' : 'share.copy') }}
        </button>
        <button type="button" class="sheet-ok" :class="{ ghost: store.panel.way === 'copy' }" @click="store.close()">{{ ui('share.gotit') }}</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
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
  margin: 4px 0 12px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
/* 分享的那段话：可以选中复制（整站默认禁选） */
.message {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
  font: inherit;
  font-size: var(--fs-sm);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  -webkit-user-select: text;
  user-select: text;
}
.sheet-ok {
  width: 100%;
  min-height: 52px;
  margin-top: 12px;
  border-radius: var(--radius-md);
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-md);
  font-weight: 800;
}
.sheet-ok.ghost {
  background: var(--c-bg);
  color: var(--c-text);
}
</style>
