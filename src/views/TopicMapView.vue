<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { KnowledgePoint } from '@/types/models'
import { ROUND_SIZE, hasGenerator } from '@/engine'
import { getCourse, getSubject, kpsOfUnit } from '@/engine/catalog'
import { kpTitle, ui, unitTitle } from '@/engine/i18n'
import { useProgressStore } from '@/stores/progress'
import EntrySheet from '@/components/ui/EntrySheet.vue'

// 某「学科×年级」的知识点地图。无效课程回顶层。
const route = useRoute()
const router = useRouter()
const progress = useProgressStore()

const subjectId = computed(() => String(route.params.subjectId))
const gradeId = computed(() => String(route.params.gradeId))
const subject = computed(() => getSubject(subjectId.value))
const course = computed(() => getCourse(subjectId.value, gradeId.value))

if (!course.value) router.replace('/')

const semesters = computed(() => {
  const units = course.value?.units ?? []
  return [
    { semester: 1 as const, units: units.filter((u) => u.semester === 1) },
    { semester: 2 as const, units: units.filter((u) => u.semester === 2) },
  ].filter((s) => s.units.length > 0)
})

// 上册/下册切页签：只渲染当前册，避免竖着堆太长。当前册记在地址里（`?sem=2`）：从下册的练习页 / 对战页
// 「返回」带着它回来就还在下册，浏览器的返回键、刷新也一样（2026-09-22 用户报「不管从哪返回都回上册」）。
const semFromRoute = (): 1 | 2 => (route.query.sem === '2' ? 2 : 1)
const activeSem = ref<1 | 2>(semFromRoute())
watch(
  () => route.query.sem,
  () => {
    if (route.name === 'topics') activeSem.value = semFromRoute()
  },
)
function switchSem(sem: 1 | 2): void {
  activeSem.value = sem
  void router.replace({ query: sem === 2 ? { sem: '2' } : {} })
}
const activeUnits = computed(() => {
  const list = semesters.value
  const current = list.find((s) => s.semester === activeSem.value)
  return (current ?? list[0])?.units ?? []
})

const doneCount = computed(
  () => course.value?.knowledgePoints.filter((kp) => progress.isCompleted(kp.id)).length ?? 0,
)

// 所有知识点默认可选；仅未上线（无生成器）的显示为「敬请期待」且不可点。
type NodeStatus = 'open' | 'soon'

function statusOf(kp: KnowledgePoint): NodeStatus {
  return hasGenerator(kp.id) ? 'open' : 'soon'
}

const SEGMENTS = Array.from({ length: ROUND_SIZE }, (_, i) => i)

// 点知识点先弹出「自己练，还是对战？」（B26）：选了才跳练习页 / 对战设置页
const picking = ref<KnowledgePoint | null>(null)

function tapNode(kp: KnowledgePoint): void {
  if (statusOf(kp) !== 'open') return
  picking.value = kp
}

function goPractice(): void {
  const kp = picking.value
  if (kp) router.push(`/s/${subjectId.value}/g/${gradeId.value}/practice/${kp.id}`)
}

function goBattle(): void {
  const kp = picking.value
  if (kp) router.push(`/battle/new/${kp.id}`)
}
</script>

