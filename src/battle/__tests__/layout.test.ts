// 竞技场布局（需求 B29 / B30 / M6）：按视口尺寸决定转不转、竖屏布局、紧凑版；转了的内联样式
import { describe, expect, it } from 'vitest'
import { arenaLayout, COMPACT_MAX_HEIGHT, PHONE_MAX_WIDTH, ROTATED_STYLE } from '@/battle/layout'

describe('竞技场布局（B29 / B30 / M6）', () => {
  it('手机竖着拿：竞技场自己转成横的，可用高度就是手机的宽，所以是紧凑版', () => {
    expect(arenaLayout({ width: 390, height: 844 })).toEqual({ rotated: true, portrait: false, compact: true })
    expect(arenaLayout({ width: 430, height: 932 })).toEqual({ rotated: true, portrait: false, compact: true })
    expect(arenaLayout({ width: 360, height: 640 })).toEqual({ rotated: true, portrait: false, compact: true })
  })

  it('手机横屏：不转、紧凑版；iPad 竖横 / 电脑：既不转也不紧凑', () => {
    expect(arenaLayout({ width: 844, height: 390 })).toEqual({ rotated: false, portrait: false, compact: true })
    expect(arenaLayout({ width: 667, height: 375 })).toEqual({ rotated: false, portrait: false, compact: true })
    expect(arenaLayout({ width: 768, height: 1024 })).toEqual({ rotated: false, portrait: false, compact: false })
    expect(arenaLayout({ width: 1024, height: 768 })).toEqual({ rotated: false, portrait: false, compact: false })
    expect(arenaLayout({ width: 1440, height: 900 })).toEqual({ rotated: false, portrait: false, compact: false })
  })

  it('小平板竖着拿（宽 ≤ 640）也转，但转过来高度够、不是紧凑版；再宽就当平板不转', () => {
    expect(arenaLayout({ width: 600, height: 960 })).toEqual({ rotated: true, portrait: false, compact: false })
    expect(arenaLayout({ width: PHONE_MAX_WIDTH, height: 1000 }).rotated).toBe(true)
    expect(arenaLayout({ width: PHONE_MAX_WIDTH + 1, height: 1000 })).toEqual({ rotated: false, portrait: false, compact: false })
  })

  it('允许竖着玩（打怪兽一个人打，M6）：手机竖屏布局，不转、不紧凑；横着拿照旧', () => {
    expect(arenaLayout({ width: 390, height: 844 }, { allowPortrait: true })).toEqual({ rotated: false, portrait: true, compact: false })
    expect(arenaLayout({ width: 844, height: 390 }, { allowPortrait: true })).toEqual({ rotated: false, portrait: false, compact: true })
    expect(arenaLayout({ width: 768, height: 1024 }, { allowPortrait: true })).toEqual({ rotated: false, portrait: false, compact: false })
  })

  it('边界：正方形算竖的；紧凑版的高度上限是 479', () => {
    expect(arenaLayout({ width: 500, height: 500 }).rotated).toBe(true)
    expect(arenaLayout({ width: 900, height: COMPACT_MAX_HEIGHT }).compact).toBe(true)
    expect(arenaLayout({ width: 900, height: COMPACT_MAX_HEIGHT + 1 }).compact).toBe(false)
  })

  it('转了的内联样式：视口宽高互换（动态视口单位带回退）、绕左上角转 90° 再上移一个自身高度、脱离文档流、安全区四边转一圈', () => {
    const s = ROTATED_STYLE as Record<string, string | string[]>
    expect(s.position).toBe('fixed')
    expect([s.top, s.left]).toEqual(['0', '0'])
    expect(s.width).toEqual(['100vh', '100dvh'])
    expect(s.height).toEqual(['100vw', '100dvw'])
    expect(s.transformOrigin).toBe('top left')
    expect(s.transform).toBe('rotate(90deg) translateY(-100%)')
    expect(s['--sa-top']).toBe('env(safe-area-inset-right)')
    expect(s['--sa-right']).toBe('env(safe-area-inset-bottom)')
    expect(s['--sa-bottom']).toBe('env(safe-area-inset-left)')
    expect(s['--sa-left']).toBe('env(safe-area-inset-top)')
  })
})
