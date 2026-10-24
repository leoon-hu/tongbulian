// 英语的出题骨架（需求 §11）：一个知识点的材料（UnitSpec，纯数据）→ 一组「题目模板」，每个模板一批题目条目（Item），
// 生成器按档位的权重挑模板、再随机挑条目出题。条目是确定的（签名 = 模板 + 条目），所以一轮里同一道题不会出两次；
// 干扰项与选项顺序每次随机。英文内容（单词、句子、要听的词）走 english / listen 部件与 lang: 'en' 的选项，
// 中文界面下也用英文的声音读（E5）；中文的意思、问题走 ctx.word 注册的词条（注音）。只依赖引擎与类型，node 里能单测。
import type { ChoiceStyle, Difficulty, Lang, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { labelKey, numberQuestion, sigId } from '@/engine'
import type { UnitSpec } from './spec'
import './prompts' // 副作用：注册题目要求

/** 一个选项：显示的文字（要注音的中文走词条）+ 朗读时读什么 + 用哪种声音（英文的选项 lang: 'en'） */
export interface Opt {
  label: LStr
  say?: string
  lang?: Lang
}

/** 一个单词：英文、中文意思、图（emoji，可无） */
export interface WordItem {
  en: string
  zh: string
  icon?: string
}

/** 出题需要的上下文：知识点 id、要注音的中文、全年级的单词池、学过的字母 */
export interface Ctx {
  kp: string
  /** 要注音的中文 → 词条（ew*.*，拼音来自拼音表） */
  word: (text: string) => LStr
  /** 全年级的单词：本课的词不够凑选项时从这里补，高档的干扰项也从这里挑（更像的词） */
  pool: WordItem[]
  /** 到本课为止学过的大写字母（字母表顺序、听音选字母的干扰项）；没有字母课的年级是整张字母表 */
  learnedLetters: string[]
}

/** 一道题的条目：key 是签名的一部分（模板名 + 条目），build 每次出一道（干扰项、选项顺序随机） */
export interface Item {
  key: string
  build: (d: Difficulty, rng: RNG) => Question
}

const IDS = ['a', 'b', 'c', 'd', 'e', 'f']
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
/** 数词 → 数（一到二十，三年级两册的 Unit 6） */
export const NUM_WORDS: Readonly<Record<string, number>> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
}
const HAN = /\p{Script=Han}/u

/** 选项：正确项 + 干扰项（去掉与正确项或彼此重复的，最多凑到 max 个），打乱 */
export function optionsFrom(correct: Opt, wrongs: Opt[], rng: RNG, max = 4): { choices: Question['choices']; correctId: string } {
  const seen = new Set([labelKey(correct.label)])
  const picked: Opt[] = []
  for (const w of wrongs) {
    const k = labelKey(w.label)
    if (seen.has(k) || picked.length >= max - 1) continue
    seen.add(k)
    picked.push(w)
  }
  if (picked.length === 0) throw new Error(`no distractors for ${labelKey(correct.label)}`)
  const pool = rng.shuffle([correct, ...picked])
  const choices = pool.map((o, i) => ({ id: IDS[i]!, label: o.label, ...(o.say !== undefined ? { say: o.say } : {}), ...(o.lang ? { lang: o.lang } : {}) }))
  return { choices, correctId: IDS[pool.indexOf(correct)]! }
}

function choiceQ(ctx: Ctx, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], correct: Opt, wrongs: Opt[], rng: RNG, style?: ChoiceStyle): Question {
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
    ...(style ? { choiceStyle: style } : {}),
  }
}

const text = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const en = (text: string, size?: 'big' | 'line', extra?: { say?: string; blank?: [number, number] }): StemPart => ({ kind: 'english', text, ...(size ? { size } : {}), ...extra })
const listen = (say: string): StemPart => ({ kind: 'listen', say, lang: 'en' })
/** 英文的选项：读它自己，用英文的声音 */
const enOpt = (s: string, say?: string): Opt => ({ label: s, lang: 'en', ...(say !== undefined ? { say } : {}) })
/** 字母的选项：显示 a / A / Aa，读字母名（大写单独一个字母合成出来就是字母名） */
const letterOpt = (shown: string): Opt => enOpt(shown, shown[0]!.toUpperCase())
const split = (s: string, by: RegExp | string = /\s+/): string[] => s.split(by).map((x) => x.trim()).filter(Boolean)
const uniqBy = <T>(list: T[], key: (x: T) => string): T[] => {
  const seen = new Set<string>()
  return list.filter((x) => (seen.has(key(x)) ? false : (seen.add(key(x)), true)))
}

