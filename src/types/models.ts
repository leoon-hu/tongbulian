/** 界面 / 题目语言 */
export type Lang = 'zh' | 'en'

/**
 * 可本地化字符串（Localizable String）。
 * - 纯 string：与语言无关的字面量（数字、emoji、运算符、算式），原样显示。
 * - { k, p }：翻译键 + 可选参数（值本身也可是 LStr，支持嵌套）。
 * 由 engine/i18n 的 translate 按当前语言解析。
 */
export type LParam = string | number | LStr
export type LStr = string | { k: string; p?: Record<string, LParam> }

/** 学期：1 = 上册，2 = 下册（年级由课程决定） */
export type Semester = 1 | 2
export type Difficulty = 1 | 2 | 3

export interface Unit {
  id: string
  semester: Semester
  /** 教材上的单元序号（地图上显示「3.」）；综合与实践 / 数学游戏这类没编号的单元填 0 并置 numbered: false */
  order: number
  title: string
  /** false = 教材里带 ☆ 的综合与实践（或一上的「数学游戏」），地图上显示 ☆ 而不是序号 */
  numbered?: boolean
}

export type QuestionType =
  | 'arith'
  | 'compare'
  | 'count'
  | 'pic-equation'
  | 'clock-read'
  | 'money'
  | 'pattern'
  | 'shape-match'
  | 'position'
  | 'sort'
  // ── 二年级起 ──
  | 'length' // 长度单位（厘米 / 米、量一量）
  | 'angle' // 角的初步认识
  | 'multiply' // 表内乘法
  | 'divide' // 表内除法 / 有余数的除法
  | 'view' // 观察物体
  | 'time' // 认识时间（几时几分、时与分）
  | 'combo' // 数学广角：搭配
  | 'stat' // 数据收集整理
  | 'symmetry' // 图形的运动：轴对称
  | 'motion' // 图形的运动：平移与旋转
  | 'mixed-ops' // 混合运算
  | 'mass' // 克和千克
  | 'logic' // 数学广角：推理
  // ── 三年级起 ──
  | 'area' // 面积、面积单位
  | 'decimal' // 小数的初步认识
  | 'fraction' // 分数的初步认识
  | 'code' // 数字编码（身份证号码、邮政编码）
  // ── 四年级起 ──
  | 'big-number' // 万以上数的认识：计数单位、读写、比大小、改写、近似数
  | 'quantity' // 数量关系：加法模型、乘法模型
  | 'parallel' // 平行与垂直、平行四边形和梯形
  | 'direction' // 方向与位置：八个方向、平面图
  | 'law' // 运算律（四下）
  | 'triangle' // 三角形的特性、分类、内角和（四下）
  // ── 五年级起 ──
  | 'dec-calc' // 小数乘法、小数除法（五上）
  | 'algebra' // 用字母表示数和数量关系（五上）
  | 'chance' // 可能性（五上）
  | 'factor' // 因数和倍数、最大公因数、最小公倍数（五下）
  | 'solid' // 长方体和正方体：认识、展开图、表面积、体积、容积（五下）；圆柱与圆锥（六下）
  // ── 六年级起 ──
  | 'frac-calc' // 分数乘法、分数除法、倒数（六上）
  | 'percent' // 百分数（六上）、百分数（二）（六下）
  | 'negative' // 负数（六上「生活中的负数」、六下「负数」）
  | 'circle' // 圆、扇形、圆环（六上）
  | 'ratio' // 比例、正比例和反比例、比例尺（六下）
  // ── 语文（§9） ──
  | 'hanzi' // 识字：听音 / 看图 / 看拼音选字、看字选读音
  | 'writing' // 写字与字的结构：笔画、第一笔、偏旁、加一加减一减
  | 'pinyin' // 汉语拼音：声调、拼读、声母韵母、字母表
  | 'reading' // 课文：选词填空、问答、古诗
  | 'phrase' // 词语积累：反义词、对子、量词、称呼、标点

export interface KnowledgePoint {
  id: string
  unitId: string
  /** 儿童可见的短标题 */
  title: string
  /** 地图节点图标（emoji） */
  icon: string
  questionTypes: QuestionType[]
}

/** 立体与平面图形（服务于图形认识、分类） */
export type ShapeKind =
  | 'cube' // 正方体
  | 'cuboid' // 长方体
  | 'cylinder' // 圆柱
  | 'sphere' // 球
  | 'square' // 正方形
  | 'rectangle' // 长方形
  | 'triangle' // 三角形
  | 'circle' // 圆
  | 'parallelogram' // 平行四边形
  | 'pentagon' // 五边形（二年级：数角、轴对称）
  | 'hexagon' // 六边形
  | 'trapezoid' // 梯形（等腰，轴对称）
  | 'right-triangle' // 直角三角形（不是轴对称图形，含一个直角）

/**
 * 从某个方向看到的样子（三年级「观察物体」，ViewGlyph 画实心色块）：
 * 单个立体图形——rect-long 横放长方体从前面看（又长又扁）、rect-short 从左 / 右面看、square、circle；
 * 组合体（SolidScene）——on-* 圆柱立在长方体顶面正中，beside-* 圆柱立在长方体右边（进深居中），后缀是看的方向；
 * 从上面看一律前面朝下。
 */
export type ViewKind =
  | 'rect-long'
  | 'rect-short'
  | 'square'
  | 'circle'
  | 'on-front'
  | 'on-side'
  | 'on-top'
  | 'beside-front'
  | 'beside-top'
  | 'beside-right'

/** 一枚人民币，面额以「分」为单位存储以便精确计算（1 元 = 100 分，1 角 = 10 分） */
export interface MoneyPiece {
  /** 面额（分） */
  fen: number
  form: 'note' | 'coin'
}

/** 找规律序列的一格：具体项或待填空位 */
export type SeqCell =
  | { kind: 'item'; label: string; color?: string }
  | { kind: 'blank' }

/** 几何图（GeoFigure，三年级「线和角」「长方形和正方形」「图形的面积」）里的点 [x, y]：y 向下，单位由每幅图自己定 */
export type GeoPt = [number, number]
/** 几何图的颜色：ink 深色（默认）、a 橙、b 蓝、c 绿、d 红、soft 浅灰、paper 白（挖空的地方） */
export type GeoTone = 'ink' | 'a' | 'b' | 'c' | 'd' | 'soft' | 'paper'
/** 字母标在点的哪一边（默认下面） */
export type GeoSide = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
/**
 * 几何图里的一样东西（图里只放数、字母、「?」和 emoji，不放汉字）：
 * poly 多边形（open = 不封口的折线；labels[i] 标在第 i 条边 pts[i] → pts[i+1] 外侧；right = 画直角记号的顶点下标）；
 * line 一条线（dots = 两头画不画端点：射线、直线不画点的那头一直画到图边）；curve 经过这些点的平滑曲线；
 * dot 点 + 旁边的字母；text 一段字（badge = 橙色圆牌上的白字，标图里的 1、2、3；letter = 斜体字母）；grid 方格纸（(x, y) 起 w × h 格，cells 是涂色的格子 [列, 行]，外沿加粗；lines = false 不画空格的格线）；
 * arc 角的记号（at 顶点，a、b 是两条边上的点；right = 直角方块）
 * 四年级加的（都是可选的，不填和三年级画得一样）：grid 的 dots = 点子图（只在格点上画小圆点，不画格线）；
 * arc 的 ccw = 从 a 那条边起在屏幕上逆时针转到 b 那条边（可以超过 180°：平角画半圆、a、b 同向是周角画整圈），
 * arrow = 弧的末端画箭头（射线旋转的方向），r = 弧的半径（像素，默认 16）
 * 五年级加的（也都是可选的）：dot 的 r = 画成圆心在 at、半径 r（图里的单位）的圆，不画黑点——fill 涂色、stroke 边的颜色
 * （默认 ink）、dash 虚线边、thin 细边，label 照样标在圆外；line 的 dim = 尺寸线：a、b 两头画箭头，中间写 dim 这段字（数），
 * off = 尺寸线离开 a—b 多少像素（正数画在从 a 走向 b 的左手边：a→b 朝右时在上面、朝下时在右边），off 不为 0 时
 * 两头画到 a、b 的引线；text 的 halo = 字描一圈底色（压在线上也看得清，比如写在高的虚线中间）。
 * 没有另加新的 t（三、四年级的 mapItem 是穷尽的 switch，加新种类会让它们类型检查报错）。
 */
export type GeoItem =
  | { t: 'poly'; pts: GeoPt[]; open?: boolean; fill?: GeoTone; stroke?: GeoTone; dash?: boolean; labels?: (string | null)[]; right?: number[] }
  | { t: 'line'; a: GeoPt; b: GeoPt; dots?: [boolean, boolean]; stroke?: GeoTone; dash?: boolean; thin?: boolean; dim?: string; off?: number }
  | { t: 'curve'; pts: GeoPt[]; closed?: boolean; fill?: GeoTone; stroke?: GeoTone; dots?: [boolean, boolean] }
  | { t: 'dot'; at: GeoPt; label?: string; side?: GeoSide; r?: number; fill?: GeoTone; stroke?: GeoTone; dash?: boolean; thin?: boolean }
  | { t: 'text'; at: GeoPt; text: string; tone?: GeoTone; big?: boolean; badge?: boolean; letter?: boolean; halo?: boolean }
  | { t: 'grid'; x: number; y: number; w: number; h: number; cells?: GeoPt[]; fill?: GeoTone; lines?: boolean; dots?: boolean }
  | { t: 'arc'; at: GeoPt; a: GeoPt; b: GeoPt; right?: boolean; ccw?: boolean; arrow?: boolean; r?: number }
