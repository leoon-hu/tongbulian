/**
 * 对战的客户端状态（需求 §8）：本机偏好（昵称等，localStorage `tongbulian:battle`）、
 * 当前这一局（MatchState 快照）、答完后的反馈窗口、弹出提示、机器人的计时器。
 * 单设备模式在这里直接跑 battle/match 的状态机；多设备模式以后换成由中继服务发来的快照，竞技场页不用变。
 */
import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { LParam, Question } from '@/types/models'
import { createRng, type RNG } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { lang } from '@/engine/i18n'
import { phraseSpeech, questionSpeech } from '@/engine/speech'
import { warmUp } from '@/engine/voice'
import type { ArenaEvent, ClientMsg, MatchEvent, MatchState, Player, Role, RoomSnapshot, SeqEvent, Team } from '@/battle/protocol'
import {
  answer as applyAnswer,
  beginPlay as applyBegin,
  createMatch,
  findPlayer,
  setInput as applyInput,
  startMatch,
  type PlayerInit,
} from '@/battle/match'
import { questionAt, questionsAhead } from '@/battle/stream'
import { AI_ID, AI_KEY_MS, AI_SUBMIT_MS, RUNS_MAX, ROBOT_LINE_DELAY_MS, ROBOT_SAY_MS, blendPace, isAiLevel, isRunRecord, paceOfRun, planAnswer, robotLineFor, type AiLevel, type HumanPace, type RunAnswer, type RunRecord } from '@/battle/ai'
import { cleanName } from '@/battle/names'
import { BOT_REPLY_MS, EMOTE_GAP_MS, EMOTE_MS, botEventEmote, botReply, type EmoteId } from '@/battle/emotes'
import { AVATAR_IDS, LEGACY_AVATARS, isAvatarId, pickIdentity, type AvatarId, type Identity } from '@/battle/avatars'
import { KEY_GAIN, KEY_GAP_MS, calloutSfx, panOf, playSfx, skinSfx, streakPitch } from '@/battle/sfx'
import { chapterSkin, finishKey, resolveSkin, ruleKey, skinById } from '@/battle/skins'
import { pickLine } from '@/battle/lines'

export type LocalMode = 'ai' | 'duo'
/** 单设备两种 + 多设备房间（B41：竞技场页不知道自己在哪种模式下） */
export type BattleMode = LocalMode | 'online'
/** 设置页「怎么练」的四张卡（B27），按这个顺序排：自己练（B26：原来点知识点弹出的选择面板并进来的）在第一张，后面三种对战 */
export type SetupMode = BattleMode | 'practice'
export const SETUP_MODES: readonly SetupMode[] = ['practice', 'ai', 'duo', 'online']

/** 线上模式往服务器发消息的口子（stores/room 注入；测试可注入假的） */
export interface OnlineTransport {
  send(msg: ClientMsg): void
}
/** 答对 / 答错后停留多久再出下一题（B5）；弹出提示时答对的停留延长，让话说完（B5a） */
export const FEEDBACK_RIGHT_MS = 600
export const FEEDBACK_WRONG_MS = 1200
export const FEEDBACK_CALLOUT_MS = 1400
/** 线上模式：答完一题后最多等服务器确认这么久，没等到就放开这题让他重答（B23） */
export const ANSWER_WAIT_MS = 4000
/** 弹出提示显示多久 */
export const CALLOUT_MS = 1600
/** 事件队列保留最近多少条 */
export const EVENT_LOG = 64
/** 点游戏（B59）：两次点按的音效至少隔多久 */
export const POKE_GAP_MS = 250
/** 角色的台词（B71）：气泡显示多久、两句之间至少隔多久 */
export const LINE_MS = 2600
export const LINE_GAP_MS = 1500
/** 安卓的短震动（B70）：答对一下、答错三下；不支持就算了 */
export const VIBRATE_RIGHT: number | number[] = 25
export const VIBRATE_WRONG: number | number[] = [40, 40, 40]
function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
  } catch {
    /* 不支持 */
  }
}

const KEY = 'tongbulian:battle'
/** 偏好的格式版本（存成 v）：2 起小动物可以是「没选」；更早的存档里小熊 / 小猪是原来的默认值，读的时候当没选 */
const PREFS_V = 2

