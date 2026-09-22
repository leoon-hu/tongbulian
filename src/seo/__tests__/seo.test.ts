import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getGenerator } from '@/engine'
import { allCourses, liveCourses as catalogCourses } from '@/engine/catalog'
import { REPO_URL, SISTER_SITES } from '@/engine/sites'
import { translate } from '@/engine/i18n'
import { SKINS } from '@/battle/skins'
import {
  SAMPLES_PER_TIER,
  applyHome,
  coursePath,
  homeMeta,
  kpPath,
  liveCourses,
  questionText,
  robotsTxt,
  sampleQuestions,
  sitemapXml,
  NOT_FOUND_FILE,
  staticPages,
  stemText,
} from '../site'

const INDEX = new URL('../../../index.html', import.meta.url)
const SITE = 'https://example.com'

const zhWord = (k: string): string => translate({ k }, 'zh')

describe('SEO 静态页', () => {
  const pages = staticPages(SITE)
  const byPath = new Map(pages.map((p) => [p.path, p]))

  it('index.html 里的两段与目录一致（改了目录 / 文案后要重跑 npm run seo）', () => {
    const html = readFileSync(INDEX, 'utf8')
    expect(applyHome(html)).toBe(html)
  })

  it('入口页的标题 / 描述把上线的年级与知识点数写进去', () => {
    const m = homeMeta()
    const total = liveCourses().reduce((n, lc) => n + lc.course.knowledgePoints.filter((kp) => getGenerator(kp.id)).length, 0)
    expect(m.kpCount).toBe(total)
    expect(m.grades).toBe('一年级、二年级')
    expect(m.title).toContain('同步练-对战版')
    expect(m.description).toContain('谁先答对 8 题谁赢')
    expect(m.description).toContain(`一年级数学 26 个知识点`)
    expect(m.description.length).toBeLessThan(160)
  })

  it('每个上线课程一张目录页、每个有生成器的知识点一张页；上线课程与目录一致', () => {
    const courses = liveCourses()
    expect(courses.map((lc) => lc.course.id)).toEqual(catalogCourses().map((lc) => lc.course.id))
    expect(courses.map((lc) => lc.name)).toEqual(['一年级数学', '二年级数学'])
    const expected = courses.flatMap((lc) => [
      coursePath(lc.course),
      ...lc.course.knowledgePoints.filter((kp) => getGenerator(kp.id)).map((kp) => kpPath(lc.course, kp)),
    ])
    expect(pages.map((p) => p.path)).toEqual([...expected, 'help/', NOT_FOUND_FILE])
    // 只有 404 页不索引
    expect(pages.filter((p) => p.noindex).map((p) => p.path)).toEqual([NOT_FOUND_FILE])
    for (const p of pages) expect(p.file).toBe(p.path.endsWith('/') ? `${p.path}index.html` : p.path)
    // 注册了但没在目录里挂 courseId 的包不出页
    expect(allCourses().length).toBeGreaterThanOrEqual(courses.length)
  })

  it('每页有标题、描述、canonical 与 JSON-LD，没有残留占位符；标题不超过 42 个字、描述不超过 150 个字', () => {
    for (const p of pages) {
      expect(p.html).toMatch(/<title>[^<]+ · 同步练-对战版<\/title>/)
      const title = p.html.match(/<title>([^<]+)<\/title>/)![1]!
      expect([...title].length, `${p.path} 的标题太长：${title}`).toBeLessThanOrEqual(42)
      const desc = p.html.match(/<meta name="description" content="([^"]{20,})" \/>/)![1]!
      expect([...desc].length, `${p.path} 的描述太长`).toBeLessThanOrEqual(150)
      expect(p.html).toContain(`<link rel="canonical" href="${SITE}/${p.path}" />`)
      expect(p.html).toContain(`<meta property="og:image" content="${SITE}/og.png" />`)
      expect(p.html).toContain('<meta property="og:image:alt" content="')
      expect(p.html).toContain(`<meta name="robots" content="${p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`)
      expect(p.html).not.toContain('__SITE_URL__')
      expect(p.html).not.toContain('undefined')
      const ld = p.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!
      expect(ld).not.toContain('<')
      const data = JSON.parse(ld) as { '@type': string }[]
      expect(data[0]!['@type']).toBe('BreadcrumbList')
      // 页脚「更多应用」链到另外三个站
      for (const site of SISTER_SITES) expect(p.html).toContain(`<a href="${site.url}">`)
      // 页脚「开源」一句链到源码仓库
      expect(p.html).toContain(`<a href="${REPO_URL}">GitHub 源码</a>`)
      // 页脚「联系站长」折叠着站长微信二维码，图片路径按页面深度回到站点根
      const root = p.noindex ? '/' : '../'.repeat(p.path.split('/').length - 1)
      expect(p.html).toContain(`<details class="contact"><summary>联系站长</summary>`)
      expect(p.html).toContain(`<img src="${root}wechat-qrcode.jpg" alt="站长微信二维码" width="200" height="274"`)
    }
  })

  it('没配置站点地址时不写绝对地址，也没有 sitemap 行', () => {
    const p = staticPages('')[0]!
    expect(p.html).not.toContain('canonical')
    expect(p.html).not.toContain('og:url')
    expect(robotsTxt('')).toBe('User-agent: *\nAllow: /\n')
    expect(robotsTxt(SITE)).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  it('目录页链到每个知识点页与应用里的地图；知识点页链回目录页、应用里的练习与对战设置页', () => {
    for (const lc of liveCourses()) {
      const course = byPath.get(coursePath(lc.course))!
      expect(course.html).toContain(`href="../../#/s/${lc.course.subjectId}/g/${lc.course.gradeId}"`)
      for (const kp of lc.course.knowledgePoints.filter((k) => getGenerator(k.id))) {
        expect(course.html).toContain(`href="${kp.id}.html"`)
        const page = byPath.get(kpPath(lc.course, kp))!
        expect(page.html).toContain(`href="../../#/s/${lc.course.subjectId}/g/${lc.course.gradeId}/practice/${kp.id}"`)
        expect(page.html).toContain(`<a class="cta" href="../../#/battle/new/${kp.id}">⚔️ 打一局：${kp.title}</a>`)
        expect(page.html).toContain('href="./"')
        expect(page.html).toContain(`<h1>${kp.title}：${lc.name}`)
        // 知识点专属正文（内容包的 seo.ts）：怎么学 / 常见错误 / 家长怎么陪 + 搜索词
        expect(page.html).toContain(`<h2>${kp.title}怎么学</h2>`)
        expect(page.html).toContain('<h3>家长怎么陪</h3>')
        expect(page.html).toMatch(/<meta name="keywords" content="[^"]+" \/>/)
        // 面包屑里的单元项链到目录页的单元锚点
        expect(page.html).toContain(`href="./#u-${kp.unitId}"`)
        expect(course.html).toContain(`id="u-${kp.unitId}"`)
      }
    }
  })

  it('页内相对链接都指向存在的页面（或应用根）', () => {
    for (const p of pages) {
      const dir = p.path.replace(/[^/]*$/, '')
      for (const m of p.html.matchAll(/href="([^"#]+)(#[^"]*)?"/g)) {
        const href = m[1]!
        if (/^https?:/.test(href)) continue
        const target = new URL(href, `http://x/${dir}`).pathname.slice(1)
        if (target === '' || target === 'og.png' || /\.(svg|png)$/.test(target)) continue
        if (p.noindex) continue // 404 页用根路径，按站点根解析
        expect(byPath.has(target), `${p.path} 里的 ${href} 指向不存在的 ${target}`).toBe(true)
      }
    }
  })

  it('示例题：三档各几道、不重复、有题干与答案；固定种子所以每次一样', () => {
    for (const lc of liveCourses()) {
      for (const kp of lc.course.knowledgePoints.filter((k) => getGenerator(k.id))) {
        const qs = sampleQuestions(kp.id)
        expect(qs.length, kp.id).toBe(SAMPLES_PER_TIER * 3)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
        expect(qs.map((q) => q.difficulty)).toEqual([1, 1, 2, 2, 3, 3])
        expect(sampleQuestions(kp.id).map((q) => q.id)).toEqual(qs.map((q) => q.id))
        for (const q of qs) {
          const s = questionText(q)
          expect(s.stem.length).toBeGreaterThan(0)
          expect(s.answer).not.toBe('')
          if (q.input === 'choice') expect(s.choices!.length).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  it('教具片段的文字版', () => {
    expect(stemText({ kind: 'tenframe', filled: 9, extra: 5 })).toBe('（十格阵：9 个，另有 5 个）')
    expect(stemText({ kind: 'objects', icon: '🍎', count: 3 })).toBe('🍎🍎🍎（3 个苹果）')
    expect(stemText({ kind: 'objects', icon: '🍎', count: 37 })).toBe('🍎 × 37（37 个苹果）')
    expect(stemText({ kind: 'clock', hour: 7, minute: 35 })).toBe('（钟面：7时35分）')
    expect(stemText({ kind: 'money', pieces: [{ fen: 500, form: 'note' }, { fen: 50, form: 'coin' }] })).toBe('（人民币：5元、5角）')
    expect(stemText({ kind: 'shape-group', shapes: ['cube', 'sphere'] })).toBe('（图形：正方体、球）')
    expect(stemText({ kind: 'lineup', items: ['🐶', '🐱', '🐭'], highlight: 1 })).toBe('（从左到右）🐶小狗、【🐱小猫】、🐭')
    expect(stemText({ kind: 'lineup', items: ['🐶', '🐱'], axis: 'ud' })).toBe('（从上到下）🐶小狗、🐱小猫')
    expect(stemText({ kind: 'sequence', cells: [{ kind: 'item', label: '🔺' }, { kind: 'blank' }] })).toBe('🔺 ?')
    expect(stemText({ kind: 'vertical', a: 345, op: '+', b: 278 })).toBe('（竖式：345 + 278）')
  })

  it('帮助页：五节都在、每种游戏的规则句都在、常见问题有 FAQPage 结构化数据、链回首页与课程页', () => {
    const help = byPath.get('help/')!
    expect(help.file).toBe('help/index.html')
    for (const id of ['learn', 'play', 'rules', 'tips', 'faq']) expect(help.html).toContain(`<section id="${id}"`)
    for (const s of SKINS) expect(help.html).toContain(zhWord(`skin.${s.id}`))
    expect(help.html).toContain('"@type":"FAQPage"')
    expect(help.html).toContain('谁先答对 8 题谁赢')
    expect(help.html).toContain('href="../"')
    expect(help.html).toContain('href="../math/g1/"')
    // 其它每页的页脚都链到帮助页
    for (const p of pages) if (p.path !== 'help/') expect(p.html).toContain('help/">帮助与说明</a>')
  })

  it('sitemap 列出首页与全部可索引的静态页（404 页不进），每条带 lastmod / changefreq / priority', () => {
    const xml = sitemapXml(SITE, '2026-09-22')
    expect(xml).toContain(`<loc>${SITE}/</loc><lastmod>2026-09-22</lastmod><changefreq>weekly</changefreq><priority>1.0</priority>`)
    for (const p of pages) expect(xml.includes(`<loc>${SITE}/${p.path}</loc>`)).toBe(!p.noindex)
    expect(xml.match(/<url>/g)).toHaveLength(pages.filter((p) => !p.noindex).length + 1)
  })
})
