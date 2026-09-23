import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../base.css', import.meta.url), 'utf8')
const rule = (selector: string): string => {
  const at = css.indexOf(`\n\n${selector} {`)
  expect(at).toBeGreaterThanOrEqual(0)
  return css.slice(at, css.indexOf('}', at))
}

describe('base.css：整站不让选中文字（U2）', () => {
  it('body 关掉选中与长按菜单——点按钮偏了落在字上，Android 会选中一个字弹出搜索', () => {
    const body = rule('body')
    expect(body).toMatch(/-webkit-user-select: none/)
    expect(body).toMatch(/[^-]user-select: none/)
    expect(body).toMatch(/-webkit-touch-callout: none/)
  })
  it('输入框仍能选、能编辑', () => {
    const at = css.indexOf('input,\ntextarea')
    expect(at).toBeGreaterThanOrEqual(0)
    expect(css.slice(at, css.indexOf('}', at))).toMatch(/user-select: text/)
  })
})
