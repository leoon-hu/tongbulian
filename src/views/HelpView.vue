<script setup lang="ts">
// 帮助页（需求 F17）：学习内容 / 题目、对战玩法、规则、技巧、常见问题。内容在 help/content.ts，随语言切换；
// 给家长看的说明文字，不注音（与安装步骤面板同一类）；每节有锚点，设置页的「怎么玩」直接跳到规则。
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { lang, ui } from '@/engine/i18n'
import { HELP_LEAD, HELP_TITLE, helpGames, helpSections } from '@/help/content'
import { checkForUpdate, reinstall, type UpdateCheck } from '@/engine/sw'
import { useOfflineStore } from '@/stores/offline'
import PageHeader from '@/components/ui/PageHeader.vue'

const route = useRoute()
const sections = computed(() => helpSections(lang.value))
const games = computed(() => helpGames(lang.value))

// 版本与更新（N8 ⑦）：当前版本 + 检查更新 + 重装；离线朗读包下到哪了
const offline = useOfflineStore()
const checking = ref(false)
const checked = ref<UpdateCheck | null>(null)
async function check(): Promise<void> {
  if (checking.value) return
  checking.value = true
  checked.value = null
  try {
    checked.value = await checkForUpdate()
  } finally {
    checking.value = false
  }
}
function redo(): void {
  void reinstall({ sw: typeof navigator === 'undefined' ? null : ((navigator.serviceWorker as unknown as Parameters<typeof reinstall>[0]['sw']) ?? null), reload: () => location.reload() })
}
const builtAt = __BUILT_AT__
const offlineLine = computed(() => {
  const r = offline.last
  const name = lang.value === 'zh' ? '中文' : 'English'
  if (!r) return ui('help.offlineWait')
  if (r.cached >= r.total && r.total > 0) return ui('help.offlineDone', { lang: name })
  return ui('help.offline', { lang: name, cached: r.cached, total: r.total })
})

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
            <dd>{{ item.a }}<template v-if="item.link"> <a :href="item.link.url" target="_blank" rel="noopener">{{ item.link.text }} ↗</a></template></dd>
          </template>
        </dl>
      </template>
    </section>
    <section id="help-version" class="sec version">
      <h2><span class="icon" aria-hidden="true">🔄</span>{{ ui('help.version') }} {{ builtAt }}</h2>
      <p class="offline-line">{{ offlineLine }}</p>
      <p class="actions">
        <button type="button" class="act" :disabled="checking" @click="check">{{ checking ? ui('help.checking') : ui('help.check') }}</button>
        <button type="button" class="act ghost" @click="redo">{{ ui('help.reinstall') }}</button>
      </p>
      <p v-if="checked" class="status" role="status">{{ ui(`help.${checked}`) }}</p>
      <p class="hint">{{ ui('help.reinstallHint') }}</p>
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

.version .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.version .act {
  min-height: var(--tap-min);
  padding: 0 22px;
  border: 0;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font: inherit;
  font-weight: 700;
}
.version .act.ghost {
  background: #fff;
  color: var(--c-primary-dark);
  box-shadow: inset 0 0 0 2px var(--c-primary);
}
.version .act:disabled {
  opacity: 0.6;
}
.version .status {
  font-weight: 700;
}
.version .hint,
.version .offline-line {
  color: var(--c-text-light);
  font-size: 15px;
}
</style>
