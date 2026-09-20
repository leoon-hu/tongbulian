<script setup lang="ts">
// 根组件：全局顶部栏（每页都有）+ 路由出口。页面切换时只对内容做淡入淡出。
// 同时按当前学科切换主题皮肤（data-theme 驱动 styles/themes.css），<html lang> 跟随界面语言，
// <title> 跟随页面（首页用 index.html 里的完整标题，子页「知识点 · 一年级数学 · 同步练」）。
import { computed, watch } from 'vue'
import { HELP_TITLE } from '@/help/content'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/ui/AppHeader.vue'
import JoinSheet from '@/components/battle/JoinSheet.vue'
import { courseOfKp, findKp, getCourse, getGrade, getSubject } from '@/engine/catalog'
import { kpTitle, lang, t, ui } from '@/engine/i18n'
import { useRoomStore } from '@/stores/room'

const route = useRoute()
const room = useRoomStore()

/** 对战页的地址只带 kpId：学科 / 年级 / 知识点由目录反查 */
const isBattle = computed(() => route.path.startsWith('/battle/'))
/** 竞技场（B28）不放全局顶栏，省高度；房间页在比赛进行中也是竞技场 */
const isArena = computed(() => route.name === 'battle-local' || (route.name === 'battle-room' && room.inMatch))
function battleInfo() {
  const kpId = isBattle.value ? (typeof route.params.kpId === 'string' ? route.params.kpId : room.snapshot?.kpId) : undefined
  return kpId ? courseOfKp(kpId) : undefined
}

const BASE_TITLE = document.title
function pageTitle(): string {
  if (route.name === 'help') return `${HELP_TITLE[lang.value]} · ${ui('brand.title')}`
  if (route.name === 'battle-room' && typeof route.params.code === 'string') {
    return [`${ui('room.title')} ${route.params.code}`, ui('battle.title'), ui('brand.title')].join(' · ')
  }
  const battle = battleInfo()
  if (battle) {
    return [
      ui('battle.title'),
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
  [() => route.path, () => room.snapshot?.kpId],
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
  <AppHeader v-if="!isArena" />
  <JoinSheet v-if="room.joinOpen" @close="room.joinOpen = false" />
  <!-- 按路径作 key：同一视图换参数（如地图切年级）时重新挂载，视图里的 setup 逻辑不用再监听参数 -->
  <main>
    <router-view v-slot="{ Component }">
      <Transition name="route" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </router-view>
  </main>
</template>

<style>
.route-enter-active,
.route-leave-active {
  transition: opacity 0.18s ease;
}
.route-enter-from,
.route-leave-to {
  opacity: 0;
}
</style>
