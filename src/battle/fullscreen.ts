/**
 * 进竞技场时的全屏 + 横屏锁（需求 B30）：只在触屏设备（平板 / 手机）上试，电脑不自动全屏（用户 2026-09-20 定的）。
 * 都是「试一下」：不支持、被拒绝都静默；要在用户手势里调用。
 */
export function isTouchDevice(): boolean {
  if (typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) > 0) return true
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

export function enterArenaFullscreen(): void {
  if (!isTouchDevice()) return
  try {
    document.documentElement
      .requestFullscreen?.()
      ?.then(() => (screen.orientation as { lock?: (o: string) => Promise<void> }).lock?.('landscape')?.catch(() => {}))
      .catch(() => {})
  } catch {
    /* 不支持 */
  }
}
