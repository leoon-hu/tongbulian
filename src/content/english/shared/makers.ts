// 英语的出题骨架（需求 §11）：一个知识点的材料（UnitSpec，纯数据）→ 一组「题目模板」，每个模板一批题目条目（Item），
// 生成器按档位的权重挑模板、再随机挑条目出题。条目是确定的（签名 = 模板 + 条目），所以一轮里同一道题不会出两次；
// 干扰项与选项顺序每次随机。英文内容（单词、句子、要听的词）走 english / listen 部件与 lang: 'en' 的选项，
// 中文界面下也用英文的声音读（E5）；中文的意思、问题走 ctx.word 注册的词条（注音）。只依赖引擎与类型，node 里能单测。
// 每道题都要考到英语（E3）：题干里有英文、要听英文，或者选项是英文——只数数、只读中文的题不出。
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

/** 一个单词（课本单元词汇表里的黑体词）：英文、中文意思、图（emoji，可无） */
export interface WordItem {
  en: string
  zh: string
  icon?: string
}

/** 一个拼读词（字母课 / 拼读课里只要求会读、不要求懂意思的词）：英文、图（emoji，可无，只在「听首字母」时作提示） */
export interface ReadItem {
  en: string
  icon?: string
}

/** 出题需要的上下文：知识点 id、要注音的中文、全年级的单词池、学过的字母 */
export interface Ctx {
  kp: string
  /** 要注音的中文 → 词条（ew*.*，拼音来自拼音表） */
  word: (text: string) => LStr
  /** 全年级的单词（黑体词）：本课的词不够凑选项时从这里补，高档的干扰项也从这里挑（更像的词） */
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

// ── 不能同时出现在一道题选项里的词（不然两个都对）─────────────────────────

/** 读音一样的词：听音的题（听音选词、听音选图、拼读）里不能同时做选项 */
const HOMOPHONE_GROUPS: string[][] = [
  ['sea', 'see'],
  ['right', 'write'],
  ['eye', 'i'],
  ['two', 'too', 'to'],
  ['four', 'for'],
  ['one', 'won'],
  ['meat', 'meet'],
  ['son', 'sun'],
  ['be', 'bee'],
  ['no', 'know'],
  ['hear', 'here'],
  ['by', 'buy', 'bye'],
  ['pear', 'pair'],
  ['wear', 'where'],
  ['there', 'their'],
  ['eight', 'ate'],
  ['flower', 'flour'],
  ['tail', 'tale'],
  ['plane', 'plain'],
  ['week', 'weak'],
  ['blue', 'blew'],
  ['new', 'knew'],
  ['deer', 'dear'],
  ['hi', 'high'],
  ['aunt', 'ant'], // 美音的 aunt 和 ant 一样
  ['whole', 'hole'],
  ['night', 'knight'],
  ['sail', 'sale'],
  ['rose', 'rows'],
  ['hair', 'hare'],
  ['bear', 'bare'],
  ['wait', 'weight'],
  ['our', 'hour'],
  ['road', 'rode'],
  // 四年级（拼读课的 wh / ur / or / air / ear 组、各单元的词）
  ['which', 'witch'],
  ['whose', "who's"],
  ['what', 'watt'],
  ['fur', 'fir'],
  ['turn', 'tern'],
  ['horse', 'hoarse'],
  ['fair', 'fare'],
  ['read', 'reed'],
  // 五年级（拼读课 ai / ay、ee / ea、ie / igh、oa / ow、al / au / aw，旧版五下的 ng）
  ['tea', 'tee'],
  ['rain', 'rein', 'reign'],
  ['way', 'weigh', 'whey'],
  ['tie', 'thai'],
  ['all', 'awl'],
  ['ring', 'wring'],
  ['morning', 'mourning'],
  ['flu', 'flew', 'flue'],
]
/** 意思相同 / 相近的词：选意思、中文选单词、看图的题里不能同时做选项 */
const SAME_MEANING: string[][] = [
  ['mum', 'mother', 'mom'],
  ['dad', 'father'],
  ['grandma', 'grandmother'],
  ['grandpa', 'grandfather'],
  ['teacher', 'miss'],
  ['listen', 'hear'],
  ['say', 'talk', 'speak', 'tell'],
  ['picture', 'draw'],
  ['nice', 'good', 'fine', 'great', 'ok'],
  ['home', 'family', 'house'],
  ['student', 'classmate', 'pupil'],
  ['we', 'us'],
  ['she', 'her'],
  ['he', 'him'],
  ['they', 'them'],
  ['i', 'me', 'my'],
  ['have', 'has'],
  ['big', 'large'],
  ['small', 'little'],
  ['look', 'see', 'watch'],
  ['hi', 'hello'],
  ['bye', 'goodbye'],
  ['kid', 'child'],
  ['hat', 'cap'],
  ['play', 'game'],
]
/**
 * 一个是另一个的一种、或者图上分不清的词（键是大类 / 图上那样东西，值是它包含的 / 长得像的）：
 * 🍎 既是 apple 也是 fruit，🐼 也可以叫 bear，👀 会被看成 eye——这些也不能同时做选项
 */
const RELATED: Readonly<Record<string, string[]>> = {
  fruit: ['apple', 'banana', 'orange', 'grape', 'pear', 'peach', 'watermelon', 'strawberry'],
  animal: ['dog', 'cat', 'fish', 'bird', 'rabbit', 'panda', 'monkey', 'tiger', 'elephant', 'lion', 'bear', 'duck', 'fox', 'giraffe', 'pig', 'cow', 'horse', 'sheep', 'chicken'],
  pet: ['dog', 'cat', 'fish', 'bird', 'rabbit'],
  toy: ['doll', 'ball', 'car', 'boat', 'kite', 'yo-yo'],
  food: ['rice', 'bread', 'meat', 'egg', 'noodles', 'cake', 'soup', 'vegetables', 'fruit', 'candy'],
  colour: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'brown', 'pink', 'white', 'black'],
  plant: ['tree', 'flower', 'grass'],
  flower: ['rose'],
  bird: ['duck', 'chicken'],
  meat: ['chicken'],
  vegetables: ['tomato', 'potato', 'carrot'],
  // 四年级：连衣裙是一种裙子、短裤是一种裤子，大衣和夹克的图分不清；足球是一种体育运动
  dress: ['skirt'],
  trousers: ['shorts'],
  coat: ['jacket'],
  sport: ['football', 'basketball'],
  // 洗手间里有厕所；滑梯 🛝 在公园里也有；灯和太阳都是「光」
  bathroom: ['toilet'],
  park: ['playground'],
  light: ['sunny'],
  // 雪花 ❄️ 和雪人 ⛄、太阳 ☀️ 和太阳镜 🕶️ 放在一道题里容易选岔
  snowy: ['snowman'],
  sunny: ['sunglasses'],
  // 五年级：😢 难过和 😟 担心的脸在小屏上分不清；劳动节、圣诞节是一种节日，四季是季节，做体育运动也是锻炼
  sad: ['worried'],
  festival: ['labour day', 'christmas', 'thanksgiving', 'national day'],
  season: ['spring', 'summer', 'autumn', 'winter', 'fall'],
  exercise: ['play sports', 'sport', 'sports'],
  // nurse 当动词是「照顾」
  nurse: ['look after'],
  bear: ['panda', 'red panda'],
  water: ['sea'],
  eye: ['see', 'look'],
  ear: ['hear', 'listen'],
  hand: ['touch'],
  nose: ['smell'],
  tongue: ['taste'],
  mouth: ['eat'],
  box: ['gift'],
  kid: ['boy', 'girl', 'baby'],
  boy: ['brother', 'son'],
  girl: ['sister', 'daughter'],
  man: ['dad', 'father', 'uncle', 'grandpa', 'grandfather', 'mr'],
  woman: ['mum', 'mother', 'aunt', 'grandma', 'grandmother', 'miss'],
}

