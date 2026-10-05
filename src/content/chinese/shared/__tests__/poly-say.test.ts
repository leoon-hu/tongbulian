import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import '@/content/chinese/grade1'
import '@/content/chinese/grade2'
import '@/content/chinese/grade3'
import { LESSONS as L1 } from '@/content/chinese/grade1/generators'
import { LESSONS as L2 } from '@/content/chinese/grade2/generators'
import { LESSONS as L3 } from '@/content/chinese/grade3/generators'
import { PY as PY1 } from '@/content/chinese/grade1/py'
import { PY as PY2 } from '@/content/chinese/grade2/py'
import { PY as PY3 } from '@/content/chinese/grade3/py'
import { POLY_SAY, clozeAnswerPy, parseCloze, parseZi } from '../makers'

const GRADES = [
  { name: '一年级', lessons: L1, py: PY1 },
  { name: '二年级', lessons: L2, py: PY2 },
  { name: '三年级', lessons: L3, py: PY3 },
]

describe('多音字读哪个词（POLY_SAY，Y6）', () => {
  it('生字与填空答案里的多音字：本课的读音有对应的词（不然会按别的读音读出来）', () => {
    const missing: string[] = []
    for (const g of GRADES) {
      const py = (t: string): string => {
        const p = g.py[t]
        if (p === undefined) throw new Error(`拼音表里没有：${t}`)
        return p
      }
      for (const spec of g.lessons) {
        const { chars, reading } = parseZi(spec.zi)
        for (const c of chars) {
          const r = reading[c] ?? g.py[c]
          if (POLY_SAY[c] && r !== undefined && !POLY_SAY[c]![r]) missing.push(`${g.name} ${spec.kp} 生字「${c}」读 ${r}`)
        }
        for (const s of spec.cloze ?? []) {
          const it = parseCloze(s)
          const r = clozeAnswerPy({ py }, it)
          if (r !== undefined && POLY_SAY[it.answer] && !POLY_SAY[it.answer]![r]) missing.push(`${g.name} ${spec.kp} 填空「${it.text}」的「${it.answer}」读 ${r}`)
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('词的末尾就是这个字；合成脚本 POLY_TAIL 换末尾的词都还在表里（改了词要同步）', () => {
    const phrases = new Set<string>()
    for (const [c, byPy] of Object.entries(POLY_SAY)) {
      for (const w of Object.values(byPy)) {
        expect(w.endsWith(`的${c}`), w).toBe(true)
        phrases.add(w)
      }
    }
    const script = readFileSync(new URL('../../../../../scripts/build-audio.py', import.meta.url), 'utf8')
    const table = /POLY_TAIL[^{]*\{([^}]*)\}/.exec(script)![1]!
    const tails = [...table.matchAll(/"([^"]+)":\s*"(.)"/g)]
    expect(tails.length).toBeGreaterThan(10)
    for (const [, w, h] of tails) {
      expect(phrases.has(w!), `POLY_TAIL 的「${w}」不在 POLY_SAY 里`).toBe(true)
      expect(h, w).not.toBe(w!.slice(-1))
    }
  })
})
