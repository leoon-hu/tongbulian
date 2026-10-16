<script setup lang="ts">
import { computed } from 'vue'
import type { RouteFig } from '@/types/models'
import { t } from '@/engine/i18n'
import { arcPath, arrowHead, AXIS_AZ, azimuthOf, f1, midAz, OPPOSITE, textBox, unitOf } from './bearing'

/**
 * 路线图（六上例 5 小明放学回家、做一做、练习二 9，照课本画）：从出发的地方起一段一段连下去，每个地方画一个虚线小十字
 * （每段路线都以起点为参照点），段上按小段画刻度、末端画箭头；arc 的段在起点画红色方向角、back 的段在终点画回来时的方向角
 * （都写度数），dist 写在段旁；右上角画「北」和箭头，per 给了就在左下角画比例尺。几幅并排时（「哪幅图画的是这条路线」）
 * 下面标 1、2、3。名字不注音、不朗读。
 */
const props = withDefaults(defineProps<{ figs: RouteFig[]; numbered?: boolean; alt?: string }>(), { numbered: false, alt: '' })

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
  dots: { x: number; y: number }[]
  texts: Txt[]
  vb: string
  w: number
  h: number
}

const SIZE = 13
const SMALL = 12
const DIAG: [number, number][] = [
  [1, -1],
  [-1, -1],
  [1, 1],
  [-1, 1],
]

function draw(fig: RouteFig, many: boolean): Drawn {
  // 先按「小段」算出各地方的位置，再缩放到放得下
  const pts: [number, number][] = [[0, 0]]
  const azs = fig.legs.map((l) => azimuthOf(l.dir))
  fig.legs.forEach((l, i) => {
    const [ux, uy] = unitOf(azs[i]!)
    const [px, py] = pts[i]!
    pts.push([px + ux * l.segs, py + uy * l.segs])
  })
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const spanX = Math.max(...xs) - Math.min(...xs)
  const spanY = Math.max(...ys) - Math.min(...ys)
  // 手机竖屏上一屏要放下题目、图和作答区：一幅图的路线最高约 140 像素
  const W = many ? 110 : 290
  const H = many ? 100 : 140
  const k = Math.max(10, Math.min(32, W / Math.max(spanX, 0.5), H / Math.max(spanY, 0.5)))
  const P = pts.map(([x, y]): [number, number] => [f1((x - Math.min(...xs)) * k), f1((y - Math.min(...ys)) * k)])
  const paths: Drawn['paths'] = []
  const texts: Txt[] = []
  // 每个地方一个虚线小十字
  const cross = P.map(([x, y]) => `M ${f1(x - 16)} ${y} L ${f1(x + 16)} ${y} M ${x} ${f1(y - 16)} L ${x} ${f1(y + 16)}`)
  paths.push({ d: cross.join(' '), cls: 'cross' })
  fig.legs.forEach((leg, i) => {
    const az = azs[i]!
    const [ux, uy] = unitOf(az)
    const [ax, ay] = P[i]!
    const [bx, by] = P[i + 1]!
    paths.push({ d: `M ${ax} ${ay} L ${bx} ${by}`, cls: 'leg' })
    paths.push({ d: arrowHead(bx, by, az, 8), cls: 'leg' })
    const ticks: string[] = []
    for (let s = 1; s < leg.segs; s++) {
      const qx = ax + ux * s * k
      const qy = ay + uy * s * k
      ticks.push(`M ${f1(qx - uy * 4)} ${f1(qy + ux * 4)} L ${f1(qx + uy * 4)} ${f1(qy - ux * 4)}`)
    }
    if (ticks.length) paths.push({ d: ticks.join(' '), cls: 'tick' })
    const angle = (x: number, y: number, from: number, to: number, deg: number): void => {
      paths.push({ d: arcPath(x, y, 15, from, to), cls: 'arc' })
      const [mx, my] = unitOf(midAz(from, to))
      const r = deg < 25 ? 38 : 29
      texts.push({ x: f1(x + mx * r), y: f1(y + my * r + 4), text: `${deg}°`, cls: 'deg', anchor: 'middle', size: SMALL })
    }
    if (leg.dir.side && leg.dir.deg) {
      if (leg.arc) angle(ax, ay, AXIS_AZ[leg.dir.base], az, leg.dir.deg)
      if (leg.back) angle(bx, by, AXIS_AZ[OPPOSITE[leg.dir.base]], (az + 180) % 360, leg.dir.deg)
    }
    if (leg.dist) {
      // 写在走的方向的左手边
      const nx = uy
      const ny = -ux
      const mx = (ax + bx) / 2 + nx * 13
      const my = (ay + by) / 2 + ny * 13 + 4
      texts.push({ x: f1(mx), y: f1(my), text: leg.dist, cls: 'dist', anchor: nx > 0.3 ? 'start' : nx < -0.3 ? 'end' : 'middle', size: SMALL })
    }
  })
  // 名字：放在离相邻的路最远的那个斜角上
  const names = [fig.start, ...fig.legs.map((l) => l.to)]
  names.forEach((nm, i) => {
    if (!nm) return
    const away: [number, number][] = []
    if (i > 0) away.push(unitOf((azs[i - 1]! + 180) % 360))
    if (i < fig.legs.length) away.push(unitOf(azs[i]!))
    let best = DIAG[0]!
    let bestScore = -Infinity
    for (const d of DIAG) {
      const score = Math.min(...away.map(([x, y]) => -(x * d[0] + y * d[1])))
      if (score > bestScore) {
        bestScore = score
        best = d
      }
    }
    const [x, y] = P[i]!
    texts.push({ x: f1(x + best[0] * 7), y: f1(y + (best[1] > 0 ? 18 : -8)), text: t(nm), cls: 'name', anchor: best[0] > 0 ? 'start' : 'end', size: SIZE })
  })
  // 外框
  let box: [number, number, number, number] = [-18, -18, Math.max(...P.map((p) => p[0])) + 18, Math.max(...P.map((p) => p[1])) + 18]
  const grow = (b: [number, number, number, number]): void => {
    box = [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])]
  }
  for (const x of texts) grow(textBox(x.x, x.y, x.text, x.size, x.anchor))
  // 北：右上角
  const nx = box[2] + 14
  const ny = box[1] + 2
  paths.push({ d: `M ${f1(nx)} ${f1(ny + 30)} L ${f1(nx)} ${f1(ny + 8)}`, cls: 'north' })
  paths.push({ d: arrowHead(nx, ny + 8, 0, 6), cls: 'north' })
  const north = { x: f1(nx), y: f1(ny + 2), text: t({ k: 'm6.pos.ax.n' }), cls: 'compass', anchor: 'middle' as const, size: SIZE }
  texts.push(north)
  grow(textBox(north.x, north.y, north.text, north.size, north.anchor))
  grow([nx - 6, ny, nx + 6, ny + 30])
  if (fig.per) {
    const x0 = box[0] + 2
    const y0 = box[3] + 24
    paths.push({ d: `M ${f1(x0)} ${f1(y0 - 5)} L ${f1(x0)} ${f1(y0)} L ${f1(x0 + k)} ${f1(y0)} L ${f1(x0 + k)} ${f1(y0 - 5)}`, cls: 'scale' })
    const per = { x: f1(x0), y: f1(y0 - 9), text: fig.per, cls: 'dist', anchor: 'start' as const, size: SMALL }
    texts.push(per)
    grow(textBox(per.x, per.y, per.text, per.size, per.anchor))
    grow([x0, y0 - 6, x0 + k, y0 + 2])
  }
  const [x0, y0, x1, y1] = [box[0] - 6, box[1] - 6, box[2] + 6, box[3] + 6]
  return {
    paths,
    dots: P.map(([x, y]) => ({ x, y })),
    texts,
    vb: `${f1(x0)} ${f1(y0)} ${f1(x1 - x0)} ${f1(y1 - y0)}`,
    w: Math.ceil(x1 - x0),
    h: Math.ceil(y1 - y0),
  }
}

