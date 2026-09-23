<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Question } from '@/types/models'
import { ROUND_SIZE, buildSession, hasGenerator } from '@/engine'
import { findKp, getCourse, mapPathOf, nextKp, practicePathOf } from '@/engine/catalog'
import { answerLabel, checkAnswer } from '@/engine/answer'
import { tenFrameProps } from '@/content/math/shared/demo'
import { kpTitleKey, lang, ui } from '@/engine/i18n'
import { RIGHT_KEYS, answerSpeech, phraseSpeech, questionSpeech, rightSpeech, summarySpeech } from '@/engine/speech'
import { hush, say, warmUp } from '@/engine/voice'
import { useProgressStore } from '@/stores/progress'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import { hasBlank, type BlankFill } from '@/components/practice/blank'
import SessionSummary from '@/components/practice/SessionSummary.vue'
import CelebrationOverlay from '@/components/ui/CelebrationOverlay.vue'
import TenFrame from '@/components/math/TenFrame.vue'
import BigButton from '@/components/ui/BigButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import RubyText from '@/components/ui/RubyText.vue'

const TOTAL = ROUND_SIZE

const route = useRoute()
const router = useRouter()
const progress = useProgressStore()

const subjectId = String(route.params.subjectId)
const gradeId = String(route.params.gradeId)
const kpId = String(route.params.kpId)
const course = getCourse(subjectId, gradeId)
const kp = course ? findKp(course, kpId) : undefined
const ready = kp !== undefined && hasGenerator(kpId)
/** 返回地图：带上这个知识点所在的册（下册的题回到下册页签）；知识点不存在就回这门课的地图 */
const mapPath = ready ? mapPathOf(kpId) : `/s/${subjectId}/g/${gradeId}`
if (!ready) router.replace(course ? mapPath : '/')
/** 结算页「下一章」：本册目录里的下一个知识点（同对战，B9）；最后一个 → null */
const nextId = ready ? nextKp(kpId) : null

// 上次做到一半的那一轮：同一个 seed 复现同一组题，从断点接着做；没有或已做满就开新的一轮（重新计数）
const paused = ready && !progress.isRoundFinished(kpId) ? progress.roundOf(kpId) : undefined
if (ready && !paused) progress.startRound(kpId, newSeed())
const questions = ref<Question[]>(ready ? buildSession(kpId, TOTAL, { seed: progress.roundOf(kpId)!.seed }) : [])
/** 这一轮逐题的对错（断点续做时从存储恢复），进度点按它上色 */
const results = ref<boolean[]>(paused ? paused.results.slice(0, questions.value.length) : [])
const index = ref(results.value.length)
const correctCount = computed(() => results.value.filter(Boolean).length)
const phase = ref<'answer' | 'right' | 'wrong' | 'summary'>('answer')

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}
const revealed = ref<{ correctId: string; selectedId: string } | null>(null)

const current = computed(() => questions.value[index.value])

// 答案填在题目里（U5，blank.ts）：算式有「?」或有竖式的数字键盘题，按的数字直接显示在空里，键盘不画显示框
const typed = ref('')
const blank = computed(() => !!current.value && hasBlank(current.value))
const fill = computed<BlankFill | null>(() => {
  const q = current.value
  if (!blank.value || !q) return null
  if (phase.value === 'wrong') return { value: q.answer.kind === 'number' ? String(q.answer.value) : '', done: true }
  return { value: typed.value, done: phase.value === 'right' }
})
watch(() => current.value?.id, () => (typed.value = ''))

// ── 朗读：进题自动读题干（页面切换动画结束后再开口），答错报答案，答对夸一句，结算报成绩 ──
function readQuestion(delayMs = 0): void {
  if (current.value) say(questionSpeech(current.value, lang.value), lang.value, delayMs)
}

/** 这一轮要读的片段先预解码，起播不卡：题干、答案，还有「答对夸一句」三句与结算句（不然第一次答对时才冷取） */
function prepareVoice(): void {
  const tokens = questions.value.flatMap((q) => [
    ...questionSpeech(q, lang.value),
    ...answerSpeech(q, lang.value),
  ])
  for (const key of RIGHT_KEYS) tokens.push(...phraseSpeech({ k: key }, lang.value))
  tokens.push(...summarySpeech(questions.value.length, lang.value))
  warmUp(tokens, lang.value)
}

