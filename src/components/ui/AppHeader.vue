<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ui } from '@/engine/i18n'
import { useSettingsStore } from '@/stores/settings'
import { useRoomStore } from '@/stores/room'
import RubyText from '@/components/ui/RubyText.vue'

// 全局顶部栏：品牌标题 + 「🔑 加入对战」（B19，口令是全局的，不挂在某个知识点的对战页上）+ 主页 / 声音 / 语言切换。显示在每个页面上方（学科无关；竞技场里不显示）。
// 品牌名在首页是 <h1>（首页没有别的一级标题，搜索引擎按它认页面），子页的一级标题是 PageHeader 里的页名。
const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const room = useRoomStore()
const titleTag = computed(() => (route.path === '/' ? 'h1' : 'span'))
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand" to="/">
      <span class="brand-icon">📝</span>
      <span class="brand-text">
        <component :is="titleTag" class="brand-title">{{ ui('brand.title') }}</component>
        <span class="brand-sub">{{ ui('brand.tagline') }}</span>
      </span>
    </RouterLink>
    <div class="nav">
      <button v-if="room.available" type="button" class="nav-btn join" @click="room.joinOpen = true">🔑 <RubyText :text="{ k: 'room.join' }" /></button>
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
  font-size: var(--fs-xl);
  font-weight: 800;
  line-height: 1.2;
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
</style>
