<script setup lang="ts">
// 帮助页（需求 F17）：学习内容 / 题目、对战玩法、规则、技巧、常见问题。内容在 help/content.ts，随语言切换；
// 给家长看的说明文字，不注音（与安装步骤面板同一类）；每节有锚点，设置页的「怎么玩」直接跳到规则。
import { computed, nextTick, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { lang, ui } from '@/engine/i18n'
import { HELP_LEAD, HELP_TITLE, helpGames, helpSections } from '@/help/content'
import PageHeader from '@/components/ui/PageHeader.vue'

const route = useRoute()
const sections = computed(() => helpSections(lang.value))
const games = computed(() => helpGames(lang.value))

function jump(): void {
  const id = route.hash.replace(/^#/, '')
  if (!id) return
  nextTick(() => document.getElementById(`help-${id}`)?.scrollIntoView({ block: 'start' }))
}
onMounted(jump)
watch(() => route.hash, jump)
</script>

<template>
  <div class="help">
    <PageHeader back="/" :title="HELP_TITLE[lang]" />
    <p class="lead">{{ HELP_LEAD[lang] }}</p>
    <nav class="toc" :aria-label="HELP_TITLE[lang]">
      <a v-for="s in sections" :key="s.id" :href="`#/help#${s.id}`">{{ s.icon }} {{ s.title }}</a>
    </nav>
    <section v-for="s in sections" :id="`help-${s.id}`" :key="s.id" class="sec">
      <h2><span class="icon" aria-hidden="true">{{ s.icon }}</span>{{ s.title }}</h2>
      <template v-for="(b, i) in s.blocks" :key="i">
        <p v-if="b.kind === 'p'">{{ b.text }}</p>
        <ul v-else-if="b.kind === 'list'">
          <li v-for="(item, j) in b.items" :key="j">{{ item }}</li>
        </ul>
        <ol v-else-if="b.kind === 'steps'">
          <li v-for="(item, j) in b.items" :key="j">{{ item }}</li>
        </ol>
        <div v-else-if="b.kind === 'games'" class="games">
          <div v-for="g in games" :key="g.id" class="game">
            <span class="game-name"><span class="game-icon">{{ g.icon }}</span>{{ g.name }}</span>
            <span class="game-rule">{{ g.rule }}</span>
          </div>
        </div>
        <dl v-else-if="b.kind === 'faq'" class="faq">
          <template v-for="(item, j) in b.items" :key="j">
            <dt>{{ item.q }}</dt>
            <dd>{{ item.a }}</dd>
          </template>
        </dl>
      </template>
    </section>
    <p class="foot"><RouterLink to="/">{{ ui('nav.home') }}</RouterLink></p>
  </div>
</template>

<style scoped>
.help {
  max-width: 760px;
  margin: 0 auto;
  padding: 0 16px 48px;
  font-size: var(--fs-md);
  line-height: 1.7;
}
.lead {
  color: var(--c-text-light);
  margin: 4px 0 12px;
}
.toc {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.toc a {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  text-decoration: none;
  font-weight: 700;
}
.sec {
  margin-top: 24px;
  padding: 16px 18px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.sec h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  font-size: var(--fs-lg);
}
.sec p {
  margin: 0 0 10px;
}
.sec ul,
.sec ol {
  margin: 0 0 10px;
  padding-left: 1.4em;
}
.sec li {
  margin: 4px 0;
}
.games {
  display: grid;
  gap: 8px;
  margin: 8px 0 4px;
}
.game {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) 3fr;
  gap: 4px 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.game-name {
  font-weight: 800;
}
.game-icon {
  margin-right: 6px;
}
.game-rule {
  color: var(--c-text);
}
.faq {
  margin: 0;
}
.faq dt {
  font-weight: 800;
  margin-top: 10px;
}
.faq dd {
  margin: 2px 0 0;
  color: var(--c-text);
}
.foot {
  margin-top: 24px;
  text-align: center;
}
.foot a {
  color: var(--c-primary-dark);
  font-weight: 700;
}
@media (max-width: 520px) {
  .game {
    grid-template-columns: 1fr;
  }
}
</style>
