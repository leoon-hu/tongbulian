// 每个知识点对应的国家中小学智慧教育平台课程视频 → src/content/videos.ts（地图上「▶ 视频」链接用，需求 F2）。
// 平台的公开数据：同步课的教材清单 → 每本教材的章节树（trees/<教材 id>.json）+ 资源清单（resources/part_*.json，
// 每条的 chapter_paths 指向它所在的章节，resource_type_code 分同步课 national_lesson、精品课 elite_lesson、古诗吟唱、
// 知识点微课）。知识点 → 章节：语文按单元里的课题自动对（语文园地也一样），数学按下面手写的 MATH 表（课本的小节名，
// 平台的章节名大多就是它）；章节里有几个课时取第 1 课时。
// 新教材这一节平台上还没有同步课的，找替代视频、单独记在 VIDEO_FALLBACKS（标记，地图上另画）：先找新教材这一节的
// 精品课，再找旧教材（语文：同名的课；语文园地取课文最像的那个单元的园地；数学：OLD_MATH 手写的那一节）的同步课、精品课。平台补上新教材的同步课后
// 重跑一遍就自动换回来。
// 链接：同步课 https://basic.smartedu.cn/syncClassroom/classActivity?activityId=<课时 id>，精品课
// https://basic.smartedu.cn/qualityCourse?courseId=<课程 id>（都只带 id 页面就能打开）。
// 用法：npm run videos（要联网）。连替代视频都找不到的知识点会列出来、不写链接；平台改版了重跑一遍。
import { writeFileSync } from 'node:fs'
import { createServer, createServerModuleRunner } from 'vite'

const BASE = 'https://s-file-1.ykt.cbern.com.cn/zxx'
/** 课程 id → [上册, 下册] 的同步课教材 id（平台标题「新教材-小学数学人教版一年级上册」这种，六三学制） */
const BOOKS = {
  'math-g1': ['ba9d9c0b-2c1c-4bba-84d7-369fb405bb13', 'b4dae36a-0d48-4149-820e-f532dad7607b'],
  'math-g2': ['f547036d-8c1a-4dca-b8ef-b148a180bac8', '397e9ca4-1930-4f30-8698-8244f870d9eb'],
  'math-g3': ['a6de91b7-4b52-475e-aa05-a508af43f4c2', '89ad4d7b-facf-4b17-93d6-00b1e32362db'],
  // 新教材四上的标题是「新教材-人教版小学数学四年级上册目录」；平台上的四下电子课本还是旧版，课本照它做，同步课就是
  // 旧版四下的那一本（「小学数学人教版四年级下册」，同 OLD_MATH_G4S2），见 OLD_VOLUMES
  'math-g4': ['ce032a22-7d96-4c36-b19c-f5cb8548a10e', 'a0bd25a0-6a56-4235-8225-eab16c04e217'],
  'chinese-g1': ['b7062df1-f929-458e-964c-d778f89ca255', '2d22a5c9-80b8-46cb-8595-564f5c368f3e'],
  'chinese-g2': ['4bf136c9-43cc-4005-8c8b-b21d21bad96f', 'ac9ba3ad-c2ab-4736-b347-dabae34c6b80'],
  'chinese-g3': ['22707f9a-a593-44a7-89ee-3f4d78905f2e', '6042ef62-a820-41aa-858d-1d6f1d6e3aa7'],
}
/** 平台上还是旧版课本、照旧版做的册（课程 id:册）：BOOKS 里给的就是旧版的同步课，注释里不写「新教材」 */
const OLD_VOLUMES = new Set(['math-g4:2'])
/**
 * 找替代视频用的旧教材（2022 版课标修订前的统编版，平台标签「旧教材」、标题不带「新教材-」）：[上册, 下册]。
 * 数学的小节名新旧对不上，没有
 */
