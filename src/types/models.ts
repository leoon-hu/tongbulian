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
 */
export type GeoItem =
  | { t: 'poly'; pts: GeoPt[]; open?: boolean; fill?: GeoTone; stroke?: GeoTone; dash?: boolean; labels?: (string | null)[]; right?: number[] }
  | { t: 'line'; a: GeoPt; b: GeoPt; dots?: [boolean, boolean]; stroke?: GeoTone; dash?: boolean; thin?: boolean }
  | { t: 'curve'; pts: GeoPt[]; closed?: boolean; fill?: GeoTone; stroke?: GeoTone; dots?: [boolean, boolean] }
  | { t: 'dot'; at: GeoPt; label?: string; side?: GeoSide }
  | { t: 'text'; at: GeoPt; text: string; tone?: GeoTone; big?: boolean; badge?: boolean; letter?: boolean }
  | { t: 'grid'; x: number; y: number; w: number; h: number; cells?: GeoPt[]; fill?: GeoTone; lines?: boolean }
  | { t: 'arc'; at: GeoPt; a: GeoPt; b: GeoPt; right?: boolean }
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
  /** 单个图形 */
  | { kind: 'shape'; shape: ShapeKind }
  /** 一堆图形（分类、数图形） */
  | { kind: 'shape-group'; shapes: ShapeKind[] }
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
