<script setup lang="ts">
import { computed } from 'vue'
import type { MulWork } from '@/types/models'

/**
 * 竖式（笔算加减乘）：两个数按数位右对齐，运算符写在第二行左侧，下面一条横线，结果留给孩子在脑子里 / 纸上算。
 * 每一位一格，个位对齐个位——这正是笔算要教的「相同数位对齐」。乘法（多位数乘一位数）一位数写在下面、与个位对齐。
 */
/** answer：练习页把按的数字写在横线下面（右对齐，比位数多的一位落在运算符那一格）；done = 已经判完，变绿 */
/**
 * 四上「多位数乘两位数」加的可选项（都不传就是原来的样子，一到三年级的竖式不受影响）：
 * steps = 乘数是两位数时画出两次乘得的数（第二次的末位对齐十位、个位的 0 不写，课本的写法），再一条横线写积——
 *         没答完这两行只画出各位的小虚线格，答完（done）填上数；
 * zeros = 末尾有 0 的乘法（课本做一做的写法）：0 前面的部分对齐，0 写在竖式外面，积的末尾照样补上这几个 0；
 * work = 写好的竖式（看竖式答题、改错题）：两次乘得的数和积照它写（可以是错的），flat = 第二次乘得的数没有左移；
 * mark = 第几次乘得的数右边画红箭头（「箭头所指这一步算的是什么」）。
 */
/**
 * 四下「小数的加法和减法」加的可选项（不传和原来一样）：lines = 小数竖式的几行数（两个；连加三个），已经按列排好、一样长的字符串，
 * 一个字符一列（数字、「.」、空格）——这时 a、b 不用；只有「.」的那一列画得窄（小数点对齐时各行的「.」在同一列，课本的写法），
 * 运算符写在最后一行左边；result = 写好的得数（改错题照写，也按列排好）；不传就在横线下画一排空格子（得数在选项里选，不填）。
 */
/**
 * 五上「小数乘法」加的可选项（不传和原来一样）：decFactors = 两个乘数（照课本写的小数 / 整数字符串，这时 a、b 不用），
 * 按「去掉小数点的整数」末尾对齐（课本：1.92 × 0.9 的 9 对着 2，不按小数点对齐），小数点画在这一位的右下角、不占一列；
 * zeros = 整数乘数末尾的 0 写在竖式外面（0.72 × 60、0.46 × 300）；product = 横线下写好的积（照写，可以只有数字不点小数点，
 * 也可以是补了 0 的「0.0224」），不传就在横线下画一条虚线（不按位画格子，免得透露积有几位）；steps = 写了积、乘数有两位数字时画出两次乘得的数（照整数写、第二次左移一位）。
 */
const props = defineProps<{
  a: number
  op: '+' | '-' | '×'
  b: number
  answer?: string
  done?: boolean
  steps?: boolean
  zeros?: boolean
  work?: MulWork
  mark?: 1 | 2
  lines?: string[]
  result?: string
  decFactors?: [string, string]
  product?: string
}>()

// 位数：加法要给和留出进位后多出来的一位、乘法给积留够位；减法差不会比被减数长
const result = computed(() => (props.op === '+' ? props.a + props.b : props.op === '×' ? props.a * props.b : 0))
const width = computed(() => Math.max(String(props.a).length, String(props.b).length, props.op === '-' ? 0 : String(result.value).length))
/** 运算符写法：减号用长一点的「−」 */
const opText = computed(() => (props.op === '-' ? '−' : props.op))
const digits = (n: number): string[] => String(n).padStart(width.value, ' ').split('')
const rowA = computed(() => digits(props.a))
const rowB = computed(() => digits(props.b))
/** 答案行：运算符那一格 + 每一位，没按到的位留空 */
const rowC = computed(() => (props.answer ?? '').padStart(width.value + 1, ' ').slice(-(width.value + 1)).split(''))

// ── 乘数是两位数的竖式（四上「多位数乘两位数」）──

/** 末尾有几个 0 */
function trailingZeros(n: number): number {
  let z = 0
  for (let x = n; x > 0 && x % 10 === 0; x /= 10) z++
  return z
}

/**
 * 各行按「右边空几格」排：0 前面的部分（a′、b′）的末位对齐在同一列 R，R 右边是 a、b 末尾的 0（写在竖式外面）；
 * 第一次乘得的数末位对齐 R，第二次的对齐 R 左边一格（flat 时也对齐 R）；积写满到最右边（末尾补上两个乘数末尾的 0）。
 */
