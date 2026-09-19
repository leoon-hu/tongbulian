/**
 * 对战的客户端状态（需求 §8）：本机偏好（昵称等，localStorage `tongbulian:battle`）、
 * 当前这一局（MatchState 快照）、答完后的反馈窗口、弹出提示、机器人的计时器。
 * 单设备模式在这里直接跑 battle/match 的状态机；多设备模式以后换成由中继服务发来的快照，竞技场页不用变。
 */
import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { Difficulty, LParam, Question } from '@/types/models'
import { createRng, type RNG } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { lang } from '@/engine/i18n'
import { answerSpeech, questionSpeech } from '@/engine/speech'
import { warmUp } from '@/engine/voice'
import type { MatchEvent, MatchState, Player, Team } from '@/battle/protocol'
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
import { playSfx, streakPitch, type Sfx } from '@/battle/sfx'
import { RANDOM_SKIN, resolveSkin, skinById, type SkinKind } from '@/battle/skins'

export type LocalMode = 'ai' | 'duo'
/** 答对 / 答错后停留多久再出下一题（B5）；弹出提示时答对的停留延长，让话说完（B5a） */
export const FEEDBACK_RIGHT_MS = 600
export const FEEDBACK_WRONG_MS = 1200
export const FEEDBACK_CALLOUT_MS = 1400
/** 弹出提示显示多久 */
export const CALLOUT_MS = 1600

const KEY = 'tongbulian:battle'

export interface BattlePrefs {
  clientId: string
  /** me：本设备的名字（打机器人、也是两人同屏左边的默认）；left / right：两人同屏各自记住的 */
  names: { me: string; left: string; right: string }
  skin: string
  aiLevel: AiLevel
  difficulty: Difficulty
}

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

/** 皮肤类型对应的得分音效（跑 / 拉 = 呼啸，盖 = 咚，化 = 咔嚓） */
const KIND_SFX: Record<SkinKind, Sfx> = { race: 'whoosh', tug: 'whoosh', grow: 'thud', consume: 'crack' }

function randomId(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

function isDifficulty(v: unknown): v is Difficulty {
  return v === 1 || v === 2 || v === 3
}

function loadPrefs(): BattlePrefs {
  const base: BattlePrefs = {
    clientId: randomId(),
    names: { me: '', left: '', right: '' },
    skin: RANDOM_SKIN,
    aiLevel: 'mid',
    difficulty: 1,
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
      skin: typeof p.skin === 'string' && (p.skin === RANDOM_SKIN || skinById(p.skin)) ? p.skin : base.skin,
      aiLevel: isAiLevel(p.aiLevel) ? p.aiLevel : base.aiLevel,
      difficulty: isDifficulty(p.difficulty) ? p.difficulty : base.difficulty,
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
  const mode = ref<LocalMode | null>(null)
  /** 本机可以操作的玩家 id */
  const operable = ref<string[]>([])
  const pending = ref<Record<string, Feedback>>({})
  const lastEvent = ref<MatchEvent | null>(null)
  const callout = ref<Callout | null>(null)
  let calloutSeq = 0

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
        questionsAhead(s.kpId, p.seed, p.difficulty, p.index, 16).flatMap((q) => [
          ...questionSpeech(q, lang.value),
          ...answerSpeech(q, lang.value),
        ]),
      )
    warmUp(tokens, lang.value)
  }

  function reset(): void {
    clearAll(timers)
    clearAll(aiTimers)
    pending.value = {}
    lastEvent.value = null
    callout.value = null
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
    const skin = resolveSkin(opts.skin ?? prefs.value.skin, createRng())
    const me = prefs.value.names.me
    const difficulty = prefs.value.difficulty
    const players: PlayerInit[] =
      opts.mode === 'ai'
        ? [
            { id: 'left', name: me, team: 'red', difficulty },
            { id: AI_ID, name: '', team: 'blue', kind: 'ai', difficulty },
          ]
        : [
            { id: 'left', name: prefs.value.names.left || me, team: 'red', difficulty },
            { id: 'right', name: prefs.value.names.right, team: 'blue', difficulty },
          ]
    operable.value = players.filter((p) => p.kind !== 'ai').map((p) => p.id)
    state.value = startMatch(createMatch({ kpId: opts.kpId, skin, players }), seedsFor(players, opts.seeds), opts.now ?? Date.now())
    prepareVoice()
  }

  function questionOf(p: Player): Question {
    const s = state.value
    if (!s) throw new Error('no match')
    return questionAt(s.kpId, p.seed, p.difficulty, p.index)
  }

  /** 倒数结束：开打，机器人开始动 */
  function beginPlay(now = Date.now()): void {
    if (!state.value) return
    state.value = applyBegin(state.value, now)
    if (mode.value === 'ai') aiStep()
  }

  function setInput(playerId: string, input: string): void {
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
    const res = applyAnswer(s, playerId, p.index, ok, String(given), now)
    state.value = res.state
    pending.value = { ...pending.value, [playerId]: { question: q, correct: ok, given: String(given) } }
    // 一次答题只弹一条：胜负（VictoryOverlay 负责）> 反超 > 还差一分 > 连对
    let toCall: MatchEvent | null = null
    const priority: Record<string, number> = { lead: 3, nearWin: 2, streak: 1 }
    for (const e of res.events) {
      lastEvent.value = e
      if (e.type === 'point') {
        playSfx('ding', streakPitch(e.streak))
        const kind = skinById(res.state.skin)?.kind
        if (kind) playSfx(KIND_SFX[kind])
      }
      if (e.type === 'finished') {
        clearAll(aiTimers)
        later(timers, () => playSfx('fanfare'), 300)
        later(timers, () => playSfx('cheer'), 500)
      }
      if ((e.type === 'lead' || e.type === 'nearWin' || e.type === 'streak') && (priority[e.type]! > (toCall ? priority[toCall.type]! : 0))) {
        toCall = e
      }
    }
    if (toCall) {
      const e = toCall as Extract<MatchEvent, { type: 'lead' | 'nearWin' | 'streak' }>
      if (e.type === 'streak') showCallout('battle.streak', e.team, { n: e.n })
      else showCallout(e.type === 'lead' ? 'battle.lead' : 'battle.nearWin', e.team)
    }
    if (!ok) playSfx('dong')
    later(
      timers,
      () => {
        const rest = { ...pending.value }
        delete rest[playerId]
        pending.value = rest
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

  /** 再来一局：同样的人、知识点、皮肤，新 seed */
  function rematch(seeds?: Record<string, number>, now = Date.now()): void {
    const s = state.value
    if (!s) return
    reset()
    state.value = startMatch(s, seedsFor(s.players, seeds), now)
    prepareVoice()
  }

  function leave(): void {
    reset()
    state.value = null
    mode.value = null
    operable.value = []
  }

  return {
    prefs,
    mapMode,
    state,
    mode,
    operable,
    pending,
    lastEvent,
    callout,
    setName,
    startLocal,
    questionOf,
    beginPlay,
    setInput,
    submit,
    rematch,
    leave,
  }
})
