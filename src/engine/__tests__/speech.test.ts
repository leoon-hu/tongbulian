import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import '@/content/math/grade2'
import { KNOWLEDGE_POINTS as G1 } from '@/content/math/grade1/curriculum'
import { KNOWLEDGE_POINTS as G2 } from '@/content/math/grade2/curriculum'
import { createRng, getGenerator } from '@/engine'
import { answerSpeech, numberPieces, questionSpeech, summarySpeech, tokenize } from '@/engine/speech'

const KNOWLEDGE_POINTS = [...G1, ...G2]

describe('tokenize（中文）', () => {
  it('数字、汉字短语按顺序切开，标点只断句', () => {
    expect(tokenize('13 可以分成 8 和几？', 'zh')).toEqual(['13', '可以分成', '8', '和几'])
    expect(tokenize('数一数，一共有几个？', 'zh')).toEqual(['数一数', '一共有几个'])
  })

  it('算式里独立的符号读成字', () => {
    expect(tokenize('9 + 5 = ?', 'zh')).toEqual(['9', '加', '5', '等于几'])
    expect(tokenize('13 - 9 = ?', 'zh')).toEqual(['13', '减', '9', '等于几'])
    expect(tokenize('5 ⬜ 3', 'zh')).toEqual(['5', '和', '3'])
    expect(tokenize('比一比，填 >、< 或 =', 'zh')).toEqual(['比一比', '填', '大于', '小于', '或', '等于'])
    expect(tokenize('>', 'zh')).toEqual(['大于'])
  })

  it('2 在量词前读「两」，其它位置读「二」', () => {
    expect(tokenize('2 个十和 3 个一，合起来是几？', 'zh')).toEqual(['两', '个十和', '3', '个一', '合起来是几'])
    expect(tokenize('比 2 多 1 的数是几？', 'zh')).toEqual(['比', '2', '多', '1', '的数是几'])
    expect(tokenize('2 + 1 = ?', 'zh')).toEqual(['2', '加', '1', '等于几'])
    expect(tokenize('12元', 'zh')).toEqual(['12', '元'])
    expect(tokenize('从左数第 2 个是谁？', 'zh')).toEqual(['从左数第', '2', '个是谁'])
  })

  it('emoji 读它的名字，没名字的跳过', () => {
    expect(tokenize('🐰 从左数排第几个？', 'zh')).toEqual(['小兔子', '从左数排第几个'])
    expect(tokenize('❤️', 'zh')).toEqual(['红心'])
    expect(tokenize('🦄 的左边是谁？', 'zh')).toEqual(['的左边是谁'])
  })

  it('乘除号与小括号读出来（括号紧挨数字也读）', () => {
    expect(tokenize('3 × 4 = ?', 'zh')).toEqual(['3', '乘', '4', '等于几'])
    expect(tokenize('24 ÷ 6 = ?', 'zh')).toEqual(['24', '除以', '6', '等于几'])
    expect(tokenize('(3 + 4) × 5 = ?', 'zh')).toEqual(['括号', '3', '加', '4', '括号', '乘', '5', '等于几'])
    expect(tokenize('50 - (12 + 8) = ?', 'zh')).toEqual(['50', '减', '括号', '12', '加', '8', '括号', '等于几'])
    expect(tokenize('? × 4 = 24', 'zh')).toEqual(['几', '乘', '4', '等于', '24'])
    expect(tokenize('3 + 3 + 3 = 3 × ?', 'zh')).toEqual(['3', '加', '3', '加', '3', '等于', '3', '乘', '几'])
  })

  it('100 以上的数按位拆读（课本读法），不给每个数单独一条音频', () => {
    expect(numberPieces('100', 'zh')).toEqual(['100'])
    expect(numberPieces('105', 'zh')).toEqual(['一百', '零', '5'])
    expect(numberPieces('110', 'zh')).toEqual(['一百', '一十'])
    expect(numberPieces('315', 'zh')).toEqual(['三百', '一十', '5'])
    expect(numberPieces('345', 'zh')).toEqual(['三百', '45'])
    expect(numberPieces('1000', 'zh')).toEqual(['一千'])
    expect(numberPieces('1200', 'zh')).toEqual(['一千', '二百'])
    expect(numberPieces('1020', 'zh')).toEqual(['一千', '零', '20'])
    expect(numberPieces('1002', 'zh')).toEqual(['一千', '零', '2'])
    expect(numberPieces('3005', 'zh')).toEqual(['三千', '零', '5'])
    expect(numberPieces('3450', 'zh')).toEqual(['三千', '四百', '50'])
    expect(numberPieces('9999', 'zh')).toEqual(['九千', '九百', '99'])
    expect(numberPieces('10000', 'zh')).toEqual(['一万'])
    expect(tokenize('3005 后面的一个数是几？', 'zh')).toEqual(['三千', '零', '5', '后面的一个数是几'])
    // 拆出来的「2」不套「两」的规则：302 个 → 三百零二个
    expect(tokenize('302 个', 'zh')).toEqual(['三百', '零', '2', '个'])
    expect(numberPieces('3450', 'en')).toEqual(['3', 'thousand', '4', 'hundred', '50'])
    expect(numberPieces('3005', 'en')).toEqual(['3', 'thousand', '5'])
    expect(numberPieces('10000', 'en')).toEqual(['10', 'thousand'])
    expect(numberPieces('6.5', 'zh')).toEqual(['6.5'])
  })

  it('金额按数字与单位拆开', () => {
    expect(tokenize('买东西用了 6元5角，付了 10元，应找回多少？', 'zh')).toEqual([
      '买东西用了', '6', '元', '5', '角', '付了', '10', '元', '应找回多少',
    ])
  })
})

