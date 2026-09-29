<script setup lang="ts">
/**
 * 打怪兽的竞技场（需求 M6）：顶栏（退出、⏸ 暂停｜计时器｜打倒几只、静音）+ 舞台（Boss 游戏，GameHost 跑，M13）+ 作答区（一个人一栏；
 * 两个人红左蓝右），外加倒数（规则卡）/ 弹出提示 / Boss 的话 / 暂停面板（继续前 3-2-1，M1）/ 终局特写 / 结果页 / 退出确认 / 横屏提示。
 * 多设备（M6 / M13，阶段 3）：每台设备只放自己那一栏作答区 + 舞台，房间里的其他人缩成一排头像条（BossStrip），头像条前面是表情键；
 * 观战的设备只有舞台 + 头像条；顶栏有 🎤、没有 ⏸；「不玩了」关掉房间大家一起回地图。只读 stores/boss。
 * 布局：iPad / 电脑上舞台全宽、下面作答区；手机横屏（高 < 480px）一个人左舞台右作答、两个人中间舞台两边作答；
 * 手机竖屏只允许一个人打（上舞台下作答），两个人时盖横屏提示。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { lang, ui } from '@/engine/i18n'
import { joinSpeech, phraseSpeech } from '@/engine/speech'
import { forget, hush, say, sayKeys } from '@/engine/voice'
import { nextKp } from '@/engine/catalog'
import type { Team } from '@/battle/protocol'
import { setMusicSprint, startMusic, stopMusic } from '@/battle/music'
import { playSfx } from '@/battle/sfx'
import { bossById, DEFAULT_BOSS } from '@/battle/boss'
import { teamTimedPlayers, topScorers, totalDowns } from '@/battle/timed'
import type { BossGameState } from '@/battle/game/boss-contract'
import { createBossFallback } from '@/battle/game/boss-fallback'
import GameHost from '@/battle/game/host/GameHost.vue'
import { useBossStore } from '@/stores/boss'
import { useBattleStore } from '@/stores/battle'
import { useSettingsStore } from '@/stores/settings'
import type { RowData } from '@/components/battle/rows'
import Countdown from '@/components/battle/Countdown.vue'
import Callout from '@/components/battle/Callout.vue'
import RotateOverlay from '@/components/battle/RotateOverlay.vue'
import BigButton from '@/components/ui/BigButton.vue'
import RubyText from '@/components/ui/RubyText.vue'
import BossPanel from './BossPanel.vue'
import BossTimer from './BossTimer.vue'
import BossResult from './BossResult.vue'
import BossStrip from './BossStrip.vue'
import EmoteBar from '@/components/battle/EmoteBar.vue'
import EmoteLayer from '@/components/battle/EmoteLayer.vue'
import VoiceButton from '@/components/battle/VoiceButton.vue'
import { useVoiceStore } from '@/stores/voice'
import type { TimedPlayer } from '@/battle/timed'

/** 时间到后先定格、终局特写，再出结果页（同 B63）：定格 0.5 秒 → 特写约 2.5 秒 → 结果页 */
const FINALE_START_MS = 500
const RESULT_DELAY_MS = 3000
/** Boss 说话放慢一点、低一点，像个大怪兽 */
const BOSS_RATE = 0.9

const emit = defineEmits<{ exit: []; next: [kpId: string]; practice: [kpId: string] }>()

const store = useBossStore()
const battle = useBattleStore()
const settings = useSettingsStore()
const voice = useVoiceStore()

// 开发时把 store 挂到 window 上，截图 / 普查脚本可以直接摆出某个画面来核对布局
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __boss?: unknown }).__boss = store
}