const mul = computed(() => {
  if (props.decFactors || props.op !== '×' || !(props.steps || props.zeros || props.work)) return null
  const w = props.work
  const za = props.zeros && !w ? trailingZeros(props.a) : 0
  const zb = props.zeros && !w ? trailingZeros(props.b) : 0
  const a1 = props.a / 10 ** za
  const b1 = props.b / 10 ** zb
  const z = za + zb
  const two = b1 >= 10 && (!!props.steps || !!w)
  const lines: { text: string; off: number }[] = [
    { text: String(a1) + '0'.repeat(za), off: z - za },
    { text: String(b1) + '0'.repeat(zb), off: z - zb },
  ]
  if (two) {
    lines.push({ text: String(w ? w.p1 : a1 * (b1 % 10)), off: z })
    lines.push({ text: String(w ? w.p2 : a1 * Math.floor(b1 / 10)), off: z + (w?.flat ? 0 : 1) })
  }
  lines.push({ text: String(w ? w.sum : props.a * props.b), off: 0 })
  const cols = Math.max(...lines.map((l) => l.text.length + l.off))
  const rows = lines.map((l) => {
    const out: string[] = Array.from({ length: cols }, () => ' ')
    l.text.split('').forEach((ch, i) => (out[cols - l.off - l.text.length + i] = ch))
    return out
  })
  return { cols, two, rows, parts: two ? [rows[2]!, rows[3]!] : [], sum: rows[rows.length - 1]! }
})
/** 积那一行（没有 work 时孩子按的数）：运算符那一格 + 每一位 */
const mulAnswer = computed(() => {
  const cols = mul.value?.cols ?? 0
  return (props.answer ?? '').padStart(cols + 1, ' ').slice(-(cols + 1)).split('')
})
/** 两次乘得的数：写好的竖式照写；没答完只画出小虚线格（课本例题里的方框），答完填上 */
const showParts = computed(() => !!props.work || !!props.done)

// ── 小数竖式（四下「小数的加法和减法」）──

/**
 * 各行按字符分列（不一样长的在左边补空格）；point[j] = 第 j 列只有小数点（画窄）。没对齐的竖式（改错题）里小数点和数字落在同一列，
 * 那一列照常宽。
 */
const dec = computed(() => {
  if (!props.lines?.length) return null
  const all = props.result === undefined ? props.lines : [...props.lines, props.result]
  const cols = Math.max(...all.map((l) => l.length))
  const grid = all.map((l) => l.padStart(cols, ' ').split(''))
  const point = Array.from({ length: cols }, (_, j) => grid.some((g) => g[j] === '.') && grid.every((g) => g[j] === '.' || g[j] === ' '))
  const rows = grid.slice(0, props.lines.length)
  return { cols, point, rows, result: props.result === undefined ? null : grid[grid.length - 1]! }
})
/** 小数竖式的列宽：运算符一格、数字一格、小数点窄一些 */
const decTemplate = computed(() => (dec.value ? `1.1em ${dec.value.point.map((p) => (p ? '0.42em' : '1.1em')).join(' ')}` : ''))

// ── 小数乘法竖式（五上「小数乘法」）──

/** 一格：数字（'' = 空着）与这一位后面有没有小数点 */
interface DmCell {
  ch: string
  dot: boolean
}
/** 一个数拆成「去掉小数点的数字串」和小数点在第几个数字后面（-1 = 没有小数点）：'0.72' → '072'、0 */
function splitDec(s: string): { digits: string; dotAfter: number } {
  const at = s.indexOf('.')
  return at < 0 ? { digits: s, dotAfter: -1 } : { digits: s.slice(0, at) + s.slice(at + 1), dotAfter: at - 1 }
}
/** 整数（没有小数点）末尾有几个 0 写在外面：至少留一位在里面 */
function outsideZeros(s: string): number {
  if (s.includes('.')) return 0
  return Math.min(s.length - s.replace(/0+$/, '').length, s.length - 1)
}

/**
 * 各行按「右边空几格」排（同四上的乘法竖式）：两个乘数去掉外面的 0 以后末位对齐在同一列，外面的 0 写在右边；
 * 两次乘得的数（steps）末位分别对齐这一列和它左边一格；积写满到最右边。
 */
