import type { KnowledgePoint, Unit } from '@/types/models'

/**
 * 人教版六年级数学知识点树（单一事实源），目录以国家中小学智慧教育平台上人教社的电子课本为准：六上是 2022 版课标新教材
 * （2026 秋起用，封面「国家教材委员会专家委员会审核通过 2024」）；平台上的六下还是旧版结构（封面「教育部审定 2022」），照平台当前
 * 这一本做，平台换了新版再照新版重做下册（同四、五年级下册）。单元 id：m6s<册>u<目录位置>；知识点 id：m6s<册>-<目录位置两位>-<语义名>
 * （位置含 ☆ 的综合与实践，所以不一定等于教材的单元编号）。带 ☆ 的是教材里没编号的综合与实践（numbered: false）；六上「复习与关联」、
 * 六下「整理和复习」不设知识点；六下的 ☆「生活与百分数」只有一页调查与理财活动，不设（id 跳过 m6s2u3；地图上的单元序号照课本 1、2、3……，不受影响）。
 * 新教材六上没有「比」这一单元，旧版六下「比例」要用到的比值、化简比在比例的入门题里一句话交代（不另设知识点）。
 * 新教材六上「百分数」里的折扣、利率两节和旧版六下「百分数（二）」的一样，两册各设一个知识点、共用出题函数（generators/percent2.ts）。
 * 课本没印小节标题的地方，知识点名照平台同步课的章节名、课本的知识结构图或例题的内容起；大的小节按例题拆。
 * 标题里的 ​ 是零宽的断行点：练习页页头的标题只在空格 / 标点处换行，太长的标题要给它一个词与词之间的断点。
 */