const OLD_BOOKS = {
  'chinese-g1': ['5ce96672-f52f-4c2f-9c3d-016ed1415278', '2fbcdb5d-0682-4cca-b979-076d0119e3d3'],
  'chinese-g2': ['2aa68399-4700-4030-8973-457cf32384dc', 'f863fdd1-e34d-4aa6-8c6d-7dab5afa66b9'],
  'chinese-g3': ['0eb31453-f373-4c85-8f3c-2bff5f49552e', 'ecc10b88-9661-451f-b9c1-b6dd5fd9a72d'],
}
/**
 * 数学找替代视频用的旧教材（2022 版课标修订前的人教版，标题「小学数学人教版四年级上册」这种）：新旧教材的小节名对不上，
 * 所以按知识点手写「旧教材里讲同一件事的那一节」：知识点 → [旧教材的同步课教材 id, 章节名]
 */
const OLD_MATH_G3S2 = '6bb0e5b1-fffa-4600-801d-e812e22a5c83' // 小学数学人教版三年级下册（旧）
const OLD_MATH_G4S1 = '208f77e0-0d63-4ca2-8a4c-86af05dd72de' // 小学数学人教版四年级上册（旧）
const OLD_MATH_G4S2 = 'a0bd25a0-6a56-4235-8225-eab16c04e217' // 小学数学人教版四年级下册（旧）
const OLD_MATH = {
  'm4s1-02-yi': [OLD_MATH_G4S1, '1亿有多大'],
  'm4s1-03-angles': [OLD_MATH_G4S1, '角的分类'],
  'm4s1-03-measure': [OLD_MATH_G4S1, '角的度量'],
  'm4s1-03-draw': [OLD_MATH_G4S1, '画角'],
  'm4s1-04-oral': [OLD_MATH_G3S2, '口算乘法'], // 旧教材的两位数乘两位数在三下
  'm4s1-04-written': [OLD_MATH_G4S1, '三位数乘两位数笔算'],
  'm4s1-04-pattern': [OLD_MATH_G4S1, '积的变化规律'],
  'm4s1-05-total-part': [OLD_MATH_G4S2, '加、减法的意义和各部分间的关系'], // 和 = 加数 + 加数，加数 = 和 − 另一个加数
  'm4s1-05-price': [OLD_MATH_G4S1, '单价、数量和总价'],
  'm4s1-05-speed': [OLD_MATH_G4S1, '速度、时间和路程'],
  'm4s1-06-parallel': [OLD_MATH_G4S1, '平行与垂直'],
  'm4s1-06-distance': [OLD_MATH_G4S1, '画垂线和点到直线的距离'],
  'm4s1-06-parallelogram': [OLD_MATH_G4S1, '平行四边形的认识'],
  'm4s1-06-trapezoid': [OLD_MATH_G4S1, '梯形的认识'],
  'm4s1-07-single': [OLD_MATH_G4S1, '条形统计图'],
  'm4s1-07-double': [OLD_MATH_G4S2, '复式条形统计图'],
  'm4s1-08-treasure': [OLD_MATH_G3S2, '知道东北、东南、西北、西南四个方向'], // 旧教材的八个方向在三下「位置与方向（一）」
}
const NATIONAL = 'national_lesson'
const ELITE = 'elite_lesson'

