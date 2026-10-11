<script setup lang="ts">
import { computed } from 'vue'
import type { ChainArc, ChainTerm } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import { t } from '@/engine/i18n'

/**
 * 分数链（五下「分数的基本性质」例 1 的箭头图、例 2「2/3 = (2×□)/(3×4) = □/12」，约分、通分、假分数化带分数）：
 * 一排上下两层的分数（分子、分母可以是数、「2×4」这样的短算式或要填的「?」；带分数的整数部分写在左边，和分子分母一样大），
 * 中间写「=」等字；arcs = 两个分数之间的红色弧形箭头，分子上方的写 top、分母下方的写 bottom（「×2」「÷?」）。
 * fill：练习页把按的数字填进所有「?」（几个「?」是同一个数）；不传（对战）就画「?」。图里的字不朗读，aria-label 只说是分数算式。
 * SVG 按 viewBox 缩放，窄栏里随宽缩小。
 */
const props = withDefaults(defineProps<{ terms: ChainTerm[]; arcs?: ChainArc[]; fill?: BlankFill | null }>(), { arcs: () => [], fill: null })

const FS = 22 // 分子、分母、整数部分的字号
const DIGIT = 13 // 一个数字多宽
const PAD = 5 // 分数线比分子分母两边各长出多少
const GAP = 7 // 两项之间
const ARC = 36 // 弧形箭头占的高度
const SIDE = 6
/** 屏幕上比 viewBox 放大一点（和题干里上下两层的分数差不多大）；窄栏里照样随宽缩小 */
const ZOOM = 1.2

/** 要填的数：按了就显示按的，没按画「?」 */
const askText = computed(() => props.fill?.value || '?')
const slotW = computed(() => Math.max(22, askText.value.length * DIGIT + 10))

/** 一个字多宽：数字 13，运算符号 15，汉字 22，其余 10 */
function charW(c: string): number {
  if (/\d/.test(c)) return DIGIT
  if (/[×÷+−\-=○><]/.test(c)) return 15
  if (/\p{Script=Han}/u.test(c)) return FS
  if (c === ' ') return 6
  return 10
}

interface Piece {
  /** 相对这一段左端的 x */
  x: number
  text: string
  ask: boolean
  w: number
}
/** 一段字切成几块：普通的字一块，每个「?」一块（画成框） */
function pieces(s: string): { list: Piece[]; w: number } {
  const list: Piece[] = []
  let x = 0
  let buf = ''
  let bx = 0
  const flush = (): void => {
    if (!buf) return
    const w = [...buf].reduce((sum, c) => sum + charW(c), 0)
    list.push({ x: bx, text: buf, ask: false, w })
    buf = ''
  }
  for (const c of s) {
    if (c === '?') {
      flush()
      list.push({ x, text: '?', ask: true, w: slotW.value })
      x += slotW.value
      bx = x
    } else {
      if (!buf) bx = x
      buf += c
      x += charW(c)
    }
  }
  flush()
  return { list, w: x }
}

interface Laid {
  kind: 'frac' | 'text'
  /** 这一项的左端、宽 */
  x: number
  w: number
  /** 分数线的中点 x（带分数是分数部分的） */
  cx: number
  /** 分子、分母两行（y 是这一行字的基线） */
  rows: { list: Piece[]; w: number; y: number }[]
  whole?: { list: Piece[]; w: number }
  text?: { list: Piece[]; w: number }
  barW: number
}

const layout = computed(() => {
  const hasTop = props.arcs.some((a) => a.top)
  const hasBottom = props.arcs.some((a) => a.bottom)
  const top = hasTop ? ARC + 4 : SIDE
  const barY = top + FS + 4
  const height = barY + FS + 8 + (hasBottom ? ARC + 4 : SIDE)
  const numY = barY - 6
  const denY = barY + FS + 1
  let x = SIDE
  const items: Laid[] = props.terms.map((term) => {
    if ('t' in term) {
      const text = pieces(term.t)
      const w = text.w + 8
      const it: Laid = { kind: 'text', x, w, cx: x + w / 2, rows: [], text, barW: 0 }
      x += w + GAP
      return it
    }
    const num = pieces(term.n)
    const den = pieces(term.d)
    const whole = term.w !== undefined ? pieces(term.w) : undefined
    const barW = Math.max(num.w, den.w) + PAD * 2
    const lead = whole ? whole.w + 3 : 0
    const w = lead + barW
    const it: Laid = { kind: 'frac', x, w, cx: x + lead + barW / 2, rows: [{ ...num, y: numY }, { ...den, y: denY }], whole, barW }
    x += w + GAP
    return it
  })
  const width = x - GAP + SIDE
  return { items, width, height, barY, midY: barY + 8 }
})

