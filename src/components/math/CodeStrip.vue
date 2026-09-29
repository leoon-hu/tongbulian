<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 号码条（三年级「数字编码」）：一排数字格，按 segs 分成几段（段与段之间留缝、下面各一个括号）。
 * names：括号下面标每段的名字（中文注音；空串不标）——标了名字的段各用一种颜色，名字也用这个颜色；
 *        名字排成上下两行（第 1、3、5… 个名字一行，第 2、4… 个一行），窄的段（校验码、性别）名字也不和旁边的挤在一起。
 * mark：只标出这一段（橙色），问「这一段是什么码」时用，不写名字。
 * cell：标出这一位（橙色框，上面写它是第几位），问「第十七位」时用。
 * 格子宽按放得下的宽算（外面包一层容器，用 cqw；18 位的身份证号码在 360px 宽的手机、对战里半栏宽的题干里都放得下一行），
 * 最大 34px；不支持容器单位的浏览器按屏宽算。fit：按几位来算格子宽（上下两个号码比长短时都按长的那个算，格子一样大）。
 * 数字、名字、「第几位」的字号跟着格子宽走。
 */
const props = defineProps<{ digits: string; segs?: number[]; names?: LStr[]; mark?: number; cell?: number; fit?: number }>()

/** 段与段之间的缝（px） */
const GAP = 6

interface Seg {
  k: number
  start: number
  len: number
  chars: string[]
}
const chars = computed(() => Array.from(props.digits))
const segmented = computed(() => !!props.segs?.length)
const segments = computed<Seg[]>(() => {
  const lens = props.segs?.length ? props.segs : [chars.value.length]
  let at = 0
  return lens.map((len, k) => {
    const seg = { k, start: at, len, chars: chars.value.slice(at, at + len) }
    at += len
    return seg
  })
})
const named = computed(() => (props.names ?? []).some((n) => n !== ''))

/** 每段的颜色：标了名字的按段的序号各一色；只标一段的那段是橙色；其余是灰的 */
function segClass(k: number): string {
  if (named.value && props.names?.[k]) return `c${k % 5}`
  if (props.mark === k) return 'marked'
  return 'plain'
}

type Align = 'center' | 'start' | 'end'
interface Slot {
  k: number
  len: number
  name?: LStr
  align: Align
}
/** 名字行：每行都有和上面一样宽的格位（对得上括号），名字只放在该放的那一行 */
const nameRows = computed<Slot[][]>(() => {
  if (!named.value) return []
  const segs = segments.value
  const namedIdx = segs.filter((s) => props.names?.[s.k]).map((s) => s.k)
  const rows = namedIdx.length >= 3 ? 2 : 1
  return Array.from({ length: rows }, (_, r) =>
    segs.map((s) => {
      const nth = namedIdx.indexOf(s.k)
      // 窄的段在两头时，名字贴着外边（不然会伸出号码条）；其余居中
      const align: Align = s.len <= 2 && s.k === 0 ? 'start' : s.len <= 2 && s.k === segs.length - 1 ? 'end' : 'center'
      return { k: s.k, len: s.len, name: nth >= 0 && nth % rows === r ? props.names![s.k] : undefined, align }
    }),
  )
})

/** 算格子宽要的数：几位（--n），号码条里除了格子以外占的宽（--inner：自己的留白、段间的缝、每段的边框，再留 2px） */
const vars = computed(() => {
  const n = Math.max(1, props.fit ?? 0, chars.value.length)
  const segCount = segments.value.length
  return { '--n': String(n), '--inner': `${14 + (segCount - 1) * GAP + segCount * 3}px`, '--gap': `${GAP}px` }
})
</script>