<template>
  <div v-if="course && subject" class="home">
    <header class="topbar">
      <button class="back" @click="router.push(`/s/${subjectId}`)" :aria-label="ui('chooser.back')">←</button>
      <div class="ctx">
        <h1 class="ctx-title">{{ subject.icon }} {{ ui('grade.' + gradeId) }}</h1>
        <span class="ctx-sub">{{ ui('home.lit', { n: doneCount }) }}</span>
      </div>
    </header>

    <nav v-if="semesters.length > 1" class="tabs">
      <button
        v-for="sem in semesters"
        :key="sem.semester"
        class="tab"
        :class="{ active: sem.semester === activeSem }"
        @click="switchSem(sem.semester)"
      >
        {{ ui('sem.' + sem.semester) }}
      </button>
    </nav>

    <section class="map">
      <div v-for="unit in activeUnits" :key="unit.id" class="unit">
        <h2 class="unit-title">{{ unit.numbered === false ? '☆' : `${unit.order}.` }} {{ unitTitle(unit) }}</h2>
        <div class="nodes">
          <div v-for="kp in kpsOfUnit(course, unit.id)" :key="kp.id" class="node-wrap">
            <button
              class="node"
              :class="statusOf(kp)"
              :disabled="statusOf(kp) === 'soon'"
              @click="tapNode(kp)"
            >
              <span class="node-icon">{{ kp.icon }}</span>
            </button>
            <span class="node-title">{{ kpTitle(kp) }}</span>
            <button
              v-if="statusOf(kp) === 'open'"
              type="button"
              class="status"
              :class="progress.isCompleted(kp.id) ? 'done' : 'todo'"
              :title="ui('status.toggleHint')"
              @click="progress.toggleCompleted(kp.id)"
            >
              {{ ui(progress.isCompleted(kp.id) ? 'status.done' : 'status.todo') }}
            </button>
            <span v-else-if="statusOf(kp) === 'soon'" class="soon-tag">{{ ui('home.soon') }}</span>
            <!-- 未完成的：这一轮做到第几题（答对绿、答错红；中途退出会记住，下次接着做） -->
            <div
              v-if="statusOf(kp) === 'open' && !progress.isCompleted(kp.id)"
              class="round"
              role="progressbar"
              :aria-valuenow="progress.answeredOf(kp.id)"
              :aria-valuemax="ROUND_SIZE"
              :title="ui('status.roundProgress', { n: progress.answeredOf(kp.id), total: ROUND_SIZE })"
            >
              <span
                v-for="i in SEGMENTS"
                :key="i"
                class="seg"
                :class="{ right: progress.resultsOf(kp.id)[i] === true, wrong: progress.resultsOf(kp.id)[i] === false }"
              />
            </div>
            <!-- 这一轮的统计（已答 / 对 / 错）：答过才显示，做满一轮后下次进来会重新计 -->
            <span v-if="progress.statsOf(kp.id).total > 0" class="stats">
              <span class="stat total">{{ ui('stats.total', { n: progress.statsOf(kp.id).total }) }}</span>
              <span class="stat right">{{ ui('stats.right', { n: progress.statsOf(kp.id).correct }) }}</span>
              <span class="stat wrong">{{ ui('stats.wrong', { n: progress.statsOf(kp.id).wrong }) }}</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <EntrySheet v-if="picking" :kp="picking" @practice="goPractice" @battle="goBattle" @close="picking = null" />
  </div>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 16px 16px;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 4px;
}
.back {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: 22px;
}
.ctx {
  display: flex;
  flex-direction: column;
}
.ctx-title {
  font-size: var(--fs-lg);
  font-weight: 800;
}
.ctx-sub {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.tabs {
  display: flex;
  gap: 8px;
  margin: 16px 0 14px;
}
.tab {
  flex: 1;
  max-width: 200px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-light);
  transition: transform 0.08s ease, background 0.15s ease, color 0.15s ease;
}
.tab:active {
  transform: scale(0.96);
}
.tab.active {
  background: var(--grad-node);
  color: var(--c-text);
}
.unit {
  background: var(--c-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 16px 20px;
  margin-bottom: 14px;
}
.unit-title {
  font-size: var(--fs-md);
  color: var(--c-text-light);
  margin-bottom: 12px;
}
.nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
}
.node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 112px;
}
.node {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  font-size: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease;
}
.node.open {
  background: var(--grad-node);
  box-shadow: var(--shadow-card);
}
.node.open:active {
  transform: scale(0.92);
}
.node.soon {
  background: var(--c-bg);
  border: 2px dashed var(--c-locked);
  opacity: 0.6;
  cursor: not-allowed;
}
.node-title {
  font-size: var(--fs-sm);
  font-weight: 700;
  text-align: center;
}
.soon-tag {
  font-size: 12px;
  color: var(--c-text-light);
}
.status {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease;
}
.status:active {
  transform: scale(0.92);
}
.status.done {
  color: var(--c-green);
  background: rgba(62, 207, 142, 0.16);
}
.status.todo {
  color: var(--c-text-light);
  background: var(--c-bg);
}
.round {
  display: flex;
  gap: 3px;
  padding: 2px 0;
}
.seg {
  width: 10px;
  height: 7px;
  border-radius: 3px;
  background: var(--c-line);
}
.seg.right {
  background: var(--c-green);
}
.seg.wrong {
  background: var(--c-red);
}
.stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 2px 6px;
  max-width: 100%;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.4;
}
.stat {
  white-space: nowrap;
}
.stat.total {
  color: var(--c-text-light);
}
.stat.right {
  color: var(--c-green);
}
.stat.wrong {
  color: var(--c-red);
}
</style>