// ── 材料的解析（内容包的测试也用） ──────────────────────────────────────────

/** 「cat 猫 🐱」「red panda 小熊猫 🐼」「o'clock 点钟」：第一个汉字之前的都是英文 */
export function parseWord(s: string): WordItem {
  const m = /^(.*?)\s+(\S*\p{Script=Han}\S*)(?:\s+(\S+))?$/u.exec(s.trim())
  if (!m || !m[1]) throw new Error(`bad word item: ${s}`)
  return { en: m[1].trim(), zh: m[2]!, ...(m[3] ? { icon: m[3] } : {}) }
}
/** 「Aa Bb Cc Dd」→ ['A', 'B', 'C', 'D'] */
export function parseLetters(s: string | undefined): string[] {
  return split(s ?? '').map((p) => {
    if (!/^[A-Z][a-z]$/.test(p) || p[0] !== p[1]!.toUpperCase()) throw new Error(`bad letters: ${s}`)
    return p[0]!
  })
}
export interface SoundItem {
  letter: string
  words: string[]
}
/** 「a apple bag」= 字母 + 例词 */
export function parseSound(s: string): SoundItem {
  const [letter, ...words] = split(s)
  if (!letter || !/^[a-z]$/.test(letter) || !words.length) throw new Error(`bad sound item: ${s}`)
  return { letter, words }
}
export interface SpellItem {
  pattern: string
  words: string[]
  contrast: string[]
}
/** 「a-e cake name make|cat hat」= 字母组合 + 含它的词 | 对比词 */
export function parseSpell(s: string): SpellItem {
  const [head, tail] = s.split('|')
  const [pattern, ...words] = split(head ?? '')
  if (!pattern || !words.length) throw new Error(`bad spell item: ${s}`)
  return { pattern, words, contrast: split(tail ?? '') }
}
/**
 * 这个词里有没有这个字母组合：「a-e」= a + 辅音 + e（cake）；「-e」= 词尾的 e 而前面没有别的元音（be、she，三下 Unit 2）；
 * 其余直接找（ee、oo、ce、th）
 */
