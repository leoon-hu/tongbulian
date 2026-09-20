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
import { answerSpeech, phraseSpeech, questionSpeech } from '@/engine/speech'
import { warmUp } from '@/engine/voice'
import type { ArenaEvent, ClientMsg, MatchEvent, MatchState, Player, RoomSnapshot, SeqEvent, Team } from '@/battle/protocol'
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
import { AI_ID, AI_KEY_MS, AI_SUBMIT_MS, isAiLevel, planAnswer, type AiLevel } from '@/battle/ai'
import { cleanName } from '@/battle/names'
import { calloutSfx, playSfx, skinSfx, streakPitch } from '@/battle/sfx'
import { chapterSkin, finishKey, resolveSkin, ruleKey, skinById } from '@/battle/skins'

export type LocalMode = 'ai' | 'duo'
/** 单设备两种 + 多设备房间（B41：竞技场页不知道自己在哪种模式下） */
export type BattleMode = LocalMode | 'online'

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

const KEY = 'tongbulian:battle'

export interface BattlePrefs {
  clientId: string
  /** me：本设备的名字（打机器人、也是两人同屏左边的默认）；left / right：两人同屏各自记住的 */
  names: { me: string; left: string; right: string }
  aiLevel: AiLevel
  /** 每种游戏上次讲开场规则句的时间（ms）：本设备第一次进这个游戏才讲，一天内不重复（B6） */
  intros: Record<string, number>
}


/** 同一个游戏隔多久再讲一次开场规则句 */
export const INTRO_AGAIN_MS = 24 * 60 * 60 * 1000

/** 答完一题后的反馈窗口：这段时间行里仍显示这道题与对错 */
export interface Feedback {
  question: Question
  correct: boolean
  given: string
}

/** 弹出提示（B5a）：连对 / 反超 / 还差一分，词条 + 参数，带队色 */
export interface Callout {
  id: number
  key: string
  p?: Record<string, LParam>
  team: Team
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

function loadPrefs(): BattlePrefs {
  const base: BattlePrefs = {
    clientId: randomId(),
    names: { me: '', left: '', right: '' },
    aiLevel: 'mid',
    intros: {},
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Record<string, unknown>
    const names = (typeof p.names === 'object' && p.names !== null ? p.names : {}) as Record<string, unknown>
    const str = (v: unknown): string => (typeof v === 'string' ? cleanName(v) : '')
    return {
      clientId: typeof p.clientId === 'string' && p.clientId ? p.clientId : base.clientId,
      names: { me: str(names.me), left: str(names.left), right: str(names.right) },
      aiLevel: isAiLevel(p.aiLevel) ? p.aiLevel : base.aiLevel,
      intros: Object.fromEntries(
        Object.entries(typeof p.intros === 'object' && p.intros !== null ? (p.intros as Record<string, unknown>) : {}).filter(
          (kv): kv is [string, number] => typeof kv[1] === 'number' && Number.isFinite(kv[1]),
        ),
      ),
    }
  } catch {
    return base
  }
}

function savePrefs(p: BattlePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // 存不下就下次再问名字，无妨
  }
}

function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31)
}

