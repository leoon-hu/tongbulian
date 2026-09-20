<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SubjectMeta } from '@/types/models'
import { SUBJECTS, liveCourses } from '@/engine/catalog'
import { t, ui } from '@/engine/i18n'
import ContactSheet from '@/components/ui/ContactSheet.vue'
import InstallBar from '@/components/ui/InstallBar.vue'
import RubyText from '@/components/ui/RubyText.vue'
import { REPO_URL, SISTER_SITES } from '@/engine/sites'
import { useShareStore } from '@/stores/share'
import { SKINS } from '@/battle/skins'

// 顶层选择页：选学科。soon 学科显示占位「敬请期待」，不可进入。
// 标题上方一条对战 hero（F1，2026-09-21 对战版定位）：七种游戏的图标 + 一句带拼音的话，静态、不出声、不可点。
// 底部一行给家长（也给搜索引擎）的说明 + 各上线课程的知识点清单链接：清单是构建时生成的静态页
// <学科>/<年级>/（见 src/seo），普通链接、不走路由；再下面一行「更多应用」链到同一作者的另外三个站（新窗口打开）；
// 再一句「开源」的说明（免费 / 无广告 / 不收集个人信息 / 代码开源）；最后一行三个给家长的动作：GitHub 源码（新窗口）、
// 分享给朋友（系统分享面板或复制一段话）、联系站长（弹站长微信二维码）——都是家长自己点开的，不出声不注音。
const router = useRouter()
const courses = liveCourses()
const contactOpen = ref(false)
const shareStore = useShareStore()

function tapSubject(sub: SubjectMeta): void {
  if (sub.status === 'live') router.push(`/s/${sub.id}`)
}
</script>

<template>
  <div class="picker">
    <!-- 安装提示条（F16）：没装到主屏幕时从第一次打开就在首页顶上，标题之上 -->
    <InstallBar />
    <section class="hero" aria-label="battle">
      <span class="hero-icons" aria-hidden="true"><span v-for="s in SKINS" :key="s.id">{{ s.icon }}</span></span>
      <p class="hero-line"><RubyText :text="{ k: 'battle.hero' }" /></p>
    </section>
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
      <p class="about-open">{{ ui('open.claim') }}</p>
      <p class="about-actions">
        <a :href="REPO_URL" target="_blank" rel="noopener">{{ ui('open.repo') }} ↗</a>
        <button type="button" class="share-btn" @click="shareStore.share()">{{ ui('share.link') }}</button>
        <button type="button" class="contact-btn" @click="contactOpen = true">{{ ui('contact.link') }}</button>
      </p>
    </footer>
    <ContactSheet v-if="contactOpen" @close="contactOpen = false" />
  </div>
</template>

<style scoped>
.hero {
  margin: 12px 0 4px;
  padding: 14px 16px 12px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 2px solid var(--c-primary);
  text-align: center;
}
.hero-icons {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 30px;
  line-height: 1.2;
}
.hero-line {
  margin: 8px auto 0;
  max-width: 24em;
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-primary-dark);
  /* 手机上折成两行时让两行均分（不要「赢！」单独一行） */
  text-wrap: balance;
}
.about-help {
  margin: 4px 0 8px;
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
.about-open {
  max-width: 560px;
  margin: 12px auto 0;
  line-height: 1.5;
}
.about-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0 18px;
  margin-top: 2px;
}
/* 三个动作长得一样：GitHub 是链接，分享 / 联系站长是按钮（点了弹面板而不是跳走） */
.about-actions a,
.about-actions button {
  padding: 8px 4px;
  background: none;
  color: var(--c-text);
  font-size: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