export function hasPattern(word: string, pattern: string): boolean {
  if (pattern === '-e') return /^[^aeiou]+e$/.test(word)
  const m = /^([a-z])-e$/.exec(pattern)
  return m ? new RegExp(`${m[1]}[^aeiou]e`).test(word) : word.includes(pattern)
}
export interface TalkItem {
  prompt: string
  answer: string
  wrongs: string[]
}
/** 「Hello! I'm Mike.=Hi! I'm Sarah.|Thank you./Goodbye.」 */
export function parseTalk(s: string): TalkItem {
  const at = s.indexOf('=')
  const bar = s.indexOf('|')
  if (at < 0 || bar < at) throw new Error(`bad talk item: ${s}`)
  const prompt = s.slice(0, at).trim()
  const answer = s.slice(at + 1, bar).trim()
  const wrongs = split(s.slice(bar + 1), /\//)
  if (!prompt || !answer || !wrongs.length) throw new Error(`bad talk item: ${s}`)
  return { prompt, answer, wrongs }
}
export interface ClozeItem {
  /** 显示的句子（挖掉的词仍在，画的时候按 blank 挖） */
  text: string
  blank: [number, number]
  answer: string
  wrongs: string[]
}
/** 「I [like] apples.|have/am」 */
export function parseCloze(s: string): ClozeItem {
  const [sentence, rest] = s.split('|')
  const m = /\[([^\]]+)\]/.exec(sentence ?? '')
  if (!sentence || !m || rest === undefined) throw new Error(`bad cloze item: ${s}`)
  const before = Array.from(sentence.slice(0, m.index))
  const answer = m[1]!
  const wrongs = split(rest, /\//)
  if (!wrongs.length) throw new Error(`bad cloze item: ${s}`)
  return { text: sentence.replace(/[[\]]/g, ''), blank: [before.length, Array.from(answer).length], answer, wrongs }
}
export interface AskItem {
  q: string
  answer: string
  wrongs: string[]
  number?: number
}
/** 「Where is Amy from?=the UK/China/Canada」「How many legs does a dog have?=#4」 */
export function parseAsk(s: string): AskItem {
  const at = s.indexOf('=')
  if (at < 0) throw new Error(`bad ask item: ${s}`)
  const q = s.slice(0, at).trim()
  const rest = s.slice(at + 1)
  if (rest.startsWith('#')) return { q, answer: rest.slice(1), wrongs: [], number: Number(rest.slice(1)) }
  const [answer, ...wrongs] = split(rest, /\//)
  if (!q || !answer || !wrongs.length) throw new Error(`bad ask item: ${s}`)
  return { q, answer, wrongs }
}
/** 「one two three」→ [['one', 1], …] */
export function parseNumbers(s: string | undefined): [string, number][] {
  return split(s ?? '').map((w) => {
    const n = NUM_WORDS[w]
    if (n === undefined) throw new Error(`unknown number word: ${w}`)
    return [w, n]
  })
}

// ── 干扰项 ──────────────────────────────────────────────────────────────

/**
 * 单词的干扰项：先从本课的词里挑（意思不同的），不够从全年级的词池补；第 2、3 档混进一两个别的单元里首字母相同的词（更像）
 */
function wordWrongs(w: WordItem, unit: WordItem[], ctx: Ctx, d: Difficulty, rng: RNG, need = 3, keep: (x: WordItem) => boolean = () => true): WordItem[] {
  const ok = (x: WordItem): boolean => x.en !== w.en && x.zh !== w.zh && keep(x)
  const local = rng.shuffle(unit.filter(ok))
  const outside = rng.shuffle(ctx.pool.filter((x) => ok(x) && !unit.some((u) => u.en === x.en)))
  const mixIn = d === 1 ? [] : [...outside.filter((x) => x.en[0] === w.en[0]), ...outside].slice(0, d === 3 ? 2 : 1)
  return uniqBy([...mixIn, ...local, ...outside], (x) => x.en).slice(0, need)
}
/** 字母的干扰项：本课的字母 + 学过的字母（都不够再拿整张字母表） */
function letterWrongs(letter: string, unit: string[], ctx: Ctx, rng: RNG, need = 3): string[] {
  const pool = uniqBy([...rng.shuffle(unit), ...rng.shuffle(ctx.learnedLetters), ...rng.shuffle(ALPHABET)], (x) => x).filter((x) => x !== letter)
  return pool.slice(0, need)
}

// ── 单词 ────────────────────────────────────────────────────────────────

/** 听音选单词：屏幕上不出现这个词 */
function listenItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `listen-${w.en}`,
    build: (d, rng) =>
      choiceQ(ctx, 'word', d, `listen-${w.en}`, [text('eq.listenWord'), listen(w.en)], enOpt(w.en), wordWrongs(w, words, ctx, d, rng).map((x) => enOpt(x.en)), rng, 'english'),
  }))
}
/** 看图选单词（图不读，读了等于报答案）；配同一张图的词（ear / listen 都是 👂）不当干扰项，不然两个都对 */
function picItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `pic-${w.en}`,
      build: (d, rng) =>
        choiceQ(ctx, 'word', d, `pic-${w.en}`, [text('eq.picWord'), { kind: 'picture', icon: w.icon! }], enOpt(w.en), wordWrongs(w, words, ctx, d, rng, 3, (x) => x.icon !== w.icon).map((x) => enOpt(x.en)), rng, 'english'),
    }))
}
/** 看单词选图：选项是 emoji，读英文 */
function wordPicItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `wordpic-${w.en}`,
      build: (d, rng) => {
        const wrongs = uniqBy(
          wordWrongs(w, words, ctx, d, rng, 6, (x) => !!x.icon && x.icon !== w.icon),
          (x) => x.icon!,
        ).slice(0, 3)
        return choiceQ(ctx, 'word', d, `wordpic-${w.en}`, [text('eq.wordPic'), en(w.en, 'big')], enOpt(w.icon!, w.en), wrongs.map((x) => enOpt(x.icon!, x.en)), rng, 'emoji')
      },
    }))
}
/** 单词选意思：选项是中文（注音，中文读） */
function meaningItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `meaning-${w.en}`,
    build: (d, rng) =>
      choiceQ(ctx, 'word', d, `meaning-${w.en}`, [text('eq.meaning'), en(w.en, 'big')], { label: ctx.word(w.zh) }, uniqBy(wordWrongs(w, words, ctx, d, rng, 6), (x) => x.zh).slice(0, 3).map((x) => ({ label: ctx.word(x.zh) })), rng),
  }))
}
/** 中文选单词 */
function zh2enItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `zh2en-${w.en}`,
    build: (d, rng) => choiceQ(ctx, 'word', d, `zh2en-${w.en}`, [text('eq.zh2en', { w: ctx.word(w.zh) })], enOpt(w.en), wordWrongs(w, words, ctx, d, rng).map((x) => enOpt(x.en)), rng, 'english'),
  }))
}
/** 听音选图 */
function listenPicItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `listenpic-${w.en}`,
      build: (d, rng) => {
        const wrongs = uniqBy(
          wordWrongs(w, words, ctx, d, rng, 6, (x) => !!x.icon && x.icon !== w.icon),
          (x) => x.icon!,
        ).slice(0, 3)
        return choiceQ(ctx, 'word', d, `listenpic-${w.en}`, [text('eq.listenPic'), listen(w.en)], enOpt(w.icon!, w.en), wrongs.map((x) => enOpt(x.icon!, x.en)), rng, 'emoji')
      },
    }))
}
/** 补全字母：听单词，看「c _ t」选缺的字母（第一个不在开头的元音；没有就中间那个字母）；元音缺了从元音里挑干扰项 */
function spellingItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => /^[a-z]{3,}$/.test(w.en))
    .map((w) => {
      const letters = w.en.split('')
      let at = letters.findIndex((c, i) => i > 0 && VOWELS.has(c))
      if (at < 0) at = Math.floor(letters.length / 2)
      const missing = letters[at]!
      const shown = letters.map((c, i) => (i === at ? '_' : c)).join('')
      return {
        key: `spelling-${w.en}`,
        build: (d, rng) => {
          const pool = VOWELS.has(missing) ? [...VOWELS] : ALPHABET.map((x) => x.toLowerCase()).filter((x) => !VOWELS.has(x))
          const wrongs = rng.shuffle(pool.filter((x) => x !== missing)).slice(0, 3)
          return choiceQ(ctx, 'word', d, `spelling-${w.en}`, [text('eq.spelling'), listen(w.en), en(shown, 'big', { say: '' })], letterOpt(missing), wrongs.map(letterOpt), rng, 'english')
        },
      }
    })
}