<template>
  <div class="code-wrap">
    <div class="code-strip" :class="{ 'has-cell': cell !== undefined }" :style="vars" role="img" :aria-label="digits">
      <div class="segs">
        <div v-for="s in segments" :key="s.k" class="seg" :class="segClass(s.k)">
          <div class="cells">
            <span v-for="(ch, i) in s.chars" :key="i" class="cell" :class="{ hot: s.start + i === cell }"
              >{{ ch }}<i v-if="s.start + i === cell" class="pos">{{ cell + 1 }}</i></span
            >
          </div>
          <div v-if="segmented" class="brace" />
        </div>
      </div>
      <div v-for="(row, r) in nameRows" :key="r" class="names">
        <div v-for="slot in row" :key="slot.k" class="slot" :class="[`al-${slot.align}`, segClass(slot.k)]" :style="{ '--len': slot.len }">
          <RubyText v-if="slot.name" class="name" :text="slot.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 外层占满题干的宽、当容器，里面的格子宽按它算（cqw）。容器不按内容撑宽（inline-size 约束），所以题干多宽由题目文字定：
 * 练习页上一般就是整行宽，对战里就是那一栏的宽——号码条跟着缩，不会把题干撑大、被按栏缩放缩得很小（最多缩到一半还放不下）。
 */
.code-wrap {
  width: 100%;
}
.code-strip {
  /* 不支持容器单位时按屏宽算：再减去页面两边各 16px */
  --cw: min(34px, calc((100vw - 32px - var(--inner)) / var(--n)));
  width: fit-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 8px 6px 6px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
@supports (width: 1cqw) {
  .code-wrap {
    container-type: inline-size;
  }
  .code-strip {
    --cw: min(34px, calc((100cqw - var(--inner)) / var(--n)));
  }
}
.code-strip.has-cell {
  padding-top: calc(clamp(11px, calc(var(--cw) * 0.45), 15px) + 8px);
}
.segs,
.names {
  display: flex;
  justify-content: center;
  gap: var(--gap);
}
/* 每段的颜色：线 / 底 / 字 */
.plain {
  --segc: #cdbfae;
  --segbg: #ffffff;
  --segdark: var(--c-text);
}
.marked,
.c1 {
  --segc: var(--c-primary);
  --segbg: #fff1e5;
  --segdark: #d9590f;
}
.c0 {
  --segc: var(--c-blue);
  --segbg: #e8f4ff;
  --segdark: #2f7bd6;
}
.c2 {
  --segc: var(--c-green);
  --segbg: #e6f9f0;
  --segdark: #1f9d63;
}
.c3 {
  --segc: var(--c-red);
  --segbg: #ffeded;
  --segdark: #d94343;
}
.c4 {
  --segc: #9b7bea;
  --segbg: #f1ecfd;
  --segdark: #6c4fc4;
}
.seg {
  flex: none;
}
.cells {
  display: flex;
  border: 1.5px solid var(--segc);
  border-radius: 6px;
  background: var(--segbg);
}
.marked .cells {
  border-width: 1.5px;
  box-shadow: 0 0 0 1.5px var(--segc);
}
.cell {
  position: relative;
  width: var(--cw);
  text-align: center;
  font-size: calc(var(--cw) * 0.82);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.35;
  color: var(--c-text);
}
.cell + .cell {
  border-left: 1px solid rgba(61, 44, 30, 0.14);
}
.cell.hot {
  background: #ffd9a8;
  box-shadow: inset 0 0 0 2px var(--c-primary-dark);
  border-radius: 3px;
}
.pos {
  position: absolute;
  left: 50%;
  bottom: 100%;
  transform: translateX(-50%);
  margin-bottom: 3px;
  font-size: clamp(11px, calc(var(--cw) * 0.45), 15px);
  font-style: normal;
  font-weight: 800;
  line-height: 1;
  color: var(--c-primary-dark);
}
.brace {
  position: relative;
  height: 7px;
  margin: 3px 3px 6px;
  border: 2px solid var(--segc);
  border-top: none;
  border-radius: 0 0 7px 7px;
}
.brace::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 100%;
  width: 2px;
  height: 5px;
  background: var(--segc);
  transform: translateX(-50%);
}
.names {
  margin-top: 2px;
}
.slot {
  flex: none;
  display: flex;
  width: calc(var(--len) * var(--cw) + 3px);
}
.al-center {
  justify-content: center;
}
.al-start {
  justify-content: flex-start;
}
.al-end {
  justify-content: flex-end;
}
.name {
  white-space: nowrap;
  font-size: clamp(13px, calc(var(--cw) * 0.6), 20px);
  font-weight: 700;
  color: var(--segdark);
}
</style>
