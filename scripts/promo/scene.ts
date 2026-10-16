/**
 * 首页宣传片（需求 F1）的画面与声音：scripts/promo.mjs 用无头 Chrome 打开这一页，一帧一帧画、截图交给 ffmpeg 编码。
 * 画面：1280×720 的舞台，五段——对战（答对课本题就得分 → 谁先答对 8 题谁赢）→ 游戏墙（N 种对战游戏）→ 怎么玩
 * （一个人、两个人、一群人）→ 打怪兽（打倒）→ 片尾（图标、人教版几年级哪几门课、免费无广告、网址，课本封面在后面走）。
 * 游戏画面就是竞技场里的游戏模块本身（battle/games、boss-dino），按帧推进；界面照竞技场 iPad 版的样子画（颜色、卡片、拼音）。
 * 所有动画都由 frame(i) 按时间算出来：没有 CSS 动画、过渡、定时器，同一帧号永远画出同一个样子（截图慢也不影响）。
 * 声音：audio() 用 OfflineAudioContext 一次渲染——背景乐（照 battle/music.ts 赛跑与 Boss 战两首曲子的音色和旋律重新编排）、
 * 音效（battle/sfx.ts 的 playSfx 本身，把它用的 AudioContext 换成带虚拟时钟的离线上下文）、旁白（Edge 神经语音，
 * promo.mjs 按 window.__promo.voice 合成好传进来）；时间点和画面共用下面的时间表。
 * 地址参数：lang = zh | en；kp = 知识点总数；grades = 「1-6」；subjects = 「math,chinese」；site = 片尾网址（没有就不画）。
 */
import '@/styles/tokens.css'
import { createApp } from 'vue'
import { SKINS } from '@/battle/skins'
import { BOSSES } from '@/battle/boss'
import type { GameModule, GameState } from '@/battle/game/contract'
import { HIT_AT, type BossGameModule, type BossGameState } from '@/battle/game/boss-contract'
import type { Team } from '@/battle/protocol'
import type { PunchMove } from '@/battle/timed'
import { TUNES, degreeMidi, type Tune } from '@/battle/music'
import { playSfx, streakPitch, type Sfx } from '@/battle/sfx'
import ModeIcon from '@/components/battle/ModeIcon.vue'

const FPS = 30
const DURATION = 14.9
const W = 1280
const H = 720
const DT = 1 / FPS

const params = new URLSearchParams(location.search)
const LANG: 'zh' | 'en' = params.get('lang') === 'en' ? 'en' : 'zh'
const KP = Number(params.get('kp') ?? 0)
const [GRADE_LO, GRADE_HI] = (params.get('grades') ?? '1-6').split('-').map(Number) as [number, number]
const SUBJECT_IDS = (params.get('subjects') ?? 'math,chinese').split(',').filter(Boolean)
const SITE = params.get('site') ?? ''
const GAMES = SKINS.length
/** 对战中间竖条里的游戏：热气球，篮子里坐的就是两块面板上的小兔、小猫 */
const ARENA_GAME = 'balloon'

// ───────────────────────────── 文案 ─────────────────────────────

/** 一句带拼音的话：拼音与汉字逐个对齐（数字 / 标点 / 拉丁字母不占位）；hot = 标橙色的字的下标范围 */
interface Line {
  text: string
  py?: string
  hot?: [number, number][]
}
/** 旁白一句：送去合成的文字（可能换过同音字，字幕不变）、语速 */
interface Say {
  text: string
  rate?: string
}

const ZH_DIGITS = '零一二三四五六七八九'
/** 0–99 的中文读法（旁白里的「二十一种」） */
function zhNum(n: number): string {
  if (n < 10) return ZH_DIGITS[n]!
  const [t, o] = [Math.floor(n / 10), n % 10]
  return `${t === 1 ? '' : ZH_DIGITS[t]}十${o ? ZH_DIGITS[o] : ''}`
}
const EN_ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const EN_TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
function enNum(n: number): string {
  if (n < 20) return EN_ONES[n]!
  return EN_TENS[Math.floor(n / 10)]! + (n % 10 ? `-${EN_ONES[n % 10]}` : '')
}
const SUBJECT_NAMES: Record<string, [string, string]> = { math: ['数学', 'Math'], chinese: ['语文', 'Chinese'], english: ['英语', 'English'] }
const subjects = (lang: 0 | 1, sep: string) => SUBJECT_IDS.map((id) => SUBJECT_NAMES[id]?.[lang] ?? id).join(sep)
const games = String(GAMES)

const TEXT = {
  zh: {
    captions: [
      { text: '答对课本题就得分', py: 'dá duì kè běn tí jiù dé fēn', hot: [[2, 5], [6, 8]] },
      { text: '谁先答对 8 题谁赢！', py: 'shuí xiān dá duì tí shuí yíng', hot: [[5, 8], [9, 10]] },
      { text: `${games} 种对战游戏`, py: 'zhǒng duì zhàn yóu xì', hot: [[0, games.length]] },
      { text: '一个人、两个人、一群人，都能玩！', py: 'yí ge rén liǎng ge rén yì qún rén dōu néng wán', hot: [[12, 15]] },
      { text: '还能一起打怪兽！', py: 'hái néng yì qǐ dǎ guài shòu', hot: [[4, 7]] },
    ] as Line[],
    // 和字幕一一对应、最后多一句片尾；「得分」的「得」换成读音唯一的「德」（edge-tts 有时读成 děi）
    voice: 'zh-CN-XiaoyiNeural',
    says: [
      { text: '答对课本题就德分！' },
      { text: '谁先答对八题谁赢！' },
      { text: `${zhNum(GAMES)}种对战游戏！` },
      { text: '一个人、两个人、一群人，都能玩！', rate: '+8%' },
      { text: '还能一起打怪兽！' },
      { text: '同步练对战版，快来玩吧！' },
    ] as Say[],
    red: '小兔',
    blue: '小猫',
    streak: { text: '连对 3 题！', py: 'lián duì tí' } as Line,
    deuce: { text: '决胜题！', py: 'jué shèng tí' } as Line,
    win: { text: '小兔赢啦！', py: 'xiǎo tù yíng la' } as Line,
    ko: { text: '打倒啦！', py: 'dǎ dǎo la' } as Line,
    modes: [
      { text: '自己练', py: 'zì jǐ liàn' },
      { text: '打机器人', py: 'dǎ jī qì rén' },
      { text: '两人一台', py: 'liǎng rén yì tái' },
      { text: '各用各的', py: 'gè yòng gè de' },
    ] as Line[],
    name: '同步练',
    edition: '对战版',
    sub: [
      '人教版',
      GRADE_LO === GRADE_HI ? `${ZH_DIGITS[GRADE_LO]}年级` : `${ZH_DIGITS[GRADE_LO]}至${ZH_DIGITS[GRADE_HI]}年级`,
      subjects(0, ' '),
      KP ? `${KP} 个知识点` : '',
    ]
      .filter(Boolean)
      .join(' · '),
    badges: ['免费', '无广告', '不用注册'],
  },
  en: {
    captions: [
      { text: 'Answer textbook questions to score!', hot: [[7, 15], [29, 35]] },
      { text: 'First to 8 wins!', hot: [[9, 15]] },
      { text: `${games} battle games`, hot: [[0, games.length]] },
      { text: 'Play solo, in pairs, or in teams!', hot: [[0, 4]] },
      { text: 'Team up to beat the monster!', hot: [[17, 27]] },
    ] as Line[],
    voice: 'en-US-JennyNeural',
    says: [
      { text: 'Answer textbook questions to score!' },
      { text: 'First to eight wins!' },
      { text: `${enNum(GAMES).replace(/^./, (c) => c.toUpperCase())} battle games!` },
      { text: 'Play solo, in pairs, or in teams!' },
      { text: 'Team up to beat the monster!' },
      { text: 'Chapter Practice: Battle!' },
    ] as Say[],
    red: 'Rabbit',
    blue: 'Cat',
    streak: { text: '3 in a row!' } as Line,
    deuce: { text: 'Match point!' } as Line,
    win: { text: 'Rabbit wins!' } as Line,
    ko: { text: 'Knocked out!' } as Line,
    modes: [{ text: 'Practice alone' }, { text: 'vs Robot' }, { text: 'Two on one device' }, { text: 'Each on own device' }] as Line[],
    name: 'Chapter Practice',
    edition: 'Battle',
    sub: ['PEP textbooks', GRADE_LO === GRADE_HI ? `Grade ${GRADE_LO}` : `Grades ${GRADE_LO}–${GRADE_HI}`, subjects(1, ' & '), KP ? `${KP} topics` : ''].filter(Boolean).join(' · '),
    badges: ['Free', 'No ads', 'No sign-up'],
  },
}[LANG]

// ───────────────────────────── 时间表 ─────────────────────────────
// 背景乐 120 BPM（一拍 0.5 秒、一小节 2 秒）：答对、得分、赢、出拳都落在拍子上。

