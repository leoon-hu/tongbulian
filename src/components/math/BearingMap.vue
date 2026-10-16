<script setup lang="ts">
import { computed } from 'vue'
import type { BearingPlace, Dir4, LStr } from '@/types/models'
import { t } from '@/engine/i18n'
import { arcPath, arrowHead, AXIS_AZ, azimuthOf, f1, labelAt, midAz, textBox, unitOf } from './bearing'

/**
 * 方向和距离图（六上「用方向和距离确定位置」例 3、例 4、做一做、练习二 3，照课本画）：参照点在十字的交点，十字四头画箭头，
 * 只标「北」或东南西北都标；从参照点出去的射线按小段画刻度，端点画圆点、外侧写名字（或字母、编号、「?」）；
 * arc 的射线画红色的角弧并写度数（量在 base 那条线上，或 'other' 量在另一条线上）；左下角画比例尺（一小段 = per）。
 * 名字、方向字不注音、不朗读（题目文字里说出地方），英文写 N、E、S、W。尺寸按最远的射线定（一小段 16–34 像素），窄屏等比缩小。
 */
const props = withDefaults(defineProps<{ center: LStr; axes?: 'n' | 'all'; places: BearingPlace[]; per?: string; alt?: string }>(), {
  axes: 'n',
  per: undefined,
  alt: '',
})

interface Txt {
  x: number
  y: number
  text: string
  cls: string
  anchor: 'start' | 'middle' | 'end'
  size: number
}
interface Drawn {
  paths: { d: string; cls: string }[]
  dots: { x: number; y: number; r: number; cls: string }[]
  texts: Txt[]
  box: [number, number, number, number]
}

const NAME = 13
const SMALL = 12