/** 一幅几何图：外框 w × h（图里的单位），px = 每单位几像素（默认 1；放不下时组件整体等比缩小） */
export interface GeoFig {
  w: number
  h: number
  px?: number
  items: GeoItem[]
}

/**
 * 平均分的一幅图（FracShape，三年级「分数的初步认识」、小数的十等分图）：图形 shape 切成 parts 块，shaded 里的块涂色
 * （alt 里的涂另一种颜色：分数加法的第二个加数）。shape：circle 圆（扇形，rot = 转几度）、rect 长方形竖条（rows > 1 是 rows 行的格子）、
 * rect-h 横条、square 正方形竖条 / 格子、square-diag 正方形沿对角线（2 / 4 / 8 块，8 = 米字）、triangle 等腰三角形沿高对折、
 * polygon 正多边形从中心分（5 / 6 / 8）、parallelogram 沿对角线、cross 五个正方形拼的十字、board 黑板报（1/2、1/4、1/8、1/8）；
 * circle-uneven、rect-uneven、triangle-cut 是「不是平均分」的反例。whole = 前面再画几个整个涂满的（小数 2.5），label 写在图下面
 */
export type FracShapeKind = 'circle' | 'circle-uneven' | 'rect' | 'rect-h' | 'rect-uneven' | 'square' | 'square-diag' | 'triangle' | 'triangle-cut' | 'polygon' | 'parallelogram' | 'cross' | 'board'
export interface FracPic {
  shape: FracShapeKind
  parts: number
  shaded: number[]
  alt?: number[]
  rows?: number
  rot?: number
  whole?: number
  label?: string
}

/**
 * 三下「生活中的运动现象」的小图（MotionFigs 画，每个在 100 × 100 的格子里；对称的图形都以竖着的中线为对称轴）：
 * 课本的平面图形——rect 长方形、square、scalene 一般三角形、circle、parallelogram、pentagon 正五边形、iso-tall / iso-flat 一尖一扁的等腰三角形；
 * 剪影——star 五角星、arrow 左转弯箭头、paddle 乒乓球拍、plane 飞机、hoodie 连帽衫、comb 带弯柄的梳子、kettle 侧面的水壶、car 汽车正面、
 * leaf 叶子、kite 燕子风筝、dragonfly 蜻蜓、heart 心形、tree 小树、house 门在右边的小房子、fish 头朝右的小鱼、flag 小旗；
 * 旋转——right-tri 直角三角形（直角在左下）、quad 四等分的圆（涂左上一块）、clock 钟面（分针指 12）、pinwheel 风车、propeller 螺旋桨
 */
export type MotionFig =
  | 'rect' | 'square' | 'scalene' | 'circle' | 'parallelogram' | 'pentagon' | 'iso-tall' | 'iso-flat'
  | 'star' | 'arrow' | 'paddle' | 'plane' | 'hoodie' | 'comb' | 'kettle' | 'car' | 'leaf' | 'kite' | 'dragonfly' | 'heart' | 'tree'
  | 'house' | 'fish' | 'flag' | 'right-tri' | 'quad' | 'clock' | 'pinwheel' | 'propeller'
/**
 * 一个小图：turn = 顺时针转了几度（0 / 90 / 180 / 270），flip = 左右翻过来（先翻再转）；axis = 画一条红虚线（v 竖中线、h 横中线、
 * d1 左上—右下的对角线、d2 右上—左下、off 偏在一边的竖线）；half = 只画左半个、右边是折痕（对折剪纸）；tone：red 参照的那个（红色）、
 * paper 剪纸（粉色）；label = 下面标的号；hour = 钟面的时针指几；arrow = 弧形箭头（cw 顺时针 / ccw 逆时针）；
 * move = 运动示意（虚线是原来的位置、实线是现在的：up 往上 / right 往右 / slide 斜着往左下 = 平移，turn = 绕中心转了 90°）；blank = 「?」格
 */
export interface MotionItem {
  fig: MotionFig
  turn?: number
  flip?: boolean
  axis?: 'v' | 'h' | 'd1' | 'd2' | 'off'
  half?: boolean
  tone?: 'red' | 'paper'
  label?: number
  hour?: number
  arrow?: 'cw' | 'ccw'
  move?: 'up' | 'right' | 'slide' | 'turn'
  blank?: boolean
}

/**
 * 除法竖式的一行（LongDivision）：位置按被除数的第几位数（0 = 最高位），end = 这一行最后一个字对着第几位；
 * line = 下面画横线；空格 = 这一位空着（改错题「2 3」）；text 是「?」的是要填的空（w = 空占几位，默认 1），练习页把按的数填在那里
 */
export interface DivLine {
  text: string
  end: number
  line?: boolean
  w?: number
}

// ── 四年级数学的辅助类型 A ──
// ── 四年级数学的辅助类型 B ──
/**
 * 量角器（Protractor，四上「角的度量」）上从中心出发的一条线：at = 这条线对着量角器上的哪个位置（度，从右边的 0° 刻度线起
 * 逆时针量，0–180；也就是内圈的读数，外圈的读数是 180 − at）；画成从中心起、伸出量角器外的射线；label = 伸出去那头标的字母（射线 OA 的 A）
 */
export interface ProtractorRay {
  at: number
  label?: string
}
/** 量角器外沿上的一个点（画角：「应该在哪个点画点」）：at 同上，label 是点旁边的字母 */
export interface ProtractorPoint {
  at: number
  label: string
}
// ── 四年级数学的辅助类型 C ──
/**
 * 写好的乘法竖式（mul-vertical 的 work，四上「多位数乘两位数」）：p1 = 用乘数个位上的数乘得的数，p2 = 用十位上的数乘得的数
 * （照竖式里写的，末尾的 0 不写），sum = 积；照写，可以是错的（改错题）。flat = p2 没有往左移一位、和 p1 右对齐（改错题的错法）
 */
export interface MulWork {
  p1: number
  p2: number
  sum: number
  flat?: boolean
}
// ── 四年级数学的辅助类型 D ──
/**
 * 条形统计图（bar-chart）的一组数据：values 与类别一一对应，null = 这一条还没画（画一个虚线框「?」，按统计表补画的题）；
 * 复式图（两三组）每组一种颜色——tone：blue 蓝、pink 粉、green 绿（不填按蓝、粉、绿的顺序；课本里颜色不固定，看图例），name 写在右上角的图例里
 */
export interface BarSeries {
  name?: LStr
  tone?: 'blue' | 'pink' | 'green'
  values: (number | null)[]
}
/** 八个方向（四上「寻找宝藏」）：n 北、ne 东北、e 东、se 东南、s 南、sw 西南、w 西、nw 西北 */
export type Dir8 = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
/** 平面图（plan-map）上的一个地方：名字 + 小图（emoji，只是帮着认，不朗读） */
export interface PlanPlace {
  label: LStr
  icon?: string
}
/** 平面图上编号的宝藏：画在第 r 行第 c 列那个地方的哪个角 / 哪一边（at：ne 东北角…，n 北面…），圆圈里写「n 号」 */
export interface PlanMark {
  r: number
  c: number
  at: Dir8
  n: number
}
// ── 四年级数学下册的辅助类型 A ──
/** 线段图（part-line，四下「加、减法的意义」例 1）的一段：len 按实际的数定多长（太短的段画长一点，好写字），label 写在这一段上面的大括号上（「814 km」「?」） */
export interface PartSeg {
  len: number
  label: string
}
/**
 * 树状图（calc-tree，四下「括号」练习三 2）的一步：op 这一步的运算；n 是这一步新加进来的数（第一步用 a、b，不填 n），
 * left = n 写在上一步得数框的左边（它在算式里排前面：被减数、被除数……），不填写在右边；
 * v = 这一步的得数框里写什么：数、''（空框）或 '?'（要填的那一格，练习页把按的数填进去）
 */
export interface TreeStep {
  op: '+' | '-' | '×' | '÷'
  n?: string
  left?: boolean
  v: string
}
// ── 四年级数学下册的辅助类型 B ──
// ── 四年级数学下册的辅助类型 C ──
// ── 四年级数学下册的辅助类型 D ──
/** 移多补少图（even-out，四下「平均数」例 1 的空水瓶）的一行：谁（图里的名字，不注音不朗读）、有几个 */
export interface EvenRow {
  name: LStr
  count: number
}
// ── 四年级数学下册的辅助类型 E ──
/**
 * 观察物体（二）里摆好的一个物体（CubeSolids 画，斜二测：正面是正方形，往后的棱向右上斜）：
 * rows = 小正方体搭的物体的高度图（从上面往下看）：第一行是最后面（离看的人最远）、最后一行是最前面，列从左到右，
 * 每格是这一摞有几个小正方体（0 = 空）；bar = 练习四 2 的「正方体和长方体」：长方体横放，有 bar 个正方体那么长（橙色），
 * 正方体（和小正方体同色）放在它上面从左数第 on 格（0 起）
 */
export type CubeSolid = { rows: number[][] } | { bar: number; on: number }
/**
 * 看到的图形（CubeViews 画，照课本：同色的正方形连在一起、深色边线，不画方格纸）里的一块：从左数第 x 格、从下数第 y 格（0 起），
 * 宽 w 格（默认 1）；tone 默认和小正方体同色，bar = 长方体的橙色（一整条，中间不画线）
 */
