<script setup lang="ts">
// 根组件：全局顶部栏（每页都有）+ 路由出口。页面切换时只对内容做淡入淡出。
// 同时按当前学科切换主题皮肤（data-theme 驱动 styles/themes.css），<html lang> 跟随界面语言，
// <title> 跟随页面（首页用 index.html 里的完整标题，子页「知识点 · 一年级数学 · 同步练」）。
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/ui/AppHeader.vue'
import { findKp, getCourse, getGrade, getSubject } from '@/engine/catalog'
import { kpTitle, lang, t, ui } from '@/engine/i18n'

const route = useRoute()

const BASE_TITLE = document.title
function pageTitle(): string {
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
  () => route.params.subjectId,
  (sid) => {
    const theme = (typeof sid === 'string' && getSubject(sid)?.theme) || 'home'
    document.documentElement.dataset.theme = theme
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
  <AppHeader />
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
