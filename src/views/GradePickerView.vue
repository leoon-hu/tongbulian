<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { GradeMeta, Semester } from '@/types/models'
import { coverOf, getCourse, getSubject, semestersOf } from '@/engine/catalog'
import { t, ui } from '@/engine/i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'

// 选年级页：某学科下的一~六年级。上线的年级卡片上并排画这个年级上下两册课本的封面（F2），
// 点哪一本就进那一册的知识点地图（下册带 ?sem=2），点卡片别处进上册；soon 年级占位；无效学科回顶层。
const route = useRoute()
const router = useRouter()

const subjectId = computed(() => String(route.params.subjectId))
const subject = computed(() => getSubject(subjectId.value))

if (!subject.value) router.replace('/')

function tapGrade(g: GradeMeta, sem: Semester = 1): void {
  if (g.status !== 'live') return
  router.push({ path: `/s/${subjectId.value}/g/${g.id}`, query: sem === 2 ? { sem: '2' } : {} })
}

/** 这个年级的几册课本封面（没上线 / 没有课程的年级没有） */
function coversOf(g: GradeMeta): { sem: Semester; src: string; alt: string }[] {
  const course = g.status === 'live' ? getCourse(subjectId.value, g.id) : undefined
  if (!course || !subject.value) return []
  const name = t({ k: 'course.name', p: { grade: g.title, subject: subject.value.title } })
  return semestersOf(course).map((sem) => ({
    sem,
    // public/ 里的图片：base 是 './'，拼 BASE_URL 才能在子路径下也对
    src: `${import.meta.env.BASE_URL}${coverOf(course.id, sem)}`,
    alt: `${name} ${t({ k: `sem.${sem}` })}`,
  }))
}
</script>

<template>
  <div v-if="subject" class="picker">
    <PageHeader :title="`${subject.icon} ${t(subject.title)}`" back="/" />
    <h2 class="picker-title">{{ ui('chooser.pickGrade') }}</h2>
    <div class="grid">
      <template v-for="g in subject.grades" :key="g.id">
        <div v-if="g.status === 'live'" class="card live" :data-grade="g.id" @click="tapGrade(g)">
          <div class="covers">
            <button
              v-for="c in coversOf(g)"
              :key="c.sem"
              class="cover"
              :data-sem="c.sem"
              :aria-label="c.alt"
              @click.stop="tapGrade(g, c.sem)"
            >
              <img :src="c.src" :alt="c.alt" width="240" height="339" loading="lazy" decoding="async" />
              <RubyText class="cover-sem" :text="{ k: `sem.${c.sem}` }" />
            </button>
          </div>
          <span class="card-title">{{ t(g.title) }}</span>
        </div>
        <button v-else class="card soon" :data-grade="g.id" disabled>
          <span class="card-title">{{ t(g.title) }}</span>
          <span class="soon-tag">{{ ui('chooser.soon') }}</span>
        </button>
      </template>
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
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  padding: 0 16px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 26px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  transition: transform 0.1s ease;
}
.card.live {
  padding: 14px 10px 16px;
  background: var(--grad-node);
  cursor: pointer;
}
.card.live:active {
  transform: scale(0.97);
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
/* 上下两册的封面并排：像两本立着的书，按下去缩一下 */
.covers {
  display: flex;
  justify-content: center;
  gap: 10px;
  width: 100%;
}
.cover {
  flex: 1 1 0;
  max-width: 96px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0;
  background: none;
  border: none;
  transition: transform 0.1s ease;
}
.cover:active {
  transform: scale(0.94);
}
.cover img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 240 / 339;
  border-radius: 4px 8px 8px 4px;
  box-shadow:
    0 3px 8px rgba(61, 44, 30, 0.22),
    inset 3px 0 0 rgba(0, 0, 0, 0.08);
  background: var(--c-bg);
}
.cover-sem {
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-light);
}
</style>