export interface ViewBlock {
  x: number
  y: number
  w?: number
  tone?: 'bar'
}
/** 一幅看到的图形：几块拼起来；caption = 图下面写的字（「从前面看」，注音、不朗读） */
export interface CubeViewFig {
  blocks: ViewBlock[]
  caption?: LStr
}
// ── 五年级数学的辅助类型 A ──
/** 标数的俯视图（cube-top，五上「观察简单组合体」练习一 9）里的一格：从左数第 x 格、从下数第 y 格（y = 0 是最前排），写着这个位置摞了 n 个小正方体 */
export interface TopCell {
  x: number
  y: number
  n: number
}
/**
 * 三下的运动小图（MotionItem）在五年级加的可选字段（同名接口合并，原来的用法不变）：
 * swing = 钟面（fig: 'clock'）下面挂一根钟摆，从竖直的位置（虚线）摆到左边 / 右边（实线），下面画弧形箭头（五上「旋转」练习九 1）；
 * spin = 风车（fig: 'pinwheel'）只转叶片、杆子不动，叶片顺时针转了几度（90 的倍数，五上「旋转」练习十 3）
 */
export interface MotionItem {
  swing?: 'left' | 'right'
  spin?: number
}
// ── 五年级数学的辅助类型 B ──
/**
 * 小数倍的线段图（RatioLines，五上「小数乘法」例 5）的一行：name 写在左边（「一班」，图里的字，不注音、不朗读）；
 * len = 这条线有几小段长（第一行是「1 倍」那条，长 per 小段）；top = 上面大括号写的（「0.8 倍」），bottom = 下面大括号写的（「3.9 kg」「? kg」）
 */
export interface RatioRow {
  name: LStr
  len: number
  top: LStr
  bottom: string
}
// ── 五年级数学的辅助类型 C ──
/** 摸球盒、转盘里的颜色（五上「可能性」：课本用红、黄、蓝、绿、白） */
export type ChanceColor = 'red' | 'yellow' | 'blue' | 'green' | 'white'
/** 摸球盒里的一种颜色有几个 */
export interface ChanceBalls {
  color: ChanceColor
  n: number
}
/**
 * 小数除法竖式里绿底标出的一段（LongDivision 的小数模式，五上「小数除法」例 3 的余数 25）：row = rows 的下标，n = 从这一行左边数几个字
 * （「250」只标「25」：课本标的是余数，落下来的 0 不标）
 */
export type DivMark = [number, number]
// ── 五年级数学的辅助类型 D ──
/**
 * 找规律的图（PatternDots，五上「用字母表示 ax+b 的数量关系」）里的一幅，照课本画：
 * tables = n 张长方形桌子一张接一张拼成一排，每张桌子上下两边各坐 side 人、整排两头各坐 1 人（圆圈是座位；例 4 是 side 1，练习十三 6 是 side 2）；
 * rows = 一排一排摆的圆片，counts 从上往下是每排几个，每排居中（练习十二 1：2、4、6、8）；
 * stones = r 行 r + 1 列的棋子，从上往下第 i 行（从 1 数）前 i 个是黑棋、其余是白棋（练习十二 5）
 */
export type PatternFig = { t: 'tables'; n: number; side: 1 | 2 } | { t: 'rows'; counts: number[] } | { t: 'stones'; r: number }
// ── 五年级数学的辅助类型 E ──
// ── 五年级数学的辅助类型 F ──
// ── 五年级数学的辅助类型 G ──
/**
 * 带标注的长方体 / 正方体（BoxFigure，五下「长方体和正方体」）：照课本的斜二测画——正面是真正的长方形，往后的棱向右上斜、画一半长。
 * l 长（正面的底边）、w 宽（往后的棱）、h 高（竖着的棱）按比例画（悬殊太大时把短的放长一点，免得扁成一条线）；
 * labels：交于右前下顶点的三条棱旁写的字（数、字母、「?」，不放汉字；单位写在题目文字里）——l 写在正面底边下面、
 * w 写在右下那条斜棱的右下方、h 写在右面的右边；wire = 线框图（面不涂色，看不见的 3 条棱画虚线，课本 p19、p25、p33）；
 * mark = 画成红色的一条棱（交于右前下顶点的三条之一）；face = 涂成橙色的一个面；grid = 看得见的三个面按 1 格画小格（l、w、h 是整数）；
 * open = 没有盖（顶面画成开口）；water = 透明容器里的水深（与 h 同一单位），depth = 右边竖的尺寸线旁写的字；stone = 水底沉着一块石头
 */
export interface BoxSpec {
  l: number
  w: number
  h: number
  labels?: { l?: string; w?: string; h?: string }
  wire?: boolean
  mark?: 'l' | 'w' | 'h'
  face?: 'front' | 'top' | 'right'
  grid?: boolean
  open?: boolean
  water?: number
  depth?: string
  stone?: boolean
}
/** 烧杯里的一幅（Beaker，五下例 6 排水法）：水面到 water 毫升；thing = 水底沉着的东西（土豆、石块、鸡蛋），不填就只有水 */
export interface BeakerItem {
  water: number
  thing?: 'potato' | 'stone' | 'egg'
}
// ── 五年级数学的辅助类型 H ──
/**
 * 分数链（frac-chain，五下「分数的基本性质」「约分」「通分」）的一项：分数（n 分子、d 分母，是任意短串：数、「2×4」、要填的「?」；
 * w = 带分数的整数部分）或写在两个分数中间的字（t：「=」「○」、整数）
 */
export type ChainTerm = { n: string; d: string; w?: string } | { t: string }
/** 分数链的弧形箭头：从第 from 项到第 to 项（都是分数），top 写在分子上方的弧上、bottom 写在分母下方的弧上（「×2」「÷?」） */
export interface ChainArc {
  from: number
  to: number
  top?: string
  bottom?: string
}
// ── 五年级数学的辅助类型 I ──
/**
 * 折线统计图（LineChart，五下「折线统计图」）的一条折线：name = 图例上的名字（复式图才画图例）、tone = 颜色（课本：人口、出生蓝，
 * 高铁、空气优良、甲地绿，GDP、死亡、重污染、乙地橙）；values = 每个类别（年份 / 月份 / 年龄）的数，null = 这一处不画点；
 * digits = 点旁边写的数保留几位小数（GDP 写「538580.0」：digits = 1），不填按数本身写
 */
export interface LineSeries {
  name?: LStr
  tone?: 'blue' | 'orange' | 'green'
  values: (number | null)[]
  digits?: number
}
/**
 * 线段图上的一个括号（FracLine 的 braces，五下「同分母分数加、减法」做一做 1）：括住从左数第 from 到第 to 个刻度之间的那几小段
 * （0 是左端），top = 画在线段上面、bottom = 下面；label 写在括号的尖上：分数「2/5」画成上下两层，「?」原样写
 */
export interface SegBrace {
  from: number
  to: number
  side: 'top' | 'bottom'
  label: string
}

/** 结构化题干片段：文本 + 教具/图形参数，由 QuestionRenderer 分发渲染 */
// ── 六年级数学的辅助类型 A ──
/** 四个正方向（六上「确定位置」）：n 北、e 东、s 南、w 西 */
export type Dir4 = 'n' | 'e' | 's' | 'w'
/** 方向：从 base 那个方向起、向 side 那边偏 deg 度（北偏东 30° = { base: 'n', side: 'e', deg: 30 }）；不填 side = 正北 / 正东…… */
export interface Bearing {
  base: Dir4
  side?: Dir4
  deg?: number
}
/**
 * 方向和距离图（BearingMap）上从参照点出去的一条射线：dir 方向，segs = 画几小段（离参照点的距离 ÷ 每一小段表示的距离，可以不是整数）；
 * name 写在端点外侧（图里的字，不注音、不朗读），tag = 只写一个大写字母或编号（选项就是它），ask = 名字换成「?」；
 * arc = 画角的弧并写度数：'base' 量在 base 那条线和射线之间（北偏东 30° 写 30°），'other' 量在另一条线上（写 60°）；
 * ticks = false 不画刻度，dot = false 端点不画圆点（编号的射线）
 */
export interface BearingPlace {
  dir: Bearing
  segs: number
  name?: LStr
  tag?: string
  ask?: boolean
  arc?: 'base' | 'other'
  ticks?: boolean
  dot?: boolean
}
/**
 * 路线图（RouteMap，六上例 5）的一段：从上一个地方出发，向 dir 走 segs 小段到 to（不填 = 没有名字的拐点）；dist = 段旁写的距离（「200 m」），
 * arc = 在这一段的起点画方向角，back = 在这一段的终点画回来时的方向角（课本例 5 两头都画）
 */
export interface RouteLeg {
  dir: Bearing
  segs: number
  to?: LStr
  dist?: string
  arc?: boolean
  back?: boolean
}
/** 一幅路线图：start 出发的地方，per = 比例尺一小段写的字（不填不画比例尺） */
export interface RouteFig {
  start: LStr
  legs: RouteLeg[]
  per?: string
}
/**
 * 有序数对方格图（PairGrid）上的一样东西：cells 模式在第 x 列、第 y 行的格子里（都从 1 起，第 1 行在最下面），points 模式在格点 (x, y)（从 0 起）；
 * tag = 大写字母（点旁 / 格子里），name = 地名或人名（小字，不注音、不朗读），icon = emoji，fill = 格子涂色（cells），ask = 画「?」
 */