export interface BattlePrefs {
  clientId: string
  /** 自定义的名字（空 = 没自定义，用随机的，B17）。me：本设备的（打机器人、也是两人同屏左边的默认）；left / right：两人同屏各自记住的 */
  names: { me: string; left: string; right: string }
  aiLevel: AiLevel
  /** 每种游戏上次讲开场规则句的时间（ms）：本设备第一次进这个游戏才讲，一天内不重复（B6） */
  intros: Record<string, number>
  /** 自定义的小动物（B66；null = 没选，用随机的，B17）：me = 本设备的（打机器人 / 两人一台左边 / 多设备），right = 两人一台右边的 */
  avatars: { me: AvatarId | null; right: AvatarId | null }
  /** 上一次的记录（B67）：每个知识点最近一次打机器人的逐题记录，「跟着你」的起始节奏，最多 RUNS_MAX 个 */
  lastRuns: Record<string, RunRecord>
  /** 背景音乐（B68）：默认开；🔇 静音时也不放 */
  music: boolean
  /** 设置页上次选的「怎么练」（B27）：下次进来默认选着它；从来没开始过是自己练 */
  mode: SetupMode
}


/** 同一个游戏隔多久再讲一次开场规则句 */
export const INTRO_AGAIN_MS = 24 * 60 * 60 * 1000

/** 答完一题后的反馈窗口：这段时间行里仍显示这道题与对错 */
export interface Feedback {
  question: Question
  correct: boolean
  given: string
}

/** 正在飞的表情（B58）：谁发的（红 / 蓝 / 观战）、是不是本机发的 */
export interface EmoteShown {
  id: number
  kind: EmoteId
  side: Role
  mine: boolean
}

/** 弹出提示（B5a）：连对 / 反超 / 还差一分，词条 + 参数，带队色；决胜题（B62）两队都算，team 是 'both' */
export interface Callout {
  id: number
  key: string
  p?: Record<string, LParam>
  team: Team | 'both'
}

/** 服务器认的身份格式（server/index.ts 的 hello 校验一样）：不对的存档要重新生成，不然页面只会一直「连接中」 */
const CLIENT_ID_RE = /^[A-Za-z0-9_-]{6,40}$/

function randomId(): string {
  // 设备的身份就是这个 id（服务器只把它的哈希给别人看，B45a）：加密随机数（randomUUID 只在安全上下文里有，
  // getRandomValues 在 http 的局域网自部署里也有），猜不到
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  }
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

function loadPrefs(): BattlePrefs {
  const base: BattlePrefs = {
    clientId: randomId(),
    names: { me: '', left: '', right: '' },
    aiLevel: 'auto',
    intros: {},
    avatars: { me: null, right: null },
    lastRuns: {},
    music: true,
    mode: 'practice',
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Record<string, unknown>
    const names = (typeof p.names === 'object' && p.names !== null ? p.names : {}) as Record<string, unknown>
    const avatars = (typeof p.avatars === 'object' && p.avatars !== null ? p.avatars : {}) as Record<string, unknown>
    const str = (v: unknown): string => (typeof v === 'string' ? cleanName(v) : '')
    return {
      clientId: typeof p.clientId === 'string' && CLIENT_ID_RE.test(p.clientId) ? p.clientId : base.clientId,
      names: { me: str(names.me), left: str(names.left), right: str(names.right) },
      aiLevel: isAiLevel(p.aiLevel) ? p.aiLevel : base.aiLevel,
      intros: Object.fromEntries(
        Object.entries(typeof p.intros === 'object' && p.intros !== null ? (p.intros as Record<string, unknown>) : {}).filter(
          (kv): kv is [string, number] => typeof kv[1] === 'number' && Number.isFinite(kv[1]),
        ),
      ),
      avatars: { me: avatarPref(avatars.me, 'me', p.v === PREFS_V), right: avatarPref(avatars.right, 'right', p.v === PREFS_V) },
      lastRuns: Object.fromEntries(
        Object.entries(typeof p.lastRuns === 'object' && p.lastRuns !== null ? (p.lastRuns as Record<string, unknown>) : {}).filter(
          (kv): kv is [string, RunRecord] => isRunRecord(kv[1]),
        ),
      ),
      music: typeof p.music === 'boolean' ? p.music : true,
      mode: SETUP_MODES.includes(p.mode as SetupMode) ? (p.mode as SetupMode) : base.mode,
    }
  } catch {
    return base
  }
}

/** 存档里的小动物：不认识的当没选；旧格式里等于原来默认值的也当没选（那时不选也存着默认值，分不出是不是自己选的） */
function avatarPref(v: unknown, which: 'me' | 'right', current: boolean): AvatarId | null {
  if (!isAvatarId(v)) return null
  return !current && v === LEGACY_AVATARS[which] ? null : v
}

function savePrefs(p: BattlePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...p, v: PREFS_V }))
  } catch {
    // 存不下就下次用随机的名字，无妨
  }
}

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

