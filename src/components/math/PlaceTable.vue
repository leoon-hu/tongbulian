<script setup lang="ts">
import { computed } from 'vue'
import { lang } from '@/engine/i18n'

/**
 * 数位顺序表（四上 p2 / p3 / p10 的表）：左边一列是行名「数级 / 数位 / 计数单位」，接着一列「……」，再从 top 位到个位一列一位；
 * 第一行是数级（亿级 / 万级 / 个级，各占自己那几列），第二行数位（千亿位……个位），第三行计数单位（千亿……个）。
 * 表里的字竖着一个字一行写（课本的样子，窄屏放得下 12 位），是图里的字：不注音、不朗读（同月历的表头）；英文写 100M、10K 这样的位值。
 * ask = 这一位的数位和计数单位画成「?」（问这一格是什么数位）。
 * dec（四下 p34「小数的数位顺序表」）：第一行改成「整数部分 | 小数点 | 小数部分」，整数部分从 top 位到个位，接着小数点一列（「·」），
 * 小数部分从十分位到第 dec 位、后面一列「……」；计数单位的个位照课本写「一（个）」。ask 是负数时问小数部分（-1 十分位、-2 百分位……）。
 * 不传 dec 就是原来的表，一点不变。
 */
const props = defineProps<{ top: number; ask?: number; dec?: number }>()

const PLACE_ZH = ['个位', '十位', '百位', '千位', '万位', '十万位', '百万位', '千万位', '亿位', '十亿位', '百亿位', '千亿位']
const UNIT_ZH = ['个', '十', '百', '千', '万', '十万', '百万', '千万', '亿', '十亿', '百亿', '千亿']
const VALUE_EN = ['1', '10', '100', '1K', '10K', '100K', '1M', '10M', '100M', '1B', '10B', '100B']
const LEVEL_ZH = ['个级', '万级', '亿级']
const LEVEL_EN = ['ones', '万', '亿']
const HEAD_ZH = ['数级', '数位', '计数单位']
const HEAD_EN = ['group', 'place', 'unit']

const zh = computed(() => lang.value === 'zh')
/** 从高位到低位的各位 */
const places = computed(() => Array.from({ length: props.top + 1 }, (_, i) => props.top - i))
/** 数级那一行：每一级占几列 */
const levels = computed(() => {
  const out: { lv: number; span: number }[] = []
  for (const p of places.value) {
    const lv = Math.floor(p / 4)
    const last = out[out.length - 1]
    if (last && last.lv === lv) last.span++
    else out.push({ lv, span: 1 })
  }
  return out
})
const placeText = (p: number): string => (zh.value ? PLACE_ZH[p]! : VALUE_EN[p]!)
const unitText = (p: number): string => (zh.value ? UNIT_ZH[p]! : VALUE_EN[p]!)
const levelText = (lv: number): string => (zh.value ? LEVEL_ZH[lv]! : LEVEL_EN[lv]!)
const head = computed(() => (zh.value ? HEAD_ZH : HEAD_EN))

// ── 小数的数位顺序表（dec）──
const DEC_PLACE_ZH = ['十分位', '百分位', '千分位', '万分位']
const DEC_UNIT_ZH = ['十分之一', '百分之一', '千分之一', '万分之一']
const DEC_VALUE_EN = ['0.1', '0.01', '0.001', '0.0001']
/** 小数部分的各位：-1 十分位……-dec */
const decPlaces = computed(() => Array.from({ length: Math.min(4, props.dec ?? 0) }, (_, i) => -(i + 1)))
const decPlaceText = (p: number): string => (zh.value ? DEC_PLACE_ZH[-p - 1]! : DEC_VALUE_EN[-p - 1]!)
const decUnitText = (p: number): string => (zh.value ? DEC_UNIT_ZH[-p - 1]! : DEC_VALUE_EN[-p - 1]!)
/** 整数部分的计数单位：个位照课本写「一（个）」（这一格竖排：writing-mode，括号跟着转） */
const intUnitText = (p: number): string => (p === 0 && zh.value ? '一（个）' : unitText(p))
const decHead = computed(() => (zh.value ? ['整数部分', '小数点', '小数部分'] : ['whole part', 'point', 'decimal part']))
</script>