/** 对战：两边各自答对的时刻、题号、选了第几个；头两题有手指来点 */
interface Answer {
  at: number
  team: Team
  q: number
  pick: number
  finger?: boolean
}
const ANSWERS: Answer[] = [
  { at: 1.0, team: 'red', q: 0, pick: 1, finger: true },
  { at: 2.0, team: 'blue', q: 0, pick: 1, finger: true },
  { at: 2.5, team: 'red', q: 1, pick: 2 },
  { at: 3.0, team: 'blue', q: 1, pick: 0 },
  { at: 3.5, team: 'red', q: 2, pick: 0 },
  { at: 5.0, team: 'red', q: 3, pick: 3 },
]
/** 第几次答对弹「连对 3 题」 */
const STREAK_ANSWER = 4
/** 快进：比分一格一格涨到 7 : 7 */
const FF_FROM = 3.8
const FF_STEP = 0.07
/** 快进前的比分（头 5 题答完：红 3、蓝 2） */
const FF_BEFORE: [number, number] = [3, 2]
const FF_SCORES: [number, number][] = [
  [3, 3],
  [4, 3],
  [4, 4],
  [5, 4],
  [5, 5],
  [6, 5],
  [6, 6],
  [7, 6],
  [7, 7],
]
const FF_TO = FF_FROM + FF_STEP * (FF_SCORES.length - 1)
/** 两边的题：第几题、滑进来、滑走（答对后 0.35 秒换下一题；快进时停在上一题，快进完换上决胜题） */
const QSCHED: Record<Team, { q: number; inAt: number; outAt: number }[]> = {
  red: [
    { q: 0, inAt: -1, outAt: 1.35 },
    { q: 1, inAt: 1.35, outAt: 2.85 },
    { q: 2, inAt: 2.85, outAt: FF_TO - 0.05 },
    { q: 3, inAt: FF_TO - 0.05, outAt: 99 },
  ],
  blue: [
    { q: 0, inAt: -1, outAt: 2.35 },
    { q: 1, inAt: 2.35, outAt: FF_TO - 0.05 },
    { q: 2, inAt: FF_TO - 0.05, outAt: 99 },
  ],
}
const DEUCE_AT = 4.4
const WIN_AT = 5.0

const WALL_IN = 5.75
const WALL_OUT = 7.5
const MODES_IN = 7.62
const MODES_OUT = 10.38
/**
 * 旁白「一个人 / 两个人 / 一群人 / 都能玩」每段开口的时刻（相对这句开口；promo.mjs 按句中的停顿量出来，configure 交进来）：
 * 说到「一个人」时前两张卡（自己练、打机器人）亮起来，「两个人」第三张，「一群人」第四张，「都能玩」四张一起跳
 */
let modeCues = [0, 0.68, 1.43, 2.17]
const BOSS_IN = 10.45
/** 打怪兽的几拳：at 是拳头打到的时刻（落在拍子上），最后一拳打倒 */
const BOSS_HITS: { at: number; team: Team; move: PunchMove; points: number }[] = [
  { at: 10.75, team: 'red', move: 'jab', points: 1 },
  { at: 11.0, team: 'blue', move: 'jab', points: 1 },
  { at: 11.25, team: 'red', move: 'hook', points: 2 },
  { at: 11.5, team: 'blue', move: 'upper', points: 2 },
  { at: 12.0, team: 'red', move: 'super', points: 4 },
]
const BOSS_HP = 10
const KO_AT = 12.0
const FLASH_AT = 12.42
const END_IN = 12.5

/** 字幕：出现、消失 */
const CAPTIONS: [number, number][] = [
  [0.4, 3.05],
  [3.1, 5.6],
  [5.95, 7.5],
  [7.7, 10.36],
  [10.6, 12.42],
]
/** 旁白每句开口的时刻（promo.mjs 合成后去掉了开头的静音） */
const VOICE_AT = [0.45, 3.15, 6.0, 7.75, 10.68, 12.78]
/** 首页封面用哪一帧：对战正热闹（连对 3 题、两边都答对过、字幕「谁先答对 8 题谁赢」） */
const POSTER_AT = 3.667

// ───────────────────────────── 小工具 ─────────────────────────────

const clamp = (x: number, a = 0, b = 1): number => Math.min(b, Math.max(a, x))
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k
/** t 在 [a, b] 里走到哪了（0…1） */
const seg = (t: number, a: number, b: number): number => clamp((t - a) / (b - a))
const ease = {
  outCubic: (x: number) => 1 - (1 - x) ** 3,
  inCubic: (x: number) => x ** 3,
  inOutCubic: (x: number) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outBack: (x: number, s = 1.70158) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2),
  inBack: (x: number, s = 1.70158) => (s + 1) * x ** 3 - s * x ** 2,
}
/** 弹出：0 → 略超 → 1 的缩放 */
const popScale = (t: number, at: number, dur = 0.38, s = 2.2): number => ease.outBack(seg(t, at, at + dur), s)
/** 一下「咚」：at 时刻放大到 1 + amp 再回来 */
const bump = (t: number, at: number, dur = 0.3, amp = 0.18): number => {
  const k = seg(t, at, at + dur)
  return k <= 0 || k >= 1 ? 1 : 1 + amp * Math.sin(Math.PI * k) * (1 - k * 0.3)
}
/** 可复现的随机数（彩纸、游戏墙的得分时刻） */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let x = s
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (cls) e.className = cls
  if (text !== undefined) e.textContent = text
  parent?.appendChild(e)
  return e
}
type StyleKey = 'transform' | 'opacity' | 'filter' | 'visibility' | 'left' | 'top' | 'boxShadow'
/** 只在值变了时才写（同一帧号画两遍不会多出布局） */
function style(e: HTMLElement, s: Partial<Record<StyleKey, string | number>>): void {
  const st = e.style as unknown as Record<string, string>
  for (const [k, v] of Object.entries(s)) {
    const val = String(v)
    if (st[k] !== val) st[k] = val
  }
}
const show = (e: HTMLElement, on: boolean): void => style(e, { visibility: on ? 'visible' : 'hidden' })

const HAN = /\p{Script=Han}/u
/** 把一句话拆成一个个字（带拼音的 <ruby>），返回每个字的元素（字幕按字弹出）；没有拼音（英文）就整句一块 */
function rubyLine(parent: HTMLElement, line: Line, cls = ''): HTMLElement[] {
  if (!line.py) return [el('span', `u ${cls}`, parent, line.text)]
  const syll = line.py.split(/\s+/)
  let si = 0
  const units: HTMLElement[] = []
  Array.from(line.text).forEach((ch, i) => {
    if (ch === ' ') {
      units.push(el('span', 'u gap', parent))
      return
    }
    const u = el('span', `u ${cls}`, parent)
    if (line.hot?.some(([a, b]) => i >= a && i < b)) u.classList.add('hot')
    const r = el('ruby', '', u)
    r.append(ch)
    // 没有拼音的字（数字、标点）也给一个空的 rt，整行的基线才对得齐
    el('rt', '', r, HAN.test(ch) && syll[si] ? syll[si++] : ' ')
    units.push(u)
  })
  return units
}
/** 元素在祖先坐标里的左上角（不算变换，拿的是排版位置） */
function offsetIn(e: HTMLElement, ancestor: HTMLElement): { x: number; y: number } {
  let x = 0
  let y = 0
  let node: HTMLElement | null = e
  while (node && node !== ancestor) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return { x, y }
}

// ───────────────────────────── 舞台 ─────────────────────────────

const stage = document.getElementById('stage')!
const deco = el('div', 'layer', stage)
deco.id = 'deco'

// —— 对战：左红右蓝两块面板，中间一条竖着的游戏（竞技场 iPad 版） ——
const world = el('div', 'layer', stage)
world.id = 'world'
const strip = el('div', 'strip', world)
const stripCanvas = el('canvas', '', strip)

