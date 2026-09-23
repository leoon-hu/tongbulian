<script setup lang="ts">
// 结果页（B9）：胜方 + 成员、比分、用时、每人「答 n · 对 m」；输的一方写「差一点点！」；下一章最大（本册最后一个知识点时再来一局最大）
// 回放条 + 我的错题（B69）：比分走势（红蓝两条阶梯线，反超处打点）与这台设备答错的题（点了朗读）+「再练一遍」
// 排版（B9，2026-09-23 用户定「手机上三个按钮要在第一屏」）：上面一张战报卡——左边谁赢了 / 比分 / 每人答题 / 本章战绩，右边下一章 + 再来一局 + 不玩了 + 分享；
// 比分走势和错题放在卡片下面，往下滚才看。窄屏（< 540px）卡片里上下排。
import { computed } from 'vue'
import type { MatchState, Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { questionAt } from '@/battle/stream'
import { answerLabel } from '@/engine/answer'
import { lang, ui } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { useShareStore } from '@/stores/share'
import { avatarEmoji } from '@/battle/avatars'
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
const nameOf = (p: { kind: string; name: string; avatar?: import('@/battle/avatars').AvatarId }): string => (p.kind === 'ai' ? ui('battle.robot') : `${avatarEmoji(p.avatar)}${p.name}`)
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
    <div class="card" :class="winner">
      <div class="summary">
        <div class="head">
          <span class="trophy" aria-hidden="true">🏆</span>
          <div class="head-text">
            <h2 class="title" :class="winner"><RubyText :text="{ k: `battle.win.${winner}` }" /></h2>
            <p class="members">{{ teamPlayers(state, winner).map(nameOf).join('、') }}</p>
          </div>
        </div>
        <div class="scoreline">
          <p class="score">
            <span class="red">{{ state.score.red }}</span> : <span class="blue">{{ state.score.blue }}</span>
          </p>
          <p class="time"><RubyText :text="{ k: 'battle.time' }" /> {{ elapsed }}</p>
        </div>
        <ul class="stats">
          <li v-for="p in state.players" :key="p.id" :class="p.team">
            <span class="who">{{ nameOf(p) }}</span>
            <span>{{ ui('battle.stats', { n: p.index, m: p.correct }) }}</span>
            <span v-if="p.team === loser" class="close"><RubyText :text="{ k: 'battle.close' }" /></span>
          </li>
        </ul>
        <p v-if="series && series.kpId === state.kpId" class="series">
          <RubyText :text="{ k: 'battle.series' }" />：
          <span class="red">{{ sideName('red') }}<template v-if="seriesLeader === 'red'"> 🏆</template> {{ series.wins.red }}</span>
          :
          <span class="blue">{{ series.wins.blue }} <template v-if="seriesLeader === 'blue'">🏆 </template>{{ sideName('blue') }}</span>
        </p>
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
      <h3 class="panel-title"><RubyText :text="{ k: 'battle.timeline' }" /></h3>
      <svg class="timeline" :viewBox="`0 0 ${TL_W} ${TL_H}`" preserveAspectRatio="none" role="img" :aria-label="ui('battle.timeline')">
        <line x1="0" :y1="TL_H" :x2="TL_W" :y2="TL_H" class="tl-base" />
        <polyline :points="tl.blue" class="tl-line blue" />
        <polyline :points="tl.red" class="tl-line red" />
        <circle v-for="(f, i) in tl.flips" :key="i" :cx="f.x" :cy="f.y" r="4" class="tl-flip" :class="f.team" />
      </svg>
    </section>
    <section v-if="wrongs" class="panel wrong">
      <h3 class="panel-title wrong-title"><RubyText :text="{ k: 'battle.myWrong' }" /></h3>
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
/* 盖住竞技场的一层：内容比屏幕高时从顶上开始滚（战报卡永远在第一屏），放得下就上下居中；不认识 safe 的浏览器保留上一行的居中 */
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

/* ── 战报卡：左边结果、右边按钮；胜方队色描边 ── */
.card {
  --win: var(--c-red);
  --win-soft: #fff1ef;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
  gap: 16px 20px;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  border: 3px solid var(--win);
  background: linear-gradient(160deg, var(--win-soft), var(--c-card) 55%);
  box-shadow: var(--shadow-card);
}
.card.blue {
  --win: var(--c-blue);
  --win-soft: #edf5ff;
}
.summary,
.side {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.side {
  justify-content: center;
  padding-left: 20px;
  border-left: 2px dashed var(--c-line);
}
.head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trophy {
  flex: none;
  font-size: 52px;
  line-height: 1;
  animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.head-text {
  min-width: 0;
}
.title {
  font-size: var(--fs-xl);
  line-height: 1.2;
}
.title.red {
  color: var(--c-red);
}
.title.blue {
  color: var(--c-blue);
}
.members {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
  line-height: 1.3;
}
.scoreline {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 14px;
}
.score {
  font-size: 52px;
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
  font-size: var(--fs-sm);
  color: var(--c-text-light);
}
.stats {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--fs-sm);
}
.stats li {
  display: flex;
  flex-wrap: wrap;
  gap: 0 8px;
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
/* 本章战绩（B64） */
.series {
  align-self: flex-start;
  margin: 2px 0 0;
  padding: 2px 12px;
  /* 窄卡里会折成两行，不用药丸形 */
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid var(--c-line);
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--c-text-light);
}
.series .red {
  color: var(--c-red);
}
.series .blue {
  color: var(--c-blue);
}
.next-hint {
  margin: 0;
  font-size: var(--fs-sm);
  font-weight: 700;
  color: var(--c-text-light);
  text-align: center;
}
.next-hint.done {
  color: var(--c-primary-dark);
}
/* 下一章占一整行（最大），再来一局 + 不玩了并排；没有下一章时再来一局是绿的、和不玩了并排 */
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.actions .big-btn {
  padding: 0 10px;
  white-space: nowrap;
}
.actions .next-btn {
  grid-column: 1 / -1;
}
.share-btn {
  align-self: center;
  padding: 4px 12px;
  background: none;
  color: var(--c-text-light);
  font-size: var(--fs-sm);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── 卡片下面：比分走势、我的错题（B69） ── */
.panel {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.8);
}
.panel-title {
  margin: 0 0 6px;
  font-size: var(--fs-md);
  color: var(--c-text-light);
  text-align: center;
}
.timeline {
  display: block;
  width: 100%;
  height: 64px;
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
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: start;
  gap: 8px;
}
/* 每张卡自己裁掉溢出：教具（几十个 emoji 的一排、十格阵）在窄卡里放不下时不能漫到页面上（2026-09-22 用户截图） */
.wrong-item {
  min-width: 0;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 2px solid var(--c-line);
  cursor: pointer;
  overflow: hidden;
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
  max-height: 230px;
  overflow: hidden;
}
/* 题干里的每一部分都不许比卡宽；一排排的东西可以换行 */
.wrong-q :deep(.stem) {
  max-width: 100%;
}
.wrong-q :deep(.stem > *) {
  max-width: 100%;
  box-sizing: border-box;
  flex-wrap: wrap;
  justify-content: center;
}
/* 一排排的实物图：CountingObjects 的字号是内联的、宽度上限 420px，CompareRows 的格子是固定 40px 的网格——在窄卡里都再缩一档，一排 12 个也放得下 */
.wrong-q :deep(.objects) {
  font-size: 22px !important;
  gap: 4px 6px;
  max-width: 100%;
}
.wrong-q :deep(.compare) {
  zoom: 0.6;
  max-width: 100%;
  overflow: hidden;
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
@keyframes pop {
  from {
    transform: scale(0) rotate(-30deg);
  }
  to {
    transform: scale(1) rotate(0);
  }
}

/* 窄屏：卡片里上下排，按钮在结果下面 */
@media (max-width: 539px) {
  .card {
    grid-template-columns: minmax(0, 1fr);
  }
  .side {
    padding: 12px 0 0;
    border-left: none;
    border-top: 2px dashed var(--c-line);
  }
}
/* 手机横屏（与竞技场紧凑版同一个条件，B29）：留白与字号再收一档，战报卡整张放进一屏 */
@media (max-height: 479px) {
  .result {
    gap: 8px;
    padding: 8px 12px;
  }
  .card {
    gap: 10px 14px;
    padding: 10px 14px;
  }
  .side {
    gap: 4px;
    padding-left: 14px;
  }
  .summary {
    gap: 4px;
  }
  .trophy {
    font-size: 38px;
  }
  .score {
    font-size: 40px;
  }
  .actions {
    gap: 8px;
  }
}
</style>
