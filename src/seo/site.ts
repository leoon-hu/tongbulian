/**
 * SEO 静态页与入口页文案（scripts/seo.mjs 在构建前调用，写进 public/ 与 index.html）。
 *
 * 应用是 hash 路由的单页：搜索引擎眼里整站只有一个地址（# 后面的路径不算）。所以给每个上线的「学科 × 年级」
 * 和每个知识点各生成一张不用 JS 的静态 HTML：单元 / 知识点目录、几道固定种子生成的示例题（题干、选项、答案
 * 都是文字），再链回应用里对应的练习。入口页 index.html 里 <!-- seo:head --> 与 <!-- seo:body --> 两段
 * （标题、描述、JSON-LD、应用挂载前的静态简介）也由这里生成，知识点数量随目录变，不手写。
 * 只做中文：静态页是给家长和搜索引擎看的，不注音、不朗读。绝对地址（canonical / og:url / sitemap）来自
 * 构建机的 SITE_URL，没有就不写。
 */
import type { Course, GradeMeta, KnowledgePoint, Question, StemPart, SubjectMeta, Unit } from '@/types/models'
import { createRng, getGenerator } from '@/engine'
import { SUBJECTS, kpsOfUnit, liveCourses as catalogCourses } from '@/engine/catalog'
import { translate } from '@/engine/i18n'
import { answerLabel } from '@/engine/answer'
import { AUTHOR_CONTACT, REPO_URL, SISTER_SITES } from '@/engine/sites'
import { type AnalyticsConfig, analyticsTag } from '@/engine/analytics'
import { SKINS } from '@/battle/skins'
import { HELP_LEAD, HELP_TITLE, helpGames, helpSections } from '@/help/content'

export const SITE_NAME = '同步练-对战版'
export const SITE_TAGLINE = '课本知识点对战学习'
/** 一句话定位（2026-09-21 用户定），入口页 / 静态页 / 分享图共用 */
export const SITE_PITCH = '把人教版课本的知识点测验变成游戏积分，谁先答对 8 题谁赢'
/** 每个知识点页上示例题的数量：三档难度各几道 */
export const SAMPLES_PER_TIER = 2

const zh = (l: Parameters<typeof translate>[0]): string => translate(l, 'zh')
const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── 目录 ──────────────────────────────────────────────────────────────

export interface LiveCourse {
  subject: SubjectMeta
  grade: GradeMeta
  course: Course
  /** 「一年级数学」 */
  name: string
}

/** 上线的课程，带中文名「一年级数学」 */
export function liveCourses(): LiveCourse[] {
  return catalogCourses().map((lc) => ({ ...lc, name: zh({ k: 'course.name', p: { grade: lc.grade.title, subject: lc.subject.title } }) }))
}

/** 有生成器（真能练）的知识点 */
function liveKps(course: Course): KnowledgePoint[] {
  return course.knowledgePoints.filter((kp) => getGenerator(kp.id) !== undefined)
}

const semName = (s: 1 | 2): string => zh({ k: `sem.${s}` })
/** 列表标题里的单元编号：「第 3 单元」；没编号的综合与实践 / 数学游戏是「☆」 */
const unitNo = (u: Unit): string => (u.numbered === false ? '☆' : `第 ${u.order} 单元`)
/** 行文里的单元：「第 3 单元《认识立体图形》」，没编号的只写书名号 */
const unitLabel = (u: Unit): string => `${u.numbered === false ? '' : `第 ${u.order} 单元`}《${u.title}》`

// ── 地址（页面都在 <学科>/<年级>/ 下，两层深，回应用根是 ../../）────────────

export const coursePath = (c: Course): string => `${c.subjectId}/${c.gradeId}/`
export const kpPath = (c: Course, kp: KnowledgePoint): string => `${c.subjectId}/${c.gradeId}/${kp.id}.html`
const ROOT = '../../'
/** 帮助页在 help/ 下，一层深 */
export const HELP_PATH = 'help/'
const HELP_ROOT = '../'
const appMap = (c: Course): string => `${ROOT}#/s/${c.subjectId}/g/${c.gradeId}`
const appPractice = (c: Course, kp: KnowledgePoint): string => `${appMap(c)}/practice/${kp.id}`
/** 对战设置页（选跟谁打）：知识点页的主按钮深链到这里 */
const appBattle = (kp: KnowledgePoint): string => `${ROOT}#/battle/new/${kp.id}`