interface QSet {
  root: HTMLElement
  cards: HTMLElement[]
  tick: HTMLElement
}
interface Panel {
  root: HTMLElement
  body: HTMLElement
  score: HTMLElement
  plus: HTMLElement
  dots: HTMLElement[]
  qsets: QSet[]
  ripple: HTMLElement
}
/** 红队一年级数学「9 加几」，蓝队一年级语文「看拼音，选出这个字」 */
const RED_Q = [
  { expr: '9 + 5 = ?', choices: ['13', '14', '15', '12'] },
  { expr: '7 + 8 = ?', choices: ['16', '14', '15', '17'] },
  { expr: '6 + 7 = ?', choices: ['13', '12', '14', '11'] },
  { expr: '8 + 6 = ?', choices: ['12', '15', '13', '14'] },
]
const BLUE_Q = [
  { py: 'huǒ', choices: ['水', '火', '木', '山'] },
  { py: 'shān', choices: ['山', '田', '日', '口'] },
  { py: 'yuè', choices: ['目', '月', '日', '用'] },
]
function makePanel(team: Team): Panel {
  const root = el('div', `team ${team}`, world)
  const head = el('div', 'head', root)
  el('span', 'ava', head, team === 'red' ? '🐰' : '🐱')
  el('span', 'name', head, team === 'red' ? TEXT.red : TEXT.blue)
  const dotsBox = el('span', 'dots', head)
  const dots = Array.from({ length: 8 }, () => el('i', '', dotsBox))
  const score = el('span', 'score', head, '0')
  const plus = el('span', 'plus', head, '+1')
  const body = el('div', 'body', root)
  const qs = team === 'red' ? RED_Q : BLUE_Q
  const qsets = qs.map((q, qi): QSet => {
    const qroot = el('div', 'qset', body)
    const row = el('div', 'qrow', qroot)
    el('span', 'spk', row, '🔊')
    if ('expr' in q) el('span', 'expr', row, q.expr)
    else el('span', 'pycard', row, q.py)
    const ch = el('div', 'choices', qroot)
    const cards = q.choices.map((c) => el('div', `card${team === 'blue' ? ' hz' : ''}`, ch, c))
    // 答对时选中的那张右上角弹一个 ✅
    const pick = ANSWERS.find((a) => a.team === team && a.q === qi)?.pick ?? 0
    const tick = el('span', 'tick', cards[pick], '✅')
    return { root: qroot, cards, tick }
  })
  const ripple = el('div', 'ripple', root)
  return { root, body, score, plus, dots, qsets, ripple }
}
const panels: Record<Team, Panel> = { red: makePanel('red'), blue: makePanel('blue') }
const ffIcon = el('div', 'ff', world, '⏩')
const finger = el('div', 'finger', world, '👆')

function pill(parent: HTMLElement, cls: string, line: Line, emoji = ''): HTMLElement {
  const p = el('div', `pill ${cls}`, parent)
  if (emoji) el('span', 'emo', p, emoji)
  rubyLine(el('span', '', p), line)
  return p
}
const streakPill = pill(world, 'streak', TEXT.streak, '🔥')
const deucePill = pill(world, 'deuce', TEXT.deuce, '⚡')
const winPill = pill(stage, 'win', TEXT.win, '🏆')

// —— 游戏墙：12 个游戏一起在比 ——
const wall = el('div', 'layer', stage)
const WALL_SKINS = ['rocket', 'balloon', 'train', 'fish', 'race', 'egg', 'tug', 'stars', 'swim', 'dig', 'car', 'fruit']
const TILE_W = 280
const TILE_H = 158
const TILE_GAP = 18
const WALL_X0 = (W - (4 * TILE_W + 3 * TILE_GAP)) / 2
const WALL_Y0 = 14
const tiles = WALL_SKINS.map((id, i) => {
  const col = i % 4
  const row = Math.floor(i / 4)
  const root = el('div', 'tile', wall)
  style(root, { left: `${WALL_X0 + col * (TILE_W + TILE_GAP)}px`, top: `${WALL_Y0 + row * (TILE_H + TILE_GAP)}px` })
  root.style.width = `${TILE_W}px`
  root.style.height = `${TILE_H}px`
  const canvas = el('canvas', '', root)
  return { id, col, row, root, canvas, game: null as GameModule | null, score: { red: 0, blue: 0 } }
})

// —— 打怪兽 ——
const bossLayer = el('div', 'layer', stage)
const bossStage = el('div', 'boss-stage', bossLayer)
const bossCam = el('div', 'boss-cam', bossStage)
const bossCanvas = el('canvas', '', bossCam)
const koPill = pill(bossLayer, 'ko', TEXT.ko, '🥊')

// —— 怎么玩：设置页那四张卡的示意图（ModeIcon 本身） ——
const modesLayer = el('div', 'layer', stage)
const MODE_IDS = ['practice', 'ai', 'duo', 'online'] as const
const modeCards = MODE_IDS.map((id, i) => {
  const card = el('div', `mode${LANG === 'en' ? ' en' : ''}`, modesLayer)
  style(card, { left: `${W / 2 + (i - 1.5) * 292 - 134}px` })
  createApp(ModeIcon, { mode: id }).mount(el('div', 'pic', card))
  rubyLine(el('div', 'label', card), TEXT.modes[i]!)
  return card
})

// —— 片尾 ——
const endLayer = el('div', 'layer', stage)
function coverRow(subject: string, top: number): HTMLElement {
  const row = el('div', 'cover-row', endLayer)
  style(row, { top: `${top}px` })
  const ids = [1, 2, 3, 4, 5, 6].flatMap((g) => [`${subject}-g${g}-s1`, `${subject}-g${g}-s2`])
  // 两遍接起来，往一个方向一直走也不露底
  for (const id of [...ids, ...ids]) {
    const img = el('img', '', row)
    img.src = `/covers/${id}.webp`
    img.alt = ''
  }
  return row
}
const COVER_ROW_W = 12 * (112 + 18)
const rowTop = coverRow('math', -18)
const rowBottom = coverRow('chinese', 578)
const endFade = el('div', 'layer', endLayer)
endFade.id = 'end-fade'
const brand = el('div', `brand${LANG === 'en' ? ' en' : ''}`, endLayer)
const icon = el('img', '', brand)
icon.src = '/icon-512.png'
icon.alt = ''
const brandName = el('div', 'name', brand)
const nameText = el('span', '', brandName, TEXT.name)
const editionBadge = el('span', 'badge', brandName, TEXT.edition)
const sub = el('div', 'sub', endLayer, TEXT.sub)
const badgesBox = el('div', 'badges', endLayer)
const badges = TEXT.badges.map((b) => el('span', '', badgesBox, b))
const url = el('div', 'url', endLayer, SITE)
if (!SITE) url.remove()

// —— 彩纸、字幕、白闪 ——
const fx = el('canvas', 'layer', stage)
fx.width = W * 2
fx.height = H * 2
fx.style.width = `${W}px`
fx.style.height = `${H}px`
const fxCtx = fx.getContext('2d')!
const captionBox = el('div', '', stage)
captionBox.id = 'caption'
const captions = TEXT.captions.map((line) => {
  const c = el('div', `cap${LANG === 'en' ? ' en' : ''}`, captionBox)
  if (LANG === 'zh') return { root: c, units: rubyLine(c, line) }
  // 英文按词弹（一个字母一个字母弹太碎）
  const words = line.text.split(' ')
  let pos = 0
  const units = words.flatMap((w, wi) => {
    const u = el('span', 'u', c, w)
    if (line.hot?.some(([a, b]) => pos < b && pos + w.length > a)) u.classList.add('hot')
    pos += w.length + 1
    return wi < words.length - 1 ? [u, el('span', 'u gap', c)] : [u]
  })
  return { root: c, units }
})
const flash = el('div', 'layer', stage)
flash.id = 'flash'

// ───────────────────────────── 游戏 ─────────────────────────────

const AVATARS = { red: 'rabbit', blue: 'cat' } as const
let arenaGame: GameModule | null = null
let boss: BossGameModule | null = null

function gameState(red: number, blue: number, extra: Partial<GameState> = {}): GameState {
  return { red, blue, target: 8, phase: 'playing', winner: null, lastPoint: null, avatars: AVATARS, ...extra }
}
function bossState(hp: number, inputs: Partial<Record<Team, string>> = {}): BossGameState {
  return {
    phase: 'playing',
    variant: 'coop',
    lastTen: false,
    fighters: [
      { id: 'r', team: 'red', avatar: 'rabbit', robot: false, streak: 0, input: inputs.red ?? '' },
      { id: 'b', team: 'blue', avatar: 'cat', robot: false, streak: 0, input: inputs.blue ?? '' },
    ],
    bosses: [{ side: 'shared', level: 1, hp, max: BOSS_HP }],
  }
}

async function setupGames(): Promise<void> {
  const skin = (id: string) => SKINS.find((s) => s.id === id)!
  arenaGame = (await skin(ARENA_GAME).game())()
  arenaGame.mount({ canvas: stripCanvas, width: 196, height: 510, dpr: 2, compact: false, reducedMotion: false })
  arenaGame.setState(gameState(0, 0))
  arenaGame.onEvent({ type: 'go' })
  for (const tile of tiles) {
    const g = (await skin(tile.id).game())()
    g.mount({ canvas: tile.canvas, width: TILE_W, height: TILE_H, dpr: 2, compact: false, reducedMotion: false })
    tile.game = g
  }
  boss = (await BOSSES[0]!.game())()
  boss.mount({ canvas: bossCanvas, width: 1232, height: 500, dpr: 2, compact: false, reducedMotion: false })
  boss.setState(bossState(BOSS_HP))
}

/** 游戏墙：进场前先让每块各打几分（画面里已经在比了），进场后每块再得两三分 */
const wallRand = rng(21)
const wallStart = tiles.map(() => [1 + Math.floor(wallRand() * 4), 1 + Math.floor(wallRand() * 4)] as [number, number])
const wallPoints: { at: number; tile: number; team: Team }[] = []
tiles.forEach((_, i) => {
  for (let k = 0; k < 3; k++) wallPoints.push({ at: WALL_IN + 0.35 + wallRand() * 1.35, tile: i, team: wallRand() < 0.5 ? 'red' : 'blue' })
})
wallPoints.sort((a, b) => a.at - b.at)