/** 数学：知识点 → 平台的章节名（比较时去掉空格、编号，～ 与 ~ 不分；一个知识点含几个小节的取第一个） */
const MATH = {
  // 一年级上册
  's1-00-count': '在校园里找一找',
  's1-00-compare': '在操场上玩一玩',
  's1-00-position': '在教室里玩一玩',
  's1-01-num-5': '1～5的认识',
  's1-01-ordinal': '第几',
  's1-01-compose-5': '分与合',
  's1-01-addsub-5': '1～5的加、减法（加法）',
  's1-02-num-10': '6～9的认识',
  's1-02-compose-10': '6、7的组成',
  's1-02-addsub-10': '6和7的加、减法',
  's1-02-mixed': '连加、连减加、减混合',
  's1-03-solid-shapes': '认识立体图形',
  's1-04-num-20': '11～20的认识',
  's1-04-simple-addsub': '简单加、减法',
  's1-05-carry-add': '9加几',
  's1-05-add-876': '8、7、6加几',
  's1-05-add-5432': '5、4、3、2加几',
  // 一年级下册
  's2-01-flat-shapes': '认识平面图形',
  's2-02-borrow-sub': '十几减9',
  's2-02-sub-876': '十几减8、7、6',
  's2-02-sub-5432': '十几减5、4、3、2',
  's2-03-num-100': '数数、数的组成-不超过100的数数、数的组成',
  's2-03-compare-100': '数的顺序',
  's2-03-tens-addsub': '100以内简单的加、减法（整十数加减整十数、整十数加一位数和相应的减法）',
  's2-04-oral-add': '口算加法-两位数加一位数和整十数（不进位）',
  's2-04-oral-sub': '口算减法-两位数减一位数和整十数（不退位）',
  's2-05-written-add': '笔算加法',
  's2-05-written-sub': '笔算减法',
  's2-06-diff': '解决求两数相差几的实际问题',
  's2-06-more-less': '求比一个数多（或少）几的数是多少',
  's2-07-money': '认识人民币-认一认、换一换',
  // 二年级上册
  'm2s1-01-sorting': '按给定标准分类',
  'm2s1-02-mult-intro': '乘法的初步认识例1',
  'm2s1-02-table-6': '5的乘法口诀',
  'm2s1-02-mult-addsub': '乘加、乘减',
  'm2s1-02-mult-solve': '选择一种运算解决问题',
  'm2s1-03-share': '平均分——包含',
  'm2s1-03-div-parts': '除法（包含）及算式读法',
  'm2s1-03-div-6': '用2～6的乘法口诀求商（1）',
  'm2s1-03-div-solve': '除法的基本应用',
  'm2s1-04-directions': '认识东、南、西、北',
  'm2s1-04-tour': '设计导游路线',
  'm2s1-05-cm-m': '认识米及用米量',
  'm2s1-05-measure': '认识厘米及用厘米量',
  'm2s1-05-segment': '认识线段',
  'm2s1-06-table-9': '7的乘法口诀',
  'm2s1-06-div-9': '用7、8的乘法口诀求商',
  'm2s1-06-two-questions': '解决连续两问的问题',
  // 二年级下册
  'm2s2-01-clock-hour': '认识时间',
  'm2s2-01-time-read': '认识时间',
  'm2s2-01-time-calc': '认识时间',
  'm2s2-01-time-story': '我与时间的故事',
  'm2s2-02-remainder': '有余数的除法及余数的含义',
  'm2s2-02-rem-calc': '除法竖式及各部分名称',
  'm2s2-02-rem-solve': '用进一法或去尾法解决问题',
  'm2s2-03-times': '数量间的乘除关系、倍的认识',
  'm2s2-03-mul-div-solve': '连续两问的实际问题',
  'm2s2-04-num-1000': '认识几百几十几的数',
  'm2s2-04-num-10000': '认识几千几百几十几的数',
  'm2s2-04-compare': '万以内数的大小比较',
  'm2s2-04-round-addsub': '万以内的简单加、减法',
  'm2s2-05-add': '万以内的加法（一次进位）',
  'm2s2-05-sub': '万以内的减法（一次退位、连续退位）',
  'm2s2-05-relations': '加、减法的意义及加法各部分间的关系',
  // 三年级上册
  'm3s1-01-views': '观察简单的立体积木',
  'm3s1-01-guess': '根据直观图猜测积木形状',
  'm3s1-01-unfold': '长方体纸盒的展开',
  'm3s1-02-in-order': '同级运算',
  'm3s1-02-mul-first': '两级运算',
  'm3s1-02-parens': '含有小括号的两级运算',
  'm3s1-02-steps': '解决问题(两级计算)',
  'm3s1-03-mm-dm': '毫米的认识',
  'm3s1-03-km': '干米的认识及单位换算', // 平台章节名把「千」打成了「干」
  'm3s1-03-choose-unit': '问题解决（估测距离）',
  'm3s1-03-convert': '分米的认识及单位换算',
  'm3s1-04-mass-units': '认识质量单位',
  'm3s1-04-weighing': '称重我很行',
  'm3s1-05-oral-mul': '口算乘法',
  'm3s1-05-written-mul': '笔算乘法(不进位)',
  'm3s1-05-zero-mul': '笔算乘法(0的乘法)',
  'm3s1-05-estimate': '乘法估算',
  'm3s1-06-digit-code': '认识数字编码',
  'm3s1-07-lines': '线段、射线、直线的概念',
  'm3s1-07-angles': '角的认识',
  'm3s1-07-angle-kinds': '直角、锐角、钝角',
  'm3s1-08-unit-frac': '认识几分之一',
  'm3s1-08-frac': '认识几分之几',
  'm3s1-08-frac-calc': '同分母分数的加减法',
  'm3s1-08-frac-of-set': '进一步认识分数',
  // 三年级下册
  'm3s2-01-symmetry': '对称',
  'm3s2-01-translate': '平移',
  'm3s2-01-rotate': '旋转',
  'm3s2-02-oral': '口算除法',
  'm3s2-02-written': '一位数除两位数',
  'm3s2-02-zeros': '商中间有0的除法',
  'm3s2-02-solve': '解决问题（连乘）',
  'm3s2-03-polygons': '多边形的认识',
  'm3s2-03-perimeter': '认识周长',
  'm3s2-03-puzzle': '拼图游戏',
  'm3s2-04-area-units': '面积的概念',
  'm3s2-04-rect-area': '长方形和正方形的面积计算',
  'm3s2-04-area-convert': '面积单位间的进率',
  'm3s2-05-record': '收集并记录数据',
  'm3s2-05-table': '复式统计表',
  'm3s2-05-segments': '分段整理数据',
  'm3s2-06-calendar': '年历中的秘密',
  'm3s2-06-24h': '作息时间表中的秘密',
  'm3s2-07-know': '认识小数',
  'm3s2-07-compare': '小数的大小比较',
  'm3s2-07-addsub': '简单的小数加、减法',
  // 四年级上册（平台上新教材的同步课正在陆续上：2026-10-05 只有第一单元）
  'm4s1-01-within-yi': '亿以内数的认识-读数',
  'm4s1-01-above-yi': '十进制计数法',
  'm4s1-01-compare': '数的大小比较',
  'm4s1-01-round': '数的改写和求近似数',
  'm4s1-02-yi': '1亿张纸有多高',
  'm4s1-03-angles': '角的再认识',
  'm4s1-03-measure': '角的度量',
  'm4s1-03-draw': '画角',
  'm4s1-04-oral': '两位数（或几百几十）乘一位数的口算乘法',
  'm4s1-04-written': '多位数乘两位数（不进位）',
  'm4s1-04-pattern': '积的变化规律',
  'm4s1-04-estimate': '用乘法估算解决问题',
  'm4s1-05-total-part': '总量与分量的关系',
  'm4s1-05-price': '单价、数量和总价的关系',
  'm4s1-05-speed': '时间、速度、路程的关系',
  'm4s1-06-parallel': '平行和垂直',
  'm4s1-06-distance': '画垂线和点到直线的距离',
  'm4s1-06-parallelogram': '认识平行四边形',
  'm4s1-06-trapezoid': '认识梯形',
  'm4s1-07-single': '以一当一',
  'm4s1-07-double': '复式条形统计图',
  'm4s1-08-treasure': '校园寻宝',
  // 四年级下册（旧版课本，章节名就是旧版四下同步课的；同名的「解决问题」写成「单元>章节」）
  'm4s2-01-addsub': '加、减法的意义和各部分间的关系',
  'm4s2-01-muldiv': '乘、除法的意义和各部分间的关系',
  'm4s2-01-brackets': '括号',
  'm4s2-01-solve': '四则运算>解决问题', // 租船（平台上「四则运算」下的「解决问题」）
  'm4s2-02-positions': '观察物体（二）',
  'm4s2-02-objects': '观察物体（二）', // 两个知识点共用这一节课
  'm4s2-03-add-laws': '加法运算律',
  'm4s2-03-add-apply': '加法运算律的应用',
  'm4s2-03-mul-laws': '乘法运算律',
  'm4s2-03-distrib': '乘法运算律', // 交换律、结合律、分配律在同一节课里
  'm4s2-03-mul-apply': '乘法运算律的应用', // 平台上这一章节挂的课叫「运算律整理和复习」
  'm4s2-04-meaning': '小数的意义',
  'm4s2-04-read-write': '小数的读法和写法',
  'm4s2-04-property': '小数的性质',
  'm4s2-04-compare': '小数的大小比较',
  'm4s2-04-shift': '小数点移动引起小数大小的变化',
  'm4s2-04-units': '小数与单位换算',
  'm4s2-04-round': '小数的近似数',
  'm4s2-05-traits': '三角形的特性',
  'm4s2-05-sides': '三角形的三边关系',
  'm4s2-05-kinds': '三角形的分类',
  'm4s2-05-angle-sum': '三角形的内角和',
  'm4s2-05-polygon': '三角形>解决问题', // 平台上「三角形」下的「解决问题」，课叫「四边形的内角和」
  'm4s2-06-addsub': '小数加减法',
  'm4s2-06-mixed': '小数加减混合运算',
  'm4s2-06-laws': '整数加法运算律推广到小数',
  'm4s2-07-symmetry': '轴对称',
  'm4s2-07-translate': '平移',
  'm4s2-08-average': '平均数',
  'm4s2-08-double': '复式条形统计图',
  'm4s2-09-lunch': '营养午餐',
  'm4s2-10-chicken': '数学广角——鸡兔同笼',
}

