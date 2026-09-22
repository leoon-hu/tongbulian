/**
 * 朗读文本：把一句题目切成可以逐条播放的「片段」——数字、一段连续的汉字 / 外文短语、emoji 的名字、
 * 独立的运算符（读作「加」「等于」…）。每个片段对应一条预合成的音频（见 engine/voice），
 * 顺序播完就是整句；标点本身不读，逗号 / 句号这类子句边界变成一个停顿标记 PAUSE，播放时停一小会儿。
 *
 * 片段来自渲染后的文字而不是词条模板，这样「从{from}数排第几个」会连成一整句「从左数排第几个」，
 * 比「从 / 左 / 数排第几个」三段拼起来自然得多。同理，**短语里夹着的 0–100 的数也并进短语**：
 * 「有 14 个」是一条「有14个」，而不是「有 / 14 / 个」三条各自带着「一句话说完」语调的碎片
 * （2026-09-22 用户说「断句非常严重，听起来很不自然」后改的，F14）。合并后的片段没有音频时，
 * 播放端会用 tokenize(…, merge = false) 拆回原来的小片段兜底。
 */
import type { Lang, LStr, Question } from '@/types/models'
import { hasEntry, translate } from './i18n'
import { answerLabel } from './answer'

// 符号组放在 emoji 组前面：⬜ 也算 Extended_Pictographic，但它是算式里的空格子。
// 算式末尾的「= ?」合成一个片段（读「等于几」），单独一个「几」读起来生硬还容易读错声调。
// 小括号单独一组：它紧挨着数字，但必须读出来（「括号 3 加 4 括号 乘 5」），不走「独立成项才读」的规则。
const TOKEN =
  /(¥\d+(?:\.\d)?)|(\d+(?:\.\d+)?)|(\p{Script=Han}+)|([A-Za-z][A-Za-z'’-]*(?:[ \u00a0][A-Za-z][A-Za-z'’-]*)*)|(=\s*\?|[+\-=?><⬜×÷])|([()（）])|(\p{Extended_Pictographic}\uFE0F?)/gu

/** 符号只有独立成项（两边不挨着字母 / 数字 / 汉字 / emoji）才读：「9 + 5」的 + 读，「ten-frame」的 -、「🐰?」的 ? 不读 */
const WORDISH_BEFORE = /[\p{L}\p{N}\p{Extended_Pictographic}\uFE0F]$/u
const WORDISH_AFTER = /^[\p{L}\p{N}\p{Extended_Pictographic}]/u

/**
 * 中文量词（一份表两处用）：数字 2 在它前面读「两」；数字后面的短语只把它留在前一条（`ZH_MEASURE_HEAD`）。
 * 单字量词后面跟着特定字时不是量词——「分成 / 分给 / 只有 / 组成 / 个数 / 排成」——用负向前瞻排除。
 */
const ZH_MEASURE = '个(?:十|百|千|万|一)?(?!数)|厘米|米|元|角|分(?![成给别针])|时|排(?![成队])|份|倍|盒|袋|辆|题|只(?![有剩])|张|条|本|朵|棵|根|颗|支|块|人|天|层|组(?!成)|双|瓶|杯|碗|盘|箱|筐|篮|桶|堆'
/** 中文里数字 2 后面紧跟量词时读「两」：2 个十 → 两个十、2 元 → 两元、2 排 → 两排；序数除外：第 2 个 → 第二个 */
const LIANG_BEFORE = new RegExp(`^(?:${ZH_MEASURE})`)
const ORDINAL_BEFORE = /第$/

/** 英文 emoji 名字的复数：数字（不是 1）/ hundred / more / fewer / many 后面、「N rows of」后面读复数；不变的 fish / books / pants… */
const EN_INVARIANT = new Set(['fish', 'grapes', 'books', 'chopsticks', 'pants', 'bread', 'sheep'])
function pluralEn(name: string): string {
  const words = name.split(' ')
  const last = words[words.length - 1]!
  if (EN_INVARIANT.has(last)) return name
  let p: string
  if (last === 'child') p = 'children'
  else if (/[^aeiou]y$/.test(last)) p = last.slice(0, -1) + 'ies'
  else if (/(s|x|z|ch|sh)$/.test(last)) p = last + 'es'
  else p = last + 's'
  return [...words.slice(0, -1), p].join(' ')
}
const EN_PLURAL_AFTER = new Set(['hundred', 'thousand', 'more', 'fewer', 'less', 'many'])

