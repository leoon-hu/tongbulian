<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { SubjectMeta } from '@/types/models'
import { SUBJECTS, liveCourses } from '@/engine/catalog'
import { t, ui } from '@/engine/i18n'
import InstallBar from '@/components/ui/InstallBar.vue'
import { SISTER_SITES } from '@/engine/sites'

// 顶层选择页：选学科。soon 学科显示占位「敬请期待」，不可进入。
// 底部一行给家长（也给搜索引擎）的说明 + 各上线课程的知识点清单链接：清单是构建时生成的静态页
// <学科>/<年级>/（见 src/seo），普通链接、不走路由；再下面一行「更多应用」链到同一作者的另外三个站（新窗口打开）。
const router = useRouter()
const courses = liveCourses()

function tapSubject(sub: SubjectMeta): void {
  if (sub.status === 'live') router.push(`/s/${sub.id}`)
}
</script>

<template>
  <div class="picker">
    <!-- 安装提示条（F16）：没装到主屏幕时从第一次打开就在首页顶上，标题之上 -->
    <InstallBar />
    <h2 class="picker-title">{{ ui('chooser.pickSubject') }}</h2>
    <div class="grid">
      <button
        v-for="sub in SUBJECTS"
        :key="sub.id"
        class="card"
        :class="[sub.theme, sub.status]"
        :disabled="sub.status === 'soon'"
        @click="tapSubject(sub)"
      >
        <span class="card-icon">{{ sub.icon }}</span>
        <span class="card-title">{{ t(sub.title) }}</span>
        <span v-if="sub.status === 'soon'" class="soon-tag">{{ ui('chooser.soon') }}</span>
      </button>
    </div>
    <footer class="about">
      <p>{{ ui('home.about') }}</p>
      <p class="about-help"><RouterLink to="/help">{{ ui('help.link') }}</RouterLink></p>
      <p class="about-join"><RouterLink to="/battle/join">{{ ui('home.join') }}</RouterLink></p>
      <p class="about-links">
        <a v-for="c in courses" :key="c.course.id" :href="`./${c.course.subjectId}/${c.course.gradeId}/`">
          {{ ui('home.topics', { name: ui('course.name', { grade: c.grade.title, subject: c.subject.title }) }) }}
        </a>
      </p>
      <p class="about-sites">
        <span>{{ ui('sites.more') }}</span>
        <a v-for="s in SISTER_SITES" :key="s.id" :href="s.url" target="_blank" rel="noopener">
          {{ ui(`sites.${s.id}`) }}<small>{{ ui(`sites.${s.id}.desc`) }}</small>
        </a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.about-help {
  margin: 4px 0 8px;
}
.about-join {
  margin: 0 0 8px;
}
.about-join a {
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
}
.about-help a {
  color: var(--c-primary-dark);
  font-weight: 700;
  text-decoration: none;
}
.picker {
  max-width: 840px;
  margin: 0 auto;
  padding: 8px 16px 24px;
}
.picker-title {
  font-size: var(--fs-lg);
  color: var(--c-primary-dark);
  margin: 16px 0 20px;
  text-align: center;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 18px;
}
.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 18px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  transition: transform 0.1s ease;
}
.card.live:active {
  transform: scale(0.96);
}
.card.soon {
  opacity: 0.55;
  cursor: not-allowed;
  border: 2px dashed var(--c-locked);
  box-shadow: none;
  background: var(--c-bg);
}
.card-icon {
  font-size: 52px;
}
.card-title {
  font-size: var(--fs-lg);
  font-weight: 800;
}
.soon-tag {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.about {
  margin-top: 36px;
  text-align: center;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.about-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px 18px;
  margin-top: 6px;
}
.about-links a {
  color: var(--c-primary-dark);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  /* 家长用的小链接，但也别小于常规点击目标的高度 */
  padding: 8px 4px;
}
.about-sites {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0 14px;
  margin-top: 10px;
}
.about-sites a {
  color: var(--c-text);
  font-weight: 700;
  padding: 8px 2px;
}
.about-sites small {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 400;
  color: var(--c-text-light);
}
</style>