// ── 示例题：固定种子，三档难度各取几道不重复的题 ─────────────────────────

export function sampleQuestions(kpId: string, perTier = SAMPLES_PER_TIER): Question[] {
  const gen = getGenerator(kpId)
  if (!gen) return []
  const out: Question[] = []
  const seen = new Set<string>()
  for (const d of [1, 2, 3] as const) {
    let got = 0
    for (let seed = 1; seed <= 60 && got < perTier; seed++) {
      const q = gen(d, createRng(seed * 7 + d))
      if (seen.has(q.id)) continue
      seen.add(q.id)
      out.push(q)
      got += 1
    }
  }
  return out
}

const icons = (icon: string, n: number): string => (n <= 20 ? icon.repeat(n) : `${icon} × ${n}`)

/** 题干片段的文字版：文字与算式照原样，教具说成一句话（示例题是给家长看的，能看懂题在问什么就行） */
export function stemText(part: StemPart): string {
  switch (part.kind) {
    case 'text':
      return zh(part.text)
    case 'expr':
      return part.expr
    case 'tenframe':
      return `（十格阵：${part.filled} 个${part.extra ? `，另有 ${part.extra} 个` : ''}）`
    case 'objects':
      return icons(part.icon, part.count)
    case 'scatter':
      return part.items.join(' ')
    case 'compare-rows':
      return part.rows.map((r) => icons(r.icon, r.count)).join('\n')
    case 'clock':
      return `（钟面：${zh({ k: 'time.hm', p: { hour: part.hour, minute: part.minute } })}）`
    case 'money':
      return `（人民币：${part.pieces.map((p) => zh({ k: 'money.amount', p: { fen: p.fen } })).join('、')}）`
    case 'shape':
      return `（图形：${zh({ k: `shape.${part.shape}` })}）`
    case 'shape-group':
      return `（图形：${part.shapes.map((s) => zh({ k: `shape.${s}` })).join('、')}）`
    case 'tiles':
      return `（${part.rows} 排、每排 ${part.cols} 个小正方形拼成的图形）`
    case 'sequence':
      return part.cells.map((c) => (c.kind === 'item' ? c.label : '?')).join(' ')
    case 'lineup':
      return part.items.map((it, i) => (i === part.highlight ? `【${it}】` : it)).join(' ')
    case 'number-line':
      return `（数轴 ${part.from}~${part.to}${part.marks?.length ? `，标出 ${part.marks.join('、')}` : ''}）`
    case 'ruler':
      return `（尺子上从 ${part.from} 厘米到 ${part.to} 厘米的一条线段）`
    case 'vertical':
      return `（竖式：${part.a} ${part.op} ${part.b}）`
    case 'angles':
      return `（${part.items.length} 个角）`
  }
}

export interface SampleText {
  stem: string[]
  choices?: string[]
  answer: string
}

export function questionText(q: Question): SampleText {
  return {
    stem: q.stem.map(stemText).filter((s) => s.length > 0),
    choices: q.input === 'choice' ? q.choices?.map((c) => zh(c.label)) : undefined,
    answer: zh(answerLabel(q)),
  }
}

// ── 页面骨架 ──────────────────────────────────────────────────────────

