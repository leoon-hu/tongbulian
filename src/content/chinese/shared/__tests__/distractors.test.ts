import { describe, expect, it } from 'vitest'
import type { Question, StemPart } from '@/types/models'
import '@/content/chinese/grade1'
import '@/content/chinese/grade2'
import { KNOWLEDGE_POINTS as C1 } from '@/content/chinese/grade1/curriculum'
import { KNOWLEDGE_POINTS as C2 } from '@/content/chinese/grade2/curriculum'
import { createRng, getGenerator } from '@/engine'
import { answerLabel } from '@/engine/answer'
import { translate } from '@/engine/i18n'
import { READINGS } from '../readings'
import { readingsOf, sameSound } from '../makers'

const KPS = [...C1, ...C2]
const zh = (q: Question['choices'] extends (infer C)[] | undefined ? C : never): string => translate(q.label, 'zh')
function part<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === kind)
}

describe('干扰项不会让一道题有两个对的选项（按 READINGS 的全部读音）', () => {
  it('听音选字没有同音的干扰字；看拼音选字的干扰字读不成卡上的音；看字选读音的干扰项不是这个字别的读音；用到的字都在读音表里', () => {
    const bad: string[] = []
    const missing = new Set<string>()
    for (const kp of KPS) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 80; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const m = q.id.split(':')[1]!.split('-')[0]
          if (m !== 'listen' && m !== 'pyzi' && m !== 'zipy') continue
          const ans = translate(answerLabel(q), 'zh')
          const others = (q.choices ?? []).map(zh).filter((x) => x !== ans)
          if (m === 'listen') {
            for (const x of [ans, ...others]) if (!READINGS[x]) missing.add(x)
            for (const x of others) if (sameSound(x, ans)) bad.push(`${q.id}：「${x}」和「${ans}」同音`)
          } else if (m === 'pyzi') {
            const py = part(q, 'pinyin')!.text
            for (const x of others) {
              if (!READINGS[x]) missing.add(x)
              if (readingsOf(x).includes(py)) bad.push(`${q.id}：「${x}」也读 ${py}`)
            }
          } else {
            const c = part(q, 'hanzi')!.text
            if (!READINGS[c]) missing.add(c)
            for (const x of others) if (readingsOf(c).includes(x)) bad.push(`${q.id}：${x} 也是「${c}」的读音`)
          }
        }
      }
    }
    expect([...missing]).toEqual([])
    expect([...new Set(bad)]).toEqual([])
  })
})
