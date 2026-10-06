// 四年级数学知识点静态页的专属正文（怎么学 / 常见错误 / 家长怎么陪 / 搜索词）：每个单元一个文件（seo/<单元>.ts），这里合起来。
// 只给静态页（seo/site.ts）用，不进应用。
import type { KpSeo } from '@/content/math/grade1/seo'
import { KP_SEO as numbers } from './seo/numbers'
import { KP_SEO as yi } from './seo/yi'
import { KP_SEO as angles } from './seo/angles'
import { KP_SEO as multiply } from './seo/multiply'
import { KP_SEO as models } from './seo/models'
import { KP_SEO as quads } from './seo/quads'
import { KP_SEO as bars } from './seo/bars'
import { KP_SEO as treasure } from './seo/treasure'
import { KP_SEO as ops } from './seo/ops'
import { KP_SEO as laws } from './seo/laws'
import { KP_SEO as observe } from './seo/observe'
import { KP_SEO as triangles } from './seo/triangles'
import { KP_SEO as motion } from './seo/motion'
import { KP_SEO as decimals } from './seo/decimals'
import { KP_SEO as decadd } from './seo/decadd'
import { KP_SEO as average } from './seo/average'
import { KP_SEO as lunch } from './seo/lunch'
import { KP_SEO as chicken } from './seo/chicken'

export const KP_SEO: Record<string, KpSeo> = {
  ...numbers, ...yi, ...angles, ...multiply, ...models, ...quads, ...bars, ...treasure,
  ...ops, ...laws, ...observe, ...triangles, ...motion, ...decimals, ...decadd, ...average, ...lunch, ...chicken,
}
