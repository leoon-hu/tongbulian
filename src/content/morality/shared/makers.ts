// 道德与法治的出题骨架（需求 §12）：一课的材料（LessonSpec，纯数据）→ 一组「题目模板」，每个模板一批题目条目（Item），
// 生成器按档位的权重挑模板、再随机挑条目出题。条目是确定的（签名 = 模板 + 条目），一轮里同一道题不会出两次；
// 干扰项与选项顺序每次随机。只依赖引擎与类型，node 里能单测。
import type { Difficulty, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { labelKey, sigId } from '@/engine'
import type { LessonSpec } from './spec'
import './prompts' // 副作用：注册题目要求

/** 一个选项：显示的文字（走词条，注音）+ 朗读时读什么（带图的选项读去掉图的文字；不填读 label） */
export interface Opt {
  label: LStr
  say?: string
}

/** 出题需要的上下文：知识点 id、要注音的中文 → 词条 */
export interface Ctx {
  kp: string
  word: (text: string) => LStr
}

/** 一道题的条目：key 是签名的一部分（模板名 + 条目），build 每次出一道（干扰项、选项顺序随机） */
export interface Item {
  key: string
  build: (d: Difficulty, rng: RNG) => Question
}

const IDS = ['a', 'b', 'c', 'd']
const EMOJI_HEAD = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*|(?:\p{Regional_Indicator}{2}))\s*/u
const split = (s: string, sep: RegExp): string[] => s.split(sep).map((x) => x.trim()).filter(Boolean)
const text = (k: string): StemPart => ({ kind: 'text', text: { k } })

/** 带 emoji 的选项：「🇨🇳五星红旗」显示成「🇨🇳 五星红旗」（注音只注汉字），读「五星红旗」 */
export function optLabel(s: string): { shown: string; say: string } {
  const m = EMOJI_HEAD.exec(s)
  if (!m) return { shown: s, say: s }
  const rest = s.slice(m[0].length)
  return { shown: `${m[1]} ${rest}`, say: rest }
}
/** 要查拼音表的文字（去掉开头的 emoji） */
export const hanPart = (s: string): string => optLabel(s).say

/** 选项：正确项 + 干扰项（去掉重复的，最多凑到 4 个），打乱 */
function optionsFrom(correct: Opt, wrongs: Opt[], rng: RNG): { choices: Question['choices']; correctId: string } {
  const seen = new Set([labelKey(correct.label)])
  const picked: Opt[] = []
  for (const w of wrongs) {
    const k = labelKey(w.label)
    if (seen.has(k) || picked.length >= IDS.length - 1) continue
    seen.add(k)
    picked.push(w)
  }
  if (!picked.length) throw new Error(`no distractors for ${labelKey(correct.label)}`)
  const pool = rng.shuffle([correct, ...picked])
  const choices = pool.map((o, i) => ({ id: IDS[i]!, label: o.label, ...(o.say !== undefined ? { say: o.say } : {}) }))
  return { choices, correctId: IDS[pool.indexOf(correct)]! }
}

function choiceQ(ctx: Ctx, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], correct: Opt, wrongs: Opt[], rng: RNG, read: boolean): Question {
  const { choices, correctId } = optionsFrom(correct, wrongs, rng)
  return {
    id: sigId(ctx.kp, sig),
    kpId: ctx.kp,
    type,
    difficulty: d,
    stem,
    input: 'choice',
    answer: { kind: 'choice', choiceId: correctId },
    choices,
    ...(read ? { readChoices: true } : {}),
  }
}

// ── 这样做对吗 / 哪种做法对 / 哪种做法不对（D2）──────────────────────────────

/** 判断题：一句做法 + 「这样做对吗？」，选项「对 / 不对」（不读，D4）；两个选项的位置固定（对在前） */
function judgeItems(ctx: Ctx, good: string[], bad: string[]): Item[] {
  const all = [...good.map((s) => ({ s, ok: true })), ...bad.map((s) => ({ s, ok: false }))]
  return all.map(({ s, ok }) => ({
    key: `judge-${s}`,
    build: (d) => ({
      id: sigId(ctx.kp, `judge-${s}`),
      kpId: ctx.kp,
      type: 'conduct',
      difficulty: d,
      stem: [{ kind: 'text', text: ctx.word(s) }, text('dq.judge')],
      input: 'choice',
      answer: { kind: 'choice', choiceId: ok ? 'a' : 'b' },
      choices: [
        { id: 'a', label: { k: 'dq.yes' }, say: '对' },
        { id: 'b', label: { k: 'dq.no' }, say: '不对' },
      ],
    }),
  }))
}