const STYLE = `
* { box-sizing: border-box; }
body { margin: 0; padding: 0 16px 48px; background: #fdf6ec; color: #3d2c1e; font: 17px/1.7 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', system-ui, sans-serif; }
header, main, footer { max-width: 860px; margin: 0 auto; }
header { padding: 20px 0 8px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; color: inherit; text-decoration: none; }
.brand img { width: 36px; height: 36px; border-radius: 9px; }
.crumbs { margin: 14px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 4px 6px; font-size: 14px; color: #8a7a6d; }
.crumbs li + li::before { content: '›'; margin-right: 6px; }
.crumbs a { color: inherit; }
h1 { font-size: 30px; line-height: 1.3; margin: 8px 0 10px; }
h2 { font-size: 22px; margin: 32px 0 12px; }
h3 { font-size: 18px; margin: 20px 0 8px; }
p { margin: 0 0 10px; }
.lead { color: #5c4a3a; }
.cta { display: inline-block; margin: 8px 0 4px; padding: 14px 28px; border-radius: 999px; background: #ff8a3d; color: #fff; font-weight: 800; font-size: 18px; text-decoration: none; box-shadow: 0 4px 12px rgba(61, 44, 30, 0.12); }
.cta:active { transform: scale(0.97); }
.cta.secondary { background: #fff; color: #f2691d; box-shadow: inset 0 0 0 2px #ffb27a; margin-left: 10px; }
.note { font-size: 14px; color: #8a7a6d; }
ul.topics { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
ul.topics li a, ul.topics li span { display: block; padding: 10px 14px; border-radius: 14px; background: #fff; color: inherit; text-decoration: none; box-shadow: 0 2px 8px rgba(61, 44, 30, 0.06); }
ul.topics li span { background: #fff3e6; font-weight: 700; }
ul.topics li a:hover { background: #fff3e6; }
ol.samples { margin: 0; padding: 0; list-style: none; counter-reset: q; display: grid; gap: 10px; }
ol.samples > li { counter-increment: q; padding: 14px 16px 12px 52px; border-radius: 16px; background: #fff; position: relative; box-shadow: 0 2px 8px rgba(61, 44, 30, 0.06); }
ol.samples > li::before { content: counter(q); position: absolute; left: 14px; top: 12px; width: 28px; height: 28px; border-radius: 50%; background: #ffd9a8; color: #3d2c1e; font-weight: 800; text-align: center; line-height: 28px; font-size: 15px; }
.stem { white-space: pre-line; font-weight: 700; font-size: 19px; }
.choices { margin: 6px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 6px 14px; color: #5c4a3a; }
.answer { margin: 6px 0 0; font-size: 15px; color: #8a7a6d; }
.answer b { color: #f2691d; }
.sem { margin-top: 28px; }
.unit { margin: 14px 0; padding: 14px 16px; border-radius: 18px; background: #fff8ee; }
.unit h3 { margin: 0 0 8px; }
.unit .no { color: #f2691d; margin-right: 6px; }
.links { display: flex; flex-wrap: wrap; gap: 8px 18px; }
.links a { color: #f2691d; font-weight: 700; text-decoration: none; }
footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #f0e6d8; font-size: 14px; color: #8a7a6d; }
footer a { color: inherit; }
.contact summary { cursor: pointer; font-weight: 700; }
.contact img { display: block; max-width: 100%; height: auto; margin-top: 8px; border-radius: 12px; background: #fff; }
`.trim()

interface PageMeta {
  /** 相对站点根的路径（course 页以 / 结尾） */
  path: string
  title: string
  description: string
  jsonLd: Record<string, unknown>[]
}

function absoluteTags(siteUrl: string, path: string): string {
  if (!siteUrl) return ''
  const url = `${siteUrl}/${path}`
  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${siteUrl}/og.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:image" content="${siteUrl}/og.png" />`,
  ].join('\n    ')
}

/** 页脚 / 入口页的「开源」一句 + GitHub 链接（engine/sites.ts 的 REPO_URL），与首页底部同一句（open.claim 词条） */
function openSourceLine(): string {
  return `${esc(zh({ k: 'open.claim' }))}<a href="${REPO_URL}">${esc(zh({ k: 'open.repo' }))}</a>`
}

/** 页脚 / 入口页的「更多应用」一行：同一作者的另外三个站（engine/sites.ts），中文文案 */
function sisterLinks(): string {
  const links = SISTER_SITES.map(
    (site) => `<a href="${site.url}">${esc(zh({ k: `sites.${site.id}` }))}</a>（${esc(zh({ k: `sites.${site.id}.desc` }))}）`,
  )
  return `${esc(zh({ k: 'sites.more' }))}：${links.join('、')}`
}

/**
 * 页脚 / 入口页的「联系站长」：折叠着的站长微信二维码（engine/sites.ts 的 AUTHOR_CONTACT），不跑 JS 也能展开。
 * 尺寸写在属性上（200 宽、按原图比例算高），入口页的静态简介没有这份样式也不会撑满一屏。
 */
function contactBlock(root: string): string {
  const src = `${root}${AUTHOR_CONTACT.qr}`
  const w = 200
  const h = Math.round((w * AUTHOR_CONTACT.qrHeight) / AUTHOR_CONTACT.qrWidth)
  return `<details class="contact"><summary>${esc(zh({ k: 'contact.link' }))}</summary><p>${esc(zh({ k: 'contact.hint' }))}</p><img src="${src}" alt="${esc(zh({ k: 'contact.alt' }))}" width="${w}" height="${h}" loading="lazy" /></details>`
}

