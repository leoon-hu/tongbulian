<script setup lang="ts">
// 打怪兽的结果页（M7）：上面一张战报卡——左边横幅（一起打：一起打倒了几次 + 星星；各打各的：比分 + 胜方 👑 / 平手）与每人一行
// （小动物、得分、答对几题、最高连击、合力拳），右边「下一章 / 再来一局 / 不玩了」（同 B9）+ 分享；
// 卡片下面是得分走势（每人一条折线）与我的错题（同 B69，点了朗读，「再练一遍」）。
import { computed } from 'vue'
import type { Team } from '@/battle/protocol'
import { downsOf, starsFor, teamScore, topScorers, totalDowns, STARS_MAX, type TimedMatch, type TimedPlayer } from '@/battle/timed'
import { questionAt } from '@/battle/stream'
import { avatarEmoji } from '@/battle/avatars'
import { answerLabel } from '@/engine/answer'
import { lang, ui } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { courseOfKp } from '@/engine/catalog'
import { useShareStore } from '@/stores/share'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'

const props = defineProps<{
  match: TimedMatch
  /** 本册下一个知识点；null = 这一册已是最后一个 */
  next: string | null
  timeline?: readonly { t: number; id: string; score: number }[]
  wrongs?: readonly { playerId: string; index: number }[]
  /** 一个人打的成绩与本机最好成绩（M7）：isNew 时写「新纪录！」 */
  record?: { score: number; best: number | null; isNew: boolean } | null
}>()
const emit = defineEmits<{ rematch: []; next: []; quit: []; practice: [] }>()

const versus = computed(() => props.match.variant === 'versus')
const downs = computed(() => totalDowns(props.match))
/** 金色的（第 4 只起）打倒了几次：一起打那一条链上超过 STARS_MAX 的部分 */
const goldDowns = computed(() => Math.max(0, downs.value - STARS_MAX))
const stars = computed(() => starsFor(downs.value))
const solo = computed(() => props.match.players.length === 1)
const tops = computed(() => new Set(topScorers(props.match)))
const nameOf = (p: TimedPlayer): string => (p.kind === 'ai' ? ui('battle.robot') : `${avatarEmoji(p.avatar)}${p.name}`)
const sideScore = (team: Team): number => teamScore(props.match, team)
const sideName = (team: Team): string => {
  const ps = props.match.players.filter((p) => p.team === team)
  return ps.length === 1 ? nameOf(ps[0]!) : ui(`battle.team.${team}`)
}
/** 横幅的词条：一起打看打倒了几次，一次都没有是「累得跑掉了」 */
const banner = computed(() => {
  if (versus.value) return props.match.winner ? { k: `battle.win.${props.match.winner}` } : { k: 'boss.tie' }
  if (downs.value === 0) return { k: 'boss.result.none' }
  return { k: solo.value ? 'boss.result.solo' : 'boss.result.coop', p: { n: downs.value } }
})
const sortedPlayers = computed(() => [...props.match.players].sort((a, b) => b.score - a.score))

// ── 得分走势：viewBox 300 × 80，x 按时间（整段时长）、y 按分数，每人一条阶梯线 ──
const TL_W = 300
const TL_H = 80
const lines = computed(() => {
  const pts = props.timeline ?? []
  const total = Math.max(1, props.match.durationMs)
  const top = Math.max(1, ...props.match.players.map((p) => p.score))
  const x = (t: number): number => (Math.min(t, total) / total) * TL_W
  const y = (s: number): number => TL_H - (s / top) * (TL_H - 6)
  return props.match.players.map((p) => {
    let cur = 0
    const parts = [`0,${y(0)}`]
    for (const e of pts) {
      if (e.id !== p.id) continue
      parts.push(`${x(e.t)},${y(cur)}`)
      cur = e.score
      parts.push(`${x(e.t)},${y(cur)}`)
    }
    parts.push(`${TL_W},${y(cur)}`)
    return { id: p.id, team: p.team, points: parts.join(' ') }
  })
})

// ── 我的错题（同 B69）：题目由 seed + 题号重现，点了朗读 ──
const wrongList = computed(() =>
  (props.wrongs ?? []).flatMap((w) => {
    const p = props.match.players.find((x) => x.id === w.playerId)
    if (!p) return []
    return [{ key: `${w.playerId}-${w.index}`, player: p, question: questionAt(props.match.kpId, p.seed, w.index) }]
  }),
)
const manyWrongOwners = computed(() => new Set(wrongList.value.map((w) => w.player.id)).size > 1)
function readWrong(q: (typeof wrongList.value)[number]['question']): void {
  say(questionSpeech(q, lang.value), lang.value)
}

/** 分享战绩（F1）：链到这个知识点的静态页 */
const shareStore = useShareStore()
function shareResult(): void {
  const course = courseOfKp(props.match.kpId)
  const path = course ? `${course.course.subjectId}/${course.course.gradeId}/${props.match.kpId}.html` : ''
  const best = Math.max(0, ...props.match.players.filter((p) => p.kind === 'human').map((p) => p.score))
  void shareStore.share(ui('share.boss', { kp: ui(`kp.${props.match.kpId}`), score: best, n: downs.value }), path)
}
</script>