const state = computed(() => store.state)
const phase = computed(() => state.value?.phase)
const boss = computed(() => bossById(state.value?.boss) ?? bossById(DEFAULT_BOSS)!)
/** 多设备（M13）：我是哪个选手（观战的设备没有） */
const online = computed(() => store.mode === 'online')
const me = computed<TimedPlayer | undefined>(() => (online.value ? state.value?.players.find((p) => p.id === store.online?.you) : undefined))
const watching = computed(() => online.value && !me.value)
/** 放作答区的几边：单设备按有人的几边（一个人打只有红）；多设备只放自己那一栏 */
const teams = computed<Team[]>(() => {
  const s = state.value
  if (!s) return []
  if (online.value) return me.value ? [me.value.team] : []
  return (['red', 'blue'] as const).filter((t) => s.players.some((p) => p.team === t))
})
/** 一栏里的选手：单设备是这一队的；多设备只有自己 */
function panelPlayers(team: Team): TimedPlayer[] {
  const s = state.value
  if (!s) return []
  return online.value ? (me.value ? [me.value] : []) : teamTimedPlayers(s, team)
}
const duo = computed(() => teams.value.length > 1)
/** 布局：两栏 / 一栏 / 只看（多设备观战） */
const layout = computed(() => (watching.value ? 'lay-watch' : duo.value ? 'lay-duo' : 'lay-solo'))
/** 头像条（多设备）：除了我以外的人 */
const others = computed(() => (online.value && state.value ? state.value.players.filter((p) => p.id !== me.value?.id) : []))
/** 表情从哪一排飞（B58）：我的队，观战的从时钟那儿 */
const emoteSide = computed(() => me.value?.team ?? 'watch')
function sendEmote(id: Parameters<typeof battle.sendEmote>[1]): void {
  if (battle.sendEmote(emoteSide.value, id, Date.now(), true) && me.value) store.onEmote(me.value.id)
}
const lastTen = computed(() => !!state.value && state.value.lastTen && state.value.phase === 'playing')
const downs = computed(() => (state.value ? totalDowns(state.value) : 0))

/** 游戏只拿这份快照（boss-contract.ts） */
const gameState = computed<BossGameState | null>(() => {
  const s = state.value
  if (!s) return null
  return {
    phase: s.phase,
    variant: s.variant,
    lastTen: lastTen.value,
    // 台上的（M9：每队最近打中的两个，store 轮换）按上台的顺序；其他人在观众席
    fighters: store.stage.flatMap((id) => s.players.filter((p) => p.id === id)).map(fighterOf),
    crowd: s.players.filter((p) => !store.stage.includes(p.id)).map(fighterOf),
    bosses: s.bosses.map((b) => ({ side: b.side, level: b.level, hp: b.hp, max: b.max })),
  }
})
function fighterOf(p: TimedPlayer): BossGameState['fighters'][number] {
  return { id: p.id, team: p.team, avatar: p.avatar, robot: p.kind === 'ai', streak: p.streak, input: p.input }
}

function rowsOf(team: Team): RowData[] {
  const s = state.value
  if (!s) return []
  return panelPlayers(team).map((player) => {
    const feedback = store.pending[player.id] ?? null
    const question = feedback ? feedback.question : s.phase === 'countdown' ? null : store.questionOf(player)
    return { player, question, feedback }
  })
}
const scoreOf = (team: Team): number => panelPlayers(team).reduce((a, p) => a + p.score, 0)
const streakOf = (team: Team): number => Math.max(0, ...panelPlayers(team).map((p) => p.streak))
/** 本局之星（结束后才标，M7）：不止一个人时 */
const stars = computed(() => new Set(state.value?.phase === 'ended' && state.value.players.length > 1 ? topScorers(state.value) : []))
const starOf = (team: Team): boolean => panelPlayers(team).some((p) => stars.value.has(p.id))
/** 一个人 / 和机器人：本机只有一个真人，进题自动读；两人一台不自动读（B37） */
const autoRead = computed(() => store.mode !== 'duo')

/** 点舞台（B59 / M12）：左半红、右半蓝；游戏自己判断点到了什么 */
function sideOf(x: number, _y: number, w: number): Team {
  return x < w / 2 ? 'red' : 'blue'
}

