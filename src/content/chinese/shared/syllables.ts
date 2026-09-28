// 汉语拼音的小工具（语文各年级共用，需求 §9 Y4）：声调符号的加 / 去、音节拆成声母 + 韵母、普通话合法音节表、
// 音近的干扰项、字母的呼读音。只依赖引擎，node 里能单测。
import type { RNG } from '@/engine'

export type Tone = 0 | 1 | 2 | 3 | 4

/** 每个元音的五种写法：[轻声, 一声, 二声, 三声, 四声] */
const MARKS: Record<string, readonly string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
  e: ['e', 'ē', 'é', 'ě', 'è'],
  i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
  ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** 带调音节 → 不带调的写法 + 第几声（没有调号 = 0，轻声） */
export function splitTone(py: string): { base: string; tone: Tone } {
  for (const [vowel, forms] of Object.entries(MARKS)) {
    for (let t = 1; t <= 4; t++) {
      if (py.includes(forms[t]!)) return { base: py.replace(forms[t]!, vowel), tone: t as Tone }
    }
  }
  return { base: py, tone: 0 }
}

/**
 * 给音节标调：有 a 标 a；没有 a 找 e；ou 标 o；其余标最后一个元音（iu 标 u、ui 标 i）——课本的标调歌
 * 「有 a 不放过，没 a 找 o e，i u 并列标在后」。
 */
export function addTone(base: string, tone: Tone): string {
  if (tone === 0) return base
  let at = base.indexOf('a')
  if (at < 0) at = base.indexOf('e')
  if (at < 0 && base.includes('ou')) at = base.indexOf('o')
  if (at < 0) {
    for (let k = base.length - 1; k >= 0; k--) {
      if ('iouü'.includes(base[k]!)) {
        at = k
        break
      }
    }
  }
  if (at < 0) return base
  return base.slice(0, at) + MARKS[base[at]!]![tone] + base.slice(at + 1)
}

/** 声母（含 y w），长的在前（zh ch sh 先于 z c s） */
export const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'] as const

/** 不带调的音节拆成声母 + 其余（韵母，三拼音节带着介母：gua → g + ua） */
export function splitSyllable(base: string): { initial: string; final: string } {
  const initial = INITIALS.find((i) => base.startsWith(i) && base.length > i.length) ?? ''
  return { initial, final: base.slice(initial.length) }
}

/**
 * 普通话的合法音节（不带调），给干扰项把关：换了声母 / 韵母拼出来的必须是真有的音节。
 * 由拼音库收集常用字的读音得来，去掉了 hng / m / n / ng 与几个极少见的（kei tei zhei shei rua chua den nou lo）。
 */
export const VALID = new Set(
  'a ai an ang ao ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu ca cai can cang cao ce cen ceng cha chai chan chang chao che chen cheng chi chong chou chu chuai chuan chuang chui chun chuo ci cong cou cu cuan cui cun cuo da dai dan dang dao de dei deng di dia dian diao die ding diu dong dou du duan dui dun duo e ei en eng er fa fan fang fei fen feng fo fou fu ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu long lou lu luan lun luo lü lüe ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nu nuan nuo nü nüe o ou pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun ran rang rao re ren reng ri rong rou ru ruan rui run ruo sa sai san sang sao se sen seng sha shai shan shang shao she shen sheng shi shou shu shua shuai shuan shuang shui shun shuo si song sou su suan sui sun suo ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo wa wai wan wang wei wen weng wo wu xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun za zai zan zang zao ze zei zen zeng zha zhai zhan zhang zhao zhe zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo zi zong zou zu zuan zui zun zuo'.split(
    ' ',
  ),
)

/** 容易混的声母（形近 b / d / p / q、音近 n / l、平翘舌 z / zh…） */
const INITIAL_NEAR: Record<string, readonly string[]> = {
  b: ['p', 'd', 'm'],
  p: ['b', 'q', 't'],
  m: ['n', 'b', 'f'],
  f: ['h', 'p', 'b'],
  d: ['t', 'b', 'n'],
  t: ['d', 'f', 'l'],
  n: ['l', 'm', 'r'],
  l: ['n', 'r', 'd'],
  g: ['k', 'h', 'd'],
  k: ['g', 'h', 't'],
  h: ['f', 'k', 'g'],
  j: ['q', 'x', 'zh'],
  q: ['j', 'x', 'ch'],
  x: ['j', 'q', 'sh'],
  zh: ['z', 'ch', 'j'],
  ch: ['c', 'zh', 'q'],
  sh: ['s', 'x', 'ch'],
  r: ['l', 'y', 'n'],
  z: ['zh', 'c', 's'],
  c: ['ch', 'z', 's'],
  s: ['sh', 'z', 'x'],
  y: ['w', 'r', 'j'],
  w: ['y', 'h', 'f'],
}