// ── 字母与发音 ──────────────────────────────────────────────────────────

function lowerItems(ctx: Ctx, letters: string[]): Item[] {
  return letters.map((L) => ({
    key: `lower-${L}`,
    build: (d, rng) => choiceQ(ctx, 'letter', d, `lower-${L}`, [text('eq.lower'), en(L, 'big', { say: L })], letterOpt(L.toLowerCase()), letterWrongs(L, letters, ctx, rng).map((x) => letterOpt(x.toLowerCase())), rng, 'english'),
  }))
}
function upperItems(ctx: Ctx, letters: string[]): Item[] {
  return letters.map((L) => ({
    key: `upper-${L}`,
    build: (d, rng) => choiceQ(ctx, 'letter', d, `upper-${L}`, [text('eq.upper'), en(L.toLowerCase(), 'big', { say: L })], letterOpt(L), letterWrongs(L, letters, ctx, rng).map(letterOpt), rng, 'english'),
  }))
}
/** 听音选字母：选项是「Aa」这样的大小写对 */
function listenLetterItems(ctx: Ctx, letters: string[]): Item[] {
  const pair = (L: string): string => `${L}${L.toLowerCase()}`
  return letters.map((L) => ({
    key: `listenletter-${L}`,
    build: (d, rng) => choiceQ(ctx, 'letter', d, `listenletter-${L}`, [text('eq.listenLetter'), listen(L)], letterOpt(pair(L)), letterWrongs(L, letters, ctx, rng).map((x) => letterOpt(pair(x))), rng, 'english'),
  }))
}
/** 字母表顺序：X 后面 / 前面是哪个（干扰项挑它附近的字母） */
function orderItems(ctx: Ctx, letters: string[], dir: 'after' | 'before'): Item[] {
  return letters
    .filter((L) => (dir === 'after' ? L !== 'Z' : L !== 'A'))
    .map((L) => {
      const i = ALPHABET.indexOf(L)
      const answer = ALPHABET[dir === 'after' ? i + 1 : i - 1]!
      return {
        key: `${dir}-${L}`,
        build: (d, rng) => {
          const near = ALPHABET.filter((x, j) => x !== answer && x !== L && Math.abs(j - i) <= 3)
          const wrongs = rng.shuffle(near).slice(0, 3)
          return choiceQ(ctx, 'letter', d, `${dir}-${L}`, [text(`eq.${dir}`, { l: L })], letterOpt(answer), wrongs.map(letterOpt), rng, 'english')
        },
      }
    })
}
/** 听单词选首字母（三上 Letters and sounds 的「Listen and circle the first sound」） */
function soundItems(ctx: Ctx, sounds: SoundItem[], letters: string[]): Item[] {
  const unitLetters = letters.length ? letters : sounds.map((s) => s.letter.toUpperCase())
  return sounds.flatMap((s) =>
    s.words
      .filter((w) => w.toLowerCase().startsWith(s.letter))
      .map((w) => ({
        key: `sound-${w}`,
        build: (d: Difficulty, rng: RNG) =>
          choiceQ(ctx, 'letter', d, `sound-${w}`, [text('eq.firstSound'), listen(w)], letterOpt(s.letter), letterWrongs(s.letter.toUpperCase(), unitLetters, ctx, rng).map((x) => letterOpt(x.toLowerCase())), rng, 'english'),
      })),
  )
}
/** 拼读（三下 Let's spell）：听音在最小对（cake / cat）里选；哪个单词里有这个字母组合 */
function spellItems(ctx: Ctx, spells: SpellItem[]): { spell: Item[]; spellgroup: Item[] } {
  const spell: Item[] = []
  const spellgroup: Item[] = []
  const all = spells.flatMap((s) => [...s.words, ...s.contrast])
  for (const s of spells) {
    for (const w of s.words) {
      spell.push({
        key: `spell-${w}`,
        build: (d, rng) => {
          const wrongs = uniqBy([...rng.shuffle(s.contrast), ...rng.shuffle(s.words.filter((x) => x !== w)), ...rng.shuffle(all)], (x) => x).filter((x) => x !== w)
          return choiceQ(ctx, 'letter', d, `spell-${w}`, [text('eq.spellHear'), listen(w)], enOpt(w), wrongs.slice(0, 3).map((x) => enOpt(x)), rng, 'english')
        },
      })
      spellgroup.push({
        key: `spellgroup-${w}`,
        build: (d, rng) => {
          const without = (x: string): boolean => x !== w && !hasPattern(x, s.pattern)
          const wrongs = uniqBy([...rng.shuffle(s.contrast.filter(without)), ...rng.shuffle(all.filter(without)), ...rng.shuffle(ctx.pool.map((p) => p.en).filter((x) => /^[a-z]+$/.test(x) && without(x)))], (x) => x)
          return choiceQ(ctx, 'letter', d, `spellgroup-${w}`, [text('eq.spellGroup'), en(s.pattern, 'big', { say: '' })], enOpt(w), wrongs.slice(0, 3).map((x) => enOpt(x)), rng, 'english')
        },
      })
    }
  }
  return { spell, spellgroup }
}