export const useBattleStore = defineStore('battle', () => {
  const prefs = ref<BattlePrefs>(loadPrefs())
  // 同步写回：改完名字马上落盘（设置页改完就跳转，别让它排在下一帧后面）
  watch(prefs, savePrefs, { deep: true, flush: 'sync' })

  const state = ref<MatchState | null>(null)
  const mode = ref<BattleMode | null>(null)
  /** 线上模式：我是谁、主持人是谁 */
  const online = ref<{ you: string; hostId: string } | null>(null)
  let transport: OnlineTransport | null = null
  let inputTimer: ReturnType<typeof setTimeout> | null = null
  let inputPending: string | null = null
  /** 线上模式：答完一题后，反馈窗口时间到了 + 服务器快照里题号已推进 → 才关反馈（两个条件各记一份） */
  const awaiting = new Map<string, { index: number; elapsed: boolean }>()
  /** 线上模式：服务器时钟 − 本机时钟（每份快照更新），比赛用时按它算，各设备时钟不一样也准 */
  const clockOffset = ref(0)
  function now(): number {
    return Date.now() + clockOffset.value
  }
  /** 本机可以操作的玩家 id */
  const operable = ref<string[]>([])
  const pending = ref<Record<string, Feedback>>({})
  const lastEvent = ref<MatchEvent | null>(null)
  /** 带序号的事件队列（最近 EVENT_LOG 条）：游戏宿主按序号转发；同一次答题的几条事件都在，不像 lastEvent 会互相覆盖 */
  const events = ref<SeqEvent[]>([])
  let eventSeq = 0
  const callout = ref<Callout | null>(null)
  let calloutSeq = 0
  /** 正在飞的表情（最近几条，EMOTE_MS 后自己消失） */
  const emotes = ref<EmoteShown[]>([])
  let emoteSeq = 0
  const emoteAt: Partial<Record<Role, number>> = {}
  let pokeAt = -Infinity
  /** 角色正在说的台词（B71）：气泡挂在游戏盒子里点按的位置，朗读由竞技场做 */
  const charLine = ref<{ id: number; key: string; team: Team; x: number; y: number; rate: number } | null>(null)
  let lineSeq = 0
  let lineAt = -Infinity
  let lastLineKey: string | null = null
  const lineRng: RNG = createRng()
  /** 比分走势（B69）：每得一分记一笔（比赛开始后多少毫秒、当时的比分），结果页画回放条 */
  const timeline = ref<{ t: number; red: number; blue: number }[]>([])
  /** 这台设备上的真人答错的题（B69）：谁、第几题（题目由 seed + 题号重现），结果页列出来 */
  const wrongs = ref<{ playerId: string; index: number }[]>([])
  /** 本章战绩（B64）：同一个知识点连着打了几局各赢几局；换知识点 / 离开清零，不存本地 */
  const series = ref<{ kpId: string; wins: Record<Team, number> } | null>(null)
  /** 机器人正在说的话（B61）：它那一行的气泡 + 朗读由竞技场做 */
  const robotLine = ref<{ id: number; key: string } | null>(null)
  let robotSeq = 0
  /** 孩子的节奏（B60，打机器人时）：每题从出现到答完的用时（最近 5 题）、答了几题、对了几题 */
  const shownAt = new Map<string, number>()
  const humanStats = { times: [] as number[], answered: 0, correct: 0 }
  /** 这一局孩子每题的记录（B67）：打完存成这个知识点的「上一次」，下次给机器人当起始节奏 */
  let humanLog: RunAnswer[] = []
  /** 这局开场要不要先讲规则（B6）：本设备第一次进这个游戏讲，同一个游戏一天内不重复；再来一局不讲 */
  const intro = ref(false)

  function planIntro(skin: string, now: number): void {
    const last = prefs.value.intros[skin]
    intro.value = !(typeof last === 'number' && now - last < INTRO_AGAIN_MS)
    if (intro.value) prefs.value.intros = { ...prefs.value.intros, [skin]: now }
  }

  function pushEvent(e: ArenaEvent): void {
    events.value = [...events.value.slice(-(EVENT_LOG - 1)), { seq: ++eventSeq, e }]
  }

  let aiRng: RNG = createRng()
  let aiLevel: AiLevel = 'auto'
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const aiTimers = new Set<ReturnType<typeof setTimeout>>()

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

  /** 改名字（B17）：空串 = 回到随机 */
  function setName(which: keyof BattlePrefs['names'], name: string): void {
    prefs.value.names[which] = cleanName(name)
  }

  /** 选小动物（B66）：me = 自己的，right = 两人一台右边的；null = 回到随机（B17） */
  function setAvatar(which: 'me' | 'right', id: AvatarId | null): void {
    if (id === null || isAvatarId(id)) prefs.value.avatars = { ...prefs.value.avatars, [which]: id }
  }

  /** 没自定义时随机点选的顺序（B17）：页面打开时排一次，同一次打开里再来一局 / 下一章不变；不存本地 */
  const autoOrder: readonly AvatarId[] = createRng().shuffle(AVATAR_IDS)

  /**
   * 这台设备上各方现在用的名字与小动物（B17）：自定义的优先，没有的随机、左右两边不一样。
   * me = 本设备的（打机器人 / 两人一台左边 / 多设备），right = 两人一台右边的（避开左边，左边也避开右边自定义的）
   */
  function identities(): { me: Identity; right: Identity } {
    const { names, avatars } = prefs.value
    const me = pickIdentity({ name: names.me, avatar: avatars.me }, autoOrder, lang.value, [{ name: names.right, avatar: avatars.right ?? undefined }])
    return { me, right: pickIdentity({ name: names.right, avatar: avatars.right }, autoOrder, lang.value, [me]) }
  }

  /** 多设备时发给服务器的（B17）：我的名字与小动物，以及哪几样是随机的（服务器按这个去重） */
  function onlineIdentity(): Identity & { auto: { name?: true; avatar?: true } } {
    const { names, avatars } = prefs.value
    return { ...identities().me, auto: { ...(names.me ? {} : { name: true }), ...(avatars.me ? {} : { avatar: true }) } }
  }

  function seedsFor(players: PlayerInit[], given?: Record<string, number>): Record<string, number> {
    return Object.fromEntries(players.map((p) => [p.id, given?.[p.id] ?? newSeed()]))
  }

  /**
   * 这一局要读的片段先预解码：只预热本机会读的——本机可操作的那几行的题干（打机器人 / 线上是自己那一行，两人一台是两行；
   * 观战一行都没有），答案在对战里不读（N8：原来把房间里每个真人的题干加答案全拉下来，线上 6 人一局要多下几倍）
   */
  function prepareVoice(): void {
    const s = state.value
    if (!s) return
    const mine = new Set(operable.value)
    const tokens = s.players
      .filter((p) => p.kind === 'human' && mine.has(p.id))
      .flatMap((p) => questionsAhead(s.kpId, p.seed, p.index, 16).flatMap((q) => questionSpeech(q, lang.value)))
    for (const key of [ruleKey(s.skin), finishKey(s.skin), 'battle.half.red', 'battle.half.blue', 'battle.win.red', 'battle.win.blue']) {
      tokens.push(...phraseSpeech({ k: key }, lang.value))
    }
    warmUp(tokens, lang.value)
  }

  function reset(keepEvents = false): void {
    clearAll(timers)
    clearAll(aiTimers)
    pending.value = {}
    if (!keepEvents) {
      lastEvent.value = null
      events.value = []
    }
    callout.value = null
    emotes.value = []
    charLine.value = null
    timeline.value = []
    wrongs.value = []
    robotLine.value = null
    shownAt.clear()
    humanStats.times = []
    humanStats.answered = 0
    humanStats.correct = 0
    humanLog = []
    if (inputTimer) clearTimeout(inputTimer)
    inputTimer = null
    inputPending = null
    awaiting.clear()
  }

  // ── 表情 / 加油（B58）与点游戏（B59） ──

  /** 一个表情飞出去：进列表（最多留 8 条）、一声「啵嘤」，EMOTE_MS 后消失；朗读由竞技场看列表决定 */
  function showEmote(kind: EmoteId, side: Role, mine: boolean): void {
    const id = ++emoteSeq
    emotes.value = [...emotes.value.slice(-7), { id, kind, side, mine }]
    playSfx('boing')
    later(
      timers,
      () => {
        emotes.value = emotes.value.filter((e) => e.id !== id)
      },
      EMOTE_MS,
    )
  }

  /**
   * 本机发一个表情：side 是哪一排（红 / 蓝 / 观战），同一排 EMOTE_GAP_MS 内只发一个（返回 false = 太快了没发）；
   * 线上发给服务器（别人那里由 onRemoteEmote 画）；打机器人时机器人过一会儿回一个
   */
  function sendEmote(side: Role, kind: EmoteId, now = Date.now()): boolean {
    if (!state.value) return false
    if (now - (emoteAt[side] ?? -Infinity) < EMOTE_GAP_MS) return false
    emoteAt[side] = now
    showEmote(kind, side, true)
    if (mode.value === 'online') transport?.send({ type: 'emote', id: kind })
    else if (mode.value === 'ai') later(timers, () => showEmote(botReply(kind), 'blue', false), BOT_REPLY_MS)
    return true
  }

  /** 别人（多设备房间里的其他人）发的表情 */
  function onRemoteEmote(side: Role, kind: EmoteId): void {
    if (state.value) showEmote(kind, side, false)
  }

  /**
   * 游戏盒子被点了一下（B59 / B71）：游戏自己已经在动，这里放这种游戏的得分音（小声，POKE_GAP_MS 内只放一次），
   * 并让那一队的角色在点按处冒一句台词（LINE_GAP_MS 内只出一句、不连续重复；朗读由竞技场看 charLine 做）
   */
  function poke(team: Team, x = 0, y = 0, now = Date.now()): void {
    const s = state.value
    if (!s) return
    if (now - pokeAt >= POKE_GAP_MS) {
      pokeAt = now
      const sounds = skinSfx(s.skin, skinById(s.skin)?.kind)
      playSfx(sounds.score[0] ?? 'pop', 1, 0.45, panOf(team))
    }
    if (now - lineAt < LINE_GAP_MS) return
    lineAt = now
    const picked = pickLine(s.skin, team, lineRng, lastLineKey)
    lastLineKey = picked.key
    const id = ++lineSeq
    charLine.value = { id, key: picked.key, team, x, y, rate: picked.rate }
    later(
      timers,
      () => {
        if (charLine.value?.id === id) charLine.value = null
      },
      LINE_MS,
    )
  }

  function clearPending(playerId: string): void {
    const rest = { ...pending.value }
    delete rest[playerId]
    pending.value = rest
    // 下一题从这一刻算起（B60）
    shownAt.set(playerId, Date.now())
  }

  /** 机器人说一句（B61）：delay 后冒气泡，ROBOT_SAY_MS 后收起；朗读由竞技场 watch robotLine 做 */
  function robotSay(key: string, delayMs: number): void {
    later(
      timers,
      () => {
        const id = ++robotSeq
        robotLine.value = { id, key }
        later(
          timers,
          () => {
            if (robotLine.value?.id === id) robotLine.value = null
          },
          ROBOT_SAY_MS,
        )
      },
      delayMs,
    )
  }

  /** 打完一局机器人（B67）：把孩子这一局的逐题记录存成这个知识点的「上一次」，只留最近 RUNS_MAX 个知识点 */
  function saveRun(kpId: string, at: number): void {
    const rec: RunRecord = { at, answers: humanLog.slice() }
    const entries = Object.entries({ ...prefs.value.lastRuns, [kpId]: rec })
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, RUNS_MAX)
    prefs.value.lastRuns = Object.fromEntries(entries)
  }

  /**
   * 孩子的节奏给「跟着你」档用（B60 / B67）：这一局最近几题的用时与正确率，diff = 机器人比孩子多几分；
   * 还没答几题时按上一次在这个知识点的记录（答满 PRIOR_FADE_N 题后完全按这一局）
   */
  function humanPace(): HumanPace {
    const s = state.value
    const t = humanStats.times
    const live: HumanPace = {
      avgMs: t.length ? t.reduce((a, b) => a + b, 0) / t.length : null,
      accuracy: humanStats.answered >= 2 ? humanStats.correct / humanStats.answered : null,
      diff: s ? s.score.blue - s.score.red : 0,
    }
    const prior = paceOfRun(s ? prefs.value.lastRuns[s.kpId] : undefined, { right: FEEDBACK_RIGHT_MS, wrong: FEEDBACK_WRONG_MS })
    return blendPace(live, prior, humanStats.answered)
  }

  /** 线上模式：反馈窗口时间到了、快照也推进了才关；等太久（消息丢了）就放开让他重答 */
  function settleOnline(playerId: string): void {
    const a = awaiting.get(playerId)
    if (!a || !a.elapsed) return
    const p = state.value ? findPlayer(state.value, playerId) : undefined
    if (p && p.index < a.index && state.value?.phase === 'playing') {
      later(timers, () => {
        if (awaiting.get(playerId) === a) {
          awaiting.delete(playerId)
          clearPending(playerId)
        }
      }, ANSWER_WAIT_MS)
      return
    }
    awaiting.delete(playerId)
    clearPending(playerId)
  }

  /** 收到比赛事件后的反应（两种模式共用）：入队、音效、弹提示；返回这次弹了什么（答对的反馈窗口要延长） */
  function react(evts: MatchEvent[], skin: string): MatchEvent | null {
    // 一次答题只弹一条：胜负（VictoryOverlay 负责）> 决胜题 > 反超 > 还差一分 > 连对 > 到一半
    let toCall: MatchEvent | null = null
    const priority: Record<string, number> = { deuce: 4, lead: 3, nearWin: 2, streak: 1, half: 0.5 }
    const sounds = skinSfx(skin, skinById(skin)?.kind)
    for (const e of evts) {
      lastEvent.value = e
      pushEvent(e)
      if (e.type === 'point') {
        // 得分音红队偏左、蓝队偏右（B70）
        playSfx('ding', streakPitch(e.streak), 1, panOf(e.team))
        for (const x of sounds.score) playSfx(x, 1, 1, panOf(e.team))
        // 比分走势（B69）：按事件自己累加（线上事件先于快照到，不能看 state 里的比分）
        const last = timeline.value.at(-1) ?? { red: 0, blue: 0 }
        const started = state.value?.startedAt ?? now()
        timeline.value = [...timeline.value, { t: Math.max(0, now() - started), red: last.red + (e.team === 'red' ? 1 : 0), blue: last.blue + (e.team === 'blue' ? 1 : 0) }]
      }
      if (e.type === 'streak') for (const x of sounds.streak) playSfx(x)
      if (e.type === 'lead' || e.type === 'nearWin' || e.type === 'deuce') playSfx(calloutSfx(e.type))
      if (e.type === 'finished') {
        clearAll(aiTimers)
        later(timers, () => playSfx('fanfare'), 300)
        sounds.win.forEach((x, i) => later(timers, () => playSfx(x), 500 + i * 250))
        // 本章战绩（B64）：同一个知识点接着记，换了知识点从头记
        const kpId = state.value?.kpId ?? ''
        const cur = series.value && series.value.kpId === kpId ? series.value : { kpId, wins: { red: 0, blue: 0 } }
        series.value = { kpId, wins: { ...cur.wins, [e.winner]: cur.wins[e.winner] + 1 } }
        // 上一次的记录（B67）：打机器人的每一局都记，下次机器人从第一题起就按这个节奏
        if (mode.value === 'ai' && kpId) saveRun(kpId, now())
      }
      if ((e.type === 'lead' || e.type === 'nearWin' || e.type === 'streak' || e.type === 'half' || e.type === 'deuce') && (priority[e.type]! > (toCall ? priority[toCall.type]! : 0))) {
        toCall = e
      }
    }
    if (toCall) {
      const e = toCall as Extract<MatchEvent, { type: 'lead' | 'nearWin' | 'streak' | 'half' | 'deuce' }>
      if (e.type === 'deuce') showCallout('battle.deuce', 'both')
      else if (e.type === 'streak') showCallout('battle.streak', e.team, { n: e.n })
      else if (e.type === 'half') showCallout(`battle.half.${e.team}`, e.team)
      else showCallout(e.type === 'lead' ? 'battle.lead' : 'battle.nearWin', e.team)
    }
    // 机器人对反超 / 结束的表情（B58）与话（B61）：结束的等胜利动画开始了再发
    if (mode.value === 'ai') {
      for (const e of evts) {
        const kind = botEventEmote(e)
        if (kind) later(timers, () => showEmote(kind, 'blue', false), e.type === 'finished' ? 1500 : 500)
        const line = robotLineFor(e)
        if (line && (e.type === 'lead' || e.type === 'nearWin' || e.type === 'finished')) robotSay(line, ROBOT_LINE_DELAY_MS[e.type])
      }
    }
    return toCall
  }

  // ── 多设备（B41）：状态来自服务器的整份快照，操作发给服务器 ──

  /** 进房前调用：之后的比赛状态都由 syncOnline 喂 */
  function startOnline(t: OnlineTransport): void {
    reset()
    mode.value = 'online'
    transport = t
    online.value = null
    state.value = null
    operable.value = []
    // 规则句在大厅里已经看过 / 读过，倒数不再讲（B6）
    intro.value = false
  }

  /**
   * 收到房间快照：比赛部分替换进来；新开一局（开始时刻变了）时清掉上一局的反馈、计时与提示。
   * 事件队列留着：服务器的 event 立刻发、快照按 100 ms 节流，新一局的 countdown 事件会先于快照到。
   */
  function syncOnline(room: RoomSnapshot, me: string, serverNow?: number): void {
    mode.value = 'online'
    online.value = { you: me, hostId: room.hostId }
    if (typeof serverNow === 'number') clockOffset.value = serverNow - Date.now()
    const match = room.match
    if (!match) {
      if (state.value) reset()
      state.value = null
      operable.value = []
      return
    }
    const prev = state.value
    const fresh = !prev || prev.startedAt !== match.startedAt
    if (fresh) reset(true)
    state.value = match
    operable.value = match.players.some((p) => p.id === me) ? [me] : []
    if (fresh) prepareVoice()
    for (const id of [...awaiting.keys()]) settleOnline(id)
  }

  /** 服务器发来的瞬时事件（倒数 / 开打 / 答题的那几条）：与本地一样入队、放音效、弹提示 */
  function onRemoteEvent(e: ArenaEvent): void {
    if (e.type === 'countdown' || e.type === 'go') {
      pushEvent(e)
      return
    }
    const s = state.value
    react([e], s?.skin ?? '')
  }

  /** 开一局单设备的比赛（进入倒数）。名字与小动物：自定义的优先，没有的随机、两边不一样（B17 / B18） */
  function startLocal(opts: {
    kpId: string
    mode: LocalMode
    skin?: string
    aiLevel?: AiLevel
    seeds?: Record<string, number>
    aiSeed?: number
    now?: number
  }): void {
    reset()
    mode.value = opts.mode
    if (series.value && series.value.kpId !== opts.kpId) series.value = null
    aiLevel = opts.aiLevel ?? prefs.value.aiLevel
    aiRng = createRng(opts.aiSeed)
    // 没指定就用按章节排到的游戏（B36）；设置页的「配置」里换的只影响这一次，不记偏好
    const skin = resolveSkin(opts.skin ?? chapterSkin(opts.kpId), createRng())
    const { me, right } = identities()
    const players: PlayerInit[] =
      opts.mode === 'ai'
        ? [
            { id: 'left', name: me.name, team: 'red', avatar: me.avatar },
            { id: AI_ID, name: '', team: 'blue', kind: 'ai' },
          ]
        : [
            { id: 'left', name: prefs.value.names.left || me.name, team: 'red', avatar: me.avatar },
            { id: 'right', name: right.name, team: 'blue', avatar: right.avatar },
          ]
    operable.value = players.filter((p) => p.kind !== 'ai').map((p) => p.id)
    const now = opts.now ?? Date.now()
    state.value = startMatch(createMatch({ kpId: opts.kpId, skin, players }), seedsFor(players, opts.seeds), now)
    planIntro(skin, now)
    pushEvent({ type: 'countdown' })
    prepareVoice()
  }

  function questionOf(p: Player): Question {
    const s = state.value
    if (!s) throw new Error('no match')
    return questionAt(s.kpId, p.seed, p.index)
  }

  /** 倒数结束：开打，机器人开始动（线上模式由服务器定时刻，这里不动） */
  function beginPlay(now = Date.now()): void {
    if (!state.value || mode.value === 'online') return
    const before = state.value.phase
    state.value = applyBegin(state.value, now)
    if (before === 'countdown' && state.value.phase === 'playing') {
      pushEvent({ type: 'go' })
      for (const p of state.value.players) if (p.kind === 'human') shownAt.set(p.id, now)
      if (mode.value === 'ai') robotSay('robot.ready', ROBOT_LINE_DELAY_MS.go)
    }
    if (mode.value === 'ai') aiStep()
  }

  /** 按键声（B73）：每人上一次放的时刻，最密 KEY_GAP_MS 一次 */
  const keySfxAt = new Map<string, number>()
  function keySound(playerId: string, input: string): void {
    const s = state.value
    const p = s ? findPlayer(s, playerId) : undefined
    // 只给本设备的真人：机器人按键、别的设备的人按键不出声；清空不算按
    if (!s || !p || p.kind !== 'human' || !input || s.phase !== 'playing') return
    const t = now()
    if (t - (keySfxAt.get(playerId) ?? -Infinity) < KEY_GAP_MS) return
    keySfxAt.set(playerId, t)
    for (const x of skinSfx(s.skin, skinById(s.skin)?.kind).key) playSfx(x, 1, KEY_GAIN, panOf(p.team))
  }

  function setInput(playerId: string, input: string): void {
    keySound(playerId, input)
    if (mode.value === 'online') {
      // 正在按的内容发给服务器（节流 100 ms，B42）；自己的显示框由键盘组件管
      inputPending = input
      if (!inputTimer) {
        inputTimer = setTimeout(() => {
          inputTimer = null
          if (inputPending !== null) transport?.send({ type: 'input', input: inputPending })
          inputPending = null
        }, 100)
      }
      return
    }
    if (state.value) state.value = applyInput(state.value, playerId, input)
  }

  function showCallout(key: string, team: Team | 'both', p?: Record<string, LParam>): void {
    callout.value = { id: ++calloutSeq, key, team, p }
    playSfx('pop')
    const id = calloutSeq
    later(
      timers,
      () => {
        if (callout.value?.id === id) callout.value = null
      },
      CALLOUT_MS,
    )
  }

  /** 某人提交了答案：判分、记进状态机、开反馈窗口、放音效、弹提示（B5 / B5a） */
  function submit(playerId: string, given: unknown, now = Date.now()): void {
    const s = state.value
    if (!s || s.phase !== 'playing' || pending.value[playerId]) return
    const p = findPlayer(s, playerId)
    if (!p) return
    const q = questionOf(p)
    const ok = checkAnswer(q, given)
    pending.value = { ...pending.value, [playerId]: { question: q, correct: ok, given: String(given) } }
    // 这台设备上的真人答错的题（B69）：结果页列出来
    if (p.kind === 'human' && !ok) wrongs.value = [...wrongs.value, { playerId, index: p.index }]
    if (p.kind === 'human' && mode.value === 'ai') {
      // 记孩子的节奏（B60）：这题用了多久、对不对；以及这一局的逐题记录（B67）
      const since = shownAt.get(playerId)
      if (since !== undefined) humanStats.times = [...humanStats.times.slice(-4), Math.max(0, now - since)]
      humanStats.answered += 1
      if (ok) humanStats.correct += 1
      humanLog = [...humanLog, { index: p.index, ok, t: Math.max(0, now - s.startedAt) }]
    }
    let toCall: MatchEvent | null = null
    if (mode.value === 'online') {
      // 题目在本机判分，结果报给服务器（B41）；比分与事件等服务器的快照 / 事件回来
      awaiting.set(playerId, { index: p.index + 1, elapsed: false })
      // 节流里还没发出去的「正在输入」作废：不然落后不到 100 ms 的按键会写到下一题的显示框上
      if (inputTimer) clearTimeout(inputTimer)
      inputTimer = null
      inputPending = null
      transport?.send({ type: 'answer', index: p.index, given: String(given), correct: ok })
    } else {
      const res = applyAnswer(s, playerId, p.index, ok, String(given), now)
      state.value = res.state
      toCall = react(res.events, res.state.skin)
    }
    if (p.kind === 'human') vibrate(ok ? VIBRATE_RIGHT : VIBRATE_WRONG)
    // 答错的声音按游戏换（B70）：火车刹车、气球漏气、火箭哑火……没有专属的仍是「咚」
    // 答错：这个游戏的「哎呀」一声（B73），不是罚
    if (!ok) for (const x of skinSfx(s.skin, skinById(s.skin)?.kind).wrong) playSfx(x, 1, 1, panOf(p.team))
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
      ok ? (toCall ? FEEDBACK_CALLOUT_MS : FEEDBACK_RIGHT_MS) : FEEDBACK_WRONG_MS,
    )
  }

  /** 机器人答下一题：想一会儿 → 一个一个按出来 → 提交（B11；「跟着你」按孩子的节奏，B60 / B67） */
  function aiStep(): void {
    const s = state.value
    if (!s || s.phase !== 'playing') return
    const ai = findPlayer(s, AI_ID)
    if (!ai) return
    const q = questionOf(ai)
    const plan = planAnswer(q, aiLevel, aiRng, humanPace())
    later(
      aiTimers,
      () => {
        plan.keys.forEach((k, i) =>
          later(aiTimers, () => setInput(AI_ID, q.input === 'numpad' ? plan.keys.slice(0, i + 1).join('') : k), i * AI_KEY_MS),
        )
        later(
          aiTimers,
          () => submit(AI_ID, q.input === 'numpad' ? Number(plan.given) : plan.given),
          plan.keys.length * AI_KEY_MS + AI_SUBMIT_MS,
        )
      },
      plan.thinkMs,
    )
  }

  /** 再来一局：同样的人、知识点、皮肤，新 seed（线上发给服务器，谁都能按） */
  function rematch(seeds?: Record<string, number>, now = Date.now()): void {
    const s = state.value
    if (!s) return
    if (mode.value === 'online') {
      transport?.send({ type: 'rematch' })
      return
    }
    reset()
    state.value = startMatch(s, seedsFor(s.players, seeds), now)
    intro.value = false
    pushEvent({ type: 'countdown' })
    prepareVoice()
  }

  /** 下一章（B9，线上谁都能按）：同一房间换成本册下一个知识点与它按章节排到的皮肤，由服务器开新一局；单设备没有这个键 */
  function nextChapter(kpId: string, skin: string): void {
    if (mode.value !== 'online') return
    transport?.send({ type: 'next', kpId, skin })
  }

  /** 不玩了（B9，线上谁都能按）：让服务器关掉房间，大家一起回地图 */
  function quit(): void {
    if (mode.value !== 'online') return
    transport?.send({ type: 'quit' })
  }

  function leave(): void {
    reset()
    series.value = null
    state.value = null
    mode.value = null
    operable.value = []
    online.value = null
    transport = null
    clockOffset.value = 0
  }

  return {
    prefs,
    state,
    mode,
    operable,
    pending,
    lastEvent,
    events,
    callout,
    emotes,
    series,
    timeline,
    wrongs,
    robotLine,
    charLine,
    intro,
    online,
    now,
    setName,
    setAvatar,
    identities,
    onlineIdentity,
    startLocal,
    startOnline,
    syncOnline,
    onRemoteEvent,
    questionOf,
    beginPlay,
    setInput,
    submit,
    sendEmote,
    onRemoteEmote,
    poke,
    rematch,
    nextChapter,
    quit,
    leave,
  }
})
