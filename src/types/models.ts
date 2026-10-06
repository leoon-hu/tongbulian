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
 */
export type GeoItem =
  | { t: 'poly'; pts: GeoPt[]; open?: boolean; fill?: GeoTone; stroke?: GeoTone; dash?: boolean; labels?: (string | null)[]; right?: number[] }
  | { t: 'line'; a: GeoPt; b: GeoPt; dots?: [boolean, boolean]; stroke?: GeoTone; dash?: boolean; thin?: boolean }
  | { t: 'curve'; pts: GeoPt[]; closed?: boolean; fill?: GeoTone; stroke?: GeoTone; dots?: [boolean, boolean] }
  | { t: 'dot'; at: GeoPt; label?: string; side?: GeoSide }
  | { t: 'text'; at: GeoPt; text: string; tone?: GeoTone; big?: boolean; badge?: boolean; letter?: boolean }
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

/** 结构化题干片段：文本 + 教具/图形参数，由 QuestionRenderer 分发渲染 */
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
   * frac = 不写小数、画一个上下两层的分数 [分子, 分母]（分母是 1000、10000 的分数在文字里画不成两层、也读不对，放在卡上）
   */
  | { kind: 'dec-card'; n?: string; marks?: number[]; frac?: [number, number] }
  /**
   * 米尺和数线（DecScale，四下「小数的意义」例 1 的米尺、练习九 7 / 练习十 6 的直线）：labels 是长刻度下面写的字（「0」「1」……「1 m」「0.1」），
   * 相邻两个长刻度之间平均分成 per 小格（per 是双数时正中间那一格画中长刻度）；extra = 最后一个长刻度后面再画几小格；
   * ruler = 画成浅蓝的尺身（刻度从上沿往下、字在刻度下面、红箭头从下面指上去），broken = 右端画成折断线（放大的一段）；
   * 否则画成向右带箭头的直线（红箭头从上面指下来）；arrow = 红箭头指着从左数第几小格（0 起，可以是 .5：指在两小格中间）
   */
  | { kind: 'dec-scale'; labels: string[]; per: number; extra?: number; ruler?: boolean; broken?: boolean; arrow?: number }
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
