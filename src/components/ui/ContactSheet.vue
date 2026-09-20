<script setup lang="ts">
import { ui } from '@/engine/i18n'
import { AUTHOR_CONTACT } from '@/engine/sites'

/**
 * 「联系站长」面板（需求 F1「站长联系方式」）：底部弹出的一张卡，一句怎么加 + 站长微信二维码 + 「知道了」。
 * 家长自己点开的，不算给孩子的弹窗；不出声、不注音。结构与 InstallBar 的步骤面板一样。
 */
const emit = defineEmits<{ close: [] }>()
/** public/ 里的图片；base 是 './'，拼 BASE_URL 才能在子路径与 file:// 下都对 */
const qrSrc = `${import.meta.env.BASE_URL}${AUTHOR_CONTACT.qr}`
</script>

<template>
  <Teleport to="body">
    <div class="sheet-mask" @click.self="emit('close')">
      <div class="sheet" role="dialog" aria-modal="true" :aria-label="ui('contact.title')">
        <h3 class="sheet-title">{{ ui('contact.title') }}</h3>
        <p class="sheet-desc">{{ ui('contact.hint') }}</p>
        <img class="qr" :src="qrSrc" :alt="ui('contact.alt')" :width="AUTHOR_CONTACT.qrWidth" :height="AUTHOR_CONTACT.qrHeight" draggable="false" />
        <button type="button" class="sheet-ok" @click="emit('close')">{{ ui('contact.gotit') }}</button>
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
  text-align: center;
}
.sheet-title {
  margin: 0;
  font-size: var(--fs-lg);
}
.sheet-desc {
  margin: 4px 0 14px;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  text-align: left;
}
/* 二维码一张，居中；高度按视口限一下，小手机上别把「知道了」挤出屏幕 */
.qr {
  display: block;
  width: min(240px, 100%, 42vh);
  height: auto;
  margin: 0 auto;
  border-radius: var(--radius-md);
  background: #fff;
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
</style>