/** 停顿标记：不是音频片段，播放时停一小会儿（子句之间）；不进语料 */
export const PAUSE = '|'
/** 两个片段之间的文字里有这些就算子句边界（顿号「、」不算：「填 >、< 或 =」「上北下南、左西右东」一口气读完） */
const CLAUSE_BREAK = /[，。！？；：…—,.!?;:]/

interface Raw {
  kind: 'number' | 'phrase' | 'emoji' | 'symbol' | 'pause'
  text: string
  /** 大数拆出来的一段（如 302 的「2」），不再套「2 读两」的规则 */
  part?: boolean
  /** 英文 emoji 名字已按上下文改成了复数（「than」后面的跟着它前面那个 emoji 走） */
  plural?: boolean
  /** 前面紧挨着顿号「、」：并进同一条时把顿号留在文本里，TTS 自己停一小下（「上北下南、左西右东」） */
  dun?: boolean
}

const ZH_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 数字的朗读片段。0–100（与小数）是一整个片段；更大的数按位拆成几段，不然万以内的每个数都要一条音频。
 * 中文按课本读法：3005 → 三千 / 零 / 5，315 → 三百 / 一十 / 5，1200 → 一千 / 二百，10000 → 一万；
 * 英文：3450 → 3 / thousand / 4 / hundred / 50。
 */
export function numberPieces(num: string, lang: Lang): string[] {
  const n = Number(num)
  if (!Number.isInteger(n) || n <= 100 || n > 99999) return [num]
  if (lang === 'zh') {
    if (n === 10000) return ['一万']
    const out: string[] = []
    const wan = Math.floor(n / 10000)
    const qian = Math.floor((n % 10000) / 1000)
    const bai = Math.floor((n % 1000) / 100)
    const tail = n % 100
    if (wan) out.push(`${ZH_DIGITS[wan]}万`)
    if (qian) out.push(`${ZH_DIGITS[qian]}千`)
    else if (wan && (bai || tail)) out.push('零')
    if (bai) out.push(`${ZH_DIGITS[bai]}百`)
    else if ((qian || wan) && tail) out.push('零')
    if (tail) {
      if (tail < 10) {
        if (bai) out.push('零')
        out.push(String(tail))
      } else if (tail < 20) {
        out.push('一十')
        if (tail % 10) out.push(String(tail % 10))
      } else out.push(String(tail))
    }
    return out
  }
  const out: string[] = []
  const thousands = Math.floor(n / 1000)
  const hundreds = Math.floor((n % 1000) / 100)
  const tail = n % 100
  if (thousands) out.push(String(thousands), 'thousand')
  if (hundreds) out.push(String(hundreds), 'hundred')
  if (tail) out.push(String(tail))
  return out
}

function rawTokens(text: string, lang: Lang): Raw[] {
  const out: Raw[] = []
  let last = 0
  let pending = false
  let dun = false
  // 上一个片段到这个片段之间的文字里有逗号 / 句号：记一个停顿（开头的、连着的不记；被跳过的片段照样算过了边界；
  // 挨着运算符读法的逗号是列举「填 >, <, or =」，不停）
  const push = (r: Raw): void => {
    const prev = out[out.length - 1]
    if (pending && prev && prev.kind !== 'pause' && prev.kind !== 'symbol' && r.kind !== 'symbol') out.push({ kind: 'pause', text: PAUSE })
    pending = false
    if (dun) r.dun = true
    dun = false
    out.push(r)
  }
  for (const m of text.matchAll(TOKEN)) {
    const [whole, money, num, han, latin, sym, paren, emoji] = m
    const gap = text.slice(last, m.index)
    const timeColon = /^[:：]$/.test(gap) && /\d$/.test(text.slice(0, last)) && /^\d/.test(whole) // 3:05 里的冒号
    last = m.index + whole.length
    if (!timeColon && CLAUSE_BREAK.test(gap)) pending = true
    dun = lang === 'zh' && gap.includes('、')
    if (money) {
      // 英文金额 ¥1.5 → 1 yuan 5 jiao（中文金额在文案里已经是「1元5角」）
      const [y, j] = money.slice(1).split('.')
      if (y && y !== '0') {
        push({ kind: 'number', text: y })
        push({ kind: 'phrase', text: 'yuan' })
      }
      if (j && j !== '0') {
        push({ kind: 'number', text: j })
        push({ kind: 'phrase', text: 'jiao' })
      }
    } else if (num) {
      if (timeColon && lang === 'en' && /^0\d$/.test(num)) {
        // 英文时刻 1:02 读「1 oh 2」
        push({ kind: 'phrase', text: 'oh' })
        push({ kind: 'number', text: num.slice(1) })
        continue
      }
      const pieces = numberPieces(num, lang)
      // 拆读的大数：每段都是一个槽（「加三百」「四百的百位上是几」能并）；英文的 thousand / hundred 是跟在数后面的词
      for (const piece of pieces) push(/^[a-z]+$/i.test(piece) ? { kind: 'phrase', text: piece } : { kind: 'number', text: piece, part: pieces.length > 1 })
    } else if (han) push({ kind: 'phrase', text: han })
    else if (latin) push({ kind: 'phrase', text: latin.trim() })
    else if (sym) {
      if (WORDISH_BEFORE.test(text.slice(0, m.index)) || WORDISH_AFTER.test(text.slice(m.index + whole.length))) continue
      const key = `sym.${sym.replace(/\s+/g, '')}`
      if (hasEntry(key, lang)) push({ kind: 'symbol', text: translate({ k: key }, lang) })
    } else if (paren) {
      const key = `sym.${/[(（]/.test(paren) ? '(' : ')'}`
      if (hasEntry(key, lang)) push({ kind: 'symbol', text: translate({ k: key }, lang) })
    } else if (emoji) {
      const key = hasEntry(`emoji.${emoji}`, lang) ? `emoji.${emoji}` : `emoji.${emoji.replace(/\uFE0F$/, '')}`
      if (hasEntry(key, lang)) push({ kind: 'emoji', text: translate({ k: key }, lang) })
    }
  }
  // 末尾的停顿没意义
  while (out.length && out[out.length - 1]!.kind === 'pause') out.pop()
  return out
}

