<script setup lang="ts">
import { computed } from 'vue'
import type { ProtractorPoint, ProtractorRay } from '@/types/models'

/**
 * 量角器（四上「角的度量」，照课本第 30 页的样子）：半圆，直边上有中心和 0° 刻度线；外沿每 1° 一根细刻度（每 5°、10° 长一些），
 * 里面两圈数每 10° 一个——外圈 0 在左、顺时针数到右边 180，内圈 0 在右、逆时针数到左边 180，顶上一个大「90」两圈共用。
 * rays：从中心起的线（角的边，伸出量角器外）；arc：两条边之间的红弧；points：外沿上标着字母的点（画角：在哪个点画点）；
 * center：中心旁的字母（O）；tilt：整个量角器连同角逆时针斜放几度（课本第 31 页做一做 1 的右图）；name：写在角里的编号（∠1 的「1」）。
 * 读屏说明只用 alt（不写度数）；刻度和数都画在 SVG 里，不朗读。
 */
const props = withDefaults(
  defineProps<{ rays?: ProtractorRay[]; arc?: [number, number] | null; points?: ProtractorPoint[]; center?: string; tilt?: number; name?: string; alt?: string }>(),
  { rays: () => [], arc: null, points: () => [], center: '', tilt: 0, name: '', alt: '' },
)

const R = 150 // 外沿半径
const R_OUT = 131 // 外圈的数
const R_SEP = 123 // 两圈数之间的弧（顶上的大 90 压在它上面）
const R_IN = 115 // 内圈的数
const R_INNER = 107 // 内圈数里面的弧
const R_HUB = 34 // 中间的小半圆
const RAY = 172 // 角的边画多长（伸出外沿）
const STRIP = 14 // 直边下面那条窄边的宽
const K = 1 // 每个单位画几像素（放不下时随宽度等比缩小；0.88 时手机上刻度数字只有 10px）

const f1 = (n: number): number => Math.round(n * 10) / 10
const rad = (deg: number): number => (deg * Math.PI) / 180

/** 量角器自己的坐标（中心在原点，x 向右、y 向下）→ 斜放 tilt 度以后的坐标 */
function turn(p: [number, number]): [number, number] {
  const t = rad(props.tilt)
  return [p[0] * Math.cos(t) + p[1] * Math.sin(t), -p[0] * Math.sin(t) + p[1] * Math.cos(t)]
}
/** 对着量角器上 deg 度（从右边的 0 起逆时针）、离中心 r 的点 */
const pol = (deg: number, r: number): [number, number] => turn([r * Math.cos(rad(deg)), -r * Math.sin(rad(deg))])
const pt = (p: [number, number]): string => `${f1(p[0])} ${f1(p[1])}`
/** 半径 r 的半圆弧（右端 → 顶上 → 左端） */
const half = (r: number): string => `M ${pt(pol(0, r))} A ${r} ${r} 0 0 0 ${pt(pol(180, r))}`

const body = computed(() => `${half(R)} Z`)
const strip = computed(() => {
  const c = [turn([-R - 6, 0]), turn([R + 6, 0]), turn([R + 6, STRIP]), turn([-R - 6, STRIP])]
  return `M ${c.map(pt).join(' L ')} Z`
})
const rings = computed(() => [half(R_SEP), half(R_INNER), `${half(R_HUB)} Z`].join(' '))

/** 外沿的刻度：每 1° 短细，每 5° 长一点，每 10° 最长 */
const ticks = computed(() => {
  const fine: string[] = []
  const mid: string[] = []
  const long: string[] = []
  for (let d = 0; d <= 180; d++) {
    const len = d % 10 === 0 ? 11 : d % 5 === 0 ? 7.5 : 4
    const seg = `M ${pt(pol(d, R))} L ${pt(pol(d, R - len))}`
    if (d % 10 === 0) long.push(seg)
    else if (d % 5 === 0) mid.push(seg)
    else fine.push(seg)
  }
  return { fine: fine.join(' '), mid: mid.join(' '), long: long.join(' ') }
})

