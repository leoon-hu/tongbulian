<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { GradeMeta } from '@/types/models'
import { getSubject } from '@/engine/catalog'
import { t, ui } from '@/engine/i18n'
import PageHeader from '@/components/ui/PageHeader.vue'

// 选年级页：某学科下的一~六年级。soon 年级占位；无效学科回顶层。
const route = useRoute()
const router = useRouter()

const subjectId = computed(() => String(route.params.subjectId))
const subject = computed(() => getSubject(subjectId.value))

if (!subject.value) router.replace('/')

function tapGrade(g: GradeMeta): void {
  if (g.status === 'live') router.push(`/s/${subjectId.value}/g/${g.id}`)
}
</script>

<template>
  <div v-if="subject" class="picker">
    <PageHeader :title="`${subject.icon} ${t(subject.title)}`" back="/" />
    <h2 class="picker-title">{{ ui('chooser.pickGrade') }}</h2>
    <div class="grid">
      <button
        v-for="g in subject.grades"
        :key="g.id"
        class="card"
        :class="g.status"
        :disabled="g.status === 'soon'"
        @click="tapGrade(g)"
      >
        <span class="card-title">{{ t(g.title) }}</span>
        <span v-if="g.status === 'soon'" class="soon-tag">{{ ui('chooser.soon') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.picker {
  max-width: 840px;
  margin: 0 auto;
  padding-bottom: 24px;
}
.picker-title {
  font-size: var(--fs-lg);
  color: var(--c-primary-dark);
  margin: 8px 0 20px;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 16px;
  padding: 0 16px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 26px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  transition: transform 0.1s ease;
}
.card.live {
  background: var(--grad-node);
}
.card.live:active {
  transform: scale(0.95);
}
.card.soon {
  opacity: 0.55;
  cursor: not-allowed;
  border: 2px dashed var(--c-locked);
  box-shadow: none;
  background: var(--c-bg);
}
.card-title {
  font-size: var(--fs-lg);
  font-weight: 800;
}
.soon-tag {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
</style>