describe('tokenize（English）', () => {
  it('words between numbers / punctuation stay together', () => {
    expect(tokenize('Split 13 into 8 and what?', 'en')).toEqual(['Split', '13', 'into', '8', 'and what'])
    expect(tokenize('Look and count — how many in all?', 'en')).toEqual(['Look and count', 'how many in all'])
  })

  it('hyphenated words and trailing ? are not symbols; standalone ones are', () => {
    expect(tokenize('The ten-frame holds 10 with some more outside — subtract together:', 'en')).toEqual([
      'The ten-frame holds', '10', 'with some more outside', 'subtract together',
    ])
    expect(tokenize('9 + 5 = ?', 'en')).toEqual(['9', 'plus', '5', 'equals what'])
    expect(tokenize('Compare and fill in >, <, or =', 'en')).toEqual([
      'Compare and fill in', 'greater than', 'less than', 'or', 'equals',
    ])
    expect(tokenize("half past 3", 'en')).toEqual(['half past', '3'])
    expect(tokenize("3 o'clock", 'en')).toEqual(['3', "o'clock"])
    expect(tokenize('¥6.5', 'en')).toEqual(['6.5'])
  })

  it('emoji names in English', () => {
    expect(tokenize('Counting from the left, what place is 🐰?', 'en')).toEqual([
      'Counting from the left', 'what place is', 'bunny',
    ])
  })
})

describe('questionSpeech / answerSpeech', () => {
  it('每个知识点每道题都读得出至少一个片段，答案也读得出', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 60; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          for (const lang of ['zh', 'en'] as const) {
            expect(questionSpeech(q, lang).length, `${kp.id} seed ${seed} ${lang}`).toBeGreaterThan(0)
            const ans = answerSpeech(q, lang)
            expect(ans.length, `${kp.id} seed ${seed} ${lang} answer`).toBeGreaterThan(1)
            for (const tok of [...questionSpeech(q, lang), ...ans]) expect(tok).not.toBe('')
          }
        }
      }
    }
  })

  it('题干里的 emoji 都有名字（否则朗读会少一个主语）', () => {
    for (const kp of KNOWLEDGE_POINTS) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 60; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        for (const c of q.choices ?? []) {
          if (typeof c.label === 'string' && /\p{Extended_Pictographic}/u.test(c.label)) {
            expect(tokenize(c.label, 'zh'), `${kp.id} 选项 ${c.label} 没有中文名`).toHaveLength(1)
            expect(tokenize(c.label, 'en'), `${kp.id} 选项 ${c.label} 没有英文名`).toHaveLength(1)
          }
        }
      }
    }
  })

  it('结算读成绩', () => {
    expect(summarySpeech(6, 'zh')).toEqual(['闯关完成', '答对', '6', '题'])
    expect(summarySpeech(6, 'en')).toEqual(['All done', '6', 'correct'])
  })
})