<template>
  <figure class="place-table" :class="{ en: !zh }">
    <table v-if="dec" class="dec">
      <tbody>
        <tr class="parts">
          <th class="head" />
          <td :colspan="places.length + 1" class="level">{{ decHead[0] }}</td>
          <td class="level mid"><span class="v">{{ decHead[1] }}</span></td>
          <td :colspan="decPlaces.length + 1" class="level">{{ decHead[2] }}</td>
        </tr>
        <tr class="places">
          <th class="head"><span class="v">{{ head[1] }}</span></th>
          <td class="dots">……</td>
          <td v-for="p in places" :key="p" :class="{ ask: p === ask }" :data-place="p">
            <span v-if="p === ask" class="q">?</span>
            <span v-else class="v">{{ placeText(p) }}</span>
          </td>
          <td class="point" rowspan="2">·</td>
          <td v-for="p in decPlaces" :key="p" :class="{ ask: p === ask }" :data-place="p">
            <span v-if="p === ask" class="q">?</span>
            <span v-else class="v">{{ decPlaceText(p) }}</span>
          </td>
          <td class="dots">……</td>
        </tr>
        <tr class="units">
          <th class="head"><span class="v">{{ head[2] }}</span></th>
          <td class="dots">……</td>
          <td v-for="p in places" :key="p" :class="{ ask: p === ask }">
            <span v-if="p === ask" class="q">?</span>
            <span v-else-if="p === 0 && zh" class="vert">{{ intUnitText(p) }}</span>
            <span v-else class="v">{{ intUnitText(p) }}</span>
          </td>
          <td v-for="p in decPlaces" :key="p" :class="{ ask: p === ask }">
            <span v-if="p === ask" class="q">?</span>
            <span v-else class="v">{{ decUnitText(p) }}</span>
          </td>
          <td class="dots">……</td>
        </tr>
      </tbody>
    </table>
    <table v-else>
      <tbody>
        <tr class="levels">
          <th class="head"><span class="v">{{ head[0] }}</span></th>
          <td class="dots">……</td>
          <td v-for="l in levels" :key="l.lv" :colspan="l.span" class="level">{{ levelText(l.lv) }}</td>
        </tr>
        <tr class="places">
          <th class="head"><span class="v">{{ head[1] }}</span></th>
          <td class="dots">……</td>
          <td v-for="p in places" :key="p" :class="{ ask: p === ask }" :data-place="p">
            <span v-if="p === ask" class="q">?</span>
            <span v-else class="v">{{ placeText(p) }}</span>
          </td>
        </tr>
        <tr class="units">
          <th class="head"><span class="v">{{ head[2] }}</span></th>
          <td class="dots">……</td>
          <td v-for="p in places" :key="p" :class="{ ask: p === ask }">
            <span v-if="p === ask" class="q">?</span>
            <span v-else class="v">{{ unitText(p) }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<style scoped>
.place-table {
  margin: 0;
  max-width: 100%;
  overflow-x: auto;
}
table {
  margin: 0 auto;
  border-collapse: collapse;
  background: var(--c-card);
  color: var(--c-text);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.15;
}
/* 12 位的表（千亿位到个位）在对战紧凑版的窄栏里缩到 0.5 还宽出十来像素：格子收窄一点 */
td,
th {
  padding: 2px 1px;
  min-width: 1.3em;
  border: 1.5px solid #7fbdf0;
  text-align: center;
  vertical-align: top;
}
th.head {
  background: #e8f5ee;
  font-size: 13px;
}
td.level {
  background: #e8f5ee;
  vertical-align: middle;
  white-space: nowrap;
}
td.dots {
  vertical-align: middle;
  font-size: 11px;
  letter-spacing: -1px;
}
/* 竖着写：一个字一行（英文的位值横着写） */
.v {
  display: inline-block;
  width: 1em;
  word-break: break-all;
}
.en .v {
  width: auto;
  word-break: normal;
  font-size: 12px;
}
td.ask {
  background: #fff3e6;
  vertical-align: middle;
}
.q {
  color: var(--c-primary-dark);
  font-size: 20px;
  font-weight: 800;
}
/* 小数的数位顺序表：个位的计数单位「一（个）」竖排，括号跟着转 */
.vert {
  display: inline-block;
  writing-mode: vertical-rl;
  line-height: 1;
}
/* 小数的数位顺序表：表头「小数点」也竖着写（课本表里的字都是竖排），小数点一列就只有一个字宽——横着写这一列有 3 个字宽，
   打怪兽手机横屏两人的窄栏里缩到 0.5 还宽出 6px；两头的「……」也小一号 */
.dec td.level.mid {
  white-space: normal;
}
.dec td.dots {
  font-size: 9px;
}
/* 小数的数位顺序表：小数点一列只有一个大点（min-width 按这里的大字号算会有 34px 宽，这一列的宽由竖排的表头定） */
td.point {
  vertical-align: middle;
  min-width: 0;
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
}
</style>
