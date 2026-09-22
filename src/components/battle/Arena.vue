<script setup lang="ts">
/**
 * 竞技场（需求 B28–B33）：横向三块（左红队、右蓝队、游戏画面）+ 倒数 / 弹出提示 / 胜利 / 结果页 / 退出确认 / 横屏提示。
 * 只读 stores/battle 的状态，不知道自己在单设备还是多设备模式下（B41）：状态怎么来、操作发到哪里都在 store 里。
 * 路由页 BattleArenaView（单设备）与 BattleRoomView（房间）各自负责开局，然后把这个组件放上去。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { lang, ui } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { forget, hush, say, sayKeys } from '@/engine/voice'
import { TEAMS, type Team } from '@/battle/protocol'
import { teamAvatars } from '@/battle/avatars'
import { setMusicSprint, startMusic, stopMusic } from '@/battle/music'
import { elapsedMs, formatElapsed, teamPlayers } from '@/battle/match'
import { chapterSkin, finishKey, ruleKey, skinById } from '@/battle/skins'
import { nextKp } from '@/engine/catalog'
import { useBattleStore } from '@/stores/battle'
import { useSettingsStore } from '@/stores/settings'
import { useVoiceStore } from '@/stores/voice'
import type { RowData } from '@/components/battle/rows'
import TeamPanel from '@/components/battle/TeamPanel.vue'
import VoiceButton from '@/components/battle/VoiceButton.vue'
import GameSlot from '@/components/battle/GameSlot.vue'
import Countdown from '@/components/battle/Countdown.vue'
import ResultPanel from '@/components/battle/ResultPanel.vue'
import RotateOverlay from '@/components/battle/RotateOverlay.vue'
import Callout from '@/components/battle/Callout.vue'
import VictoryOverlay from '@/components/battle/VictoryOverlay.vue'
import EmoteBar from '@/components/battle/EmoteBar.vue'
import EmoteLayer from '@/components/battle/EmoteLayer.vue'
import CharBubble from '@/components/battle/CharBubble.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'

/** 到 8 分后先定格、终局特写，再出结果页（B6 / B63）：定格 0.5 秒 → 特写约 2.5 秒 → 结果页 */
const FINALE_START_MS = 500
const RESULT_DELAY_MS = 3000
/** 机器人说话的播放速率（B61）：快一点、高一点，听起来像机器人 */
const ROBOT_RATE = 1.2

const emit = defineEmits<{ exit: []; next: [kpId: string]; practice: [kpId: string] }>()

const store = useBattleStore()
const settings = useSettingsStore()
const voice = useVoiceStore()

// 开发时把 store 挂到 window 上，截图脚本可以直接摆出某个比分 / 弹出提示 / 胜利画面来核对布局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __battle?: unknown }).__battle = store
}

const state = computed(() => store.state)
const phase = computed(() => state.value?.phase)
/** 皮肤 id 来自建房者（服务器只透传）：不认识的就用这一章排到的游戏，别让竞技场没有画面 */
const skin = computed(() => (state.value ? (skinById(state.value.skin) ?? skinById(chapterSkin(state.value.kpId))) : undefined))
/** 游戏只拿这份快照（B34）：与皮肤 props 同一个类型 */
const skinProps = computed(() => {
  const s = state.value
  return s
    ? { red: s.score.red, blue: s.score.blue, target: s.target, phase: s.phase, winner: s.winner, lastPoint: s.lastPoint, avatars: teamAvatars(s.players) }
    : null
})

function rowsOf(team: Team): RowData[] {
  const s = state.value
  if (!s) return []
  return teamPlayers(s, team).map((player) => {
    const feedback = store.pending[player.id] ?? null
    const question = feedback ? feedback.question : s.phase === 'playing' || s.phase === 'ended' ? store.questionOf(player) : null
    // 名字旁的 🎤（B57）：只有多设备房间才有语音；机器人那一行带它正在说的话（B61）
    return {
      player,
      question,
      feedback,
      voice: store.mode === 'online' ? voice.markOf(player.id) : null,
      say: player.kind === 'ai' ? (store.robotLine?.key ?? null) : null,
    }
  })
}
const redRows = computed(() => rowsOf('red'))
const blueRows = computed(() => rowsOf('blue'))
/** 打机器人 / 多设备：本机只有一个真人，进题自动读；两人同屏不自动读（B37） */
const autoRead = computed(() => store.mode !== 'duo')
/** 本机操作的行都在哪个队（打机器人 / 多设备是一队；两人同屏两队都有 → null，不标「我」也不盖遮罩） */
const myTeam = computed<Team | null>(() => {
  const s = state.value
  if (!s || !store.operable.length) return null
  const teams = new Set(s.players.filter((p) => store.operable.includes(p.id)).map((p) => p.team))
  return teams.size === 1 ? [...teams][0]! : null
})
/** 只观战的设备（多设备里建房的那台 / 扫观战码的）：顶栏标一下 */
const watching = computed(() => store.mode === 'online' && store.operable.length === 0)
// ── 背景音乐（B68）：比赛中按游戏类别放，冲刺加快，结果页 / 倒数停；配置里关了或 🔇 静音不放 ──
const sprinting = computed(() => {
  const s = state.value
  return !!s && s.phase === 'playing' && Math.max(s.score.red, s.score.blue) >= s.target - 2
})
watch(
  () => [phase.value, skin.value?.kind, store.prefs.music, settings.soundEnabled] as const,
  ([p, kind, music, sound]) => {
    if (p === 'playing' && kind && music && sound) startMusic(kind, sprinting.value)
    else stopMusic()
  },
  { immediate: true },
)
watch(sprinting, (s) => setMusicSprint(s))

