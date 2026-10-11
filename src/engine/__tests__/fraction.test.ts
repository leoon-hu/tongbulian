// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { fractionWords, mixed, repeating, splitFractions, zhNumberWord } from '../fraction'
import { PAUSE, tokenize } from '../speech'
import MathText from '@/components/ui/MathText.vue'
import '@/content/math/grade1' // 运算符的读法（sym.*）在数学包里

describe('分数（三年级）：写成「3/4」，画成上下两层，读「四分之三」', () => {
  it('中文数字与分数读法：二分之一不读「两」，十以上的分母照读', () => {
    expect([2, 10, 12, 20, 35, 100, 105, 110, 115].map(zhNumberWord)).toEqual(['二', '十', '十二', '二十', '三十五', '一百', '一百零五', '一百一十', '一百一十五'])
    expect(fractionWords(1, 2, 'zh')).toBe('二分之一')
    expect(fractionWords(3, 4, 'zh')).toBe('四分之三')
    expect(fractionWords(5, 12, 'zh')).toBe('十二分之五')
    expect(fractionWords(1, 2, 'en')).toBe('one half')
    expect(fractionWords(3, 2, 'en')).toBe('three halves')
    expect(fractionWords(3, 4, 'en')).toBe('three fourths')
    expect(fractionWords(1, 8, 'en')).toBe('one eighth')
    expect(fractionWords(7, 10, 'en')).toBe('seven tenths')
  })

  it('只认独立的「分子/分母」，日期这类带斜杠的不认', () => {
    expect(splitFractions('1/4 + 2/4 = ?')).toEqual([{ n: '1', d: '4' }, { text: ' + ' }, { n: '2', d: '4' }, { text: ' = ?' }])
    expect(splitFractions('2026/9/28')).toEqual([{ text: '2026/9/28' }])
    expect(splitFractions('没有分数')).toEqual([{ text: '没有分数' }])
    // 句末的句号不影响（英文句子「It is 4/8.」）；小数当分母的不认
    expect(splitFractions('It is 4/8.')).toEqual([{ text: 'It is ' }, { n: '4', d: '8' }, { text: '.' }])
    expect(splitFractions('1/2.5')).toEqual([{ text: '1/2.5' }])
  })

  it('朗读：分数当一个槽并进短语，算式里的分数各读各的', () => {
    expect(tokenize('涂色部分占整个图形的 3/4', 'zh')).toEqual(['涂色部分占整个图形的四分之三'])
    expect(tokenize('1/4 + 2/4 = ?', 'zh')).toEqual(['四分之一', '加四分之二等于几'])
    expect(tokenize('1/2', 'en')).toEqual(['one half'])
    expect(tokenize('It is 4/8.', 'en')).toEqual(['It is four eighths'])
  })

  it('朗读：100 以内的小数也当一个槽并进短语（不然「0.6 元」读成「0.6 / 元」）', () => {
    expect(tokenize('0.6 元 ○ 0.9 元', 'zh')).toEqual(['0.6元', '和0.9元'])
  })

  it('界面：分数画成分子、分母两层', () => {
    const w = mount(MathText, { props: { text: '1/4 + 2/4 = ?' } })
    const fr = w.findAll('.frac')
    expect(fr).toHaveLength(2)
    expect(fr.map((f) => [f.find('.num').text(), f.find('.den').text()])).toEqual([['1', '4'], ['2', '4']])
    expect(w.text().replace(/\s/g, '')).toBe('14+24=?')
    w.unmount()
  })
})

