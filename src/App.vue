<script setup lang="ts">
// 根组件：全局顶部栏（每页都有）+ 路由出口。页面切换时只对内容做淡入淡出。
// 同时按当前学科切换主题皮肤（data-theme 驱动 styles/themes.css），<html lang> 跟随界面语言，
// <title> 跟随页面（首页用 index.html 里的完整标题，子页「知识点 · 一年级数学 · 同步练-对战版」，品牌用完整名 brand.title）。
import { computed, defineAsyncComponent, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/ui/AppHeader.vue'
import SharePanel from '@/components/ui/SharePanel.vue'
import { AUTOJOIN_KEY } from '@/engine/update'
import { setupSwUpdates } from '@/engine/sw'
import { courseOfKp, findKp, getCourse, getGrade, getSubject } from '@/engine/catalog'
import { kpTitle, lang, t, ui } from '@/engine/i18n'
// 房间状态只看轻模块（N8）：整个房间 store 与「加入对战」面板都等用到再加载，不进首页的入口分块
import { joinOpen, roomInMatch, roomKpId } from '@/battle/lite'
import { useShareStore } from '@/stores/share'

const JoinSheet = defineAsyncComponent(() => import('@/components/battle/JoinSheet.vue'))
const route = useRoute()
const shareStore = useShareStore()
// 输口令时页面因版本旧了自动重载：重载后自动打开「加入对战」面板接着进（B43）
onMounted(() => {
  try {
    if (sessionStorage.getItem(AUTOJOIN_KEY)) joinOpen.value = true
  } catch {
    /* 没有 sessionStorage */
  }
})

/** 对战页的地址只带 kpId：学科 / 年级 / 知识点由目录反查 */
const isBattle = computed(() => route.path.startsWith('/battle/'))
/** 竞技场（B28）不放全局顶栏，省高度；房间页在比赛进行中也是竞技场 */
const isArena = computed(() => route.name === 'battle-local' || (route.name === 'battle-room' && roomInMatch.value))
// 新版本装好接管后自己重载（B43）：不在对战里马上换，在对战里等退出竞技场再换
const swUpdates = setupSwUpdates(() => isArena.value || roomInMatch.value)
watch(isArena, (v) => {
  if (!v) swUpdates.flush()
})
function battleInfo() {
  const kpId = isBattle.value ? (typeof route.params.kpId === 'string' ? route.params.kpId : (roomKpId.value ?? undefined)) : undefined
  return kpId ? courseOfKp(kpId) : undefined
}

const BASE_TITLE = document.title
function pageTitle(): string {
  if (route.name === 'help') return `${ui('help.title')} · ${ui('brand.title')}`
  if (route.name === 'battle-room' && typeof route.params.code === 'string') {
    return [`${ui('room.title')} ${route.params.code}`, ui('battle.title'), ui('brand.title')].join(' · ')
  }
  const battle = battleInfo()
  if (battle) {
    return [
      // 设置页（自己练 + 三种对战，B26 / B27）叫「练习」，竞技场与房间叫「对战」
      ui(route.name === 'battle-setup' ? 'battle.setupTitle' : 'battle.title'),
      kpTitle(battle.kp),
      ui('course.name', { grade: battle.grade.title, subject: battle.subject.title }),
      ui('brand.title'),
    ].join(' · ')
  }
  const subjectId = typeof route.params.subjectId === 'string' ? route.params.subjectId : ''
  const gradeId = typeof route.params.gradeId === 'string' ? route.params.gradeId : ''
  const kpId = typeof route.params.kpId === 'string' ? route.params.kpId : ''
  const subject = getSubject(subjectId)
  if (!subject) return lang.value === 'zh' && BASE_TITLE ? BASE_TITLE : `${ui('brand.title')} · ${ui('brand.tagline')}`
  const grade = getGrade(subjectId, gradeId)
  const course = getCourse(subjectId, gradeId)
  const kp = course && kpId ? findKp(course, kpId) : undefined
  const parts = [
    kp ? kpTitle(kp) : '',
    grade ? ui('course.name', { grade: grade.title, subject: subject.title }) : t(subject.title),
    ui('brand.title'),
  ]
  return parts.filter(Boolean).join(' · ')
}
watch([() => route.fullPath, lang], () => (document.title = pageTitle()), { immediate: true })
watch(
  [() => route.path, () => roomKpId.value],
  () => {
    const sid = route.params.subjectId
    const subject = typeof sid === 'string' ? getSubject(sid) : battleInfo()?.subject
    document.documentElement.dataset.theme = subject?.theme ?? 'home'
  },
  { immediate: true },
)
watch(
  lang,
  (l) => {
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
  },
  { immediate: true },
)
</script>

<template>
  <AppHeader v-if="!isArena" :compact="route.name === 'practice'" />
  <JoinSheet v-if="joinOpen" @close="joinOpen = false" />
  <!-- 「分享给朋友」在没有系统分享面板的环境下弹的面板（F1），哪一页发起都在这里画 -->
  <SharePanel v-if="shareStore.panel" />
  <!-- 按路径作 key：同一视图换参数（如地图切年级）时重新挂载，视图里的 setup 逻辑不用再监听参数 -->
  <main>
    <router-view v-slot="{ Component }">
      <Transition name="route" mode="out-in">
        <!-- 同一视图换参数整个重挂载；单设备竞技场例外：「下一章」换知识点时要留着竞技场（全屏、游戏宿主），key 固定 -->
        <component :is="Component" :key="route.name === 'battle-local' ? 'battle-local' : route.path" />
      </Transition>
    </router-view>
  </main>
</template>

<style>
.route-enter-active,
.route-leave-active {
  transition: opacity 0.12s ease;
}
.route-enter-from,
.route-leave-to {
  opacity: 0;
}
</style>