export const useBattleStore = defineStore('battle', () => {
  const prefs = ref<BattlePrefs>(loadPrefs())
  // 同步写回：改完名字马上落盘（设置页改完就跳转，别让它排在下一帧后面）
  watch(prefs, savePrefs, { deep: true, flush: 'sync' })

  /** 地图上的「⚔️ 对战」开关（B26），只在本次会话里记 */
  const mapMode = ref(false)

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
  let aiLevel: AiLevel = 'mid'
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

  function setName(which: keyof BattlePrefs['names'], name: string): void {
    prefs.value.names[which] = cleanName(name)
  }

  function seedsFor(players: PlayerInit[], given?: Record<string, number>): Record<string, number> {
    return Object.fromEntries(players.map((p) => [p.id, given?.[p.id] ?? newSeed()]))
  }

  /** 这一局要读的片段先预解码（真人的题；机器人的不读） */
  function prepareVoice(): void {
    const s = state.value
    if (!s) return
    const tokens = s.players
      .filter((p) => p.kind === 'human')
      .flatMap((p) =>
        questionsAhead(s.kpId, p.seed, p.index, 16).flatMap((q) => [
          ...questionSpeech(q, lang.value),
          ...answerSpeech(q, lang.value),
        ]),
      )
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
    if (inputTimer) clearTimeout(inputTimer)
    inputTimer = null
    inputPending = null
    awaiting.clear()
  }

  function clearPending(playerId: string): void {
    const rest = { ...pending.value }
    delete rest[playerId]
    pending.value = rest
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
    // 一次答题只弹一条：胜负（VictoryOverlay 负责）> 反超 > 还差一分 > 连对 > 到一半
    let toCall: MatchEvent | null = null
    const priority: Record<string, number> = { lead: 3, nearWin: 2, streak: 1, half: 0.5 }
    const sounds = skinSfx(skin, skinById(skin)?.kind)
    for (const e of evts) {
      lastEvent.value = e
      pushEvent(e)
      if (e.type === 'point') {
        playSfx('ding', streakPitch(e.streak))
        for (const x of sounds.score) playSfx(x)
      }
      if (e.type === 'streak') for (const x of sounds.streak) playSfx(x)
      if (e.type === 'lead' || e.type === 'nearWin') playSfx(calloutSfx(e.type))
      if (e.type === 'finished') {
        clearAll(aiTimers)
        later(timers, () => playSfx('fanfare'), 300)
        sounds.win.forEach((x, i) => later(timers, () => playSfx(x), 500 + i * 250))
      }
      if ((e.type === 'lead' || e.type === 'nearWin' || e.type === 'streak' || e.type === 'half') && (priority[e.type]! > (toCall ? priority[toCall.type]! : 0))) {
        toCall = e
      }
    }
    if (toCall) {
      const e = toCall as Extract<MatchEvent, { type: 'lead' | 'nearWin' | 'streak' | 'half' }>
      if (e.type === 'streak') showCallout('battle.streak', e.team, { n: e.n })
      else if (e.type === 'half') showCallout(`battle.half.${e.team}`, e.team)
      else showCallout(e.type === 'lead' ? 'battle.lead' : 'battle.nearWin', e.team)
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

  /** 开一局单设备的比赛（进入倒数）。names 缺的用「我」的名字补，设置页会保证名字都有 */
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
    aiLevel = opts.aiLevel ?? prefs.value.aiLevel
    aiRng = createRng(opts.aiSeed)
    // 没指定就用按章节排到的游戏（B36）；设置页的「配置」里换的只影响这一次，不记偏好
    const skin = resolveSkin(opts.skin ?? chapterSkin(opts.kpId), createRng())
    const me = prefs.value.names.me
    const players: PlayerInit[] =
      opts.mode === 'ai'
        ? [
            { id: 'left', name: me, team: 'red' },
            { id: AI_ID, name: '', team: 'blue', kind: 'ai' },
          ]
        : [
            { id: 'left', name: prefs.value.names.left || me, team: 'red' },
            { id: 'right', name: prefs.value.names.right, team: 'blue' },
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
    if (before === 'countdown' && state.value.phase === 'playing') pushEvent({ type: 'go' })
    if (mode.value === 'ai') aiStep()
  }

  function setInput(playerId: string, input: string): void {
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

  function showCallout(key: string, team: Team, p?: Record<string, LParam>): void {
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
    let toCall: MatchEvent | null = null
    if (mode.value === 'online') {
      // 题目在本机判分，结果报给服务器（B41）；比分与事件等服务器的快照 / 事件回来
      awaiting.set(playerId, { index: p.index + 1, elapsed: false })
      transport?.send({ type: 'answer', index: p.index, given: String(given), correct: ok })
    } else {
      const res = applyAnswer(s, playerId, p.index, ok, String(given), now)
      state.value = res.state
      toCall = react(res.events, res.state.skin)
    }
    if (!ok) playSfx('dong')
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

  /** 机器人答下一题：想一会儿 → 一个一个按出来 → 提交（B11） */
  function aiStep(): void {
    const s = state.value
    if (!s || s.phase !== 'playing') return
    const ai = findPlayer(s, AI_ID)
    if (!ai) return
    const q = questionOf(ai)
    const plan = planAnswer(q, aiLevel, aiRng)
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
    state.value = null
    mode.value = null
    operable.value = []
    online.value = null
    transport = null
    clockOffset.value = 0
  }

  return {
    prefs,
    mapMode,
    state,
    mode,
    operable,
    pending,
    lastEvent,
    events,
    callout,
    intro,
    online,
    now,
    setName,
    startLocal,
    startOnline,
    syncOnline,
    onRemoteEvent,
    questionOf,
    beginPlay,
    setInput,
    submit,
    rematch,
    nextChapter,
    quit,
    leave,
  }
})