const norm = (s: string): string => s.toLowerCase()
/** 词干：去掉 -ing（swimming → swim、doing → do）、复数 s（turns → turn）、词尾 e（dancing / dance → danc） */
function stem(w: string): string {
  let s = w
  if (s.endsWith('ing') && /[aeiouy]/.test(s.slice(0, -3))) {
    s = s.slice(0, -3)
    if (/[^aeiou][aeiou]([bdgmnprt])\1$/.test(s)) s = s.slice(0, -1)
  } else if (s.length > 3 && s.endsWith('s') && !/(ss|us|is)$/.test(s)) s = s.slice(0, -1)
  return s.replace(/e$/, '')
}
/** 一个词（组）里的词全在另一个里：jump / jumping、eating / eat breakfast、turn / take turns、picnic / go on a picnic */
function partOf(x: string, y: string): boolean {
  const [a, b] = [x, y].map((p) => p.split(/\s+/).filter((t) => t && t !== '...').map(stem))
  const [short, long] = a!.length <= b!.length ? [a!, b!] : [b!, a!]
  return short.every((t) => long.includes(t))
}
const groupIndex = (groups: string[][]): Map<string, number> => {
  const m = new Map<string, number>()
  groups.forEach((g, i) => g.forEach((w) => m.set(w, i)))
  return m
}
const HOMOPHONE_OF = groupIndex(HOMOPHONE_GROUPS)
const MEANING_OF = groupIndex(SAME_MEANING)
/** 两个词读音一样（听音的题里不能同时做选项） */
export function soundsSame(a: string, b: string): boolean {
  const [x, y] = [norm(a), norm(b)]
  if (x === y) return true
  const i = HOMOPHONE_OF.get(x)
  return i !== undefined && i === HOMOPHONE_OF.get(y)
}
/** 两个词意思一样、一个包含另一个（含词组里的词、-ing 形式）、或图上分不清（选意思、看图的题里不能同时做选项） */
export function meaningClash(a: string, b: string): boolean {
  const [x, y] = [norm(a), norm(b)]
  if (x === y || partOf(x, y)) return true
  const i = MEANING_OF.get(x)
  if (i !== undefined && i === MEANING_OF.get(y)) return true
  return !!RELATED[x]?.includes(y) || !!RELATED[y]?.includes(x)
}

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