/** 并进短语的数最大到几：每多一个可能的数就多一条音频，这里定音频包的大小 */
export const MERGE_MAX = 100
/**
 * 「槽」= 短语里可以并进去、但每条片段只能有一个的东西：0–MERGE_MAX 的整数（含读成「两」的 2）与 emoji 的名字。
 * 大数拆出来的段、小数不并。emoji 名字也并（2026-09-22 用户说「比」听不清：「🐶 比 🐷 少 8 个」里的「比」
 * 夹在两个 emoji 之间只能单独一条，孤立的第三声字读成完整的降升调，又长又重；并成「比小猪」才是句子里的读法）。
 */
function isSlot(r: Raw): boolean {
  if (r.kind === 'emoji') return true
  if (r.kind !== 'number') return false
  // 拆读的大数（三百 / 零 / 一十 / 0–99 的尾数、英文的 3 / 50）：每段词汇量很小，都能并；「两」也是
  if (r.part || !/^\d+(\.\d+)?$/.test(r.text)) return true
  return /^\d+$/.test(r.text) && Number(r.text) <= MERGE_MAX
}

/**
 * 数字后面的短语，留在前一条的「量词头」：「1个十和」留「1个十」、「9元买了」留「9元」、「比1多」什么都不留（「多」是动词）。
 * 中文按量词表取最长的头；英文留到第一个虚词 / 动词为止（「tens and」留 tens、「children each have」留 children、「into」不留）。
 */
const ZH_MEASURE_HEAD = LIANG_BEFORE
const EN_FUNCTION_WORDS = ['and', 'or', 'to', 'than', 'of', 'into', 'from', 'at', 'by', 'with', 'for', 'in', 'on', 'per', 'as']
const EN_FORWARD_WORDS = new Set([...EN_FUNCTION_WORDS, 'oh', 'each', 'gives', 'give', 'pay', 'pays', 'costs', 'cost', 'have', 'has', 'is', 'are', 'make', 'makes', 'hold', 'holds', 'remainder'])
const EN_FUNCTION_SET = new Set(EN_FUNCTION_WORDS)
function splitAfterNumber(text: string, lang: Lang, forward: Set<string> = EN_FORWARD_WORDS): [string, string] {
  if (lang === 'zh') {
    const m = ZH_MEASURE_HEAD.exec(text)
    return m ? [m[0], text.slice(m[0].length)] : ['', text]
  }
  const words = text.split(' ')
  const cut = words.findIndex((w) => forward.has(w.toLowerCase()))
  if (cut < 0) return [text, '']
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}
/** emoji 后面的短语通常是动词 / 介词（贴向后一个槽）；以「的」开头或结尾的是名词短语的一部分（「的个数是」「个数的」），留在前一条 */
const ZH_STICKS_TO_NOUN = /^的|的$/

