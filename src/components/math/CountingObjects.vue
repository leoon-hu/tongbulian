<script setup lang="ts">
/** 一组同类实物：用于数数。count 个 emoji 自动换行铺开。 */
withDefaults(defineProps<{ icon: string; count: number; size?: number }>(), { size: 40 })
</script>

<template>
  <div class="objects" :style="{ fontSize: `${size}px` }">
    <span v-for="i in count" :key="i" class="obj">{{ icon }}</span>
  </div>
</template>

<style scoped>
.objects {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  justify-content: center;
  align-items: center;
  max-width: 420px;
  line-height: 1;
}
.obj {
  animation: pop-in 0.25s ease both;
}
@keyframes pop-in {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
</style>
