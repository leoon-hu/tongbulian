// @vitest-environment happy-dom
// playSequence：一句话按 AudioContext 的时钟一次排到时间轴上（F14）。用假的 AudioContext 记下每条的 start 时刻。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeSource {
  buffer: { duration: number } | null = null
  started: number[] = []
  stopped = false
  onended: null | (() => void) = null
  connect(): void {}
  start(t = 0): void {
    this.started.push(t)
  }
  stop(): void {
    this.stopped = true
  }
}
class FakeGain {
  gain = { value: 1, setTargetAtTime: () => {} }
  connect(): void {}
}
let lastAc: FakeAc | null = null
class FakeAc {
  state = 'running'
  currentTime = 10
  sampleRate = 24000
  destination = {}
  sources: FakeSource[] = []
  constructor() {
    lastAc = this
  }
  createGain(): FakeGain {
    return new FakeGain()
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource()
    this.sources.push(s)
    return s
  }
  createBuffer(): object {
    return {}
  }
  resume(): Promise<void> {
    return Promise.resolve()
  }
  // 假解码：数据的第一个字节 / 10 = 时长（秒）
  decodeAudioData(data: ArrayBuffer, ok: (b: { duration: number }) => void): undefined {
    ok({ duration: new Uint8Array(data)[0]! / 10 })
    return undefined
  }
}
/** 文件名 → 时长（0.1 秒单位）；missing 回 404 */
const DURATIONS: Record<string, number> = { a: 10, b: 5, c: 3 }
vi.stubGlobal('AudioContext', FakeAc)
;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAc
vi.stubGlobal(
  'fetch',
  vi.fn(async (u: string) => {
    const name = u.split('/').pop()!.replace('.mp3', '')
    const d = DURATIONS[name]
    return { ok: d !== undefined, status: d === undefined ? 404 : 200, arrayBuffer: async () => new Uint8Array([d ?? 0]).buffer }
  }),
)
vi.mock('@/engine/tts', () => ({ tts: vi.fn(async () => {}), stopTTS: vi.fn() }))

const { playSequence, JOIN_GAP_S, PAUSE_S, CLIP_PAD_S } = await import('@/engine/audio')
const { tts } = await import('@/engine/tts')

async function until(pred: () => boolean): Promise<void> {
  for (let i = 0; i < 200 && !pred(); i++) await new Promise((r) => setTimeout(r, 1))
  expect(pred()).toBe(true)
}

describe('playSequence', () => {
  beforeEach(() => {
    vi.mocked(tts).mockClear()
    if (lastAc) lastAc.sources.length = 0
  })
  afterEach(async () => {
    // 让上一句的兜底计时器不影响下一条用例
    await new Promise((r) => setTimeout(r, 5))
  })

  it('片段按时钟连着排：下一条盖住上一条自带的静音、只留 JOIN_GAP；停顿标记留 PAUSE_S', async () => {
    const p = playSequence([{ file: 'a', text: 'A' }, { file: 'b', text: 'B' }, { pause: true }, { file: 'c', text: 'C' }], 'zh')
    await until(() => (lastAc?.sources.length ?? 0) === 3)
    const ac = lastAc!
    const t0 = ac.currentTime + 0.03
    const [a, b, c] = ac.sources
    expect(a!.started[0]).toBeCloseTo(t0, 5)
    expect(b!.started[0]).toBeCloseTo(t0 + 1.0 - CLIP_PAD_S + JOIN_GAP_S, 5)
    expect(c!.started[0]).toBeCloseTo(t0 + 1.0 - CLIP_PAD_S + JOIN_GAP_S + 0.5 - CLIP_PAD_S + JOIN_GAP_S + PAUSE_S, 5)
    // 最后一条播完才算完
    let done = false
    void p.then(() => (done = true))
    await new Promise((r) => setTimeout(r, 5))
    expect(done).toBe(false)
    c!.onended?.()
    await p
    expect(tts).not.toHaveBeenCalled()
  })

  it('中止：排上时间轴的都停掉，序列立刻结束', async () => {
    const ctrl = new AbortController()
    const p = playSequence([{ file: 'a', text: 'A' }, { file: 'b', text: 'B' }], 'zh', ctrl.signal)
    await until(() => (lastAc?.sources.length ?? 0) === 2)
    ctrl.abort()
    await p
    expect(lastAc!.sources.every((s) => s.stopped)).toBe(true)
  })

  it('没有音频的片段走老路（TTS），两边有音频的各排各的', async () => {
    const p = playSequence([{ file: 'a', text: 'A' }, { file: null, text: '没有音频' }, { file: 'b', text: 'B' }], 'zh')
    await until(() => (lastAc?.sources.length ?? 0) === 1)
    lastAc!.sources[0]!.onended?.()
    await until(() => vi.mocked(tts).mock.calls.length === 1)
    expect(vi.mocked(tts).mock.calls[0]![0]).toBe('没有音频')
    await until(() => (lastAc?.sources.length ?? 0) === 2)
    lastAc!.sources[1]!.onended?.()
    await p
  })

  it('缺文件（404）也退 TTS，并且不再请求第二次', async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockClear()
    const p = playSequence([{ file: 'missing', text: '缺' }], 'zh')
    await until(() => vi.mocked(tts).mock.calls.length === 1)
    await p
    const p2 = playSequence([{ file: 'missing', text: '缺' }], 'zh')
    await until(() => vi.mocked(tts).mock.calls.length === 2)
    await p2
    expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('missing'))).toHaveLength(1)
  })
})