// ── 背景音乐（B68 / M11）：比赛中放，最后 10 秒加快，倒数 / 结果页停；配置里关了或 🔇 静音不放 ──
watch(
  () => [phase.value, boss.value.tune, battle.prefs.music, settings.soundEnabled] as const,
  ([p, tune, music, sound]) => {
    if (p === 'playing' && music && sound) startMusic(tune, lastTen.value)
    else stopMusic()
  },
  { immediate: true },
)
watch(lastTen, (s) => setMusicSprint(s))

// ── 朗读：弹出提示（打倒啦 / 第二只来啦 / 最后十秒 / 时间到）有人点了 🔊 在读题就不读（B37）；Boss 的话 idle 播法 ──
watch(
  () => store.callout,
  (c) => {
    if (c) say(phraseSpeech({ k: c.key, p: c.p }, lang.value), lang.value, 0, { mode: 'skip' })
  },
)
watch(
  () => store.bossLine,
  (l) => {
    if (l) say(phraseSpeech({ k: l.key }, lang.value), lang.value, 0, { mode: 'idle', rate: BOSS_RATE })
  },
)

// ── 结束：终局特写（镜头对准 Boss，游戏每帧报位置）→ 播报 → 结果页 ──
const finale = ref(false)
const showResult = ref(false)
const hostRef = ref<{ focusOf(team: Team): { x: number; y: number } | null } | null>(null)
const finaleOrigin = ref('50% 50%')
let camFrame = 0
function track(): void {
  camFrame = 0
  if (!finale.value) return
  const f = hostRef.value?.focusOf(state.value?.winner ?? 'red') ?? null
  const next = f ? `${Math.round(f.x)}px ${Math.round(f.y)}px` : '50% 50%'
  if (next !== finaleOrigin.value) finaleOrigin.value = next
  if (typeof requestAnimationFrame === 'function') camFrame = requestAnimationFrame(track)
}
function stopTracking(): void {
  if (camFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(camFrame)
  camFrame = 0
}
watch(finale, (on) => {
  stopTracking()
  if (on) track()
})
/** 结束播报（M11）：一起打说打倒了几次（一次都没有是「累得跑掉了」）；各打各的说哪队赢 / 平手 */
function finishSpeech(): { k: string; p?: Record<string, number> } {
  const s = state.value
  if (!s) return { k: 'boss.timeUp' }
  if (s.variant === 'versus') return s.winner ? { k: `battle.win.${s.winner}` } : { k: 'boss.tie' }
  const n = totalDowns(s)
  if (n === 0) return { k: 'boss.result.none' }
  return { k: s.players.length === 1 ? 'boss.result.solo' : 'boss.result.coop', p: { n } }
}
const endTimers: ReturnType<typeof setTimeout>[] = []
watch(
  phase,
  (p) => {
    endTimers.forEach(clearTimeout)
    endTimers.length = 0
    showResult.value = false
    finale.value = false
    if (p !== 'ended') return
    endTimers.push(setTimeout(() => (finale.value = true), FINALE_START_MS))
    endTimers.push(
      setTimeout(() => {
        // 一个人打出了新纪录：播报后面接一句「新纪录！」（M11）
        const parts = [phraseSpeech(finishSpeech(), lang.value)]
        if (store.record?.isNew) parts.push(phraseSpeech({ k: 'boss.record' }, lang.value))
        say(joinSpeech(parts), lang.value, 0, { mode: 'wait', key: 'finish' })
      }, 1100),
    )
    endTimers.push(
      setTimeout(() => {
        finale.value = false
        showResult.value = true
      }, RESULT_DELAY_MS),
    )
  },
  { immediate: true },
)

const nextKpId = computed<string | null>(() => (state.value ? nextKp(state.value.kpId) : null))
function goNext(): void {
  if (nextKpId.value) emit('next', nextKpId.value)
}
function practiceAgain(): void {
  const id = state.value?.kpId
  if (!id) return
  exitFullscreen()
  emit('practice', id)
}

// ── 布局：手机横屏紧凑版（同 B29）、手机竖屏（只有一个人打） ──
const compactMq = typeof matchMedia === 'function' ? matchMedia('(max-height: 479px)') : null
const portraitMq = typeof matchMedia === 'function' ? matchMedia('(orientation: portrait) and (max-width: 640px)') : null
const compact = ref(compactMq?.matches ?? false)
const portrait = ref(portraitMq?.matches ?? false)
const onCompact = (e: MediaQueryListEvent): void => {
  compact.value = e.matches
}
const onPortrait = (e: MediaQueryListEvent): void => {
  portrait.value = e.matches
}
compactMq?.addEventListener?.('change', onCompact)
portraitMq?.addEventListener?.('change', onPortrait)
/**
 * 作答行题干与键盘左右并排（PlayerRow 的紧凑排法）：横着放的屏幕都这样——iPad / 电脑上舞台占了上面三百来像素，
 * 上下排的话题干只剩一百来像素高，排队、竖式、组合体这些教具放不下（boss:survey -- questions 量过）；只有手机竖屏上下排
 */
const rowCompact = computed(() => !portrait.value)

// ── 暂停（M1，单设备）：⏸ → 计时停、题目盖住、音乐停（音乐只在 playing 时放）；继续前 3-2-1。切到后台自动暂停 ──
/** 继续前的倒数还剩几（0 = 没在倒数） */
const resumeIn = ref(0)
let resumeTimer: ReturnType<typeof setTimeout> | null = null
const paused = computed(() => phase.value === 'paused')
function pauseGame(): void {
  // 多设备没有暂停（M1）：计时在服务器上
  if (phase.value !== 'playing' || online.value) return
  store.pause()
  playSfx('pop')
  sayKeys(['boss.paused'], lang.value, 0, { mode: 'cut' })
}
function stopResumeCount(): void {
  if (resumeTimer) clearTimeout(resumeTimer)
  resumeTimer = null
  resumeIn.value = 0
}
function countResume(n: number): void {
  resumeIn.value = n
  if (n === 0) {
    playSfx('go')
    store.resume()
    return
  }
  playSfx('tick')
  resumeTimer = setTimeout(() => countResume(n - 1), 700)
}
function resumeGame(): void {
  if (!paused.value || resumeIn.value) return
  hush()
  countResume(3)
}
function onHidden(): void {
  if (document.hidden) {
    stopResumeCount()
    pauseGame()
  }
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHidden)
watch(paused, (p) => {
  if (!p) stopResumeCount()
})

// ── 退出确认 ──
const confirming = ref(false)
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
/** 结果页「不玩了」：多设备让服务器关掉房间、大家一起回地图（B9）；单设备直接退出 */
function quit(): void {
  if (online.value) store.quit()
  else exit()
}

onBeforeUnmount(() => {
  endTimers.forEach(clearTimeout)
  stopResumeCount()
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHidden)
  stopTracking()
  compactMq?.removeEventListener?.('change', onCompact)
  portraitMq?.removeEventListener?.('change', onPortrait)
  stopMusic()
  hush()
  exitFullscreen()
})
</script>

