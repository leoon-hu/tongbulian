<script setup lang="ts">
import { computed } from 'vue'

/**
 * 小数卡（四下「小数的意义和性质」）：照课本写的一个小数，大字；小数点画成窄窄的一个点（不像数字那样占一整格）。
 * marks = 下面画横线的那几位（按字符下标，从左数，0 起；「画横线的数字表示什么」）。
 * frac = 不写小数、画一个上下两层的分数（分母是 1000、10000 的分数：文字里画不成两层，放在卡上）。
 * 卡上的数不朗读（读法题读出来就是答案），读屏也只读看得见的字。字号随屏宽、随位数缩（对战紧凑版的窄栏里也放得下）。
 * 六年级起（六上「生活中的负数」、六下「负数」、六上「百分数」）：n 里可以有正负号「−6」「+41」、单位「℃」「%」（「−6 ℃」「35%」），
 * 正负号、单位、空格各画成自己的样子（不占数字的一格）；sign = 分数前面的正负号（「−3/8」「+4/5」）。不用这些时和原来画得一样。
 */
const props = withDefaults(defineProps<{ n?: string; marks?: number[]; frac?: [number, number]; sign?: '+' | '−' }>(), {
  n: undefined,
  marks: () => [],
  frac: undefined,
  sign: undefined,
})

/** 六年级的正负号、单位、空格（不是数字的字符）：画成窄一点的符号，不当数字的一格 */
const SYM: Record<string, 'sg' | 'u' | 'sp'> = { '+': 'sg', '−': 'sg', '-': 'sg', '%': 'u', '％': 'u', '℃': 'u', ' ': 'sp', '\u2009': 'sp' }
const SYM_WIDTH: Record<'sg' | 'u' | 'sp', number> = { sg: 0.62, u: 0.9, sp: 0.25 }

/** 带上点的是第几个字（去掉上点以后数） */
const dotted = computed(() => {
  const out = new Set<number>()
  let i = -1
  for (const ch of Array.from(props.n ?? '')) {
    if (ch === '\u0307') out.add(i)
    else i += 1
  }
  return out
})
/**
 * 五上「小数除法」的循环小数（fraction.ts 的 repeating：循环节首末位后面跟一个 U+0307）：那一位上面画圆点（照课本），
 * 上点本身不占一个字；marks 的下标照旧按去掉上点以后的字符数（没有上点的数和原来一样）
 */
const chars = computed(() =>
  Array.from((props.n ?? '').replace(/\u0307/g, '')).map((ch, i) => ({ ch, i, point: ch === '.', sym: SYM[ch], mark: props.marks.includes(i), dot: dotted.value.has(i) })),
)
/** 字号封顶：按一行有几个字符算（一位数字约 0.62em，小数点约 0.3em；卡左右留白 28px），最大 46px、最小 18px */
const fit = computed(() => {
  const width = props.frac
    ? Math.max(String(props.frac[0]).length, String(props.frac[1]).length) * 0.62 + (props.sign ? 0.62 : 0)
    : chars.value.reduce((s, c) => s + (c.point ? 0.3 : c.sym ? SYM_WIDTH[c.sym] : 0.62), 0)
  return `${Math.max(18, Math.min(46, Math.floor(212 / Math.max(width, 1))))}px`
})
</script>

<template>
  <div class="dec-card" :style="{ '--fit': fit }">
    <span v-if="frac && sign" class="sg" aria-hidden="true">{{ sign }}</span>
    <span v-if="frac" class="frac" :aria-label="`${sign ?? ''}${frac[0]}/${frac[1]}`">
      <span class="num">{{ frac[0] }}</span>
      <span class="den">{{ frac[1] }}</span>
    </span>
    <span v-else class="dec">
      <span v-for="c in chars" :key="c.i" :class="c.point ? 'pt' : c.sym ? c.sym : ['d', { mark: c.mark, rep: c.dot }]">{{ c.ch }}</span>
    </span>
  </div>
</template>

<style scoped>
.dec-card {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-size: min(46px, 9vw, var(--fit, 46px));
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.dec {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}
.d {
  display: inline-block;
  min-width: 0.6em;
  text-align: center;
}
/* 小数点：窄窄的一个点，贴着前后的数字 */
.pt {
  display: inline-block;
  width: 0.3em;
  text-align: center;
}
/* 循环小数的点：圆点在这一位数字的正上方（五上） */
.d.rep {
  position: relative;
}
.d.rep::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0.02em;
  width: 0.16em;
  height: 0.16em;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(-50%);
}
/* 画横线的数字 */
.d.mark {
  border-bottom: 3px solid var(--c-primary-dark);
  color: var(--c-primary-dark);
}
/* 六年级：正负号（分数前面的也是）、单位 ℃ / %、空格 */
.sg {
  display: inline-block;
  min-width: 0.5em;
  text-align: center;
}
.u {
  display: inline-block;
  margin-left: 0.04em;
  font-size: 0.8em;
}
.sp {
  display: inline-block;
  width: 0.2em;
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.86em;
  line-height: 1.1;
}
.frac .num {
  padding: 0 0.2em 0.08em;
  border-bottom: 0.08em solid currentColor;
}
.frac .den {
  padding: 0.08em 0.2em 0;
}
</style>