const CN_NUM = '一二三四五六七八九十'
/**
 * 章节名比较用：去空格、去开头的编号（「1 天地人」「一、认识平面图形」「10 古诗二首」「3* 不懂就要问」）、去引号（“贝”与「贝」）、
 * 去结尾的「（节选）」，～ 与 ~ 不分，ɑ 当 a
 */
const norm = (s) =>
  s
    .replace(/\s+/g, '')
    .replace(/^[0-9]+\*?/, '')
    .replace(/^[一二三四五六七八九十]+[、．.]?/, '')
    .replace(/～/g, '~')
    .replace(/ɑ/g, 'a')
    .replace(/[“”"「」]/g, '')
    .replace(/（节选）$/, '')
/** 比较单元内容用：再去掉旧教材的栏目前缀（「习作：我做了一项小实验」，新教材是「习作」下面一层「我做了一项小实验」） */
const bare = (s) =>
  norm(s)
    .replace(/^(习作|口语交际|快乐读书吧|综合性学习|写话)[:：]/, '')
    .replace(/[:：]$/, '')
/** 栏目名，不算单元内容 */
const STRUCTURE = /^(阅读|课文|识字|习作|习作例文|例文|口语交际|快乐读书吧|写话|专题学习活动|综合性学习|语文园地.*)$|初试身手|交流平台|梳理与交流/
const isGarden = (n) => norm(n.title).startsWith('语文园地')
/** 视频的标题去掉书名号与结尾的「（第一课时）」 */
const lessonName = (s) =>
  norm(s)
    .replace(/[《》]/g, '')
    .replace(/（第[0-9一二三四五六七八九十]+课时）$/, '')

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) return await r.json()
    } catch {
      /* 重试 */
    }
  }
  throw new Error('取不到：' + url)
}