/** 并成一条的片段 → 它的小片段（给缺音频时拆回去用）；tokenize 时记下来。键 = 语言 + 文本 */
const PIECES = new Map<string, string[]>()
const pieceKey = (text: string, lang: Lang): string => `${lang}\u0001${text}`

/**
 * 一条并成的片段拆回小片段（「有14个」→ 有 / 14 / 个，「比小猪」→ 比 / 小猪）。没并过的原样返回一条。
 * emoji 名字并进去后从文本上认不出来，所以靠 tokenize 时记下的表；只含数字的还能按老切法再切一遍兜底。
 */
export function piecesOf(token: string, lang: Lang): string[] {
  return PIECES.get(pieceKey(token, lang)) ?? tokenize(token, lang, false)
}

/**
 * 把一段（已按语言解析好的）文字切成朗读片段。
 * merge（默认开）：连续的「短语 / 运算符读法 / 槽（0–MERGE_MAX 的数、emoji 名字）」并成一条（「有14个」「比小猪」「小狗有几个」
 * 「加5等于几」，英文用空格连「has 14 apples」），每条是一句自然的话；大数、停顿是边界。**一条里最多一个槽**，
 * 第二个槽来了要切开——几个槽的组合会让音频包按乘法膨胀（「#时#分」一种模板就 277 条），一条一个槽每种模板最多百来条。
 * 切在哪里看前一个槽后面跟的是什么：**运算符和它后面的一律贴向后一个槽**（「9 · 加5等于几」「几乘4 · 等于24」——
 * 孤立的「减」「乘」和孤立的「比」一样读得又长又重）；**emoji 后面的短语贴向后一个槽**（是动词 / 介词：
 * 「小狗 · 比小猪 · 少8个」「小猪 · 有14个」）；**数字后面的短语贴向前一个槽**（是量词：「有14个 · 苹果」「3时 · 5分」）。
 * merge = false 就是老的切法（每个槽、每个运算符单独一条），给合并片段缺音频时拆回去用。
 */
export function tokenize(text: string, lang: Lang, merge = true): string[] {
  const raws = rawTokens(text, lang)
  const mapped: Raw[] = []
  for (let i = 0; i < raws.length; i++) {
    const r = raws[i]!
    const prev = raws[i - 1]
    const next = raws[i + 1]
    // 英文 emoji 名字按前面的词判单复数：「3 apples」「4 rows of apples」「How many more apples than bananas」；「1 apple」「A apple」「to the left of piggy」不变
    if (lang === 'en' && r.kind === 'emoji' && prev) {
      const lastWord = prev.kind === 'phrase' ? prev.text.split(' ').pop()!.toLowerCase() : ''
      const before = raws[i - 2]
      const plural =
        (prev.kind === 'number' && prev.text !== '1') ||
        EN_PLURAL_AFTER.has(lastWord) ||
        (lastWord === 'of' && before?.kind === 'number') ||
        (lastWord === 'than' && !!mapped[i - 2]?.plural)
      // 「A apple」→「An apple」
      if (prev.kind === 'phrase' && /(^|\s)[Aa]$/.test(prev.text) && /^[aeiou]/i.test(r.text)) mapped[i - 1] = { ...prev, text: prev.text.replace(/[Aa]$/, (a) => (a === 'A' ? 'An' : 'an')) }
      mapped.push(plural ? { ...r, text: pluralEn(r.text), plural: true } : r)
      continue
    }
    if (
      lang === 'zh' &&
      r.kind === 'number' &&
      !r.part &&
      r.text === '2' &&
      next?.kind === 'phrase' &&
      LIANG_BEFORE.test(next.text) &&
      !(prev?.kind === 'phrase' && ORDINAL_BEFORE.test(prev.text))
    ) {
      mapped.push({ ...r, text: '两' })
      continue
    }
    mapped.push(r)
  }
  if (!merge) return mapped.map((r) => r.text)
  const out: string[] = []
  let run: Raw[] = []
  const flush = (): void => {
    if (!run.length) return
    const text = lang === 'zh' ? run.map((r, i) => (i && r.dun ? '、' : '') + r.text).join('') : run.map((r) => r.text).join(' ')
    if (run.length > 1) PIECES.set(pieceKey(text, lang), run.map((r) => r.text))
    out.push(text)
    run = []
  }
  for (const r of mapped) {
    if (r.kind === 'phrase' || r.kind === 'symbol' || isSlot(r)) {
      const at = run.findLastIndex(isSlot)
      // 例外：中文两个 emoji 之间恰好一个「比」——「小狗比狐狸 · 少6个」——「比」落在句中才是它在句子里的读法（用户 2026-09-22 点名）；
      // 动物名字池只有 6 种、最多 30 个有序对，有界，不算乘法膨胀
      const twoNames = lang === 'zh' && r.kind === 'emoji' && at >= 0 && run[at]!.kind === 'emoji' && at === run.length - 2 && run[run.length - 1]!.kind === 'phrase' && run[run.length - 1]!.text === '比' && !run.slice(0, at).some(isSlot)
      if (isSlot(r) && at >= 0 && !twoNames) {
        // 第二个槽：前一个槽后面的东西怎么分——
        //   emoji 后面：整个跟着新槽走（动词 / 介词），除非那条短语以「的」开头或结尾（名词短语，留下）；
        //   数字后面：紧跟的那条短语只留量词头（「1个十」「9元」），余下的和后面的运算符一律跟着新槽走
        const after = run.slice(at + 1)
        // 槽后面连续的短语先合成一条再决定（英文拆读的「hundred」和「centimeters and」是两段：「4 hundred centimeters · and 4 meters」）
        let n = 0
        while (n < after.length && after[n]!.kind === 'phrase') n++
        const phrase = after.slice(0, n).map((x) => x.text).join(lang === 'zh' ? '' : ' ')
        const rest = after.slice(n)
        let keep: Raw[] = []
        let tail: Raw[] = after
        const split = (head: string, more: string): void => {
          if (head) keep = [{ kind: 'phrase', text: head }]
          tail = more ? [{ kind: 'phrase', text: more }, ...rest] : rest
        }
        if (run[at]!.kind === 'emoji') {
          if (n && lang === 'zh' && ZH_STICKS_TO_NOUN.test(phrase)) split(phrase, '')
          // 英文两个 emoji 之间的短语在纯虚词处切（「does fox have · than puppy」）；后面是数字则整个跟着数字走（「fox · has 16」）
          else if (n && lang === 'en' && r.kind === 'emoji') split(...splitAfterNumber(phrase, lang, EN_FUNCTION_SET))
        } else if (n) split(...splitAfterNumber(phrase, lang))
        run = [...run.slice(0, at + 1), ...keep]
        flush()
        run = tail
      }
      run.push(r)
    } else {
      flush()
      out.push(r.text)
    }
  }
  flush()
  return out
}

