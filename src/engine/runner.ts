/**
 * 独占任务：同一时刻只允许一条「声音序列」在跑（读题、报答案、鼓励语…）。
 * 新任务启动会中止上一条；序列内部用 signal 感知中止，sleep / play 都会跟着停。
 */

export class Aborted extends Error {
  constructor() {
    super('aborted')
    this.name = 'Aborted'
  }
}

let controller: AbortController | null = null

export function isAborted(e: unknown): boolean {
  return e instanceof Aborted || (e instanceof DOMException && e.name === 'AbortError')
}

export function cancel(): void {
  controller?.abort()
  controller = null
}

export function run(task: (signal: AbortSignal) => Promise<void>): Promise<void> {
  cancel()
  const ac = new AbortController()
  controller = ac
  return task(ac.signal)
    .catch((e: unknown) => {
      if (!isAborted(e)) console.error(e)
    })
    .finally(() => {
      if (controller === ac) controller = null
    })
}

export function check(signal: AbortSignal): void {
  if (signal.aborted) throw new Aborted()
}

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Aborted())
    const t = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(t)
      reject(new Aborted())
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}