/** 哪种做法是对的（一个对的 + 两个不对的）/ 哪种做法不对（一个不对的 + 两个对的）：干扰项都从同一课里取 */
function pickItems(ctx: Ctx, right: string[], others: string[], name: 'good' | 'bad'): Item[] {
  if (others.length < 2) return []
  return right.map((s) => ({
    key: `${name}-${s}`,
    build: (d, rng) => {
      const wrongs = rng.shuffle(others).slice(0, 2).map((w) => ({ label: ctx.word(w) }))
      return choiceQ(ctx, 'conduct', d, `${name}-${s}`, [text(`dq.${name}`)], { label: ctx.word(s) }, wrongs, rng, true)
    },
  }))
}

// ── 问答 ──────────────────────────────────────────────────────────────────

export interface AskItem {
  q: string
  answer: string
  wrongs: string[]
}
export function parseAsk(s: string): AskItem {
  const at = s.indexOf('=')
  if (at < 0) throw new Error(`bad ask item: ${s}`)
  const [answer, ...wrongs] = split(s.slice(at + 1), /\//)
  if (!answer || wrongs.length < 2) throw new Error(`bad ask item: ${s}`)
  return { q: s.slice(0, at), answer, wrongs }
}
function askItems(ctx: Ctx, items: AskItem[]): Item[] {
  return items.map((it) => ({
    key: `ask-${it.q}`,
    build: (d, rng) => {
      const opt = (s: string): Opt => {
        const { shown, say } = optLabel(s)
        return { label: ctx.word(shown), ...(shown !== say ? { say } : {}) }
      }
      return choiceQ(ctx, 'civics', d, `ask-${it.q}`, [{ kind: 'text', text: ctx.word(it.q) }], opt(it.answer), rng.shuffle(it.wrongs).map(opt), rng, true)
    },
  }))
}

// ── 儿歌填空 ──────────────────────────────────────────────────────────────

export interface ClozeItem {
  /** 整句（去掉方括号） */
  text: string
  /** 挖掉的：起点（按字符数）与长度 */
  blank: [number, number]
  answer: string
  wrongs: string[]
}
export function parseCloze(s: string): ClozeItem {
  const [sentence, rest] = s.split('|')
  const m = /\[([^\]]+)\]/.exec(sentence ?? '')
  if (!sentence || !m || rest === undefined) throw new Error(`bad cloze item: ${s}`)
  const answer = m[1]!
  const wrongs = split(rest, /\//)
  if (wrongs.length < 2) throw new Error(`bad cloze item: ${s}`)
  return { text: sentence.replace(/[[\]]/g, ''), blank: [Array.from(sentence.slice(0, m.index)).length, Array.from(answer).length], answer, wrongs }
}
function clozeItems(ctx: Ctx, items: ClozeItem[], py: (t: string) => string): Item[] {
  return items.map((it) => ({
    key: `cloze-${it.text}-${it.blank[0]}`,
    build: (d, rng) => {
      const verse: StemPart = { kind: 'verse', text: it.text, py: py(it.text), blank: it.blank }
      return choiceQ(ctx, 'civics', d, `cloze-${it.text}-${it.blank[0]}`, [text('dq.cloze'), verse], { label: ctx.word(it.answer) }, rng.shuffle(it.wrongs).map((w) => ({ label: ctx.word(w) })), rng, true)
    },
  }))
}

// ── 一课的全部条目 ─────────────────────────────────────────────────────────

/** 一课材料 → 各模板的条目（模板名 → 条目），没有材料的模板不出现 */
export function lessonItems(spec: LessonSpec, ctx: Ctx, py: (t: string) => string): Record<string, Item[]> {
  const good = spec.good ?? []
  const bad = spec.bad ?? []
  const out: Record<string, Item[]> = {
    judge: judgeItems(ctx, good, bad),
    good: pickItems(ctx, good, bad, 'good'),
    bad: pickItems(ctx, bad, good, 'bad'),
    ask: askItems(ctx, (spec.ask ?? []).map(parseAsk)),
    cloze: clozeItems(ctx, (spec.cloze ?? []).map(parseCloze), py),
  }
  for (const k of Object.keys(out)) if (!out[k]!.length) delete out[k]
  return out
}

/** 「judge:3 ask:2」→ [['judge', 3], ['ask', 2]] */
export function parseMix(s: string): [string, number][] {
  return split(s, /\s+/).map((t) => {
    const [name, w] = t.split(':')
    return [name!, Number(w ?? 1)]
  })
}

/** 一课里所有要查拼音表的中文（拼音表的完整性测试用）：做法、问题、选项（去掉图）、儿歌整句与选项 */
export function lessonTexts(spec: LessonSpec): string[] {
  const out = new Set<string>()
  for (const s of [...(spec.good ?? []), ...(spec.bad ?? [])]) out.add(s)
  for (const it of (spec.ask ?? []).map(parseAsk)) for (const s of [it.q, it.answer, ...it.wrongs]) out.add(hanPart(s))
  for (const it of (spec.cloze ?? []).map(parseCloze)) for (const s of [it.text, it.answer, ...it.wrongs]) out.add(s)
  return [...out]
}
