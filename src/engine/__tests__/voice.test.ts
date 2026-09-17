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

const { say, setVoiceEnabled, clipFor, hush } = await import('@/engine/voice')

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

  it('clipFor 按语言查 manifest', () => {
    expect(clipFor('加', 'zh')).toBe('zh-jia')
    expect(clipFor('加', 'en')).toBeNull()
    expect(clipFor('没有的', 'zh')).toBeNull()
  })
})