export interface PairItem {
  x: number
  y: number
  tag?: string
  name?: LStr
  icon?: string
  fill?: 'red' | 'blue'
  ask?: boolean
}
/** PairGrid 上的连线：依次连起 pts（格点），closed = 首尾连上（封闭图形），dash = 虚线（平移前的图形） */
export interface PairShape {
  pts: [number, number][]
  closed?: boolean
  dash?: boolean
}
/** 分拣机器人图（练习一 5）上的标记：tri = 投递口（蓝三角），dot = 传递口（红圆，n 是号） */
export interface PairMark {
  x: number
  y: number
  t: 'tri' | 'dot'
  n?: number
}
// ── 六年级数学的辅助类型 B ──
/**
 * 多行线段图（FracBars，六上「分数乘法」例 6、「分数除法」例 2、「百分数」的增长线段图）的一行：
 * len = 这一行多长（以第一行平均分的「段」为单位，可以是小数：2.5 段）；parts = 这一行自己平均分成几段画刻度（不填按 len 取整；1 = 只画两端）；
 * dash = 这一段画虚线（少掉的部分，例 6「现在」比原来少的 1/4）；name 写在左边（图里的字，不注音、不朗读）
 */
export interface BarRow {
  name?: LStr
  len: number
  parts?: number
  dash?: [number, number]
  braces?: BarBrace[]
}
/** 线段图上的括号：括第 from 到 to 段（按「段」计，可以只括一部分），label 写数、分数（画两层）、百分数或「?」，不写汉字和单位 */
export interface BarBrace {
  from: number
  to: number
  side: 'top' | 'bottom'
  label: string
}
/**
 * 长方形面积图（FracArea）上的大括号：写在左边或右边，from、to 按条的边算、从下往上数（0 是下沿，rows 是上沿）——
 * from 0、to 4 = 最下面 4 条；label 写数、分数（画两层）或「?」，不写汉字和单位
 */
export interface AreaBrace {
  side: 'left' | 'right'
  from: number
  to: number
  label: string
}
// ── 六年级数学的辅助类型 C ──
// ── 六年级数学的辅助类型 D ──
// ── 六年级数学的辅助类型 E ──
// ── 六年级数学的辅助类型 F ──
/** 温度计（Thermometer，六上「生活中的负数」、六下「负数」）里的一支：value = 液柱停在几摄氏度；name = 下面写的名字（两支比高低时的「甲」「乙」，图里的字，不注音、不朗读） */
export interface ThermoItem {
  value: number
  name?: LStr
}
/** 直线上的一个点（DecScale 的 points，六下「负数」例 3、做一做、练习一 5 和 7）：i = 从左数第几小格（0 起），name = 点上方写的字（A、B……、人名、「树」） */
export interface ScalePoint {
  i: number
  name: LStr
}
// ── 六年级数学的辅助类型 G ──
/**
 * 圆柱、圆锥立体图（RoundSolid，六下「圆柱与圆锥」）的一个：照课本斜着往下看的画法——底面是扁椭圆，看不见的那半圈画虚线。
 * shape：cylinder 圆柱、cone 圆锥；干扰项 frustum 圆台、cut 上面斜着切过的圆柱、sphere 球；组合体 silo 圆柱上面接一个一样粗的圆锥（粮仓）、
 * hopper 圆柱下面接一个尖朝下的圆锥（漏斗）；bottle 瓶子（圆柱形的瓶身 + 细瓶颈 + 瓶盖，例 7）。
 * r 底面半径、h 高（只是画图的比例，悬殊时把短的放大到长的 0.3 倍；标的数写在 labels 里）；silo / hopper 的 h 是圆柱部分、h2 是圆锥部分。
 * pose：up 立着（默认）、down 倒过来（圆锥尖朝下、瓶口朝下）、side 横放（底面朝左右）、tilt 斜放、lie 圆锥横倒（底面朝左上）。
 * labels（只写数、字母、「?」，单位写在题目文字里）：r 从底面圆心画到边、d 直径的尺寸线（dAt：画在上面还是下面，默认上面）、
 * h 高的尺寸线（立着的画在右边，横放的画在上面）、h2 圆锥部分的高、water 水的高度（瓶子倒过来时是上面没有水的那一段）。
 * marks：大写字母加一条引线指着的部位（base 看得见的那个底面、base2 另一个底面、side 侧面、h 高、apex 顶点）。
 * water：透明容器（cylinder、bottle）里水的高度（与 h 同一单位）；bottle 倒过来时是上面没有水的那一段的高度。
 * tone：颜色（0 蓝、1 粉、2 绿、3 沙黄），一组图里颜色不跟形状走
 */
export interface RoundSolidSpec {
  shape: 'cylinder' | 'cone' | 'frustum' | 'cut' | 'sphere' | 'silo' | 'hopper' | 'bottle'
  r: number
  h: number
  h2?: number
  pose?: 'up' | 'down' | 'side' | 'tilt' | 'lie'
  labels?: { r?: string; d?: string; h?: string; h2?: string; water?: string }
  dAt?: 'top' | 'bottom'
  marks?: { at: 'base' | 'base2' | 'side' | 'h' | 'apex'; text: string }[]
  water?: number
  tone?: number
}
// ── 六年级数学的辅助类型 H ──
/**
 * 正比例 / 反比例图象（PropGraph，六下「比例」p44–50）的一条轴：每格代表 step、一共 cells 格，刻度从 0 起每 every 格标一个数（不填 1）；
 * name 是轴名（「总价/元」，图里的字，不注音、不朗读）
 */
export interface GraphAxis {
  name: LStr
  step: number
  cells: number
  every?: number
}
/**
 * 坐标图里的一组点（照课本描的点）：line = 'origin' 从 0 点画直线经过这些点（extend = 一直画到方格的边上，课本「连起来再延长」）、
 * 'curve' 过这些点的光滑曲线（反比例，点的横纵坐标乘积一样）、'none'（默认）只描点；name 写在线的末端（课本斑马那幅不画图例，
 * 名字写在线的顶上），tone 线和点的颜色
 */
export interface GraphSeries {
  name?: LStr
  tone?: 'blue' | 'orange' | 'green'
  pts: [number, number][]
  line?: 'origin' | 'curve' | 'none'
  extend?: boolean
}