function warmWall(): void {
  tiles.forEach((tile, i) => {
    const g = tile.game!
    const [r, b] = wallStart[i]!
    g.setState(gameState(0, 0))
    g.onEvent({ type: 'go' })
    for (let k = 0; k < 6; k++) g.tick(DT)
    let rr = 0
    let bb = 0
    while (rr < r || bb < b) {
      if (rr < r) {
        rr++
        g.onEvent({ type: 'point', team: 'red', playerId: 'r', streak: rr })
        g.setState(gameState(rr, bb, { lastPoint: 'red' }))
      }
      for (let k = 0; k < 8; k++) g.tick(DT)
      if (bb < b) {
        bb++
        g.onEvent({ type: 'point', team: 'blue', playerId: 'b', streak: bb })
        g.setState(gameState(rr, bb, { lastPoint: 'blue' }))
      }
      for (let k = 0; k < 8; k++) g.tick(DT)
    }
    for (let k = 0; k < 24; k++) g.tick(DT)
    tile.score = { red: r, blue: b }
  })
}

// ───────────────────────────── 彩纸 ─────────────────────────────

interface Bit {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  w: number
  h: number
  color: string
  star: boolean
  life: number
}
const bits: Bit[] = []
const CONFETTI = ['#ff6b6b', '#4aa3ff', '#3ecf8e', '#ffd23f', '#ff8a3d', '#b07cff']
/** 喷一把彩纸（满屏乱飞的小碎片最费码率：数量、寿命都收着） */
function burst(seed: number, x: number, y: number, n: number, spread: number, up: number): void {
  const r = rng(seed)
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * spread
    const v = up * (0.55 + r() * 0.6)
    bits.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: r() * Math.PI,
      vr: (r() - 0.5) * 14,
      w: 14 + r() * 10,
      h: 8 + r() * 6,
      color: CONFETTI[Math.floor(r() * CONFETTI.length)]!,
      star: r() < 0.18,
      life: 1.6 + r() * 0.6,
    })
  }
}
function stepBits(t: number): void {
  // 换场时把上一场的彩纸收掉
  if (crossed(WALL_IN + 0.55, t) || crossed(MODES_IN + 0.3, t)) bits.length = 0
  for (const b of bits) {
    b.vy += 1500 * DT
    b.vx *= 0.985
    b.vy *= 0.985
    b.x += b.vx * DT
    b.y += b.vy * DT
    b.rot += b.vr * DT
    b.life -= DT
  }
  for (let i = bits.length - 1; i >= 0; i--) if (bits[i]!.life <= 0 || bits[i]!.y > H + 60) bits.splice(i, 1)
}
function drawStar(c: CanvasRenderingContext2D, r: number): void {
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  c.closePath()
  c.fill()
}
function drawBits(): void {
  fxCtx.setTransform(2, 0, 0, 2, 0, 0)
  fxCtx.clearRect(0, 0, W, H)
  for (const b of bits) {
    fxCtx.save()
    fxCtx.globalAlpha = clamp(b.life / 0.5)
    fxCtx.translate(b.x, b.y)
    fxCtx.rotate(b.rot)
    fxCtx.fillStyle = b.color
    if (b.star) drawStar(fxCtx, b.w * 0.75)
    else {
      fxCtx.scale(1, Math.cos(b.rot * 1.7))
      fxCtx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h)
    }
    fxCtx.restore()
  }
}

// ───────────────────────────── 一帧 ─────────────────────────────

/** 「过了这个时刻没有」：按帧推进时只在跨过的那一帧触发一次 */
let lastT = -1
const crossed = (at: number, t: number): boolean => lastT < at && t >= at

/** 对战到时刻 t 的比分 */
function scoreAt(t: number): { red: number; blue: number } {
  let red = 0
  let blue = 0
  for (const a of ANSWERS) if (t >= a.at && a.at < FF_FROM) a.team === 'red' ? red++ : blue++
  if (t >= FF_FROM) {
    const k = Math.min(FF_SCORES.length - 1, Math.floor((t - FF_FROM) / FF_STEP + 1e-6))
    ;[red, blue] = FF_SCORES[k]!
  }
  if (t >= WIN_AT) red = 8
  return { red, blue }
}
/** 这一队最近一次得分的时刻（「+1」、比分弹一下） */
function lastPointAt(team: Team, t: number): number {
  let at = -9
  for (const a of ANSWERS) if (a.team === team && a.at <= t) at = Math.max(at, a.at)
  const k = team === 'red' ? 0 : 1
  FF_SCORES.forEach((s, i) => {
    const prev = i === 0 ? FF_BEFORE : FF_SCORES[i - 1]!
    const when = FF_FROM + FF_STEP * i
    if (when <= t && s[k]! > prev[k]!) at = Math.max(at, when)
  })
  return at
}

/** 镜头：世界里的 (cx, cy) 放到画面 (640, 266)、放大 s 倍；开场对着红队的题，1.2 秒起拉开 */
function camera(t: number): { cx: number; cy: number; s: number } {
  const zoomed = { cx: 492, cy: 300, s: 1.3 }
  const full = { cx: 640, cy: 266, s: 1 }
  const k = ease.inOutCubic(seg(t, 1.2, 1.8))
  const cx = lerp(zoomed.cx, full.cx, k)
  let cy = lerp(zoomed.cy, full.cy, k)
  let s = lerp(zoomed.s, full.s, k)
  // 决胜题：慢慢推近；赢的那一下再顶一下
  s *= lerp(1, 1.05, ease.inOutCubic(seg(t, DEUCE_AT, WIN_AT)))
  const back = ease.inOutCubic(seg(t, WIN_AT + 0.1, WIN_AT + 0.7))
  s = lerp(s, 1, back) * bump(t, WIN_AT, 0.32, 0.035)
  cy = lerp(cy, 266, back)
  return { cx, cy, s }
}