/** 一本教材：章节树（每个节点按先序排好、带上父链）+ 章节里某类视频的第 1 个 */
async function loadBook(tm) {
  const tree = await getJson(`${BASE}/ndrv2/national_lesson/trees/${tm}.json`)
  const resources = []
  for (const part of await getJson(`${BASE}/ndrs/national_lesson/teachingmaterials/${tm}/resources/parts.json`)) resources.push(...(await getJson(part)))
  // 只要同步课的课时与精品课，不要古诗吟唱、知识点微课
  const byChapter = new Map()
  for (const r of resources) {
    if ((r.resource_type_code !== NATIONAL && r.resource_type_code !== ELITE) || r.status !== 'ONLINE') continue
    // 标题取课时里视频自己的（片头上写的就是它；课时的标题偶尔是挂的章节名，二下「语文园地一」里其实是口语交际）
    const parts = r.relations?.national_course_resource ?? []
    const title = (parts.find((x) => /video/.test(x.resource_type_code)) ?? parts[0])?.global_title?.['zh-CN'] ?? r.title
    const n = /第([0-9一二三四五六七八九十]+)课时/.exec(title)?.[1] ?? '1'
    const video = { id: r.id, type: r.resource_type_code, name: lessonName(title), hour: /\d/.test(n) ? Number(n) : CN_NUM.indexOf(n) + 1, time: String(r.create_time ?? '') }
    for (const p of r.chapter_paths ?? []) {
      const id = p.split('/').at(-1)
      const list = byChapter.get(id) ?? []
      list.push(video)
      byChapter.set(id, list)
    }
  }
  const nodes = []
  const walk = (list, parents) => {
    for (const n of list ?? []) {
      nodes.push({ id: n.id, title: n.title, parents })
      walk(n.child_nodes, [...parents, n])
    }
  }
  walk(tree, [])
  /**
   * 章节（含它下面的子章节）里某类视频（同步课 / 精品课）的第 1 个：按第几课时，再按上线时间。语文园地只要视频标题里有
   * 「园地」的——园地上还挂着口语交际、复习课、课外阅读这类课时（三上旧教材第八单元的园地上只有「第5—8单元复习活动课」）
   */
  const first = (node, type) => {
    const garden = isGarden(node)
    const ids = [node.id, ...nodes.filter((x) => x.parents.some((p) => p.id === node.id)).map((x) => x.id)]
    const all = ids.flatMap((id) => byChapter.get(id) ?? []).filter((v) => v.type === type && (!garden || v.name.includes('园地')))
    all.sort((a, b) => a.hour - b.hour || a.time.localeCompare(b.time))
    return all[0]?.id
  }
  return { tree, nodes, first }
}