/** 几段片段接成一句：段与段之间加一个停顿（空段、已经以停顿结尾的不重复加） */
export function joinSpeech(parts: string[][]): string[] {
  const out: string[] = []
  for (const p of parts) {
    if (!p.length) continue
    if (out.length && out[out.length - 1] !== PAUSE) out.push(PAUSE)
    out.push(...p)
  }
  return out
}

/** 一条可本地化文本的朗读片段。 */
export function phraseSpeech(l: LStr, lang: Lang): string[] {
  return tokenize(translate(l, lang), lang)
}

/** 题干的朗读片段：文字与算式按顺序读（之间停顿一下），教具（十格阵、实物、钟面…）不读。 */
export function questionSpeech(q: Question, lang: Lang): string[] {
  const parts: string[][] = []
  for (const part of q.stem) {
    if (part.kind === 'text') parts.push(phraseSpeech(part.text, lang))
    else if (part.kind === 'expr') parts.push(tokenize(part.expr, lang))
  }
  return joinSpeech(parts)
}

/** 答错反馈：「正确答案是 X」——先拼成一句再切，「正确答案是14」「正确答案是小兔子」并成一条。 */
export function answerSpeech(q: Question, lang: Lang): string[] {
  return tokenize(`${translate({ k: 'practice.answerIs' }, lang)} ${translate(answerLabel(q), lang)}`, lang)
}

/** 结算：「闯关完成！答对 x 题」（「答对 x 题」并成一条）。 */
export function summarySpeech(correct: number, lang: Lang): string[] {
  const score = `${translate({ k: 'summary.scorePre' }, lang)} ${correct} ${translate({ k: 'summary.scorePost' }, lang)}`
  return joinSpeech([phraseSpeech({ k: 'summary.success' }, lang), tokenize(score, lang)])
}

export const RIGHT_KEYS = ['voice.right.1', 'voice.right.2', 'voice.right.3']

/** 答对时的鼓励语（随机一句）。 */
export function rightSpeech(lang: Lang, pick: number = Math.random()): string[] {
  const key = RIGHT_KEYS[Math.floor(pick * RIGHT_KEYS.length) % RIGHT_KEYS.length]!
  return phraseSpeech({ k: key }, lang)
}
