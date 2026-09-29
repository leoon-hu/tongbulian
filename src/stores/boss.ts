/**
 * 打怪兽（需求第 10 章 M1–M7、M13）的客户端状态：单设备的一局——一个人打 / 和机器人 / 两人一台 × 一起打 / 各打各的。
 * 规则（得分、连击、最后 10 秒、Boss 链、合力拳、时间到）都在 battle/timed.ts；这里管：
 * 计时（比赛中每 CLOCK_MS 推进一次 tick，最后 10 秒、时间到）、暂停 / 继续（M1）、答完的反馈窗口、机器人的节奏、
 * 给 Boss 游戏的事件队列、音效、弹出提示（打倒啦 / 第二只来啦 / 最后十秒 / 时间到）、Boss 的表演（挑衅舞 / 吼 / 扔果冻，
 * 什么时候演由这里定，M8）、点一下舞台的声音（M12）、结果页要的得分走势、错题与一个人打的最好成绩（M7）、谁在台上（M9）。
 * 多设备（M13，阶段 3）：状态来自房间快照里的 timed（stores/room 喂 syncOnline / onRemoteEvent），计时以服务器为准——
 * 这里按服务器时钟（clockOffset）算剩余时间、只做显示；题目本机判分、答案发给服务器，比分与事件等服务器回来；没有暂停、没有机器人。
 * 名字 / 小动物 / 机器人快慢 / 音乐开关 / 开场规则讲没讲过都在 stores/battle.ts 的偏好里，两种玩法共用。
 */
import { computed, ref } from 'vue'
import type { RoomSnapshot } from '@/battle/protocol'
import { defineStore } from 'pinia'
import type { Question } from '@/types/models'
import { createRng, type RNG } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { lang } from '@/engine/i18n'
import { phraseSpeech, questionSpeech } from '@/engine/speech'
import { warmUp } from '@/engine/voice'
import type { Team } from '@/battle/protocol'
import { AI_ID, AI_KEY_MS, AI_SUBMIT_MS, blendPace, paceOfRun, planAnswer, type AiLevel, type HumanPace } from '@/battle/ai'
import { questionAt, questionsAhead } from '@/battle/stream'
import { KEY_GAIN, KEY_GAP_MS, panOf, playSfx, type Sfx } from '@/battle/sfx'
import {
  answer as applyAnswer,
  beginPlay as applyBegin,
  createTimed,
  pause as applyPause,
  resume as applyResume,
  TAUNT_ACTS,
  DEFAULT_DURATION_S,
  findTimedPlayer,
  remainingMs,
  setInput as applyInput,
  tick as applyTick,
  type BossArenaEvent,
  type BossSeqEvent,
  type DurationS,
  type PunchMove,
  type TimedEvent,
  type TimedMatch,
  type TimedPlayer,
  type TimedPlayerInit,
  type TimedVariant,
  type BossSide,
  type TauntAct,
} from '@/battle/timed'
import { bestKey, resolveBoss, withBest, type LocalBossMode } from '@/battle/boss'
import { nextLineup, SWAP_GAP_MS } from '@/battle/boss/lineup'
import { ENERGY_AT, HIT_AT } from '@/battle/game/boss-contract'
import {
  ANSWER_WAIT_MS,
  CALLOUT_MS,
  EVENT_LOG,
  FEEDBACK_WRONG_MS,
  INTRO_AGAIN_MS,
  VIBRATE_RIGHT,
  VIBRATE_WRONG,
  useBattleStore,
  vibrate,
  type Callout,
  type Feedback,
  type OnlineTransport,
} from '@/stores/battle'

/** 答对后停多久出下一题（M1：比对战的 600 ms 快，拳头动画和下一题并行）；答错照旧 1.2 秒 */
export const BOSS_FEEDBACK_RIGHT_MS = 400
/** 计时器多久推进一次（显示按秒变，最后 10 秒 / 时间到最多晚这么久） */
export const CLOCK_MS = 200
/**
 * Boss 的表演（M8）：某一边这么久没人打中（挥空不算），Boss 演一段——挑衅舞 → 吼 → 扔果冻轮流；还是没人打中就每
 * TAUNT_REPEAT_MS 再演下一段。Boss 说话（气泡 + 朗读）两句之间至少隔 TAUNT_AGAIN_MS，免得太吵
 */
