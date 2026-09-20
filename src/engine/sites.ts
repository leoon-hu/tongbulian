// 同一作者的另外三个学习站：首页底部与静态页页脚互相链接（需求 F1）。
// 四个站各有一份同样的名单，改了要一起改；顺序固定 AI加词 → 同步练 → 拼音学习机 → 识字卡片，本站不列自己。
// 名字与一句话说明是普通词条（locales/shell.ts 的 sites.<id> / sites.<id>.desc），跟随界面语言。
export interface SisterSite {
  id: 'aiword' | 'pinyin' | 'kapian'
  url: string
}

export const SISTER_SITES: readonly SisterSite[] = [
  { id: 'aiword', url: 'https://jiaci.app' },
  { id: 'pinyin', url: 'https://pinyin.jiaci.app' },
  { id: 'kapian', url: 'https://kapian.jiaci.app' },
]

// 站长联系方式（需求 F1「站长联系方式」，2026-09-21 四个站统一）：一张微信二维码，首页底部「联系站长」弹出来看，
// 静态页页脚折叠着放同一张。图片在 public/，四个站各放一份同一张图；文案是 contact.* 词条。
export const AUTHOR_CONTACT = {
  /** public/ 里的文件名；应用里拼 BASE_URL、静态页拼回根的相对路径 */
  qr: 'wechat-qrcode.jpg',
  qrWidth: 720,
  qrHeight: 987,
} as const

/** 本站的公开地址与源码仓库（需求 F1「开源与分享」）：页脚「GitHub 源码」、分享出去的链接兜底（file:// 打开时）都用它 */
export const SITE_URL = 'https://tongbulian.jiaci.app'
export const REPO_URL = 'https://github.com/leoon-hu/tongbulian'