// ── 对话与句子 ──────────────────────────────────────────────────────────

function talkItems(ctx: Ctx, items: TalkItem[]): Item[] {
  return items.map((it) => ({
    key: `talk-${it.prompt}`,
    build: (d, rng) => choiceQ(ctx, 'talk', d, `talk-${it.prompt}`, [text('eq.reply'), en(it.prompt, 'line')], enOpt(it.answer), rng.shuffle(it.wrongs).map((x) => enOpt(x)), rng, 'english'),
  }))
}
/** 听句子选句子：本课的对话句（问和答）与填空的整句都算 */
function listenSentItems(ctx: Ctx, sentences: string[]): Item[] {
  const all = uniqBy(sentences, (x) => x)
  if (all.length < 2) return []
  return all.map((s) => ({
    key: `listensent-${s}`,
    build: (d, rng) => choiceQ(ctx, 'talk', d, `listensent-${s}`, [text('eq.listenSentence'), listen(s)], enOpt(s), rng.shuffle(all.filter((x) => x !== s)).slice(0, 3).map((x) => enOpt(x)), rng, 'english'),
  }))
}
function clozeItems(ctx: Ctx, items: ClozeItem[]): Item[] {
  return items.map((it) => {
    const key = `cloze-${it.text}-${it.blank[0]}`
    return {
      key,
      build: (d, rng) => choiceQ(ctx, 'talk', d, key, [text('eq.cloze'), en(it.text, 'line', { blank: it.blank })], enOpt(it.answer), rng.shuffle(it.wrongs).map((x) => enOpt(x)), rng, 'english'),
    }
  })
}
/**
 * 问答：问题 / 选项是中文就走词条（注音、中文读），是英文就走 english 部件与英文选项；
 * 英文句子配中文选项就是「这句话是什么意思」（前面加一句要求）
 */
