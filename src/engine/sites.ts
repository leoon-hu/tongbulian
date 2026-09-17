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