export const TAUNT_AFTER_MS = 6000
export const TAUNT_REPEAT_MS = 8000
export const TAUNT_AGAIN_MS = 12000
/** 表演的声音在 taunt 事件之后多久放：和游戏里张嘴开吼、果冻球出手、落地那一帧对齐 */
export const ROAR_AT_MS = 150
export const TOSS_AT_MS = 250
export const SPLAT_AT_MS = 850
/** 每种表演 Boss 说的话 */
export const TAUNT_LINES: Record<TauntAct, string> = { dance: 'boss.taunt', roar: 'boss.roar', jelly: 'boss.jelly' }
/** 点一下 Boss（M12）：咯咯笑；说一句「好痒」至少隔这么久 */
export const TICKLE_AGAIN_MS = 8000
/** 台下的人打中后过这么久再看要不要换他上台（M9）：能量拳先飞完、打到，再换人，画面与声音对得上 */
export const LINEUP_AFTER_MS = 1200
/** 多设备：正在按的内容多久发一次（同对战，B42） */
export const INPUT_SEND_MS = 100

/** 谁来玩：单设备三种 + 多设备（M5） */
export type BossPlayMode = LocalBossMode | 'online'

/** 一局的「身份」：多设备里开始时刻在倒数 → 开打时会变，按选手与种子认（每局的种子都是新的） */
function matchKeyOf(m: TimedMatch): string {
  return `${m.kpId}|${m.players.map((p) => `${p.id}:${p.seed}`).join(',')}`
}
/** Boss 说话的气泡停多久 */
export const BOSS_SAY_MS = 2400
/** 机器人当队友时比「跟着你」再慢一点（M5），让孩子当本局之星 */
export const HELPER_SLOWER = 1.15
/** 开场规则讲没讲过记在对战偏好的 intros 里，用这个键（同一只 Boss 一天讲一次，M1） */
export const INTRO_KEY = 'boss'

/** 这一拳的声音（M11） */
const MOVE_SFX: Record<PunchMove, Sfx> = { jab: 'punch', hook: 'hook', upper: 'upper', super: 'smash' }

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

/** 新上场的 Boss 播什么话：第二只戴头盔、第三只戴王冠、第四只起金色 */
export function bossInKey(level: number): string {
  if (level === 2) return 'boss.in.2'
  if (level === 3) return 'boss.in.3'
  return 'boss.in.gold'
}

