<script setup lang="ts">
// 输房间号加入对战（B20）：给没法扫码的设备（电脑）用；首页底部与对战设置页都有入口
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'
import JoinCodeForm from '@/components/battle/JoinCodeForm.vue'
</script>

<template>
  <div class="join-page">
    <PageHeader back="/">
      <template #title>
        <span class="kp-icon">⚔️</span>
        <RubyText :text="{ k: 'room.join.title' }" />
      </template>
    </PageHeader>
    <section class="block">
      <JoinCodeForm autofocus />
    </section>
  </div>
</template>

<style scoped>
.join-page {
  max-width: 640px;
  margin: 0 auto;
}
.kp-icon {
  flex: none;
}
.block {
  padding: 24px 16px;
}
</style>
