/**
 * 按键的「点一下」（N8）：在 pointerup 上就响应，而不是等 click——两人一台时两只手指同时按下，浏览器会把第二根手指
 * 当成多点触控手势、不给它合成 click（那一下就丢了），而且 click 要等抬手后再过一轮合成，比 pointerup 慢一拍。
 * click 仍然接着（键盘 / 辅助功能 / 测试里的 trigger('click')），但同一个元素刚在 pointerup 上响应过就不重复。
 */
const firedAt = new WeakMap<EventTarget, number>()
/** pointerup 之后多久内的 click 算同一下 */
const SAME_TAP_MS = 700

export function onTap(e: Event, fn: () => void): void {
  const el = e.currentTarget
  if (!el) return
  if ((el as HTMLButtonElement).disabled) return
  if (e.type === 'pointerup') {
    const p = e as PointerEvent
    if (!p.isPrimary && p.pointerType === 'mouse') return
    if (p.pointerType === 'mouse' && p.button !== 0) return
    firedAt.set(el, e.timeStamp)
    fn()
    return
  }
  const last = firedAt.get(el)
  if (last !== undefined && e.timeStamp - last < SAME_TAP_MS) return
  fn()
}
