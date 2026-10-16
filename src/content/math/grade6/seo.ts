// 六年级数学知识点静态页的专属正文（怎么学 / 常见错误 / 家长怎么陪 / 搜索词）：每个单元一个文件（seo/<单元>.ts），这里合起来。
// 只给静态页（seo/site.ts）用，不进应用。
import type { KpSeo } from '@/content/math/grade1/seo'
import { KP_SEO as position } from './seo/position'
import { KP_SEO as fracmul } from './seo/fracmul'
import { KP_SEO as fracdiv } from './seo/fracdiv'
import { KP_SEO as lifeneg } from './seo/lifeneg'
import { KP_SEO as circle } from './seo/circle'
import { KP_SEO as sports } from './seo/sports'
import { KP_SEO as percent } from './seo/percent'
import { KP_SEO as water } from './seo/water'
import { KP_SEO as negative } from './seo/negative'
import { KP_SEO as percent2 } from './seo/percent2'
import { KP_SEO as cylinder } from './seo/cylinder'
import { KP_SEO as proportion } from './seo/proportion'
import { KP_SEO as bike } from './seo/bike'
import { KP_SEO as pigeon } from './seo/pigeon'

export const KP_SEO: Record<string, KpSeo> = {
  ...position, ...fracmul, ...fracdiv, ...lifeneg, ...circle, ...sports, ...percent, ...water,
  ...negative, ...percent2, ...cylinder, ...proportion, ...bike, ...pigeon,
}