function askItems(ctx: Ctx, items: AskItem[]): Item[] {
  return items.map((it) => ({
    key: `ask-${it.q}`,
    build: (d, rng) => {
      const zhOptions = [it.answer, ...it.wrongs].every((s) => HAN.test(s))
      const stem: StemPart[] = HAN.test(it.q) ? [{ kind: 'text', text: ctx.word(it.q) }] : zhOptions && it.number === undefined ? [text('eq.sentMeaning'), en(it.q, 'line')] : [en(it.q, 'line')]
      if (it.number !== undefined) {
        return numberQuestion({ kpId: ctx.kp, type: 'talk', difficulty: d, sig: `ask-${it.q}`, stem, value: it.number, rng, min: 0, max: Math.max(10, it.number + 5) })
      }
      const opt = (s: string): Opt => (HAN.test(s) ? { label: ctx.word(s) } : enOpt(s))
      const style: ChoiceStyle | undefined = [it.answer, ...it.wrongs].every((s) => !HAN.test(s)) ? 'english' : undefined
      return choiceQ(ctx, 'talk', d, `ask-${it.q}`, stem, opt(it.answer), rng.shuffle(it.wrongs).map(opt), rng, style)
    },
  }))
}

// ── 数字 ────────────────────────────────────────────────────────────────

const DEFAULT_ICONS = ['🍎', '🍌', '⭐', '🎈', '🐟', '📚']
/** 数一数：几个 emoji，数字键盘答 */
function countItems(ctx: Ctx, numbers: [string, number][], icons: string[]): Item[] {
  const pool = icons.length ? icons : DEFAULT_ICONS
  return numbers.map(([w, n]) => ({
    key: `count-${n}`,
    build: (d, rng) => numberQuestion({ kpId: ctx.kp, type: 'talk', difficulty: d, sig: `count-${w}`, stem: [text('eq.howMany'), { kind: 'objects', icon: rng.pick(pool), count: n }], value: n, rng, min: 0, max: 20, input: 'numpad' }),
  }))
}
/** 数词 → 数字键盘 */
function numWordItems(ctx: Ctx, numbers: [string, number][]): Item[] {
  return numbers.map(([w, n]) => ({
    key: `numword-${w}`,
    build: (d, rng) => numberQuestion({ kpId: ctx.kp, type: 'talk', difficulty: d, sig: `numword-${w}`, stem: [text('eq.numWord'), en(w, 'big')], value: n, rng, min: 0, max: 20, input: 'numpad' }),
  }))
}
/** 数字 → 数词（选项） */
function num2WordItems(ctx: Ctx, numbers: [string, number][]): Item[] {
  const all = numbers.length >= 4 ? numbers : [...numbers, ...Object.entries(NUM_WORDS).filter(([w]) => !numbers.some(([x]) => x === w)).slice(0, 4 - numbers.length)]
  return numbers.map(([w, n]) => ({
    key: `num2word-${n}`,
    build: (d, rng) => choiceQ(ctx, 'talk', d, `num2word-${w}`, [text('eq.whichNum', { n })], enOpt(w), rng.shuffle(all.filter(([x]) => x !== w)).slice(0, 3).map(([x]) => enOpt(x)), rng, 'english'),
  }))
}

