import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import '@/content/math/grade2'
import { KNOWLEDGE_POINTS as G1 } from '@/content/math/grade1/curriculum'
import { KNOWLEDGE_POINTS as G2 } from '@/content/math/grade2/curriculum'
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { answerSpeech, numberPieces, PAUSE, piecesOf, questionSpeech, summarySpeech, tokenize } from '@/engine/speech'

const KNOWLEDGE_POINTS = [...G1, ...G2]

describe('tokenize（中文）', () => {
  it('短语里夹着的数并进短语（一条最多一个数），逗号变成停顿标记；数字后面只留量词头，动词 / 连词跟着后一个数走', () => {
    expect(tokenize('13 可以分成 8 和几？', 'zh')).toEqual(['13', '可以分成8和几'])
    expect(tokenize('1 个十和 1 个一，合起来是几？', 'zh')).toEqual(['1个十', '和1个一', PAUSE, '合起来是几'])
    expect(tokenize('比 1 多 1 的数是几？', 'zh')).toEqual(['比1', '多1的数是几'])
    expect(tokenize('9元买了 3 个🧁，每个几元？', 'zh')).toEqual(['9元', '买了3个', translate({ k: 'emoji.🧁' }, 'zh'), PAUSE, '每个几元'])
    expect(tokenize('从 4 时 10 分到 4 时 15 分，经过了几分？', 'zh')).toEqual(['从4时', '10分', '到4时', '15分', PAUSE, '经过了几分'])
    expect(tokenize('3个千、4个百和 5个十组成的数是几？', 'zh')).toEqual(['3个千', '4个百', '和5个十组成的数是几'])
    expect(tokenize('数一数，一共有几个？', 'zh')).toEqual(['数一数', PAUSE, '一共有几个'])
    expect(tokenize('3 时 5 分', 'zh')).toEqual(['3时', '5分'])
    expect(tokenize('有 14 个', 'zh')).toEqual(['有14个'])
    // merge = false 是老的切法，给合并片段缺音频时拆回去用
    expect(tokenize('有 14 个', 'zh', false)).toEqual(['有', '14', '个'])
    expect(tokenize('数一数，一共有几个？', 'zh', false)).toEqual(['数一数', PAUSE, '一共有几个'])
  })

  it('文字题：emoji 名字也并进短语，一条最多一个槽；emoji 后面的动词 / 介词贴向后一个槽，数字后面的量词贴向前一个槽（2026-09-22 用户说「比」听不清）', () => {
    const pig = translate({ k: 'emoji.🐷' }, 'zh')
    const dog = translate({ k: 'emoji.🐶' }, 'zh')
    const apple = translate({ k: 'emoji.🍎' }, 'zh')
    expect(tokenize('🐷 有 14 个🍎，🐶 比 🐷 少 8 个，🐶 有几个？', 'zh')).toEqual([
      pig, '有14个', apple, PAUSE, `${dog}比${pig}`, '少8个', PAUSE, `${dog}有几个`,
    ])
    // 拆回小片段的表：并成的一条记得自己是由什么拼的（emoji 名字并进去后从文本上认不出来）
    expect(piecesOf(`${dog}比${pig}`, 'zh')).toEqual([dog, '比', pig])
    expect(piecesOf('有14个', 'zh')).toEqual(['有', '14', '个'])
    expect(piecesOf('没并过的', 'zh')).toEqual(['没并过的'])
    expect(tokenize('从 🐰 数第 2 个是谁？', 'zh')).toEqual(['从小兔子', '数第2个是谁'])
    // emoji 后面以「的」开头 / 结尾的短语是名词短语的一部分，留在前一条
    const fox = translate({ k: 'emoji.🦊' }, 'zh')
    expect(tokenize('🐶 的个数是 🦊 个数的 4 倍，🐶 有几个？', 'zh')).toEqual([`${dog}的个数是`, `${fox}个数的`, '4倍', PAUSE, `${dog}有几个`])
    expect(tokenize('🥢 的长度大约是 25，单位是厘米还是米？', 'zh')).toEqual([`${translate({ k: 'emoji.🥢' }, 'zh')}的长度大约是`, '25', PAUSE, '单位是厘米还是米'])
    expect(tokenize('2 个🍎和 3 个🍌，一共几个？', 'zh')).toEqual(['两个', apple, '和3个', translate({ k: 'emoji.🍌' }, 'zh'), PAUSE, '一共几个'])
    // 顿号不算停顿也不切开，留在文本里让 TTS 自己停一小下；句末的标点不产生停顿；连着的标点只一个停顿
    expect(tokenize('红、黄、蓝，一共几种？', 'zh')).toEqual(['红、黄、蓝', PAUSE, '一共几种'])
    expect(piecesOf('红、黄、蓝', 'zh')).toEqual(['红', '黄', '蓝'])
    // 两个 emoji 之间恰好一个「比」：并成一条（「比」落在句中；动物池 6 种、最多 30 对）
    expect(tokenize('🐶 比 🐷 多几个？', 'zh')).toEqual([`${dog}比${pig}多几个`])
    expect(tokenize('🐶 有 6 个🎈，🐼 比 🐶 多 8 个，🐼 有几个？', 'zh')).toEqual([
      dog, '有6个', translate({ k: 'emoji.🎈' }, 'zh'), PAUSE, `${translate({ k: 'emoji.🐼' }, 'zh')}比${dog}`, '多8个', PAUSE, `${translate({ k: 'emoji.🐼' }, 'zh')}有几个`,
    ])
    // 量词表的负向前瞻：「分成」「组成」「只有」不是量词
    expect(tokenize('把 7 分成 3 和 4', 'zh')).toEqual(['把7', '分成3', '和4'])
    expect(tokenize('把 12 个🍪平均分成 3 份，每份几个？', 'zh')).toEqual(['把12个', translate({ k: 'emoji.🍪' }, 'zh'), '平均分成3份', PAUSE, '每份几个'])
    expect(tokenize('对吗？…想一想。', 'zh')).toEqual(['对吗', PAUSE, '想一想'])
  })

  it('算式里独立的符号读成字，并贴向后面的数（孤立的「减」和孤立的「比」一样读得又长又重）', () => {
    expect(tokenize('9 + 5 = ?', 'zh')).toEqual(['9', '加5等于几'])
    expect(tokenize('9 + 5 = ?', 'zh', false)).toEqual(['9', '加', '5', '等于几'])
    expect(tokenize('13 - 9 = ?', 'zh')).toEqual(['13', '减9等于几'])
    expect(tokenize('5 ⬜ 3', 'zh')).toEqual(['5', '和3'])
    expect(tokenize('比一比，填 >、< 或 =', 'zh')).toEqual(['比一比', PAUSE, '填大于、小于或等于'])
    expect(tokenize('>', 'zh')).toEqual(['大于'])
  })

  it('2 在量词前读「两」，其它位置读「二」', () => {
    expect(tokenize('2 个十和 3 个一，合起来是几？', 'zh')).toEqual(['两个十', '和3个一', PAUSE, '合起来是几'])
    expect(tokenize('2 个十和 3 个一，合起来是几？', 'zh', false)).toEqual(['两', '个十和', '3', '个一', PAUSE, '合起来是几'])
    expect(tokenize('有 2 排，每排 4 个', 'zh')).toEqual(['有两排', PAUSE, '每排4个'])
    expect(tokenize('平均分成 2 份', 'zh')).toEqual(['平均分成两份'])
    expect(tokenize('比 2 多 1 的数是几？', 'zh')).toEqual(['比2', '多1的数是几'])
    expect(tokenize('2 + 1 = ?', 'zh')).toEqual(['2', '加1等于几'])
    expect(tokenize('12元', 'zh')).toEqual(['12元'])
    expect(tokenize('从左数第 2 个是谁？', 'zh')).toEqual(['从左数第2个是谁'])
  })

  it('emoji 读它的名字，没名字的跳过', () => {
    expect(tokenize('🐰 从左数排第几个？', 'zh')).toEqual(['小兔子从左数排第几个'])
    expect(tokenize('❤️', 'zh')).toEqual(['红心'])
    expect(tokenize('🦄 的左边是谁？', 'zh')).toEqual(['的左边是谁'])
  })

  it('乘除号与小括号读出来（括号紧挨数字也读）', () => {
    expect(tokenize('3 × 4 = ?', 'zh')).toEqual(['3', '乘4等于几'])
    expect(tokenize('24 ÷ 6 = ?', 'zh')).toEqual(['24', '除以6等于几'])
    expect(tokenize('(3 + 4) × 5 = ?', 'zh')).toEqual(['括号3', '加4', '括号乘5等于几'])
    expect(tokenize('(3 + 4) × 5 = ?', 'zh', false)).toEqual(['括号', '3', '加', '4', '括号', '乘', '5', '等于几'])
    expect(tokenize('50 - (12 + 8) = ?', 'zh')).toEqual(['50', '减括号12', '加8括号等于几'])
    expect(tokenize('? × 4 = 24', 'zh')).toEqual(['几乘4', '等于24'])
    expect(tokenize('3 + 3 + 3 = 3 × ?', 'zh')).toEqual(['3', '加3', '加3', '等于3乘几'])
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
    // 拆出来的每一段都是槽：最后一段和后面的短语并成一条，运算符贴上整百整千
    expect(tokenize('3005 后面的一个数是几？', 'zh')).toEqual(['三千', '零', '5后面的一个数是几'])
    expect(tokenize('400 的百位上是几？', 'zh')).toEqual(['四百的百位上是几'])
    expect(tokenize('2000 - 1000 = ?', 'zh')).toEqual(['二千', '减一千等于几'])
    expect(tokenize('? - 102 = 109', 'zh')).toEqual(['几减一百', '零', '2', '等于一百', '零', '9'])
    expect(tokenize('1米和 170厘米', 'zh')).toEqual(['1米', '和一百', '70厘米'])
    // 拆出来的「2」不套「两」的规则：302 个 → 三百零二个
    expect(tokenize('302 个', 'zh')).toEqual(['三百', '零', '2个'])
    expect(numberPieces('3450', 'en')).toEqual(['3', 'thousand', '4', 'hundred', '50'])
    expect(numberPieces('3005', 'en')).toEqual(['3', 'thousand', '5'])
    expect(numberPieces('10000', 'en')).toEqual(['10', 'thousand'])
    expect(numberPieces('6.5', 'zh')).toEqual(['6.5'])
  })

  it('金额按数字与单位拆开', () => {
    expect(tokenize('买东西用了 6元5角，付了 10元，应找回多少？', 'zh')).toEqual([
      '买东西用了6元', '5角', PAUSE, '付了10元', PAUSE, '应找回多少',
    ])
  })
})

