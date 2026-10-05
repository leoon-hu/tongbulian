// 语文的出题骨架（需求 §9）：一课的材料（LessonSpec，纯数据）→ 一组「题目模板」，每个模板一批题目条目（Item），
// 生成器按档位的权重挑模板、再随机挑条目出题。条目是确定的（签名 = 模板 + 条目），所以一轮里同一道题不会出两次；
// 干扰项与选项顺序每次随机。只依赖引擎与类型，node 里能单测。
import type { ChoiceStyle, Difficulty, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { labelKey, numberQuestion, sigId } from '@/engine'
import { translate } from '@/engine/i18n'
import { LETTER_SAY, TONE_SAY, addTone, splitSyllable, splitTone, syllableDistractors } from './syllables'
import type { LessonSpec, PinyinSpec } from './spec'
import './prompts' // 副作用：注册题目要求（inPrompt 要查）
import { READINGS } from './readings'

/** 一个选项：显示的文字（要注音的走词条）+ 朗读时读什么（中文，不填读 label） */
export interface Opt {
  label: LStr
  say?: string
}

/** 出题需要的上下文：知识点 id、拼音表、要注音的词语、学过哪些拼音 */
export interface Ctx {
  kp: string
  /** 中文内容 → 拼音（与汉字逐个对齐）；查不到抛错（测试会查全） */
  py: (text: string) => string
  /** 要注音的中文 → 词条（yw.*，拼音来自拼音表） */
  word: (text: string) => LStr
  /** 拼音学过没有：上册第一单元还没学拼音，不出看拼音 / 选读音的题（Y5） */
  pinyinReady: boolean
  /** 拼音课里干扰项能用的声母 / 韵母（学到本课为止的）；拼音单元以后是 null = 不限 */
  learned: { initials: ReadonlySet<string>; finals: ReadonlySet<string> } | null
  /** 读一个字：多音字按它在本年级拼音表里的读音给个词（sayZi） */
  say: (c: string) => string
}

/** 一道题的条目：key 是签名的一部分（模板名 + 条目），build 每次出一道（干扰项、选项顺序随机） */
export interface Item {
  key: string
  build: (d: Difficulty, rng: RNG) => Question
}

const IDS = ['a', 'b', 'c', 'd', 'e', 'f']

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
  const choices = pool.map((o, i) => ({ id: IDS[i]!, label: o.label, ...(o.say !== undefined ? { say: o.say } : {}) }))
  return { choices, correctId: IDS[pool.indexOf(correct)]! }
}

function choiceQ(
  ctx: Ctx,
  type: QuestionType,
  d: Difficulty,
  sig: string,
  stem: StemPart[],
  correct: Opt,
  wrongs: Opt[],
  rng: RNG,
  style?: ChoiceStyle,
): Question {
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
const plain = (s: string): Opt => ({ label: s })
const HAN = /\p{Script=Han}/u
const EMOJI_HEAD = /^(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?)*)\s*/u
const split = (s: string | undefined, sep = /\s+/): string[] => (s ? s.split(sep).map((x) => x.trim()).filter(Boolean) : [])

// ── 形近字、多音字、偏旁、作者、标点：几张小表 ────────────────────────────

/** 形近字（第 2 档起的干扰项，Y5）：同一组里的字长得像 */
const SIMILAR_GROUPS = [
  '日目白田电旧', '人入八大个从', '天夫大太犬', '土士王工干主', '木本禾术米末未', '口日回中四', '火大水米', '山出川仙',
  '月用有肚', '手毛看', '了子字学', '己已巳', '牛午年', '鸟乌马岛', '儿几九', '刀力方万', '小少尖', '上下止正',
  '左右石在', '今令会', '见贝页', '自白百', '青清晴睛请情', '雨两再', '头买实', '去云会', '气飞乞', '东车乐',
  '北比此', '可哥河', '西四酉', '林森村', '明朋阴', '男田里', '尖尘少', '从众丛', '书节我', '早草旱', '国困围',
  '米来采', '禾和秋', '羊美洋', '牙呀芽', '巴把爸吧', '也他地池', '长张', '半伴胖', '门们问', '尺尽', '只兄叫',
  '石右古', '江红工', '可叶吐', '冬各', '星生姓', '春秦奏', '花化华', '虫出史', '风凤', '树对', '寸村过',
]
const SIMILAR = new Map<string, string[]>()
for (const g of SIMILAR_GROUPS) {
  for (const c of g) SIMILAR.set(c, [...new Set([...(SIMILAR.get(c) ?? []), ...[...g].filter((x) => x !== c)])])
}

/**
 * 多音字：听音题与「正确答案是 X」读的时候给个词（Y6），单读一个字合成语音按它最常见的读音读（重 zhòng、倒 dǎo）。
 * 按读音分开写：同一个字在不同的课读不同的音（一年级「重要的重」，二年级《寒号鸟》「重复的重」），读哪个词看这个字
 * 在这一课的读音（生字按本年级拼音表，填空的答案按它在那句课文里的读音）；没有这个读音的词就用第一个。
 * 「X 的 X」末尾单独那个字合成时也常按最常见的读音读（高兴的兴读成 xīng），scripts/build-audio.py 的 POLY_TAIL
 * 把这些词的末尾换成读音唯一的同音字再合成——改了这里的词要同步那张表（测试查）。
 * 不在表里的多音字单读就是本课读音（逐个比过基频），拿不准的干脆不出听音题。
 */
