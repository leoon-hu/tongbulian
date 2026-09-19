<script setup lang="ts">
// 竞技场（B28–B33）：横向三块——左区（红队）、右区（蓝队）、游戏区（皮肤说了算：上方横条或左右之间的竖条）。
// 单设备模式：这里直接驱动 stores/battle 的本地对局；倒数 → 比赛 → 胜利动画 → 结果页。
// 弹出提示（连对 / 反超 / 还差一分）与胜利播报的朗读在这里，音效在 store 里。
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { hasGenerator } from '@/engine'
import { courseOfKp } from '@/engine/catalog'
import { lang, ui } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { hush, say } from '@/engine/voice'
import type { Team } from '@/battle/protocol'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { skinById } from '@/battle/skins'
import { useBattleStore, type LocalMode } from '@/stores/battle'
import { useSettingsStore } from '@/stores/settings'
import type { RowData } from '@/components/battle/rows'
import TeamPanel from '@/components/battle/TeamPanel.vue'
import GameSlot from '@/components/battle/GameSlot.vue'
import Countdown from '@/components/battle/Countdown.vue'
import ResultPanel from '@/components/battle/ResultPanel.vue'
import RotateOverlay from '@/components/battle/RotateOverlay.vue'
import Callout from '@/components/battle/Callout.vue'
import VictoryOverlay from '@/components/battle/VictoryOverlay.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** 到 8 分后先播胜利动画，再出结果页（B6） */
const RESULT_DELAY_MS = 2000

const route = useRoute()
const router = useRouter()
const store = useBattleStore()
const settings = useSettingsStore()

const kpId = String(route.params.kpId)
const mode: LocalMode = route.query.mode === 'duo' ? 'duo' : 'ai'
const info = courseOfKp(kpId)
const mapPath = info ? `/s/${info.subject.id}/g/${info.grade.id}` : '/'
const setupPath = `/battle/new/${kpId}`

if (!info || !hasGenerator(kpId)) router.replace('/')
else if (!store.state || store.state.kpId !== kpId || store.mode !== mode) {
  // 刷新或直接打开地址：名字都还在就直接开一局，缺名字回设置页
  if (!store.prefs.names.me || (mode === 'duo' && !store.prefs.names.right)) router.replace(setupPath)
  else store.startLocal({ kpId, mode })
}

// 开发时把 store 挂到 window 上，截图脚本可以直接摆出某个比分 / 弹出提示 / 胜利画面来核对布局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __battle?: unknown }).__battle = store
}

const state = computed(() => store.state)
const phase = computed(() => state.value?.phase)
const skin = computed(() => (state.value ? skinById(state.value.skin) : undefined))
/** 游戏只拿这份快照（B34）：与皮肤 props 同一个类型 */
const skinProps = computed(() => {
  const s = state.value
  return s
    ? { red: s.score.red, blue: s.score.blue, target: s.target, phase: s.phase, winner: s.winner, lastPoint: s.lastPoint }
    : null
})

function rowsOf(team: Team): RowData[] {
  const s = state.value
  if (!s) return []
  return teamPlayers(s, team).map((player) => {
    const feedback = store.pending[player.id] ?? null
    const question = feedback ? feedback.question : s.phase === 'playing' || s.phase === 'ended' ? store.questionOf(player) : null
    return { player, question, feedback }
  })
}
const redRows = computed(() => rowsOf('red'))
const blueRows = computed(() => rowsOf('blue'))
/** 打机器人：本机只有一个真人，进题自动读；两人同屏不自动读（B37） */
const autoRead = computed(() => store.mode === 'ai')

// ── 计时 ──
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | null = null
watch(
  phase,
  (p) => {
    if (ticker) clearInterval(ticker)
    ticker = p === 'playing' ? setInterval(() => (now.value = Date.now()), 500) : null
  },
  { immediate: true },
)
const elapsed = computed(() => (state.value ? formatElapsed(elapsedMs(state.value, now.value)) : '00:00'))

// ── 弹出提示：朗读（B5a） ──
watch(
  () => store.callout,
  (c) => {
    if (c) say(phraseSpeech({ k: c.key, p: c.p }, lang.value), lang.value)
  },
)

// ── 结束：胜利动画 → 播报队名 → 结果页 ──
const showResult = ref(false)
const endTimers: ReturnType<typeof setTimeout>[] = []
watch(
  phase,
  (p) => {
    endTimers.forEach(clearTimeout)
    endTimers.length = 0
    showResult.value = false
    const winner = state.value?.winner
    if (p === 'ended' && winner) {
      endTimers.push(setTimeout(() => say(phraseSpeech({ k: `battle.win.${winner}` }, lang.value), lang.value), 900))
      endTimers.push(setTimeout(() => (showResult.value = true), RESULT_DELAY_MS))
    }
  },
  { immediate: true },
)

// ── 手机横屏紧凑版（B29） ──
const compactMq = typeof matchMedia === 'function' ? matchMedia('(max-height: 479px)') : null
const compact = ref(compactMq?.matches ?? false)
const onCompact = (e: MediaQueryListEvent): void => {
  compact.value = e.matches
}
compactMq?.addEventListener?.('change', onCompact)

const confirming = ref(false)

function exitFullscreen(): void {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
  } catch {
    /* 不支持 */
  }
}

function exit(): void {
  confirming.value = false
  store.leave()
  exitFullscreen()
  router.push(mapPath)
}