/** 章节在平台上的位置（「第六单元 · 阅读 · 18 童年的水墨画」），写进注释 */
const pathOf = (node) => [...node.parents, node].map((n) => n.title.replace(/\s+/g, ' ').trim()).join(' · ')

/**
 * 数学：章节名对得上的节点，深的在前（四上新教材「二 角的度量」单元下面还有一节「角的度量」，先看下面那一节）；
 * 开头的 ★（旧教材的「★ 1亿有多大」）不算；「单元>章节」只找这个单元下面的（旧版四下有三个叫「解决问题」的章节）
 */
const mathKey = (title) => norm(title.replace(/^\s*★\s*/, ''))
function mathNodes(book, want) {
  if (!want) return []
  const [parent, title] = want.includes('>') ? want.split('>') : [undefined, want]
  return book.nodes
    .filter((n) => mathKey(n.title) === mathKey(title) && (!parent || n.parents.some((p) => mathKey(p.title) === mathKey(parent))))
    .sort((a, b) => b.parents.length - a.parents.length)
}
/** 其中第一个有同步课的（旧教材四上「7 条形统计图」的课挂在单元上，总复习里同名的那一节只有精品课）；都没有就是最深的那个 */
function mathNode(book, want) {
  const list = mathNodes(book, want)
  return list.find((n) => book.first(n, NATIONAL)) ?? list[0]
}

/**
 * 语文：第 n 单元（课本的单元序号）里课题 / 语文园地对得上的章节。三年级起课题在单元下面多一层「阅读」，所以在整个单元里找；
 * 三年级的园地平台上只叫「语文园地」，不带序号
 */
function chineseNode(book, unitOrder, title) {
  const unit = book.tree.find((n) => n.title.replace(/\s+/g, '').startsWith(`第${CN_NUM[unitOrder - 1]}单元`))
  if (!unit) return undefined
  const inUnit = book.nodes.filter((n) => n.parents.some((p) => p.id === unit.id))
  const want = norm(title)
  return inUnit.find((n) => norm(n.title) === want) ?? (want.startsWith('语文园地') ? inUnit.find((n) => norm(n.title) === '语文园地') : undefined)
}

/**
 * 语文园地 → 它那个单元里的章节（课题、口语交际 / 习作的题目，按 bare 比较）。新教材是整个单元；旧教材二年级下册
 * 没有单元这一层，按先后归到后面那个园地（一组里最后一个园地之后的也归它）
 */
function gardenSegments(book) {
  const segs = new Map()
  for (const top of book.tree) {
    let pending = []
    let last
    for (const n of book.nodes) {
      if (n.parents[0]?.id !== top.id || n.parents.some(isGarden)) continue
      if (isGarden(n)) {
        segs.set(n.id, pending)
        last = n
        pending = []
      } else pending.push(n)
    }
    if (last) segs.get(last.id).push(...pending)
  }
  return segs
}