prepareVoice()
watch(
  () => current.value?.id,
  (id, prev) => {
    if (id) readQuestion(prev === undefined ? 350 : 150)
  },
  { immediate: true },
)
// 切语言：这一轮题目换了语言，重新预解码并把当前题再读一遍
watch(lang, () => {
  prepareVoice()
  if (phase.value === 'answer') readQuestion()
})
onBeforeUnmount(hush)

// 答对后自动下一题的计时器；中途离开页面要清掉，别让它在卸载后还去改状态
let nextTimer = 0
onBeforeUnmount(() => window.clearTimeout(nextTimer))

function onAnswer(given: unknown): void {
  const q = current.value
  if (phase.value !== 'answer' || !q) return
  const ok = checkAnswer(q, given)
  results.value.push(ok)
  progress.answer(kpId, ok)
  if (q.input === 'choice' && q.answer.kind === 'choice') {
    revealed.value = { correctId: q.answer.choiceId, selectedId: String(given) }
  }
  if (ok) {
    phase.value = 'right'
    say(rightSpeech(lang.value), lang.value)
    nextTimer = window.setTimeout(next, 1400)
  } else {
    phase.value = 'wrong'
    say(answerSpeech(q, lang.value), lang.value)
  }
}

function next(): void {
  revealed.value = null
  if (index.value + 1 >= questions.value.length) {
    finish()
    return
  }
  index.value += 1
  phase.value = 'answer'
}

function finish(): void {
  // 做完整轮练习即视为「已完成」（不看正确率）。
  progress.finishRound(kpId)
  phase.value = 'summary'
  say(summarySpeech(correctCount.value, lang.value), lang.value, 300)
}

function retry(): void {
  const seed = newSeed()
  progress.startRound(kpId, seed)
  questions.value = buildSession(kpId, TOTAL, { seed })
  results.value = []
  index.value = 0
  revealed.value = null
  phase.value = 'answer'
  prepareVoice()
  // 新一轮的第一题 id 可能与上一轮相同，watch 不会触发，这里主动读一遍
  readQuestion(150)
}
</script>

<template>
  <div v-if="kp" class="practice">
    <PageHeader :back="mapPath">
      <template #title>
        <span class="kp-icon">{{ kp.icon }}</span>
        <RubyText :text="{ k: kpTitleKey(kp) }" />
      </template>
      <!-- 进度点：答对绿、答错红、当前橙、没做的灰 -->
      <div class="dots">
        <span
          v-for="(q, i) in questions"
          :key="q.id"
          class="dot"
          :class="{
            right: results[i] === true,
            wrong: results[i] === false,
            now: i === index && phase !== 'summary',
          }"
        />
      </div>
    </PageHeader>

    <section v-if="phase !== 'summary' && current" class="stage">
      <!-- 点读：喇叭贴在题干第一行开头，点题目任意位置再听一遍（别放独立按钮在题目和作答区之间，会被当成题目的一部分） -->
      <div
        class="question"
        role="button"
        tabindex="0"
        :aria-label="ui('practice.replay')"
        @click="readQuestion()"
        @keydown.enter.prevent="readQuestion()"
      >
        <QuestionRenderer :key="current.id" :question="current" :fill="fill" with-speaker />
      </div>

      <div v-if="phase === 'wrong'" class="wrong-panel">
        <p class="wrong-title">
          <RubyText :text="{ k: 'practice.answerIs' }" />
          <strong><RubyText :text="answerLabel(current)" /></strong>
        </p>
        <TenFrame
          v-if="current.explain"
          :key="`explain-${current.id}`"
          v-bind="tenFrameProps(current.explain)"
          auto-demo
        />
        <BigButton color="blue" @click="next"><RubyText :text="{ k: 'practice.gotit' }" /></BigButton>
      </div>

      <!-- 选择题答题后保留卡片以显示对错颜色；数字键盘答错后隐藏，让位给讲解面板 -->
      <AnswerPanel
        v-if="phase === 'answer' || current.input === 'choice'"
        :key="`panel-${current.id}`"
        :question="current"
        :revealed="revealed"
        :hide-display="blank"
        @answer="onAnswer"
        @input="(v: string) => (typed = v)"
      />
    </section>

    <SessionSummary
      v-if="phase === 'summary'"
      :correct="correctCount"
      :total="questions.length"
      :next="nextId"
      @next="nextId && router.push(practicePathOf(nextId))"
      @retry="retry"
      @home="router.push(mapPath)"
    />

    <CelebrationOverlay :show="phase === 'right'" />
  </div>
</template>

<style scoped>
/* 上下都收紧一点（U1，2026-09-23）：题目、教具与作答区尽量一屏放下，答错时「我知道了」也不用往下滚。
   只改这一页的留白与字号，组件本身（对战竞技场也在用）不动，所以下面几处用 :deep() */