function changeSkin(): void {
  store.leave()
  router.push(setupPath)
}

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
  endTimers.forEach(clearTimeout)
  compactMq?.removeEventListener?.('change', onCompact)
  hush()
  store.leave()
  exitFullscreen()
})
</script>

<template>
  <div v-if="state" class="arena" :class="[`slot-${skin?.slot ?? 'top'}`, { compact }]">
    <header class="bar">
      <button type="button" class="bar-btn" :aria-label="ui('battle.exit')" @click="confirming = true">✕</button>
      <span class="clock" aria-live="off">{{ elapsed }}</span>
      <button
        type="button"
        class="bar-btn"
        :class="{ off: !settings.soundEnabled }"
        :aria-label="ui(settings.soundEnabled ? 'nav.soundOn' : 'nav.soundOff')"
        @click="settings.toggleSound()"
      >
        {{ settings.soundEnabled ? '🔊' : '🔇' }}
      </button>
    </header>

    <div v-if="skin && skin.slot === 'top' && skinProps" class="strip top">
      <GameSlot :meta="skin" :state="skinProps" :events="store.events" :compact="compact" />
    </div>

    <div class="field">
      <TeamPanel
        team="red"
        :rows="redRows"
        :score="state.score.red"
        :target="state.target"
        :operable="store.operable"
        :auto-read="autoRead"
        :compact="compact"
        @answer="(id, g) => store.submit(id, g)"
        @input="(id, v) => store.setInput(id, v)"
      />
      <div v-if="skin && skin.slot === 'center' && skinProps" class="strip center">
        <GameSlot :meta="skin" :state="skinProps" :events="store.events" :compact="compact" />
      </div>
      <TeamPanel
        team="blue"
        :rows="blueRows"
        :score="state.score.blue"
        :target="state.target"
        :operable="store.operable"
        :auto-read="autoRead"
        :compact="compact"
        @answer="(id, g) => store.submit(id, g)"
        @input="(id, v) => store.setInput(id, v)"
      />
    </div>

    <Callout :callout="store.callout" />
    <Countdown v-if="phase === 'countdown'" @done="store.beginPlay()" />
    <VictoryOverlay v-if="phase === 'ended' && state.winner" :team="state.winner" :quiet="showResult" />
    <ResultPanel v-if="showResult" :state="state" @rematch="store.rematch()" @change-skin="changeSkin" @exit="exit" />

    <div v-if="confirming" class="confirm-mask" @click.self="confirming = false">
      <div class="confirm" role="dialog">
        <p class="confirm-ask"><RubyText :text="{ k: 'battle.exit.ask' }" /></p>
        <div class="confirm-actions">
          <BigButton color="ghost" @click="confirming = false"><RubyText :text="{ k: 'battle.exit.stay' }" /></BigButton>
          <BigButton color="primary" @click="exit"><RubyText :text="{ k: 'battle.exit' }" /></BigButton>
        </div>
      </div>
    </div>

    <RotateOverlay />
  </div>
</template>

<style scoped>
/* 两个区并排，尺寸比练习页收一档：键 56px、大字 44px */
.arena {
  --tap-min: 56px;
  --fs-huge: 44px;
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.bar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 8px;
}
.bar-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: 20px;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.bar-btn:active {
  transform: scale(0.92);
}
.bar-btn.off {
  opacity: 0.55;
}
.clock {
  font-size: var(--fs-md);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-text-light);
}
/* 游戏盒子（B34a ①）：尺寸由这里定，游戏的 canvas 绝对定位填满它，溢出裁掉 */
.strip {
  position: relative;
  flex: none;
  background: var(--c-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.strip.top {
  height: 120px;
  margin: 0 8px 8px;
}
.strip.center {
  height: auto;
  min-height: 0;
}
.field {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 8px 8px;
}
.slot-center .field {
  grid-template-columns: 1fr 150px 1fr;
}
.confirm-mask {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(61, 44, 30, 0.35);
}
.confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.confirm-ask {
  font-size: var(--fs-lg);
  font-weight: 700;
}
.confirm-actions {
  display: flex;
  gap: 12px;
}

/* 手机横屏紧凑版（B29）：点击目标 48px、字号缩一档、横条 56px、竖条 96px、键盘间距收窄 */
.arena.compact {
  --tap-min: 48px;
  --fs-huge: 28px;
  --fs-xl: 22px;
  --fs-lg: 18px;
  --fs-md: 15px;
}
.arena.compact .bar {
  height: 36px;
}
.arena.compact .bar-btn {
  width: 36px;
  height: 36px;
  font-size: 16px;
}
.arena.compact .strip.top {
  height: 56px;
  margin: 0 6px 4px;
}
.arena.compact.slot-center .field {
  grid-template-columns: 1fr 96px 1fr;
}
.arena.compact .field {
  gap: 6px;
  padding: 0 6px 6px;
}
.arena.compact :deep(.numpad) {
  gap: 6px;
}
.arena.compact :deep(.numpad .grid) {
  gap: 6px;
}
.arena.compact :deep(.numpad .display) {
  padding: 0 16px;
  border-width: 2px;
}
.arena.compact :deep(.team-head) {
  padding: 2px 10px;
  font-size: 14px;
}
.arena.compact :deep(.team-head .score) {
  font-size: 20px;
}
.arena.compact :deep(.team-head .progress i) {
  width: 7px;
  height: 7px;
}
.arena.compact :deep(.rows) {
  padding: 4px;
}
</style>