/** 标题（bare 之后）在这几本书里一共出现几次：只出现一次的才拿来比单元内容（「古诗三首」「习作」这种不算） */
function titleCounts(books) {
  const count = new Map()
  for (const b of books) for (const n of b.nodes) count.set(bare(n.title), (count.get(bare(n.title)) ?? 0) + 1)
  return count
}

/**
 * 旧教材（两册）里的替代章节：课文找同名的课（两册里只有一个才算，三下「灰雀」旧教材在三上）；语文园地找单元内容和
 * 新教材这个园地的单元重合最多的园地——至少两项、而且比第二名多（单元有挪动：「小虾」新教材在三下第三单元、旧教材在
 * 第四单元，平台上的园地又不带序号）。same 是重合的课题，写进注释
 */
function oldNode(newBooks, newNode, oldBooks, title) {
  const want = norm(title)
  if (!want.startsWith('语文园地')) {
    const hits = oldBooks.flatMap((b, i) => b.nodes.filter((n) => !isGarden(n) && norm(n.title) === want).map((node) => ({ book: i, node })))
    return hits.length === 1 ? hits[0] : undefined
  }
  if (!newNode) return undefined
  const newCount = titleCounts(newBooks)
  const oldCount = titleCounts(oldBooks)
  const mine = (newBooks.map(gardenSegments).find((s) => s.has(newNode.id))?.get(newNode.id) ?? []).filter((n) => {
    const t = bare(n.title)
    return !STRUCTURE.test(t) && newCount.get(t) === 1 && oldCount.get(t) === 1
  })
  const shown = (n) => n.title.replace(/\s+/g, '').replace(/^[0-9]+\*?/, '')
  const ranked = oldBooks
    .flatMap((b, i) =>
      [...gardenSegments(b)].map(([id, list]) => {
        const keys = new Set(list.map((n) => bare(n.title)))
        return { book: i, node: b.nodes.find((n) => n.id === id), same: mine.filter((n) => keys.has(bare(n.title))).map(shown) }
      }),
    )
    .sort((a, b) => b.same.length - a.same.length)
  const [best, second] = ranked
  return best && best.same.length >= 2 && best.same.length > (second?.same.length ?? 0) ? best : undefined
}

const SEM = ['上册', '下册']
const oldCache = new Map()

/** 新教材这一节没有同步课时的替代视频：新教材这一节的精品课 → 旧教材对应那一课的同步课 → 旧教材的精品课 */
async function fallbackOf(course, books, unit, node, kp) {
  const grade = `${CN_NUM[Number(course.gradeId.slice(1)) - 1]}年级`
  const elite = node && books[unit.semester - 1].first(node, ELITE)
  const edition = OLD_VOLUMES.has(`${course.id}:${unit.semester}`) ? '' : '新教材'
  if (elite) return { id: elite, from: 'elite', note: `${edition}${grade}${SEM[unit.semester - 1]} · ${pathOf(node)}（精品课）` }
  const math = OLD_MATH[kp.id]
  if (math) {
    const [tm, chapter] = math
    if (!oldCache.has(tm)) oldCache.set(tm, loadBook(tm))
    const old = await oldCache.get(tm)
    const hits = mathNodes(old, chapter)
    for (const type of [NATIONAL, ELITE]) {
      for (const hit of hits) {
        const id = old.first(hit, type)
        if (id) return { id, from: type === NATIONAL ? 'old' : 'old-elite', note: `旧教材 · ${pathOf(hit)}${type === ELITE ? '（精品课）' : ''}` }
      }
    }
    return undefined
  }
  const ids = OLD_BOOKS[course.id]
  if (!ids) return undefined
  if (!oldCache.has(course.id)) oldCache.set(course.id, Promise.all(ids.map(loadBook)))
  const old = await oldCache.get(course.id)
  const hit = oldNode(books, node, old, kp.title)
  if (!hit) return undefined
  const where = `旧教材${grade}${SEM[hit.book]} · ${pathOf(hit.node)}`
  const why = hit.same ? `（单元里相同的：${hit.same.join('、')}）` : ''
  const lesson = old[hit.book].first(hit.node, NATIONAL)
  if (lesson) return { id: lesson, from: 'old', note: where + why }
  const oldElite = old[hit.book].first(hit.node, ELITE)
  if (oldElite) return { id: oldElite, from: 'old-elite', note: `${where}（精品课）${why}` }
  return undefined
}