/** 「cat 猫 🐱」「red panda 小熊猫 🐼」：第一个汉字之前的都是英文 */
export function parseWord(s: string): WordItem {
  const m = /^(.*?)\s+(\S*\p{Script=Han}\S*)(?:\s+(\S+))?$/u.exec(s.trim())
  if (!m || !m[1]) throw new Error(`bad word item: ${s}`)
  return { en: m[1].trim(), zh: m[2]!, ...(m[3] ? { icon: m[3] } : {}) }
}
/** 「cab 🚕」「bad」「yo-yo 🪀」：一个英文词（可带连字符），后面可跟一个图 */
export function parseRead(s: string): ReadItem {
  const m = /^([A-Za-z][A-Za-z'-]*)(?:\s+(\S+))?$/.exec(s.trim())
  if (!m) throw new Error(`bad read item: ${s}`)
  return { en: m[1]!, ...(m[2] ? { icon: m[2] } : {}) }
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
  const w = word.toLowerCase() // 人名、地名首字母大写（China、Philip）
  if (pattern === '-e') return /^[^aeiou]+e$/.test(w)
  const m = /^([a-z])-e$/.exec(pattern)
  return m ? new RegExp(`${m[1]}[^aeiou]e`).test(w) : w.includes(pattern)
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

/** 干扰项用在哪种题：听音的题去掉同音词；选意思 / 看图的题去掉意思相同、包含、图上分不清的词；看图的题只要有图的词 */
interface WrongRule {
  listening?: boolean
  meaning?: boolean
  pictures?: boolean
}
/**
 * 单词的干扰项：先从本课的词里挑（意思不同的），不够从全年级的词池补；第 2、3 档混进一两个别的单元里首字母相同的词（更像）
 */
function wordWrongs(w: WordItem, unit: WordItem[], ctx: Ctx, d: Difficulty, rng: RNG, rule: WrongRule, need = 3): WordItem[] {
  const ok = (x: WordItem): boolean =>
    x.en !== w.en &&
    x.zh !== w.zh &&
    !(rule.listening && soundsSame(x.en, w.en)) &&
    !(rule.meaning && meaningClash(x.en, w.en)) &&
    !(rule.pictures && (!x.icon || x.icon === w.icon))
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
/** 两个词拼写有多像：同一位置上相同的字母数，长度一样、末两个字母一样各加一（拼读的干扰项挑像的） */
function likeness(a: string, b: string): number {
  let n = a.length === b.length ? 1 : 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) n++
  if (a.slice(-2) === b.slice(-2)) n++
  return n
}

// ── 单词（黑体词） ─────────────────────────────────────────────────────

/** 听音选单词：屏幕上不出现这个词；读音一样的词不做干扰项 */
function listenItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `listen-${w.en}`,
    build: (d, rng) =>
      choiceQ(ctx, 'word', d, `listen-${w.en}`, [text('eq.listenWord'), listen(w.en)], enOpt(w.en), wordWrongs(w, words, ctx, d, rng, { listening: true }).map((x) => enOpt(x.en)), rng, 'english'),
  }))
}
/** 看图选单词（图不读，读了等于报答案）：干扰项是别的、能画出来的东西，意思相关或图上分不清的不用 */
function picItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `pic-${w.en}`,
      build: (d, rng) =>
        choiceQ(ctx, 'word', d, `pic-${w.en}`, [text('eq.picWord'), { kind: 'picture', icon: w.icon! }], enOpt(w.en), wordWrongs(w, words, ctx, d, rng, { meaning: true, pictures: true }).map((x) => enOpt(x.en)), rng, 'english'),
    }))
}
/** 看单词选图：选项是 emoji，读英文 */
function wordPicItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `wordpic-${w.en}`,
      build: (d, rng) => {
        const wrongs = uniqBy(wordWrongs(w, words, ctx, d, rng, { meaning: true, pictures: true }, 6), (x) => x.icon!).slice(0, 3)
        return choiceQ(ctx, 'word', d, `wordpic-${w.en}`, [text('eq.wordPic'), en(w.en, 'big')], enOpt(w.icon!, w.en), wrongs.map((x) => enOpt(x.icon!, x.en)), rng, 'emoji')
      },
    }))
}
/** 单词选意思：选项是中文（注音，中文读） */
function meaningItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `meaning-${w.en}`,
    build: (d, rng) =>
      choiceQ(ctx, 'word', d, `meaning-${w.en}`, [text('eq.meaning'), en(w.en, 'big')], { label: ctx.word(w.zh) }, uniqBy(wordWrongs(w, words, ctx, d, rng, { meaning: true }, 6), (x) => x.zh).slice(0, 3).map((x) => ({ label: ctx.word(x.zh) })), rng),
  }))
}
/** 中文选单词 */
function zh2enItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words.map((w) => ({
    key: `zh2en-${w.en}`,
    build: (d, rng) => choiceQ(ctx, 'word', d, `zh2en-${w.en}`, [text('eq.zh2en', { w: ctx.word(w.zh) })], enOpt(w.en), wordWrongs(w, words, ctx, d, rng, { meaning: true }).map((x) => enOpt(x.en)), rng, 'english'),
  }))
}
/** 听音选图 */
function listenPicItems(ctx: Ctx, words: WordItem[]): Item[] {
  return words
    .filter((w) => w.icon)
    .map((w) => ({
      key: `listenpic-${w.en}`,
      build: (d, rng) => {
        const wrongs = uniqBy(wordWrongs(w, words, ctx, d, rng, { listening: true, meaning: true, pictures: true }, 6), (x) => x.icon!).slice(0, 3)
        return choiceQ(ctx, 'word', d, `listenpic-${w.en}`, [text('eq.listenPic'), listen(w.en)], enOpt(w.icon!, w.en), wrongs.map((x) => enOpt(x.icon!, x.en)), rng, 'emoji')
      },
    }))
}
/** 换一个字母拼出来、不能出现在题目里的词（测试用 `rudeWord` 查） */
const RUDE = new Set(['dick', 'cock', 'shit', 'shat', 'shite', 'piss', 'whore', 'fuck', 'hell', 'damn', 'crap', 'arse', 'ass', 'poo', 'poop', 'fart', 'butt', 'chink', 'wank', 'whank', 'clit', 'rape', 'sex', 'suck', 'cunt', 'fag', 'tit', 'slut', 'twat', 'jap', 'bum', 'git', 'sod', 'hos', 'toke', 'bonk'])
/** 换上干扰项拼出来的是不是不雅的词（连带 -s / -es / -ed / -ing：socks 换一个字母是 sucks） */
export const rudeWord = (w: string): boolean => {
  const x = w.toLowerCase()
  return RUDE.has(x) || [/s$/, /es$/, /ed$/, /ing$/].some((end) => end.test(x) && RUDE.has(x.replace(end, '')))
}
/** 音节数（元音组数）：词尾辅音 + e 不发音（cake），辅音 + le 自成音节（apple）；y 在辅音后当元音（sunny、my），词首的 y 是辅音 */
export function syllables(word: string): number {
  let w = word.toLowerCase()
  if (/[^aeiou]e$/.test(w) && !/[^aeiou]le$/.test(w)) w = w.slice(0, -1)
  return w.match(/[aeiou]+|(?<=[^aeiou])y/g)?.length ?? 0
}
/**
 * 补全字母：听单词，看「c _ t」选缺的字母（第一个不在开头的元音；没有就中间那个字母）。只出听着就能定下来的：
 * 一个音节、不以元音开头的词（多音节词里不重读的元音读成 /ə/，elephant 写成 elaphant 也一样）；缺的元音不和别的元音、y、w
 * 连写（rain / rein、shoes / shues），后面不是 r（shirt / shert / shurt 读音一样），前面不是 w / wh（what / whut）；
 * 元音缺了从元音里挑干扰项，换上去拼出读音一样的词（son / sun；n、m、v 前面的 o 和 u）或不雅的词的不用
 */