function page(meta: PageMeta, siteUrl: string, crumbs: { href?: string; text: string }[], body: string, analytics: AnalyticsConfig | null): string {
  const fullTitle = `${meta.title} · ${SITE_NAME}`
  // 回站点根的相对路径按页面深度算：<学科>/<年级>/ 下两层是 ../../，help/ 下一层是 ../
  const root = '../'.repeat(meta.path.split('/').length - 1)
  const crumbHtml = crumbs
    .map((c) => `<li>${c.href ? `<a href="${c.href}">${esc(c.text)}</a>` : esc(c.text)}</li>`)
    .join('')
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.text,
      ...(c.href && siteUrl ? { item: new URL(c.href, `${siteUrl}/${meta.path}`).href } : {}),
    })),
  }
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(fullTitle)}</title>
    <meta name="description" content="${esc(meta.description)}" />
    <meta name="robots" content="index, follow" />
    <meta name="theme-color" content="#ff8a3d" />
    <link rel="icon" type="image/svg+xml" href="${root}favicon.svg" />
    <link rel="apple-touch-icon" href="${root}apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:title" content="${esc(fullTitle)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:locale" content="zh_CN" />
    <meta name="twitter:card" content="summary_large_image" />
    ${absoluteTags(siteUrl, meta.path)}
    <script type="application/ld+json">${JSON.stringify([breadcrumb, ...meta.jsonLd])}</script>${analytics ? `\n    ${analyticsTag(analytics)}` : ''}
    <style>
${STYLE}
    </style>
  </head>
  <body>
    <header>
      <a class="brand" href="${root}"><img src="${root}icon-192.png" alt="" width="36" height="36" />${SITE_NAME} · ${SITE_TAGLINE}</a>
      <ol class="crumbs">${crumbHtml}</ol>
    </header>
    <main>
${body}
    </main>
    <footer>
      <p>${SITE_NAME}：${SITE_PITCH}——打机器人、两人一台或各用各的设备，也能一个人安静地练；题目按人教版教材单元随机出，每个汉字标拼音、每道题自动朗读；免费、无广告、不用注册，添加到主屏幕后没有网也能用。</p>
      <p><a href="${root}">打开${SITE_NAME}</a> · <a href="${root}${HELP_PATH}">帮助与说明</a>（对战玩法、规则、技巧、学习内容、常见问题）</p>
      <p>${openSourceLine()}</p>
      <p>${sisterLinks()}</p>
      ${contactBlock(root)}
    </footer>
  </body>
</html>
`
}

const webApp = (siteUrl: string): Record<string, unknown> => ({
  '@type': 'WebApplication',
  name: SITE_NAME,
  applicationCategory: 'EducationalApplication',
  ...(siteUrl ? { url: `${siteUrl}/` } : {}),
})

// ── 课程页：<学科>/<年级>/ ──────────────────────────────────────────────

function coursePage(lc: LiveCourse, siteUrl: string, analytics: AnalyticsConfig | null): string {
  const { course, name } = lc
  const kps = liveKps(course)
  const units = course.units.filter((u) => kpsOfUnit(course, u.id).some((kp) => getGenerator(kp.id)))
  const title = `${name}知识点对战游戏与同步练习 · 人教版上下册 ${units.length} 个单元 ${kps.length} 个知识点`
  const description = `人教版${name}（2022 版课标新教材）上册、下册共 ${units.length} 个单元、${kps.length} 个知识点，每个都能对战也能练：答对课本题得分，谁先答对 8 题谁赢，打机器人、两人一台或多设备扫码组队；按教材随机出题，汉字标拼音、题目自动朗读，答错有教具演示；免费、无广告、可离线。`
  const sems = ([1, 2] as const).map((s) => ({ s, units: units.filter((u) => u.semester === s) })).filter((x) => x.units.length)
  const body = `
    <h1>${esc(name)} · 人教版知识点对战与练习</h1>
    <p class="lead">${esc(description)}</p>
    <a class="cta" href="${appMap(course)}">打开${esc(name)}地图</a>
    <p class="note">在地图上打开「⚔️ 对战」再点知识点就能打一局；直接点知识点是安静地练。下面每个知识点的链接里有几道示例题。</p>