<template>
  <div class="result">
    <div class="card" :class="versus ? (match.winner ?? 'tie') : 'coop'">
      <div class="summary">
        <div class="head">
          <span class="trophy" aria-hidden="true">{{ versus ? '🏆' : '🦖' }}</span>
          <h2 class="title"><RubyText :text="banner" /></h2>
        </div>
        <p v-if="!versus" class="stars" :aria-label="ui('boss.downs')">
          <span v-for="i in STARS_MAX" :key="i" class="star-slot" :class="{ on: i <= stars }">★</span>
        </p>
        <p v-if="!versus && goldDowns > 0" class="gold"><RubyText :text="{ k: 'boss.result.gold', p: { n: goldDowns } }" /></p>
        <p v-if="record && (record.isNew || record.best !== null)" class="record" :class="{ new: record.isNew }">
          <template v-if="record.isNew">
            <span class="record-badge">🏅 <RubyText :text="{ k: 'boss.record' }" /></span>
            <span v-if="record.best !== null" class="record-was"><RubyText :text="{ k: 'boss.bestWas', p: { n: record.best } }" /></span>
          </template>
          <RubyText v-else-if="record.best !== null" :text="{ k: 'boss.bestIs', p: { n: record.best } }" />
        </p>
        <p v-if="versus" class="scoreline">
          <span class="red">{{ sideName('red') }} {{ sideScore('red') }}</span>
          :
          <span class="blue">{{ sideScore('blue') }} {{ sideName('blue') }}</span>
        </p>
        <p v-if="versus" class="side-downs">
          <span class="red">🦖×{{ downsOf(match, 'red') }}</span>
          <span class="blue">🦖×{{ downsOf(match, 'blue') }}</span>
        </p>
        <ul class="stats">
          <li v-for="p in sortedPlayers" :key="p.id" :class="p.team">
            <span class="who">{{ nameOf(p) }}<template v-if="tops.has(p.id) && match.players.length > 1"> 👑</template></span>
            <span class="pts">{{ ui('boss.points', { n: p.score }) }}</span>
            <span class="meta">
              <RubyText :text="{ k: 'boss.stat.correct', p: { n: p.correct } }" /> ·
              <RubyText :text="{ k: 'boss.stat.best', p: { n: p.bestStreak } }" />
              <template v-if="!versus && match.players.length > 1"> · <RubyText :text="{ k: 'boss.stat.together', p: { n: p.together } }" /></template>
            </span>
          </li>
        </ul>
        <p v-if="match.players.length > 1 && tops.size" class="star-line">👑 <RubyText :text="{ k: 'boss.star' }" /></p>
      </div>
      <div class="side">
        <p v-if="next" class="next-hint"><RubyText :text="{ k: 'battle.next' }" />：<RubyText :text="{ k: `kp.${next}` }" /></p>
        <p v-else class="next-hint done"><RubyText :text="{ k: 'battle.lastChapter' }" /></p>
        <div class="actions">
          <BigButton v-if="next" color="green" class="next-btn" @click="emit('next')"><RubyText :text="{ k: 'battle.next' }" /> ▶</BigButton>
          <BigButton :color="next ? 'blue' : 'green'" class="rematch-btn" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
          <BigButton color="ghost" class="quit-btn" @click="emit('quit')"><RubyText :text="{ k: 'battle.quit' }" /></BigButton>
        </div>
        <button type="button" class="share-btn" @click="shareResult">📣 <RubyText :text="{ k: 'battle.share' }" /></button>
      </div>
    </div>
    <section v-if="timeline && timeline.length" class="panel trend">
      <h3 class="panel-title"><RubyText :text="{ k: 'boss.trend' }" /></h3>
      <svg class="timeline" :viewBox="`0 0 ${TL_W} ${TL_H}`" preserveAspectRatio="none" role="img" :aria-label="ui('boss.trend')">
        <line x1="0" :y1="TL_H" :x2="TL_W" :y2="TL_H" class="tl-base" />
        <polyline v-for="l in lines" :key="l.id" :points="l.points" class="tl-line" :class="l.team" />
      </svg>
    </section>
    <section v-if="wrongs" class="panel wrong">
      <h3 class="panel-title"><RubyText :text="{ k: 'battle.myWrong' }" /></h3>
      <p v-if="!wrongList.length" class="wrong-none">🎉 <RubyText :text="{ k: 'battle.noWrong' }" /></p>
      <ul v-else class="wrong-list">
        <li v-for="w in wrongList" :key="w.key" class="wrong-item" :class="w.player.team" role="button" tabindex="0" @click="readWrong(w.question)" @keydown.enter.prevent="readWrong(w.question)">
          <span v-if="manyWrongOwners" class="wrong-who">{{ nameOf(w.player) }}</span>
          <div class="wrong-q"><QuestionRenderer :question="w.question" with-speaker /></div>
          <p class="wrong-ans"><RubyText :text="{ k: 'practice.answerIs' }" /> <strong><RubyText :text="answerLabel(w.question)" /></strong></p>
        </li>
      </ul>
      <button v-if="wrongList.length" type="button" class="practice-btn" @click="emit('practice')">📖 <RubyText :text="{ k: 'battle.practiceAgain' }" /></button>
    </section>
  </div>