<template>
  <div v-if="state" class="boss-arena" :class="[layout, { compact, portrait, finale, online, 'last-ten': lastTen }]">
    <header class="bar">
      <div class="bar-side">
        <button type="button" class="bar-btn" :aria-label="ui('battle.exit')" @click="confirming = true">✕</button>
        <button v-if="phase === 'playing' && !online" type="button" class="bar-btn pause-btn" :aria-label="ui('boss.pause')" @click="pauseGame">⏸</button>
      </div>
      <div class="bar-mid">
        <BossTimer :ms="store.remaining" :total="state.durationMs" />
        <span v-if="watching" class="watching">👀 <RubyText :text="{ k: 'battle.watching' }" /></span>
      </div>
      <div class="bar-side end">
        <span class="downs" :aria-label="ui('boss.downs')">{{ boss.icon }}×{{ downs }}</span>
        <VoiceButton v-if="online" round />
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

    <div class="field">
      <div class="stage" :style="{ '--finale-origin': finaleOrigin }">
        <GameHost
          v-if="gameState"
          ref="hostRef"
          :key="`${state.boss}-${compact ? 'c' : 'n'}`"
          :load="boss.game"
          :state="gameState"
          :events="store.events"
          :compact="compact"
          :side-of="sideOf"
          :fallback="createBossFallback"
          @poke="(t, _x, _y, what) => store.poke(t, what)"
        />
        <Transition name="say">
          <p v-if="store.bossLine" :key="store.bossLine.id" class="boss-say" role="status">{{ boss.icon }} <RubyText :text="{ k: store.bossLine.key }" /></p>
        </Transition>
      </div>
      <div v-if="online" class="others">
        <EmoteBar :side="emoteSide" @send="sendEmote" />
        <BossStrip :players="others" :playing="phase === 'playing'" :voice-of="(id) => voice.markOf(id)" :stars="stars" />
      </div>
      <BossPanel
        v-for="t in teams"
        :key="t"
        :class="online ? 'area-red' : `area-${t}`"
        :team="t"
        :rows="rowsOf(t)"
        :score="scoreOf(t)"
        :streak="streakOf(t)"
        :star="starOf(t)"
        :operable="store.operable"
        :auto-read="autoRead"
        :compact="rowCompact"
        @answer="(id, g) => store.submit(id, g)"
        @input="(id, v) => store.setInput(id, v)"
      />
    </div>

    <Callout :callout="store.callout" />
    <div v-if="paused" class="pause-mask" role="dialog" :aria-label="ui('boss.paused')">
      <div v-if="resumeIn" :key="resumeIn" class="resume-count" aria-live="assertive">{{ resumeIn }}</div>
      <div v-else class="pause-card">
        <p class="pause-title">⏸ <RubyText :text="{ k: 'boss.paused' }" /></p>
        <div class="pause-actions">
          <BigButton color="green" class="resume-btn" @click="resumeGame">▶ <RubyText :text="{ k: 'boss.resume' }" /></BigButton>
          <BigButton color="ghost" class="pause-quit" @click="confirming = true"><RubyText :text="{ k: 'battle.quit' }" /></BigButton>
        </div>
      </div>
    </div>
    <Countdown v-if="phase === 'countdown'" :rule="store.intro ? `boss.rule.${state.variant}` : null" :go="['gong']" @done="store.beginPlay()" />
    <BossResult
      v-if="showResult"
      :match="state"
      :next="nextKpId"
      :timeline="store.timeline"
      :wrongs="store.wrongs"
      :record="store.record"
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

    <EmoteLayer v-if="online" :emotes="battle.emotes" />
    <!-- 手机竖着拿：一个人打可以（M6），两个人要横过来；多设备每台只有自己一个 -->
    <RotateOverlay v-if="duo" />
  </div>
