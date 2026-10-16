<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/engine/i18n'

/**
 * 鸽巢问题的放法图（六下「数学广角——鸽巢问题」例 1 小明的想法：3 个笔筒各放 1 支、旁边还剩 1 支；例 2 的抽屉、做一做的鸽笼）：
 * 几个笔筒 / 抽屉 / 鸽笼并排，counts = 每个里面放了几个 icon；extra = 还没放进去的几个，画在旁边的虚线框里。
 * 图里没有字；读屏只说「放法图」。
 */
const props = withDefaults(defineProps<{ holder: 'cup' | 'drawer' | 'cage'; icon: string; counts: number[]; extra?: number }>(), { extra: 0 })

const aria = computed(() => t({ k: 'm6.pigeon.aria' }))
</script>

<template>
  <div class="pigeonholes" role="img" :aria-label="aria">
    <div v-for="(n, i) in counts" :key="i" class="holder" :class="holder" :data-n="n">
      <span v-for="k in n" :key="k" class="it">{{ icon }}</span>
    </div>
    <div v-if="extra > 0" class="extra" :data-n="extra">
      <span v-for="k in extra" :key="k" class="it">{{ icon }}</span>
    </div>
  </div>
</template>

<style scoped>
.pigeonholes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px;
  max-width: 100%;
}
.holder {
  position: relative;
  display: flex;
  flex-wrap: wrap-reverse;
  align-content: flex-start;
  justify-content: center;
  gap: 0 2px;
  padding: 4px;
}
.cup {
  width: 50px;
  min-height: 60px;
  border: 3px solid #c0504d;
  border-top: none;
  border-radius: 0 0 14px 14px;
  background: #fbe3e2;
}
.drawer {
  width: 66px;
  min-height: 46px;
  border: 3px solid #8a6d3b;
  border-radius: 6px;
  background: #f3e3c3;
  padding-bottom: 14px;
}
.drawer::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 3px;
  width: 14px;
  height: 6px;
  margin-left: -7px;
  border-radius: 3px;
  background: #8a6d3b;
}
.cage {
  width: 58px;
  min-height: 60px;
  border: 3px solid #6f7f8f;
  border-radius: 28px 28px 6px 6px;
  background: repeating-linear-gradient(90deg, #eef2f6 0 9px, #b9c4cf 9px 11px);
  padding-top: 14px;
}
.extra {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 2px;
  max-width: 76px;
  padding: 4px 8px;
  border: 2px dashed #9aa7b4;
  border-radius: 12px;
}
.it {
  font-size: 20px;
  line-height: 1.15;
}
</style>