export type StemPart =
  | { kind: 'text'; text: LStr }
  | { kind: 'expr'; expr: string }
  | { kind: 'tenframe'; filled: number; extra?: number; taken?: number } // taken：格里划掉的个数（破十法：拿走的那几个，淡色 + ✕）
  /** 一组同类实物（数数） */
  | { kind: 'objects'; icon: string; count: number }
  /** 一堆混合实物（分类、数指定的一类） */
  | { kind: 'scatter'; items: string[] }
  /** 两三行实物，逐行比多少 */
  | { kind: 'compare-rows'; rows: { icon: string; count: number }[] }
  /** 倍的认识（G6）：每行开头是谁的（who），同一种实物按 per 个一圈圈起来（一圈 = 一份），圈数就是几倍 */
  | { kind: 'times-rows'; icon: string; per: number; rows: { who: string; count: number }[] }
  /** 钟面（读整时/半时） */
  | { kind: 'clock'; hour: number; minute: number }
  /** 一组人民币 */
  | { kind: 'money'; pieces: MoneyPiece[] }
  /** 单个图形；平面图形可以换颜色（tone，ShapeGlyph 的色板下标）、转个角度（turn，度）、换三角形的样子（form：0 等腰、1 直角、2 一般），免得孩子靠颜色和摆法认图形 */
  | { kind: 'shape'; shape: ShapeKind; tone?: number; turn?: number; form?: number }
  /** 一堆图形（分类、数图形）；tones / turns / forms 与 shapes 一一对应（可不填） */
  | { kind: 'shape-group'; shapes: ShapeKind[]; tones?: number[]; turns?: number[]; forms?: number[] }
  /** 用小正方形拼成的矩形（图形拼组：数格子 / 认拼成的图形） */
  | { kind: 'tiles'; rows: number; cols: number }
  /** 找规律序列，含 ? 空位 */
  | { kind: 'sequence'; cells: SeqCell[] }
  /** 一排/一列物体（位置：上下前后左右、第几）。axis 决定横排(lr/fb)或竖列(ud) */
  | { kind: 'lineup'; items: string[]; highlight?: number; axis?: 'lr' | 'ud' | 'fb' }
  /** 数轴 */
  | { kind: 'number-line'; from: number; to: number; marks?: number[] }
  /** 尺子（厘米刻度 0…length）上方压着一条线段，从 from 到 to（量一量：读出长度）；mm = 毫米尺（三年级），from / to 按毫米算 */
  | { kind: 'ruler'; length: number; from: number; to: number; mm?: boolean }
  /** 一个或一组角：deg 是角的度数，rot 是整体旋转（度），随机旋转免得孩子靠方向判断 */
  | { kind: 'angles'; items: { deg: number; rot: number }[] }
  /** 秤面（三年级认识质量单位）：一圈刻度 0…max（顶上 0 和 max 重合），每 major 标一个数、之间分 minor 小格，指针指着 value */
  | { kind: 'scale'; max: number; major: number; minor?: number; value: number; unit: 'g' | 'kg' }
  /** 组合立体图（三年级「观察物体」）：绿色长方体 + 红色圆柱，on = 圆柱立在顶面正中，beside = 立在右边 */
  | { kind: 'solid-scene'; arrangement: 'on' | 'beside' }
  /** 看到的样子（一幅或几幅；numbered = 下面标 1、2、3，选项就是这几个数） */
  | { kind: 'views'; items: ViewKind[]; numbered?: boolean }
  /** 写着数的正方体（相对两个面上的数和是 7）：看得见的前面、上面、右面各一个数 */
  | { kind: 'dice'; front: number; top: number; right: number }
  /** 剪开后的图形：按格子坐标画几个正方形，格子里可以写字（「前」、1、2……） */
  | { kind: 'net'; cells: { r: number; c: number; label?: LStr }[] }
  /** 几何图（GeoFigure）：一幅或几幅（numbered = 下面标 1、2、3……，选项就是这几个数）；alt 是静态页上的中文说明（不显示、不朗读） */
  | { kind: 'geo'; figs: GeoFig[]; numbered?: boolean; alt: string }
  /** 竖式（笔算加减乘）：两个数右对齐、运算符在左、下面一条横线，答案留空（三年级起有乘法：多位数乘一位数） */
  | { kind: 'vertical'; a: number; op: '+' | '-' | '×'; b: number }
  /** 十块条和小方块（TenBlocks，三年级口算乘法）：groups 组并排，每组 tens 根十块条、ones 个小方块（12 × 3 = 3 组，每组 1 根、2 个） */
  | { kind: 'blocks'; groups: number; tens: number; ones: number }
  /** 号码条（CodeStrip，三年级数字编码）：一排数字格（身份证号码、邮政编码、学号、书号）；segs = 从左到右每段几位（下面用括号括起来），
   *  names = 每段括号下面标的名字（空串 = 不标），mark = 标出颜色的那一段、cell = 标出的那一位（都从 0 数）；
   *  fit = 按几位来定格子宽（两个号码上下比长短时用同一个数，格子才一样大；不填按自己的位数） */
  | { kind: 'code-strip'; digits: string; segs?: number[]; names?: LStr[]; mark?: number; cell?: number; fit?: number }
  /** 平均分的图（FracShape，三年级分数 / 小数）：一幅或几幅并排，见 FracPic */
  | { kind: 'frac-shape'; items: FracPic[] }
  /** 一条平均分的线（FracLine）：0…units 个整份、每份分 per 小段；bracket = 括出第几到第几小段，arrow = 箭头指着第几个刻度；
   *  ruler = 画成尺子（每个刻度标数，末尾写 unit）；否则整份处标 0、1、2…（1 以后带 unit）；labels = false 一个数也不标（线段） */
  | { kind: 'frac-line'; units: number; per: number; bracket?: [number, number]; arrow?: number; unit?: string; ruler?: boolean; labels?: boolean }
  /** 一些物体看作一个整体（FracSet）：groups 份、每份 per 个 icon（dot = 画圆点），前 shaded 份涂色；
   *  dir：row 每份排一排、col 每份排一列、不填是一份一个虚线框（boxed = false 不画框） */
  | { kind: 'frac-set'; icon: string; groups: number; per: number; shaded: number; dir?: 'row' | 'col'; boxed?: boolean }
  /** 运动现象的小图（MotionFigs，三下「生活中的运动现象」）：一个或一排，见 MotionItem；arrows = 之间画「→」（找规律）；alt 是静态页上的中文说明（不显示、不朗读） */
  | { kind: 'motion-figs'; items: MotionItem[]; arrows?: boolean; alt: string }
  /** 除法竖式（LongDivision，三下「除数是一位数的除法」，课本的厂字形），见 DivLine；box = 被除数的第几位画成空方框（「□72 ÷ 4」方框里填几） */
  | { kind: 'long-division'; divisor: number; dividend: number; quotient?: DivLine; rows?: DivLine[]; box?: number }
  /** 记录单（TallySheet，三下「数据的收集与整理」）：一类一行（icon + 名字），后面画 count 个记号——zheng 画「正」字（5 画一个、按笔顺）、check 打 √、circle 画 ○ */
  | { kind: 'tally'; rows: { label: LStr; icon?: string; count: number; mark: 'zheng' | 'check' | 'circle' }[] }
  /** 统计表（StatTable）：一行一个数组，格子是数、词条或 null（要填的那一格，画「?」）；head 哪一栏是表头（col 第一列 / row 第一行 / both / none），title 表题 */
  | { kind: 'stat-table'; title?: LStr; rows: (number | LStr | null)[][]; head?: 'row' | 'col' | 'both' | 'none' }
  /** 月历（MonthCalendar，三下「年、月、日的秘密」）：星期一在最前、六日红字；days 这个月几天，first 1 日是星期几（1–7，7 = 星期日），mark 圈出的日子 */
  | { kind: 'calendar'; title: LStr; days: number; first: number; mark?: number[] }
  // ── 四年级数学 A ──
  /**
   * 大数卡（BigNum，四上「万以上数的认识」）：照课本连写的数、大字显示，**不朗读**——这一单元把数读出来就等于把读法、组成、近似数说了。
   * n：数字串（可以带「□」：要填数字的那一位）；split：级与级之间画红色竖虚线（课本的分级线 25┊0000）；marks：下面画横线的那几位（从左数，0 起）；
   * words：不写数、写课本的读法（写作题，注音）；say：朗读时读的数字串（写作题读出它的读法，按课本读法拆读）；
   * rel / rhs / unit：右边接着写「= ?万」「≈ 9亿」「○ 27万」「< □103270000」——rhs 是「?」就是要填的空（练习页把按的数填进去），
   * unit 是 rhs 后面的「万」「亿」（注音）；rel 是「?」时两个数中间画一个空方框（要选的符号）
   */
  | { kind: 'big-num'; n?: string; split?: boolean; marks?: number[]; words?: LStr; say?: string; rel?: '=' | '≈' | '○' | '>' | '<' | '?'; rhs?: string; unit?: 'wan' | 'yi' }
  /** 计数器（CounterRods，四上 p2 / p9 / p10）：一排竖杆，从左到右是 top 位 … 个位（8 = 亿位、11 = 千亿位），杆下写数位名（图里的字，不注音）；
   *  beads[i] = 从左数第 i 根杆上的珠子个数（0–10；10 颗时最上面一颗离开一点画：满十，课本「10 个一万是十万」的图） */
  | { kind: 'counter'; top: number; beads: number[] }
  /** 算盘（AbacusFrame，四上练习二 7）：13 档，梁上 2 颗上珠（一颗当 5）、梁下 5 颗下珠（一颗当 1），靠梁的才算数；n 是拨出的数（右对齐，最右一档是个位，上面写「个位」） */
  | { kind: 'abacus'; n: string }
  /** 数位顺序表（PlaceTable，四上 p2 / p3 / p10）：从 top 位到个位一列一位，三行：数级（亿级 / 万级 / 个级）、数位、计数单位（图里的字，不注音）；
   *  最左一列「……」；ask = 这一位的数位和计数单位画成「?」 */
  | { kind: 'place-table'; top: number; ask?: number }
  // ── 四年级数学 B ──
  /**
   * 量角器（Protractor，四上「角的度量」，照课本第 30 页画）：半圆，外圈 0 在左、内圈 0 在右，每 10° 标数、每 5° 一根长刻度；
   * rays 从中心起的几条线（角的边、射线 OA），arc = 在哪两条线之间画角的红弧（按 at，小的在前）；points = 外沿上标着字母的点（画角题）；
   * center = 中心旁标的字母（O，画了字母就在中心画点；只有一条线时也画点：那是射线的端点）；tilt = 整个量角器连同角逆时针斜放几度；
   * name = 写在角里的编号（∠1 的「1」）；alt 是静态页 / 读屏的中文说明（不显示、不朗读，不能写度数）
   */
  | { kind: 'protractor'; rays: ProtractorRay[]; arc?: [number, number]; points?: ProtractorPoint[]; center?: string; tilt?: number; name?: string; alt: string }
  // ── 四年级数学 C ──
  /**
   * 乘数是两位数的乘法竖式（VerticalForm，四上「多位数乘两位数」）：a 写在上面、b 写在下面，两次乘得的数各占一行——
   * 第二次的末位对齐十位、个位的 0 不写（课本），再一条横线写积。zeros = 末尾有 0 的乘法照课本做一做的写法：
   * 0 前面的部分对齐、0 写在竖式外面（704 × 90、580 × 12）。不传 work：两次乘得的数那两行先空着（答完填上），按的数填在积那一行；
   * work = 写好的竖式（看竖式答题、改错题，见 MulWork）；mark = 第几次乘得的数旁边画红箭头（「箭头所指这一步算的是什么」）
   */
  | { kind: 'mul-vertical'; a: number; b: number; zeros?: boolean; work?: MulWork; mark?: 1 | 2 }
  // ── 四年级数学 D ──
  /**
   * 条形统计图（BarChart，四上「条形统计图」）：dir 竖向（v，条立着，默认）/ 横向（h，条躺着，类别从下往上排）；cats 是类别（写在类别轴上）；
   * step = 1 格代表几、cells = 数量轴一共几格（刻度 0、step……cells × step，从 0 开始、每格都标数）；valueAxis / catAxis 是两条轴的名字
   * （「人数」「数量/本」/「天气情况」）；grid = 满格方格纸（课本的单式图，条上不写数），否则只在数量轴上画短刻度；numbers = 条顶写数（复式图）；
   * hideScale = 刻度上的数不写、画成空框（「每格代表几本」要自己推）；title 写在图上方；series 两三组时右上角画图例
   */
  | { kind: 'bar-chart'; dir?: 'v' | 'h'; title?: LStr; cats: LStr[]; series: BarSeries[]; step: number; cells: number; valueAxis: LStr; catAxis: LStr; grid?: boolean; numbers?: boolean; hideScale?: boolean }
  /**
   * 平面图（PlanMap，四上「寻找宝藏」的藏宝图、复习里的动物园导游图）：3 × 3 的格子，上北下南、左西右东（右上角画「北 ↑」）；
   * cells[行][列] 是一个地方或 null（空地），第 0 行在最上面；marks 是编号的宝藏；roads = 画出路（中间到四周八处、外圈相邻的地方之间）；title 图题
   */
  | { kind: 'plan-map'; cells: (PlanPlace | null)[][]; marks?: PlanMark[]; roads?: boolean; title?: LStr }
  /** 指南针（CompassRose，四上「寻找宝藏」）：八个方向的字围成一圈、红针指北；ask = 这个方向不写字、画「?」 */
  | { kind: 'compass'; ask?: Dir8 }
  // ── 四年级数学下册 A ──
  /**
   * 线段图（PartLine，四下「加、减法的意义和各部分间的关系」例 1：西宁—格尔木—拉萨）：一条线分成几段（PartSeg），每段上面一个大括号写 label；
   * total = 整条线下面一个大括号写的（总数或「?」），不填就不画；names = 各个分点下面写的名字（parts.length + 1 个，图里的字，不注音、不朗读）
   */
  | { kind: 'part-line'; parts: PartSeg[]; total?: string; names?: LStr[] }
  /**
   * 树状图（CalcTree，四下「括号」练习三 2）：最上面两个数 a、b 各在一个框里，两条斜线往下汇到第一步的得数框，运算符号写在两条斜线中间；
   * 第二步起每步新加一个数 n（TreeStep），和上一步的得数框在同一层、写在它的左边或右边，再往下汇成这一步的得数框
   */
  | { kind: 'calc-tree'; a: string; b: string; steps: TreeStep[] }
  // ── 四年级数学下册 B ──
  // ── 四年级数学下册 C ──
  /**
   * 小数卡（DecCard，四下「小数的意义和性质」）：照课本写的一个小数（n），大字显示，**不朗读**——读法题把数读出来就等于报了答案；
   * marks = 下面画横线的那几位（按 n 的字符下标，从左数，0 起，小数点也占一个下标）；
   * frac = 不写小数、画一个上下两层的分数 [分子, 分母]（分母是 1000、10000 的分数在文字里画不成两层、也读不对，放在卡上）；
   * 六年级起 n 里还可以有正负号（「−6」「+41」）、单位「℃」「%」（「−6 ℃」「35%」）；sign = 分数前面的正负号（「−3/8」「+4/5」）
   */
  | { kind: 'dec-card'; n?: string; marks?: number[]; frac?: [number, number]; sign?: '+' | '−' }
  /**
   * 米尺和数线（DecScale，四下「小数的意义」例 1 的米尺、练习九 7 / 练习十 6 的直线）：labels 是长刻度下面写的字（「0」「1」……「1 m」「0.1」），
   * 相邻两个长刻度之间平均分成 per 小格（per 是双数时正中间那一格画中长刻度）；extra = 最后一个长刻度后面再画几小格；
   * ruler = 画成浅蓝的尺身（刻度从上沿往下、字在刻度下面、红箭头从下面指上去），broken = 右端画成折断线（放大的一段）；
   * 否则画成向右带箭头的直线（红箭头从上面指下来）；arrow = 红箭头指着从左数第几小格（0 起，可以是 .5：指在两小格中间）；
   * 六年级起 labels 可以有正负数（「−4」），空串 = 这个长刻度不写数；points = 直线上的红点，点上方写名字（见 ScalePoint）
   */
  | { kind: 'dec-scale'; labels: string[]; per: number; extra?: number; ruler?: boolean; broken?: boolean; arrow?: number; points?: ScalePoint[] }
  /**
   * 小数的数位顺序表（PlaceTable 的小数版，四下 p34）：第一行「整数部分 | 小数点 | 小数部分」，下面「数位」「计数单位」两行；
   * 整数部分从 top 位到个位（前面一列「……」），小数部分从十分位到第 dec 位（4 = 万分位，后面一列「……」），计数单位的个位写「一（个）」；
   * ask = 打问号的那一位（0 个位、1 十位……，负数是小数部分：-1 十分位、-2 百分位……）
   */
  | { kind: 'dec-table'; top: number; dec: number; ask?: number }
  // ── 四年级数学下册 D ──
  /**
   * 小数竖式（VerticalForm 的小数模式，四下「小数的加法和减法」）：lines 是参加运算的几个数（两个；连加时三个），已经按列排好、一样长的字符串——
   * 一个字符一列（数字、「.」、空格）；按小数点对齐时各行的「.」在同一列（只有「.」的那一列画得窄），位数少的数右边空着、不补 0；
   * op 写在最后一行的左边；result = 写好的得数（改错题照写：可以是错的、没对齐的，也按列排好）；不传就在横线下画一排空格子（得数在选项里选）
   */
  | { kind: 'dec-vertical'; lines: string[]; op: '+' | '-'; result?: string }
  /**
   * 移多补少图（EvenOut，四下「平均数」例 1）：一行一个人（左边写名字），每行画 count 个空水瓶，下面一条数轴 0…max（一个瓶子一格）；
   * avg = 在平均数那里画一条竖虚线，比它少的行用虚线画出补上的空瓶（课本的移多补少）；不传就不画（平均数要自己求）
   */
  | { kind: 'even-out'; rows: EvenRow[]; max: number; avg?: number }
  // ── 四年级数学下册 E ──
  /**
   * 观察物体（二）摆好的物体（CubeSolids）：一个或几个并排（共用一个格子大小），见 CubeSolid；
   * numbered = 下面标 1、2、3……（选项就是这几个数）。读屏只说「小正方体搭的物体」，不说怎么搭的
   */
  | { kind: 'cube-solids'; items: CubeSolid[]; numbered?: boolean }
  /** 从某个位置看到的图形（CubeViews）：一幅或几幅并排、格子一样大，见 CubeViewFig；numbered = 下面标 1、2、3…… */
  | { kind: 'cube-views'; items: CubeViewFig[]; numbered?: boolean }
  // ── 五年级数学 A ──
  /** 标数的俯视图（五上「观察简单组合体」练习一 9、五下「观察物体（三）」练习一 6）：从上面看到的图形，每格写着这个位置摞了几个小正方体（CubeViews 画，不朗读） */
  | { kind: 'cube-top'; cells: TopCell[] }
  /**
   * 表盘上的一根指针（五上「旋转」例 6、五下「图形的运动（三）」例 1）：指着 to（1–12）；from = 原来指着几（画成虚线指针，
   * 再画一条从 from 到 to 的顺时针红色弧形箭头）；中心标 O（ClockFace 画，不朗读）
   */
  | { kind: 'dial'; to: number; from?: number }
  // ── 五年级数学 B ──
  /**
   * 小数乘法竖式（VerticalForm 的小数乘法模式，五上「小数乘法」）：a 写在上面、b 写在下面（照课本写的小数 / 整数，'0.72'、'60'），
   * 两个乘数按「去掉小数点的整数」**末尾对齐**（不按小数点对齐），小数点画在两格之间、不占一列；
   * zeros = 整数乘数末尾的 0 写在竖式外面（0.72 × 60：6 对着 2、0 伸出去一格），积的末尾跟着这几个 0；
   * product = 横线下写好的积（照写：只有数字不点小数点的「1380」是「给积点上小数点」，「0.0224」是补了 0 的积），不传就画一排空格子
   * （得数在选项里选）；steps = 写好积的竖式里，乘数有两位数字时画出两次乘得的数（照整数写、第二次左移一位、不点小数点）
   */
  | { kind: 'dec-mul'; a: string; b: string; zeros?: boolean; product?: string; steps?: boolean }
  /** 小数倍的线段图（RatioLines，五上「小数乘法」例 5）：几行线段一行一个（见 RatioRow），第一行平均分成 per 小段画刻度，别的行按 len 画长短、竖虚线对齐 */
  | { kind: 'ratio-lines'; per: number; rows: RatioRow[] }
  /**
   * 分段计费的线段图（PartLine 加的 ticks / tail，五上「小数乘法」例 8：出租车 0–7 km）：parts / total / names 同 part-line，
   * 段长按比例画（不拉长短段）；ticks = 每隔几（len 的单位）画一个小刻度（1 = 每 1 km）；label 是空串的段上面不画大括号；tail = 右端接一段虚线
   */
  | { kind: 'fare-line'; parts: PartSeg[]; total?: string; names?: LStr[]; ticks: number; tail?: boolean }
  // ── 五年级数学 C ──
  /**
   * 小数除法竖式（LongDivision 的小数模式，五上「小数除法」，照课本的厂字形）：divisor / dividend 照课本写成字符串（'0.85'、'22.4'、
   * '3.0'、'12.60'——添上 / 补上的 0 也写上），小数点画在两列之间、不占一格；quotient / rows 见 DivLine（位置按被除数的第几位数，
   * 被除数右边添 0 继续除的列接着往右数），quotient 的 text 可以带「.」：小数点画在它前面那一位的右边、和被除数的小数点上下对齐；
   * cols = 一共几列（≥ 被除数的位数：添 0 继续除时商和下面几行往右多出来的列，上面那条横线跟着延长；课本的 22 ÷ 4、400 ÷ 75 被除数上不写 .0）；
   * moved = 除数是小数的划法：除数前面没用的 0 用红斜线划掉、除数的小数点和被除数原来的小数点用红短斜线划掉，
   * 被除数的小数点移到「整数部分有 moved 位」的地方——还有小数部分就在那里点上新的小数点（4.48 → 44.8），没有就不点；
   * pad = 被除数末尾几个 0 是添上 / 补上的（标颜色）；hl = 绿底标出的几段（DivMark）；boxed = 商的第几个数字画红框（0 起，不算小数点）
   */
  | { kind: 'dec-division'; divisor: string; dividend: string; quotient?: DivLine; rows?: DivLine[]; cols?: number; moved?: number; pad?: number; hl?: DivMark[]; boxed?: number }
  /**
   * 摸球盒（DrawBox，五上「可能性」）：一个或几个盒子并排（numbered = 下面标 1、2、3……，选项就是这几个数），
   * 每个盒子里几种颜色各几个（ChanceBalls）；piece = 'pawn' 画成棋子（例 1、例 2），默认画球；bag = 画成纸袋（练习十九 4）。
   * 图里不写字，颜色和个数题目文字里会说（需要数的时候）；读屏只说「盒子里有几个球」
   */
  | { kind: 'draw-box'; boxes: ChanceBalls[][]; piece?: 'ball' | 'pawn'; bag?: boolean; numbered?: boolean }
  /**
   * 转盘（Spinner，五上「可能性」练习十九 2、练习二十 1）：items 一个转盘一个数组（一个或几个并排，numbered = 下面标 1、2、3……），
   * 转盘平均分成数组长度那么多份、从正上方起顺时针一份一个颜色，中心一根指向右边的指针
   */
  | { kind: 'spinner'; items: ChanceColor[][]; numbered?: boolean }
  // ── 五年级数学 D ──
  /**
   * 找规律的图（PatternDots，五上「用字母表示 ax+b 的数量关系」）：几幅并排（拼桌子、圆片、棋子，见 PatternFig），底边对齐；
   * more = 最后画「……」（照这样拼 / 摆下去），numbered = 每幅下面标 1、2、3（课本的 ①②③）。图里没有字，不注音、不朗读
   */
  | { kind: 'pattern-dots'; figs: PatternFig[]; more?: boolean; numbered?: boolean }
  // ── 五年级数学 E ──
  // ── 五年级数学 F ──
  /**
   * 百数表（HundredChart，五下「因数和倍数」：2、5 和 3 的倍数的特征是 0–99，找质数的表是 1–100，练习三 11 是 1–50）：
   * 从 start 起 count 个连续的数，每行 cols 个（默认 10）；circled = 画红圈的数（课本「圈起来」），boxed = 画蓝框的数（「框起来」），
   * crossed = 画一条斜线、变淡的数（找质数时去掉的数）。表里的数不朗读，题目要问的写在题干文字里
   */
  | { kind: 'hundred-chart'; start: number; count: number; cols?: number; circled?: number[]; boxed?: number[]; crossed?: number[] }
  /** 数字卡片（CodeStrip 的卡片样式，五下「3的倍数的特征」做一做、练习三 2 / 5 / 10）：一排卡片，每张一个数字；「?」是要填数字的那张（虚线空卡） */
  | { kind: 'digit-cards'; digits: string }
  /** 用小方块摆奇数、偶数（PairTiles，五下「和的奇偶性」例 2）：一堆或几堆（中间写「+」），每堆两个一列竖着排成两排，单出来的一个（黄色）在右下角 */
  | { kind: 'pair-tiles'; groups: number[] }
  /**
   * 天平（BalanceScale，五下「找次品」，照课本的记录图：三角形支点上一根横杆）：left / right 是两边放的东西上写的号码（一样一个，空串只画形状），
   * aside = 没放上去的（排在右边）；tilt：level 平衡、left 左边低（左边重）、right 右边低；shape：box 方块（钙片，例 1）/ ball 圆圈（零件，例 2）
   */
  | { kind: 'balance'; left: string[]; right: string[]; aside?: string[]; tilt?: 'level' | 'left' | 'right'; shape?: 'box' | 'ball' }
  /**
   * 通知示意图（NotifyTree，五下「☆ 怎样通知最快」）：group = 分组通知（蓝方块是老师，下面 groups 个橙色圆圈是每组先接到通知的同学，
   * 每个下面 per 个浅蓝圆圈）；double = 接到通知的人都继续通知别人（课本第 103 页的图，圈里的数是第几分钟接到通知），画到第 minutes 分钟（1–4）
   */
  | { kind: 'notify-tree'; mode: 'group' | 'double'; groups?: number; per?: number; minutes?: number }
  // ── 五年级数学 G ──
  /** 带标注的长方体 / 正方体（BoxFigure）：一个或两个并排（共用一个比例），arrow = 两个中间画箭头（取出石头前后），见 BoxSpec */
  | { kind: 'box'; items: BoxSpec[]; arrow?: boolean }
  /** 长方体的展开图（NetGrid 的不等宽格子）：cells 同 net，colW / rowH 是每列宽、每行高（相对大小，1 = 一格） */
  | { kind: 'box-net'; cells: { r: number; c: number; label?: LStr }[]; colW: number[]; rowH: number[] }
  /** 几个正方体展开图并排（NetSet），下面标 1、2、3……（选项就是这几个数） */
  | { kind: 'nets'; items: { r: number; c: number }[][] }
  /** 烧杯（Beaker）：刻度 0…max 毫升（每 max/10 一小格、每 max/5 标数），一幅或两幅（arrow = 中间画箭头），见 BeakerItem */
  | { kind: 'beaker'; max: number; items: BeakerItem[]; arrow?: boolean }
  // ── 五年级数学 H ──
  /**
   * 分数链（FracChain，五下「分数的基本性质」例 1 的箭头图、例 2「2/3 = ?/12」，约分、通分、假分数化成带分数）：一排上下两层的分数，
   * 中间写「=」等字；arcs = 分子上方 / 分母下方的红色弧形箭头（写「×2」「÷?」）。分子、分母、整数部分、箭头上的字里的「?」
   * 是要填的数（练习页把按的数填进去，几个「?」填同一个数）。**不朗读**（题干文字把要问的说全）
   */
  | { kind: 'frac-chain'; terms: ChainTerm[]; arcs?: ChainArc[] }
  /**
   * 集合图（VennSets，五下「最大公因数」「最小公倍数」例 1）：两个相交的椭圆，left / right 是上面写的名字（「8 的因数」），
   * only1 / both / only2 是左边那一块、中间那一块、右边那一块里的数（可以以「…」结尾）；ask = 这一块不写数、画「?」；
   * caption = 中间那一块下面红箭头指着的字（「8 和 12 的公因数」）。图里的字不注音、不朗读
   */
  | { kind: 'venn'; left: LStr; right: LStr; only1: string[]; both: string[]; only2: string[]; ask?: 'only1' | 'both' | 'only2'; caption?: LStr }
  // ── 五年级数学 I ──
  /**
   * 折线统计图（LineChart，五下「折线统计图」）：cats = 横轴上的类别（年份、月份、年龄），series 一条（单式）或两条（复式，右上角画图例）；
   * 纵轴每格代表 step、一共 cells 格，刻度从 0 起每格都标数；from = 纵轴 0 上面画折断号、第一格的刻度从 from 起（课本的人口、身高图）；
   * numbers = 每个点旁边写数（课本高铁、空气质量、GDP、气温几幅图的写法）；grid = 画方格（课本让学生自己画的空图）。
   * 图里的字（图题、轴名、类别、图例）不注音、不朗读，题目要问的都写在题干文字里
   */
  | { kind: 'line-chart'; title?: LStr; cats: LStr[]; series: LineSeries[]; step: number; cells: number; from?: number; valueAxis: LStr; catAxis: LStr; numbers?: boolean; grid?: boolean }
  /** 带括号的线段图（FracLine 的 braces，五下「同分母分数加、减法」做一做 1）：一条线段（整条是 1）平均分成 parts 小段，线上下画几个括号，见 SegBrace */
  | { kind: 'seg-braces'; parts: number; braces: SegBrace[] }
  // ── 六年级数学 A ──
  /**
   * 有序数对方格图（PairGrid，六上「用有序数对确定位置」）：mode = 'cells' 是格子（座位表、格子柜、涂色格：数标在格子上、从 1 起，
   * 列号在下、行号在左，第 1 行在最下面；seats = 画成一张张分开的桌子，下面、左边写「第 1 列」「第 1 行」），'points' 是格点
   * （数标在格线上、从 0 起，axes = 两条轴画箭头）；cols × rows 格。shapes = 连线，route = 带箭头的虚线路线，marks = 机器人图的投递口 / 传递口，
   * north = 右上角画「北」和箭头，per = 左上角写一格表示多少（「100 m」），diag = 在第一个小正方形里画对角线（练习二 8）。
   * 图里的字不注音、不朗读，题目文字里说出要找的东西；alt 是图的文字说明（读屏、静态页，不说出答案）
   */
  | {
      kind: 'pair-grid'
      mode: 'cells' | 'points'
      cols: number
      rows: number
      seats?: boolean
      axes?: boolean
      items?: PairItem[]
      shapes?: PairShape[]
      route?: [number, number][]
      marks?: PairMark[]
      north?: boolean
      per?: string
      diag?: boolean
      alt: string
    }
  /**
   * 方向和距离图（BearingMap，六上「用方向和距离确定位置」）：参照点 center 在十字的交点，axes = 'n' 只标「北」（默认）、'all' 东南西北都标；
   * places 是从参照点出去的射线（见 BearingPlace），per = 比例尺一小段写的字（「500 m」，不填不画）。alt 同 pair-grid
   */
  | { kind: 'bearing-map'; center: LStr; axes?: 'n' | 'all'; places: BearingPlace[]; per?: string; alt: string }
  /** 路线图（RouteMap，六上例 5）：一幅或几幅（numbered = 下面标 1、2、3，「哪幅图画的是这条路线」），每个拐点画虚线小十字，右上角画「北」 */
  | { kind: 'route-map'; figs: RouteFig[]; numbered?: boolean; alt: string }
  /**
   * 鸽巢问题的放法图（Pigeonholes，六下例 1、例 2）：几个笔筒 / 抽屉 / 鸽笼并排，counts = 每个里面放了几个 icon，
   * extra = 旁边还没放进去的几个（虚线框）。图里没有字
   */
  | { kind: 'pigeonholes'; holder: 'cup' | 'drawer' | 'cage'; icon: string; counts: number[]; extra?: number }
  // ── 六年级数学 B ──
  /**
   * 长方形面积图（FracArea，六上「分数乘法」的格子图、「分数除法」例 1 的面积条）：整个长方形横着平均分 rows 条、竖着平均分 cols 列。
   * 乘法：first = 第一个乘数（前 n 行 / 列画红色斜线），second = 在 first 那部分里沿另一个方向再取 n 条（画交叉网线，from: 'end' 从最后一条往前取），
   * ghost = 最后几行（或列）画虚线（不属于这块地）；除法：solid = 从下往上几条画实线、上面的画虚线框（整体里不算的那部分），
   * shade = 涂浅蓝的条（along: 'row'）或列（along: 'col'，只涂实线的格），braces = 左右的大括号。图里不写汉字和单位，aria 只说「长方形面积图」
   */
  | {
      kind: 'frac-area'
      rows: number
      cols: number
      first?: { along: 'row' | 'col'; n: number }
      second?: { n: number; from?: 'start' | 'end' }
      ghost?: number
      solid?: number
      shade?: { along: 'row' | 'col'; cells: number[] }
      braces?: AreaBrace[]
    }
  /**
   * 多行线段图（FracBars）：第一行平均分成 unit 段，别的行按 len 用同样的「段」画长短、左端对齐（见 BarRow）；
   * guides = true 从上一行的分点拉竖虚线到下一行，给数组就在这些位置（按「段」计）拉红色竖虚线（百分数例 3 标出原来的长度）
   */
  | { kind: 'frac-bars'; unit: number; rows: BarRow[]; guides?: boolean | number[] }
  // ── 六年级数学 C ──
  // ── 六年级数学 D ──
  // ── 六年级数学 E ──
  // ── 六年级数学 F ──
  /**
   * 温度计（Thermometer，六上「生活中的负数」p45、六下「负数」做一做 1）：竖的玻璃管、下面一个圆泡，min…max 摄氏度，
   * 每 major 一个长刻度、左边写数（0 写红字，负数写「−」），每 minor 一个短刻度，管顶写「℃」；液柱停在 value（ThermoItem）。
   * items 一到两支并排（比高低时下面写名字）。图里只有数和 ℃，不注音、不朗读
   */
  | { kind: 'thermo'; items: ThermoItem[]; min: number; max: number; major: number; minor: number }
  // ── 六年级数学 G ──
  /**
   * 圆柱、圆锥立体图（RoundSolid）：一个或几个并排（共用一个比例；numbered = 下面标 1、2、3……，选项就是这几个数；
   * arrow = 两个中间画箭头，例 7 的瓶子正放 → 倒过来），见 RoundSolidSpec。图里只写数、字母，不注音、不朗读
   */
  | { kind: 'round-solid'; items: RoundSolidSpec[]; numbered?: boolean; arrow?: boolean }
  // ── 六年级数学 H ──
  /**
   * 正比例 / 反比例图象（PropGraph，六下「比例」）：方格纸上两条带箭头的数轴（横轴 x、纵轴 y，见 GraphAxis），原点写 0；
   * series 一组或两组点和线（见 GraphSeries）；guide = 读图的红虚线：从横轴上的 x（或纵轴上的 y）画到第一组的线上、再拐到另一条轴，
   * 那一头画「?」；marks = 另外描的点（空心圈：「这个点在不在直线上」）。图里的字不注音、不朗读，要问的写在题干文字里
   */
  | { kind: 'prop-graph'; x: GraphAxis; y: GraphAxis; series: GraphSeries[]; guide?: { x?: number; y?: number }; marks?: [number, number][] }
  /**
   * 线段比例尺（ScaleBar，六下「比例尺」p51–53）：一条分成 segs 段（默认 1）的短线（课本的「└──┘」），左端上面写 0，
   * 每段右端写 per、2 × per……，最后一个数后面写单位 unit（米 / 千米，图里的字，不注音、不朗读）；per 不填画「?」（例 3「0 (  ) m」要填的数）
   */
  | { kind: 'scale-bar'; per?: number; segs?: number; unit: LStr }
  // ── 语文（§9）：这几种都是中文内容，不翻译；朗读时在英文界面下也用中文读（Y6）──
  /** 大字：每个汉字一个田字格（楷体），其它字符（＋ ＝ ？）原样放大；不注音、不朗读——考的就是认不认得（Y3） */
  /** mark：标红的那个字（多音字「这个词里红色的字怎么读」，Y9） */
  | { kind: 'hanzi'; text: string; mark?: number }
  /** 拼音卡：音节 / 声母 / 韵母 / 拼读式「b + ā」，初学者字体大号显示；say 是朗读时读的同音汉字（「bā」读「八」），不填就不读（Y4） */
  | { kind: 'pinyin'; text: string; say?: string }
  /** 听音题：画一个大喇叭，朗读时读 say（中文），屏幕上不出现 say 的文字（Y3） */
  | { kind: 'listen'; say: string }
  /** 一张图（emoji）；say 是朗读时读的名字，不填就不读 */
  | { kind: 'picture'; icon: string; say?: string }
  /**
   * 课文 / 古诗 / 儿歌里的句子：py 是与 text 里的汉字逐个对齐的拼音（空格分隔，挖掉的字也有）；
   * blank = 挖掉的那几个字 [起点, 长度]（按字符算），画成虚线空格，朗读时在那里停一下。中文界面注音、英文界面不注音
   */
  | { kind: 'verse'; text: string; py: string; blank?: [number, number] }

