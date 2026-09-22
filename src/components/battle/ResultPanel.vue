<script setup lang="ts">
// 结果页（B9）：胜方 + 成员、比分、用时、每人「答 n · 对 m」；输的一方写「差一点点！」；下一章最大（本册最后一个知识点时再来一局最大）
// 回放条 + 我的错题（B69）：比分下面一条红蓝赛跑的小时间线（反超处打点），再下面列这台设备答错的题（点了朗读）+「再练一遍」
import { computed } from 'vue'
import type { MatchState, Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { questionAt } from '@/battle/stream'
import { answerLabel } from '@/engine/answer'
import { lang, ui } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { useShareStore } from '@/stores/share'
import { courseOfKp } from '@/engine/catalog'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'
import QuestionRenderer from '@/components/practice/QuestionRenderer.vue'

/**
 * 三种模式一模一样（B9，2026-09-20 用户定）：「下一章」（最大）、「再来一局」、「不玩了」；多设备房间里三个角色都一样、谁先点就按谁的。
 * next：本册下一个知识点的 id，上面写着下一章是哪个知识点；null = 这一册已是最后一个，没有这个键、写「这一册都打完啦！」。
 * 怎么执行（单设备接着打 / 线上发给服务器）由竞技场决定，这里只发事件。
 */
const props = defineProps<{
  state: MatchState
  next: string | null
  /** 本章战绩（B64）：同一个知识点连着打的几局各赢几局；null = 没有 */
  series?: { kpId: string; wins: Record<Team, number> } | null
  /** 比分走势（B69）：每得一分一笔 */
  timeline?: readonly { t: number; red: number; blue: number }[]
  /** 这台设备答错的题（B69）：谁、第几题 */
  wrongs?: readonly { playerId: string; index: number }[]
}>()
const emit = defineEmits<{ rematch: []; next: []; quit: []; practice: [] }>()

// ── 回放条（B69）：viewBox 300 × 80，x 按时间、y 按分数，阶梯线；领先方换了的地方打个点 ──
const TL_W = 300
const TL_H = 80
const tl = computed(() => {
  const pts = props.timeline ?? []
  const total = Math.max(1, pts.at(-1)?.t ?? 0, elapsedMs(props.state, Date.now()))
  const x = (t: number): number => (t / total) * TL_W
  const y = (score: number): number => TL_H - (Math.min(score, props.state.target) / props.state.target) * (TL_H - 6)
  const line = (team: Team): string => {
    let cur = 0
    const parts = [`0,${y(0)}`]
    for (const p of pts) {
      const s = p[team]
      parts.push(`${x(p.t)},${y(cur)}`)
      if (s !== cur) {
        cur = s
        parts.push(`${x(p.t)},${y(cur)}`)
      }
    }
    parts.push(`${TL_W},${y(cur)}`)
    return parts.join(' ')
  }
  const flips: { x: number; y: number; team: Team }[] = []
  let leader: Team | null = null
  for (const p of pts) {
    const now: Team | null = p.red === p.blue ? null : p.red > p.blue ? 'red' : 'blue'
    if (now && leader && now !== leader) flips.push({ x: x(p.t), y: y(p[now]), team: now })
    if (now) leader = now
  }
  return { red: line('red'), blue: line('blue'), flips }
})

// ── 我的错题（B69）：题目由 seed + 题号重现（确定性的题目流），点了朗读 ──
const wrongList = computed(() =>
  (props.wrongs ?? []).flatMap((w) => {
    const p = props.state.players.find((x) => x.id === w.playerId)
    if (!p) return []
    const question = questionAt(props.state.kpId, p.seed, w.index)
    return [{ key: `${w.playerId}-${w.index}`, player: p, question }]
  }),
)
/** 两边都是这台设备上的人（两人一台）才标名字 */
const manyWrongOwners = computed(() => new Set(wrongList.value.map((w) => w.player.id)).size > 1)
function readWrong(q: (typeof wrongList.value)[number]['question']): void {
  say(questionSpeech(q, lang.value), lang.value)
}

const winner = computed<Team>(() => props.state.winner ?? 'red')
const loser = computed<Team>(() => (winner.value === 'red' ? 'blue' : 'red'))
const elapsed = computed(() => formatElapsed(elapsedMs(props.state, Date.now())))
const nameOf = (p: { kind: string; name: string }): string => (p.kind === 'ai' ? ui('battle.robot') : p.name)
/** 战绩里两边的称呼：一个人就是他的名字，多人是队名 */
function sideName(team: Team): string {
  const ps = teamPlayers(props.state, team)
  return ps.length === 1 ? nameOf(ps[0]!) : ui(`battle.team.${team}`)
}
/** 先赢两局的那边（B64）：名字旁出 🏆 */
const seriesLeader = computed<Team | null>(() => {
  const w = props.series?.wins
  if (!w) return null
  if (w.red >= 2 && w.red > w.blue) return 'red'
  if (w.blue >= 2 && w.blue > w.red) return 'blue'
  return null
})

/** 「分享战绩」（F1「开源与分享」）：这一局的知识点、比分、谁赢了 + 站点链接；有系统分享面板直接弹，否则复制一段话 */
const shareStore = useShareStore()
function shareResult(): void {
  // 链到这个知识点的静态页（有自己的标题、描述与「打一局」按钮），而不是首页
  const course = courseOfKp(props.state.kpId)
  const path = course ? `${course.course.subjectId}/${course.course.gradeId}/${props.state.kpId}.html` : ''
  void shareStore.share(
    ui('share.result', { kp: ui(`kp.${props.state.kpId}`), red: props.state.score.red, blue: props.state.score.blue, winner: ui(`battle.team.${winner.value}`) }),
    path,
  )
}
</script>

<template>
  <div class="result">
    <div class="trophy">🏆</div>
    <h2 class="title" :class="winner"><RubyText :text="{ k: `battle.win.${winner}` }" /></h2>
    <p class="members">{{ teamPlayers(state, winner).map(nameOf).join('、') }}</p>
    <p class="score">
      <span class="red">{{ state.score.red }}</span> : <span class="blue">{{ state.score.blue }}</span>
    </p>
    <p class="time"><RubyText :text="{ k: 'battle.time' }" /> {{ elapsed }}</p>
    <svg v-if="timeline && timeline.length" class="timeline" :viewBox="`0 0 ${TL_W} ${TL_H}`" preserveAspectRatio="none" role="img" :aria-label="ui('battle.timeline')">
      <line x1="0" :y1="TL_H" :x2="TL_W" :y2="TL_H" class="tl-base" />
      <polyline :points="tl.blue" class="tl-line blue" />
      <polyline :points="tl.red" class="tl-line red" />
      <circle v-for="(f, i) in tl.flips" :key="i" :cx="f.x" :cy="f.y" r="4" class="tl-flip" :class="f.team" />
    </svg>
    <p v-if="series && series.kpId === state.kpId" class="series">
      <RubyText :text="{ k: 'battle.series' }" />：
      <span class="red">{{ sideName('red') }}<template v-if="seriesLeader === 'red'"> 🏆</template> {{ series.wins.red }}</span>
      :
      <span class="blue">{{ series.wins.blue }} <template v-if="seriesLeader === 'blue'">🏆 </template>{{ sideName('blue') }}</span>
    </p>
    <ul class="stats">
      <li v-for="p in state.players" :key="p.id" :class="p.team">
        <span class="who">{{ nameOf(p) }}</span>
        <span>{{ ui('battle.stats', { n: p.index, m: p.correct }) }}</span>
        <span v-if="p.team === loser" class="close"><RubyText :text="{ k: 'battle.close' }" /></span>
      </li>
    </ul>
    <p v-if="next" class="next-hint"><RubyText :text="{ k: 'battle.next' }" />：<RubyText :text="{ k: `kp.${next}` }" /></p>
    <p v-else class="next-hint done"><RubyText :text="{ k: 'battle.lastChapter' }" /></p>
    <div class="actions">
      <BigButton v-if="next" color="green" class="next-btn" @click="emit('next')"><RubyText :text="{ k: 'battle.next' }" /> ▶</BigButton>
      <BigButton :color="next ? 'blue' : 'green'" class="rematch-btn" @click="emit('rematch')"><RubyText :text="{ k: 'battle.rematch' }" /></BigButton>
      <BigButton color="ghost" class="quit-btn" @click="emit('quit')"><RubyText :text="{ k: 'battle.quit' }" /></BigButton>
    </div>
    <button type="button" class="share-btn" @click="shareResult">📣 <RubyText :text="{ k: 'battle.share' }" /></button>
    <section v-if="wrongs" class="wrong">
      <h3 class="wrong-title"><RubyText :text="{ k: 'battle.myWrong' }" /></h3>
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
.next-hint {
  margin: 4px 0 0;
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-light);
  text-align: center;
}
.next-hint.done {
  color: var(--c-primary-dark);
}
.result {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 内容比屏幕高（回放条 + 错题，B69）时从顶上开始滚，别把奖杯裁掉；不认识 safe 的浏览器保留上一行的居中 */
  justify-content: safe center;
  gap: 8px;
  padding: 16px;
  background: rgba(253, 246, 236, 0.9);
  overflow: auto;
}
.trophy {
  font-size: 64px;
  line-height: 1;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.title {
  font-size: var(--fs-xl);
}
.title.red {
  color: var(--c-red);
}
.title.blue {
  color: var(--c-blue);
}
.members {
  font-size: var(--fs-md);
  color: var(--c-text-light);
}
.score {
  font-size: var(--fs-huge);
  font-weight: 900;
  line-height: 1.1;
}
.score .red {
  color: var(--c-red);
}
.score .blue {
  color: var(--c-blue);
}
.time {
  font-size: var(--fs-md);
  color: var(--c-text-light);
}
/* 本章战绩（B64） */
.series {
  margin: 0;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: var(--fs-md);
  font-weight: 800;
  color: var(--c-text-light);
}
.series .red {
  color: var(--c-red);
}
.series .blue {
  color: var(--c-blue);
}
.stats {
  list-style: none;
  padding: 0;
  margin: 4px 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  font-size: var(--fs-sm);
}
.stats li {
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.who {
  font-weight: 800;
}
.stats li.red .who {
  color: var(--c-red);
}
.stats li.blue .who {
  color: var(--c-blue);
}
.close {
  color: var(--c-primary-dark);
  font-weight: 700;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}
@keyframes pop {
  from {
    transform: scale(0) rotate(-30deg);
  }
  to {
    transform: scale(1) rotate(0);
  }
}
.share-btn {
  margin-top: 2px;
  padding: 8px 12px;
  background: none;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}
/* 回放条（B69）：一条红蓝赛跑的小时间线 */
.timeline {
  width: min(100%, 360px);
  height: 64px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.7);
  overflow: visible;
}
.tl-base {
  stroke: var(--c-line);
  stroke-width: 1;
}
.tl-line {
  fill: none;
  stroke-width: 3;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.tl-line.red,
.tl-flip.red {
  stroke: var(--c-red);
}
.tl-line.blue,
.tl-flip.blue {
  stroke: var(--c-blue);
}
.tl-flip {
  fill: #fff;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}
/* 我的错题（B69） */
.wrong {
  width: min(100%, 640px);
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.7);
}
.wrong-title {
  margin: 0 0 6px;
  font-size: var(--fs-md);
  color: var(--c-text-light);
  text-align: center;
}
.wrong-none {
  margin: 0;
  text-align: center;
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-green);
}
.wrong-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.wrong-item {
  flex: 1 1 260px;
  max-width: 320px;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 2px solid var(--c-line);
  cursor: pointer;
}
.wrong-item.red {
  border-color: #ffb8b8;
}
.wrong-item.blue {
  border-color: #b3d6ff;
}
.wrong-who {
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--c-text-light);
}
.wrong-q {
  zoom: 0.6;
}
.wrong-ans {
  margin: 4px 0 0;
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.wrong-ans strong {
  color: var(--c-green);
  font-size: var(--fs-md);
}
.practice-btn {
  display: block;
  margin: 8px auto 0;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--c-card);
  border: 2px solid var(--c-primary);
  color: var(--c-primary-dark);
  font-size: var(--fs-md);
  font-weight: 800;
}
</style>
