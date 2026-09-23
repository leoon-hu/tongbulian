<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ui } from '@/engine/i18n'
import { useSettingsStore } from '@/stores/settings'
import { joinOpen, roomAvailable } from '@/battle/lite'
import RubyText from '@/components/ui/RubyText.vue'

// 全局顶部栏：品牌标题 + 「🔑 加入对战」（B19，口令是全局的，不挂在某个知识点的对战页上）+ 主页 / 声音 / 语言切换。显示在每个页面上方（学科无关；竞技场里不显示）。
// 品牌名在首页是 <h1>（首页没有别的一级标题，搜索引擎按它认页面），子页的一级标题是 PageHeader 里的页名。
// 品牌画成「同步练」+ 主色药丸「对战版」（F3，2026-09-21 对战版定位）；<title> 用的完整名 brand.title 在 App.vue。
// compact：练习页用，品牌与按钮都缩一号、上下留白收窄，题目和作答区尽量一屏放下（U1）。
defineProps<{ compact?: boolean }>()
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const titleTag = computed(() => (route.path === '/' ? 'h1' : 'span'))
</script>

<template>
  <header class="app-header" :class="{ compact }">
    <RouterLink class="brand" to="/">
      <span class="brand-icon">⚔️</span>
      <span class="brand-text">
        <component :is="titleTag" class="brand-title">
          <span class="brand-name">{{ ui('brand.name') }}</span><span class="sr-only">-</span>
          <span class="brand-badge">{{ ui('brand.edition') }}</span>
        </component>
        <span class="brand-sub">{{ ui('brand.tagline') }}</span>
      </span>
    </RouterLink>
    <div class="nav">
      <button v-if="roomAvailable" type="button" class="nav-btn join" @click="joinOpen = true">🔑 <RubyText :text="{ k: 'room.join' }" /></button>
      <button class="nav-btn home" @click="router.push('/')" :aria-label="ui('nav.home')">🏠</button>
      <button
        class="nav-btn sound"
        :class="{ off: !settings.soundEnabled }"
        :aria-label="ui(settings.soundEnabled ? 'nav.soundOn' : 'nav.soundOff')"
        :aria-pressed="settings.soundEnabled"
        @click="settings.toggleSound()"
      >
        {{ settings.soundEnabled ? '🔊' : '🔇' }}
      </button>
      <button class="nav-btn lang" @click="settings.toggleLanguage()">
        {{ settings.lang === 'zh' ? 'EN' : '中' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
/* 只给读屏器与爬虫看的连字符：h1 的文本是「同步练-对战版」（与 <title> / og:site_name 一致），画面上不显示 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 16px;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  color: inherit;
  text-decoration: none;
}
.brand-icon {
  font-size: 40px;
}
.brand-text {
  display: flex;
  flex-direction: column;
}
.brand-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: var(--fs-xl);
  font-weight: 800;
  line-height: 1.2;
}
/* 「对战版」药丸：主色实底白字，比品牌名小一号 */
.brand-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: var(--fs-sm);
  font-weight: 800;
  line-height: 1.5;
  white-space: nowrap;
}
.brand-sub {
  color: var(--c-text-light);
  font-size: var(--fs-sm);
}
.nav {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-btn {
  width: var(--tap-min);
  height: var(--tap-min);
  border-radius: 50%;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: 26px;
  transition: transform 0.08s ease;
}
.nav-btn:active {
  transform: scale(0.92);
}
.nav-btn.sound.off {
  opacity: 0.55;
}
.nav-btn.lang {
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-primary-dark);
}
/* 紧凑版（练习页）：品牌小一号、按钮 48px；手机上两行合起来约 110px（原来 164px） */
.app-header.compact {
  gap: 6px 12px;
  padding: 6px 16px;
}
.compact .brand {
  gap: 8px;
}
.compact .brand-icon {
  font-size: 30px;
}
.compact .brand-title {
  gap: 6px;
  font-size: var(--fs-lg);
}
.compact .brand-badge {
  padding: 1px 8px;
  font-size: 13px;
}
.compact .brand-sub {
  font-size: 13px;
  line-height: 1.3;
}
.compact .nav {
  gap: 8px;
}
.compact .nav-btn {
  width: 48px;
  height: 48px;
  font-size: 22px;
}
.compact .nav-btn.lang {
  font-size: var(--fs-md);
}
/* 「🔑 加入对战」：药丸形，带注音 */
.nav-btn.join {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: auto;
  padding: 0 16px;
  border-radius: 999px;
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--c-text);
  white-space: nowrap;
}
.compact .nav-btn.join {
  width: auto;
  padding: 0 14px;
  font-size: var(--fs-sm);
}
</style>