.practice {
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 16px;
}
.practice :deep(.page-header) {
  gap: 10px;
  padding: 2px 16px 4px;
}
.practice :deep(.page-header .body) {
  gap: 2px;
}
.practice :deep(.page-header .back) {
  width: 44px;
  height: 44px;
}
/* 标题：手机上小一号，常见的知识点名一行放得下（「用 2~6 的乘法口诀求商」原来折成两行、还从「乘法」中间断开）。
   拼音两边的留白别收：试过收窄 / 负外边距，「乘减」这种两个宽拼音挨着的会粘成「chéngjiǎn」 */
.practice :deep(.page-header .title) {
  font-size: clamp(19px, 5.2vw, var(--fs-lg));
  gap: 6px;
  line-height: 1.2;
}
.kp-icon {
  flex: none;
}
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 2px 0;
}
.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--c-line);
}
.dot.right {
  background: var(--c-green);
}
.dot.wrong {
  background: var(--c-red);
}
.dot.now {
  background: var(--c-primary);
  transform: scale(1.2);
}
.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 8px 16px 0;
}
.question {
  max-width: 100%;
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: transform 0.08s ease;
}
.question:active {
  transform: scale(0.985);
}
.question :deep(.stem) {
  gap: 10px;
}
/* 算式按屏宽缩（手机上 56px 的「35 + 24 = ?」会把「?」挤到第二行）；竖式同样 */
.question :deep(.stem-expr) {
  font-size: min(var(--fs-huge), 12vw);
  line-height: 1.3;
}
.question :deep(.stem-expr.long) {
  font-size: min(40px, 9.5vw);
}
.question :deep(.vertical) {
  font-size: min(var(--fs-huge), 11vw);
  padding: 6px 16px 8px;
}
/* 竖式：行距收一点（答案行现在写着按的数字，不再是一大块空白）；上面的横式只是提示，小一号 */
.question :deep(.vertical .row) {
  line-height: 1.2;
}
.question :deep(.vertical .digit.blank) {
  height: 1.2em;
}
.question :deep(.stem:has(.vertical) .stem-expr) {
  font-size: min(40px, 9vw);
}
/* 比多少 / 排成几行的实物：手机上格子最大 34px、行距收窄（乘加看图题 4 排 × 5 个原来就占掉半屏） */
@media (max-width: 600px) {
  .question :deep(.compare) {
    --cell: min(34px, calc((100vw - 56px) / var(--cols-max, 1)));
    gap: 4px;
    padding: 6px 12px;
  }
}
/* 竖排的队伍（从上往下数）：格子和间距小一点 */
.question :deep(.lineup.col) {
  gap: 4px;
  padding: 8px;
}
.question :deep(.lineup-wrap.col) {
  gap: 2px;
}
.question :deep(.lineup.col .slot) {
  height: 48px;
}
.wrong-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: var(--c-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  max-width: 100%;
  padding: 10px 24px 14px;
}
/* 手机上答错讲解的十格阵（格子 + 右边的蓝点约 358px）连同左右留白会比屏幕宽：留白收窄、十格阵缩一点 */
@media (max-width: 440px) {
  .wrong-panel {
    padding: 10px 12px 14px;
  }
  .wrong-panel :deep(.tenframe) {
    zoom: 0.9;
  }
}
.wrong-title {
  font-size: var(--fs-lg);
  line-height: 1.4;
}
.wrong-title strong {
  color: var(--c-green);
  font-size: var(--fs-xl);
}
/* 数字键盘：显示框矮一点，键仍是 64px（--tap-min） */
.stage :deep(.numpad) {
  gap: 10px;
}
.stage :deep(.numpad .display) {
  padding: 0 24px;
  font-size: 48px;
  line-height: 1.25;
}
/* 矮一点的手机（带教具的文字题还要显示框）：显示框再矮一档 */
@media (max-height: 820px) {
  .stage :deep(.numpad) {
    gap: 8px;
  }
  .stage :deep(.numpad .display) {
    font-size: 40px;
    line-height: 1.15;
  }
}
.stage :deep(.numpad .grid) {
  gap: 8px;
}
/* 选项卡：卡与卡之间、卡里上下的留白收一点（注音的行高不动，不然拼音会顶到卡的边框），卡仍 ≥ 72px */
.stage :deep(.cards) {
  gap: 10px;
}
.stage :deep(.cards .card) {
  min-height: 72px;
  padding: 2px 10px;
}
</style>
