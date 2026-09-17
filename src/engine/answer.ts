import type { LStr, Question } from '@/types/models'
import { t } from '@/engine/i18n'

export function checkAnswer(question: Question, given: unknown): boolean {
  switch (question.answer.kind) {
    case 'number':
      return typeof given === 'number' && given === question.answer.value
    case 'choice':
      return given === question.answer.choiceId
  }
}

/** 正确答案的可本地化文本（答错反馈渲染拼音 / 朗读用）：数值原样，选项取其标签。 */
export function answerLabel(question: Question): LStr {
  switch (question.answer.kind) {
    case 'number':
      return String(question.answer.value)
    case 'choice': {
      const id = question.answer.choiceId
      return question.choices?.find((c) => c.id === id)?.label ?? ''
    }
  }
}

/** 正确答案的展示文本（按当前语言） */
export function answerText(question: Question): string {
  return t(answerLabel(question))
}