function spellingItems(ctx: Ctx, words: string[]): Item[] {
  const out: Item[] = []
  for (const word of uniqBy(
    words.filter((w) => /^[a-z]{3,}$/.test(w) && !VOWELS.has(w[0]!) && syllables(w) === 1),
    (w) => w,
  )) {
    const letters = word.split('')
    let at = letters.findIndex((c, i) => i > 0 && VOWELS.has(c))
    if (at < 0) at = Math.floor(letters.length / 2)
    const missing = letters[at]!
    const next = letters[at + 1] ?? ''
    if (VOWELS.has(missing)) {
      if (/[aeiouyw]/.test(next) || VOWELS.has(letters[at - 1]!) || next === 'r' || /w$|wh$/.test(word.slice(0, at))) continue
    }
    const swapped = (x: string): string => letters.map((c, i) => (i === at ? x : c)).join('')
    const sameSound = (x: string): boolean => soundsSame(swapped(x), word) || (/[nmv]/.test(next) && ((missing === 'u' && x === 'o') || (missing === 'o' && x === 'u')))
    const pool = (VOWELS.has(missing) ? [...VOWELS] : ALPHABET.map((x) => x.toLowerCase()).filter((x) => !VOWELS.has(x))).filter((x) => x !== missing && !sameSound(x) && !rudeWord(swapped(x)))
    if (pool.length < 2) continue
    const shown = letters.map((c, i) => (i === at ? '_' : c)).join('')
    out.push({
      key: `spelling-${word}`,
      build: (d: Difficulty, rng: RNG) => {
        const wrongs = rng.shuffle(pool).slice(0, 3)
        return choiceQ(ctx, 'word', d, `spelling-${word}`, [text('eq.spelling'), listen(word), en(shown, 'big', { say: '' })], letterOpt(missing), wrongs.map(letterOpt), rng, 'english')
      },
    })
  }
  return out
}