const drawn = computed<Drawn>(() => {
  // 手机竖屏上一屏要放下题目、图和作答区：最远的射线约 62 像素（一小段 11–26 像素），十字只比它长一点
  const maxSegs = Math.max(1, ...props.places.map((p) => p.segs))
  const seg = Math.max(11, Math.min(26, Math.round(62 / maxSegs)))
  const arm = Math.max(maxSegs * seg + 12, 52)
  const paths: Drawn['paths'] = []
  const dots: Drawn['dots'] = []
  const texts: Txt[] = []
  // 十字：四头箭头；「北」写在上头，东、西写在箭头外侧，「南」写在下面箭头的右边（不再往下占一行）
  paths.push({ d: `M ${-arm} 0 L ${arm} 0 M 0 ${-arm} L 0 ${arm}`, cls: 'axis' })
  for (const d of ['n', 'e', 's', 'w'] as Dir4[]) {
    const [ux, uy] = unitOf(AXIS_AZ[d])
    paths.push({ d: arrowHead(ux * arm, uy * arm, AXIS_AZ[d], 7), cls: 'axis' })
  }
  texts.push({ x: 0, y: -arm - 6, text: t({ k: 'm6.pos.ax.n' }), cls: 'compass', anchor: 'middle', size: NAME })
  if (props.axes === 'all') {
    texts.push({ x: 7, y: arm - 1, text: t({ k: 'm6.pos.ax.s' }), cls: 'compass', anchor: 'start', size: NAME })
    texts.push({ x: arm + 7, y: 5, text: t({ k: 'm6.pos.ax.e' }), cls: 'compass', anchor: 'start', size: NAME })
    texts.push({ x: -arm - 7, y: 5, text: t({ k: 'm6.pos.ax.w' }), cls: 'compass', anchor: 'end', size: NAME })
  }
  // 射线
  const arcsDone = new Set<string>()
  for (const p of props.places) {
    const az = azimuthOf(p.dir)
    const [ux, uy] = unitOf(az)
    const len = p.segs * seg
    const ex = f1(ux * len)
    const ey = f1(uy * len)
    paths.push({ d: `M 0 0 L ${ex} ${ey}`, cls: 'ray' })
    if (p.ticks !== false) {
      const ticks: string[] = []
      for (let k = 1; k < p.segs; k++) {
        const qx = ux * k * seg
        const qy = uy * k * seg
        ticks.push(`M ${f1(qx - uy * 4)} ${f1(qy + ux * 4)} L ${f1(qx + uy * 4)} ${f1(qy - ux * 4)}`)
      }
      if (ticks.length) paths.push({ d: ticks.join(' '), cls: 'tick' })
    }
    if (p.dot !== false) dots.push({ x: ex, y: ey, r: 4, cls: 'end' })
    const label = p.ask ? '?' : p.tag ?? (p.name ? t(p.name) : '')
    if (label) {
      if (p.dot === false) {
        // 编号的射线：号写在射线头外面的圆牌上
        const bx = f1(ux * (len + 13))
        const by = f1(uy * (len + 13))
        dots.push({ x: bx, y: by, r: 11, cls: 'badge' })
        texts.push({ x: bx, y: f1(by + 5), text: label, cls: 'badge-txt', anchor: 'middle', size: SMALL })
      } else {
        const size = p.tag || p.ask ? 16 : NAME
        const cls = p.ask ? 'ask' : p.tag ? 'tag' : 'name'
        if (!p.dir.side) {
          // 正东 / 正西 / 正南 / 正北：射线压在十字上，名字写在端点旁边（横的写在上面，竖的写在右边），别和「东」「西」挤在一起
          const across = p.dir.base === 'e' || p.dir.base === 'w'
          texts.push({ x: f1(across ? ex : ex + 9), y: f1(across ? ey - 9 : ey + 5), text: label, cls, anchor: across ? 'middle' : 'start', size })
        } else texts.push({ ...labelAt(ex, ey, az, 9, size), text: label, cls, size })
      }
    }
    if (p.arc && p.dir.side && p.dir.deg) {
      const line = p.arc === 'base' ? p.dir.base : p.dir.side
      const key = `${line}-${az}`
      if (!arcsDone.has(key)) {
        arcsDone.add(key)
        const from = AXIS_AZ[line]
        const deg = p.arc === 'base' ? p.dir.deg : 90 - p.dir.deg
        paths.push({ d: arcPath(0, 0, 20, from, az), cls: 'arc' })
        const [mx, my] = unitOf(midAz(from, az))
        const r = deg < 25 ? 44 : 36
        texts.push({ x: f1(mx * r), y: f1(my * r + 4), text: `${deg}°`, cls: 'deg', anchor: 'middle', size: SMALL })
      }
    }
  }
  // 参照点：名字写在十字、射线、角弧之间空得最大的那个方向上（课本例 3 写在右上）
  dots.push({ x: 0, y: 0, r: 4.5, cls: 'center' })
  const blocked: [number, number][] = [0, 90, 180, 270].map((a) => [a, a])
  for (const p of props.places) {
    const az = azimuthOf(p.dir)
    blocked.push([az, az])
    if (p.arc && p.dir.side && p.dir.deg) {
      const from = AXIS_AZ[p.arc === 'base' ? p.dir.base : p.dir.side]
      const d = ((az - from + 540) % 360) - 180
      blocked.push(d > 0 ? [from, from + d] : [from + d, from])
    }
  }
  // 把挡住的角度区间并起来，按空当从大到小试：名字的框不压着别的字（地名、度数），也不跨过射线
  const marks = blocked.map(([a, b]): [number, number] => [((a % 360) + 360) % 360, ((a % 360) + 360) % 360 + (b - a)]).sort((p, q) => p[0] - q[0])
  const gaps: { mid: number; gap: number }[] = []
  for (let i = 0; i < marks.length; i++) {
    const end = Math.max(...marks.slice(0, i + 1).map((m) => m[1]))
    const next = i + 1 < marks.length ? marks[i + 1]![0] : marks[0]![0] + 360
    if (next > end) gaps.push({ mid: (end + (next - end) / 2) % 360, gap: next - end })
  }
  gaps.sort((p, q) => q.gap - p.gap)
  const name = t(props.center)
  const rays = props.places.map((p) => {
    const [ux, uy] = unitOf(azimuthOf(p.dir))
    return [ux * p.segs * seg, uy * p.segs * seg] as [number, number]
  })
  const others = texts.map((x) => textBox(x.x, x.y, x.text, x.size, x.anchor))
  const label = (mid: number, r: number): Txt => {
    const [cx, cy] = unitOf(mid)
    return { x: f1(cx * r), y: f1(cy * r + (cy < -0.3 ? -2 : cy > 0.3 ? 12 : 5)), text: name, cls: 'name center-name', anchor: cx > 0.3 ? 'start' : cx < -0.3 ? 'end' : 'middle', size: NAME }
  }
  const clear = (l: Txt): boolean => {
    const [x0, y0, x1, y1] = textBox(l.x, l.y, l.text, l.size, l.anchor)
    if (others.some((o) => o[0] < x1 && o[2] > x0 && o[1] < y1 && o[3] > y0)) return false
    // 射线（从原点到端点）穿过名字的框就不行：沿射线取点看
    return !rays.some(([ex, ey]) => Array.from({ length: 21 }, (_, i) => i / 20).some((k) => ex * k > x0 && ex * k < x1 && ey * k > y0 && ey * k < y1))
  }
  const tries = gaps.flatMap((g) => [label(g.mid, 20), label(g.mid, 30)])
  texts.push(tries.find(clear) ?? tries[0] ?? label(45, 20))
  // 外框
  let box: [number, number, number, number] = [-arm - 8, -arm - 8, arm + 8, arm + 8]
  const grow = (b: [number, number, number, number]): void => {
    box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]
  }
  const boxes = texts.map((x) => textBox(x.x, x.y, x.text, x.size, x.anchor))
  for (const b of boxes) grow(b)
  for (const d of dots) grow([d.x - d.r, d.y - d.r, d.x + d.r, d.y + d.r])
  // 比例尺：一小段，画在左下角（和下面的箭头齐平，不另占一行）；那里有字就挪到图下面
  if (props.per) {
    const x0 = box[0] + 2
    const w = Math.max(seg, textBox(0, 0, props.per, SMALL, 'start')[2])
    const hit = (y: number): boolean => boxes.some((b) => b[0] < x0 + w + 4 && b[2] > x0 - 4 && b[1] < y + 4 && b[3] > y - 22)
    const y0 = hit(arm) ? box[3] + 22 : arm
    paths.push({ d: `M ${f1(x0)} ${f1(y0 - 5)} L ${f1(x0)} ${f1(y0)} L ${f1(x0 + seg)} ${f1(y0)} L ${f1(x0 + seg)} ${f1(y0 - 5)}`, cls: 'scale' })
    const tx = { x: f1(x0), y: f1(y0 - 9), text: props.per, cls: 'per', anchor: 'start' as const, size: SMALL }
    texts.push(tx)
    grow(textBox(tx.x, tx.y, tx.text, tx.size, tx.anchor))
    grow([x0, y0 - 6, x0 + seg, y0 + 2])
  }
  return { paths, dots, texts, box: [f1(box[0] - 6), f1(box[1] - 6), f1(box[2] + 6), f1(box[3] + 6)] }
})