/** 弧形箭头：上面的从分子上方弯过去，下面的从分母下方弯过去；箭头尖在终点 */
const arcPaths = computed(() => {
  const L = layout.value
  const out: { d: string; head: string; label: { list: Piece[]; w: number }; lx: number; ly: number }[] = []
  for (const a of props.arcs) {
    const from = L.items[a.from]
    const to = L.items[a.to]
    if (!from || !to) continue
    const x1 = from.cx
    const x2 = to.cx
    const mid = (x1 + x2) / 2
    for (const [label, up] of [
      [a.top, true],
      [a.bottom, false],
    ] as const) {
      if (!label) continue
      const y0 = up ? L.barY - FS - 8 : L.barY + FS + 10
      const cy = up ? y0 - 22 : y0 + 22
      // 终点的切线方向（二次贝塞尔在终点的切线是控制点 → 终点）
      const ang = Math.atan2(y0 - cy, x2 - 4 - mid)
      const hx = x2 - 4
      const tip = (dx: number, dy: number): string => `${(hx + dx).toFixed(1)} ${(y0 + dy).toFixed(1)}`
      const s = 7
      const head = `M${tip(0, 0)}L${tip(-s * Math.cos(ang - 0.45), -s * Math.sin(ang - 0.45))}L${tip(-s * Math.cos(ang + 0.45), -s * Math.sin(ang + 0.45))}Z`
      const lab = pieces(label)
      out.push({ d: `M${(x1 + 4).toFixed(1)} ${y0}Q${mid.toFixed(1)} ${cy} ${hx.toFixed(1)} ${y0}`, head, label: lab, lx: mid - lab.w / 2, ly: up ? y0 - 15 : y0 + 26 })
    }
  }
  return out
})

const filled = computed(() => !!props.fill && props.fill.value !== '')
const done = computed(() => !!props.fill?.done)
</script>

<template>
  <svg
    class="frac-chain"
    :viewBox="`0 0 ${layout.width} ${layout.height}`"
    :width="layout.width * ZOOM"
    :height="layout.height * ZOOM"
    role="img"
    :aria-label="t({ k: 'm5.frac.chainAria' })"
  >
    <g v-for="(it, i) in layout.items" :key="i" class="term">
      <template v-if="it.kind === 'frac'">
        <!-- 带分数的整数部分：和分子分母一样大，竖直居中在分数线上 -->
        <g v-if="it.whole" class="whole">
          <template v-for="(p, k) in it.whole.list" :key="`w${k}`">
            <g v-if="p.ask" class="ask" :class="{ filled, done }">
              <rect :x="it.x + p.x" :y="layout.midY - FS + 2" :width="p.w" :height="FS + 4" rx="4" />
              <text :x="it.x + p.x + p.w / 2" :y="layout.midY" text-anchor="middle">{{ askText }}</text>
            </g>
            <text v-else :x="it.x + p.x" :y="layout.midY">{{ p.text }}</text>
          </template>
        </g>
        <line class="bar" :x1="it.cx - it.barW / 2" :x2="it.cx + it.barW / 2" :y1="layout.barY" :y2="layout.barY" />
        <template v-for="(row, r) in it.rows" :key="`r${r}`">
          <template v-for="(p, k) in row.list" :key="`p${r}-${k}`">
            <g v-if="p.ask" class="ask" :class="{ filled, done }">
              <rect :x="it.cx - row.w / 2 + p.x" :y="r === 0 ? row.y - FS : row.y - FS + 3" :width="p.w" :height="FS + 2" rx="4" />
              <text :x="it.cx - row.w / 2 + p.x + p.w / 2" :y="row.y" text-anchor="middle">{{ askText }}</text>
            </g>
            <text v-else :class="r === 0 ? 'num' : 'den'" :x="it.cx - row.w / 2 + p.x" :y="row.y">{{ p.text }}</text>
          </template>
        </template>
      </template>
      <template v-else>
        <template v-for="(p, k) in it.text?.list ?? []" :key="`t${k}`">
          <g v-if="p.ask" class="ask" :class="{ filled, done }">
            <rect :x="it.x + 4 + p.x" :y="layout.midY - FS + 2" :width="p.w" :height="FS + 4" rx="4" />
            <text :x="it.x + 4 + p.x + p.w / 2" :y="layout.midY" text-anchor="middle">{{ askText }}</text>
          </g>
          <text v-else class="sign" :x="it.x + 4 + p.x" :y="layout.midY">{{ p.text }}</text>
        </template>
      </template>
    </g>
    <g v-for="(a, i) in arcPaths" :key="`a${i}`" class="arc">
      <path class="curve" :d="a.d" />
      <path class="head" :d="a.head" />
      <template v-for="(p, k) in a.label.list" :key="`l${k}`">
        <g v-if="p.ask" class="ask small" :class="{ filled, done }">
          <rect :x="a.lx + p.x" :y="a.ly - 16" :width="p.w" :height="20" rx="4" />
          <text :x="a.lx + p.x + p.w / 2" :y="a.ly" text-anchor="middle">{{ askText }}</text>
        </g>
        <text v-else class="label" :x="a.lx + p.x" :y="a.ly">{{ p.text }}</text>
      </template>
    </g>
  </svg>
</template>

<style scoped>
.frac-chain {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
text {
  font-size: 22px;
  font-weight: 800;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.bar {
  stroke: var(--c-text);
  stroke-width: 2;
}
.arc .curve {
  fill: none;
  stroke: var(--c-red);
  stroke-width: 1.8;
}
.arc .head {
  fill: var(--c-red);
}
.arc .label {
  font-size: 16px;
  fill: var(--c-red);
}
.ask rect {
  fill: #fff3e6;
  stroke: var(--c-primary);
  stroke-width: 2;
  stroke-dasharray: 5 3;
}
.ask text {
  fill: var(--c-locked);
}
.ask.small text {
  font-size: 16px;
}
.ask.filled text {
  fill: var(--c-primary-dark);
}
.ask.done rect {
  stroke: var(--c-green);
  stroke-dasharray: none;
}
.ask.done text {
  fill: var(--c-green);
}
</style>