</template>

<style scoped>
/* 尺寸同对战的竞技场：键 56px、大字 44px */
.boss-arena {
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
  height: 52px;
  padding: 0 8px;
}
.bar-side,
.bar-mid {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bar-side.end {
  justify-content: flex-end;
}
.bar-mid {
  flex: 1;
  justify-content: center;
  min-width: 0;
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
.downs {
  padding: 2px 12px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-md);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* 舞台与作答区：宽屏上舞台全宽、下面作答区（一个人居中最宽 820px，两个人左红右蓝） */
.field {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 8px;
  padding: 0 8px 8px;
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: clamp(220px, 35vh, 320px) minmax(0, 1fr);
  grid-template-areas: 'stage' 'red';
}
.lay-duo .field {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  grid-template-areas: 'stage stage' 'red blue';
}
.stage {
  grid-area: stage;
  position: relative;
  min-height: 0;
  min-width: 0;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  overflow: hidden;
  transition: transform 0.5s ease;
}
.area-red {
  grid-area: red;
}
.area-blue {
  grid-area: blue;
}
.lay-solo .area-red {
  width: min(100%, 820px);
  justify-self: center;
}
/* 多设备（M6）：舞台下面一排「表情键 + 头像条」，再下面是自己那一栏；观战的只有舞台 + 头像条（舞台占满） */
.others {
  grid-area: strip;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.others > :deep(.strip) {
  flex: 1;
  min-width: 0;
}
.online.lay-solo .field {
  grid-template-rows: clamp(200px, 32vh, 300px) auto minmax(0, 1fr);
  grid-template-areas: 'stage' 'strip' 'red';
}
.lay-watch .field {
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas: 'stage' 'strip';
}
.watching {
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-sm);
  font-weight: 800;
  white-space: nowrap;
}
/* 手机横屏紧凑版：一个人左舞台右作答，两个人中间舞台两边作答 */
.boss-arena.compact {
  --tap-min: 48px;
  --fs-huge: 28px;
  --fs-xl: 22px;
  --fs-lg: 18px;
  --fs-md: 15px;
}
.compact .bar {
  height: 38px;
}
.compact .bar-btn {
  width: 36px;
  height: 36px;
  font-size: 16px;
}
.compact .field {
  gap: 6px;
  padding: 0 6px 6px;
  grid-template-columns: 48% minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr);
  grid-template-areas: 'stage red';
}
.compact.lay-duo .field {
  grid-template-columns: minmax(0, 1fr) 28% minmax(0, 1fr);
  grid-template-areas: 'red stage blue';
}
/* 两个人时两边作答栏更窄（中间让给舞台）：算式再小一档，「9 + 4 = ?」别折成两行 */
.boss-arena.compact.lay-duo {
  --fs-huge: 24px;
}
/* 更窄的横屏手机（667 / 736 / 780 宽）两个人：中间放舞台的话两边作答栏不到 290px，题干和数字键盘并排放不下（键盘最右一列被裁掉，
   boss:survey -- questions phone-small-duo 量过）——改成同对战紧凑版的排法：舞台一条横在上面、下面两栏作答区 */
@media (max-height: 479px) and (max-width: 839px) {
  .compact.lay-duo .field {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: clamp(84px, 25vh, 120px) minmax(0, 1fr);
    grid-template-areas: 'stage stage' 'red blue';
  }
  .boss-arena.compact.lay-duo :deep(.callout) {
    top: calc(env(safe-area-inset-top) + 38px + 12.5vh - 24px);
    bottom: auto;
  }
}
.compact.lay-solo .area-red {
  width: auto;
}
/* 手机横屏的多设备：左边舞台 + 下面头像条，右边自己那一栏 */
.compact.online.lay-solo .field {
  grid-template-columns: 48% minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  grid-template-areas: 'stage red' 'strip red';
}
.compact.lay-watch .field {
  grid-template-columns: minmax(0, 1fr);
}
.compact .others :deep(.emote-btn) {
  width: 32px;
  height: 32px;
  font-size: 18px;
}
.compact :deep(.numpad),
.compact :deep(.numpad .grid) {
  gap: 6px;
}
/* 手机竖屏（只有一个人打）：上舞台、下作答区（题干与键盘上下排，排队这种竖着排的教具要地方：舞台 32vh、选项卡矮一点；
   boss:survey -- questions 量过，36vh 时「从下数第二个」那道题最下面一只被裁掉） */
.portrait.lay-solo .field {
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: 32vh minmax(0, 1fr);
  grid-template-areas: 'stage' 'red';
}
.portrait.online.lay-solo .field {
  grid-template-rows: 28vh auto minmax(0, 1fr);
  grid-template-areas: 'stage' 'strip' 'red';
}
.portrait :deep(.side .a .cards .card) {
  min-height: 64px;
}

/* Boss 说的话：舞台最上面的小气泡，压在血条上——放低了会盖住大个子 Boss 的头盔、王冠和张大的嘴（boss:survey 截图里看到的）；
   Boss 说话都是在 6 秒没被打中之后（挑衅）或被点了一下，那时血条不会变 */
.boss-say {
  position: absolute;
  left: 50%;
  top: 6px;
  transform: translateX(-50%);
  z-index: 2;
  margin: 0;
  padding: 4px 14px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(61, 44, 30, 0.2);
  font-weight: 900;
  white-space: nowrap;
  pointer-events: none;
}
.say-enter-active,
.say-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.say-enter-from,
.say-leave-to {
  opacity: 0;
  transform: translate(-50%, -6px);
}

/* 弹出提示（打倒啦 / 第二只来啦 / 最后十秒 / 时间到）：对战里放在整页 14% 高处，这里会正好盖住舞台中间 Boss 被打倒的动画——
   挪到舞台下沿的台面上（宽屏：舞台在上；紧凑版：舞台一整栏，放在下面；竖屏：舞台 32vh） */
.boss-arena :deep(.callout) {
  top: calc(env(safe-area-inset-top) + 52px + clamp(220px, 35vh, 320px) - 64px);
}
.boss-arena.compact :deep(.callout) {
  top: auto;
  bottom: 14%;
}
.boss-arena.portrait :deep(.callout) {
  top: calc(env(safe-area-inset-top) + 52px + 32vh - 64px);
  /* 竖屏只有 390 宽：「第二只来啦，它戴着头盔！」用大号字比屏幕还宽，两头被切 */
  padding: 4px 14px;
  font-size: var(--fs-lg);
}
/* 最后 10 秒：四周一圈暖红的呼吸光（M1 / M10） */
.boss-arena.last-ten::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 23;
  pointer-events: none;
  box-shadow: inset 0 0 50px 12px rgba(255, 107, 107, 0.35);
  animation: breathe 0.9s ease-in-out infinite alternate;
}
@keyframes breathe {
  from {
    opacity: 0.35;
  }
  to {
    opacity: 1;
  }
}
/* 终局特写：舞台放大、镜头对准 Boss（--finale-origin 由游戏报的位置算），作答区退后 */
.boss-arena.finale .stage {
  z-index: 27;
  transform: scale(1.3);
  transform-origin: var(--finale-origin, 50% 50%);
  transition: transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1);
  box-shadow: 0 18px 50px rgba(61, 44, 30, 0.35);
}
.boss-arena.finale :deep(.side) {
  opacity: 0.35;
  transition: opacity 0.4s ease;
}
.compact.finale .stage {
  transform: scale(1.15);
}
@media (prefers-reduced-motion: reduce) {
  .boss-arena.last-ten::after {
    animation: none;
  }
  .boss-arena.finale .stage {
    transform: none;
  }
}

/* 暂停：盖住舞台下面的作答区与舞台（题目别让人偷看着想，M1），顶栏还看得见计时器停着 */
.pause-mask {
  position: absolute;
  inset: calc(env(safe-area-inset-top) + 52px) 0 0;
  z-index: 35;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(253, 246, 236, 0.985);
}
.compact .pause-mask {
  inset: calc(env(safe-area-inset-top) + 38px) 0 0;
}
.pause-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 24px 28px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.pause-title {
  font-size: var(--fs-xl);
  font-weight: 900;
}
.pause-actions {
  display: flex;
  gap: 12px;
}
.resume-count {
  font-size: 120px;
  font-weight: 900;
  color: var(--c-primary);
  animation: count-pop 0.7s ease-out;
}
@keyframes count-pop {
  from {
    transform: scale(1.6);
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .resume-count {
    animation: none;
  }
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
</style>