describe('tokenize（English）', () => {
  it('words between numbers / punctuation stay together', () => {
    expect(tokenize('Split 13 into 8 and what?', 'en')).toEqual(['Split 13', 'into 8 and what'])
    expect(tokenize('1 tens and 1 ones make what?', 'en')).toEqual(['1 tens', 'and 1 ones make what'])
    // 拆读的 hundred 和后面的短语合起来再取头；more / fewer 留在数字后、than 向前；两个 emoji 之间在纯虚词处切
    expect(tokenize('400 centimeters and 4 meters', 'en')).toEqual(['4 hundred centimeters', 'and 4 meters'])
    expect(tokenize('🐶 has 6 fewer than 🦊.', 'en')).toEqual([translate({ k: 'emoji.🐶' }, 'en'), 'has 6 fewer', `than ${translate({ k: 'emoji.🦊' }, 'en')}`])
    expect(tokenize('How many more does 🦊 have than 🐶?', 'en')).toEqual([`How many more does ${translate({ k: 'emoji.🦊' }, 'en')} have`, `than ${translate({ k: 'emoji.🐶' }, 'en')}`])
    expect(tokenize('which is 3 times as many as 🐰', 'en')).toEqual(['which is 3 times', `as many as ${translate({ k: 'emoji.🐰' }, 'en')}`])
    expect(tokenize('2 children each have 4 🎁. How many in all?', 'en')).toEqual(['2 children', 'each have 4', 'gifts', PAUSE, 'How many in all'])
    expect(tokenize('604 + 323 = ?', 'en')).toEqual(['6 hundred', '4', 'plus 3 hundred', '23 equals what'])
    expect(tokenize('10000', 'en')).toEqual(['10 thousand'])
    expect(tokenize('Look and count — how many in all?', 'en')).toEqual(['Look and count', PAUSE, 'how many in all'])
    // 3:05 里的冒号不是停顿；不到 10 的分钟读「oh 5」
    expect(tokenize('It is 3:05 now', 'en')).toEqual(['It is 3', 'oh 5 now'])
    expect(tokenize('The answer is 3:30', 'en')).toEqual(['The answer is 3', '30'])
  })

  it('hyphenated words and trailing ? are not symbols; standalone ones are', () => {
    expect(tokenize('The ten-frame holds 10 with some more outside — subtract together:', 'en')).toEqual([
      'The ten-frame holds 10 with some more outside', PAUSE, 'subtract together',
    ])
    expect(tokenize('9 + 5 = ?', 'en')).toEqual(['9', 'plus 5 equals what'])
    // 挨着运算符读法的逗号是列举，不停顿
    expect(tokenize('Compare and fill in >, <, or =', 'en')).toEqual(['Compare and fill in greater than less than or equals'])
    expect(tokenize("half past 3", 'en')).toEqual(['half past 3'])
    expect(tokenize("3 o'clock", 'en')).toEqual(["3 o'clock"])
    // 英文金额读成 yuan / jiao
    expect(tokenize('¥6.5', 'en')).toEqual(['6 yuan', '5 jiao'])
    expect(tokenize('It costs ¥1.5. You pay ¥5. How much change?', 'en')).toEqual(['It costs 1 yuan', '5 jiao', PAUSE, 'You pay 5 yuan', PAUSE, 'How much change'])
    expect(tokenize('¥0.5', 'en')).toEqual(['5 jiao'])
  })

  it('English emoji names take the plural after a number / hundred / more / fewer, and after "N rows of"; "than" follows the noun before it; A → An', () => {
    expect(tokenize('🐷 has 14 🍎.', 'en')).toEqual(['piggy', 'has 14', 'apples'])
    expect(tokenize('1 🍎 costs ¥3', 'en')).toEqual(['1', 'apple', 'costs 3 yuan'])
    expect(tokenize('4 rows of ⚽', 'en')).toEqual(['4 rows', 'of soccer balls'])
    expect(tokenize('How many more 🍎 than 🍌?', 'en')).toEqual(['How many more apples', 'than bananas'])
    expect(tokenize('Who is to the left of 🐷?', 'en')).toEqual(['Who is to the left of piggy'])
    expect(tokenize('A ✈️ is about 30', 'en')).toEqual(['An airplane', 'is about 30'])
    expect(tokenize('🐶 has 8 📚', 'en')).toEqual(['puppy', 'has 8', 'books'])
    expect(tokenize('2 🐟 and 3 🦊', 'en')).toEqual(['2', 'fish', 'and 3', 'foxes'])
    expect(tokenize('Share 6 🧁 equally among 3 🧒', 'en')).toEqual(['Share 6', 'cupcakes', 'equally among 3', 'children'])
    expect(tokenize('3 🐰', 'en', false)).toEqual(['3', 'bunnies'])
  })

  it('emoji names in English', () => {
    expect(tokenize('Counting from the left, what place is 🐰?', 'en')).toEqual([
      'Counting from the left', PAUSE, 'what place is bunny',
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
            // 「正确答案是 X」通常并成一条；答案是大数 / 符号时才多于一条
            expect(ans.length, `${kp.id} seed ${seed} ${lang} answer`).toBeGreaterThan(0)
            expect(ans.join(' ').length).toBeGreaterThan(translate({ k: 'practice.answerIs' }, lang).length)
            for (const tok of [...questionSpeech(q, lang), ...ans]) expect(tok).not.toBe('')
          }
        }
      }
    }
  })

  it('题干的文字与算式之间停顿一下；停顿不在开头、不在结尾、不连着', () => {
    let seen = 0
    for (const kp of KNOWLEDGE_POINTS) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 40; seed++) {
        const q = gen(1, createRng(seed))
        const kinds = q.stem.filter((p) => p.kind === 'text' || p.kind === 'expr').map((p) => p.kind)
        const tokens = questionSpeech(q, 'zh')
        expect(tokens[0]).not.toBe(PAUSE)
        expect(tokens[tokens.length - 1]).not.toBe(PAUSE)
        for (let i = 1; i < tokens.length; i++) expect(tokens[i] === PAUSE && tokens[i - 1] === PAUSE).toBe(false)
        if (kinds.includes('text') && kinds.includes('expr')) {
          seen += 1
          expect(tokens).toContain(PAUSE)
        }
      }
    }
    expect(seen).toBeGreaterThan(20)
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

  it('答错读「正确答案是 X」并成一条（数 / emoji 名 / 图形名都并）', () => {
    const gen = getGenerator('s1-04-simple-addsub')!
    const q = gen(1, createRng(3))
    const ans = answerSpeech(q, 'zh')
    expect(ans).toHaveLength(1)
    expect(ans[0]).toMatch(/^正确答案是\d+$/)
    expect(answerSpeech(q, 'en')).toEqual([`The answer is ${q.answer.kind === 'number' ? q.answer.value : ''}`])
  })

  it('结算读成绩', () => {
    expect(summarySpeech(6, 'zh')).toEqual(['闯关完成', PAUSE, '答对6题'])
    expect(summarySpeech(6, 'en')).toEqual(['All done', PAUSE, '6 correct'])
  })
})