${sems
  .map(
    ({ s, units: us }) => `
    <section class="sem">
      <h2>${esc(name)}${semName(s)}</h2>
${us
  .map(
    (u) => `
      <div class="unit">
        <h3><span class="no">${esc(unitNo(u))}</span>${esc(u.title)}</h3>
        <ul class="topics">
${kpsOfUnit(course, u.id)
  .filter((kp) => getGenerator(kp.id))
  .map((kp) => `          <li><a href="${kp.id}.html">${kp.icon} ${esc(kp.title)}</a></li>`)
  .join('\n')}
        </ul>
      </div>`,
  )
  .join('')}
    </section>`,
  )
  .join('')}
    <h2>其它年级</h2>
    <p class="links">${liveCourses()
      .filter((o) => o.course.id !== course.id)
      .map((o) => `<a href="${ROOT}${coursePath(o.course)}">${esc(o.name)}</a>`)
      .join('')}<a href="${ROOT}">${SITE_NAME}首页</a></p>`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${name} · 人教版知识点对战与练习`,
    description,
    inLanguage: 'zh-CN',
    isPartOf: webApp(siteUrl),
    hasPart: sems.map(({ s, units: us }) => ({
      '@type': 'ItemList',
      name: `${name}${semName(s)}`,
      itemListElement: us.flatMap((u) =>
        kpsOfUnit(course, u.id)
          .filter((kp) => getGenerator(kp.id))
          .map((kp) => ({
            '@type': 'ListItem',
            name: `${unitLabel(u)} ${kp.title}`,
            ...(siteUrl ? { url: `${siteUrl}/${kpPath(course, kp)}` } : {}),
          })),
      ).map((item, i) => ({ ...item, position: i + 1 })),
    })),
  }
  return page(
    { path: coursePath(course), title, description, jsonLd: [jsonLd] },
    siteUrl,
    [{ href: ROOT, text: SITE_NAME }, { text: name }],
    body,
    analytics,
  )
}

// ── 知识点页：<学科>/<年级>/<知识点 id>.html ─────────────────────────────

