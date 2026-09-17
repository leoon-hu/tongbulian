<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Question } from '@/types/models'
import { ROUND_SIZE, buildSession, hasGenerator } from '@/engine'
import { findKp, getCourse } from '@/engine/catalog'
import { answerLabel, checkAnswer } from '@/engine/answer'
import { tenFrameProps } from '@/content/math/shared/demo'
import { kpTitleKey, lang, ui } from '@/engine/i18n'
import { answerSpeech, questionSpeech, rightSpeech, summarySpeech } from '@/engine/speech'
import { hush, say, warmUp } from '@/engine/voice'
import { useProgressStore } from '@/stores/progress'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
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
const mapPath = `/s/${subjectId}/g/${gradeId}`
const course = getCourse(subjectId, gradeId)
const kp = course ? findKp(course, kpId) : undefined
const ready = kp !== undefined && hasGenerator(kpId)
if (!ready) router.replace(course ? mapPath : '/')

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

// ── 朗读：进题自动读题干（页面切换动画结束后再开口），答错报答案，答对夸一句，结算报成绩 ──
function readQuestion(delayMs = 0): void {
  if (current.value) say(questionSpeech(current.value, lang.value), lang.value, delayMs)
}

/** 这一轮要读的片段先预解码，起播不卡 */
function prepareVoice(): void {
  const tokens = questions.value.flatMap((q) => [
    ...questionSpeech(q, lang.value),
    ...answerSpeech(q, lang.value),
  ])
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
        <QuestionRenderer :key="current.id" :question="current" with-speaker />
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
        @answer="onAnswer"
      />
    </section>

    <SessionSummary
      v-if="phase === 'summary'"
      :correct="correctCount"
      :total="questions.length"
      @retry="retry"
      @home="router.push(mapPath)"
    />

    <CelebrationOverlay :show="phase === 'right'" />
  </div>
</template>

<style scoped>
.practice {
  max-width: 720px;
  margin: 0 auto;
  padding-bottom: 32px;
}
.kp-icon {
  flex: none;
}
.dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.dot {
  width: 14px;
  height: 14px;
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
  gap: 24px;
  padding: 24px 16px 0;
}
.question {
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: transform 0.08s ease;
}
.question:active {
  transform: scale(0.985);
}
.wrong-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background: var(--c-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: 20px 28px;
}
.wrong-title {
  font-size: var(--fs-lg);
}
.wrong-title strong {
  color: var(--c-green);
  font-size: var(--fs-xl);
}
</style>
