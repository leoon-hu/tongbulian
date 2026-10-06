<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { GradeMeta, Semester } from '@/types/models'
import { coverOf, getCourse, getSubject, semestersOf } from '@/engine/catalog'
import { t, ui } from '@/engine/i18n'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'

// 选年级页：某学科下的一~六年级。上线的年级每一册单独一张卡（F1）——课本封面 + 「一年级 上册」，
// 点哪一张就进那一册的知识点地图（下册带 ?sem=2）；上线的年级里还没有内容的那一册（平台上还没有那一册的课本时）
// 是一张「几年级 下册 · 敬请期待」占位卡，一行仍是一个年级的上下册；soon 年级一个年级一张占位卡；无效学科回顶层。
const route = useRoute()
const router = useRouter()

const subjectId = computed(() => String(route.params.subjectId))
const subject = computed(() => getSubject(subjectId.value))

if (!subject.value) router.replace('/')

function openVolume(g: GradeMeta, sem: Semester): void {
  router.push({ path: `/s/${subjectId.value}/g/${g.id}`, query: sem === 2 ? { sem: '2' } : {} })
}

/** 这个年级的上下两册：有内容的给封面地址与说明，还没有的 src 为空（画占位卡）；没上线 / 没有课程的年级没有 */
function volumesOf(g: GradeMeta): { sem: Semester; src: string | null; alt: string }[] {
  const course = g.status === 'live' ? getCourse(subjectId.value, g.id) : undefined
  if (!course || !subject.value) return []
  const name = t({ k: 'course.name', p: { grade: g.title, subject: subject.value.title } })
  const has = semestersOf(course)
  return ([1, 2] as const).map((sem) => ({
    sem,
    // public/ 里的图片：base 是 './'，拼 BASE_URL 才能在子路径下也对
    src: has.includes(sem) ? `${import.meta.env.BASE_URL}${coverOf(course.id, sem)}` : null,
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
        <template v-if="g.status === 'live'">
          <template v-for="v in volumesOf(g)" :key="v.sem">
            <button
              v-if="v.src"
              class="vol"
              :data-grade="g.id"
              :data-sem="v.sem"
              :aria-label="v.alt"
              @click="openVolume(g, v.sem)"
            >
              <img class="cover" :src="v.src" :alt="v.alt" width="240" height="339" loading="lazy" decoding="async" />
              <span class="vol-title">
                <RubyText :text="g.title" />
                <RubyText class="vol-sem" :text="{ k: `sem.${v.sem}` }" />
              </span>
            </button>
            <button v-else class="card soon" :data-grade="g.id" :data-sem="v.sem" disabled>
              <span class="card-title">{{ t(g.title) }} {{ t({ k: `sem.${v.sem}` }) }}</span>
              <span class="soon-tag">{{ ui('chooser.soon') }}</span>
            </button>
          </template>
        </template>
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
/* 手机上两列：一行正好是一个年级的上册、下册；宽屏一行放两个年级 */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 0 16px;
}
/* 一册一张卡：封面占满卡宽，下面「一年级 上册」 */
.vol {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 12px 12px;
  border-radius: var(--radius-lg);
  background: var(--grad-node);
  box-shadow: var(--shadow-card);
  transition: transform 0.1s ease;
}
.vol:active {
  transform: scale(0.96);
}
.cover {
  display: block;
  width: 100%;
  max-width: 200px;
  height: auto;
  aspect-ratio: 240 / 339;
  border-radius: 5px 10px 10px 5px;
  box-shadow:
    0 4px 10px rgba(61, 44, 30, 0.25),
    inset 4px 0 0 rgba(0, 0, 0, 0.08);
  background: var(--c-bg);
}
/*
 * 「一年级 上册」一行：两个词各自不拆开（带拼音时 shàng 这种宽拼音会把词挤成一字一行），字号跟着屏宽走——
 * 手机上两列的卡片里一行放得下，左右两张卡一样高；实在太窄才整词换行
 */
.vol-title {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 0 5px;
  font-size: clamp(16px, 4.6vw, 22px);
  font-weight: 800;
}
.vol-title > * {
  flex: none;
  white-space: nowrap;
}
.vol-sem {
  color: var(--c-primary-dark);
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 22px 16px;
  border-radius: var(--radius-lg);
}
.card.soon {
  opacity: 0.55;
  cursor: not-allowed;
  border: 2px dashed var(--c-locked);
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