function kpPage(lc: LiveCourse, kp: KnowledgePoint, siteUrl: string, analytics: AnalyticsConfig | null): string {
  const { course, name } = lc
  const unit = course.units.find((u) => u.id === kp.unitId)!
  const sem = semName(unit.semester)
  const where = `人教版${name}${sem}${unitLabel(unit)}`
  const title = `${kp.title}对战游戏与练习题 · ${where}`
  const description = `${where}的知识点「${kp.title}」：答对课本题得分的对战游戏（打机器人、两人一台或多设备组队，谁先答对 8 题谁赢）与在线同步练习，程序随机出题，汉字标拼音、题目自动朗读，答错用教具演示；免费、无广告、可离线。附示例题目与答案。`
  const samples = sampleQuestions(kp.id).map(questionText)
  const siblings = kpsOfUnit(course, unit.id).filter((k) => getGenerator(k.id))
  const body = `
    <h1>${kp.icon} ${esc(kp.title)}</h1>
    <p class="lead">${esc(where)}的知识点「${esc(kp.title)}」。可以打一局：答对一题得 1 分，谁先答对 8 题谁赢，打机器人、两人一台平板，或者每人一台设备扫码组队，${SKINS.length} 种游戏画面跟着比分走；也可以安静地练：每轮 8 题，做完打勾。题目都按课本要求随机出，每个汉字标拼音、每道题自动朗读，识字不多的孩子也能自己玩；答错显示正确答案${kp.questionTypes.includes('arith') ? '并演示算法' : '并用教具演示'}，不计时、不扣分。</p>
    <p><a class="cta" href="${appBattle(kp)}">⚔️ 打一局：${esc(kp.title)}</a><a class="cta secondary" href="${appPractice(course, kp)}">安静地练</a></p>
    <p class="note">用数字键盘或四选一卡片作答，在手机、平板、电脑的浏览器里直接用；添加到主屏幕后离线也能练、也能打机器人和两人一台。</p>
    <h2>示例题目（每次练习都是随机生成的新题）</h2>
    <ol class="samples">
${samples
  .map(
    (s) => `      <li>
        <p class="stem">${esc(s.stem.join('\n'))}</p>${
          s.choices
            ? `\n        <ul class="choices">${s.choices.map((c, i) => `<li>${String.fromCharCode(65 + i)}. ${esc(c)}</li>`).join('')}</ul>`
            : ''
        }
        <p class="answer">答案：<b>${esc(s.answer)}</b></p>
      </li>`,
  )
  .join('\n')}
    </ol>${
      siblings.length > 1
        ? `
    <h2>${esc(unitLabel(unit))}的其它知识点</h2>
    <ul class="topics">
${siblings
  .map((k) =>
    k.id === kp.id
      ? `      <li><span>${k.icon} ${esc(k.title)}</span></li>`
      : `      <li><a href="${k.id}.html">${k.icon} ${esc(k.title)}</a></li>`,
  )
  .join('\n')}
    </ul>`
        : ''
    }
    <h2>更多</h2>
    <p class="links"><a href="./">${esc(name)}全部知识点</a>${liveCourses()
      .filter((o) => o.course.id !== course.id)
      .map((o) => `<a href="${ROOT}${coursePath(o.course)}">${esc(o.name)}</a>`)
      .join('')}<a href="${ROOT}">${SITE_NAME}首页</a></p>`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${kp.title}对战游戏与练习题`,
    description,
    inLanguage: 'zh-CN',
    learningResourceType: '对战游戏与同步练习',
    educationalLevel: `小学${zh(lc.grade.title)}`,
    educationalUse: 'practice',
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    isAccessibleForFree: true,
    about: `${where} ${kp.title}`,
    isPartOf: webApp(siteUrl),
  }
  return page(
    { path: kpPath(course, kp), title, description, jsonLd: [jsonLd] },
    siteUrl,
    [
      { href: ROOT, text: SITE_NAME },
      { href: './', text: name },
      { text: `${sem} ${unitLabel(unit)}` },
      { text: kp.title },
    ],
    body,
    analytics,
  )
}

// ── 帮助页：help/ ────────────────────────────────────────────────────────

/** 帮助页（需求 F17）：和应用里的帮助页同一份内容，只有中文；常见问题以 FAQPage 结构化数据给搜索引擎 */
function helpPage(siteUrl: string, analytics: AnalyticsConfig | null): string {
  const sections = helpSections('zh')
  const games = helpGames('zh')
  const title = `${HELP_TITLE.zh}：对战玩法、规则、技巧、学习内容与常见问题`
  const description = `${HELP_LEAD.zh}同一个知识点的课本题，红队和蓝队各答各的；打机器人、两人一台，或者各用各的设备扫码进同一个房间，${games.length} 种游戏画面跟着比分走。`
  const render = (b: ReturnType<typeof helpSections>[number]['blocks'][number]): string => {
    switch (b.kind) {
      case 'p':
        return `    <p>${esc(b.text)}</p>`
      case 'list':
        return `    <ul>\n${b.items.map((i) => `      <li>${esc(i)}</li>`).join('\n')}\n    </ul>`
      case 'steps':
        return `    <ol>\n${b.items.map((i) => `      <li>${esc(i)}</li>`).join('\n')}\n    </ol>`
      case 'games':
        return `    <ul class="topics">\n${games.map((g) => `      <li><span>${g.icon} ${esc(g.name)}</span><br />${esc(g.rule)}</li>`).join('\n')}\n    </ul>`
      case 'faq':
        return b.items.map((i) => `    <h3>${esc(i.q)}</h3>\n    <p>${esc(i.a)}${i.link ? ` <a href="${i.link.url}">${esc(i.link.text)}</a>` : ''}</p>`).join('\n')
    }
  }
  const body = `
    <h1>${esc(HELP_TITLE.zh)}</h1>
    <p class="lead">${esc(HELP_LEAD.zh)}</p>
    <a class="cta" href="${HELP_ROOT}">打开${SITE_NAME}</a>
    <p class="links">${sections.map((s) => `<a href="#${s.id}">${s.icon} ${esc(s.title)}</a>`).join('')}</p>
${sections
  .map(
    (s) => `
    <section id="${s.id}" class="sem">
      <h2>${s.icon} ${esc(s.title)}</h2>
${s.blocks.map(render).join('\n')}
    </section>`,
  )
  .join('')}
    <h2>去对战、去练习</h2>
    <p class="links">${liveCourses()
      .map((o) => `<a href="${HELP_ROOT}${coursePath(o.course)}">${esc(o.name)}</a>`)
      .join('')}<a href="${HELP_ROOT}">${SITE_NAME}首页</a></p>`
  const faq = sections.find((s) => s.id === 'faq')?.blocks.find((b) => b.kind === 'faq')
  const jsonLd: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      inLanguage: 'zh-CN',
      isPartOf: webApp(siteUrl),
    },
  ]
  if (faq && faq.kind === 'faq') {
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.items.map((i) => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.link ? `${i.a}${i.link.text} ${i.link.url}` : i.a },
      })),
    })
  }
  return page({ path: HELP_PATH, title, description, jsonLd }, siteUrl, [{ href: HELP_ROOT, text: SITE_NAME }, { text: HELP_TITLE.zh }], body, analytics)
}

// ── 全部静态页 + robots / sitemap ──────────────────────────────────────

export interface StaticPage {
  /** 相对 public/ 的文件路径 */
  file: string
  /** 相对站点根的地址（sitemap 用） */
  path: string
  html: string
}

/** analytics：访问统计标签（需求 N7），构建脚本按 .env 算出来传进来；null = 不加 */
export function staticPages(siteUrl: string, analytics: AnalyticsConfig | null = null): StaticPage[] {
  const out: StaticPage[] = []
  for (const lc of liveCourses()) {
    out.push({ file: `${coursePath(lc.course)}index.html`, path: coursePath(lc.course), html: coursePage(lc, siteUrl, analytics) })
    for (const kp of liveKps(lc.course)) {
      out.push({ file: kpPath(lc.course, kp), path: kpPath(lc.course, kp), html: kpPage(lc, kp, siteUrl, analytics) })
    }
  }
  out.push({ file: `${HELP_PATH}index.html`, path: HELP_PATH, html: helpPage(siteUrl, analytics) })
  return out
}

/** 静态页所在的顶层目录（= 学科 id + help），脚本重新生成前先清掉，改了知识点 id 不会留下旧页 */
export const STATIC_DIRS: string[] = [...SUBJECTS.map((s) => s.id), 'help']

export function robotsTxt(siteUrl: string): string {
  return `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}`
}

export function sitemapXml(siteUrl: string): string {
  const urls = ['', ...staticPages(siteUrl).map((p) => p.path)].map((p) => `${siteUrl}/${p}`)
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  )
}

// ── 入口页 index.html 的两段 ─────────────────────────────────────────────

/** 入口页的标题 / 描述 / 关键词等（首页与 JSON-LD 共用的一组文案） */
export function homeMeta(): { title: string; description: string; ogDescription: string; keywords: string; grades: string; kpCount: number } {
  const lcs = liveCourses()
  const kpCount = lcs.reduce((n, lc) => n + liveKps(lc.course).length, 0)
  const grades = lcs.map((lc) => zh(lc.grade.title)).join('、')
  const subjects = [...new Set(lcs.map((lc) => zh(lc.subject.title)))].join('、')
  const list = lcs.map((lc) => `${lc.name} ${liveKps(lc.course).length} 个知识点`).join('、')
  return {
    title: `${SITE_NAME} · 人教版小学${subjects}课本知识点对战游戏（${grades}，带拼音和朗读）`,
    description: `${SITE_NAME}：儿童互动对战学习——${SITE_PITCH}；打机器人、两人一台或多设备扫码组队，${SKINS.length} 种游戏画面；${list}，也能一个人练；汉字标拼音、题目自动朗读；免费、无广告、可离线。`,
    ogDescription: `${SITE_PITCH}：打机器人、两人一台或多设备组队，${SKINS.length} 种游戏画面；${list}；带拼音和朗读，免费、可离线。`,
    keywords: [
      SITE_NAME,
      '同步练',
      '儿童对战学习',
      '小学数学对战游戏',
      '课本知识点游戏',
      '寓教于乐',
      '小学数学练习',
      ...lcs.map((lc) => `${lc.name}练习题`),
      '人教版',
      '口算练习',
      '凑十法',
      '破十法',
      '乘法口诀',
      '有余数的除法',
      '拼音',
      '在线练习',
      '儿童学习',
      '数学对战游戏',
      '口算比赛',
      '两人对战',
    ].join(','),
    grades,
    kpCount,
  }
}

export function homeHead(): string {
  const m = homeMeta()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    url: '__SITE_URL__/',
    name: SITE_NAME,
    alternateName: 'Chapter Practice · Battle',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    inLanguage: ['zh-CN', 'en'],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
    featureList: `课本知识点测验变成游戏积分，谁先答对 8 题谁赢；对战模式（打机器人 / 两人一台 / 多设备房间，${SKINS.length} 种实时绘图的游戏画面）；人教版${m.grades}数学 ${m.kpCount} 个知识点随机出题，也能单独练；汉字标拼音；题目自动朗读；答错教具演示；中英文切换；离线可用；可添加到主屏幕`,
    description: m.ogDescription,
  }
  // JSON-LD 一行一个键：没配置 SITE_URL 时构建插件会把含 __SITE_URL__ 的那一行整行删掉，其余仍是合法 JSON
  const ld = JSON.stringify(jsonLd, null, 2)
    .split('\n')
    .map((line) => `      ${line}`)
    .join('\n')
  return `    <title>${esc(m.title)}</title>
    <meta name="description" content="${esc(m.description)}" />
    <meta name="keywords" content="${esc(m.keywords)}" />
    <meta property="og:title" content="${esc(m.title)}" />
    <meta property="og:description" content="${esc(m.ogDescription)}" />
    <meta name="twitter:title" content="${esc(m.title)}" />
    <meta name="twitter:description" content="${esc(m.ogDescription)}" />
    <script type="application/ld+json">
