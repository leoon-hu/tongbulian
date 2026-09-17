// 出题的公共骨架（与学科 / 年级无关）：选项构造、数值干扰项、数值题 / 文本题两种模板。
// 各内容包的生成器优先用这些，保证选项互异、答案自洽、签名可去重。
import type {
  Choice,
  Difficulty,
  InputMode,
  LStr,
  Question,
  QuestionType,
  StemPart,
} from '@/types/models'
import type { RNG } from './rng'

const ID_LETTERS = ['a', 'b', 'c', 'd', 'e', 'f']

/** 选项去重 / 匹配用的稳定键：字面量取其本身，键值对象取其序列化。 */
export function labelKey(l: LStr): string {
  return typeof l === 'string' ? l : JSON.stringify(l)
}

/**
 * 由正确答案 + 干扰项构造选项，返回选项数组与正确项 id。选项标签是 LStr（渲染时按语言解析）。
 * 调用方需保证干扰项彼此互异且不等于正确答案（按 labelKey 判等）。
 */
export function choicesFrom(
  correctLabel: LStr,
  distractorLabels: LStr[],
  rng: RNG,
): { choices: Choice[]; correctId: string } {
  const pool = rng.shuffle([correctLabel, ...distractorLabels])
  const choices = pool.map((label, i) => ({ id: ID_LETTERS[i]!, label }))
  const key = labelKey(correctLabel)
  const correctId = choices.find((c) => labelKey(c.label) === key)!.id
  return { choices, correctId }
}

/**
 * 数值型干扰项：先用常见错误模式（±1、±2、±10 等，可由 smart 指定），
 * 再在邻域补足；保证互异、落在 [min, max]、不等于正确答案。
 */
export function numberDistractors(
  answer: number,
  opts: { min?: number; max: number; count?: number; smart?: number[] } = { max: 20 },
): number[] {
  const min = opts.min ?? 1
  const count = opts.count ?? 3
  const wrongs: number[] = []
  const push = (v: number): void => {
    if (v >= min && v <= opts.max && v !== answer && !wrongs.includes(v) && wrongs.length < count) {
      wrongs.push(v)
    }
  }
  for (const s of opts.smart ?? []) push(s)
  for (const d of [answer - 1, answer + 1, answer + 10, answer - 10, answer + 2, answer - 2]) push(d)
  let step = 1
  while (wrongs.length < count && step <= opts.max) {
    push(answer - step)
    push(answer + step)
    step += 1
  }
  // 极端兜底：从 min 起补
  for (let v = min; wrongs.length < count && v <= opts.max; v++) push(v)
  return wrongs.slice(0, count)
}

/** 组织成 `${kpId}:${sig}` 的题目签名（会话内去重键） */
export function sigId(kpId: string, sig: string): string {
  return `${kpId}:${sig}`
}

/**
 * 数值答案题：随机（或强制）用数字键盘 / 选择卡作答。
 * choice 时自动配干扰项。
 */
export function numberQuestion(opts: {
  kpId: string
  type: QuestionType
  difficulty: Difficulty
  sig: string
  stem: StemPart[]
  value: number
  rng: RNG
  max: number
  min?: number
  input?: InputMode
  smart?: number[]
}): Question {
  const input: InputMode = opts.input ?? (opts.rng.chance(0.45) ? 'choice' : 'numpad')
  const base: Question = {
    id: sigId(opts.kpId, opts.sig),
    kpId: opts.kpId,
    type: opts.type,
    difficulty: opts.difficulty,
    stem: opts.stem,
    input,
    answer: { kind: 'number', value: opts.value },
  }
  if (input === 'choice') {
    const distract = numberDistractors(opts.value, {
      min: opts.min ?? 0,
      max: opts.max,
      smart: opts.smart,
    })
    const { choices, correctId } = choicesFrom(
      String(opts.value),
      distract.map(String),
      opts.rng,
    )
    base.choices = choices
    base.answer = { kind: 'choice', choiceId: correctId }
  }
  return base
}

/** 文本/符号答案题：始终选择卡作答。 */
export function labelQuestion(opts: {
  kpId: string
  type: QuestionType
  difficulty: Difficulty
  sig: string
  stem: StemPart[]
  correct: LStr
  distractors: LStr[]
  rng: RNG
}): Question {
  const { choices, correctId } = choicesFrom(opts.correct, opts.distractors, opts.rng)
  return {
    id: sigId(opts.kpId, opts.sig),
    kpId: opts.kpId,
    type: opts.type,
    difficulty: opts.difficulty,
    stem: opts.stem,
    input: 'choice',
    answer: { kind: 'choice', choiceId: correctId },
    choices,
  }
}