/** 里面每 10° 一条放射线（中间那条从中心画起，对着 90） */
const spokes = computed(() => {
  const out: string[] = []
  for (let d = 10; d <= 170; d += 10) out.push(`M ${pt(pol(d, d === 90 ? 0 : R_HUB))} L ${pt(pol(d, R_INNER))}`)
  return out.join(' ')
})

interface Num {
  /** 摆字的变换：挪到位置、顺着圆弧转、三位数横向收窄一点（不然 100–180 挤在一起） */
  tf: string
  text: string
}
/** 两圈数：位置 d 上外圈写 180 − d、内圈写 d；字顺着圆弧摆（顶上的字是正的） */
const numbers = computed(() => {
  const outer: Num[] = []
  const inner: Num[] = []
  const num = (p: [number, number], rot: number, v: number): Num => ({ tf: `translate(${f1(p[0])} ${f1(p[1])}) rotate(${rot})${v >= 100 ? ' scale(0.84 1)' : ''}`, text: String(v) })
  for (let d = 0; d <= 180; d += 10) {
    if (d === 90) continue
    const rot = f1(90 - d - props.tilt)
    outer.push(num(pol(d, R_OUT), rot, 180 - d))
    inner.push(num(pol(d, R_IN), rot, d))
  }
  return { outer, inner }
})
const ninety = computed(() => {
  const p = pol(90, R_SEP)
  return { x: f1(p[0]), y: f1(p[1]), rot: f1(-props.tilt) }
})

const rayLines = computed(() =>
  props.rays.map((r) => {
    const end = pol(r.at, RAY)
    const lab = pol(r.at, RAY + 13)
    return { d: `M 0 0 L ${pt(end)}`, label: r.label ?? '', lx: f1(lab[0]), ly: f1(lab[1]) }
  }),
)
/** 角的红弧：从小的那条边逆时针到大的那条边 */
const arcPath = computed(() => {
  if (!props.arc) return ''
  const [a, b] = [Math.min(...props.arc), Math.max(...props.arc)]
  const r = 26
  return `M ${pt(pol(a, r))} A ${r} ${r} 0 0 0 ${pt(pol(b, r))}`
})
/** 角里的编号：写在红弧外面、两条边正中间（角小的时候往外挪，别压在边上） */
const nameAt = computed(() => {
  if (!props.arc || !props.name) return null
  const half = Math.abs(props.arc[1] - props.arc[0]) / 2
  const r = Math.min(88, Math.max(44, 14 / Math.sin(rad(Math.max(half, 1)))))
  const p = pol((props.arc[0] + props.arc[1]) / 2, r)
  return { x: f1(p[0]), y: f1(p[1]) }
})
const dots = computed(() =>
  props.points.map((p) => {
    const at = pol(p.at, R + 7)
    const lab = pol(p.at, R + 22)
    return { x: f1(at[0]), y: f1(at[1]), label: p.label, lx: f1(lab[0]), ly: f1(lab[1]) }
  }),
)
/** 中心画点：标了字母（O），或者只有一条线（那是射线的端点） */
const hubDot = computed(() => !!props.center || props.rays.length === 1)
const centerLabel = computed(() => {
  const p = turn([0, STRIP + 16])
  return { x: f1(p[0]), y: f1(p[1]) }
})

/** 外框只包住画了的东西（量角器、伸出去的边、字母），留一点边：没有朝上的边时上面不空着 */
const box = computed(() => {
  const pts: [number, number][] = []
  for (let d = 0; d <= 180; d += 5) pts.push(pol(d, R))
  pts.push(turn([-R - 6, 0]), turn([R + 6, 0]), turn([R + 6, STRIP]), turn([-R - 6, STRIP]))
  const letter = (c: [number, number]): void => {
    pts.push([c[0] - 9, c[1] - 12], [c[0] + 9, c[1] + 12])
  }
  for (const r of props.rays) {
    pts.push(pol(r.at, RAY))
    if (r.label) letter(pol(r.at, RAY + 13))
  }
  for (const p of props.points) letter(pol(p.at, R + 22))
  if (props.center) letter([centerLabel.value.x, centerLabel.value.y])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x = Math.floor(Math.min(...xs) - 5)
  const y = Math.floor(Math.min(...ys) - 5)
  const w = Math.ceil(Math.max(...xs) + 5) - x
  const h = Math.ceil(Math.max(...ys) + 5) - y
  return { x, y, w, h, view: `${x} ${y} ${w} ${h}`, pw: Math.round(w * K), ph: Math.round(h * K) }
})
</script>

