/**
 * 首页「安装 同步练」提示条（需求 F16）的纯逻辑：显不显示、按环境给哪种做法。
 * 与 child-education 下另外三个站（AI加词 / 拼音学习机 / 识字卡片）是同一套规则；
 * 不碰 window，好单测。浏览器侧的探测、事件与存储在 stores/install.ts，画在 components/ui/InstallBar.vue。
 */

/** 关掉 / 拒绝之后多久再提示（F16c：3 天） */
export const INSTALL_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
/** 「永不再提示」（装好了）：JSON 存得下的最大整数，Infinity 会被 JSON.stringify 写成 null */
export const INSTALL_FOREVER = Number.MAX_SAFE_INTEGER

/**
 * prompt = 拿到 beforeinstallprompt（Android / 电脑 Chromium），按钮「安装」直接弹系统框；
 * inapp  = 微信 / QQ 等内置浏览器，装不了，教他去浏览器打开；
 * ios    = iPhone / iPad，教他点分享 → 添加到主屏幕；
 * menu   = 其它触屏浏览器，「浏览器菜单 → 添加到主屏幕」
 */
export type InstallKind = 'prompt' | 'inapp' | 'ios' | 'menu'

export interface InstallEnv {
  /** 已从主屏幕 / 桌面应用打开 */
  standalone: boolean
  /** 本设备装过（appinstalled 或系统框里点了安装） */
  installed: boolean
  /** 拿到了 beforeinstallprompt */
  hasPrompt: boolean
  /** 触屏设备（pointer: coarse）；电脑只在能一键安装时提示 */
  touch: boolean
  /** 微信 / QQ / 微博 / Facebook / Instagram / LINE 内置浏览器 */
  inApp: boolean
  ios: boolean
}

/** null = 不显示。判断顺序就是需求 F16a 的顺序：能一键安装最优先，内置浏览器要先于 iOS（iOS 微信里 ios 也为真） */
export function installKind(env: InstallEnv, snoozedUntil: number, now: number): InstallKind | null {
  if (env.standalone || env.installed || now < snoozedUntil) return null
  if (env.hasPrompt) return 'prompt'
  if (!env.touch) return null
  if (env.inApp) return 'inapp'
  if (env.ios) return 'ios'
  return 'menu'
}

/**
 * 「怎么做」面板的步骤（词条 key，渲染时 ui() 翻译）。iOS 不在 Safari 里时第一步先换 Safari；
 * prompt 不需要步骤（直接弹系统框）
 */
export function installStepKeys(kind: InstallKind, opts: { iosSafari: boolean; ipad: boolean }): string[] {
  switch (kind) {
    case 'inapp':
      return ['install.step.inapp1', 'install.step.inapp2', 'install.step.inapp3']
    case 'ios':
      return [
        ...(opts.iosSafari ? [] : ['install.step.ios0']),
        opts.ipad ? 'install.step.ios1ipad' : 'install.step.ios1',
        'install.step.ios2',
        'install.step.ios3',
      ]
    case 'menu':
      return ['install.step.menu1', 'install.step.menu2', 'install.step.menu3']
    default:
      return []
  }
}