/** 决胜题（B62）：两队都只差 1 分且还在比赛——竞技场四周红蓝呼吸光 */
const deuce = computed(() => {
  const s = state.value
  return !!s && s.phase === 'playing' && s.score.red === s.target - 1 && s.score.blue === s.target - 1
})
/** 终局特写（B63）：到 8 分后把游戏盒子放大、镜头对准赢的那一方的角色（游戏自己报位置，每帧跟着它的收尾动作走），结果页出来前收回 */
const finale = ref(false)
const slotRef = ref<InstanceType<typeof GameSlot> | null>(null)
const finaleOrigin = ref('50% 50%')
/** 游戏没报位置时的兜底：横条对准赢的那条道、竖条对准赢的那一列 */
function fallbackOrigin(): string {
  const w = state.value?.winner ?? 'red'
  if (skin.value?.slot === 'center') return w === 'red' ? '20% 50%' : '80% 50%'
  return w === 'red' ? '50% 20%' : '50% 80%'
}
let camFrame = 0
function trackWinner(): void {
  camFrame = 0
  if (!finale.value) return
  const w = state.value?.winner
  const f = w ? (slotRef.value?.focusOf(w) ?? null) : null
  const next = f ? `${Math.round(f.x)}px ${Math.round(f.y)}px` : fallbackOrigin()
  if (next !== finaleOrigin.value) finaleOrigin.value = next
  if (typeof requestAnimationFrame === 'function') camFrame = requestAnimationFrame(trackWinner)
}
function stopTracking(): void {
  if (camFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(camFrame)
  camFrame = 0
}
watch(finale, (on) => {
  stopTracking()
  if (on) trackWinner()
})
/** 哪几队有本机能操作的行（B58）：那一队的表情排才显示——两人一台两排都有，打机器人 / 多设备只有自己那排 */
const emoteSides = computed<Team[]>(() => {
  const s = state.value
  if (!s) return []
  return TEAMS.filter((t) => s.players.some((p) => p.team === t && store.operable.includes(p.id)))
})
// 角色的台词（B71）：点了角色冒气泡就朗读，按角色的速率变音色；skip 播法，正在读题就不读
watch(
  () => store.charLine,
  (l) => {
    if (l) say(phraseSpeech({ k: l.key }, lang.value), lang.value, 0, { mode: 'skip', rate: l.rate })
  },
)
// 机器人说话（B61）：气泡出现就朗读，音高提一点像机器人；skip 播法，正在读题就不读
watch(
  () => store.robotLine,
  (line) => {
    if (line) say(phraseSpeech({ k: line.key }, lang.value), lang.value, 0, { mode: 'skip', rate: ROBOT_RATE })
  },
)
// 🔥 加油飞出去时朗读一声「加油！」（B58；skip 播法：正在读题就不读）；每条只读一次
let spokenEmote = 0
watch(
  () => store.emotes.at(-1),
  (e) => {
    if (!e || e.id <= spokenEmote) return
    spokenEmote = e.id
    if (e.kind === 'cheer') say(phraseSpeech({ k: 'emote.cheer' }, lang.value), lang.value, 0, { mode: 'skip' })
  },
)
/** 结果页的「下一章」（B9，三种模式都有）：本册目录里的下一个知识点；null = 已是最后一个 */
const nextKpId = computed<string | null>(() => (state.value ? nextKp(state.value.kpId) : null))
function goNext(): void {
  const id = nextKpId.value
  if (!id) return
  // 线上发给服务器（谁先点算谁的）；单设备由路由页换知识点接着打（竞技场不重开、全屏不退）
  if (store.mode === 'online') store.nextChapter(id, chapterSkin(id))
  else emit('next', id)
}
/** 结果页的「再练一遍」（B69）：退出竞技场去这个知识点的练习页，由路由页决定怎么离开 */
function practiceAgain(): void {
  const id = state.value?.kpId
  if (!id) return
  exitFullscreen()
  emit('practice', id)
}
/** 结果页的「不玩了」：线上让服务器关房间、大家一起回地图；单设备直接退出回地图 */
function quit(): void {
  if (store.mode === 'online') store.quit()
  else exit()
}

// ── 计时 ──
// 线上模式按服务器时钟（store.now() 含偏差修正），各设备时钟不一样也不会算出负的用时
const now = ref(store.now())
let ticker: ReturnType<typeof setInterval> | null = null
watch(
  phase,
  (p) => {
    if (ticker) clearInterval(ticker)
    now.value = store.now()
    ticker = p === 'playing' ? setInterval(() => (now.value = store.now()), 500) : null
  },
  { immediate: true },
)
const elapsed = computed(() => (state.value ? formatElapsed(elapsedMs(state.value, now.value)) : '00:00'))

// ── 弹出提示：朗读（B5a）；有人点了 🔊 在读题就不读了（B37，屏幕上有字，读题完了再读就过时了） ──
watch(
  () => store.callout,
  (c) => {
    if (c) say(phraseSpeech({ k: c.key, p: c.p }, lang.value), lang.value, 0, { mode: 'skip' })
  },
)

// ── 结束：胜利动画 → 播报队名 + 一句游戏话 → 结果页 ──
const showResult = ref(false)
const endTimers: ReturnType<typeof setTimeout>[] = []
watch(
  phase,
  (p) => {
    endTimers.forEach(clearTimeout)
    endTimers.length = 0
    showResult.value = false
    finale.value = false
    const winner = state.value?.winner
    if (p === 'ended' && winner) {
      const id = skin.value?.id ?? ''
      endTimers.push(setTimeout(() => (finale.value = true), FINALE_START_MS))
      endTimers.push(
        setTimeout(
          () =>
            say([...phraseSpeech({ k: `battle.win.${winner}` }, lang.value), ...phraseSpeech({ k: finishKey(id) }, lang.value)], lang.value, 0, {
              mode: 'wait', // 有人点了 🔊 在读题就等它读完再播报（B37）
              key: 'finish',
            }),
          900,
        ),
      )
      endTimers.push(
        setTimeout(() => {
          finale.value = false
          showResult.value = true
        }, RESULT_DELAY_MS),
      )
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
// 退出确认框弹出来时读「要退出比赛吗？」（B39a）；正在读题就排在后面（B37），框关掉了还没轮到就不读了
watch(confirming, (c) => {
  if (c) sayKeys(['battle.exit.ask'], lang.value, 0, { mode: 'wait', key: 'exit' })
  else forget('exit')
})

function exitFullscreen(): void {
  try {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    ;(screen.orientation as { unlock?: () => void }).unlock?.()
  } catch {
    /* 不支持 */
  }
}

function exit(): void {
  confirming.value = false
  exitFullscreen()
  emit('exit')
}

onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker)
  endTimers.forEach(clearTimeout)
  stopTracking()
  compactMq?.removeEventListener?.('change', onCompact)
  stopMusic()
  hush()
  exitFullscreen()
})
</script>

<template>
  <div v-if="state" class="arena" :class="[`slot-${skin?.slot ?? 'top'}`, { compact, deuce, finale }]">
    <header class="bar">
      <div class="bar-side">
        <button type="button" class="bar-btn" :aria-label="ui('battle.exit')" @click="confirming = true">✕</button>
        <!-- 红队的表情排（B58）：本机能操作红队才有 -->
        <EmoteBar v-if="emoteSides.includes('red')" side="red" @send="(id) => store.sendEmote('red', id)" />
      </div>
      <div class="bar-mid">
        <span class="clock" aria-live="off">{{ elapsed }}</span>
        <span v-if="watching" class="watching">👀 <RubyText :text="{ k: 'battle.watching' }" /></span>
        <!-- 只观战的设备：一排表情在时钟旁，发出去的算观战方的 -->
        <EmoteBar v-if="watching" side="watch" @send="(id) => store.sendEmote('watch', id)" />
      </div>
      <div class="bar-side">
        <EmoteBar v-if="emoteSides.includes('blue')" side="blue" @send="(id) => store.sendEmote('blue', id)" />
        <!-- 🎤 开 / 关语音（B57）：只有多设备房间有 -->
        <VoiceButton v-if="store.mode === 'online'" round />
        <button
          type="button"
          class="bar-btn"
          :class="{ off: !settings.soundEnabled }"
          :aria-label="ui(settings.soundEnabled ? 'nav.soundOn' : 'nav.soundOff')"
          @click="settings.toggleSound()"
        >
          {{ settings.soundEnabled ? '🔊' : '🔇' }}
        </button>
      </div>
    </header>

    <div v-if="skin && skin.slot === 'top' && skinProps" class="strip top" :style="{ '--finale-origin': finaleOrigin }">
      <GameSlot ref="slotRef" :meta="skin" :state="skinProps" :events="store.events" :compact="compact" @poke="(t, x, y) => store.poke(t, x, y)" />
      <CharBubble v-if="store.charLine" :line="store.charLine" />
    </div>

    <div class="field">
      <TeamPanel
        team="red"
        :rows="redRows"
        :score="state.score.red"
        :target="state.target"
        :operable="store.operable"
        :mine="myTeam === 'red'"
        :masks="myTeam !== null"
        :auto-read="autoRead"
        :compact="compact"
        @answer="(id, g) => store.submit(id, g)"
        @input="(id, v) => store.setInput(id, v)"
      />
      <div v-if="skin && skin.slot === 'center' && skinProps" class="strip center" :style="{ '--finale-origin': finaleOrigin }">
        <GameSlot ref="slotRef" :meta="skin" :state="skinProps" :events="store.events" :compact="compact" @poke="(t, x, y) => store.poke(t, x, y)" />
        <CharBubble v-if="store.charLine" :line="store.charLine" />
      </div>
      <TeamPanel
        team="blue"
        :rows="blueRows"
        :score="state.score.blue"
        :target="state.target"
        :operable="store.operable"
        :mine="myTeam === 'blue'"
        :masks="myTeam !== null"
        :auto-read="autoRead"
        :compact="compact"
        @answer="(id, g) => store.submit(id, g)"
        @input="(id, v) => store.setInput(id, v)"
      />
    </div>

    <EmoteLayer :emotes="store.emotes" />
    <Callout :callout="store.callout" />
    <Countdown v-if="phase === 'countdown'" :rule="store.intro && skin ? ruleKey(skin.id) : null" @done="store.beginPlay()" />
    <VictoryOverlay v-if="phase === 'ended' && state.winner" :team="state.winner" :quiet="showResult" />
    <ResultPanel
      v-if="showResult"
      :state="state"
      :next="nextKpId"
      :series="store.series"
      :timeline="store.timeline"
      :wrongs="store.wrongs"
      @rematch="store.rematch()"
      @next="goNext"
      @quit="quit"
      @practice="practiceAgain"
    />

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
.bar-side,
.bar-mid {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-mid {
  flex: 1;
  justify-content: center;
  min-width: 0;
}
.watching {
  padding: 2px 12px;
  border-radius: 999px;
  background: rgba(61, 44, 30, 0.08);
  font-size: var(--fs-sm);
  font-weight: 800;
  color: var(--c-text-light);
  white-space: nowrap;
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
  transition: transform 0.5s ease;
}
/* 决胜题（B62）：四周红蓝呼吸光 */
.arena.deuce::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 23;
  pointer-events: none;
  box-shadow:
    inset 0 0 40px 10px rgba(255, 107, 107, 0.35),
    inset 0 0 90px 30px rgba(74, 163, 255, 0.25);
  animation: deuce 0.9s ease-in-out infinite alternate;
}
@keyframes deuce {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}
/* 终局特写（B63）：游戏盒子放大两倍、镜头对准赢的那一边（--finale-origin 由竞技场按胜方与位置算），两边队区退后 */
.arena.finale .strip {
  z-index: 27;
  transform: scale(2);
  transform-origin: var(--finale-origin, 50% 50%);
  transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
  box-shadow: 0 18px 50px rgba(61, 44, 30, 0.35);
}
.arena.finale .team {
  opacity: 0.35;
  transition: opacity 0.4s ease;
}
.arena.compact.finale .strip {
  transform: scale(1.5);
}
@media (prefers-reduced-motion: reduce) {
  .arena.deuce::after {
    animation: none;
  }
  .arena.finale .strip {
    transform: none;
  }
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
.arena.compact :deep(.round .mic-btn) {
  width: 36px;
  height: 36px;
}
.arena.compact :deep(.round .mic-icon) {
  font-size: 16px;
}
.arena.compact :deep(.emote-btn) {
  width: 30px;
  height: 30px;
  font-size: 17px;
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