${ld}
    </script>`
}

export function homeBody(): string {
  const m = homeMeta()
  const lcs = liveCourses()
  const soon = SUBJECTS.filter((s) => s.status !== 'live').map((s) => zh(s.title))
  const sections = lcs
    .map((lc) => {
      const kps = liveKps(lc.course)
      const units = lc.course.units.filter((u) => kpsOfUnit(lc.course, u.id).some((kp) => getGenerator(kp.id)))
      return `        <h2>${esc(lc.name)}（上下册 ${units.length} 个单元、${kps.length} 个知识点）</h2>
        <p>${esc(kps.map((kp) => kp.title).join('，'))}。</p>
        <p><a href="./${coursePath(lc.course)}">查看${esc(lc.name)}全部知识点、示例题与对战入口 →</a></p>`
    })
    .join('\n')
  return `      <main class="prerender">
        <h1>${SITE_NAME} · ${SITE_TAGLINE}</h1>
        <p>
          儿童互动对战学习：${SITE_PITCH}——答对一题，小乌龟就往前跑一格、火箭升高一段、楼再盖一层。题目按现行人教版教材（2022 版课标新教材）的单元随机出：一到六年级，语文、数学、英语；练的是课本，玩的是游戏。每个汉字标拼音、每道题自动朗读，识字不多的孩子也能自己玩；答错当场用十格阵、钟面、人民币、尺子、竖式等教具演示。免费、无广告、不用注册，添加到主屏幕后没有网也能用。现在${esc(m.grades)}数学共 ${m.kpCount} 个知识点可对战、可练。
        </p>
        <h2>对战怎么玩</h2>
        <p>同一个知识点的课本题，红队和蓝队各答各的，谁先答对 8 题谁赢：可以打机器人（三档速度），可以两个人一台平板左右分屏，也可以每人一台设备扫码进同一个房间（两队各最多 6 人，还能观战）；每答对一题，${SKINS.length} 种实时绘图的游戏画面就走一步（${esc(SKINS.map((s) => zh({ k: `skin.${s.id}` })).join('、'))}），开局先讲一句规则，得分有音效和语音提示。不想比的时候，直接点知识点就是一份安静的同步练习：一轮 8 题，做完打勾。</p>
${sections}
        <p>其它年级和${esc(soon.join('、'))}陆续补充。</p>
        <p><a href="./${HELP_PATH}">帮助与说明：对战玩法、规则、技巧、学习内容、常见问题 →</a></p>
        <p>${openSourceLine()}</p>
        <p>${sisterLinks()}</p>
        ${contactBlock('./')}
      </main>`
}

const HEAD_RE = /(<!-- seo:head -->)[\s\S]*?(\n\s*<!-- \/seo:head -->)/
const BODY_RE = /(<!-- seo:body -->)[\s\S]*?(\n\s*<!-- \/seo:body -->)/

/** 把 index.html 里两段标记之间的内容换成当前目录生成的；标记缺失就报错（别悄悄什么都不做） */
export function applyHome(html: string): string {
  if (!HEAD_RE.test(html) || !BODY_RE.test(html)) throw new Error('index.html 缺 <!-- seo:head --> / <!-- seo:body --> 标记')
  // 用函数替换：生成的内容里可能有 $，不能当替换模板
  return html
    .replace(HEAD_RE, (_m, a: string, b: string) => `${a}\n${homeHead()}${b}`)
    .replace(BODY_RE, (_m, a: string, b: string) => `${a}\n${homeBody()}${b}`)
}
