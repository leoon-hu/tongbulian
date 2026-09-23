<script setup lang="ts">
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 一轮做完的结算（F7）：按钮和对战结果页一样是三个——下一章（本册目录里的下一个知识点，占一整行）、
 * 再练一次、不练了（回地图）；本册最后一个知识点没有下一章，写「这一册都练完啦！」，再练一次变成绿色。
 * next：下一个知识点的 id，null = 本册最后一个。
 */
defineProps<{
  correct: number
  total: number
  next: string | null
}>()
const emit = defineEmits<{ next: []; retry: []; home: [] }>()
</script>

<template>
  <div class="summary">
    <h2 class="title"><RubyText :text="{ k: 'summary.success' }" /></h2>
    <div class="done-badge">✅</div>
    <p class="score">
      <RubyText :text="{ k: 'summary.scorePre' }" /><strong>{{ correct }}</strong> / {{ total }}
      <RubyText :text="{ k: 'summary.scorePost' }" />
    </p>
    <div class="side">
      <p v-if="next" class="next-hint"><RubyText :text="{ k: 'summary.next' }" />：<RubyText :text="{ k: `kp.${next}` }" /></p>
      <p v-else class="next-hint done"><RubyText :text="{ k: 'summary.lastChapter' }" /></p>
      <div class="actions">
        <BigButton v-if="next" color="green" class="next-btn" @click="emit('next')"><RubyText :text="{ k: 'summary.next' }" /> ▶</BigButton>
        <BigButton :color="next ? 'blue' : 'green'" class="retry-btn" @click="emit('retry')"><RubyText :text="{ k: 'summary.retry' }" /></BigButton>
        <BigButton color="ghost" class="quit-btn" @click="emit('home')"><RubyText :text="{ k: 'summary.quit' }" /></BigButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px 16px;
}
.title {
  font-size: var(--fs-xl);
}
.done-badge {
  font-size: 64px;
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
.side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 440px;
  margin-top: 4px;
}
.next-hint {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-light);
  text-align: center;
}
.next-hint.done {
  color: var(--c-primary-dark);
}
/* 同对战结果页（B9）：下一章占一整行，再练一次 + 不练了并排；没有下一章时两个并排 */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.actions .big-btn {
  padding: 0 10px;
  white-space: nowrap;
}
.actions .next-btn {
  grid-column: 1 / -1;
}
</style>