describe('带分数与循环小数（五年级）', () => {
  it('带分数写成「整数 + 细空格 + 分数」，读「二又五分之一」；普通空格不算', () => {
    expect(mixed(2, 1, 5)).toBe('2\u20091/5')
    expect(fractionWords(1, 5, 'zh', 2)).toBe('二又五分之一')
    // 分母 1000（五下「分数与除法」「分数和小数的互化」）
    expect(fractionWords(123, 1000, 'zh')).toBe('一千分之一百二十三')
    expect([1000, 1005, 1010, 1015, 2300].map(zhNumberWord)).toEqual(['一千', '一千零五', '一千零一十', '一千零一十五', '二千三百'])
    expect(tokenize('0.123 = 123/1000', 'zh')).toEqual(['0.123', '等于一千分之一百二十三'])
    expect(splitFractions('133/1000')).toEqual([{ n: '133', d: '1000' }])
    expect(fractionWords(3, 4, 'en', 1)).toBe('one and three fourths')
    expect(splitFractions(`${mixed(2, 1, 5)} > 11/5`)).toEqual([{ n: '1', d: '5', w: '2' }, { text: ' > ' }, { n: '11', d: '5' }])
    expect(splitFractions('第 2 1/4')).toEqual([{ text: '第 2 ' }, { n: '1', d: '4' }])
    expect(tokenize(`7/3 化成带分数是 ${mixed(2, 1, 3)}`, 'zh')).toEqual(['三分之七', '化成带分数是二又三分之一'])
    expect(tokenize(mixed(3, 1, 3), 'en')).toEqual(['three and one third'])
  })

  it('循环小数：循环节首末位上加点，读「七点一四五，四五循环」', () => {
    expect(repeating('7', '1', '45')).toBe('7.14\u03075\u0307')
    expect(repeating('5', '', '3')).toBe('5.3\u0307')
    expect(repeating('0', '', '142857')).toBe('0.1\u030742857\u0307')
    expect(tokenize(`商是 ${repeating('5', '', '3')}`, 'zh')).toEqual(['商是5.3', PAUSE, '三循环'])
    expect(tokenize(repeating('7', '1', '45'), 'zh')).toEqual(['7.145', PAUSE, '四五循环'])
    expect(tokenize(repeating('0', '', '142857'), 'zh')).toEqual(['0.142857', PAUSE, '一四二八五七循环'])
    expect(tokenize(repeating('7', '1', '45'), 'en')).toEqual(['7.145', PAUSE, '4', '5 repeating'])
  })

  it('界面：带分数整数紧挨着上下两层的分数，循环节首末位上面有点', () => {
    const w = mount(MathText, { props: { text: `${mixed(2, 1, 5)} 和 ${repeating('6', '9', '258')}` } })
    expect(w.find('.whole').text()).toBe('2')
    expect(w.find('.frac .num').text()).toBe('1')
    expect(w.findAll('.rep').map((r) => r.text())).toEqual(['2', '8'])
    expect(w.text().replace(/\s/g, '')).toBe('215和6.9258')
    w.unmount()
  })
})

describe('字母式里的字母用斜体（MathText）', () => {
  const vars = (text: string): string[] => {
    const w = mount(MathText, { props: { text } })
    const out = w.findAll('i.var').map((v) => v.text())
    w.unmount()
    return out
  }
  it('算式里的小写字母、公式左边的大写字母是斜体；单位、点的名字、英文句子、拼音不是', () => {
    expect(vars('x × x = x²')).toEqual(['x', 'x', 'x'])
    expect(vars('2 + 2m')).toEqual(['m'])
    expect(vars('S = ah ÷ 2')).toEqual(['S', 'ah'])
    expect(vars('5 m + 3 m = 8 m')).toEqual([])
    expect(vars('AB = 5 cm')).toEqual([])
    expect(vars('What is 3 × 4?')).toEqual([])
    expect(vars('bā')).toEqual([])
  })
})

describe('分数后面的收尾标点（MathText）', () => {
  it('紧跟在分数、带点的数字后面的「，」「。」和它粘在一起（不单独折到下一行行首）', () => {
    const w = mount(MathText, { props: { text: '2/5，' } })
    expect(w.find('.glue').text().replace(/\s/g, '')).toBe('25，')
    w.unmount()
    const r = mount(MathText, { props: { text: `${repeating('5', '', '3')}。后面` } })
    expect(r.find('.glue').text()).toBe('3。')
    expect(r.text()).toContain('后面')
    r.unmount()
  })
})
