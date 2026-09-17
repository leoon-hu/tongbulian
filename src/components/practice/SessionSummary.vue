<script setup lang="ts">
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{
  correct: number
  total: number
}>()
const emit = defineEmits<{ retry: []; home: [] }>()
</script>

<template>
  <div class="summary">
    <h2 class="title"><RubyText :text="{ k: 'summary.success' }" /></h2>
    <div class="done-badge">✅</div>
    <p class="score">
      <RubyText :text="{ k: 'summary.scorePre' }" /><strong>{{ correct }}</strong> / {{ total }}
      <RubyText :text="{ k: 'summary.scorePost' }" />
    </p>
    <div class="actions">
      <BigButton color="green" @click="emit('retry')"><RubyText :text="{ k: 'summary.retry' }" /></BigButton>
      <BigButton color="ghost" @click="emit('home')"><RubyText :text="{ k: 'summary.backMap' }" /></BigButton>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 40px 20px;
}
.title {
  font-size: var(--fs-xl);
}
.done-badge {
  font-size: 72px;
  line-height: 1;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes pop {
  from {
    transform: scale(0) rotate(-30deg);
  }
  to {
    transform: scale(1) rotate(0);
  }
}
.score {
  font-size: var(--fs-lg);
}
.score strong {
  color: var(--c-primary-dark);
  font-size: var(--fs-xl);
}
.actions {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}
</style>
