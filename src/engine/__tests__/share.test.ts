import { describe, expect, it } from 'vitest'
import { shareMessage, shareWay, siteRoot } from '@/engine/share'

describe('分享给朋友：按环境选做法（F1）', () => {
  const wechat = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 MicroMessenger/8.0.40'
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
  const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'

  it('微信 / QQ 里教用右上角菜单，哪怕有 navigator.share', () => {
    expect(shareWay({ ua: wechat, canShare: true })).toBe('wechat')
    expect(shareWay({ ua: 'QQ/8.9.0 Mobile', canShare: false })).toBe('wechat')
  })
  it('有系统分享面板就用它，没有就复制', () => {
    expect(shareWay({ ua: safari, canShare: true })).toBe('native')
    expect(shareWay({ ua: mac, canShare: false })).toBe('copy')
  })
  it('分享的是站点根地址：去掉 hash 路由与 index.html，子路径部署也对，file:// 退到公开地址', () => {
    expect(siteRoot('https://tongbulian.jiaci.app/#/s/math/g/g1', 'x')).toBe('https://tongbulian.jiaci.app/')
    expect(siteRoot('https://example.com/apps/tbl/index.html#/help', 'x')).toBe('https://example.com/apps/tbl/')
    expect(siteRoot('file:///tmp/dist/index.html', 'https://tongbulian.jiaci.app')).toBe('https://tongbulian.jiaci.app')
    expect(siteRoot('', 'https://tongbulian.jiaci.app')).toBe('https://tongbulian.jiaci.app')
  })
  it('文案 + 换行 + 链接', () => {
    expect(shareMessage('一句话', 'https://a/')).toBe('一句话\nhttps://a/')
  })
})