/**
 * 四上 Let's spell 教的辅音字母组合：补全字母组合的题的干扰项从这里挑——都是两个字母、彼此读音不同。
 * 四下的 ar / er / ir / ur / or / air / ear、五上的 ai / ay、ee / ea、oa / ow……不出这种题：er、ir、ur（还有 w 后面的 or）、
 * ai 和 ay 这些读音一样，换哪个都「听着对」
 */
export const DIGRAPHS = ['ch', 'sh', 'th', 'ph', 'wh', 'ck']
/** 能出补全字母组合的：上面的辅音字母组合，加上五下（旧版）拼读课的辅音连缀 cl / pl、br / gr 与词尾的 ng / nk（干扰项另加本课的这几个） */
export const LETTER_GROUPS = [...DIGRAPHS, 'cl', 'pl', 'br', 'gr', 'ng', 'nk']
/** 字母组合的选项：显示「ch」，读字母名「C H」 */
const groupOpt = (g: string): Opt => enOpt(g, g.toUpperCase().split('').join(' '))
/**
 * 补全字母组合（四上 Let's spell 的「Look, listen and write」）：听单词，看「__air」选缺的字母组合，答完填上。
 * 只出拼读组里含这个组合的小写词（人名、地名不出；tch 里的 ch 不出：换成 sh 读起来差不多）；换上去拼出读音一样的词的干扰项不用
 */
function digraphItems(ctx: Ctx, spells: SpellItem[]): Item[] {
  // 干扰项：四上的辅音字母组合 + 本课教的（五下 cl / pl 一课里互为干扰）
  const groups = uniqBy([...DIGRAPHS, ...spells.map((s) => s.pattern).filter((g) => LETTER_GROUPS.includes(g))], (g) => g)
  return spells
    .filter((s) => LETTER_GROUPS.includes(s.pattern))
    .flatMap((s) =>
      uniqBy(s.words, (x) => x)
        .filter((word) => /^[a-z]+$/.test(word) && word.includes(s.pattern) && !(s.pattern === 'ch' && word.includes('tch')))
        .map((word) => {
          const at = word.indexOf(s.pattern)
          const swapped = (g: string): string => word.slice(0, at) + g + word.slice(at + s.pattern.length)
          const wrongs = groups.filter((g) => g !== s.pattern && !soundsSame(swapped(g), word) && !rudeWord(swapped(g)))
          return {
            key: `digraph-${word}`,
            build: (d: Difficulty, rng: RNG) =>
              choiceQ(ctx, 'letter', d, `digraph-${word}`, [text('eq.digraph'), listen(word), en(word, 'big', { say: '', blank: [at, s.pattern.length] })], groupOpt(s.pattern), rng.shuffle(wrongs).slice(0, 3).map(groupOpt), rng, 'english'),
          }
        }),
    )
}

