// @vitest-environment happy-dom
// 选项卡按选项的长短排版：数字选项（整数、小数）的字符数给对战紧凑版按作答栏的宽排（num4 / num7 / --num-len）。
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'
import type { Choice } from '@/types/models'

const cards = (labels: string[]): Choice[] => labels.map((label, i) => ({ id: `c${i}`, label }))
const classesOf = (labels: string[], choiceStyle?: 'pinyin'): { cls: string[]; numLen: string } => {
  const w = mount(ChoiceCards, { props: { choices: cards(labels), choiceStyle } })
  const el = w.find('.cards')
  const out = { cls: el.classes(), numLen: (el.element as HTMLElement).style.getPropertyValue('--num-len') }
  w.unmount()
  return out
}

describe('选项卡的长短档', () => {
  it('小数也算数字选项的字符数：4 个以上 num4、7 个以上 num7（对战紧凑版按作答栏的宽排一列）', () => {
    const dec = classesOf(['47.59', '48.59', '485.9', '48.49'])
    expect(dec.cls).toContain('num4')
    expect(dec.cls).not.toContain('num7')
    expect(dec.cls).not.toContain('wordy')
    expect(dec.numLen).toBe('5')
    const long = classesOf(['105.0900', '105.09', '15.09', '1.0509'])
    expect(long.cls).toEqual(expect.arrayContaining(['num4', 'num7', 'digits', 'wordy']))
    expect(long.numLen).toBe('8')
  })

  it('带正负号的数多算一个字符（减号比数字宽）：「−20」按 4 个排一列', () => {
    const neg = classesOf(['−20', '20', '−30', '60'])
    expect(neg.cls).toContain('num4')
    expect(neg.numLen).toBe('4')
    expect(classesOf(['−2', '2', '3', '−3']).cls).not.toContain('num4')
  })

  it('三位以内的数两列照旧；文字选项不算数字', () => {
    expect(classesOf(['3', '12', '125', '99']).cls).not.toContain('num4')
    const text = classesOf(['长方形', '正方形', '三角形', '梯形'])
    expect(text.cls).toContain('wordy')
    expect(text.cls).not.toContain('num4')
    expect(text.numLen).toBe('0')
  })

  it('拼音选项最长 5 个字母以上 py5（对战紧凑版栏窄时排一列，2026-10-11 普查：zhàng 在 135px 的栏里被裁掉最后一个字母）', () => {
    expect(classesOf(['zhǎng', 'zhàng'], 'pinyin').cls).toEqual(expect.arrayContaining(['py5', 'as-pinyin']))
    expect(classesOf(['chuǎng', 'shǎng', 'shuǎng', 'shuāng'], 'pinyin').cls).toContain('py5')
    expect(classesOf(['bā', 'pō', 'mō', 'fó'], 'pinyin').cls).not.toContain('py5')
    // 4 个字母的 py4（打怪兽两人横屏 125px 的栏里两列放不下 dāng / dàng，2026-10-16 普查）
    expect(classesOf(['dāng', 'dàng'], 'pinyin').cls).toEqual(expect.arrayContaining(['py4']))
    expect(classesOf(['dāng', 'dàng'], 'pinyin').cls).not.toContain('py5')
    expect(classesOf(['bā', 'pō', 'mō', 'fó'], 'pinyin').cls).not.toContain('py4')
    // 文字选项不算拼音
    expect(classesOf(['大大的', '小小的', '高高的', '长长的']).cls).not.toContain('py5')
  })

  it('对战紧凑版的作答栏是尺寸容器：栏窄时数字选项排一列、字号按栏宽 ÷ 字符数封顶（2026-10-06 普查：第二列整张卡伸出栏外被裁）', () => {
    const src = readFileSync('src/components/battle/PlayerRow.vue', 'utf8')
    expect(src).toMatch(/\.compact \.a \{\s*container-type: inline-size;/)
    expect(src).toContain('@container (max-width: 160px)')
    expect(src).toContain(':deep(.cards.num4)')
    expect(src).toContain('@container (max-width: 240px)')
    expect(src).toContain(':deep(.cards.num7)')
    expect(src).toContain('var(--num-len)')
    expect(src).toContain(':deep(.cards.py5)')
    expect(src).toContain('@container (max-width: 130px)')
    expect(src).toContain(':deep(.cards.py4)')
  })
})