function frameBattle(t: number): void {
  const vis = t < WALL_IN + 0.6
  show(world, vis)
  if (!vis) return
  // 游戏墙进场时整块往后退、变淡
  const away = ease.inOutCubic(seg(t, WALL_IN - 0.05, WALL_IN + 0.45))
  const cam = camera(t)
  const s = cam.s * lerp(1, 0.86, away)
  style(world, { transform: `translate(640px, 266px) scale(${s}) translate(${-cam.cx}px, ${-cam.cy}px)`, opacity: 1 - away })
  // 开场：三块依次弹进来（第 0 帧红队已经看得见，循环播放时接得上）
  const intro = (e: HTMLElement, at: number, dx: number, dy: number) => {
    const k = ease.outBack(seg(t, at, at + 0.45), 1.4)
    style(e, { transform: `translate(${dx * (1 - k)}px, ${dy * (1 - k)}px) scale(${lerp(0.9, 1, k)})`, opacity: clamp(seg(t, at, at + 0.18)) })
  }
  intro(panels.red.root, -0.16, -50, 24)
  intro(strip, 0.3, 0, -70)
  intro(panels.blue.root, 0.4, 70, 24)

  // 比分、圆点、「+1」
  const sc = scoreAt(t)
  for (const team of ['red', 'blue'] as Team[]) {
    const p = panels[team]
    const v = String(sc[team])
    if (p.score.textContent !== v) p.score.textContent = v
    p.dots.forEach((d, i) => d.classList.toggle('on', i < sc[team]))
    const lp = lastPointAt(team, t)
    style(p.score, { transform: `scale(${bump(t, lp, 0.35, 0.45)})` })
    const pk = seg(t, lp, lp + 0.8)
    style(p.plus, { opacity: pk > 0 && pk < 1 ? 1 - pk ** 2 : 0, transform: `translateY(${-50 * ease.outCubic(pk)}px) scale(${lerp(0.8, 1.2, ease.outCubic(pk))})` })
  }

  // 题目：滑进来、按下、变绿、对勾、滑走
  for (const team of ['red', 'blue'] as Team[]) {
    const p = panels[team]
    const mine = ANSWERS.filter((a) => a.team === team)
    QSCHED[team].forEach(({ q, inAt, outAt }) => {
      const qs = p.qsets[q]!
      const me = mine.find((a) => a.q === q)
      // 旧题先淡出、新题晚 0.08 秒再进来，两题不叠在一起
      const kin = ease.outBack(seg(t, inAt + 0.08, inAt + 0.34), 1.3)
      const kout = ease.inCubic(seg(t, outAt, outAt + 0.14))
      const visible = t >= inAt + 0.08 && t < outAt + 0.14
      show(qs.root, visible)
      if (!visible) return
      style(qs.root, { transform: `translateX(${90 * (1 - kin) - 70 * kout}px)`, opacity: Math.min(clamp(seg(t, inAt + 0.08, inAt + 0.18)), 1 - kout) })
      qs.cards.forEach((c, i) => {
        const picked = me && i === me.pick
        const press = picked ? seg(t, me.at - 0.08, me.at) : 0
        const done = picked && t >= me.at
        c.classList.toggle('ok', !!done)
        style(c, { transform: `scale(${done ? bump(t, me.at, 0.3, 0.14) : 1 - 0.08 * press})` })
      })
      if (me) {
        const tk = popScale(t, me.at, 0.35, 2.6)
        style(qs.tick, { opacity: t >= me.at ? 1 : 0, transform: `scale(${tk}) rotate(${lerp(-30, 8, tk)}deg)` })
      }
    })
    p.qsets.forEach((qs, q) => {
      if (!QSCHED[team].some((x) => x.q === q)) show(qs.root, false)
    })
    // 快进：两边的题目区糊掉
    const ff = seg(t, FF_FROM - 0.12, FF_FROM) * (1 - seg(t, FF_TO, FF_TO + 0.12))
    style(p.body, { filter: ff > 0 ? `blur(${4 * ff}px)` : 'none' })
  }
  const ffk = seg(t, FF_FROM - 0.1, FF_FROM + 0.05) * (1 - seg(t, FF_TO, FF_TO + 0.12))
  style(ffIcon, { opacity: ffk, transform: `scale(${lerp(0.5, 1, ease.outBack(ffk))})` })

  // 手指：头两题从右下角伸过来点一下
  const fingerFor = ANSWERS.find((a) => a.finger && t >= a.at - 0.5 && t < a.at + 0.35)
  if (fingerFor) {
    const card = panels[fingerFor.team].qsets[fingerFor.q]!.cards[fingerFor.pick]!
    const o = offsetIn(card, world)
    const cx = o.x + card.offsetWidth / 2
    const cy = o.y + card.offsetHeight / 2
    const kin = ease.outCubic(seg(t, fingerFor.at - 0.5, fingerFor.at - 0.12))
    const kout = ease.inCubic(seg(t, fingerFor.at + 0.12, fingerFor.at + 0.35))
    const press = seg(t, fingerFor.at - 0.1, fingerFor.at - 0.02) * (1 - seg(t, fingerFor.at + 0.02, fingerFor.at + 0.12))
    style(finger, {
      opacity: Math.min(seg(t, fingerFor.at - 0.5, fingerFor.at - 0.38), 1 - kout),
      left: `${lerp(cx + 150, cx - 26, kin) + 120 * kout}px`,
      top: `${lerp(cy + 170, cy - 6, kin) + 140 * kout}px`,
      transform: `scale(${1 - 0.14 * press}) rotate(${lerp(-18, -8, kin)}deg)`,
    })
  } else style(finger, { opacity: 0 })
  // 点下去的波纹
  for (const team of ['red', 'blue'] as Team[]) {
    const p = panels[team]
    const a = ANSWERS.filter((x) => x.team === team && t >= x.at - 0.02 && t < x.at + 0.45).pop()
    if (!a) {
      style(p.ripple, { opacity: 0 })
      continue
    }
    const card = p.qsets[a.q]!.cards[a.pick]!
    const o = offsetIn(card, p.root)
    const k = seg(t, a.at - 0.02, a.at + 0.45)
    style(p.ripple, { left: `${o.x + card.offsetWidth / 2}px`, top: `${o.y + card.offsetHeight / 2}px`, opacity: (1 - k) * 0.95, transform: `scale(${lerp(0.4, 1.7, ease.outCubic(k))})` })
  }

  // 弹出提示：连对 3 题（红队头上）、决胜题（中间）
  const streakAt = ANSWERS[STREAK_ANSWER]!.at
  const sk = popScale(t, streakAt + 0.05, 0.35, 2.4)
  const skOut = seg(t, streakAt + 0.95, streakAt + 1.15)
  style(streakPill, { left: '275px', top: '56px', opacity: t >= streakAt + 0.05 ? 1 - skOut : 0, transform: `translate(-50%, -50%) scale(${sk * (1 - 0.3 * skOut)}) rotate(-4deg)` })
  const dk = popScale(t, DEUCE_AT, 0.4, 2.4)
  const dOut = seg(t, WIN_AT - 0.12, WIN_AT + 0.05)
  style(deucePill, { left: '640px', top: '273px', opacity: t >= DEUCE_AT ? 1 - dOut : 0, transform: `translate(-50%, -50%) scale(${dk * bump(t, DEUCE_AT + 0.5, 0.25, 0.08) * (1 + 0.4 * dOut)})` })

  // 推进中间的游戏：答题前一刻「按键」（角色有主意了），答对时发 answered → point，快进那段一格一格发 point，最后一题 finished
  const g = arenaGame
  if (!g) return
  for (const a of ANSWERS) {
    if (crossed(a.at - 0.25, t)) g.setState(gameState(scoreAt(t).red, scoreAt(t).blue, { inputs: { [a.team]: '1' } }))
    if (crossed(a.at, t)) {
      const s2 = scoreAt(t)
      g.onEvent({ type: 'answered', playerId: a.team, team: a.team, index: a.q, correct: true, given: '' })
      g.onEvent({ type: 'point', team: a.team, playerId: a.team, streak: a.q + 1 })
      if (a.at === WIN_AT) {
        g.onEvent({ type: 'finished', winner: 'red' })
        g.setState(gameState(8, s2.blue, { phase: 'ended', winner: 'red', lastPoint: 'red' }))
      } else g.setState(gameState(s2.red, s2.blue, { lastPoint: a.team }))
    }
  }
  FF_SCORES.forEach(([r, b], i) => {
    if (!crossed(FF_FROM + FF_STEP * i, t)) return
    const prev = i === 0 ? FF_BEFORE : FF_SCORES[i - 1]!
    const team: Team = r > prev[0] ? 'red' : 'blue'
    g.onEvent({ type: 'point', team, playerId: team, streak: 1 })
    if (i === FF_SCORES.length - 1) g.onEvent({ type: 'deuce' })
    g.setState(gameState(r, b, { lastPoint: team }))
  })
  g.tick(DT)
}

function frameWin(t: number): void {
  // 「小兔赢啦！」压在两块面板上；游戏墙进场前收走
  const k = popScale(t, WIN_AT + 0.06, 0.45, 2.2)
  const out = seg(t, WALL_IN - 0.1, WALL_IN + 0.15)
  style(winPill, { left: '640px', top: '290px', opacity: t >= WIN_AT + 0.06 ? 1 - out : 0, transform: `translate(-50%, -50%) scale(${k * (1 - 0.4 * out)}) rotate(${lerp(-8, -3, k)}deg)` })
  if (crossed(WIN_AT, t)) {
    burst(11, 275, 540, 34, 1.2, 1300)
    burst(12, 1005, 540, 34, 1.2, 1300)
    burst(13, 640, 560, 22, 0.7, 1500)
  }
}

function frameWall(t: number): void {
  const vis = t >= WALL_IN - 0.05 && t < WALL_OUT + 0.34
  show(wall, vis)
  if (crossed(WALL_IN - 0.05, t)) warmWall()
  if (!vis) return
  const cx = W / 2
  const cy = WALL_Y0 + (3 * TILE_H + 2 * TILE_GAP) / 2
  tiles.forEach((tile, i) => {
    // 发牌：从下面飞进来，按对角线的顺序
    const at = WALL_IN + (tile.col + tile.row * 1.4) * 0.045
    const k = ease.outBack(seg(t, at, at + 0.42), 1.25)
    const fly = 1 - k
    // 散开：从中心往外飞、放大、变淡
    const ko = ease.inCubic(seg(t, WALL_OUT + i * 0.006, WALL_OUT + 0.24 + i * 0.006))
    const tx = WALL_X0 + tile.col * (TILE_W + TILE_GAP) + TILE_W / 2 - cx
    const ty = WALL_Y0 + tile.row * (TILE_H + TILE_GAP) + TILE_H / 2 - cy
    style(tile.root, {
      transform: `translate(${tx * 1.4 * ko}px, ${ty * 1.6 * ko + 260 * fly}px) rotate(${(i % 2 ? 5 : -5) * fly + (tx > 0 ? 5 : -5) * ko}deg) scale(${lerp(0.6, 1, k) * (1 + 0.25 * ko)})`,
      opacity: clamp(seg(t, at, at + 0.12)) * (1 - ko ** 0.6),
    })
    const g = tile.game
    if (!g) return
    for (const p of wallPoints) {
      if (p.tile !== i || !crossed(p.at, t)) continue
      tile.score[p.team] = Math.min(7, tile.score[p.team] + 1)
      g.onEvent({ type: 'point', team: p.team, playerId: p.team, streak: 1 })
      g.setState(gameState(tile.score.red, tile.score.blue, { lastPoint: p.team }))
    }
    g.tick(DT)
  })
}