// ── 字母与发音、拼读（拼读词只考会不会读，不考意思） ─────────────────────

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
/** 字母表顺序：这个字母（大字卡，用英文读）后面 / 前面是哪个；干扰项挑它附近的字母 */
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
          return choiceQ(ctx, 'letter', d, `${dir}-${L}`, [text(`eq.${dir}`), en(L, 'big', { say: L })], letterOpt(answer), wrongs.map(letterOpt), rng, 'english')
        },
      }
    })
}
/** 听单词选首字母（三上 Letters and sounds 的「Listen and circle the first sound」）：拼读词有图的，图也画出来作提示 */
function soundItems(ctx: Ctx, sounds: SoundItem[], letters: string[], icons: Map<string, string>): Item[] {
  const unitLetters = letters.length ? letters : sounds.map((s) => s.letter.toUpperCase())
  return sounds.flatMap((s) =>
    s.words
      .filter((w) => w.toLowerCase().startsWith(s.letter))
      .map((w) => ({
        key: `sound-${w}`,
        build: (d: Difficulty, rng: RNG) => {
          const icon = icons.get(w)
          const stem: StemPart[] = [text('eq.firstSound'), listen(w), ...(icon ? [{ kind: 'picture', icon } as StemPart] : [])]
          return choiceQ(ctx, 'letter', d, `sound-${w}`, stem, letterOpt(s.letter), letterWrongs(s.letter.toUpperCase(), unitLetters, ctx, rng).map((x) => letterOpt(x.toLowerCase())), rng, 'english')
        },
      })),
  )
}
/**
 * 听音选拼读词（字母课的例词与「Can you read the words?」）：只考会不会读、不考意思；
 * 第 1 档干扰项随便挑，第 2、3 档挑拼写像的（cab / cat / can）；读音一样的不做干扰项；人名不出
 */
