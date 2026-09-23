<script setup lang="ts">
import { useRouter } from 'vue-router'

/**
 * 子页标题栏：返回键 + 标题，默认插槽的内容（比如练习页的进度点）放在标题下面一行，
 * 不跟标题抢同一行的宽度——手机上标题带注音本来就宽，挤在一行会被折成两截。
 * actions 插槽在最右边（对战设置页的「⚙️ 配置」「❓ 怎么玩」）。
 */
defineProps<{ title?: string; back?: string }>()
const router = useRouter()
</script>

<template>
  <header class="page-header">
    <button v-if="back" class="back" @click="router.push(back)">←</button>
    <div class="body">
      <h1 class="title"><slot name="title">{{ title }}</slot></h1>
      <div v-if="$slots.default" class="extra"><slot /></div>
    </div>
    <div v-if="$slots.actions" class="actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
}
.back {
  flex: none;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-lg);
  color: var(--c-text);
}
.body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
/* 图标与文字并排：文字太长换行时，各行左边对齐，不会第一行被图标顶开、第二行顶格。
   只在空格 / 标点处换行（keep-all）：逐字注音的标题原来会从「乘 / 法口诀」中间断开；一个词本身比一行还宽才任意断 */
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-lg);
  text-wrap: balance;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.extra {
  display: flex;
  align-items: center;
  gap: 10px;
}
.actions {
  flex: none;
  align-self: flex-start;
}
</style>
