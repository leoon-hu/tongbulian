// 三年级数学知识点静态页的专属正文（怎么学 / 常见错误 / 家长怎么陪 / 搜索词）：每个单元一个文件（seo/<单元>.ts），这里合起来。
// 只给静态页（seo/site.ts）用，不进应用。
import type { KpSeo } from '@/content/math/grade1/seo'
import { KP_SEO as views } from './seo/views'
import { KP_SEO as mixed } from './seo/mixed'
import { KP_SEO as length } from './seo/length'
import { KP_SEO as mass } from './seo/mass'
import { KP_SEO as multiply } from './seo/multiply'
import { KP_SEO as coding } from './seo/coding'
import { KP_SEO as lines } from './seo/lines'
import { KP_SEO as fractions } from './seo/fractions'
import { KP_SEO as motion } from './seo/motion'
import { KP_SEO as divide } from './seo/divide'
import { KP_SEO as rect } from './seo/rect'
import { KP_SEO as area } from './seo/area'
import { KP_SEO as data } from './seo/data'
import { KP_SEO as calendar } from './seo/calendar'
import { KP_SEO as decimals } from './seo/decimals'

export const KP_SEO: Record<string, KpSeo> = { ...views, ...mixed, ...length, ...mass, ...multiply, ...coding, ...lines, ...fractions, ...motion, ...divide, ...rect, ...area, ...data, ...calendar, ...decimals }
