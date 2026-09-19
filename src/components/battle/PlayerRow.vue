<script setup lang="ts">
// 队区里的一行 = 一个人：名字 + 答 n · 对 m（连对 2 题起有 🔥 ×n），题干（注音 + 🔊），
// 自己可操作的行是作答面板；别人的行是「作答显示」（WatchInput，机器人带表情）；答完一题先显示对错（反馈窗口）再换下一题。
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Question } from '@/types/models'
import type { Player } from '@/battle/protocol'
import type { Feedback } from '@/stores/battle'
import { answerLabel } from '@/engine/answer'
import { lang, ui } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { hush, say } from '@/engine/voice'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'
import AnswerPanel from '@/components/practice/AnswerPanel.vue'
import RubyText from '@/components/ui/RubyText.vue'
import WatchInput from './WatchInput.vue'

const props = defineProps<{
  player: Player
  /** 正在答的题（反馈窗口期间是刚答完的那道）；倒数阶段为 null */
  question: Question | null
  feedback: Feedback | null
  operable: boolean
  /** 进题自动读（打机器人 / 多设备时每台设备只有一个真人才开；两人同屏不开，点 🔊 才读） */
  autoRead: boolean
  /** 队里只有他一个：名字已在队名条上，行里不再重复 */
  solo: boolean
  /** 手机横屏紧凑版（B29）：题干与作答面板左右并排，数字键盘的显示框挪到题干这一栏 */
  compact?: boolean
}>()
const emit = defineEmits<{ answer: [given: unknown]; input: [value: string] }>()

/** 紧凑版自己画的显示框内容（跟着键盘的 input 事件） */
const typed = ref('')
function onInput(v: string): void {
  typed.value = v
  emit('input', v)
}

const displayName = computed(() => (props.player.kind === 'ai' ? ui('battle.robot') : props.player.name))
/** 机器人的表情（B11）：想题 / 在按 / 答对 / 答错 */
const mood = computed(() => {
  if (props.player.kind !== 'ai') return undefined
  if (props.feedback) return props.feedback.correct ? '😄' : '😅'
  return props.player.input ? '🤖' : '🤔'
})

function read(): void {
  if (props.question) say(questionSpeech(props.question, lang.value), lang.value)
}

// ── 题干按栏自动缩放：十格阵、排队这些教具有固定尺寸，栏太窄（手机半栏）或太矮（iPad 上方横条占了高度）
//    放不下就整体缩小（zoom 影响布局，宽高一起缩），最大 0.85（紧凑版）/ 1，最小 0.5（再小看不清，宁可滚动）；
//    别让它横向溢出被居中裁掉两边、也别让十格阵藏在要滚动才看得到的地方
const qEl = ref<HTMLElement | null>(null)
const qZoom = ref(1)
const MIN_ZOOM = 0.5
function fitQuestion(): void {
  const q = qEl.value
  const stem = q?.querySelector<HTMLElement>('.stem')
  const body = q?.parentElement
  if (!q || !stem || !body) return
  const max = props.compact ? 0.85 : 1
  // offsetWidth / offsetHeight 是元素自己坐标系里的尺寸，不受 zoom 影响，就是原始大小
  let naturalW = 0
  for (const c of Array.from(stem.children) as HTMLElement[]) naturalW = Math.max(naturalW, c.offsetWidth, c.scrollWidth)
  const naturalH = stem.offsetHeight
  const availW = q.clientWidth
  // 紧凑版题干与作答面板左右并排，高度就是整行；否则要给下面的作答面板留出位置
  const a = body.querySelector<HTMLElement>(':scope > .a')
  const typed = q.querySelector<HTMLElement>(':scope > .typed')
  // 各留几像素余量，免得四舍五入后最后一行被裁掉一条边
  const availH = body.clientHeight - (props.compact ? 0 : (a?.offsetHeight ?? 0) + 10) - (typed?.offsetHeight ?? 0) - 6
  let z = max
  if (naturalW > 0 && availW > 0) z = Math.min(z, (availW - 4) / naturalW)
  if (naturalH > 0 && availH > 0) z = Math.min(z, availH / naturalH)
  qZoom.value = Math.max(MIN_ZOOM, Math.floor(z * 100) / 100)
}
let ro: ResizeObserver | null = null
onMounted(() => {
  fitQuestion()
  if (typeof ResizeObserver !== 'undefined' && qEl.value) {
    ro = new ResizeObserver(() => fitQuestion())
    ro.observe(qEl.value)
  }
})
watch(
  () => [props.question?.id, props.player.index, props.compact] as const,
  () => {
    qZoom.value = props.compact ? 0.85 : 1
    nextTick(fitQuestion)
  },
)
onBeforeUnmount(() => ro?.disconnect())