</template>

<style scoped>
/* 盖住竞技场的一层（同对战的结果页）：内容比屏幕高时从顶上开始滚，放得下就上下居中 */
.result {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  justify-content: safe center;
  gap: 12px;
  padding: 16px;
  background: rgba(253, 246, 236, 0.94);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
  overflow: auto;
}
.result > * {
  flex: none;
  width: min(100%, 760px);
}
.card {
  --win: var(--c-primary);
  --win-soft: #fff3e6;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 16px 20px;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  border: 3px solid var(--win);
  background: linear-gradient(160deg, var(--win-soft), var(--c-card) 55%);
  box-shadow: var(--shadow-card);
}
.card.red {
  --win: var(--c-red);
  --win-soft: #fff1ef;
}
.card.blue {
  --win: var(--c-blue);
  --win-soft: #edf5ff;
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trophy {
  font-size: 40px;
  line-height: 1;
}
.title {
  font-size: var(--fs-lg);
  font-weight: 900;
  color: var(--c-text);
  line-height: 1.5;
}
.stars {
  display: flex;
  gap: 6px;
  font-size: 34px;
  line-height: 1;
}
.star-slot {
  color: var(--c-locked);
  opacity: 0.45;
}
.star-slot.on {
  color: #f6b93b;
  opacity: 1;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.12);
}
.gold {
  font-weight: 800;
  color: #c98a00;
}
.record {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  color: var(--c-muted);
  font-weight: 700;
}
.record-badge {
  padding: 2px 12px;
  border-radius: 999px;
  background: #fff3c4;
  border: 2px solid #f6b93b;
  color: #9a6400;
  font-size: var(--fs-md);
  font-weight: 900;
  animation: record-pop 0.6s cubic-bezier(0.3, 1.6, 0.5, 1);
}
@keyframes record-pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .record-badge {
    animation: none;
  }
}
.scoreline {
  font-size: var(--fs-xl);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}
.side-downs {
  display: flex;
  gap: 16px;
  font-weight: 800;
}
/* 队色的字只给比分、打倒几只、每人一行——别写成裸的 .red / .blue：scoped 样式也会套到子组件的根元素上，
   「再来一局」按钮（BigButton color="blue"）会变成蓝底蓝字 */
.scoreline .red,
.side-downs .red,
.stats .red {
  color: var(--c-red);
}
.scoreline .blue,
.side-downs .blue,
.stats .blue {
  color: var(--c-blue);
}
.stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.stats li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  padding: 4px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
}
.stats li.red {
  box-shadow: inset 4px 0 0 var(--c-red);
}
.stats li.blue {
  box-shadow: inset 4px 0 0 var(--c-blue);
}
.who {
  font-weight: 900;
}
.pts {
  font-weight: 900;
  font-size: var(--fs-lg);
  font-variant-numeric: tabular-nums;
  color: var(--c-primary-dark);
}
.meta {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
  font-weight: 700;
}
.star-line {
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--c-text-light);
}
.side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}
.next-hint {
  font-weight: 800;
  color: var(--c-text-light);
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.actions .next-btn {
  grid-column: 1 / -1;
}
.share-btn {
  align-self: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-weight: 800;
  color: var(--c-text);
}
.panel {
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.panel-title {
  font-size: var(--fs-md);
  font-weight: 900;
  color: var(--c-primary-dark);
  margin-bottom: 8px;
}
.timeline {
  width: 100%;
  height: 90px;
}
.tl-base {
  stroke: var(--c-locked);
  stroke-width: 1;
}
.tl-line {
  fill: none;
  stroke-width: 3;
  vector-effect: non-scaling-stroke;
}
.tl-line.red {
  stroke: var(--c-red);
}
.tl-line.blue {
  stroke: var(--c-blue);
}
.wrong-none {
  font-weight: 800;
  color: var(--c-text-light);
}
.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.wrong-item {
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--c-bg);
  cursor: pointer;
}
.wrong-who {
  font-weight: 800;
}
.wrong-q {
  zoom: 0.6;
}
.wrong-ans {
  font-weight: 700;
}
.practice-btn {
  margin-top: 8px;
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-weight: 800;
}
@media (max-width: 539px) {
  .card {
    grid-template-columns: 1fr;
  }
}
/* 手机横屏（B29 的条件）：留白收一收，按钮留在第一屏 */
@media (max-height: 479px) {
  .result {
    padding: 8px 12px;
    gap: 8px;
  }
  .card {
    padding: 10px 14px;
    gap: 10px 16px;
  }
  .trophy {
    font-size: 30px;
  }
  .stars {
    font-size: 26px;
  }
}
</style>
