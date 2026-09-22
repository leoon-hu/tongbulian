// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { onTap } from '../ui/tap'

describe('onTap（N8：pointerup 就响应，click 不重复）', () => {
  it('pointerup 响应一次，紧跟着的 click 不再响应；单独的 click（键盘 / 测试）照常；disabled 不响应', () => {
    const el = document.createElement('button')
    let n = 0
    const fn = () => n++
    const up = new Event('pointerup', { bubbles: true })
    Object.assign(up, { isPrimary: true, pointerType: 'touch', button: 0 })
    el.addEventListener('pointerup', (e) => onTap(e, fn))
    el.addEventListener('click', (e) => onTap(e, fn))
    el.dispatchEvent(up)
    expect(n).toBe(1)
    el.dispatchEvent(new Event('click', { bubbles: true }))
    expect(n).toBe(1)
    const other = document.createElement('button')
    other.addEventListener('click', (e) => onTap(e, fn))
    other.dispatchEvent(new Event('click', { bubbles: true }))
    expect(n).toBe(2)
    el.disabled = true
    el.dispatchEvent(up)
    expect(n).toBe(2)
    // 鼠标右键不算
    const right = new Event('pointerup', { bubbles: true })
    Object.assign(right, { isPrimary: true, pointerType: 'mouse', button: 2 })
    other.addEventListener('pointerup', (e) => onTap(e, fn))
    other.dispatchEvent(right)
    expect(n).toBe(2)
  })
})