watch(
  () => [props.question?.id, props.feedback === null, props.player.index] as const,
  ([id, free]) => {
    typed.value = ''
    if (props.autoRead && id && free) say(questionSpeech(props.question!, lang.value), lang.value, 150)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (props.autoRead) hush()
})
</script>

<template>
  <div class="row" :class="[player.team, { operable, offline: !player.online }]">
    <div class="row-head">
      <span v-if="!solo" class="name">{{ displayName }}</span>
      <span class="stats">{{ ui('battle.stats', { n: player.index, m: player.correct }) }}</span>
      <span v-if="player.streak >= 2" :key="player.streak" class="streak" :title="ui('battle.streakBadge')">🔥 ×{{ player.streak }}</span>
      <span v-if="!player.online" class="off">📶 <RubyText :text="{ k: 'room.offline' }" /></span>
    </div>
    <div v-if="question" class="row-body">
      <div
        ref="qEl"
        class="q"
        :style="{ '--qzoom': qZoom }"
        role="button"
        tabindex="0"
        :aria-label="ui('practice.replay')"
        @click="read"
        @keydown.enter.prevent="read"
      >
        <QuestionRenderer :key="`${player.index}-${question.id}`" :question="question" with-speaker />
        <div
          v-if="compact && operable && !feedback && question.input === 'numpad'"
          :key="`typed-${player.index}`"
          class="typed"
          :class="{ empty: !typed }"
        >
          {{ typed || '?' }}
        </div>
      </div>
      <div class="a">
        <div v-if="feedback" class="feedback" :class="feedback.correct ? 'right' : 'wrong'">
          <span class="mark">{{ feedback.correct ? '✅' : '❌' }}</span>
          <p v-if="!feedback.correct" class="answer">
            <RubyText :text="{ k: 'practice.answerIs' }" />
            <strong><RubyText :text="answerLabel(feedback.question)" /></strong>
          </p>
          <span v-if="feedback.correct && player.kind === 'ai'" class="ai-mood" aria-hidden="true">😄</span>
          <span v-else-if="player.kind === 'ai'" class="ai-mood" aria-hidden="true">😅</span>
        </div>
        <AnswerPanel
          v-else-if="operable"
          :key="`panel-${player.index}`"
          :question="question"
          :revealed="null"
          :hide-display="compact"
          :layout="compact ? 'grid' : 'wide'"
          @answer="(g) => emit('answer', g)"
          @input="onInput"
        />
        <WatchInput v-else :key="`watch-${player.index}`" :question="question" :input="player.input" :mood="mood" />
      </div>
    </div>
    <p v-else class="waiting"><RubyText :text="{ k: 'battle.ready' }" /></p>
  </div>
</template>

