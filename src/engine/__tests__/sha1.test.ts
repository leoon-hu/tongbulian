import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { sha1Hex } from '../sha1'
import { clipFile } from '@/audio/clips'
import manifest from '@/audio/manifest.json'

const node = (s: string): string => createHash('sha1').update(s, 'utf8').digest('hex')

describe('sha1Hex（音频文件名用）', () => {
  it('与 node 的 sha1 一致：空串、ASCII、汉字、emoji、跨 64 字节块边界的长串', () => {
    const cases = ['', 'abc', '加', '有14个', '正确答案是14', '🐶比🐷少8个', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), '汉'.repeat(100)]
    for (const c of cases) expect(sha1Hex(c), c).toBe(node(c))
  })

  it('clipFile 与 manifest.json 的对照表一致：表里的每条都找得到、不在表里的找不到', () => {
    const table = manifest as unknown as { zh: Record<string, string>; en: Record<string, string> }
    for (const lang of ['zh', 'en'] as const) {
      const entries = Object.entries(table[lang])
      for (const [text, file] of entries) expect(clipFile(text, lang), text).toBe(file)
      expect(clipFile('这条肯定没有的片段 xyz', lang)).toBeNull()
    }
  })

  it('合成时换过读法的片段（多音字）文件名跟着读法走，clipFile 按别名找到', () => {
    const zh = (manifest as unknown as { zh: Record<string, string> }).zh
    for (const text of ['从前数第', '狮子从前数排第几个', '从上数第3个是谁']) {
      expect(zh[text], text).not.toBe(`zh-${node(text).slice(0, 10)}`)
      expect(clipFile(text, 'zh'), text).toBe(zh[text])
    }
    // 没换读法的还是文本的哈希
    expect(zh['数一数']).toBe(`zh-${node('数一数').slice(0, 10)}`)
  })
})
