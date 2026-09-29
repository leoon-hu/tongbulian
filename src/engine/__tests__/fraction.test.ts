// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { fractionWords, splitFractions, zhNumberWord } from '../fraction'
import { tokenize } from '../speech'
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