<style scoped>
/* 多设备里掉线的人（B23）：行头标一下，行变淡；比赛不暂停 */
.row.offline {
  opacity: 0.7;
}
.off {
  margin-left: auto;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
/* 行是竖向 flex：题干可以被压缩、内部滚动，作答面板不压缩——键盘永远在视野里，不用滚下去找 */
.row {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  background: var(--team-soft);
  border: 2px solid var(--team-line);
}
/* 队色变量由 TeamPanel 定义；单独挂载（测试 / 截图）时这里兜底 */
.row.red {
  --team: var(--c-red);
  --team-dark: #d94c4c;
  --team-soft: #fff1ef;
  --team-line: #ffb8b8;
}
.row.blue {
  --team: var(--c-blue);
  --team-dark: #2f7fd6;
  --team-soft: #edf5ff;
  --team-line: #b3d6ff;
}
.row.operable {
  box-shadow: var(--shadow-card);
  border-color: var(--team);
}
/* 按钮和底色分得开（B32，2026-09-20 用户提的）：选项卡 / 数字键白底、队色描边、队色底边，像立体的键；按下往下沉 */
.row :deep(.cards .card:not(.correct):not(.wrong):not(.picked)),
.row :deep(.numpad .key:not(.ok)) {
  background: #fff;
  border: 2px solid var(--team-line);
  box-shadow:
    0 4px 0 var(--team-dark),
    0 6px 10px rgba(61, 44, 30, 0.1);
}
.row :deep(.cards .card:not(:disabled):active),
.row :deep(.numpad .key:not(.ok):active) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--team-dark);
}
.row :deep(.numpad .key.ok) {
  border: 2px solid #2fbf7f;
  box-shadow:
    0 4px 0 #229a63,
    0 6px 10px rgba(61, 44, 30, 0.1);
}
.row :deep(.numpad .key.ok:active) {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #229a63;
}
.row :deep(.numpad .key.ok:disabled) {
  border-color: var(--c-locked);
  box-shadow: 0 4px 0 #bfb5a8;
}
.row-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.name {
  font-weight: 800;
  color: var(--c-text);
}
.stats {
  flex: 1;
}
.streak {
  font-weight: 900;
  color: var(--c-primary-dark);
  animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.row-body {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.q {
  flex: 0 1 auto;
  min-height: 0;
  overflow: hidden auto;
  cursor: pointer;
  border-radius: var(--radius-md);
  width: 100%;
  transition: transform 0.08s ease;
}
.q:active {
  transform: scale(0.985);
}
.a {
  flex: none;
  width: 100%;
  display: flex;
  justify-content: center;
}
.feedback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px;
  animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mark {
  font-size: 48px;
  line-height: 1;
}
.feedback.right .mark {
  animation: bounce 0.5s ease;
}
.answer {
  font-size: var(--fs-md);
  text-align: center;
}
.answer strong {
  color: var(--c-green);
  font-size: var(--fs-lg);
  margin-left: 0.3em;
}
.ai-mood {
  font-size: 40px;
  line-height: 1;
}
.waiting {
  text-align: center;
  color: var(--c-text-light);
  padding: 20px 0;
}
@keyframes pop {
  from {
    transform: scale(0.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes bounce {
  0% {
    transform: scale(0.5) rotate(-20deg);
  }
  60% {
    transform: scale(1.3) rotate(8deg);
  }
  100% {
    transform: scale(1) rotate(0);
  }
}
/* 手机横屏紧凑版（B29）：题干与作答面板左右并排 */
.compact .row {
  padding: 6px 8px;
  gap: 4px;
}
.compact .row-head {
  font-size: 13px;
}
.compact .row-body {
  flex-direction: row;
  align-items: flex-start;
}
.compact .q {
  flex: 0 0 50%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
/* 题干按栏宽缩放（--qzoom 由 fitQuestion 算）；显示框贴在这一栏底部，题干再高也看得见 */
.q :deep(.stem) {
  zoom: var(--qzoom, 1);
}
.typed {
  position: sticky;
  bottom: 0;
  flex: none;
  min-width: 96px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 2px dashed var(--c-primary);
  font-size: var(--fs-huge);
  font-weight: 800;
  text-align: center;
  color: var(--c-primary-dark);
  line-height: 1.5;
}
.typed.empty {
  color: var(--c-locked);
}
.compact .a {
  flex: 1;
  min-width: 0;
  max-height: 100%;
  overflow: auto;
}
/* 紧凑版的选项卡：矮一点；文字长的排成一列，别在窄卡片里折成三行 */
.compact .a :deep(.cards) {
  gap: 8px;
}
.compact .a :deep(.cards .card) {
  min-height: 60px;
  font-size: var(--fs-lg);
}
.compact .a :deep(.cards.wordy) {
  grid-template-columns: 1fr;
  gap: 6px;
}
.compact .a :deep(.cards.wordy .card) {
  min-height: 44px;
  font-size: var(--fs-md);
  padding: 2px 8px;
}
/* 紧凑版的观看行：表情缩小、去掉「想一想」文字（表情已经在想了）、选项卡矮一点，别把作答栏撑出去 */
.compact .ai-mood,
.compact .a :deep(.mood) {
  font-size: 26px;
}
.compact .a :deep(.watch) {
  gap: 6px;
}
.compact .a :deep(.thinking) {
  display: none;
}
</style>
