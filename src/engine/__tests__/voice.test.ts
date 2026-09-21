import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const played: string[] = []
vi.mock('@/engine/audio', () => ({
  play: vi.fn(async (file: string | null, text: string) => {
    played.push(`${file ?? '-'}|${text}`)
  }),
  preload: vi.fn(async () => {}),
  stop: vi.fn(),
}))
vi.mock('@/audio/manifest.json', () => ({
  default: { version: 1, zh: { 加: 'zh-jia', 等于: 'zh-dengyu' }, en: {} },
}))

const { say, sayKeys, setVoiceEnabled, clipFor, hush, forget } = await import('@/engine/voice')

describe('voice.say', () => {
  beforeEach(() => {
    played.length = 0
    setVoiceEnabled(true)
  })
  afterEach(() => hush())

  it('按顺序播每个片段：有音频的给文件名，没有的给 null 让播放器退 TTS', async () => {
    await say(['9', '加', '5', '等于', '几'], 'zh')
    expect(played).toEqual(['-|9', 'zh-jia|加', '-|5', 'zh-dengyu|等于', '-|几'])
  })

  it('静音时什么都不播', async () => {
    setVoiceEnabled(false)
    await say(['加'], 'zh')
    expect(played).toEqual([])
  })

  it('新的一句会打断上一句（独占）', async () => {
    const first = say(['加', '等于', '加', '等于'], 'zh')
    const second = say(['几'], 'zh')
    await Promise.all([first, second])
    // 第一句最多播出开头，后面的被中止；第二句完整播出
    expect(played[played.length - 1]).toBe('-|几')
    expect(played.filter((p) => p === 'zh-dengyu|等于').length).toBeLessThan(2)
  })

  it('sayKeys 把词条的片段拼成一句', async () => {
    await sayKeys(['sym.plus'], 'zh')
    expect(played.length).toBeGreaterThan(0)
  })

  it('clipFor 按语言查 manifest', () => {
    expect(clipFor('加', 'zh')).toBe('zh-jia')
    expect(clipFor('加', 'en')).toBeNull()
    expect(clipFor('没有的', 'zh')).toBeNull()
  })
})

// 对战里点 🔊 读题（B37）：这句必须播完，自己再点、另一方点、弹出提示都不能打断
describe('voice.say 的播法', () => {
  beforeEach(() => {
    played.length = 0
    setVoiceEnabled(true)
  })
  afterEach(() => hush())

  const A = ['加', '等于', '加']
  const B = ['几', '等于']

  it('hold：另一行点 🔊 排在后面，播完接着读；两句都完整', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const blue = say(B, 'zh', 0, { mode: 'hold', key: 'blue' })
    await Promise.all([red, blue])
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加', '-|几', 'zh-dengyu|等于'])
  })

  it('hold：自己这行再点同一道题不重头来（返回正在播的那句）', async () => {
    const first = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const again = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    expect(again).toBe(first)
    await Promise.all([first, again])
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加'])
  })

  it('hold：正在自动读的这道题被点了 🔊 就升级成必须播完，之后的提示不再打断它', async () => {
    const auto = say(A, 'zh', 0, { mode: 'wait', key: 'red' })
    expect(say(A, 'zh', 0, { mode: 'hold', key: 'red' })).toBe(auto)
    await say(['几'], 'zh', 0, { mode: 'skip' })
    await auto
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加'])
  })

  it('wait：正在播必须播完的就排队，同一个 key 只留最新的一条（换题了就读新题）', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const old = say(['几'], 'zh', 0, { mode: 'wait', key: 'blue' })
    const latest = say(B, 'zh', 0, { mode: 'wait', key: 'blue' })
    await Promise.all([red, old, latest])
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加', '-|几', 'zh-dengyu|等于'])
  })

  it('skip：正在播必须播完的就不读了；没有的话和默认一样打断', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    await say(['几'], 'zh', 0, { mode: 'skip' })
    await red
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加'])
    played.length = 0
    const plain = say(A, 'zh')
    const callout = say(['几'], 'zh', 0, { mode: 'skip' })
    await Promise.all([plain, callout])
    expect(played[played.length - 1]).toBe('-|几')
    expect(played.filter((p) => p === 'zh-jia|加').length).toBeLessThan(2)
  })

  it('wait / hold 在没人排队、正在播的也不必播完时，和默认一样打断', async () => {
    const plain = say(A, 'zh')
    const next = say(B, 'zh', 0, { mode: 'wait', key: 'x' })
    await Promise.all([plain, next])
    expect(played.slice(-2)).toEqual(['-|几', 'zh-dengyu|等于'])
    expect(played.filter((p) => p === 'zh-jia|加').length).toBeLessThan(2)
  })

  it('排在必须播完的后面的人再排队也不被打断（队伍里有人就一直排）', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const blue = say(B, 'zh', 0, { mode: 'hold', key: 'blue' })
    const tip = say(['几'], 'zh', 0, { mode: 'wait', key: 'tip' })
    await Promise.all([red, blue, tip])
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加', '-|几', 'zh-dengyu|等于', '-|几'])
  })

  it('cut（默认）打断必须播完的那句，连排队的一起撤掉；被撤掉的 Promise 也会兑现', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const blue = say(B, 'zh', 0, { mode: 'hold', key: 'blue' })
    const go = say(['几'], 'zh')
    await Promise.all([red, blue, go])
    expect(played[played.length - 1]).toBe('-|几')
    expect(played).not.toContain('zh-dengyu|等于')
  })

  it('forget 撤回还没轮到的那句（提示消失了）；正在播的不动', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const tip = say(['几'], 'zh', 0, { mode: 'wait', key: 'tip' })
    forget('tip')
    await Promise.all([red, tip])
    expect(played).toEqual(['zh-jia|加', 'zh-dengyu|等于', 'zh-jia|加'])
  })

  it('hush 停掉正在播的，排队的也不播了', async () => {
    const red = say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    const blue = say(B, 'zh', 0, { mode: 'hold', key: 'blue' })
    hush()
    await Promise.all([red, blue])
    expect(played).toEqual(['zh-jia|加'])
    // 之后一切照常
    await say(B, 'zh', 0, { mode: 'hold', key: 'blue' })
    expect(played).toEqual(['zh-jia|加', '-|几', 'zh-dengyu|等于'])
  })

  it('静音时排队的也不播', async () => {
    setVoiceEnabled(false)
    await say(A, 'zh', 0, { mode: 'hold', key: 'red' })
    expect(played).toEqual([])
  })
})