function frameModes(t: number): void {
  const vis = t >= MODES_IN - 0.05 && t < MODES_OUT + 0.4
  show(modesLayer, vis)
  if (!vis) return
  // 旁白说到哪种玩法，那几张卡就亮起来（橙色描边、放大一点、跳一下）；「都能玩」四张一起跳
  const [one, two, many, all] = modeCues.map((d) => VOICE_AT[3]! + d) as [number, number, number, number]
  const spans: [number, number][] = [
    [one, two],
    [one, two],
    [two, many],
    [many, all],
  ]
  modeCards.forEach((card, i) => {
    const at = MODES_IN + i * 0.1
    const k = ease.outBack(seg(t, at, at + 0.42), 1.8)
    const out = ease.inBack(seg(t, MODES_OUT + i * 0.04, MODES_OUT + 0.28 + i * 0.04), 1.4)
    const [a, b] = spans[i]!
    const focus = ease.inOutCubic(seg(t, a - 0.06, a + 0.1)) * (1 - ease.inOutCubic(seg(t, b - 0.06, b + 0.1)))
    const hop = Math.sin(Math.PI * seg(t, a - 0.04, a + 0.3)) * 24 + Math.sin(Math.PI * seg(t, all + i * 0.05, all + 0.3 + i * 0.05)) * 22
    style(card, {
      opacity: clamp(seg(t, at, at + 0.15)) * (1 - seg(t, MODES_OUT + 0.18 + i * 0.04, MODES_OUT + 0.28 + i * 0.04)),
      transform: `translateY(${80 * (1 - k) - hop - 10 * focus - 520 * out}px) scale(${lerp(0.7, 1, k) * (1 + 0.07 * focus)}) rotate(${lerp(i % 2 ? 6 : -6, 0, k)}deg)`,
      boxShadow: `0 0 0 ${(6 * focus).toFixed(2)}px #ff8a3d, 0 ${10 + 8 * focus}px ${24 + 10 * focus}px rgba(61, 44, 30, ${0.12 + 0.08 * focus})`,
    })
  })
}

function frameBoss(t: number): void {
  const vis = t >= BOSS_IN - 0.05 && t < FLASH_AT + 0.12
  show(bossLayer, vis)
  if (!vis || !boss) return
  const k = ease.outBack(seg(t, BOSS_IN, BOSS_IN + 0.45), 1.4)
  style(bossStage, { transform: `translateY(${60 * (1 - k)}px) scale(${lerp(0.82, 1, k)})`, opacity: clamp(seg(t, BOSS_IN, BOSS_IN + 0.15)) })
  // 镜头放大一点（血条和脚都还在画面里，不一直推：整幅缩放很费码率）；打倒那一下顶一下、抖一抖
  const zoom = 1.08 * bump(t, KO_AT, 0.3, 0.035)
  const shake = Math.round(Math.sin(t * 70) * 6 * (1 - seg(t, KO_AT, KO_AT + 0.3)) * (t >= KO_AT ? 1 : 0))
  style(bossCam, { transform: `translate(${616 + shake}px, 200px) scale(${zoom}) translate(-616px, -200px)` })
  if (crossed(BOSS_IN, t)) {
    boss.setState(bossState(BOSS_HP))
    boss.onEvent({ type: 'go' })
  }
  let hp = BOSS_HP
  BOSS_HITS.forEach((h, i) => {
    // at 是拳头打到的时刻：hit 事件要早 HIT_AT 发（游戏从出拳画起），和竞技场一样
    const send = h.at - HIT_AT[h.move]
    if (crossed(send - 0.3, t)) boss!.setState(bossState(hp, { [h.team]: '1' }))
    hp = Math.max(0, hp - h.points)
    if (crossed(send, t)) {
      boss!.onEvent({ type: 'hit', playerId: h.team === 'red' ? 'r' : 'b', team: h.team, side: 'shared', points: h.points, streak: i + 1, move: h.move, together: i === 3 })
      if (h.at === KO_AT) boss!.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
      boss!.setState(bossState(hp))
    }
  })
  boss.tick(DT)
  const kk = popScale(t, KO_AT + 0.12, 0.4, 2.4)
  style(koPill, { left: '640px', top: '150px', opacity: t >= KO_AT + 0.12 ? 1 : 0, transform: `translate(-50%, -50%) scale(${kk}) rotate(${lerp(10, 4, kk)}deg)` })
  if (crossed(KO_AT, t)) burst(31, 640, 420, 40, 1.5, 1300)
}

function frameEnd(t: number): void {
  const vis = t >= END_IN - 0.05
  show(endLayer, vis)
  if (!vis) return
  // 两排课本封面（上数学、下语文）：一排往左、一排往右；每帧整 1 像素地走、不转角度，编码时只是平移，几乎不占码率
  const k = ease.outCubic(seg(t, END_IN, END_IN + 0.5))
  const drift = Math.round((t - END_IN) * FPS)
  style(rowTop, { transform: `translate(${-(drift % COVER_ROW_W) - 40}px, ${Math.round(-120 * (1 - k))}px)`, opacity: k })
  style(rowBottom, { transform: `translate(${-COVER_ROW_W + (drift % COVER_ROW_W) - 40}px, ${Math.round(120 * (1 - k))}px)`, opacity: k })
  style(endFade, { opacity: k })
  const ik = popScale(t, END_IN + 0.08, 0.5, 2.6)
  style(icon, { transform: `scale(${ik}) rotate(${lerp(-30, 0, ik)}deg)`, opacity: t >= END_IN + 0.08 ? 1 : 0 })
  const nk = ease.outBack(seg(t, END_IN + 0.2, END_IN + 0.62), 1.6)
  style(nameText, { transform: `translateX(${-40 * (1 - nk)}px)`, opacity: clamp(seg(t, END_IN + 0.2, END_IN + 0.35)) })
  const bk = popScale(t, END_IN + 0.36, 0.4, 2.8)
  style(editionBadge, { transform: `scale(${bk}) rotate(${lerp(-20, -4, bk)}deg)`, opacity: t >= END_IN + 0.36 ? 1 : 0 })
  const sk = ease.outCubic(seg(t, END_IN + 0.48, END_IN + 0.85))
  style(sub, { transform: `translateY(${24 * (1 - sk)}px)`, opacity: sk })
  badges.forEach((b, i) => {
    const at = END_IN + 0.62 + i * 0.1
    style(b, { transform: `scale(${popScale(t, at, 0.36, 2.6)})`, opacity: t >= at ? 1 : 0 })
  })
  const uk = ease.outBack(seg(t, END_IN + 0.95, END_IN + 1.35), 1.6)
  style(url, { transform: `translateX(-50%) translateY(${30 * (1 - uk)}px) scale(${lerp(0.8, 1, uk)})`, opacity: clamp(seg(t, END_IN + 0.95, END_IN + 1.1)) })
  if (crossed(END_IN + 0.1, t)) {
    burst(41, 230, 330, 18, 1.1, 1100)
    burst(42, 1050, 330, 18, 1.1, 1100)
  }
}

/** 字幕最宽多少（再宽就整句等比缩小）：右下角留给首页的声音标记 */
const CAPTION_MAX_W = 1040
const captionFit = new Map<HTMLElement, number>()
function frameCaptions(t: number): void {
  captions.forEach((c, i) => {
    const [a, b] = CAPTIONS[i]!
    const vis = t >= a - 0.02 && t < b + 0.2
    show(c.root, vis)
    if (!vis) return
    if (!captionFit.has(c.root)) captionFit.set(c.root, Math.min(1, CAPTION_MAX_W / Math.max(1, c.root.scrollWidth)))
    style(c.root, { transform: `scale(${captionFit.get(c.root)})` })
    const out = seg(t, b, b + 0.18)
    c.units.forEach((u, j) => {
      const at = a + j * (LANG === 'en' ? 0.05 : 0.035)
      const k = ease.outBack(seg(t, at, at + 0.3), 2.4)
      style(u, { transform: `translateY(${(1 - k) * 26 + out * 18}px) scale(${lerp(0.3, 1, k) * (1 - 0.25 * out)})`, opacity: clamp(seg(t, at, at + 0.1)) * (1 - out) })
    })
  })
}

function frameFlash(t: number): void {
  // 打倒以后白闪一下切到片尾
  const up = seg(t, FLASH_AT, FLASH_AT + 0.05)
  const down = seg(t, FLASH_AT + 0.08, FLASH_AT + 0.24)
  style(flash, { opacity: up * (1 - down) * 0.95 })
}

let ready = false
let frameNo = -1

/** 画第 i 帧（必须从 0 起一帧一帧往后画：游戏和彩纸是按帧推进的） */
async function frame(i: number): Promise<void> {
  if (!ready) throw new Error('not ready')
  if (i !== frameNo + 1) throw new Error(`frames must be sequential: got ${i} after ${frameNo}`)
  frameNo = i
  const t = i / FPS
  deco.style.backgroundPosition = `${-t * 14}px ${-t * 9}px, ${32 - t * 14}px ${32 - t * 9}px`
  frameBattle(t)
  frameWin(t)
  frameWall(t)
  frameModes(t)
  frameBoss(t)
  frameEnd(t)
  frameCaptions(t)
  frameFlash(t)
  stepBits(t)
  drawBits()
  lastT = t
  // 等这一帧真的画到屏幕上（截图拿的是合成后的画面）
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())))
}

// ───────────────────────────── 声音 ─────────────────────────────

