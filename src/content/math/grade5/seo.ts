// 五年级数学知识点静态页的专属正文（怎么学 / 常见错误 / 家长怎么陪 / 搜索词）：每个单元一个文件（seo/<单元>.ts），这里合起来。
// 只给静态页（seo/site.ts）用，不进应用。
import type { KpSeo } from '@/content/math/grade1/seo'
import { KP_SEO as combine } from './seo/combine'
import { KP_SEO as decmul } from './seo/decmul'
import { KP_SEO as decdiv } from './seo/decdiv'
import { KP_SEO as motion } from './seo/motion'
import { KP_SEO as letters } from './seo/letters'
import { KP_SEO as areas } from './seo/areas'
import { KP_SEO as tiling } from './seo/tiling'
import { KP_SEO as chance } from './seo/chance'
import { KP_SEO as views } from './seo/views'
import { KP_SEO as factors } from './seo/factors'
import { KP_SEO as cuboids } from './seo/cuboids'
import { KP_SEO as explore } from './seo/explore'
import { KP_SEO as fractions } from './seo/fractions'
import { KP_SEO as fracdec } from './seo/fracdec'
import { KP_SEO as rotate } from './seo/rotate'
import { KP_SEO as fracadd } from './seo/fracadd'
import { KP_SEO as notify } from './seo/notify'
import { KP_SEO as linechart } from './seo/linechart'
import { KP_SEO as defective } from './seo/defective'

export const KP_SEO: Record<string, KpSeo> = {
  ...combine, ...decmul, ...decdiv, ...motion, ...letters, ...areas, ...tiling, ...chance,
  ...views, ...factors, ...cuboids, ...explore, ...fractions, ...fracdec, ...rotate, ...fracadd, ...notify, ...linechart, ...defective,
}