export const POLY_SAY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  长: { cháng: '长短的长', zhǎng: '长大的长' },
  行: { xíng: '行走的行' },
  为: { wèi: '为什么的为', wéi: '成为的为' },
  数: { shǔ: '数一数的数', shù: '数学的数' },
  乐: { lè: '快乐的乐' },
  觉: { jiào: '睡觉的觉' },
  朝: { zhāo: '朝霞的朝' },
  降: { jiàng: '下降的降' },
  落: { luò: '落下的落' },
  露: { lù: '露水的露' },
  藏: { cáng: '捉迷藏的藏' },
  空: { kōng: '天空的空' },
  种: { zhòng: '种花的种' },
  教: { jiāo: '教书的教', jiào: '教室的教' },
  背: { bēi: '背书包的背', bèi: '后背的背' },
  还: { hái: '还有的还' },
  只: { zhī: '一只的只' },
  少: { shǎo: '多少的少' },
  相: { xiāng: '互相的相' },
  着: { zhe: '看着的着', zháo: '着急的着' },
  们: { men: '我们的们' },
  么: { me: '什么的么' },
  爪: { zhuǎ: '爪子的爪' },
  地: { dì: '大地的地' },
  得: { dé: '得到的得', de: '跑得快的得' },
  了: { le: '好了的了' },
  发: { fā: '发芽的发' },
  干: { gān: '干净的干', gàn: '干活的干' },
  华: { huá: '中华的华' },
  兴: { xìng: '高兴的兴' },
  奇: { qí: '奇怪的奇' },
  假: { jiǎ: '真假的假' },
  和: { hé: '和平的和' },
  重: { zhòng: '重要的重', chóng: '重复的重' },
  没: { méi: '没有的没' },
  处: { chù: '到处的处' },
  好: { hǎo: '好人的好' },
  中: { zhōng: '中间的中' },
  更: { gèng: '更好的更' },
  应: { yīng: '应该的应' },
  便: { biàn: '方便的便' },
  调: { tiáo: '调皮的调' },
  扇: { shàn: '扇子的扇' },
  薄: { báo: '薄厚的薄' },
  传: { chuán: '传说的传' },
  参: { cān: '参加的参' },
  仔: { zǐ: '仔细的仔' },
  散: { sàn: '散步的散' },
  模: { mú: '一模一样的模', mó: '模型的模' },
  悄: { qiāo: '悄悄的悄' },
  翘: { qiào: '翘起来的翘' },
  壳: { ké: '贝壳的壳' },
  挣: { zhèng: '挣断的挣' },
  折: { zhé: '折纸的折' },
  燕: { yàn: '燕子的燕' },
  // 一年级下册的生字
  什: { shén: '什么的什' },
  都: { dōu: '都是的都' },
  结: { jié: '结网的结' },
  斗: { dǒu: '北斗的斗' },
  呀: { ya: '来呀的呀' },
  呢: { ne: '你呢的呢' },
  吗: { ma: '好吗的吗' },
  吧: { ba: '走吧的吧' },
  啊: { a: '好啊的啊' },
  啦: { la: '来啦的啦' },
  哪: { nǎ: '哪里的哪' },
  那: { nà: '那里的那' },
  过: { guò: '过河的过' },
  转: { zhuǎn: '转身的转' },
  // 二年级
  柏: { bǎi: '松柏的柏' },
  系: { jì: '系鞋带的系' },
  倒: { dào: '倒映的倒' },
  钉: { dìng: '钉扣子的钉' },
  将: { jiāng: '将来的将' },
  担: { dàn: '担子的担' },
  笼: { lǒng: '笼罩的笼' },
  杆: { gǎn: '杠杆的杆' },
  扎: { zā: '扎辫子的扎' },
  量: { liàng: '力量的量' },
  吐: { tǔ: '吐出的吐' },
  蒙: { méng: '蒙蒙细雨的蒙' },
  磨: { mò: '石磨的磨' },
  坊: { fáng: '磨坊的坊' },
  哗: { huā: '哗哗的哗' },
  佛: { fú: '仿佛的佛' },
  簸: { bò: '簸箕的簸' },
  切: { qiè: '一切的切' },
  舍: { shě: '舍不得的舍' },
  // 「X似的似」的头一个似后面是「的」，合成脚本按「似的」换成 shì，所以 sì 用「似乎」
  似: { sì: '似乎的似', shì: '似的的似' },
  铺: { pù: '下铺的铺' },
  // 三年级
  挨: { ái: '挨打的挨', āi: '挨着的挨' },
  粘: { zhān: '粘贴的粘' },
  匙: { shi: '钥匙的匙' },
  喇: { lǎ: '喇叭的喇' },
  卷: { juǎn: '卷起的卷' },
  划: { huá: '划船的划' },
  载: { zài: '满载的载' },
  臂: { bì: '手臂的臂' },
  禁: { jìn: '禁止的禁', jīn: '不禁的禁' },
  差: { chà: '差不多的差', chā: '差别的差' },
  缝: { fèng: '门缝的缝', féng: '缝衣服的缝' },
  旋: { xuán: '旋转的旋', xuàn: '旋风的旋' },
  晃: { huàng: '摇晃的晃' },
  血: { xuè: '血液的血' },
  琢: { zuó: '琢磨的琢' },
  裳: { shang: '衣裳的裳' },
  恶: { è: '凶恶的恶' },
  屏: { bǐng: '屏住的屏' },
  脯: { pú: '胸脯的脯' },
  卜: { bo: '萝卜的卜' },
  隆: { lōng: '轰隆的隆' },
  闷: { mēn: '闷热的闷', mèn: '沉闷的闷' },
  咳: { ké: '咳嗽的咳' },
  唠: { láo: '唠叨的唠' },
  叨: { dāo: '唠叨的叨' },
}

/** 读一个字：多音字给个词——按这个字的读音挑，不给读音或没有这个读音的词就用第一个 */
export function sayZi(c: string, py?: string): string {
  const byPy = POLY_SAY[c]
  if (!byPy) return c
  return (py === undefined ? undefined : byPy[py]) ?? Object.values(byPy)[0]!
}

/**
 * 生字：「结 果 结jiē」→ 字的清单 + 本课读音。同一个字在识字表里不同的课读音不同（结 jié / jiē、空 kōng / kòng），
 * 本年级拼音表的单字只有一个读音，跟它不一样的那一课在字后面写上读音（声调符号）
 */
export function parseZi(s: string | undefined): { chars: string[]; reading: Record<string, string> } {
  const chars: string[] = []
  const reading: Record<string, string> = {}
  for (const x of split(s)) {
    const m = /^(\p{Script=Han})([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]*)$/u.exec(x)
    if (!m) throw new Error(`bad zi item: ${x}`)
    chars.push(m[1]!)
    if (m[2]) reading[m[1]!] = m[2]
  }
  return { chars, reading }
}

/** 本课有自己读音的字：查拼音、读字都先看本课的读音 */
function withReadings(ctx: Ctx, reading: Record<string, string>): Ctx {
  if (Object.keys(reading).length === 0) return ctx
  return {
    ...ctx,
    py: (t) => reading[t] ?? ctx.py(t),
    say: (c) => (reading[c] !== undefined ? sayZi(c, reading[c]) : ctx.say(c)),
  }
}

/** 偏旁：写法 → 名称（偏旁题的干扰项、朗读） */
export const RADICALS: Readonly<Record<string, string>> = {
  亻: '单人旁',
  彳: '双人旁',
  氵: '三点水',
  冫: '两点水',
  扌: '提手旁',
  口: '口字旁',
  日: '日字旁',
  目: '目字旁',
  木: '木字旁',
  女: '女字旁',
  讠: '言字旁',
  忄: '竖心旁',
  艹: '草字头',
  虫: '虫字旁',
  足: '足字旁',
  土: '土字旁',
  禾: '禾木旁',
  鸟: '鸟字旁',
  犭: '反犬旁',
  饣: '食字旁',
  衤: '衣字旁',
  火: '火字旁',
  月: '月字旁',
  纟: '绞丝旁',
  辶: '走之',
  宀: '宝盖',
  王: '王字旁',
  米: '米字旁',
  雨: '雨字头',
  钅: '金字旁',
  竹: '竹字头',
  // 二年级的部首查字法（Y9）
  广: '广字旁',
  疒: '病字旁',
  门: '门字框',
  穴: '穴宝盖',
  攵: '反文旁',
  页: '页字旁',
  刂: '立刀旁',
  力: '力字旁',
  贝: '贝字旁',
  石: '石字旁',
  走: '走字旁',
  车: '车字旁',
  囗: '国字框',
  冖: '秃宝盖',
  心: '心字底',
  灬: '四点底',
  皿: '皿字底',
  巾: '巾字旁',
  山: '山字旁',
  马: '马字旁',
  牛: '牛字旁',
  鱼: '鱼字旁',
  舟: '舟字旁',
  尸: '尸字头',
  厂: '厂字头',
  户: '户字头',
  寸: '寸字旁',
  弓: '弓字旁',
  子: '子字旁',
  田: '田字旁',
  金: '金字底',
}

/** 「哪个字是某某旁」的干扰字：一年级常见的字和它的偏旁（与本课的偏旁不同的才用） */
const RADICAL_POOL: readonly [string, string][] = [
  ['妈', '女'], ['姐', '女'], ['他', '亻'], ['们', '亻'], ['河', '氵'], ['江', '氵'], ['打', '扌'], ['拍', '扌'],
  ['吃', '口'], ['叫', '口'], ['明', '日'], ['晴', '日'], ['林', '木'], ['树', '木'], ['蚂', '虫'], ['蛙', '虫'],
  ['跑', '足'], ['跳', '足'], ['说', '讠'], ['语', '讠'], ['快', '忄'], ['情', '忄'], ['花', '艹'], ['草', '艹'],
  ['鸭', '鸟'], ['鸡', '鸟'], ['猫', '犭'], ['狗', '犭'], ['饭', '饣'], ['地', '土'], ['秋', '禾'], ['红', '纟'],
  ['远', '辶'], ['家', '宀'], ['睛', '目'], ['眼', '目'], ['冰', '冫'], ['你', '亻'],
]

/** 课本里出现的诗人（作者题的干扰项） */
const POETS = ['李白', '杜甫', '白居易', '孟浩然', '骆宾王', '杨万里', '李绅', '贾岛', '唐寅', '李峤', '王维', '贺知章']