const dm = computed(() => {
  if (!props.decFactors) return null
  const [sa, sb] = props.decFactors
  const za = props.zeros ? outsideZeros(sa) : 0
  const zb = props.zeros ? outsideZeros(sb) : 0
  const z = za + zb
  const A = splitDec(sa)
  const B = splitDec(sb)
  const coreA = Number(A.digits.slice(0, A.digits.length - za))
  const coreB = Number(B.digits.slice(0, B.digits.length - zb))
  const P = props.product === undefined ? null : splitDec(props.product)
  const lines: { digits: string; dotAfter: number; off: number }[] = [
    { ...A, off: z - za },
    { ...B, off: z - zb },
  ]
  const two = !!props.steps && P !== null && coreB >= 10 && coreB <= 99 && coreB % 10 !== 0
  if (two) {
    lines.push({ digits: String(coreA * (coreB % 10)), dotAfter: -1, off: z })
    lines.push({ digits: String(coreA * Math.floor(coreB / 10)), dotAfter: -1, off: z + 1 })
  }
  if (P) lines.push({ ...P, off: 0 })
  // 没写积时，横线下的虚线按整数乘法的积留够宽（乘数里有 □ 时按两个乘数里宽的那个多留一位）
  const prod = coreA * coreB
  const blankWidth = Number.isFinite(prod) ? String(prod).length + z : Math.max(A.digits.length, B.digits.length) + 1
  const cols = Math.max(...lines.map((l) => l.digits.length + l.off), P ? 0 : blankWidth)
  const rows = lines.map((l) => {
    const out: DmCell[] = Array.from({ length: cols }, () => ({ ch: '', dot: false }))
    const start = cols - l.off - l.digits.length
    l.digits.split('').forEach((ch, i) => (out[start + i] = { ch, dot: i === l.dotAfter }))
    return out
  })
  return { cols, two, rows, parts: two ? [rows[2]!, rows[3]!] : [], sum: P ? rows[rows.length - 1]! : null }
})
</script>

<template>
  <div v-if="dm" class="vertical dmul" :class="{ tall: dm.two }" :style="{ '--cols': dm.cols }">
    <div v-for="(line, r) in dm.rows.slice(0, 2)" :key="`f${r}`" class="row factor">
      <span class="op">{{ r === 1 ? '×' : '' }}</span>
      <span v-for="(c, i) in line" :key="i" class="digit">{{ c.ch }}<i v-if="c.dot" class="pt" /></span>
    </div>
    <div class="rule" />
    <template v-if="dm.two">
      <div v-for="(part, k) in dm.parts" :key="`p${k}`" class="row part" :class="`p${k + 1}`">
        <span class="op" />
        <span v-for="(c, i) in part" :key="i" class="digit">{{ c.ch }}</span>
      </div>
      <div class="rule" />
    </template>
    <div v-if="dm.sum" class="row sum">
      <span class="op" />
      <span v-for="(c, i) in dm.sum" :key="i" class="digit">{{ c.ch }}<i v-if="c.dot" class="pt" /></span>
    </div>
    <div v-else class="row answer">
      <span class="op" />
      <span class="blank-line" />
    </div>
  </div>
  <div v-else-if="mul" class="vertical mul" :class="{ marked: !!mark }" :style="{ '--cols': mul.cols }">
    <div class="row">
      <span class="op" />
      <span v-for="(d, i) in mul.rows[0]" :key="`a${i}`" class="digit">{{ d }}</span>
      <span v-if="mark" class="arrow" />
    </div>
    <div class="row">
      <span class="op">×</span>
      <span v-for="(d, i) in mul.rows[1]" :key="`b${i}`" class="digit">{{ d }}</span>
      <span v-if="mark" class="arrow" />
    </div>
    <div class="rule" />
    <template v-if="mul.two">
      <div v-for="(part, k) in mul.parts" :key="`p${k}`" class="row part" :class="[`p${k + 1}`, { filled: showParts && !work }]">
        <span class="op" />
        <span v-for="(d, i) in part" :key="i" class="digit" :class="{ ph: d !== ' ' && !showParts }">{{ showParts ? d : '' }}</span>
        <span v-if="mark" class="arrow">{{ mark === k + 1 ? '←' : '' }}</span>
      </div>
      <div class="rule" />
    </template>
    <div v-if="work" class="row sum">
      <span class="op" />
      <span v-for="(d, i) in mul.sum" :key="`s${i}`" class="digit">{{ d }}</span>
      <span v-if="mark" class="arrow" />
    </div>
    <div v-else class="row answer" :class="{ done }">
      <span class="op typed">{{ mulAnswer[0] }}</span>
      <span v-for="(d, i) in mulAnswer.slice(1)" :key="`c${i}`" class="digit blank typed">{{ d }}</span>
      <span v-if="mark" class="arrow" />
    </div>
  </div>
  <div v-else-if="dec" class="vertical dec" :class="{ three: dec.rows.length > 2 }" :style="{ '--tmpl': decTemplate }">
    <div v-for="(line, r) in dec.rows" :key="`l${r}`" class="row">
      <span class="op">{{ r === dec.rows.length - 1 ? opText : '' }}</span>
      <span v-for="(d, i) in line" :key="i" class="digit" :class="{ pt: dec.point[i] }">{{ d }}</span>
    </div>
    <div class="rule" />
    <div v-if="dec.result" class="row sum">
      <span class="op" />
      <span v-for="(d, i) in dec.result" :key="i" class="digit" :class="{ pt: dec.point[i] }">{{ d }}</span>
    </div>
    <div v-else class="row answer">
      <span class="op" />
      <span v-for="(p, i) in dec.point" :key="i" class="digit" :class="p ? 'pt' : 'blank'" />
    </div>
  </div>
  <div v-else class="vertical" :style="{ '--cols': width }">
    <div class="row">
      <span class="op" />
      <span v-for="(d, i) in rowA" :key="`a${i}`" class="digit">{{ d }}</span>
    </div>
    <div class="row">
      <span class="op">{{ opText }}</span>
      <span v-for="(d, i) in rowB" :key="`b${i}`" class="digit">{{ d }}</span>
    </div>
    <div class="rule" />
    <div class="row answer" :class="{ done }">
      <span class="op typed">{{ rowC[0] }}</span>
      <span v-for="(d, i) in rowC.slice(1)" :key="`c${i}`" class="digit blank typed">{{ d }}</span>
    </div>
  </div>
