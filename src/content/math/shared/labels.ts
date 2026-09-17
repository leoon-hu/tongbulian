import type { ShapeKind } from '@/types/models'

/** 图形中文名（生成器出选项、教具显示共用） */
export const SHAPE_NAMES: Record<ShapeKind, string> = {
  cube: '正方体',
  cuboid: '长方体',
  cylinder: '圆柱',
  sphere: '球',
  square: '正方形',
  rectangle: '长方形',
  triangle: '三角形',
  circle: '圆',
  parallelogram: '平行四边形',
  pentagon: '五边形',
  hexagon: '六边形',
  trapezoid: '梯形',
  'right-triangle': '直角三角形',
}

/** 图形英文名（各年级内容包共用） */
export const SHAPE_NAMES_EN: Record<ShapeKind, string> = {
  cube: 'Cube',
  cuboid: 'Cuboid',
  cylinder: 'Cylinder',
  sphere: 'Sphere',
  square: 'Square',
  rectangle: 'Rectangle',
  triangle: 'Triangle',
  circle: 'Circle',
  parallelogram: 'Parallelogram',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  trapezoid: 'Trapezoid',
  'right-triangle': 'Right triangle',
}

/** 图形名的拼音（与 SHAPE_NAMES 逐字对齐） */
export const SHAPE_PINYIN: Record<ShapeKind, string> = {
  cube: 'zhèng fāng tǐ',
  cuboid: 'cháng fāng tǐ',
  cylinder: 'yuán zhù',
  sphere: 'qiú',
  square: 'zhèng fāng xíng',
  rectangle: 'cháng fāng xíng',
  triangle: 'sān jiǎo xíng',
  circle: 'yuán',
  parallelogram: 'píng xíng sì biān xíng',
  pentagon: 'wǔ biān xíng',
  hexagon: 'liù biān xíng',
  trapezoid: 'tī xíng',
  'right-triangle': 'zhí jiǎo sān jiǎo xíng',
}

export const SOLID_SHAPES: ShapeKind[] = ['cube', 'cuboid', 'cylinder', 'sphere']
/** 一年级认识的平面图形 */
export const FLAT_SHAPES: ShapeKind[] = ['square', 'rectangle', 'triangle', 'circle', 'parallelogram']
/** 二年级多边形（数角、轴对称）：都是有「角」的直边图形 */
export const POLYGONS: ShapeKind[] = [
  'square',
  'rectangle',
  'triangle',
  'parallelogram',
  'pentagon',
  'hexagon',
  'trapezoid',
  'right-triangle',
]
/** 每种多边形有几个角 */
export const CORNER_COUNT: Partial<Record<ShapeKind, number>> = {
  square: 4,
  rectangle: 4,
  triangle: 3,
  parallelogram: 4,
  pentagon: 5,
  hexagon: 6,
  trapezoid: 4,
  'right-triangle': 3,
}
/** 是否轴对称图形（按教具画出来的样子：三角形是等腰、梯形是等腰） */
export const IS_SYMMETRIC: Partial<Record<ShapeKind, boolean>> = {
  square: true,
  rectangle: true,
  triangle: true,
  circle: true,
  parallelogram: false,
  pentagon: true,
  hexagon: true,
  trapezoid: true,
  'right-triangle': false,
}

/** 算式符号的读法（朗读片段只在符号独立成项时用，见 engine/speech），各年级共用 */
export const SYMBOL_WORDS = {
  zh: {
    'sym.+': '加',
    'sym.-': '减',
    'sym.×': '乘',
    'sym.÷': '除以',
    'sym.=': '等于',
    'sym.?': '几',
    'sym.=?': '等于几',
    'sym.>': '大于',
    'sym.<': '小于',
    'sym.⬜': '和',
    'sym.(': '括号',
    'sym.)': '括号',
  },
  en: {
    'sym.+': 'plus',
    'sym.-': 'minus',
    'sym.×': 'times',
    'sym.÷': 'divided by',
    'sym.=': 'equals',
    'sym.?': 'what',
    'sym.=?': 'equals what',
    'sym.>': 'greater than',
    'sym.<': 'less than',
    'sym.⬜': 'and',
    'sym.(': 'open bracket',
    'sym.)': 'close bracket',
  },
} as const

/**
 * 把「分」格式化成中文金额，如 650 → 「6元5角」、500 → 「5元」、50 → 「5角」。
 * 一年级只涉及元、角，不出现分。
 */
export function formatMoney(fen: number): string {
  const yuan = Math.floor(fen / 100)
  const jiao = Math.floor((fen % 100) / 10)
  if (yuan > 0 && jiao > 0) return `${yuan}元${jiao}角`
  if (yuan > 0) return `${yuan}元`
  if (jiao > 0) return `${jiao}角`
  return '0元'
}

/** 时刻的中文读法：整时「3时」、半时「3时半」 */
export function formatClock(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1 // 0→12, 13→1
  return minute === 30 ? `${h}时半` : `${h}时`
}

/** 几时几分（二年级）：「7时35分」，整时「7时」 */
export function formatTime(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1
  return minute === 0 ? `${h}时` : `${h}时${minute}分`
}

/** 英文几时几分：7:35、7:05 */
export function formatTimeEn(hour: number, minute: number): string {
  const h = ((hour + 11) % 12) + 1
  return `${h}:${String(minute).padStart(2, '0')}`
}