/** 标点的读法（「正确答案是问号」） */
const PUNCT_SAY: Readonly<Record<string, string>> = { '。': '句号', '？': '问号', '！': '感叹号', '，': '逗号', '、': '顿号' }

// ── 模板 ───────────────────────────────────────────────────────────────

/** 一个字的全部读音（READINGS，多音字全列） */
export const readingsOf = (c: string): string[] => READINGS[c]?.split(' ') ?? []
/** 两个字有没有相同的读音：有就不能一个当另一个的干扰项（听音选字会两个都对） */
export const sameSound = (a: string, b: string): boolean => {
  const ra = readingsOf(a)
  return readingsOf(b).some((r) => ra.includes(r))
}

/** 挑干扰字：第 2 档起先挑形近字，再从本课的字里补；exclude 排除会让题目有两个对的（同音字） */
function charWrongs(c: string, pool: string[], d: Difficulty, rng: RNG, exclude: (x: string) => boolean = () => false): string[] {
  const near = d >= 2 ? rng.shuffle(SIMILAR.get(c) ?? []) : []
  const rest = rng.shuffle(pool)
  return [...near.slice(0, 2), ...rest, ...near.slice(2)].filter((x) => x !== c && !exclude(x))
}

/**
 * 考认字的题，考的字要是出现在题目要求里（「选出你听到的字」里的「你」、「这个字怎么读」里的「读」），
 * 要求那一行是注音的，等于把答案摆在眼前——这样的字不出这种题（需求 Y3）
 */
const inPrompt = (key: string, c: string): boolean => translate({ k: key }, 'zh').includes(c)

/** 听音选字：大喇叭读一个字（多音字给个词），四个不注音的楷体字里选；答错读「正确答案是」也读那个词 */
function listenItems(ctx: Ctx, zi: string[]): Item[] {
  return zi.filter((c) => !inPrompt('yq.listenZi', c)).map((c) => ({
    key: `listen-${c}`,
    build: (d, rng) => {
      const say = ctx.say(c)
      const right: Opt = say === c ? plain(c) : { label: c, say }
      return choiceQ(ctx, 'hanzi', d, `listen-${c}`, [text('yq.listenZi'), { kind: 'listen', say }], right, charWrongs(c, zi, d, rng, (x) => sameSound(x, c)).map(plain), rng, 'hanzi')
    },
  }))
}

/** 看拼音选字：拼音卡（不读），四个楷体字里选；能读成这个音的字（含多音字的别的读音）不当干扰项 */
function pyZiItems(ctx: Ctx, zi: string[]): Item[] {
  return zi.filter((c) => !inPrompt('yq.pyZi', c)).map((c) => ({
    key: `pyzi-${c}`,
    build: (d, rng) => {
      const py = ctx.py(c)
      return choiceQ(ctx, 'hanzi', d, `pyzi-${c}`, [text('yq.pyZi'), { kind: 'pinyin', text: py }], { label: c, say: ctx.say(c) }, charWrongs(c, zi, d, rng, (x) => readingsOf(x).includes(py)).map(plain), rng, 'hanzi')
    },
  }))
}

/** 看字选读音：田字格大字（不读），四个音节里选；轻声字不出；这个字别的读音不当干扰项（多音字：好 hǎo / hào） */
function ziPyItems(ctx: Ctx, zi: string[]): Item[] {
  return zi
    .filter((c) => splitTone(ctx.py(c)).tone !== 0 && !inPrompt('yq.ziPy', c))
    .map((c) => ({
      key: `zipy-${c}`,
      build: (d, rng) => {
        const py = ctx.py(c)
        const others = readingsOf(c)
        const wrongs = syllableDistractors(py, rng, { ...(ctx.learned ?? {}), count: 6 })
          .filter((w) => !others.includes(w))
          .slice(0, 3)
          .map(plain)
        return choiceQ(ctx, 'hanzi', d, `zipy-${c}`, [text('yq.ziPy'), { kind: 'hanzi', text: c }], { label: py, say: ctx.say(c) }, wrongs, rng, 'pinyin')
      },
    }))
}

/** 看图：「图 字或词 读法」→ 看图选字 / 词（楷体），以及看字选图 */
interface PicItem {
  icon: string
  target: string
  say: string
}
function parsePic(s: string): PicItem {
  const [icon, target, say] = split(s)
  if (!icon || !target) throw new Error(`bad pic item: ${s}`)
  return { icon, target, say: say ?? target }
}
function picItems(ctx: Ctx, pics: PicItem[], zi: string[]): Item[] {
  return pics.filter((p) => !inPrompt(Array.from(p.target).length === 1 ? 'yq.picZi' : 'yq.picWord', p.target)).map((p) => ({
    key: `pic-${p.target}`,
    build: (d, rng) => {
      const single = Array.from(p.target).length === 1
      const same = pics.filter((o) => o !== p && (Array.from(o.target).length === 1) === single).map((o) => o.target)
      const pool = single ? [...same, ...zi] : same
      const wrongs = single ? charWrongs(p.target, pool, d, rng) : rng.shuffle(pool)
      const key = single ? 'yq.picZi' : 'yq.picWord'
      return choiceQ(ctx, 'hanzi', d, `pic-${p.target}`, [text(key), { kind: 'picture', icon: p.icon, say: p.say }], { label: p.target, say: ctx.say(p.target) }, wrongs.map(plain), rng, 'hanzi')
    },
  }))
}
function ziPicItems(ctx: Ctx, pics: PicItem[]): Item[] {
  return pics.map((p) => ({
    key: `zipic-${p.target}`,
    build: (d, rng) => {
      const wrongs = rng.shuffle(pics.filter((o) => o.icon !== p.icon && o.target !== p.target)).map((o) => ({ label: o.icon, say: o.say }))
      return choiceQ(ctx, 'hanzi', d, `zipic-${p.target}`, [text('yq.ziPic'), { kind: 'hanzi', text: p.target }], { label: p.icon, say: p.say }, wrongs, rng, 'emoji')
    },
  }))
}

/** 写字：「口3竖」= 字 + 笔画数 + 第一笔（可省） */
interface XieItem {
  c: string
  n: number
  first?: string
}
function parseXie(s: string): XieItem {
  const m = /^(\p{Script=Han})(\d+)(横|竖|撇|点)?$/u.exec(s)
  if (!m) throw new Error(`bad xie item: ${s}`)
  return { c: m[1]!, n: Number(m[2]), first: m[3] }
}
function strokeItems(ctx: Ctx, xie: XieItem[]): Item[] {
  return xie.map((x) => ({
    key: `strokes-${x.c}`,
    build: (d, rng) =>
      // 选择题时干扰项就在答案上下一两画（「14 画」这种一看就不对的不出）
      numberQuestion({ kpId: ctx.kp, type: 'writing', difficulty: d, sig: `strokes-${x.c}`, stem: [text('yq.strokes'), { kind: 'hanzi', text: x.c }], value: x.n, rng, min: 1, max: x.n + 3, smart: [x.n + 1, x.n - 1, x.n + 2] }),
  }))
}
const STROKES = ['横', '竖', '撇', '点']
function firstItems(ctx: Ctx, xie: XieItem[]): Item[] {
  return xie
    .filter((x) => x.first)
    .map((x) => ({
      key: `first-${x.c}`,
      build: (d, rng) =>
        choiceQ(ctx, 'writing', d, `first-${x.c}`, [text('yq.first'), { kind: 'hanzi', text: x.c }], { label: ctx.word(x.first!) }, STROKES.filter((s) => s !== x.first).map((s) => ({ label: ctx.word(s) })), rng),
    }))
}