</template>

<style scoped>
.vertical {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px 18px 12px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  font-size: var(--fs-huge);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}
.row {
  display: grid;
  grid-template-columns: 1.1em repeat(var(--cols), 1.1em);
  line-height: 1.35;
}
.op {
  color: var(--c-primary-dark);
  text-align: left;
}
.digit {
  text-align: center;
  white-space: pre;
}
.rule {
  height: 4px;
  border-radius: 2px;
  background: var(--c-text);
  margin: 4px 0 2px;
}
.digit.blank {
  height: 1.35em;
  border-bottom: 3px dashed var(--c-locked);
  margin: 0 3px;
}
.typed {
  color: var(--c-primary-dark);
  text-align: center;
  white-space: pre;
}
.done .typed {
  color: var(--c-green);
}
/* 乘数是两位数的竖式有五行：整体小一号（行和格子都按 em 算，跟着缩），练习页、对战里一屏放得下 */
.mul .row {
  font-size: 0.78em;
}
.mul.marked .row {
  grid-template-columns: 1.1em repeat(var(--cols), 1.1em) 1.3em;
}
/* 两次乘得的数：没答完只画小虚线格（课本例题里的方框），答完填上（和答对的积一样是绿色） */
.mul .digit.ph {
  height: 1.1em;
  margin: 0.12em 0.14em 0.13em;
  border: 2px dotted var(--c-locked);
  border-radius: 4px;
}
.mul .part.filled .digit {
  color: var(--c-green);
}
.mul .arrow {
  color: #e2483d;
  text-align: center;
}
/* 小数竖式（四下）：列宽按列算（小数点那一列窄）；三个数连加的竖式有五行，小一号 */
.dec .row {
  grid-template-columns: var(--tmpl);
}
.dec.three .row {
  font-size: 0.85em;
}
.dec .digit.pt {
  text-align: center;
}
.dec .answer .digit.pt {
  height: 1.35em;
}
/* 小数乘法竖式（五上）：小数点画在这一位的右下角（不占一列，课本的写法）；有两次乘得的数的竖式五行，小一号 */
.dmul .digit {
  position: relative;
}
.dmul .pt {
  position: absolute;
  right: -0.09em;
  bottom: 0.3em;
  width: 0.18em;
  height: 0.18em;
  border-radius: 50%;
  background: currentColor;
}
.dmul.tall .row {
  font-size: 0.78em;
}
/* 没写积：横线下一条虚线（不按位画格子——格子数会透露积有几位，0.0224 和 0.224 就差在这里） */
.dmul .blank-line {
  grid-column: 2 / -1;
  height: 1.35em;
  border-bottom: 3px dashed var(--c-locked);
  margin: 0 3px;
}
</style>