const view = computed(() => {
  const [x0, y0, x1, y1] = drawn.value.box
  return { vb: `${x0} ${y0} ${f1(x1 - x0)} ${f1(y1 - y0)}`, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) }
})
</script>

<template>
  <figure class="bearing-map" role="img" :aria-label="alt || undefined">
    <svg :viewBox="view.vb" :width="view.w" :height="view.h" aria-hidden="true">
      <path v-for="(p, i) in drawn.paths" :key="`p${i}`" :d="p.d" :class="p.cls" />
      <circle v-for="(c, i) in drawn.dots" :key="`c${i}`" :cx="c.x" :cy="c.y" :r="c.r" :class="c.cls" />
      <text v-for="(x, i) in drawn.texts" :key="`t${i}`" :x="x.x" :y="x.y" :text-anchor="x.anchor" :class="x.cls">{{ x.text }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.bearing-map {
  margin: 0;
  display: flex;
  justify-content: center;
  max-width: 100%;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.axis {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.ray {
  fill: none;
  stroke: #2f6fb5;
  stroke-width: 2.4;
  stroke-linecap: round;
}
.tick {
  fill: none;
  stroke: #2f6fb5;
  stroke-width: 1.8;
}
.arc {
  fill: none;
  stroke: #e04848;
  stroke-width: 1.8;
}
.scale {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
}
.end,
.center {
  fill: var(--c-text);
}
.badge {
  fill: var(--c-primary);
}
text {
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--c-bg, #fff);
  stroke-width: 3px;
  stroke-linejoin: round;
}
.compass {
  font-size: 13px;
  font-weight: 800;
  fill: var(--c-red);
}
.name {
  font-size: 13px;
  fill: var(--c-text);
}
.center-name {
  fill: #2e5f8a;
}
.tag {
  font-family: 'Times New Roman', Georgia, serif;
  font-style: italic;
  font-size: 16px;
  fill: var(--c-text);
}
.ask {
  font-size: 16px;
  font-weight: 800;
  fill: var(--c-primary-dark);
}
.deg {
  font-size: 12px;
  fill: #e04848;
}
.per {
  font-size: 12px;
  fill: var(--c-text);
}
.badge-txt {
  font-size: 12px;
  font-weight: 800;
  fill: #fff;
  stroke: none;
}
</style>