// ── 装配 ────────────────────────────────────────────────────────────────

/** 一个知识点的全部单词 */
export const unitWords = (spec: UnitSpec): WordItem[] => (spec.words ?? []).map(parseWord)

/** 一个知识点的材料 → 各模板的条目 */
export function unitItems(spec: UnitSpec, ctx: Ctx): Record<string, Item[]> {
  const words = unitWords(spec)
  const letters = parseLetters(spec.letters)
  const sounds = (spec.sounds ?? []).map(parseSound)
  const spells = (spec.spell ?? []).map(parseSpell)
  const talks = (spec.talk ?? []).map(parseTalk)
  const clozes = (spec.cloze ?? []).map(parseCloze)
  const asks = (spec.ask ?? []).map(parseAsk)
  const numbers = parseNumbers(spec.numbers)
  const { spell, spellgroup } = spellItems(ctx, spells)
  const sentences = [...talks.flatMap((t) => [t.prompt, t.answer]), ...clozes.map((c) => c.text)]
  return {
    listen: listenItems(ctx, words),
    pic: picItems(ctx, words),
    wordpic: wordPicItems(ctx, words),
    meaning: meaningItems(ctx, words),
    zh2en: zh2enItems(ctx, words),
    listenpic: listenPicItems(ctx, words),
    spelling: spellingItems(ctx, words),
    lower: lowerItems(ctx, letters),
    upper: upperItems(ctx, letters),
    listenletter: listenLetterItems(ctx, letters),
    after: orderItems(ctx, letters, 'after'),
    before: orderItems(ctx, letters, 'before'),
    sound: soundItems(ctx, sounds, letters),
    spell,
    spellgroup,
    talk: talkItems(ctx, talks),
    listensent: listenSentItems(ctx, sentences),
    cloze: clozeItems(ctx, clozes),
    ask: askItems(ctx, asks),
    count: countItems(ctx, numbers, words.filter((w) => w.icon).map((w) => w.icon!)),
    numword: numWordItems(ctx, numbers),
    num2word: num2WordItems(ctx, numbers),
  }
}

/** 「listen:3 pic:2」→ [['listen', 3], ['pic', 2]] */
export function parseMix(mix: string): [string, number][] {
  return split(mix).map((part) => {
    const [name, w] = part.split(':')
    if (!name || !w || !(Number(w) > 0)) throw new Error(`bad mix: ${mix}`)
    return [name, Number(w)]
  })
}

/** 一个知识点要查拼音表的中文：单词的意思、中文的问题与选项 */
export function unitTexts(spec: UnitSpec): string[] {
  const out = unitWords(spec).map((w) => w.zh)
  for (const a of (spec.ask ?? []).map(parseAsk)) for (const s of [a.q, a.answer, ...a.wrongs]) if (HAN.test(s)) out.push(s)
  return out
}

/** 一个知识点里的全部英文（测试查朗读、查课本词汇） */
export function unitEnglish(spec: UnitSpec): string[] {
  const out: string[] = unitWords(spec).map((w) => w.en)
  for (const s of (spec.sounds ?? []).map(parseSound)) out.push(...s.words)
  for (const s of (spec.spell ?? []).map(parseSpell)) out.push(...s.words, ...s.contrast)
  for (const t of (spec.talk ?? []).map(parseTalk)) out.push(t.prompt, t.answer, ...t.wrongs)
  for (const c of (spec.cloze ?? []).map(parseCloze)) out.push(c.text, c.answer, ...c.wrongs)
  for (const a of (spec.ask ?? []).map(parseAsk)) for (const s of [a.q, a.answer, ...a.wrongs]) if (!HAN.test(s) && !/^\d+$/.test(s)) out.push(s)
  return out
}
