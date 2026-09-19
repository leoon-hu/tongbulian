/** 测试用的假 canvas / 假 2D 上下文：记录被调用的方法名，任何属性都能设，不画东西。 */

export interface StubCtx {
  calls: string[]
  /** 某个方法被调用的次数 */
  count(name: string): number
}

export function stubCtx(): CanvasRenderingContext2D & StubCtx {
  const calls: string[] = []
  const store: Record<string | symbol, unknown> = {
    calls,
    count: (name: string) => calls.filter((c) => c === name).length,
    globalAlpha: 1,
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    measureText: () => ({ width: 0 }),
  }
  return new Proxy(store, {
    get(target, key) {
      if (key in target) return target[key]
      const fn = (): void => {
        calls.push(String(key))
      }
      return fn
    },
    set(target, key, value) {
      target[key] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D & StubCtx
}

/** 假 canvas：getContext 返回上面的假上下文（或 null，模拟没有 canvas 的环境） */
export function stubCanvas(ctx: (CanvasRenderingContext2D & StubCtx) | null = stubCtx()): HTMLCanvasElement {
  const canvas = {
    width: 0,
    height: 0,
    style: {} as CSSStyleDeclaration,
    getContext: () => ctx,
  }
  return canvas as unknown as HTMLCanvasElement
}