const pics = computed(() => props.figs.map((f) => draw(f, props.figs.length > 1)))
</script>

<template>
  <div class="route-maps" :class="{ many: figs.length > 1 }" role="img" :aria-label="alt || undefined">
    <figure v-for="(pic, i) in pics" :key="i" class="route-map">
      <svg :viewBox="pic.vb" :width="pic.w" :height="pic.h" aria-hidden="true">
        <path v-for="(p, j) in pic.paths" :key="`p${j}`" :d="p.d" :class="p.cls" />
        <circle v-for="(c, j) in pic.dots" :key="`c${j}`" :cx="c.x" :cy="c.y" r="3.5" class="spot" />
        <text v-for="(x, j) in pic.texts" :key="`t${j}`" :x="x.x" :y="x.y" :text-anchor="x.anchor" :class="x.cls">{{ x.text }}</text>
      </svg>
      <figcaption v-if="numbered" class="no">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.route-maps {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 8px 12px;
  max-width: 100%;
}
.route-map {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 100%;
}
/* 几幅并排的（「哪幅图画的是这条路线」）不折行：栏窄（对战、打怪兽）时一起等比缩小 */
.route-maps.many {
  flex-wrap: nowrap;
}
.route-maps.many .route-map {
  flex: 0 1 auto;
  min-width: 0;
}
.route-maps.many svg {
  width: 100%;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.cross {
  fill: none;
  stroke: #8a96a3;
  stroke-width: 1.2;
  stroke-dasharray: 3 3;
}
.leg {
  fill: none;
  stroke: #2f6fb5;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.tick {
  fill: none;
  stroke: #2f6fb5;
  stroke-width: 1.6;
}
.arc {
  fill: none;
  stroke: #e04848;
  stroke-width: 1.6;
}
.north,
.scale {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linecap: round;
}
.spot {
  fill: var(--c-text);
}
text {
  font-weight: 700;
  paint-order: stroke;
  stroke: var(--c-bg, #fff);
  stroke-width: 3px;
  stroke-linejoin: round;
}
.name {
  font-size: 13px;
  fill: var(--c-text);
}
.dist {
  font-size: 12px;
  fill: var(--c-text);
}
.deg {
  font-size: 12px;
  fill: #e04848;
}
.compass {
  font-size: 13px;
  font-weight: 800;
  fill: var(--c-red);
}
.no {
  min-width: 34px;
  margin-bottom: 6px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-lg);
  text-align: center;
}
</style>
