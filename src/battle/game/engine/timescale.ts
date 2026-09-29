/**
 * 顿帧与慢动作（需求 M10）：命中时画面停一小下（直拳 40 ms … 旋风拳 120 ms，打倒那一拳 250 ms），
 * 停完可以接一段慢动作（打倒那一拳 0.3 倍、0.6 秒）。游戏每帧先 scale(dt) 把真实时间换成「画面里过去了多久」再推进；
 * 减少动画时 enabled = false，原样返回（不停、不慢）。纯数据，node 里可测。
 */
export class TimeScale {
  /** 减少动画时关掉 */
  enabled = true
  private stopLeft = 0
  private slowLeft = 0
  private slowFactor = 1

  /** 停住 seconds 秒（真实时间）；正停着就取长的那个 */
  hitstop(seconds: number): void {
    if (!this.enabled || !(seconds > 0)) return
    this.stopLeft = Math.max(this.stopLeft, seconds)
  }

  /** 停完之后接一段慢动作：factor 倍速（0…1）、持续 seconds 秒（真实时间）；正慢着就取更慢、更长的 */
  slow(factor: number, seconds: number): void {
    if (!this.enabled || !(seconds > 0)) return
    const f = Math.max(0, Math.min(1, factor))
    this.slowFactor = this.slowLeft > 0 ? Math.min(this.slowFactor, f) : f
    this.slowLeft = Math.max(this.slowLeft, seconds)
  }

  /** 不慢了（下一拳来了：别让上一只 Boss 的慢动作拖住新的一拳） */
  clearSlow(): void {
    this.slowLeft = 0
    this.slowFactor = 1
  }

  reset(): void {
    this.stopLeft = 0
    this.clearSlow()
  }

  /** 正停着 */
  get frozen(): boolean {
    return this.enabled && this.stopLeft > 0
  }

  /** 这一刻的倍速：停着 0、慢动作里 factor、平时 1 */
  get factor(): number {
    if (!this.enabled) return 1
    if (this.stopLeft > 0) return 0
    return this.slowLeft > 0 ? this.slowFactor : 1
  }

  /** 真实时间 dt → 画面里过去了多久；同时推进停顿与慢动作的计时 */
  scale(dt: number): number {
    if (!(dt > 0)) return 0
    if (!this.enabled) return dt
    let rest = dt
    if (this.stopLeft > 0) {
      const used = Math.min(rest, this.stopLeft)
      this.stopLeft -= used
      rest -= used
    }
    if (rest <= 0) return 0
    if (this.slowLeft > 0) {
      const used = Math.min(rest, this.slowLeft)
      this.slowLeft -= used
      const out = used * this.slowFactor + (rest - used)
      if (this.slowLeft <= 0) this.clearSlow()
      return out
    }
    return rest
  }
}