const server = await createServer({ configFile: 'vite.config.ts', logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
const out = []
const fallbacks = []
const missing = []
try {
  const runner = createServerModuleRunner(server.environments.ssr)
  const { allCourses } = await runner.import('/src/engine/catalog.ts')
  for (const course of allCourses()) {
    const ids = BOOKS[course.id]
    if (!ids) continue
    const books = await Promise.all(ids.map(loadBook))
    for (const kp of course.knowledgePoints) {
      const unit = course.units.find((u) => u.id === kp.unitId)
      const book = books[unit.semester - 1]
      let node
      if (course.subjectId === 'math') {
        node = mathNode(book, MATH[kp.id])
      } else {
        node = chineseNode(book, unit.order, kp.title)
      }
      const lesson = node && book.first(node, NATIONAL)
      if (lesson) {
        out.push(`  '${kp.id}': '${lesson}', // ${node.title.replace(/\s+/g, ' ').trim()}`)
        continue
      }
      const alt = await fallbackOf(course, books, unit, node, kp)
      if (alt) fallbacks.push(`  '${kp.id}': { id: '${alt.id}', from: '${alt.from}' }, // ${alt.note}`)
      else missing.push(`${kp.id} ${kp.title}${node ? '（章节对上了，但新旧教材都没有视频）' : ''}`)
    }
  }
} finally {
  await server.close()
}

writeFileSync(
  'src/content/videos.ts',
  `// 知识点 → 国家中小学智慧教育平台上的课程视频（地图上「▶ 视频」链接，需求 F2）。scripts/videos.mjs 生成的，别手改。
// 两张表里都没有的知识点（平台上新旧教材都没有这一节的视频）地图上不显示链接。

/** 新教材这一节的同步课：知识点 → 课时 id（注释是平台上的章节名） */
export const VIDEO_LESSONS: Readonly<Record<string, string>> = {
${out.join('\n')}
}

/** 替代视频从哪来：elite 新教材这一节的精品课，old 旧教材对应那一课的同步课，old-elite 旧教材的精品课 */
export type VideoFallbackFrom = 'elite' | 'old' | 'old-elite'

/**
 * 替代视频（标记）：新教材这一节平台上还没有同步课，先用这些（地图上画虚线框，旧教材的写「旧版」）。平台补上新教材的
 * 同步课后重跑 npm run videos 自动换回同步课；要统一撤掉就清空这张表。注释是视频在平台上的位置，语文园地带上判断依据
 * （旧教材那个单元里和新教材相同的课题）
 */
export const VIDEO_FALLBACKS: Readonly<Record<string, { id: string; from: VideoFallbackFrom }>> = {
${fallbacks.join('\n')}
}

const SYNC_URL = 'https://basic.smartedu.cn/syncClassroom/classActivity?activityId='
const ELITE_URL = 'https://basic.smartedu.cn/qualityCourse?courseId='

/** 这个知识点的视频：地址 + 来源（sync 是新教材的同步课，其余是替代视频）；没有就是 undefined */
export function videoOf(kpId: string): { url: string; from: 'sync' | VideoFallbackFrom } | undefined {
  const lesson = VIDEO_LESSONS[kpId]
  if (lesson) return { url: SYNC_URL + lesson, from: 'sync' }
  const alt = VIDEO_FALLBACKS[kpId]
  if (!alt) return undefined
  return { url: (alt.from === 'old' ? SYNC_URL : ELITE_URL) + alt.id, from: alt.from }
}
`,
)
console.log(`同步课视频：${out.length} 个知识点；替代视频 ${fallbacks.length} 个（VIDEO_FALLBACKS）→ src/content/videos.ts`)
if (fallbacks.length) console.log(`  ${fallbacks.map((l) => l.trim()).join('\n  ')}`)
if (missing.length) console.log(`没有视频的 ${missing.length} 个：\n  ${missing.join('\n  ')}`)
