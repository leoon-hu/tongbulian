// 方向图（BearingMap、RouteMap，六上「确定位置」）共用的几何：方向换成「从北顺时针转的度数」，屏幕坐标 y 朝下。
// 内容包里的出题逻辑（content/math/grade6/generators/position.ts）另有一份同样的换算——内容包不依赖组件。
import type { Bearing, Dir4 } from '@/types/models'

export const AXIS_AZ: Record<Dir4, number> = { n: 0, e: 90, s: 180, w: 270 }
export const OPPOSITE: Record<Dir4, Dir4> = { n: 's', s: 'n', e: 'w', w: 'e' }

/** 方向 → 从北顺时针转的度数（0–359）：北偏东 30° = 30，东偏南 25° = 115，正西 = 270 */
export function azimuthOf(b: Bearing): number {
  if (!b.side || !b.deg) return AXIS_AZ[b.base]
  const cw = (AXIS_AZ[b.side] - AXIS_AZ[b.base] + 360) % 360 === 90
  return (AXIS_AZ[b.base] + (cw ? b.deg : -b.deg) + 360) % 360
}

/** 这个方向上的单位向量（屏幕坐标：x 朝右、y 朝下） */
export function unitOf(az: number): [number, number] {
  const r = (az * Math.PI) / 180
  return [Math.sin(r), -Math.cos(r)]
}

export const f1 = (n: number): number => Math.round(n * 10) / 10

/** 从方向 a 转到方向 b（走较短的那一边）的有向角度，-180 到 180 */
export function turn(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180
}

/** 以 (cx, cy) 为圆心、半径 r，从方向 a 画到方向 b（较短的那一边）的弧 */
export function arcPath(cx: number, cy: number, r: number, a: number, b: number): string {
  const d = turn(a, b)
  const [ax, ay] = unitOf(a)
  const [bx, by] = unitOf(b)
  return `M ${f1(cx + ax * r)} ${f1(cy + ay * r)} A ${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${f1(cx + bx * r)} ${f1(cy + by * r)}`
}

/** 弧中间的方向（写度数用） */
export const midAz = (a: number, b: number): number => (a + turn(a, b) / 2 + 360) % 360

/** 箭头：尖在 (x, y)、朝着方向 az，两翼长 len */
export function arrowHead(x: number, y: number, az: number, len = 8): string {
  const [ux, uy] = unitOf(az)
  const [nx, ny] = [-uy, ux]
  const bx = x - ux * len
  const by = y - uy * len
  return `M ${f1(bx + nx * len * 0.5)} ${f1(by + ny * len * 0.5)} L ${f1(x)} ${f1(y)} L ${f1(bx - nx * len * 0.5)} ${f1(by - ny * len * 0.5)}`
}

/** 字大概多宽（算外框用）：汉字一个字一个字号宽，别的半个多 */
export function textWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) w += /[⺀-鿿＀-￯]/.test(ch) ? size : size * 0.58
  return w
}

/** 一段字的外框（anchor 是 text-anchor，y 是基线） */
export function textBox(x: number, y: number, text: string, size: number, anchor: 'start' | 'middle' | 'end'): [number, number, number, number] {
  const w = textWidth(text, size)
  const x0 = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2
  return [x0, y - size, x0 + w, y + size * 0.25]
}

/** 在端点外侧写字：顺着方向往外推一点，按左右 / 上下定对齐方式 */
export function labelAt(x: number, y: number, az: number, gap: number, size: number): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const [ux, uy] = unitOf(az)
  const lx = x + ux * gap
  const ly = y + uy * gap
  const anchor = ux > 0.35 ? 'start' : ux < -0.35 ? 'end' : 'middle'
  const dy = uy < -0.35 ? -2 : uy > 0.35 ? size : size * 0.38
  return { x: f1(lx), y: f1(ly + dy), anchor }
}