<template>
  <svg class="protractor" :viewBox="box.view" :width="box.pw" :height="box.ph" role="img" :aria-label="alt || undefined">
    <path class="body" :d="body" />
    <path class="strip" :d="strip" />
    <path class="ring" :d="rings" />
    <path class="spoke" :d="spokes" />
    <path class="tick fine" :d="ticks.fine" />
    <path class="tick mid" :d="ticks.mid" />
    <path class="tick long" :d="ticks.long" />
    <text v-for="n in numbers.outer" :key="`o${n.text}`" class="num out" :transform="n.tf">{{ n.text }}</text>
    <text v-for="n in numbers.inner" :key="`i${n.text}`" class="num in" :transform="n.tf">{{ n.text }}</text>
    <text class="ninety" :x="ninety.x" :y="ninety.y" :transform="`rotate(${ninety.rot} ${ninety.x} ${ninety.y})`">90</text>
    <path v-for="(r, i) in rayLines" :key="`r${i}`" class="ray" :d="r.d" />
    <path v-if="arcPath" class="arc" :d="arcPath" />
    <text v-if="nameAt" class="name" :x="nameAt.x" :y="nameAt.y">{{ name }}</text>
    <circle v-if="hubDot" class="hub" cx="0" cy="0" r="4" />
    <template v-for="(r, i) in rayLines" :key="`rl${i}`">
      <text v-if="r.label" class="letter" :x="r.lx" :y="r.ly">{{ r.label }}</text>
    </template>
    <text v-if="center" class="letter" :x="centerLabel.x" :y="centerLabel.y">{{ center }}</text>
    <template v-for="(p, i) in dots" :key="`p${i}`">
      <circle class="pick" :cx="p.x" :cy="p.y" r="5" />
      <text class="letter" :x="p.lx" :y="p.ly">{{ p.label }}</text>
    </template>
  </svg>
</template>

<style scoped>
.protractor {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
  overflow: visible;
}
.body {
  fill: #eef6ff;
  stroke: #47586b;
  stroke-width: 1.6;
}
.strip {
  fill: #e1eefb;
  stroke: #47586b;
  stroke-width: 1.4;
}
.ring {
  fill: none;
  stroke: #47586b;
  stroke-width: 1;
}
.spoke {
  fill: none;
  stroke: #8d9db0;
  stroke-width: 0.9;
}
.tick {
  fill: none;
  stroke: #2f3d4c;
  stroke-linecap: butt;
}
.tick.fine {
  stroke-width: 0.6;
}
.tick.mid {
  stroke-width: 1.1;
}
.tick.long {
  stroke-width: 1.5;
}
text {
  text-anchor: middle;
  dominant-baseline: central;
}
.num {
  font-weight: 700;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.num.out {
  font-size: 12.5px;
}
.num.in {
  font-size: 11.5px;
}
.ninety {
  font-size: 16px;
  font-weight: 800;
  fill: var(--c-text);
  paint-order: stroke;
  stroke: #eef6ff;
  stroke-width: 5px;
  stroke-linejoin: round;
}
.ray {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 2.8;
  stroke-linecap: round;
}
.arc {
  fill: none;
  stroke: #e04848;
  stroke-width: 2.4;
}
.hub {
  fill: var(--c-text);
}
.name {
  font-size: 19px;
  font-weight: 800;
  fill: #e04848;
  paint-order: stroke;
  stroke: #eef6ff;
  stroke-width: 4px;
  stroke-linejoin: round;
}
.pick {
  fill: var(--c-primary-dark);
  stroke: #fff;
  stroke-width: 1.5;
}
.letter {
  font-family: 'Times New Roman', Times, serif;
  font-style: italic;
  font-size: 20px;
  font-weight: 700;
  fill: var(--c-text);
}
</style>
