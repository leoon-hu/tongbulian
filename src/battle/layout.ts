/**
 * 竞技场怎么摆（需求 B29 / B30 / M6）：按视口尺寸算，对战与打怪兽共用，纯函数。
 * - 手机竖着拿（视口竖向且宽 ≤ 640px）：竞技场自己转 90° 成横的（rotated），不等系统转——微信内置浏览器的视口永远是竖的，
 *   iPhone 开着「竖排方向锁定」、QQ 等别的 App 内置浏览器也一样，网页感知不到手机转没转。打怪兽一个人打允许竖着玩（portrait，M6）。
 * - 紧凑版（compact，B29）：可用高度 < 480px；转了的话可用高度就是视口的宽。
 */
import type { StyleValue } from 'vue'

export interface Viewport {
  width: number
  height: number
}

export interface ArenaLayout {
  /** 竞技场自己转成横的 */
  rotated: boolean
  /** 手机竖屏布局（只有允许竖着玩的才有） */
  portrait: boolean
  /** 手机横屏紧凑版 */
  compact: boolean
}

/** 视口宽到这里为止算手机（竖着拿时要转） */
export const PHONE_MAX_WIDTH = 640
/** 可用高度到这里为止用紧凑版 */
export const COMPACT_MAX_HEIGHT = 479
/** 「请把手机横过来」提示这么久后自己消失 */
export const ROTATE_HINT_MS = 4000

export function arenaLayout(v: Viewport, opts: { allowPortrait?: boolean } = {}): ArenaLayout {
  const upright = v.height >= v.width && v.width <= PHONE_MAX_WIDTH
  const rotated = upright && !opts.allowPortrait
  const height = rotated ? v.width : v.height
  return { rotated, portrait: upright && !rotated, compact: height <= COMPACT_MAX_HEIGHT }
}

/**
 * 转了的竞技场根元素的内联样式（内联才压得过组件里 .arena 的 position / height）：视口宽高互换，绕左上角顺时针转 90° 再往上挪
 * 一个自身高度，正好铺满视口；内容的顶边落在屏幕右侧，手机逆时针横过来（顶部转到左边）就是正的。脱离文档流（fixed），免得旋转前的
 * 盒子把页面撑出滚动条；dvh / dvw 前面各留一个 vh / vw 给不认识动态视口单位的老浏览器（数组：浏览器留下最后一个认识的）。
 * 安全区四边跟着转一圈（上 ← 右、右 ← 下、下 ← 左、左 ← 上），竞技场的 padding 用这四个变量。
 * 转了之后 vw / vh 还是竖视口的，所以竞技场里一律用容器单位 cqw / cqh、@container 查询（根元素是名叫 arena 的尺寸容器）。
 */
export const ROTATED_STYLE = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: ['100vh', '100dvh'],
  height: ['100vw', '100dvw'],
  transformOrigin: 'top left',
  transform: 'rotate(90deg) translateY(-100%)',
  '--sa-top': 'env(safe-area-inset-right)',
  '--sa-right': 'env(safe-area-inset-bottom)',
  '--sa-bottom': 'env(safe-area-inset-left)',
  '--sa-left': 'env(safe-area-inset-top)',
} as unknown as StyleValue