export const UNITS: Unit[] = [
  { id: 'm6s1u1', semester: 1, order: 1, title: '确定位置' },
  { id: 'm6s1u2', semester: 1, order: 2, title: '分数乘法' },
  { id: 'm6s1u3', semester: 1, order: 3, title: '分数除法' },
  { id: 'm6s1u4', semester: 1, order: 0, title: '生活中的负数', numbered: false },
  { id: 'm6s1u5', semester: 1, order: 4, title: '圆' },
  { id: 'm6s1u6', semester: 1, order: 0, title: '体育中的数学', numbered: false },
  { id: 'm6s1u7', semester: 1, order: 5, title: '百分数' },
  { id: 'm6s1u8', semester: 1, order: 0, title: '水是生命之源', numbered: false },
  { id: 'm6s2u1', semester: 2, order: 1, title: '负数' },
  { id: 'm6s2u2', semester: 2, order: 2, title: '百分数（二）' },
  { id: 'm6s2u4', semester: 2, order: 3, title: '圆柱与圆锥' },
  { id: 'm6s2u5', semester: 2, order: 4, title: '比例' },
  { id: 'm6s2u6', semester: 2, order: 0, title: '自行车里的数学', numbered: false },
  { id: 'm6s2u7', semester: 2, order: 5, title: '数学广角——鸽巢问题' },
]

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册 ──
  { id: 'm6s1-01-pairs', unitId: 'm6s1u1', title: '用有序数对​确定位置', icon: '📍', questionTypes: ['position'] },
  { id: 'm6s1-01-bearing', unitId: 'm6s1u1', title: '用方向和距离​确定位置', icon: '🧭', questionTypes: ['direction'] },
  { id: 'm6s1-01-route', unitId: 'm6s1u1', title: '用方向和距离​描述路线', icon: '🗺️', questionTypes: ['direction'] },
  { id: 'm6s1-02-frac-int', unitId: 'm6s1u2', title: '分数乘整数', icon: '🌸', questionTypes: ['frac-calc'] },
  { id: 'm6s1-02-num-frac', unitId: 'm6s1u2', title: '一个数乘分数', icon: '🌾', questionTypes: ['frac-calc'] },
  { id: 'm6s1-02-frac-frac', unitId: 'm6s1u2', title: '分数乘分数', icon: '✖️', questionTypes: ['frac-calc', 'compare'] },
  { id: 'm6s1-02-dec-frac', unitId: 'm6s1u2', title: '小数乘分数', icon: '🐿️', questionTypes: ['frac-calc'] },
  { id: 'm6s1-02-laws', unitId: 'm6s1u2', title: '分数混合运算​和运算律', icon: '🧮', questionTypes: ['frac-calc', 'law'] },
  { id: 'm6s1-02-chain', unitId: 'm6s1u2', title: '连续求一个数的​几分之几', icon: '🔗', questionTypes: ['frac-calc', 'quantity'] },
  { id: 'm6s1-02-more-less', unitId: 'm6s1u2', title: '求比一个数多或少​几分之几的数', icon: '📊', questionTypes: ['frac-calc', 'quantity'] },
  { id: 'm6s1-03-reciprocal', unitId: 'm6s1u3', title: '倒数的认识', icon: '🔄', questionTypes: ['frac-calc'] },
  { id: 'm6s1-03-frac-int', unitId: 'm6s1u3', title: '分数除以整数', icon: '➗', questionTypes: ['frac-calc'] },
  { id: 'm6s1-03-div-frac', unitId: 'm6s1u3', title: '一个数除以分数', icon: '🥛', questionTypes: ['frac-calc', 'compare'] },
  { id: 'm6s1-03-find-whole', unitId: 'm6s1u3', title: '已知一个数的几分之几，求这个数', icon: '🔍', questionTypes: ['frac-calc', 'quantity'] },
  { id: 'm6s1-03-as-one', unitId: 'm6s1u3', title: '把整体看作1', icon: '🛤️', questionTypes: ['frac-calc', 'quantity'] },
  { id: 'm6s1-04-negative', unitId: 'm6s1u4', title: '生活中的负数', icon: '🌡️', questionTypes: ['negative'] },
  { id: 'm6s1-05-circle', unitId: 'm6s1u5', title: '圆的认识', icon: '⭕', questionTypes: ['circle'] },
  { id: 'm6s1-05-sector', unitId: 'm6s1u5', title: '扇形的认识', icon: '🍕', questionTypes: ['circle'] },
  { id: 'm6s1-05-circumference', unitId: 'm6s1u5', title: '圆的周长', icon: '🎡', questionTypes: ['circle'] },
  { id: 'm6s1-05-area', unitId: 'm6s1u5', title: '圆的面积', icon: '🥧', questionTypes: ['circle', 'area'] },
  { id: 'm6s1-05-ring', unitId: 'm6s1u5', title: '圆环的面积', icon: '💿', questionTypes: ['circle', 'area'] },
  { id: 'm6s1-05-composite', unitId: 'm6s1u5', title: '组合图形的面积', icon: '🌀', questionTypes: ['circle', 'area'] },
  { id: 'm6s1-05-square-circle', unitId: 'm6s1u5', title: '外方内圆和​外圆内方', icon: '🔲', questionTypes: ['circle', 'area'] },
  { id: 'm6s1-06-sports', unitId: 'm6s1u6', title: '体育中的数学', icon: '🏃', questionTypes: ['circle'] },
  { id: 'm6s1-07-meaning', unitId: 'm6s1u7', title: '百分数的意义', icon: '💯', questionTypes: ['percent'] },
  { id: 'm6s1-07-rate', unitId: 'm6s1u7', title: '求百分率', icon: '🌱', questionTypes: ['percent'] },
  { id: 'm6s1-07-part', unitId: 'm6s1u7', title: '求一个数的​百分之几是多少', icon: '🧃', questionTypes: ['percent'] },
  { id: 'm6s1-07-discount', unitId: 'm6s1u7', title: '折扣', icon: '🏷️', questionTypes: ['percent'] },
  { id: 'm6s1-07-interest', unitId: 'm6s1u7', title: '利率', icon: '🏦', questionTypes: ['percent'] },
  { id: 'm6s1-07-growth', unitId: 'm6s1u7', title: '求增长率', icon: '📈', questionTypes: ['percent'] },
  { id: 'm6s1-07-base', unitId: 'm6s1u7', title: '已知增加后的数​求原来的数', icon: '🔙', questionTypes: ['percent'] },
  { id: 'm6s1-07-chain', unitId: 'm6s1u7', title: '价格的连续变化', icon: '💹', questionTypes: ['percent'] },
  { id: 'm6s1-07-standard', unitId: 'm6s1u7', title: '确定达标线', icon: '🎯', questionTypes: ['percent', 'stat'] },
  { id: 'm6s1-08-water', unitId: 'm6s1u8', title: '水是生命之源', icon: '💧', questionTypes: ['percent', 'stat'] },
  // ── 下册（平台当前的旧版六下）──
  { id: 'm6s2-01-meaning', unitId: 'm6s2u1', title: '认识负数', icon: '❄️', questionTypes: ['negative'] },
  { id: 'm6s2-01-line', unitId: 'm6s2u1', title: '在直线上表示数', icon: '↔️', questionTypes: ['negative'] },
  { id: 'm6s2-02-discount', unitId: 'm6s2u2', title: '折扣', icon: '🏷️', questionTypes: ['percent'] },
  { id: 'm6s2-02-chengshu', unitId: 'm6s2u2', title: '成数', icon: '🌾', questionTypes: ['percent'] },
  { id: 'm6s2-02-tax', unitId: 'm6s2u2', title: '税率', icon: '🧾', questionTypes: ['percent'] },
  { id: 'm6s2-02-interest', unitId: 'm6s2u2', title: '利率', icon: '🏦', questionTypes: ['percent'] },
  { id: 'm6s2-02-sale', unitId: 'm6s2u2', title: '打折与满减', icon: '🛍️', questionTypes: ['percent'] },
  { id: 'm6s2-04-cyl-know', unitId: 'm6s2u4', title: '圆柱的认识', icon: '🥫', questionTypes: ['solid'] },
  { id: 'm6s2-04-cyl-net', unitId: 'm6s2u4', title: '圆柱的展开图', icon: '📜', questionTypes: ['solid'] },
  { id: 'm6s2-04-cyl-side', unitId: 'm6s2u4', title: '圆柱的侧面积', icon: '🧻', questionTypes: ['solid'] },
  { id: 'm6s2-04-cyl-surface', unitId: 'm6s2u4', title: '圆柱的表面积', icon: '🎩', questionTypes: ['solid'] },
  { id: 'm6s2-04-cyl-volume', unitId: 'm6s2u4', title: '圆柱的体积', icon: '🛢️', questionTypes: ['solid'] },
  { id: 'm6s2-04-cyl-capacity', unitId: 'm6s2u4', title: '圆柱的容积', icon: '🥛', questionTypes: ['solid'] },
  { id: 'm6s2-04-cone-know', unitId: 'm6s2u4', title: '圆锥的认识', icon: '🍦', questionTypes: ['solid'] },
  { id: 'm6s2-04-cone-volume', unitId: 'm6s2u4', title: '圆锥的体积', icon: '⏳', questionTypes: ['solid'] },
  { id: 'm6s2-05-meaning', unitId: 'm6s2u5', title: '比例的意义', icon: '🚩', questionTypes: ['ratio'] },
  { id: 'm6s2-05-property', unitId: 'm6s2u5', title: '比例的基本性质', icon: '⚖️', questionTypes: ['ratio'] },
  { id: 'm6s2-05-solve', unitId: 'm6s2u5', title: '解比例', icon: '🚀', questionTypes: ['ratio'] },
  { id: 'm6s2-05-direct', unitId: 'm6s2u5', title: '正比例', icon: '📈', questionTypes: ['ratio'] },
  { id: 'm6s2-05-inverse', unitId: 'm6s2u5', title: '反比例', icon: '📉', questionTypes: ['ratio'] },
  { id: 'm6s2-05-scale', unitId: 'm6s2u5', title: '比例尺', icon: '📏', questionTypes: ['ratio'] },
  { id: 'm6s2-05-scale-use', unitId: 'm6s2u5', title: '用比例尺求距离', icon: '🗺️', questionTypes: ['ratio'] },
  { id: 'm6s2-05-zoom', unitId: 'm6s2u5', title: '图形的​放大与缩小', icon: '🔎', questionTypes: ['ratio'] },
  { id: 'm6s2-05-apply', unitId: 'm6s2u5', title: '用比例解决问题', icon: '💡', questionTypes: ['ratio'] },
  { id: 'm6s2-06-bike', unitId: 'm6s2u6', title: '自行车里的数学', icon: '🚲', questionTypes: ['ratio'] },
  { id: 'm6s2-07-pigeonhole', unitId: 'm6s2u7', title: '鸽巢问题', icon: '🕊️', questionTypes: ['logic'] },
]