export type AnswerSpec =
  | { kind: 'number'; value: number }
  | { kind: 'choice'; choiceId: string }

/** 作答方式只有这两种（数字键盘 / 选项卡），题干再花哨答案也收敛到数值或选项 id */
export type InputMode = 'numpad' | 'choice'

export interface Choice {
  id: string
  label: LStr
  /**
   * 朗读这个选项时读什么（中文）：拼音「shān」读「山」、偏旁「氵」读「三点水」、图读它的名字；
   * 不填就读 label。答错时「正确答案是 X」读的就是它（语文，Y4 / Y6）
   */
  say?: string
}

/** 选项卡的样子（语文）：pinyin 拼音（初学者字体）、hanzi 不注音的楷体大字（考认字，Y3）、emoji 大图；不填是普通文字 */
export type ChoiceStyle = 'pinyin' | 'hanzi' | 'emoji'

/** 答错后的教具演示配置 */
export type DemoSpec =
  | { kind: 'make-ten'; a: number; b: number } // 凑十法（进位加）
  | { kind: 'break-ten'; minuend: number; subtrahend: number } // 破十法（退位减）

export interface Question {
  /** 由题目参数派生的签名，兼作会话内去重键 */
  id: string
  kpId: string
  type: QuestionType
  difficulty: Difficulty
  stem: StemPart[]
  input: InputMode
  answer: AnswerSpec
  choices?: Choice[]
  /** 选项卡的样子（语文）；不填是普通文字 */
  choiceStyle?: ChoiceStyle
  explain?: DemoSpec
}