/** 数字 ↔ 汉字（「1一 2二」）：看数字选汉字（楷体），看汉字按数字 */
function digitItems(ctx: Ctx, pairs: [number, string][]): Item[] {
  const out: Item[] = []
  for (const [n, c] of pairs) {
    out.push({
      key: `digit-${n}`,
      build: (d, rng) =>
        choiceQ(ctx, 'hanzi', d, `digit-${n}`, [text('yq.digit'), { kind: 'hanzi', text: String(n) }], plain(c), charWrongs(c, pairs.map((p) => p[1]), d, rng).map(plain), rng, 'hanzi'),
    })
    out.push({
      key: `zidigit-${n}`,
      build: (d, rng) =>
        numberQuestion({ kpId: ctx.kp, type: 'hanzi', difficulty: d, sig: `zidigit-${n}`, stem: [text('yq.ziDigit'), { kind: 'hanzi', text: c }], value: n, rng, min: 1, max: 10 }),
    })
  }
  return out
}

/** 选词填空：「课文句子，挖掉的用 [ ] 括起来|干扰/干扰/干扰」，开头 ! = 选项是楷体字（考认字） */
export interface ClozeItem {
  /** 显示的句子（「\n」换行） */
  text: string
  blank: [number, number]
  answer: string
  wrongs: string[]
  bare: boolean
}
export function parseCloze(s: string): ClozeItem {
  const bare = s.startsWith('!')
  const body = bare ? s.slice(1) : s
  const [sentence, rest] = body.split('|')
  const m = /\[([^\]]+)\]/.exec(sentence ?? '')
  if (!sentence || !m || rest === undefined) throw new Error(`bad cloze item: ${s}`)
  const before = Array.from(sentence.slice(0, m.index))
  const answer = m[1]!
  const shown = sentence.replace(/[[\]]/g, '')
  return { text: shown, blank: [before.length, Array.from(answer).length], answer, wrongs: split(rest, /\//), bare }
}
/** 句子（去掉换行）就是拼音表的键 */
export const verseKey = (t: string): string => t.replace(/\n/g, '')
/** 选项读什么：标点读名字，一个多音字给个词（py = 它在这句里的读音，干扰项不给就用第一个词） */
function sayOpt(s: string, py?: string): string | undefined {
  return PUNCT_SAY[s] ?? (Array.from(s).length === 1 && POLY_SAY[s] ? sayZi(s, py) : undefined)
}
/** 填空的答案是一个字时，它在这句课文里的读音（多音字的答案按这个挑词读） */
export function clozeAnswerPy(ctx: Pick<Ctx, 'py'>, it: ClozeItem): string | undefined {
  if (Array.from(it.answer).length !== 1 || !HAN.test(it.answer)) return undefined
  const at = Array.from(it.text).slice(0, it.blank[0]).filter((c) => HAN.test(c)).length
  return ctx.py(verseKey(it.text)).split(' ')[at]
}
function clozeItems(ctx: Ctx, items: ClozeItem[]): Item[] {
  return items.map((it) => {
    const key = `cloze-${verseKey(it.text)}-${it.blank[0]}`
    const answerPy = clozeAnswerPy(ctx, it)
    return {
      key,
      build: (d, rng) => {
        const opt = (s: string, py?: string): Opt => {
          const say = sayOpt(s, py)
          return { label: it.bare || !HAN.test(s) ? s : ctx.word(s), ...(say ? { say } : {}) }
        }
        const verse: StemPart = { kind: 'verse', text: it.text, py: ctx.py(verseKey(it.text)), blank: it.blank }
        const style: ChoiceStyle | undefined = it.bare || !HAN.test(it.answer) ? 'hanzi' : undefined
        return choiceQ(ctx, 'reading', d, key, [text('yq.cloze'), verse], opt(it.answer, answerPy), rng.shuffle(it.wrongs).map((w) => opt(w)), rng, style)
      },
    }
  })
}

/** 问答：「问题=答案/错/错/错」，答案可以带 emoji；开头 ! = 楷体字选项；「=#5」= 数字键盘 */
export interface AskItem {
  q: string
  answer: string
  wrongs: string[]
  bare: boolean
  number?: number
}
export function parseAsk(s: string): AskItem {
  const bare = s.startsWith('!')
  const body = bare ? s.slice(1) : s
  const at = body.indexOf('=')
  if (at < 0) throw new Error(`bad ask item: ${s}`)
  const q = body.slice(0, at)
  const rest = body.slice(at + 1)
  if (rest.startsWith('#')) return { q, answer: rest.slice(1), wrongs: [], bare, number: Number(rest.slice(1)) }
  const [answer, ...wrongs] = split(rest, /\//)
  if (!answer || !wrongs.length) throw new Error(`bad ask item: ${s}`)
  return { q, answer, wrongs, bare }
}
/** 带 emoji 的选项：「🐒猴子」显示成「🐒 猴子」（注音只注汉字），读「猴子」 */
export function askLabel(s: string): { shown: string; say: string } {
  const m = EMOJI_HEAD.exec(s)
  if (!m) return { shown: s, say: s }
  const rest = s.slice(m[0].length)
  return { shown: `${m[1]} ${rest}`, say: rest }
}
function askItems(ctx: Ctx, items: AskItem[]): Item[] {
  return items.map((it) => ({
    key: `ask-${it.q}`,
    build: (d, rng) => {
      const stem: StemPart[] = [{ kind: 'text', text: ctx.word(it.q) }]
      if (it.number !== undefined) {
        return numberQuestion({ kpId: ctx.kp, type: 'reading', difficulty: d, sig: `ask-${it.q}`, stem, value: it.number, rng, min: 0, max: Math.max(10, it.number + 5) })
      }
      const opt = (s: string): Opt => {
        const { shown, say } = askLabel(s)
        return it.bare ? { label: shown, say } : { label: ctx.word(shown), say }
      }
      return choiceQ(ctx, 'reading', d, `ask-${it.q}`, stem, opt(it.answer), rng.shuffle(it.wrongs).map(opt), rng, it.bare ? 'hanzi' : undefined)
    },
  }))
}

/** 加一加 / 减一减：「日+月=明」「飘-风=票」；加法的还能反过来问「明是由哪两个字组成的」 */
interface ComposeItem {
  parts: string[]
  op: '+' | '-'
  result: string
}
function parseCompose(s: string): ComposeItem {
  const m = /^(.+?)=(\p{Script=Han})$/u.exec(s)
  if (!m) throw new Error(`bad compose item: ${s}`)
  const op = m[1]!.includes('-') ? '-' : '+'
  return { parts: m[1]!.split(op), op, result: m[2]! }
}
const showOp = (c: ComposeItem): string => c.parts.join(c.op === '+' ? '＋' : '－')
function composeItems(ctx: Ctx, items: ComposeItem[]): Item[] {
  const results = items.map((c) => c.result)
  const out: Item[] = items.map((c) => ({
    key: `compose-${c.result}`,
    build: (d, rng) =>
      choiceQ(ctx, 'writing', d, `compose-${c.result}`, [text(c.op === '+' ? 'yq.compose' : 'yq.subtract'), { kind: 'hanzi', text: `${showOp(c)}＝？` }], plain(c.result), charWrongs(c.result, [...results, ...c.parts], d, rng).map(plain), rng, 'hanzi'),
  }))
  // 「由哪几个部分组成」只问两个部件的（三个部件的选项太长，手机上一张卡放不下）
  const adds = items.filter((c) => c.op === '+' && c.parts.length === 2)
  if (adds.length >= 3) {
    for (const c of adds) {
      out.push({
        key: `split-${c.result}`,
        build: (d, rng) =>
          choiceQ(ctx, 'writing', d, `split-${c.result}`, [text('yq.split'), { kind: 'hanzi', text: c.result }], plain(showOp(c)), rng.shuffle(adds.filter((o) => o !== c)).map((o) => plain(showOp(o))), rng, 'hanzi'),
      })
    }
  }
  return out
}

/** 偏旁：「妈 女 女字旁」→ 这个字的偏旁是哪个（偏旁写法，读名字）、哪个字是某某旁（楷体字） */
interface RadItem {
  c: string
  r: string
  name: string
}
function parseRadical(s: string): RadItem {
  const [c, r, name] = split(s)
  if (!c || !r || !name) throw new Error(`bad radical item: ${s}`)
  return { c, r, name }
}
function radicalItems(ctx: Ctx, items: RadItem[]): Item[] {
  const out: Item[] = []
  for (const it of items) {
    out.push({
      key: `radof-${it.c}`,
      build: (d, rng) => {
        const others = rng.shuffle([...new Set([...items.map((o) => o.r), ...Object.keys(RADICALS)])].filter((r) => r !== it.r && !it.c.includes(r)))
        return choiceQ(ctx, 'writing', d, `radof-${it.c}`, [text('yq.radicalOf'), { kind: 'hanzi', text: it.c }], { label: it.r, say: it.name }, others.map((r) => ({ label: r, say: RADICALS[r] ?? r })), rng, 'hanzi')
      },
    })
    out.push({
      key: `radwhich-${it.c}`,
      build: (d, rng) => {
        const pool = [...items.filter((o) => o.r !== it.r).map((o) => o.c), ...RADICAL_POOL.filter(([, r]) => r !== it.r).map(([c]) => c)]
        const others = rng.shuffle([...new Set(pool)]).map(plain)
        return choiceQ(ctx, 'writing', d, `radwhich-${it.c}`, [text('yq.whichRadical', { r: ctx.word(it.name) })], plain(it.c), others, rng, 'hanzi')
      },
    })
  }
  return out
}

/** 作者：「静夜思 李白」 */
function poetItems(ctx: Ctx, items: string[]): Item[] {
  return items.map((s) => {
    const [title, author] = split(s)
    if (!title || !author) throw new Error(`bad poet item: ${s}`)
    return {
      key: `poet-${title}`,
      build: (d, rng) =>
        choiceQ(ctx, 'reading', d, `poet-${title}`, [text('yq.poet', { t: ctx.word(title) })], { label: ctx.word(author) }, rng.shuffle(POETS.filter((p) => p !== author)).map((p) => ({ label: ctx.word(p) })), rng),
    }
  })
}

/** 一对词：「开关」两个字，或「高兴-难过」两个词（用 - 连） */
export function parsePairs(s: string | undefined): [string, string][] {
  return split(s).map((p) => {
    const pair = p.includes('-') ? p.split('-') : Array.from(p)
    if (pair.length !== 2 || !pair[0] || !pair[1]) throw new Error(`bad pair: ${p}`)
    return [pair[0], pair[1]]
  })
}

/** 反义词 / 近义词：一对里两个方向都问（「开」的反义词、「关」的反义词），干扰项是本课其它对里的词 */
function pairItems(ctx: Ctx, pairs: [string, string][], name: 'anto' | 'syn', prompt: string): Item[] {
  const words = pairs.flat()
  const out: Item[] = []
  for (const [a, b] of pairs) {
    for (const [x, y] of [
      [a, b],
      [b, a],
    ] as const) {
      out.push({
        key: `${name}-${x}`,
        build: (d, rng) =>
          choiceQ(ctx, 'phrase', d, `${name}-${x}`, [text(prompt, { w: ctx.word(x) })], { label: ctx.word(y) }, rng.shuffle(words.filter((w) => w !== x && w !== y)).map((w) => ({ label: ctx.word(w) })), rng),
      })
    }
  }
  return out
}

/** 词语（二年级起，Y9）：看拼音选词语、听音选词语，选项是不注音的楷体词语（Y3）；题目要求里出现了的字不考 */
function ciItems(ctx: Ctx, ci: string[]): { pyci: Item[]; cilisten: Item[] } {
  const clean = (key: string): string[] => ci.filter((w) => !Array.from(w).some((c) => inPrompt(key, c)))
  // 第 2 档起先挑跟答案有同一个字的词（更容易看混），再从本课其它词里补
  const wrongs = (w: string, d: Difficulty, rng: RNG, exclude: (o: string) => boolean): string[] => {
    const others = ci.filter((o) => o !== w && !exclude(o))
    const near = d >= 2 ? rng.shuffle(others.filter((o) => Array.from(o).some((c) => w.includes(c)))) : []
    return [...new Set([...near, ...rng.shuffle(others)])]
  }
  return {
    pyci: clean('yq.pyWord').map((w) => ({
      key: `pyci-${w}`,
      build: (d, rng) => {
        const py = ctx.py(w)
        return choiceQ(ctx, 'phrase', d, `pyci-${w}`, [text('yq.pyWord'), { kind: 'pinyin', text: py }], { label: w, say: w }, wrongs(w, d, rng, (o) => ctx.py(o) === py).map(plain), rng, 'hanzi')
      },
    })),
    cilisten: clean('yq.listenCi').map((w) => ({
      key: `cilisten-${w}`,
      build: (d, rng) => choiceQ(ctx, 'phrase', d, `cilisten-${w}`, [text('yq.listenCi'), { kind: 'listen', say: w }], plain(w), wrongs(w, d, rng, (o) => ctx.py(o) === ctx.py(w)).map(plain), rng, 'hanzi'),
    })),
  }
}

/** 多音字（Y9）：「长大 长 zhǎng=掌 cháng=常」= 词语、要考的字、它在这个词里的读音（第一个）与别的读音，各带一个读音唯一的同音字（朗读用） */
export interface PolyItem {
  word: string
  c: string
  /** 字在词里的位置（大字格里标红） */
  at: number
  readings: { py: string; say: string }[]
}
export function parsePoly(s: string): PolyItem {
  const [word, c, ...rs] = split(s)
  if (!word || !c || rs.length < 2) throw new Error(`bad poly item: ${s}`)
  const at = Array.from(word).indexOf(c)
  if (at < 0) throw new Error(`poly: ${c} 不在 ${word} 里`)
  const readings = rs.map((r) => {
    const m = /^([^=\s]+)=(\p{Script=Han})$/u.exec(r)
    if (!m) throw new Error(`bad poly reading: ${r}`)
    return { py: m[1]!, say: m[2]! }
  })
  return { word, c, at, readings }
}
function polyItems(ctx: Ctx, items: PolyItem[]): Item[] {
  return items.map((it) => {
    const key = `poly-${it.word}-${it.c}`
    const [right, ...others] = it.readings
    return {
      key,
      build: (d, rng) =>
        choiceQ(ctx, 'pinyin', d, key, [text('yq.polyRead'), { kind: 'hanzi', text: it.word, mark: it.at }], { label: right!.py, say: right!.say }, others.map((r) => ({ label: r.py, say: r.say })), rng, 'pinyin'),
    }
  })
}

/** 部首查字法（Y9）：「湖 氵 三点水 9」= 字、部首、部首名称、除去部首的画数 */
export interface BushouItem {
  c: string
  r: string
  name: string
  n: number
}
export function parseBushou(s: string): BushouItem {
  const [c, r, name, n] = split(s)
  if (!c || !r || !name || !n || !/^\d+$/.test(n)) throw new Error(`bad bushou item: ${s}`)
  return { c, r, name, n: Number(n) }
}
function bushouItems(ctx: Ctx, items: BushouItem[]): { bushou: Item[]; bushouN: Item[] } {
  const names: Record<string, string> = { ...RADICALS, ...Object.fromEntries(items.map((o) => [o.r, o.name])) }
  return {
    bushou: items.map((it) => ({
      key: `bushou-${it.c}`,
      build: (d, rng) => {
        const others = rng.shuffle([...new Set([...items.map((o) => o.r), ...Object.keys(RADICALS)])].filter((r) => r !== it.r && !it.c.includes(r)))
        return choiceQ(ctx, 'writing', d, `bushou-${it.c}`, [text('yq.bushouOf'), { kind: 'hanzi', text: it.c }], { label: it.r, say: it.name }, others.map((r) => ({ label: r, say: names[r] ?? r })), rng, 'hanzi')
      },
    })),
    bushouN: items.map((it) => ({
      key: `bushouN-${it.c}`,
      build: (d, rng) =>
        numberQuestion({ kpId: ctx.kp, type: 'writing', difficulty: d, sig: `bushouN-${it.c}`, stem: [text('yq.bushouLeft'), { kind: 'hanzi', text: it.c }], value: it.n, rng, min: 0, max: it.n + 3, smart: [it.n + 1, it.n - 1, it.n + 2] }),
    })),
  }
}

// ── 拼音课 ─────────────────────────────────────────────────────────────

interface Syl {
  py: string
  say: string
}
/** 「bā八 bá拔」：带调音节紧跟着读法（同音字） */
function parseSyl(s: string | undefined): Syl[] {
  return split(s).map((tok) => {
    const m = /^([^\p{Script=Han}]+)(\p{Script=Han}*)$/u.exec(tok)
    if (!m) throw new Error(`bad syllable item: ${tok}`)
    return { py: m[1]!, say: m[2]! }
  })
}
/** 拼读式：「b + ā」「g + u + ā」；j q x y 后面写成 u 的其实是 ü，拼读式里写回 ü（课本 j-ü-ān→juān） */
const MEDIAL_FINALS = new Set(['ua', 'uo', 'uai', 'uan', 'uang', 'ia', 'iao', 'ian', 'iang', 'iong'])
export function spellParts(py: string): string[] | null {
  const { base, tone } = splitTone(py)
  const { initial, final } = splitSyllable(base)
  if (!initial || initial === 'y' || initial === 'w') return null
  const jqx = 'jqx'.includes(initial) && final.startsWith('u')
  const f = jqx ? `ü${final.slice(1)}` : final
  if (MEDIAL_FINALS.has(final)) return [initial, f[0]!, addTone(f.slice(1), tone)]
  return [initial, addTone(f, tone)]
}
/** 汉语拼音字母表与声母表、韵母表的顺序（顺序题） */
const INITIAL_ORDER = 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ')
const FINAL_ORDER = 'a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong'.split(' ')
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** 整体认读音节与长得像的普通音节（「哪一个是整体认读音节」的干扰项） */
const WHOLE_NEAR: Readonly<Record<string, readonly string[]>> = {
  zhi: ['zha', 'zhe', 'zhu'], chi: ['cha', 'che', 'chu'], shi: ['sha', 'she', 'shu'], ri: ['re', 'ru', 'ran'],
  zi: ['za', 'ze', 'zu'], ci: ['ca', 'ce', 'cu'], si: ['sa', 'se', 'su'],
  yi: ['ya', 'yao', 'wa'], wu: ['wa', 'wo', 'wai'], yu: ['ya', 'you', 'yao'],
  ye: ['ya', 'yao', 'wa'], yue: ['yao', 'you', 'ya'], yuan: ['yan', 'yang', 'wan'], yin: ['yan', 'yang', 'wen'], yun: ['yan', 'wen', 'yang'], ying: ['yang', 'yan', 'weng'],
}
const WHOLE = new Set(Object.keys(WHOLE_NEAR))
const SINGLE_FINALS = ['a', 'o', 'e', 'i', 'u', 'ü']
/** 复韵母：课本不把 er 归进复韵母（「下面哪一个是复韵母」不出 er，Y4） */
const COMPOUND = ['ai', 'ei', 'ui', 'ao', 'ou', 'iu', 'ie', 'üe']
const FRONT = ['an', 'en', 'in', 'un', 'ün']
const BACK = ['ang', 'eng', 'ing', 'ong']
const says = (l: string): Opt => ({ label: l, ...(LETTER_SAY[l] ? { say: LETTER_SAY[l] } : {}) })

function pinyinItems(ctx: Ctx, spec: PinyinSpec): Record<string, Item[]> {
  const syl = parseSyl(spec.syl)
  const letters = split(spec.letters)
  const learned = ctx.learned ?? { initials: new Set<string>(INITIAL_ORDER), finals: new Set<string>(FINAL_ORDER) }
  const learnedLetters = [...learned.initials, ...learned.finals]
  const out: Record<string, Item[]> = {}

  // 第几声（数字键盘）
  out.tone = syl
    .filter((s) => splitTone(s.py).tone !== 0)
    .map((s) => ({
      key: `tone-${s.py}`,
      build: (d, rng) => numberQuestion({ kpId: ctx.kp, type: 'pinyin', difficulty: d, sig: `tone-${s.py}`, stem: [text('yq.tone'), { kind: 'pinyin', text: s.py }], value: splitTone(s.py).tone, rng, min: 1, max: 4 }),
    }))

  // 选出第几声：本课的单韵母（a o e 课、i u ü 课）或本课音节的写法
  const bases = [...new Set([...letters.filter((l) => SINGLE_FINALS.includes(l)), ...syl.map((s) => splitTone(s.py).base)])]
  out.picktone = bases.flatMap((b) =>
    ([1, 2, 3, 4] as const).map((n) => ({
      key: `picktone-${b}-${n}`,
      build: (d: Difficulty, rng: RNG) =>
        choiceQ(ctx, 'pinyin', d, `picktone-${b}-${n}`, [text('yq.pickTone', { n: { k: `yq.toneNum.${n}` } }), { kind: 'pinyin', text: b }], { label: addTone(b, n), say: TONE_SAY[n] }, ([1, 2, 3, 4] as const).filter((x) => x !== n).map((x) => ({ label: addTone(b, x), say: TONE_SAY[x] })), rng, 'pinyin'),
    })),
  )

  const sylOpts = (s: Syl, rng: RNG): Opt[] => syllableDistractors(s.py, rng, learned).map(plain)

  // 拼一拼
  out.spell = syl
    .filter((s) => s.say && spellParts(s.py))
    .map((s) => ({
      key: `spell-${s.py}`,
      build: (d, rng) => {
        const parts = spellParts(s.py)!
        const wrongs = sylOpts(s, rng)
        // j q x 与 ü：把「没去掉两点」的写法放进干扰项（课本的难点）
        const { base, tone } = splitTone(s.py)
        const { initial, final } = splitSyllable(base)
        if ('jqx'.includes(initial) && final.startsWith('u')) wrongs.unshift(plain(addTone(`${initial}ü${final.slice(1)}`, tone)))
        return choiceQ(ctx, 'pinyin', d, `spell-${s.py}`, [text('yq.spell'), { kind: 'pinyin', text: parts.join(' + ') }], { label: s.py, say: s.say }, wrongs, rng, 'pinyin')
      },
    }))

  // 听音选音节
  out.hear = syl.filter((s) => s.say).map((s) => ({
    key: `hear-${s.py}`,
    build: (d, rng) => choiceQ(ctx, 'pinyin', d, `hear-${s.py}`, [text('yq.hearPy'), { kind: 'listen', say: s.say }], { label: s.py, say: s.say }, sylOpts(s, rng), rng, 'pinyin'),
  }))

  // 看图选音节 / 看拼音选图：「图 音节(可多个) 读法」，音节之间用 - 连（「xī-guā」）
  const pics = (spec.pic ?? []).map((p) => {
    const [icon, sy, say] = split(p)
    if (!icon || !sy || !say) throw new Error(`bad pinyin pic: ${p}`)
    return { icon, py: sy.replace(/-/g, ' '), say }
  })
  out.picpy = pics.map((p) => ({
    key: `picpy-${p.icon}`,
    build: (d, rng) => {
      const sys = p.py.split(' ')
      const at = rng.int(0, sys.length - 1)
      const wrongs = syllableDistractors(sys[at]!, rng, learned).map((w) => plain(sys.map((x, i) => (i === at ? w : x)).join(' ')))
      return choiceQ(ctx, 'pinyin', d, `picpy-${p.icon}`, [text('yq.picPy'), { kind: 'picture', icon: p.icon, say: p.say }], { label: p.py, say: p.say }, wrongs, rng, 'pinyin')
    },
  }))
  out.pypic = pics.length >= 3
    ? pics.map((p) => ({
        key: `pypic-${p.icon}`,
        build: (d, rng) =>
          choiceQ(ctx, 'pinyin', d, `pypic-${p.icon}`, [text('yq.pyPic'), { kind: 'pinyin', text: p.py }], { label: p.icon, say: p.say }, rng.shuffle(pics.filter((o) => o !== p)).map((o) => ({ label: o.icon, say: o.say })), rng, 'emoji'),
      }))
    : []

  // 看拼音选词：「dà-dì 大地」
  const words = (spec.words ?? []).map((w) => {
    const [sy, word] = split(w)
    if (!sy || !word) throw new Error(`bad pinyin word: ${w}`)
    return { py: sy.replace(/-/g, ' '), word }
  })
  out.pyword = words.length >= 2
    ? words.filter((w) => !Array.from(w.word).some((c) => inPrompt('yq.pyWord', c))).map((w) => ({
        key: `pyword-${w.word}`,
        build: (d, rng) => {
          const same = words.filter((o) => o !== w).map((o) => o.word)
          return choiceQ(ctx, 'pinyin', d, `pyword-${w.word}`, [text('yq.pyWord'), { kind: 'pinyin', text: w.py }], { label: w.word, say: w.word }, rng.shuffle(same).map(plain), rng, 'hanzi')
        },
      }))
    : []

  // 分类：哪一个是声母 / 韵母 / 整体认读音节 / 复韵母 / 前鼻韵母 / 后鼻韵母（答案都要读得出来，LETTER_SAY 里有的）
  const kinds = split(spec.kinds)
  const kindItems: Item[] = []
  const learnedFinals = [...learned.finals].filter((f) => !WHOLE.has(f))
  const learnedInitials = [...learned.initials]
  const addKind = (kind: string, pool: string[], wrongPool: string[]): void => {
    for (const l of pool.filter((x) => LETTER_SAY[x])) {
      kindItems.push({
        key: `kind-${kind}-${l}`,
        build: (d, rng) => choiceQ(ctx, 'pinyin', d, `kind-${kind}-${l}`, [text(`yq.is.${kind}`)], says(l), rng.shuffle(wrongPool.filter((w) => w !== l)).map(says), rng, 'pinyin'),
      })
    }
  }
  for (const kind of kinds) {
    const own = letters.length ? letters : learnedLetters
    if (kind === 'initial') addKind(kind, own.filter((l) => learned.initials.has(l)), learnedFinals)
    else if (kind === 'final') addKind(kind, own.filter((l) => learned.finals.has(l) && !WHOLE.has(l)), learnedInitials)
    else if (kind === 'whole') {
      for (const l of [...WHOLE].filter((w) => learned.finals.has(w) && LETTER_SAY[w])) {
        kindItems.push({
          key: `kind-whole-${l}`,
          build: (d, rng) => choiceQ(ctx, 'pinyin', d, `kind-whole-${l}`, [text('yq.is.whole')], says(l), rng.shuffle([...WHOLE_NEAR[l]!]).map(plain), rng, 'pinyin'),
        })
      }
    } else if (kind === 'compound') addKind(kind, COMPOUND.filter((f) => learned.finals.has(f)), [...SINGLE_FINALS, ...learnedInitials.slice(0, 6)])
    else if (kind === 'front') addKind(kind, FRONT.filter((f) => learned.finals.has(f)), [...BACK, ...COMPOUND].filter((f) => learned.finals.has(f)))
    else if (kind === 'back') addKind(kind, BACK.filter((f) => learned.finals.has(f)), [...FRONT, ...COMPOUND].filter((f) => learned.finals.has(f)))
    else throw new Error(`unknown pinyin kind: ${kind}`)
  }
  out.kind = kindItems

  // 这个音节的声母 / 韵母是哪个
  out.initial = syl
    .filter((s) => {
      const { initial } = splitSyllable(splitTone(s.py).base)
      return initial && initial !== 'y' && initial !== 'w'
    })
    .map((s) => ({
      key: `initial-${s.py}`,
      build: (d, rng) => {
        const { initial } = splitSyllable(splitTone(s.py).base)
        const wrongs = rng.shuffle(learnedInitials.filter((i) => i !== initial && i !== 'y' && i !== 'w')).map(says)
        return choiceQ(ctx, 'pinyin', d, `initial-${s.py}`, [text('yq.initialOf'), { kind: 'pinyin', text: s.py }], says(initial), wrongs, rng, 'pinyin')
      },
    }))
  out.final = syl
    .filter((s) => {
      const { initial, final } = splitSyllable(splitTone(s.py).base)
      return initial && !'jqxyw'.includes(initial) && !MEDIAL_FINALS.has(final) && learned.finals.has(final) && LETTER_SAY[final]
    })
    .map((s) => ({
      key: `final-${s.py}`,
      build: (d, rng) => {
        const { final } = splitSyllable(splitTone(s.py).base)
        const wrongs = rng.shuffle(learnedFinals.filter((f) => f !== final)).map(says)
        return choiceQ(ctx, 'pinyin', d, `final-${s.py}`, [text('yq.finalOf'), { kind: 'pinyin', text: s.py }], says(final), wrongs, rng, 'pinyin')
      },
    }))

  // 听一听：平舌音还是翘舌音（zh ch sh r 课）、前鼻韵母还是后鼻韵母（ang eng ing ong 课）
  out.flat = syl
    .filter((s) => s.say && /^(zh|ch|sh|z|c|s)/.test(splitTone(s.py).base))
    .map((s) => ({
      key: `flat-${s.py}`,
      build: (d, rng) => {
        const curled = /^(zh|ch|sh)/.test(s.py)
        const flat = { label: ctx.word('平舌音') }
        const curl = { label: ctx.word('翘舌音') }
        return choiceQ(ctx, 'pinyin', d, `flat-${s.py}`, [text('yq.flatCurl'), { kind: 'listen', say: s.say }], curled ? curl : flat, [curled ? flat : curl], rng)
      },
    }))
  out.nasal = syl
    .filter((s) => s.say && /(an|en|in|un|ün|ang|eng|ing|ong)$/.test(splitTone(s.py).base))
    .map((s) => ({
      key: `nasal-${s.py}`,
      build: (d, rng) => {
        const back = /ng$/.test(splitTone(s.py).base)
        const front = { label: ctx.word('前鼻韵母') }
        const backOpt = { label: ctx.word('后鼻韵母') }
        return choiceQ(ctx, 'pinyin', d, `nasal-${s.py}`, [text('yq.nasal'), { kind: 'listen', say: s.say }], back ? backOpt : front, [back ? front : backOpt], rng)
      },
    }))

  // 顺序：声母表 / 韵母表里挖掉一个（本课学完才有整张表：y w 课声母、ang eng ing ong 课韵母）
  const orders: { name: string; list: string[] }[] = []
  if (split(spec.order).includes('initials')) orders.push({ name: 'initials', list: INITIAL_ORDER })
  if (split(spec.order).includes('finals')) orders.push({ name: 'finals', list: FINAL_ORDER })
  out.order = orders.flatMap(({ name, list }) =>
    list
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => i >= 1 && i <= list.length - 2 && LETTER_SAY[l])
      .map(({ l, i }) => ({
        key: `order-${name}-${l}`,
        build: (d: Difficulty, rng: RNG) => {
          const from = Math.max(0, Math.min(i - 2, list.length - 4))
          const shown = list.slice(from, from + 4).map((x) => (x === l ? '?' : x)).join('  ')
          const wrongs = rng.shuffle(list.filter((x) => x !== l && Math.abs(list.indexOf(x) - i) <= 4)).map(says)
          return choiceQ(ctx, 'pinyin', d, `order-${name}-${l}`, [text('yq.order'), { kind: 'pinyin', text: shown }], says(l), wrongs, rng, 'pinyin')
        },
      })),
  )
  return out
}

// ── 字母表（一下语文园地一）、音序（语文园地三） ────────────────────────────

function alphabetItems(ctx: Ctx): Item[] {
  const out: Item[] = []
  ALPHABET.forEach((U, i) => {
    const l = U.toLowerCase()
    out.push({
      key: `lower-${U}`,
      build: (d, rng) => {
        const near = ['b', 'd', 'p', 'q', 'n', 'u', 'm', 'w', 'i', 'j', 'l', 't', 'f']
        const pool = near.includes(l) ? rng.shuffle(near) : rng.shuffle(ALPHABET.map((x) => x.toLowerCase()))
        return choiceQ(ctx, 'pinyin', d, `lower-${U}`, [text('yq.lower'), { kind: 'pinyin', text: U }], { label: l, say: l }, pool.filter((x) => x !== l).map((x) => ({ label: x, say: x })), rng, 'pinyin')
      },
    })
    out.push({
      key: `upper-${l}`,
      build: (d, rng) =>
        choiceQ(ctx, 'pinyin', d, `upper-${l}`, [text('yq.upper'), { kind: 'pinyin', text: l }], { label: U, say: U }, rng.shuffle(ALPHABET.filter((x) => x !== U)).map((x) => ({ label: x, say: x })), rng, 'pinyin'),
    })
    if (i >= 1 && i <= ALPHABET.length - 2) {
      out.push({
        key: `abc-${U}`,
        build: (d, rng) => {
          const from = Math.max(0, Math.min(i - 2, ALPHABET.length - 4))
          const shown = ALPHABET.slice(from, from + 4).map((x) => (x === U ? '?' : x)).join('  ')
          const wrongs = rng.shuffle(ALPHABET.filter((x) => x !== U && Math.abs(ALPHABET.indexOf(x) - i) <= 3)).map((x) => ({ label: x, say: x }))
          return choiceQ(ctx, 'pinyin', d, `abc-${U}`, [text('yq.order'), { kind: 'pinyin', text: shown }], { label: U, say: U }, wrongs, rng, 'pinyin')
        },
      })
    }
  })
  return out
}

/** 音序：查「春」先找大写字母 C（zh ch sh 的音序是 Z C S） */
function yinxuItems(ctx: Ctx, zi: string[]): Item[] {
  return zi.map((c) => ({
    key: `yinxu-${c}`,
    build: (d, rng) => {
      const U = splitTone(ctx.py(c)).base[0]!.toUpperCase()
      const near = ALPHABET.filter((x) => x !== U && x !== 'V' && Math.abs(x.charCodeAt(0) - U.charCodeAt(0)) <= 5)
      return choiceQ(ctx, 'pinyin', d, `yinxu-${c}`, [text('yq.yinxu', { c: ctx.word(c) })], { label: U, say: U }, rng.shuffle(near).map((x) => ({ label: x, say: x })), rng, 'pinyin')
    },
  }))
}

// ── 一课 → 各模板的条目 ────────────────────────────────────────────────

/** 一课能出的全部题目条目，按模板名分组（生成器按 mix 挑模板、再挑条目；语料收集逐条出一遍） */
export function lessonItems(spec: LessonSpec, lessonCtx: Ctx): Record<string, Item[]> {
  const { chars: zi, reading } = parseZi(spec.zi)
  const ctx = withReadings(lessonCtx, reading)
  const pics = (spec.pic ?? []).map(parsePic)
  const xie = split(spec.xie).map(parseXie)
  const digits = split(spec.digits).map((s): [number, string] => {
    const m = /^(\d+)(\p{Script=Han})$/u.exec(s)
    if (!m) throw new Error(`bad digit item: ${s}`)
    return [Number(m[1]), m[2]!]
  })
  const items: Record<string, Item[]> = {
    listen: listenItems(ctx, zi),
    pyzi: ctx.pinyinReady ? pyZiItems(ctx, zi) : [],
    zipy: ctx.pinyinReady ? ziPyItems(ctx, zi) : [],
    pic: picItems(ctx, pics, zi),
    zipic: pics.length >= 3 ? ziPicItems(ctx, pics) : [],
    strokes: strokeItems(ctx, xie),
    first: firstItems(ctx, xie),
    digit: digitItems(ctx, digits),
    cloze: clozeItems(ctx, (spec.cloze ?? []).map(parseCloze)),
    ask: askItems(ctx, (spec.ask ?? []).map(parseAsk)),
    compose: composeItems(ctx, (spec.compose ?? []).map(parseCompose)),
    radical: radicalItems(ctx, (spec.radical ?? []).map(parseRadical)),
    poet: poetItems(ctx, spec.poet ?? []),
    anto: pairItems(ctx, parsePairs(spec.anto), 'anto', 'yq.antonym'),
    syn: pairItems(ctx, parsePairs(spec.syn), 'syn', 'yq.synonym'),
    poly: polyItems(ctx, (spec.poly ?? []).map(parsePoly)),
    ...ciItems(ctx, split(spec.ci)),
    ...bushouItems(ctx, (spec.bushou ?? []).map(parseBushou)),
    alphabet: spec.alphabet ? alphabetItems(ctx) : [],
    yinxu: yinxuItems(ctx, split(spec.yinxu)),
  }
  if (spec.py) Object.assign(items, pinyinItems(ctx, spec.py))
  return items
}

/** 「listen:3 pic:2」→ [['listen', 3], ['pic', 2]] */
export function parseMix(mix: string): [string, number][] {
  return split(mix).map((part) => {
    const [name, w] = part.split(':')
    return [name!, Number(w ?? 1)]
  })
}

/** 带 emoji 的中文（「🐒 猴子」）→ 要查拼音的那一段（「猴子」） */
export const hanPart = (s: string): string => askLabel(s).say

/**
 * 一课里所有要查拼音表的中文（拼音表的完整性测试用）：看拼音选字 / 看字选读音的生字、词语表的词、音序查的字、句子、
 * 要注音的选项与问题、反义词 / 近义词、偏旁名、作者、笔画名、多音字的同音字，以及拼音课的「平舌音 / 翘舌音 / 前鼻韵母 /
 * 后鼻韵母」。干扰字是不是同音不查这里，查 READINGS。pinyinReady 同 Ctx：还没学拼音的课不出看拼音 / 选读音的题，生字就不用查拼音。
 */
export function lessonTexts(spec: LessonSpec, pinyinReady = true): string[] {
  const out = new Set<string>()
  const add = (s: string): void => {
    const t = hanPart(s)
    if (HAN.test(t)) out.add(t)
  }
  if (pinyinReady) {
    const { chars, reading } = parseZi(spec.zi)
    for (const c of chars) if (reading[c] === undefined) add(c)
  }
  for (const c of split(spec.yinxu)) add(c)
  for (const s of spec.cloze ?? []) {
    const it = parseCloze(s)
    add(verseKey(it.text))
    if (!it.bare) for (const o of [it.answer, ...it.wrongs]) add(o)
  }
  for (const s of spec.ask ?? []) {
    const it = parseAsk(s)
    add(it.q)
    if (!it.bare) for (const o of [it.answer, ...it.wrongs]) add(o)
  }
  for (const s of spec.poet ?? []) for (const w of split(s)) add(w)
  if (spec.poet?.length) for (const p of POETS) add(p)
  for (const pair of [...parsePairs(spec.anto), ...parsePairs(spec.syn)]) for (const w of pair) add(w)
  // 词语：看拼音选词语要查拼音（排除同音词也要查）
  for (const w of split(spec.ci)) add(w)
  // 多音字的同音字：不显示，但拼音表里记着它的读音，测试拿它核对「只有这一个读音、等于要读的音」
  for (const s of spec.poly ?? []) for (const r of parsePoly(s).readings) add(r.say)
  for (const s of spec.radical ?? []) add(parseRadical(s).name)
  if (split(spec.xie).some((x) => parseXie(x).first)) for (const s of STROKES) add(s)
  if (spec.py) for (const w of ['平舌音', '翘舌音', '前鼻韵母', '后鼻韵母']) add(w)
  return [...out]
}