function decodeItems(ctx: Ctx, read: ReadItem[]): Item[] {
  const words = uniqBy(
    read.filter((r) => /^[a-z][a-z'-]*$/.test(r.en)),
    (r) => r.en,
  )
  if (words.length < 2) return []
  return words.map((r) => ({
    key: `decode-${r.en}`,
    build: (d, rng) => {
      const others = rng.shuffle(words.filter((x) => !soundsSame(x.en, r.en)))
      const ranked = d === 1 ? others : [...others].sort((a, b) => likeness(b.en, r.en) - likeness(a.en, r.en))
      return choiceQ(ctx, 'letter', d, `decode-${r.en}`, [text('eq.listenWord'), listen(r.en)], enOpt(r.en), ranked.slice(0, 3).map((x) => enOpt(x.en)), rng, 'english')
    },
  }))
}
/** 拼读（三下 Let's spell）：听一个词（含这个字母组合的或对比词），在同一组的词里选——课本的「Read, listen and circle」 */
function spellItems(ctx: Ctx, spells: SpellItem[]): Item[] {
  const all = uniqBy(
    spells.flatMap((s) => [...s.words, ...s.contrast]),
    (x) => x,
  )
  return spells.flatMap((s) =>
    uniqBy([...s.words, ...s.contrast], (x) => x).map((w) => ({
      key: `spell-${w}`,
      build: (d: Difficulty, rng: RNG) => {
        const group = [...s.words, ...s.contrast].filter((x) => x !== w)
        const wrongs = uniqBy([...rng.shuffle(group), ...rng.shuffle(all)], (x) => x).filter((x) => x !== w && !soundsSame(x, w))
        return choiceQ(ctx, 'letter', d, `spell-${w}`, [text('eq.spellHear'), listen(w)], enOpt(w), wrongs.slice(0, 3).map((x) => enOpt(x)), rng, 'english')
      },
    })),
  )
}

// ── 对话与句子 ──────────────────────────────────────────────────────────

function talkItems(ctx: Ctx, items: TalkItem[]): Item[] {
  return items.map((it) => ({
    key: `talk-${it.prompt}`,
    build: (d, rng) => choiceQ(ctx, 'talk', d, `talk-${it.prompt}`, [text('eq.reply'), en(it.prompt, 'line')], enOpt(it.answer), rng.shuffle(it.wrongs).map((x) => enOpt(x)), rng, 'english'),
  }))
}
/** 句子去掉大小写和标点，前后加空格（按整词比较） */
const sentKey = (s: string): string => ` ${s.toLowerCase().replace(/[^a-z0-9']+/g, ' ').trim()} `
/** 一句是另一句的一部分（「Let's clear the table.」和「Let's clear the table. Can you …」、「Yes. Farm animals …」）：听到长的，短的也像对的 */
export function sentenceOverlap(a: string, b: string): boolean {
  const [x, y] = [sentKey(a), sentKey(b)]
  return x.includes(y) || y.includes(x)
}
/** 听句子选句子：本课的对话句（问和答）与填空的整句都算；一句包含另一句的不同时做选项 */
function listenSentItems(ctx: Ctx, sentences: string[]): Item[] {
  const all = uniqBy(sentences, (x) => x)
  if (all.length < 2) return []
  return all.map((s) => ({
    key: `listensent-${s}`,
    build: (d, rng) =>
      choiceQ(
        ctx,
        'talk',
        d,
        `listensent-${s}`,
        [text('eq.listenSentence'), listen(s)],
        enOpt(s),
        rng
          .shuffle(all.filter((x) => x !== s && !sentenceOverlap(x, s)))
          .slice(0, 3)
          .map((x) => enOpt(x)),
        rng,
        'english',
      ),
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
 * 英文句子配中文选项就是「这句话是什么意思」（前面加一句要求）。中文问题配中文答案的没考到英语（E3），不许写
 */
function askItems(ctx: Ctx, items: AskItem[]): Item[] {
  return items.map((it) => {
    const zhOptions = it.number === undefined && [it.answer, ...it.wrongs].every((s) => HAN.test(s))
    if (HAN.test(it.q) && (zhOptions || it.number !== undefined)) throw new Error(`ask item has no English: ${it.q}`)
    return {
      key: `ask-${it.q}`,
      build: (d: Difficulty, rng: RNG) => {
        const stem: StemPart[] = HAN.test(it.q) ? [{ kind: 'text', text: ctx.word(it.q) }] : zhOptions ? [text('eq.sentMeaning'), en(it.q, 'line')] : [en(it.q, 'line')]
        if (it.number !== undefined) {
          return numberQuestion({ kpId: ctx.kp, type: 'talk', difficulty: d, sig: `ask-${it.q}`, stem, value: it.number, rng, min: 0, max: Math.max(10, it.number + 5) })
        }
        const opt = (s: string): Opt => (HAN.test(s) ? { label: ctx.word(s) } : enOpt(s))
        const style: ChoiceStyle | undefined = [it.answer, ...it.wrongs].every((s) => !HAN.test(s)) ? 'english' : undefined
        return choiceQ(ctx, 'talk', d, `ask-${it.q}`, stem, opt(it.answer), rng.shuffle(it.wrongs).map(opt), rng, style)
      },
    }
  })
}

// ── 数字（数词） ────────────────────────────────────────────────────────

const DEFAULT_ICONS = ['🍎', '🍌', '⭐', '🎈', '🐟', '📚']
/** 数的英文干扰项：本课的数词里挑离它近的（数错一两个最常见），不够从一到二十里补 */
function numberWrongs(n: number, numbers: [string, number][], rng: RNG): string[] {
  const local = rng.shuffle(numbers.filter(([, x]) => x !== n)).sort((a, b) => Math.abs(a[1] - n) - Math.abs(b[1] - n))
  const more = Object.entries(NUM_WORDS)
    .filter(([, x]) => x !== n && Math.abs(x - n) <= 3)
    .sort((a, b) => Math.abs(a[1] - n) - Math.abs(b[1] - n))
  return uniqBy([...local, ...more], ([w]) => w)
    .slice(0, 3)
    .map(([w]) => w)
}
/** 数一数，选出对应的英语数词（只数数、按数字的题考不到英语，E3） */
function countItems(ctx: Ctx, numbers: [string, number][], icons: string[]): Item[] {
  const pool = icons.length ? icons : DEFAULT_ICONS
  return numbers.map(([w, n]) => ({
    key: `count-${n}`,
    build: (d, rng) =>
      choiceQ(
        ctx,
        'talk',
        d,
        `count-${w}`,
        [text('eq.howMany'), { kind: 'objects', icon: rng.pick(pool), count: n }],
        enOpt(w),
        numberWrongs(n, numbers, rng).map((x) => enOpt(x)),
        rng,
        'english',
      ),
  }))
}
/** 数词 → 数字键盘（读英文的数词，按出数字） */
function numWordItems(ctx: Ctx, numbers: [string, number][]): Item[] {
  return numbers.map(([w, n]) => ({
    key: `numword-${w}`,
    build: (d, rng) => numberQuestion({ kpId: ctx.kp, type: 'talk', difficulty: d, sig: `numword-${w}`, stem: [text('eq.numWord'), en(w, 'big')], value: n, rng, min: 0, max: 20, input: 'numpad' }),
  }))
}
/** 数字 → 数词（选项） */
function num2WordItems(ctx: Ctx, numbers: [string, number][]): Item[] {
  return numbers.map(([w, n]) => ({
    key: `num2word-${n}`,
    build: (d, rng) => choiceQ(ctx, 'talk', d, `num2word-${w}`, [text('eq.whichNum', { n })], enOpt(w), numberWrongs(n, numbers, rng).map((x) => enOpt(x)), rng, 'english'),
  }))
}

// ── 装配 ────────────────────────────────────────────────────────────────

/** 一个知识点的全部单词（黑体词） */
export const unitWords = (spec: UnitSpec): WordItem[] => (spec.words ?? []).map(parseWord)
/** 一个知识点的全部拼读词：read 里的，加上拼读课 spell 里的词与对比词 */
export function unitReads(spec: UnitSpec): ReadItem[] {
  const fromSpell = (spec.spell ?? [])
    .map(parseSpell)
    .flatMap((s) => [...s.words, ...s.contrast])
    .map((en) => ({ en }))
  return uniqBy([...(spec.read ?? []).map(parseRead), ...fromSpell], (r) => r.en)
}

/** 一个知识点的材料 → 各模板的条目 */
export function unitItems(spec: UnitSpec, ctx: Ctx): Record<string, Item[]> {
  const words = unitWords(spec)
  const reads = unitReads(spec)
  const letters = parseLetters(spec.letters)
  const sounds = (spec.sounds ?? []).map(parseSound)
  const spells = (spec.spell ?? []).map(parseSpell)
  const talks = (spec.talk ?? []).map(parseTalk)
  const clozes = (spec.cloze ?? []).map(parseCloze)
  const asks = (spec.ask ?? []).map(parseAsk)
  const numbers = parseNumbers(spec.numbers)
  const icons = new Map<string, string>()
  for (const r of reads) if (r.icon) icons.set(r.en, r.icon)
  const sentences = [...talks.flatMap((t) => [t.prompt, t.answer]), ...clozes.map((c) => c.text)]
  return {
    listen: listenItems(ctx, words),
    pic: picItems(ctx, words),
    wordpic: wordPicItems(ctx, words),
    meaning: meaningItems(ctx, words),
    zh2en: zh2enItems(ctx, words),
    listenpic: listenPicItems(ctx, words),
    spelling: spellingItems(ctx, [...words.map((w) => w.en), ...reads.map((r) => r.en)]),
    digraph: digraphItems(ctx, spells),
    lower: lowerItems(ctx, letters),
    upper: upperItems(ctx, letters),
    listenletter: listenLetterItems(ctx, letters),
    after: orderItems(ctx, letters, 'after'),
    before: orderItems(ctx, letters, 'before'),
    sound: soundItems(ctx, sounds, letters, icons),
    decode: decodeItems(ctx, reads),
    spell: spellItems(ctx, spells),
    talk: talkItems(ctx, talks),
    listensent: listenSentItems(ctx, sentences),
    cloze: clozeItems(ctx, clozes),
    ask: askItems(ctx, asks),
    count: countItems(
      ctx,
      numbers,
      words.filter((w) => w.icon).map((w) => w.icon!),
    ),
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
  const out: string[] = [...unitWords(spec).map((w) => w.en), ...unitReads(spec).map((r) => r.en)]
  for (const s of (spec.sounds ?? []).map(parseSound)) out.push(...s.words)
  for (const t of (spec.talk ?? []).map(parseTalk)) out.push(t.prompt, t.answer, ...t.wrongs)
  for (const c of (spec.cloze ?? []).map(parseCloze)) out.push(c.text, c.answer, ...c.wrongs)
  for (const a of (spec.ask ?? []).map(parseAsk)) for (const s of [a.q, a.answer, ...a.wrongs]) if (!HAN.test(s) && !/^\d+$/.test(s)) out.push(s)
  return out
}
