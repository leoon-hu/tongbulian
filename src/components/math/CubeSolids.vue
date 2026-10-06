<script setup lang="ts">
import { computed } from 'vue'
import type { CubeSolid } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 观察物体（二）（四下第二单元）：小正方体搭的物体、正方体和长方体摆在一起（练习四 2），照课本的斜二测画——
 * 正面是正方形，往后的棱向右上斜（往后一格，图上往右、往上各挪 K 格），顶面最亮、右面最暗、深色边线；
 * 长方体是一整块（中间不画线），橙色。遮挡靠画的顺序：从后往前、从下往上、从左往右一块一块画，后画的盖住先画的，
 * 看不见的面不用另外算（生成器保证每一摞的顶面都露得出来）。
 * 几个物体并排时共用一个格子大小（大小能直接比），numbered 时下面标 1、2、3……（选项就是这几个数）。
 * 读屏只说「小正方体搭的物体」，不说怎么搭的（说出来就等于把看到的图形说了）。
 */
const props = withDefaults(defineProps<{ items: CubeSolid[]; numbered?: boolean }>(), { numbered: false })

/** 往后一格在图上往右、往上各挪几格（课本的图约 0.38；四下观察物体的生成器按同一个数（OBLIQUE）算每一摞露出来多少，两处要一样） */
const K = 0.38
/** 四周留白（像素，边线不被裁掉） */
const PAD = 3

/** 一块：从左数第 x 格、往后第 d 排（0 = 最前排）、第 z 层（0 = 贴着桌面），宽 w 格 */
interface Box {
  x: number
  d: number
  z: number
  w: number
  bar: boolean
}

/** 摆好的物体拆成一块一块，按画的顺序排好：从后往前、从下往上、从左往右 */
function boxesOf(s: CubeSolid): Box[] {
  const out: Box[] = []
  if ('bar' in s) {
    out.push({ x: 0, d: 0, z: 0, w: s.bar, bar: true }, { x: s.on, d: 0, z: 1, w: 1, bar: false })
  } else {
    const n = s.rows.length
    s.rows.forEach((row, i) =>
      row.forEach((h, x) => {
        for (let z = 0; z < h; z++) out.push({ x, d: n - 1 - i, z, w: 1, bar: false })
      }),
    )
  }
  return out.sort((a, b) => b.d - a.d || a.z - b.z || a.x - b.x)
}

/** 一个物体在图上占几格宽、几格高 */
function extent(boxes: Box[]): { w: number; h: number } {
  return {
    w: Math.max(...boxes.map((b) => b.x + b.w + (b.d + 1) * K)),
    h: Math.max(...boxes.map((b) => b.z + 1 + (b.d + 1) * K)),
  }
}

const solids = computed(() => props.items.map(boxesOf))

/** 共用的格子大小：一个物体时大一点；几个并排时每个都放得下、一排放得开（手机竖屏 360 宽） */
const unit = computed(() => {
  const n = props.items.length
  const ext = solids.value.map(extent)
  const maxW = Math.max(...ext.map((e) => e.w))
  const maxH = Math.max(...ext.map((e) => e.h))
  const cap = n === 1 ? 36 : n <= 3 ? 26 : 20
  // 三个并排：每个连留白 ≤ 100 像素，360 宽的手机上也排得下一行
  const boxW = n === 1 ? 230 : n <= 3 ? 86 : 76
  const boxH = n === 1 ? 150 : n <= 3 ? 84 : 60
  return Math.min(cap, boxW / maxW, boxH / maxH)
})

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString()

const pics = computed(() =>
  solids.value.map((boxes) => {
    const s = unit.value
    const { w, h } = extent(boxes)
    // 斜二测：(x, z) 在第 d 排 → 图上 (x + d·K, z + d·K)，y 向下
    const pt = (x: number, z: number, d: number): string => `${f1(PAD + (x + d * K) * s)},${f1(PAD + (h - z - d * K) * s)}`
    const faces = boxes.map((b) => {
      const { x, d, z } = b
      const x2 = x + b.w
      return {
        box: b,
        front: [pt(x, z, d), pt(x2, z, d), pt(x2, z + 1, d), pt(x, z + 1, d)].join(' '),
        top: [pt(x, z + 1, d), pt(x2, z + 1, d), pt(x2, z + 1, d + 1), pt(x, z + 1, d + 1)].join(' '),
        right: [pt(x2, z, d), pt(x2, z, d + 1), pt(x2, z + 1, d + 1), pt(x2, z + 1, d)].join(' '),
      }
    })
    return { width: Math.ceil(w * s + 2 * PAD), height: Math.ceil(h * s + 2 * PAD), faces }
  }),
)

const label = computed(() => t({ k: props.items.some((s) => 'bar' in s) ? 'm4.obs.ariaBar' : 'm4.obs.ariaSolid' }))
</script>

<template>
  <div class="solids" :class="{ many: items.length > 1, crowd: items.length > 3 }" role="img" :aria-label="label">
    <figure v-for="(pic, i) in pics" :key="i" class="solid">
      <svg :viewBox="`0 0 ${pic.width} ${pic.height}`" :width="pic.width" :height="pic.height" aria-hidden="true">
        <g
          v-for="(f, j) in pic.faces"
          :key="j"
          class="box"
          :class="f.box.bar ? 'bar' : 'cube'"
          :data-x="f.box.x"
          :data-d="f.box.d"
          :data-z="f.box.z"
          :data-w="f.box.w"
        >
          <polygon class="top" :points="f.top" />
          <polygon class="right" :points="f.right" />
          <polygon class="front" :points="f.front" />
        </g>
      </svg>
      <figcaption v-if="numbered">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.solids {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px 12px;
  max-width: 100%;
}
.solids.many:not(.crowd) {
  flex-wrap: nowrap;
  gap: 8px;
}
.solid {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 8px 10px 6px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.solids.many .solid {
  padding: 6px;
}
/* 四个以上（练习四 5 的六个）：号码小一号，两排也放得下 */
.solids.crowd {
  gap: 6px 10px;
}
.solids.crowd .solid figcaption {
  min-width: 28px;
  font-size: var(--fs-md);
}
.solid svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.solid figcaption {
  min-width: 34px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-lg);
  text-align: center;
}
polygon {
  stroke: #2b4f63;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.cube .front {
  fill: #a9dcf2;
}
.cube .top {
  fill: #dcf2fc;
}
.cube .right {
  fill: #74bfe3;
}
.bar .front {
  fill: #fcc69a;
}
.bar .top {
  fill: #fee0c6;
}
.bar .right {
  fill: #eda06a;
}
</style>
