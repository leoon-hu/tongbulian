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
  /** 尺子（厘米刻度 0…length）上方压着一条线段，从 from 到 to（量一量：读出长度） */
  | { kind: 'ruler'; length: number; from: number; to: number }
  /** 一个或一组角：deg 是角的度数，rot 是整体旋转（度），随机旋转免得孩子靠方向判断 */
  | { kind: 'angles'; items: { deg: number; rot: number }[] }
  /** 竖式（笔算加减法）：两个数右对齐、运算符在左、下面一条横线，答案留空 */
  | { kind: 'vertical'; a: number; op: '+' | '-'; b: number }

export type AnswerSpec =
  | { kind: 'number'; value: number }
  | { kind: 'choice'; choiceId: string }

/** 作答方式只有这两种（数字键盘 / 选项卡），题干再花哨答案也收敛到数值或选项 id */
export type InputMode = 'numpad' | 'choice'

export interface Choice {
  id: string
  label: LStr
}

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