/** 一个音效：时刻、种类、音高倍数、音量倍数、左右（红队偏左、蓝队偏右，同 B70） */
type Cue = [number, Sfx, number?, number?, number?]
function sfxCues(): Cue[] {
  const cues: Cue[] = [[0.02, 'whoosh', 1, 0.5]]
  const streak = { red: 0, blue: 0 }
  for (const a of ANSWERS) {
    const pan = a.team === 'red' ? -0.45 : 0.45
    streak[a.team]++
    if (a.finger) cues.push([a.at - 0.06, 'tap', 1, 0.8, pan])
    cues.push([a.at, 'ding', streakPitch(streak[a.team]), 0.9, pan])
    // 热气球的得分声
    cues.push([a.at + 0.03, 'burner', 1, 0.7, pan])
    if (a.at === WIN_AT) cues.push([a.at + 0.05, 'fanfare', 1, 0.9], [a.at + 0.1, 'cheer', 1, 0.8])
  }
  const streakAt = ANSWERS[STREAK_ANSWER]!.at
  cues.push([streakAt + 0.05, 'sparkle', 1, 0.8, -0.45], [streakAt + 0.06, 'pop', 1, 0.6])
  FF_SCORES.forEach((_, i) => cues.push([FF_FROM + FF_STEP * i, 'tick', 1 + i * 0.06, 0.45, i % 2 ? 0.4 : -0.4]))
  cues.push([FF_FROM - 0.05, 'whoosh', 1.3, 0.5])
  cues.push([DEUCE_AT, 'heartbeat', 1, 0.95], [DEUCE_AT, 'pop', 1, 0.5])
  // 游戏墙：发牌的「啵」越来越高，墙上的游戏得分「叮」很轻
  for (let i = 0; i < 6; i++) cues.push([WALL_IN + i * 0.09, 'pop', 1 + i * 0.08, 0.45, (i % 3) * 0.4 - 0.4])
  for (const p of wallPoints) cues.push([p.at, 'ding', 1.1 + (p.tile % 4) * 0.08, 0.22, p.team === 'red' ? -0.5 : 0.5])
  cues.push([WALL_OUT, 'whoosh', 1, 0.7])
  for (let i = 0; i < 4; i++) cues.push([MODES_IN + i * 0.1, 'pop', 1 + i * 0.1, 0.5, (i - 1.5) * 0.25])
  cues.push([MODES_OUT, 'whoosh', 0.9, 0.5])
  cues.push([BOSS_IN + 0.12, 'gong', 1, 0.7])
  BOSS_HITS.forEach((h, i) => {
    const pan = h.team === 'red' ? -0.35 : 0.35
    const kind: Sfx = h.move === 'jab' ? 'punch' : h.move === 'hook' ? 'hook' : h.move === 'upper' ? 'upper' : 'smash'
    // 「嘭」对着拳头打到的那一帧（竞技场也是晚 HIT_AT 放）
    cues.push([h.at, kind, 1, 0.95, pan], [h.at + 0.03, 'squeak', 1 + i * 0.1, 0.6, pan])
    if (i === 3) cues.push([h.at, 'clap', 1, 0.6])
  })
  cues.push([KO_AT + 0.08, 'deflate', 1, 0.8], [KO_AT + 0.2, 'cheer', 1, 0.6], [KO_AT + 0.35, 'jingle', 1, 0.8])
  cues.push([FLASH_AT, 'whoosh', 1.2, 0.5])
  cues.push([END_IN + 0.08, 'boing', 1, 0.7], [END_IN + 0.1, 'sparkle', 1, 0.6], [END_IN + 0.36, 'pop', 1.2, 0.5])
  for (let i = 0; i < 3; i++) cues.push([END_IN + 0.62 + i * 0.1, 'tap', 1.2 + i * 0.1, 0.5])
  return cues.sort((a, b) => a[0] - b[0])
}

/**
 * 背景乐：一步 = 八分音符（0.25 秒），一般 8 步一小节、前后半小节各一个和弦；旋律按调内级数，音色、鼓点照 battle/music.ts 的
 * 两首曲子（对战段用赛跑那首的三角波跳音、嘭嚓低音、木鱼；打怪兽段换 Boss 战曲的方波、八分音符低音、鼓）。
 * 小节跟着段落走：赢的那一拍（5.0 秒）落在主和弦、后面空出来给胜利号角；打倒那一下（12.0 秒）是半小节的重音；
 * 片尾「mi sol mi re do」落在主音上拖长。
 */
interface Bar {
  tune: 'race' | 'boss'
  mel: (number | null)[]
  chords: [number, number]
  /** 鼓点：k 大鼓、s 小鼓、h 镲、w 木鱼、c 拍手、x 吊镲 */
  drums: string
  bass: 'oompah' | 'pulse' | 'none'
  pad: boolean
  /** 这一小节第几步到第几步整体安静（留给胜利号角） */
  hush?: [number, number]
  /** 片尾：第 4 步的主音拖长、配一个长和弦 */
  final?: boolean
}
const _ = null
const BARS: Bar[] = [
  // 0–2 秒：开场、第一题
  { tune: 'race', mel: [5, _, 3, 5, 8, _, 5, 3], chords: [1, 1], drums: 'k.w.k.w.', bass: 'oompah', pad: true },
  // 2–4 秒：你来我往
  { tune: 'race', mel: [6, _, 5, 6, 8, _, 6, 4], chords: [6, 4], drums: 'k.w.k.w.', bass: 'oompah', pad: true },
  // 4–6 秒：决胜题（属和弦）→ 5.0 秒赢（主和弦一下，号角接上）
  { tune: 'race', mel: [5, _, 7, _, _, _, _, _], chords: [5, 1], drums: 'k...x...', bass: 'oompah', pad: true, hush: [5, 8] },
  // 6–8 秒：游戏墙
  { tune: 'race', mel: [6, _, 4, 6, 9, 7, 5, 4], chords: [4, 5], drums: 'khwhkhwc', bass: 'oompah', pad: true },
  // 8–10 秒：怎么玩
  { tune: 'race', mel: [4, 5, 6, _, 9, _, 7, 5], chords: [4, 5], drums: 'k.w.k.wc', bass: 'oompah', pad: true },
  // 10–12 秒：打怪兽（Boss 战曲，A 小调——C 大调的关系小调，接得上）
  { tune: 'boss', mel: [8, _, 8, 7, 5, _, 3, _], chords: [1, 1], drums: 'k.skkhsh', bass: 'pulse', pad: true },
  // 12–12.5 秒：打倒啦（半小节，重音后空着）
  { tune: 'boss', mel: [_, _], chords: [1, 1], drums: 'x.', bass: 'none', pad: false },
  // 12.5 秒起：片尾
  { tune: 'race', mel: [3, 5, 3, 2, 1, _, _, _], chords: [1, 1], drums: 'k...x...', bass: 'oompah', pad: true, final: true },
]
const STEP = 60 / 120 / 2
const midiHz = (n: number): number => 440 * 2 ** ((n - 69) / 12)