/**
 * 一个知识点「当前这一轮」：seed 能复现同一组题，results 按顺序记每一题答对（true）还是答错
 * （已答 = results.length）。没做完的下次进来从断点接着做；做满一轮的下次进来开新的一轮、重新计数。
 */
export interface RoundState {
  seed: number
  results: boolean[]
}

export interface ProgressState {
  /** 每个知识点是否已完成（做完整轮练习即为已完成） */
  completed: Record<string, boolean>
  /** 每个知识点当前这一轮（没做过的没有键；地图的进度条与对错数都来自它） */
  rounds: Record<string, RoundState>
}

export interface Settings {
  soundEnabled: boolean
  lang: Lang
}

// ── 目录：学科 / 年级 / 课程（多学科多年级的骨架） ──

/** 上线状态：live 有内容可练，soon 占位「敬请期待」 */
export type ContentStatus = 'live' | 'soon'

/** 一个「学科 × 年级」的内容包（如 math-g1），自带单元树与知识点树 */
export interface Course {
  /** 课程 id，形如 `math-g1`（学科-年级） */
  id: string
  subjectId: string
  gradeId: string
  units: Unit[]
  knowledgePoints: KnowledgePoint[]
}

/** 目录里的年级条目（挂在学科下） */
export interface GradeMeta {
  id: string
  title: LStr
  status: ContentStatus
  /** live 时指向对应课程包 */
  courseId?: string
}

/** 目录里的学科条目 */
export interface SubjectMeta {
  id: string
  title: LStr
  icon: string
  /** 主题皮肤名（对应 styles/themes.css 的 [data-theme]） */
  theme: string
  status: ContentStatus
  grades: GradeMeta[]
}
