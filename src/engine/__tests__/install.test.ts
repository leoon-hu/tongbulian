import { describe, expect, it } from 'vitest'
import { INSTALL_FOREVER, INSTALL_SNOOZE_MS, installKind, installStepKeys, type InstallEnv } from '../install'

const base: InstallEnv = { standalone: false, installed: false, hasPrompt: false, touch: true, inApp: false, ios: false }
const NOW = 1_700_000_000_000

describe('installKind（需求 F16a：按环境决定做法）', () => {
  it('拿到安装事件最优先，电脑也算', () => {
    expect(installKind({ ...base, hasPrompt: true }, 0, NOW)).toBe('prompt')
    expect(installKind({ ...base, hasPrompt: true, touch: false }, 0, NOW)).toBe('prompt')
    expect(installKind({ ...base, hasPrompt: true, inApp: true, ios: true }, 0, NOW)).toBe('prompt')
  })

  it('电脑没有安装事件不提示', () => {
    expect(installKind({ ...base, touch: false }, 0, NOW)).toBeNull()
    expect(installKind({ ...base, touch: false, ios: true }, 0, NOW)).toBeNull()
  })

  it('内置浏览器先于 iOS：iOS 微信里也教去浏览器打开', () => {
    expect(installKind({ ...base, inApp: true, ios: true }, 0, NOW)).toBe('inapp')
    expect(installKind({ ...base, inApp: true }, 0, NOW)).toBe('inapp')
  })

  it('iOS 教分享 → 添加到主屏幕；其它触屏浏览器教菜单', () => {
    expect(installKind({ ...base, ios: true }, 0, NOW)).toBe('ios')
    expect(installKind(base, 0, NOW)).toBe('menu')
  })

  it('已从主屏幕打开 / 装过 / 静默期内都不提示；静默期一过又出现', () => {
    expect(installKind({ ...base, standalone: true, hasPrompt: true }, 0, NOW)).toBeNull()
    expect(installKind({ ...base, installed: true, hasPrompt: true }, 0, NOW)).toBeNull()
    expect(installKind({ ...base, hasPrompt: true }, NOW + INSTALL_SNOOZE_MS, NOW)).toBeNull()
    expect(installKind({ ...base, hasPrompt: true }, NOW + INSTALL_SNOOZE_MS, NOW + INSTALL_SNOOZE_MS)).toBe('prompt')
    expect(installKind({ ...base, hasPrompt: true }, INSTALL_FOREVER, NOW)).toBeNull()
  })

  it('静默 3 天；「永不」存得进 JSON', () => {
    expect(INSTALL_SNOOZE_MS).toBe(3 * 24 * 3600 * 1000)
    expect(JSON.parse(JSON.stringify({ until: INSTALL_FOREVER })).until).toBe(INSTALL_FOREVER)
  })
})

describe('installStepKeys（「怎么做」面板）', () => {
  it('iOS 在 Safari 里三步，不在 Safari 里先换 Safari；iPad 分享按钮在右上角', () => {
    expect(installStepKeys('ios', { iosSafari: true, ipad: false })).toEqual(['install.step.ios1', 'install.step.ios2', 'install.step.ios3'])
    expect(installStepKeys('ios', { iosSafari: false, ipad: true })).toEqual(['install.step.ios0', 'install.step.ios1ipad', 'install.step.ios2', 'install.step.ios3'])
  })
  it('内置浏览器与其它浏览器各三步；prompt 不需要步骤', () => {
    expect(installStepKeys('inapp', { iosSafari: false, ipad: false })).toHaveLength(3)
    expect(installStepKeys('menu', { iosSafari: false, ipad: false })).toHaveLength(3)
    expect(installStepKeys('prompt', { iosSafari: false, ipad: false })).toEqual([])
  })
})
