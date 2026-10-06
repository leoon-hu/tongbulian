// @vitest-environment happy-dom
// 选项卡按选项的长短排版：数字选项（整数、小数）的字符数给对战紧凑版按作答栏的宽排（num4 / num7 / --num-len）。
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mount } from '@vue/test-utils'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'
import type { Choice } from '@/types/models'

const cards = (labels: string[]): Choice[] => labels.map((label, i) => ({ id: `c${i}`, label }))
const classesOf = (labels: string[]): { cls: string[]; numLen: string } => {
  const w = mount(ChoiceCards, { props: { choices: cards(labels) } })
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

  it('三位以内的数两列照旧；文字选项不算数字', () => {
    expect(classesOf(['3', '12', '125', '99']).cls).not.toContain('num4')
    const text = classesOf(['长方形', '正方形', '三角形', '梯形'])
    expect(text.cls).toContain('wordy')
    expect(text.cls).not.toContain('num4')
    expect(text.numLen).toBe('0')
  })

  it('对战紧凑版的作答栏是尺寸容器：栏窄时数字选项排一列、字号按栏宽 ÷ 字符数封顶（2026-10-06 普查：第二列整张卡伸出栏外被裁）', () => {
    const src = readFileSync('src/components/battle/PlayerRow.vue', 'utf8')
    expect(src).toMatch(/\.compact \.a \{\s*container-type: inline-size;/)
    expect(src).toContain('@container (max-width: 160px)')
    expect(src).toContain(':deep(.cards.num4)')
    expect(src).toContain('@container (max-width: 240px)')
    expect(src).toContain(':deep(.cards.num7)')
    expect(src).toContain('var(--num-len)')
  })
})