function renderMusic(ac: BaseAudioContext, out: AudioNode): void {
  let noiseBuf: AudioBuffer | null = null
  const noise = (): AudioBuffer => {
    if (noiseBuf) return noiseBuf
    const len = Math.floor(ac.sampleRate * 1.2)
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate)
    const d = noiseBuf.getChannelData(0)
    const r = rng(7)
    for (let i = 0; i < len; i++) d[i] = r() * 2 - 1
    return noiseBuf
  }
  // 包络同 battle/music.ts：pluck 跳音、soft 柔和、bell 钟琴
  const note = (freq: number, at: number, dur: number, type: OscillatorType, env: 'pluck' | 'soft' | 'bell', peak: number) => {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, at)
    const end = env === 'pluck' ? at + Math.max(0.12, dur) : env === 'soft' ? at + dur * 1.2 : at + Math.max(0.9, dur)
    g.gain.exponentialRampToValueAtTime(peak, at + (env === 'soft' ? 0.05 : env === 'bell' ? 0.004 : 0.006))
    g.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(g)
    g.connect(out)
    osc.start(at)
    osc.stop(end + 0.02)
  }
  const DRUMS: Record<string, { gain: number; f?: number; q?: number; d: number; tone?: [number, number] }> = {
    k: { gain: 0.75, d: 0.16, tone: [120, 45] },
    s: { gain: 0.32, d: 0.12, f: 1800, q: 0.7 },
    h: { gain: 0.12, d: 0.04, f: 8000, q: 0.8 },
    w: { gain: 0.3, d: 0.05, tone: [900, 700] },
    c: { gain: 0.25, d: 0.08, f: 1500, q: 1.2 },
    x: { gain: 0.3, d: 0.9, f: 6500, q: 0.4 },
  }
  const drum = (ch: string, at: number) => {
    const d = DRUMS[ch]
    if (!d) return
    const g = ac.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(d.gain, at + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, at + d.d)
    g.connect(out)
    if (d.tone) {
      const osc = ac.createOscillator()
      osc.type = ch === 'k' ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(d.tone[0], at)
      osc.frequency.exponentialRampToValueAtTime(d.tone[1], at + d.d)
      osc.connect(g)
      osc.start(at)
      osc.stop(at + d.d + 0.02)
      return
    }
    const src = ac.createBufferSource()
    src.buffer = noise()
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = d.f ?? 2000
    bp.Q.value = d.q ?? 1
    src.connect(bp)
    bp.connect(g)
    src.start(at)
    src.stop(at + d.d + 0.02)
  }
  let t0 = 0
  BARS.forEach((bar, bi) => {
    const tune: Tune = TUNES[bar.tune]!
    const n = bar.mel.length
    const half = n / 2
    const root = (deg: number) => {
      let m = degreeMidi(tune, deg, -24)
      while (m < 36) m += 12
      return m
    }
    for (let i = 0; i < n; i++) {
      const at = t0 + i * STEP
      if (bar.hush && i >= bar.hush[0] && i < bar.hush[1]) continue
      const chord = bar.chords[i < half ? 0 : 1]
      const m = bar.mel[i]
      const last = bar.final && i === 4
      if (m !== null && m !== undefined) {
        let hold = 1
        while (i + hold < n && bar.mel[i + hold] === null && hold < 4) hold++
        note(midiHz(degreeMidi(tune, m)), at, last ? 1.5 : STEP * hold * 0.95, tune.lead.type, last ? 'bell' : 'pluck', 0.55 * (tune.lead.gain ?? 1))
      }
      // 低音：嘭嚓（第 1 拍根音、第 3 拍下一个和弦的根音或五度）/ 八分音符的根音
      if (bar.bass === 'oompah') {
        if (i === 0) note(midiHz(root(bar.chords[0])), at, STEP * 1.5, 'sine', 'soft', 0.75)
        else if (i === half) note(midiHz(bar.chords[1] !== bar.chords[0] ? root(bar.chords[1]) : root(bar.chords[0] + 4)), at, last ? 1.5 : STEP * 1.5, 'sine', 'soft', 0.75)
      } else if (bar.bass === 'pulse') note(midiHz(root(chord)), at, STEP * 0.9, 'sine', 'soft', 0.75)
      // 反拍的短和弦；赢的那一拍、片尾最后一个和弦拖长
      const tones = [chord, chord + 2, chord + 4].map((d) => degreeMidi(tune, d, 0))
      if (bar.pad && (i === 2 || i === 6) && !(bar.final && i === 6)) for (const f of tones) note(midiHz(f), at, STEP * 0.9, 'triangle', 'pluck', 0.12 * 1.4)
      if (bi === 2 && i === 4) for (const f of tones) note(midiHz(f), at, 0.9, 'triangle', 'soft', 0.16)
      if (last) for (const f of tones) note(midiHz(f), at, 1.4, 'sine', 'soft', 0.14)
      const ch = bar.drums[i] ?? '.'
      if (ch !== '.') drum(ch, at)
    }
    t0 += n * STEP
  })
}

/** 三路的音量：旁白最响，音效其次，背景乐垫底、旁白说话时再压到 MUSIC_DUCK_K 倍（响度最后由 promo.mjs 统一拉到 -16 LUFS） */
const VOICE_GAIN = 0.9
const SFX_GAIN = 1.0
const MUSIC_GAIN = 0.5
const MUSIC_DUCK_K = 0.55

/**
 * 给 playSfx 的「AudioContext」：engine/audio.ts 第一次用时 new 一个就一直留着，所以这里只给它一个代理，
 * 每次渲染把代理背后换成这次的离线上下文；currentTime 是虚拟时钟（= 要放的时刻），destination 是音效那一路
 */
const sfxTarget: { ac: BaseAudioContext | null; dest: AudioNode | null; now: number } = { ac: null, dest: null, now: 0 }
const sfxContext = new Proxy({} as AudioContext, {
  get(_t, prop) {
    const ac = sfxTarget.ac
    if (!ac) return undefined
    if (prop === 'currentTime') return sfxTarget.now
    if (prop === 'destination') return sfxTarget.dest
    if (prop === 'state') return 'running'
    const v = Reflect.get(ac, prop, ac) as unknown
    return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(ac) : v
  },
  has: (_t, prop) => (sfxTarget.ac ? prop in sfxTarget.ac : false),
})

/** 渲染整段声音，返回 WAV（base64）。voices：每句旁白的音频（base64，按 VOICE_AT 的顺序）；only：只出一路（查电平用） */
async function audio(voices: string[], only?: 'music' | 'sfx' | 'voice'): Promise<string> {
  const SR = 48000
  const ac = new OfflineAudioContext(2, Math.ceil(SR * DURATION), SR)
  const master = ac.createGain()
  master.connect(ac.destination)
  const bus = (name: 'music' | 'sfx' | 'voice', gain: number): GainNode => {
    const g = ac.createGain()
    g.gain.value = only && only !== name ? 0 : gain
    g.connect(master)
    return g
  }
  const musicBus = bus('music', MUSIC_GAIN)
  renderMusic(ac, musicBus)
  const voiceBus = bus('voice', VOICE_GAIN)
  for (let i = 0; i < voices.length; i++) {
    const bytes = Uint8Array.from(atob(voices[i]!), (c) => c.charCodeAt(0))
    const buf = await ac.decodeAudioData(bytes.buffer)
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(voiceBus)
    src.start(VOICE_AT[i]!)
    // 旁白说话时背景乐让一让
    if (!only || only === 'music') {
      musicBus.gain.setTargetAtTime(MUSIC_GAIN * MUSIC_DUCK_K, VOICE_AT[i]! - 0.08, 0.05)
      musicBus.gain.setTargetAtTime(MUSIC_GAIN, VOICE_AT[i]! + buf.duration, 0.15)
    }
  }
  // 音效：playSfx 拿到的 AudioContext 是上面的代理，「现在」= 要放的时刻
  sfxTarget.ac = ac
  sfxTarget.dest = bus('sfx', SFX_GAIN)
  ;(window as unknown as { AudioContext: unknown }).AudioContext = function PromoAudioContext() {
    return sfxContext
  }
  for (const [at, kind, pitch = 1, gain = 1, pan = 0] of sfxCues()) {
    sfxTarget.now = at
    playSfx(kind, pitch, gain, pan)
  }
  return wavBase64(await ac.startRendering())
}

function wavBase64(buf: AudioBuffer): string {
  const ch = buf.numberOfChannels
  const n = buf.length
  const view = new DataView(new ArrayBuffer(44 + n * ch * 2))
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  view.setUint32(4, 36 + n * ch * 2, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, ch, true)
  view.setUint32(24, buf.sampleRate, true)
  view.setUint32(28, buf.sampleRate * ch * 2, true)
  view.setUint16(32, ch * 2, true)
  view.setUint16(34, 16, true)
  str(36, 'data')
  view.setUint32(40, n * ch * 2, true)
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c))
  let o = 44
  for (let i = 0; i < n; i++)
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, data[c]![i]!))
      view.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true)
      o += 2
    }
  let bin = ''
  const u8 = new Uint8Array(view.buffer)
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(bin)
}

// ───────────────────────────── 启动 ─────────────────────────────

async function boot(): Promise<void> {
  // 字幕用 macOS 的圆体（Yuanti SC）、英文 Avenir Next，拼音 Andika（站里自带），汉字选项楷体
  const fonts = ['400 60px Andika', '700 68px "Yuanti SC"', '800 62px "Avenir Next"', '600 60px "PingFang SC"', '400 64px "Kaiti SC"']
  await Promise.all(fonts.map((f) => document.fonts.load(f, '答对课本题abc āáǎà 火山')))
  await Promise.all(Array.from(document.images).map((img) => (img.complete ? Promise.resolve() : img.decode().catch(() => undefined))))
  await document.fonts.ready
  await setupGames()
  ready = true
}

/** promo.mjs 与这一页之间的约定 */
interface PromoApi {
  ready: () => boolean
  error?: string
  frames: number
  fps: number
  /** 首页封面用第几帧 */
  poster: number
  /** 旁白：音色与每句要合成的文字、语速（按 VOICE_AT 的顺序） */
  voice: { name: string; lines: Say[] }
  /** 渲染前交进来：「怎么玩」那句旁白里每段开口的时刻（四个数，相对这句开口） */
  configure: (cfg: { cues?: number[] }) => void
  frame: (i: number) => Promise<void>
  audio: (voices: string[], only?: 'music' | 'sfx' | 'voice') => Promise<string>
}
declare global {
  interface Window {
    __promo: PromoApi
  }
}
window.__promo = {
  ready: () => ready,
  frames: Math.round(DURATION * FPS),
  fps: FPS,
  poster: Math.round(POSTER_AT * FPS),
  voice: { name: TEXT.voice, lines: TEXT.says },
  configure(cfg) {
    if (cfg.cues?.length === 4) modeCues = cfg.cues
  },
  frame,
  audio,
}
boot().catch((e: unknown) => {
  window.__promo.error = String((e as Error)?.stack ?? e)
})
