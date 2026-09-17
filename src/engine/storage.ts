import type { Lang, ProgressState, RoundState, Settings } from '@/types/models'
import { ROUND_SIZE } from './session'

/** 本地存储的唯一根 key。改名 / 换项目时改这里；旧 key 的数据不再读取。 */
const STORAGE_KEY = 'tongbulian:v1'
/** v1 只有 completed；v2（2026-09-16）加了 progress.rounds（每个知识点当前这一轮：seed 与逐题对错） */
const CURRENT_VERSION = 2

export interface PersistedState {
  version: number
  progress: ProgressState
  settings: Settings
}

function defaultState(): PersistedState {
  return {
    version: CURRENT_VERSION,
    progress: { completed: {}, rounds: {} },
    settings: { soundEnabled: true, lang: 'zh' },
  }
}

/**
 * 版本迁移：migrations[n - 1] 负责把 version n 的数据升级到 n + 1。
 * schema 变化时：CURRENT_VERSION + 1，并在此追加一个迁移函数，loadState 会按序执行。
 */
const migrations: Array<(state: Record<string, unknown>) => Record<string, unknown>> = [
  // v1 → v2：新增 progress.rounds，老数据没有就是空表，sanitize 会补默认值，这里原样放行
  (state) => state,
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isLang(v: unknown): v is Lang {
  return v === 'zh' || v === 'en'
}

function isCount(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0
}

/**
 * 把（可能缺字段、被改坏的）原始对象整理成合法状态：逐字段校验，
 * 缺失或类型不对的一律回退默认值，保证启动时不会因为一条坏数据整站打不开。
 */
function sanitize(raw: Record<string, unknown>): PersistedState {
  const base = defaultState()
  const progress = isRecord(raw.progress) ? raw.progress : {}
  const settings = isRecord(raw.settings) ? raw.settings : {}
  const completed: Record<string, boolean> = {}
  if (isRecord(progress.completed)) {
    for (const [kpId, done] of Object.entries(progress.completed)) {
      if (done === true) completed[kpId] = true
    }
  }
  // 当前这一轮：逐题对错是布尔数组，长度不能超过一轮的题数
  const rounds: Record<string, RoundState> = {}
  if (isRecord(progress.rounds)) {
    for (const [kpId, r] of Object.entries(progress.rounds)) {
      if (
        isRecord(r) &&
        isCount(r.seed) &&
        Array.isArray(r.results) &&
        r.results.length <= ROUND_SIZE &&
        r.results.every((x) => typeof x === 'boolean')
      ) {
        rounds[kpId] = { seed: r.seed, results: [...(r.results as boolean[])] }
      }
    }
  }
  return {
    version: CURRENT_VERSION,
    progress: { completed, rounds },
    settings: {
      soundEnabled:
        typeof settings.soundEnabled === 'boolean' ? settings.soundEnabled : base.settings.soundEnabled,
      lang: isLang(settings.lang) ? settings.lang : base.settings.lang,
    },
  }
}

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return defaultState()
    let state = parsed
    let version = typeof state.version === 'number' ? state.version : 1
    while (version < CURRENT_VERSION) {
      const migrate = migrations[version - 1]
      if (!migrate) break
      state = migrate(state)
      version += 1
    }
    return sanitize(state)
  } catch {
    // 数据损坏时重置，避免应用无法启动
    return defaultState()
  }
}

export function saveState(patch: Partial<PersistedState>): void {
  const current = loadState()
  const next = { ...current, ...patch, version: CURRENT_VERSION }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
