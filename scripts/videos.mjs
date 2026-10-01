// 每个知识点对应的国家中小学智慧教育平台同步课视频 → src/content/videos.ts（地图上「▶ 视频」链接用，需求 F2）。
// 平台的公开数据：同步课的教材清单 → 每本教材的章节树（trees/<教材 id>.json）+ 课时清单（resources/part_*.json，
// 每个课时的 chapter_paths 指向它所在的章节）。知识点 → 章节：语文按单元里的课题自动对（语文园地也一样），数学按下面
// 手写的 MATH 表（课本的小节名，平台的章节名大多就是它）；章节里有几个课时取第 1 课时。
// 链接是 https://basic.smartedu.cn/syncClassroom/classActivity?activityId=<课时 id>（只带 activityId 页面就能打开）。
// 用法：npm run videos（要联网）。对不上的知识点会列出来、不写链接；平台改版了重跑一遍。
import { writeFileSync } from 'node:fs'
import { createServer, createServerModuleRunner } from 'vite'

const BASE = 'https://s-file-1.ykt.cbern.com.cn/zxx'
/** 课程 id → [上册, 下册] 的同步课教材 id（平台标题「新教材-小学数学人教版一年级上册」这种，六三学制） */
const BOOKS = {
  'math-g1': ['ba9d9c0b-2c1c-4bba-84d7-369fb405bb13', 'b4dae36a-0d48-4149-820e-f532dad7607b'],
  'math-g2': ['f547036d-8c1a-4dca-b8ef-b148a180bac8', '397e9ca4-1930-4f30-8698-8244f870d9eb'],
  'math-g3': ['a6de91b7-4b52-475e-aa05-a508af43f4c2', '89ad4d7b-facf-4b17-93d6-00b1e32362db'],
  'chinese-g1': ['b7062df1-f929-458e-964c-d778f89ca255', '2d22a5c9-80b8-46cb-8595-564f5c368f3e'],
  'chinese-g2': ['4bf136c9-43cc-4005-8c8b-b21d21bad96f', 'ac9ba3ad-c2ab-4736-b347-dabae34c6b80'],
}

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
  'm3s1-04-weighing': '称重大挑战',
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
  'm3s2-02-estimate': '口算除法（估算）',
  'm3s2-02-written': '一位数除两位数',
  'm3s2-02-zeros': '商中间有0的除法',
  'm3s2-02-solve': '解决问题（连乘）',
  'm3s2-03-polygons': '多边形的认识',
  'm3s2-03-rect-features': '长方形和正方形的认识',
  'm3s2-03-perimeter': '认识周长',
  'm3s2-03-rect-perimeter': '长方形和正方形的周长',
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
}

const CN_NUM = '一二三四五六七八九十'
/** 章节名比较用：去空格、去开头的编号（「1 天地人」「一、认识平面图形」「10 古诗二首」）、去引号（“贝”与「贝」），～ 与 ~ 不分，ɑ 当 a */
const norm = (s) =>
  s
    .replace(/\s+/g, '')
    .replace(/^[0-9]+/, '')
    .replace(/^[一二三四五六七八九十]+[、．.]?/, '')
    .replace(/～/g, '~')
    .replace(/ɑ/g, 'a')
    .replace(/[“”"「」]/g, '')

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

/** 一本教材：章节树（每个节点带上父链）+ 每个章节的第 1 课时 */
async function loadBook(tm) {
  const tree = await getJson(`${BASE}/ndrv2/national_lesson/trees/${tm}.json`)
  const lessons = []
  for (const part of await getJson(`${BASE}/ndrs/national_lesson/teachingmaterials/${tm}/resources/parts.json`)) lessons.push(...(await getJson(part)))
  // 只要同步课的课时（standard 同步课），不要古诗吟唱、知识点微课
  const byChapter = new Map()
  for (const l of lessons) {
    if (l.resource_type_code !== 'national_lesson' || l.status !== 'ONLINE') continue
    const title = l.relations?.national_course_resource?.[0]?.global_title?.['zh-CN'] ?? l.title
    const hour = Number(/第(\d+)课时/.exec(title)?.[1] ?? 1)
    for (const p of l.chapter_paths ?? []) {
      const id = p.split('/').at(-1)
      const list = byChapter.get(id) ?? []
      list.push({ id: l.id, hour, time: l.create_time })
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
  /** 章节（含它下面的子章节）里的第 1 课时 */
  const firstLesson = (node) => {
    const ids = [node.id, ...nodes.filter((x) => x.parents.some((p) => p.id === node.id)).map((x) => x.id)]
    const all = ids.flatMap((id) => byChapter.get(id) ?? [])
    all.sort((a, b) => a.hour - b.hour || a.time.localeCompare(b.time))
    return all[0]?.id
  }
  return { tree, nodes, firstLesson }
}

/** 语文：第 n 单元（课本的单元序号）里课题 / 语文园地对得上的章节 */
function chineseNode(book, unitOrder, title) {
  const unit = book.tree.find((n) => n.title.replace(/\s+/g, '').startsWith(`第${CN_NUM[unitOrder - 1]}单元`))
  if (!unit) return undefined
  return book.nodes.find((n) => n.parents.at(-1)?.id === unit.id && norm(n.title) === norm(title))
}

const server = await createServer({ configFile: 'vite.config.ts', logLevel: 'error', server: { middlewareMode: true, hmr: false, ws: false, watch: null } })
const out = []
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
        const want = MATH[kp.id]
        node = want && book.nodes.find((n) => norm(n.title) === norm(want))
      } else {
        node = chineseNode(book, unit.order, kp.title)
      }
      const lesson = node && book.firstLesson(node)
      if (lesson) out.push(`  '${kp.id}': '${lesson}', // ${node.title.replace(/\s+/g, ' ').trim()}`)
      else missing.push(`${kp.id} ${kp.title}${node ? '（章节对上了，但没有课时）' : ''}`)
    }
  }
} finally {
  await server.close()
}

writeFileSync(
  'src/content/videos.ts',
  `// 知识点 → 国家中小学智慧教育平台同步课的课时 id（地图上「▶ 视频」链接，需求 F2）。scripts/videos.mjs 生成的，别手改。
// 注释是平台上的章节名。没有的知识点（平台上这一节没有同步课）地图上不显示链接。
export const VIDEO_LESSONS: Readonly<Record<string, string>> = {
${out.join('\n')}
}

/** 这个知识点的同步课视频地址；没有就是 undefined */
export function videoUrlOf(kpId: string): string | undefined {
  const id = VIDEO_LESSONS[kpId]
  return id ? \`https://basic.smartedu.cn/syncClassroom/classActivity?activityId=\${id}\` : undefined
}
`,
)
console.log(`同步课视频：${out.length} 个知识点 → src/content/videos.ts`)
if (missing.length) console.log(`没对上的 ${missing.length} 个：\n  ${missing.join('\n  ')}`)