/** 容易混的韵母（前后鼻音、ie / üe、ui / iu、ao / ou…） */
const FINAL_NEAR: Record<string, readonly string[]> = {
  a: ['o', 'e', 'ai'],
  o: ['uo', 'e', 'ou'],
  e: ['o', 'a', 'ei'],
  i: ['ü', 'ie', 'ei'],
  u: ['ü', 'ou', 'o'],
  ü: ['u', 'i', 'üe'],
  ai: ['ei', 'ao', 'an'],
  ei: ['ai', 'ui', 'en'],
  ui: ['iu', 'ei', 'un'],
  ao: ['ou', 'ai', 'ang'],
  ou: ['ao', 'uo', 'ong'],
  iu: ['ui', 'ou', 'in'],
  ie: ['üe', 'ei', 'ian'],
  üe: ['ie', 'ue', 'ün'],
  ue: ['ie', 'un', 'uan'],
  er: ['e', 'ei'],
  an: ['ang', 'en', 'ai'],
  en: ['eng', 'an', 'in'],
  in: ['ing', 'en', 'ian'],
  un: ['ong', 'en', 'uan'],
  ün: ['un', 'in', 'ing'],
  ang: ['an', 'eng', 'ong'],
  eng: ['en', 'ong', 'ang'],
  ing: ['in', 'eng', 'iang'],
  ong: ['eng', 'un', 'ang'],
  ua: ['uo', 'a', 'uai'],
  uo: ['ua', 'o', 'ou'],
  uai: ['ai', 'ua', 'ui'],
  ia: ['ie', 'a', 'iao'],
  iao: ['ao', 'iu', 'ia'],
  ian: ['iang', 'an', 'in'],
  iang: ['ian', 'ang', 'ing'],
  uan: ['uang', 'an', 'un'],
  uang: ['uan', 'ang', 'ong'],
  iong: ['ong', 'ing', 'un'],
}

/**
 * 一个带调音节的干扰项（需求 Y5）：各挑一个「换调」「换一个容易混的声母」「换一个容易混的韵母」，
 * 拼出来的必须是合法音节；allow 限定换进来的声母 / 韵母（拼音课只用已经学过的），不够就从剩下的里补。
 * 没有调号的（轻声）按一声换。
 */
export function syllableDistractors(
  py: string,
  rng: RNG,
  opts: { initials?: ReadonlySet<string>; finals?: ReadonlySet<string>; count?: number } = {},
): string[] {
  const count = opts.count ?? 3
  const { base, tone } = splitTone(py)
  const { initial, final } = splitSyllable(base)
  const t: Tone = tone === 0 ? 1 : tone
  const toneWays = ([1, 2, 3, 4] as const).filter((x) => x !== tone).map((x) => addTone(base, x))
  const initialWays = (INITIAL_NEAR[initial] ?? [])
    .filter((i) => !opts.initials || opts.initials.has(i))
    .map((i) => i + final)
    .filter((b) => VALID.has(b))
    .map((b) => addTone(b, t))
  const finalWays = (FINAL_NEAR[final] ?? [])
    .filter((f) => !opts.finals || opts.finals.has(f))
    .map((f) => initial + f)
    .filter((b) => VALID.has(b))
    .map((b) => addTone(b, t))
  const out: string[] = []
  const push = (s: string | undefined): void => {
    if (s && s !== py && !out.includes(s) && out.length < count) out.push(s)
  }
  const groups = rng.shuffle([toneWays, initialWays, finalWays].map((g) => rng.shuffle(g)))
  for (const g of groups) push(g[0])
  for (const g of groups) for (const s of g) push(s)
  return out
}

/**
 * 字母的读法（需求 Y4）：语音合成不念字母，读课本的呼读音——一个读音唯一的同音字。
 * 单韵母 a、e 和 ei、eng、ong 没有干净的同音字，ün / yun 的「晕」单读常读成 yùn，都不在表里（它们不能当要读出来的答案）。
 */
export const LETTER_SAY: Readonly<Record<string, string>> = {
  b: '玻', p: '坡', m: '摸', f: '佛', d: '德', t: '特', n: '讷', l: '勒',
  g: '哥', k: '科', h: '喝', j: '基', q: '欺', x: '希',
  zh: '知', ch: '吃', sh: '诗', r: '日', z: '资', c: '雌', s: '思', y: '衣', w: '乌',
  o: '喔', i: '衣', u: '乌', ü: '迂',
  ai: '哀', ui: '威', ao: '凹', ou: '欧', iu: '优', ie: '耶', üe: '约', er: '儿',
  an: '安', en: '恩', in: '因', un: '温', ang: '昂', ing: '英',
  zhi: '知', chi: '吃', shi: '诗', ri: '日', zi: '资', ci: '雌', si: '思',
  yi: '衣', wu: '乌', yu: '迂', ye: '耶', yue: '约', yuan: '冤', yin: '因', ying: '英',
}

/** 声调的叫法（「选出第几声」答错时读「正确答案是第三声」） */
export const TONE_SAY: Readonly<Record<number, string>> = { 1: '第一声', 2: '第二声', 3: '第三声', 4: '第四声' }