export const useBossStore = defineStore('boss', () => {
  const battle = useBattleStore()

  const state = ref<TimedMatch | null>(null)
  const mode = ref<BossPlayMode | null>(null)
  /** 本机可以操作的选手 id（两人一台两个，别的一个） */
  const operable = ref<string[]>([])
  const pending = ref<Record<string, Feedback>>({})
  /** 给 Boss 游戏的带序号事件（最近 EVENT_LOG 条） */
  const events = ref<BossSeqEvent[]>([])
  let eventSeq = 0
  const callout = ref<Callout | null>(null)
  let calloutSeq = 0
  /** Boss 正在说的话（挑衅）：竞技场冒气泡、朗读 */
  const bossLine = ref<{ id: number; key: string } | null>(null)
  let lineSeq = 0
  /** 得分走势（M7）：每打中一拳记一笔——开打后多少毫秒、谁、他这时的得分 */
  const timeline = ref<{ t: number; id: string; score: number }[]>([])
  /** 这台设备上的真人答错的题（M7，同 B69） */
  const wrongs = ref<{ playerId: string; index: number }[]>([])
  /** 这局开场要不要先讲规则 */
  const intro = ref(false)
  /** 一个人打的这一局与本机最好成绩（M7）：best = 这局之前的最好（没有 = null），isNew = 这局比以前都高（第一次打、得分不是 0 也算） */
  const record = ref<{ score: number; best: number | null; isNew: boolean } | null>(null)
  /** 计时器用的「现在」：比赛中每 CLOCK_MS 更新 */
  const nowMs = ref(Date.now())
  const remaining = computed(() => (state.value ? remainingMs(state.value, nowMs.value) : 0))

  const timers = new Set<ReturnType<typeof setTimeout>>()
  const aiTimers = new Set<ReturnType<typeof setTimeout>>()
  let ticker: ReturnType<typeof setInterval> | null = null
  let aiRng: RNG = createRng()
  let aiLevel: AiLevel = 'auto'
  /** 每一边下一次表演的时刻、演过几段（轮流 dance → roar → jelly） */
  const tauntNext = new Map<BossSide, number>()
  const tauntCount = new Map<BossSide, number>()
  let lastLineAt = -Infinity
  let tickleAt = -Infinity
  /** 每一边最近一次打倒的时刻：表演还没开始（没张嘴、没出手）就被打倒，游戏不演了，声音也不放 */
  const downAt = new Map<BossSide, number>()
  /** 暂停的那一刻（继续时把各种「多久以前」往后挪这么久） */
  let pausedAt: number | null = null
  /** 台上的人（M9）：选手 id，单设备是全部；多设备每队最多两个，按 battle/boss/lineup 轮换 */
  const stage = ref<string[]>([])
  const lastHitAt = new Map<string, number>()
  const stageSince = new Map<string, number>()
  /** 每队上次换人的时刻（同一队两次换人至少隔 SWAP_GAP_MS） */
  const lastSwap = new Map<Team, number>()
  /** 走势用：每人按事件累加的得分（多设备的事件先于快照到，不能看快照里的分） */
  const scoreSoFar = new Map<string, number>()

  // ── 多设备（M13） ──
  let transport: OnlineTransport | null = null
  /** 我是谁、主持人是谁 */
  const online = ref<{ you: string; hostId: string } | null>(null)
  /** 服务器时钟 − 本机时钟（每份快照更新）：剩余时间按服务器算 */
  const clockOffset = ref(0)
  /** 答完一题：反馈时间到了 + 快照里题号推进了才关反馈（同对战，B41） */
  const awaiting = new Map<string, { index: number; elapsed: boolean }>()
  let inputTimer: ReturnType<typeof setTimeout> | null = null
  let inputPending: string | null = null
  let matchKey = ''
  /** 现在（多设备按服务器时钟） */
  function clock(): number {
    return Date.now() + (mode.value === 'online' ? clockOffset.value : 0)
  }
  const keySfxAt = new Map<string, number>()
  /** 孩子的节奏（机器人「跟着你」用，B60）：每题用时（最近 5 题）、答了几题、对了几题 */
  const shownAt = new Map<string, number>()
  const humanStats = { times: [] as number[], answered: 0, correct: 0 }

  function later(set: Set<ReturnType<typeof setTimeout>>, fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      set.delete(t)
      fn()
    }, ms)
    set.add(t)
  }
  function clearAll(set: Set<ReturnType<typeof setTimeout>>): void {
    for (const t of set) clearTimeout(t)
    set.clear()
  }

  function pushEvent(e: BossArenaEvent): void {
    events.value = [...events.value.slice(-(EVENT_LOG - 1)), { seq: ++eventSeq, e }]
  }

  function stopClock(): void {
    if (ticker) clearInterval(ticker)
    ticker = null
  }
  function startClock(): void {
    stopClock()
    ticker = setInterval(() => advance(clock()), CLOCK_MS)
  }

  function reset(): void {
    clearAll(timers)
    clearAll(aiTimers)
    stopClock()
    pending.value = {}
    events.value = []
    callout.value = null
    bossLine.value = null
    timeline.value = []
    wrongs.value = []
    keySfxAt.clear()
    shownAt.clear()
    humanStats.times = []
    humanStats.answered = 0
    humanStats.correct = 0
    tauntNext.clear()
    tauntCount.clear()
    downAt.clear()
    lastLineAt = -Infinity
    tickleAt = -Infinity
    pausedAt = null
    record.value = null
    stage.value = []
    lastHitAt.clear()
    stageSince.clear()
    lastSwap.clear()
    scoreSoFar.clear()
    awaiting.clear()
    if (inputTimer) clearTimeout(inputTimer)
    inputTimer = null
    inputPending = null
  }

  /**
   * 看要不要换人上台（M9）：新上台的记下上台时刻、那一队记下换人时刻；还有人该换、只是离上次换人太近，
   * 就等到能换的时候再看一次（一队一次只换一个）
   */
  function refreshLineup(now: number): void {
    const s = state.value
    if (!s) return
    const prev = stage.value
    const next = nextLineup(prev, s.players, lastHitAt, stageSince, now, lastSwap)
    for (const id of next) {
      if (prev.includes(id)) continue
      stageSince.set(id, now)
      // 开局补满不算换人
      const p = s.players.find((x) => x.id === id)
      if (p && prev.length) lastSwap.set(p.team, now)
    }
    if (next.join() !== prev.join()) stage.value = next
    // 还有想换的（不看间隔算一次，和现在不一样）：到这一队能换的时候再看
    const free = nextLineup(next, s.players, lastHitAt, stageSince, now)
    if (free.join() !== next.join()) {
      const wait = Math.max(0, ...[...lastSwap.values()].map((t) => t + SWAP_GAP_MS - now))
      later(timers, () => refreshLineup(clock()), Math.max(50, Math.min(wait, SWAP_GAP_MS)))
    }
  }

  function showCallout(key: string, team: Team | 'both', p?: Callout['p']): void {
    const id = ++calloutSeq
    callout.value = { id, key, team, p }
    later(
      timers,
      () => {
        if (callout.value?.id === id) callout.value = null
      },
      CALLOUT_MS,
    )
  }

  function bossSay(key: string): void {
    const id = ++lineSeq
    bossLine.value = { id, key }
    later(
      timers,
      () => {
        if (bossLine.value?.id === id) bossLine.value = null
      },
      BOSS_SAY_MS,
    )
  }

  /** 事件的反应：入队（游戏）、音效、弹出提示（朗读由竞技场看 callout 做） */
  function react(evts: TimedEvent[], now: number): void {
    const s = state.value
    for (const e of evts) {
      pushEvent(e)
      if (e.type === 'hit') {
        tauntNext.set(e.side, now + TAUNT_AFTER_MS)
        const pan = panOf(e.team)
        const hit = e
        // 声音放在拳头打到的那一刻（游戏里出拳到命中 70–200 ms，M10）：「嘭」+ 充气玩具的「boing」（这一拳的分越多音越高）；
        // 台下的人（多设备，M9）是从观众席飞过去的能量拳，ENERGY_AT 才打到
        const at = stage.value.includes(e.playerId) ? HIT_AT[e.move] : ENERGY_AT
        later(
          timers,
          () => {
            playSfx(MOVE_SFX[hit.move], 1, 1, pan)
            playSfx('squeak', 1 + (hit.points - 1) * 0.15, 0.8, pan)
            if (hit.together) playSfx('clap')
          },
          at * 1000,
        )
        const score = (scoreSoFar.get(e.playerId) ?? 0) + e.points
        scoreSoFar.set(e.playerId, score)
        if (s) timeline.value = [...timeline.value, { t: Math.max(0, now - s.startedAt), id: e.playerId, score }]
        // 打中了的台下的人，拳打完再看要不要换他上台
        lastHitAt.set(e.playerId, now)
        if (!stage.value.includes(e.playerId)) later(timers, () => refreshLineup(clock()), LINEUP_AFTER_MS)
      } else if (e.type === 'miss') {
        playSfx('whiff', 1, 0.9, panOf(e.team))
      } else if (e.type === 'bossDown') {
        downAt.set(e.side, now)
        playSfx('deflate')
        // 一小段胜利短句（M11）+ 观众欢呼
        later(timers, () => playSfx('jingle'), 450)
        later(timers, () => playSfx('cheer'), 700)
        showCallout('boss.down', e.side === 'shared' ? 'both' : e.side)
      } else if (e.type === 'bossIn') {
        // 新 Boss 从天而降、落地一震：打倒的提示先说完再说它
        later(timers, () => playSfx('thud'), 900)
        later(timers, () => showCallout(bossInKey(e.level), e.side === 'shared' ? 'both' : e.side), 1300)
      } else if (e.type === 'lastTen') {
        playSfx('tick')
        showCallout('boss.lastTen', 'both')
      } else if (e.type === 'timeUp') {
        playSfx('referee')
        showCallout('boss.timeUp', 'both')
      } else if (e.type === 'finished') {
        stopClock()
        clearAll(aiTimers)
        noteRecord()
        later(timers, () => playSfx('fanfare'), 700)
      }
    }
  }

  /** 一个人打（M7）：和本机这个知识点这个时长的最好成绩比，打破了就记下来 */
  function noteRecord(): void {
    const s = state.value
    const p = s?.players[0]
    if (!s || !p || mode.value !== 'solo') return
    const key = bestKey(s.kpId, Math.round(s.durationMs / 1000))
    const prev = battle.prefs.bossBest[key]
    const best = typeof prev === 'number' ? prev : null
    const isNew = p.score > (best ?? 0)
    record.value = { score: p.score, best, isNew }
    if (isNew) battle.prefs.bossBest = withBest(battle.prefs.bossBest, key, p.score)
  }

  /** 有 Boss 的几边：一起打只有 shared，各打各的红蓝各一只 */
  function sidesOf(s: TimedMatch): BossSide[] {
    return s.bosses.map((b) => b.side)
  }

  /** Boss 演一段（M8，只是表演）：游戏收到 taunt 事件演，这里放声音、说话 */
  function taunt(side: BossSide, act: TauntAct, now = Date.now()): void {
    pushEvent({ type: 'taunt', side, act })
    const pan = side === 'shared' ? 0 : panOf(side)
    // 张嘴 / 出手的那一刻还在打、这只没被打倒才放（游戏里没开始的表演就不演了）；果冻球出了手，落地那一声照放
    const going = (): boolean => state.value?.phase === 'playing' && (downAt.get(side) ?? -Infinity) < now
    if (act === 'roar') later(timers, () => going() && playSfx('roar', 1, 0.8, pan), ROAR_AT_MS)
    if (act === 'jelly')
      later(
        timers,
        () => {
          if (!going()) return
          playSfx('toss', 1, 0.8, pan)
          later(timers, () => playSfx('splat', 1, 0.8, pan), SPLAT_AT_MS - TOSS_AT_MS)
        },
        TOSS_AT_MS,
      )
    if (now - lastLineAt >= TAUNT_AGAIN_MS) {
      lastLineAt = now
      bossSay(TAUNT_LINES[act])
    }
  }

  /** 时间往前走（计时器每 CLOCK_MS 调；测试直接调）：最后 10 秒、时间到；很久没人打中 Boss 挑衅一句 */
  function advance(now = Date.now()): void {
    nowMs.value = now
    const s = state.value
    if (!s || s.phase !== 'playing') return
    // 多设备：最后 10 秒、时间到由服务器发（M13），这里只走显示用的时钟与本机的表演
    if (mode.value !== 'online') {
      const res = applyTick(s, now)
      if (res.match !== s) state.value = res.match
      if (res.events.length) react(res.events, now)
    }
    const cur = state.value
    if (cur?.phase !== 'playing') return
    for (const side of sidesOf(cur)) {
      const at = tauntNext.get(side)
      if (at === undefined || now < at) continue
      const n = tauntCount.get(side) ?? 0
      tauntCount.set(side, n + 1)
      tauntNext.set(side, now + TAUNT_REPEAT_MS)
      taunt(side, TAUNT_ACTS[n % TAUNT_ACTS.length]!, now)
    }
  }

  /** 暂停（M1，只有单设备）：计时停、机器人停；题目由竞技场盖住，音乐由竞技场停 */
  function pause(now = Date.now()): void {
    const s = state.value
    if (!s || s.phase !== 'playing' || mode.value === 'online') return
    state.value = applyPause(s, now)
    nowMs.value = now
    pausedAt = now
    stopClock()
    clearAll(aiTimers)
  }

  /** 继续（竞技场先倒数 3-2-1 再调）：时间到的时刻往后挪；表演、节奏的「多久以前」也挪；机器人接着答 */
  function resume(now = Date.now()): void {
    const s = state.value
    if (!s || s.phase !== 'paused') return
    const since = pausedAt ?? now
    const gap = Math.max(0, now - since)
    pausedAt = null
    state.value = applyResume(s, now)
    nowMs.value = now
    for (const [side, at] of tauntNext) tauntNext.set(side, at + gap)
    for (const [id, at] of shownAt) if (at <= since) shownAt.set(id, at + gap)
    startClock()
    if (mode.value === 'ai' && !pending.value[AI_ID]) aiStep()
  }

  /**
   * 点了一下舞台（B59 / M12，不计分）：游戏说点中了什么就放什么声音——Boss 咯咯笑（隔一会儿还说一句「好痒」）、
   * 拳手 boing、锣「当」（轻一点，别吓着）、观众欢呼
   */
  function poke(team: Team, what: string | undefined, now = Date.now()): void {
    const pan = panOf(team) * 0.6
    if (what === 'boss') {
      playSfx('giggle', 1, 0.8, pan)
      if (now - tickleAt >= TICKLE_AGAIN_MS && !bossLine.value) {
        tickleAt = now
        bossSay('boss.tickle')
      }
    } else if (what === 'fighter') playSfx('boing', 1, 0.6, pan)
    else if (what === 'gong') playSfx('gong', 1, 0.45)
    else if (what === 'crowd') playSfx('cheer', 1, 0.35, pan)
  }

  /** 这一局要读的先预解码：本机真人接下来的题 + 这个玩法的提示语 */
  function prepareVoice(): void {
    const s = state.value
    if (!s) return
    const mine = new Set(operable.value)
    const tokens = s.players
      .filter((p) => p.kind === 'human' && mine.has(p.id))
      .flatMap((p) => questionsAhead(s.kpId, p.seed, p.index, 16).flatMap((q) => questionSpeech(q, lang.value)))
    for (const key of ['boss.down', 'boss.in.2', 'boss.lastTen', 'boss.timeUp', ...Object.values(TAUNT_LINES)]) tokens.push(...phraseSpeech({ k: key }, lang.value))
    warmUp(tokens, lang.value)
  }

  function planIntro(now: number): void {
    const last = battle.prefs.intros[INTRO_KEY]
    intro.value = !(typeof last === 'number' && now - last < INTRO_AGAIN_MS)
    if (intro.value) battle.prefs.intros = { ...battle.prefs.intros, [INTRO_KEY]: now }
  }

  /** 开一局（进入倒数）。名字与小动物同对战：自定义的优先，没有的随机、两边不一样（B17） */
  function startLocal(opts: {
    kpId: string
    mode: LocalBossMode
    variant?: TimedVariant
    durationS?: DurationS
    boss?: string
    seeds?: Record<string, number>
    aiSeed?: number
    now?: number
  }): void {
    reset()
    mode.value = opts.mode
    aiRng = createRng(opts.aiSeed)
    const variant: TimedVariant = opts.mode === 'solo' ? 'coop' : (opts.variant ?? 'coop')
    // 机器人当队友按「跟着你」（M5）；各打各的按配置里选的快慢
    aiLevel = variant === 'coop' ? 'auto' : battle.prefs.aiLevel
    const { me, right } = battle.identities()
    const names = battle.prefs.names
    const players: TimedPlayerInit[] =
      opts.mode === 'solo'
        ? [{ id: 'left', name: me.name, team: 'red', avatar: me.avatar }]
        : opts.mode === 'ai'
          ? [
              { id: 'left', name: me.name, team: 'red', avatar: me.avatar },
              { id: AI_ID, name: '', team: 'blue', kind: 'ai' },
            ]
          : [
              { id: 'left', name: names.left || me.name, team: 'red', avatar: me.avatar },
              { id: 'right', name: right.name, team: 'blue', avatar: right.avatar },
            ]
    operable.value = players.filter((p) => p.kind !== 'ai').map((p) => p.id)
    const now = opts.now ?? Date.now()
    nowMs.value = now
    state.value = createTimed({
      kpId: opts.kpId,
      boss: resolveBoss(opts.boss),
      variant,
      durationMs: (opts.durationS ?? DEFAULT_DURATION_S) * 1000,
      players,
      seeds: Object.fromEntries(players.map((p) => [p.id, opts.seeds?.[p.id] ?? newSeed()])),
      now,
    })
    stage.value = players.map((p) => p.id)
    planIntro(now)
    pushEvent({ type: 'countdown' })
    prepareVoice()
  }

  /** 倒数结束：开打，计时器走起来，机器人开始动 */
  function beginPlay(now = Date.now()): void {
    const s = state.value
    // 多设备的开打时刻由服务器定（go 事件）
    if (!s || s.phase !== 'countdown' || mode.value === 'online') return
    state.value = applyBegin(s, now)
    nowMs.value = now
    for (const side of sidesOf(state.value)) tauntNext.set(side, now + TAUNT_AFTER_MS)
    // 「开始！」那一声锣由倒数组件放（M11）
    pushEvent({ type: 'go' })
    for (const p of state.value.players) if (p.kind === 'human') shownAt.set(p.id, now)
    startClock()
    if (mode.value === 'ai') aiStep()
  }

  function questionOf(p: TimedPlayer): Question {
    const s = state.value
    if (!s) throw new Error('no match')
    return questionAt(s.kpId, p.seed, p.index)
  }

  /** 按键（M9）：拳套蓄一格力的声音，只给本设备的真人、不空的输入、比赛中，KEY_GAP_MS 一次 */
  function keySound(p: TimedPlayer, input: string, now: number): void {
    if (p.kind !== 'human' || !input || state.value?.phase !== 'playing') return
    if (now - (keySfxAt.get(p.id) ?? -Infinity) < KEY_GAP_MS) return
    keySfxAt.set(p.id, now)
    playSfx('charge', 1 + Math.min(3, input.length) * 0.12, KEY_GAIN, panOf(p.team))
  }

  function setInput(playerId: string, input: string, now = Date.now()): void {
    const s = state.value
    const p = s ? findTimedPlayer(s, playerId) : undefined
    if (!s || !p) return
    keySound(p, input, now)
    if (mode.value === 'online') {
      // 正在按的内容发给服务器（节流，同对战 B42），别的设备据此画拳套蓄力、头像条上的「正在按」；自己的显示框由键盘组件管
      inputPending = input
      if (!inputTimer)
        inputTimer = setTimeout(() => {
          inputTimer = null
          if (inputPending !== null) transport?.send({ type: 'input', input: inputPending })
          inputPending = null
        }, INPUT_SEND_MS)
      return
    }
    state.value = applyInput(s, playerId, input)
  }

  function clearPending(playerId: string): void {
    const rest = { ...pending.value }
    delete rest[playerId]
    pending.value = rest
    shownAt.set(playerId, Date.now())
  }

  /** 某人提交了答案：先把时间推到这一刻（时间到了就不算）、判分、记进状态机、开反馈窗口 */
  function submit(playerId: string, given: unknown, now = Date.now()): void {
    advance(now)
    const s = state.value
    if (!s || s.phase !== 'playing' || pending.value[playerId]) return
    // 多设备：服务器在时间到 + 宽限后才发结束，本机的计时器到 0 就不再收（交上去服务器也不算，M13）
    if (mode.value === 'online' && remainingMs(s, clock()) <= 0) return
    const p = findTimedPlayer(s, playerId)
    if (!p) return
    const q = questionOf(p)
    const ok = checkAnswer(q, given)
    pending.value = { ...pending.value, [playerId]: { question: q, correct: ok, given: String(given) } }
    if (p.kind === 'human') {
      if (!ok) wrongs.value = [...wrongs.value, { playerId, index: p.index }]
      const since = shownAt.get(playerId)
      if (since !== undefined) humanStats.times = [...humanStats.times.slice(-4), Math.max(0, now - since)]
      humanStats.answered += 1
      if (ok) humanStats.correct += 1
      vibrate(ok ? VIBRATE_RIGHT : VIBRATE_WRONG)
    }
    if (mode.value === 'online') {
      // 本机判分、结果报给服务器（同对战 B41）；得分与事件等服务器回来（时间到之后到的服务器不算，M13）
      awaiting.set(playerId, { index: p.index + 1, elapsed: false })
      if (inputTimer) clearTimeout(inputTimer)
      inputTimer = null
      inputPending = null
      transport?.send({ type: 'answer', index: p.index, given: String(given), correct: ok })
    } else {
      const res = applyAnswer(s, playerId, p.index, ok, now)
      state.value = res.match
      react(res.events, now)
    }
    later(
      timers,
      () => {
        const a = awaiting.get(playerId)
        if (a) {
          a.elapsed = true
          settleOnline(playerId)
          return
        }
        clearPending(playerId)
        if (p.kind === 'ai') aiStep()
      },
      ok ? BOSS_FEEDBACK_RIGHT_MS : FEEDBACK_WRONG_MS,
    )
  }

  /** 多设备：反馈时间到了、快照里题号也推进了才关；等太久（消息丢了）就放开 */
  function settleOnline(playerId: string): void {
    const a = awaiting.get(playerId)
    if (!a || !a.elapsed) return
    const p = state.value ? findTimedPlayer(state.value, playerId) : undefined
    if (p && p.index < a.index && state.value?.phase === 'playing') {
      later(
        timers,
        () => {
          if (awaiting.get(playerId) === a) {
            awaiting.delete(playerId)
            clearPending(playerId)
          }
        },
        ANSWER_WAIT_MS,
      )
      return
    }
    awaiting.delete(playerId)
    clearPending(playerId)
  }

  /** 孩子的节奏（B60 / B67）：这一局最近几题的用时与正确率，没答几题时按上一次在这个知识点的记录 */
  function humanPace(): HumanPace {
    const s = state.value
    const t = humanStats.times
    const robot = s?.players.find((p) => p.kind === 'ai')?.score ?? 0
    const kid = s?.players.find((p) => p.kind === 'human')?.score ?? 0
    const live: HumanPace = {
      avgMs: t.length ? t.reduce((a, b) => a + b, 0) / t.length : null,
      accuracy: humanStats.answered >= 2 ? humanStats.correct / humanStats.answered : null,
      diff: s?.variant === 'versus' ? robot - kid : 0,
    }
    const prior = paceOfRun(s ? battle.prefs.lastRuns[s.kpId] : undefined, { right: BOSS_FEEDBACK_RIGHT_MS, wrong: FEEDBACK_WRONG_MS })
    const pace = blendPace(live, prior, humanStats.answered)
    // 当队友时再慢一点（M5）
    return s?.variant === 'coop' && pace.avgMs !== null ? { ...pace, avgMs: pace.avgMs * HELPER_SLOWER } : pace
  }

  /** 机器人答下一题：想一会儿 → 一个一个按出来（拳套跟着蓄力）→ 提交 */
  function aiStep(): void {
    const s = state.value
    if (!s || s.phase !== 'playing') return
    const ai = findTimedPlayer(s, AI_ID)
    if (!ai) return
    const q = questionOf(ai)
    const plan = planAnswer(q, aiLevel, aiRng, humanPace())
    later(
      aiTimers,
      () => {
        plan.keys.forEach((k, i) =>
          later(aiTimers, () => setInput(AI_ID, q.input === 'numpad' ? plan.keys.slice(0, i + 1).join('') : k), i * AI_KEY_MS),
        )
        later(aiTimers, () => submit(AI_ID, q.input === 'numpad' ? Number(plan.given) : plan.given), plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS)
      },
      plan.thinkMs,
    )
  }

  /** 再来一局：同样的人、知识点、玩法、时长、Boss，新题目流；不再讲规则 */
  function rematch(now = Date.now()): void {
    const s = state.value
    const m = mode.value
    if (!s || !m) return
    // 多设备谁都能按，谁先按算谁的（同 B9）
    if (m === 'online') {
      transport?.send({ type: 'rematch' })
      return
    }
    startLocal({ kpId: s.kpId, mode: m, variant: s.variant, durationS: (s.durationMs / 1000) as DurationS, boss: s.boss, now })
    intro.value = false
  }

  // ── 多设备（M13）：进房时 stores/room 调 startOnline，之后状态都由 syncOnline / onRemoteEvent 喂 ──

  function startOnline(t: OnlineTransport): void {
    reset()
    mode.value = 'online'
    transport = t
    online.value = null
    state.value = null
    operable.value = []
    matchKey = ''
    // 规则在设置页 / 二维码页看过，倒数不再讲
    intro.value = false
  }

  /**
   * 收到房间快照：timed 整份换进来。新的一局（选手或种子变了）清掉上一局的反馈、计时、走势；事件队列留着——
   * 服务器的事件立刻发、快照 100 ms 节流，新一局的 countdown 会先于快照到
   */
  function syncOnline(room: RoomSnapshot, me: string, serverNow?: number): void {
    mode.value = 'online'
    online.value = { you: me, hostId: room.hostId }
    if (typeof serverNow === 'number') clockOffset.value = serverNow - Date.now()
    const m = room.timed
    if (!m) {
      if (state.value) {
        const keep = events.value
        reset()
        events.value = keep
      }
      state.value = null
      operable.value = []
      matchKey = ''
      return
    }
    const key = matchKeyOf(m)
    const fresh = key !== matchKey
    if (fresh) {
      const keep = events.value
      reset()
      events.value = keep
      matchKey = key
    }
    state.value = m
    operable.value = m.players.some((p) => p.id === me) ? [me] : []
    const now = clock()
    nowMs.value = now
    if (fresh) {
      refreshLineup(now)
      prepareVoice()
    } else if (m.players.some((p) => !stage.value.includes(p.id)) && stage.value.length < 4) refreshLineup(now)
    // 中途连上 / 断线重连回来（没收到 go）：开打了就把时钟走起来；结束了停下
    if (m.phase === 'playing' && !ticker) {
      for (const side of sidesOf(m)) if (!tauntNext.has(side)) tauntNext.set(side, now + TAUNT_AFTER_MS)
      startClock()
    }
    if (m.phase === 'ended') stopClock()
    for (const id of [...awaiting.keys()]) settleOnline(id)
  }

  /** 服务器发来的瞬时事件：倒数 / 开打入队；比赛事件和本机一样放声音、弹提示 */
  function onRemoteEvent(e: BossArenaEvent): void {
    const now = clock()
    if (e.type === 'countdown') {
      pushEvent(e)
      return
    }
    if (e.type === 'go') {
      pushEvent(e)
      nowMs.value = now
      const s = state.value
      if (s) for (const side of sidesOf(s)) tauntNext.set(side, now + TAUNT_AFTER_MS)
      for (const id of operable.value) shownAt.set(id, Date.now())
      startClock()
      return
    }
    if (e.type === 'taunt' || e.type === 'emote') return
    react([e], now)
  }

  /** 有人发了表情（B58 / M12）：台下的小动物举牌、台上的挥手（表情本身由竞技场的飞行层画） */
  function onEmote(playerId: string): void {
    if (state.value?.players.some((p) => p.id === playerId)) pushEvent({ type: 'emote', playerId })
  }

  /** 下一章（多设备谁都能按，B9）：服务器换知识点开新一局；skin 是房间原来的（打怪兽不用） */
  function nextChapter(kpId: string, skin: string): void {
    if (mode.value === 'online') transport?.send({ type: 'next', kpId, skin })
  }

  /** 不玩了（多设备，B9）：服务器关掉房间，大家一起回地图 */
  function quit(): void {
    if (mode.value === 'online') transport?.send({ type: 'quit' })
  }

  function leave(): void {
    reset()
    state.value = null
    mode.value = null
    operable.value = []
    online.value = null
    transport = null
    clockOffset.value = 0
    matchKey = ''
  }

  return {
    state,
    mode,
    operable,
    pending,
    events,
    callout,
    bossLine,
    timeline,
    wrongs,
    intro,
    record,
    stage,
    online,
    nowMs,
    remaining,
    startLocal,
    beginPlay,
    advance,
    pause,
    resume,
    poke,
    taunt,
    startOnline,
    syncOnline,
    onRemoteEvent,
    onEmote,
    nextChapter,
    quit,
    questionOf,
    setInput,
    submit,
    rematch,
    leave,
  }
})
