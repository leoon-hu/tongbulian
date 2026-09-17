import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { RoundState } from '@/types/models'
import { ROUND_SIZE } from '@/engine'
import { loadState, saveState } from '@/engine/storage'

export const useProgressStore = defineStore('progress', () => {
  const persisted = loadState()
  const completed = ref<Record<string, boolean>>(persisted.progress.completed)
  const rounds = ref<Record<string, RoundState>>(persisted.progress.rounds)

  watch(
    [completed, rounds],
    () => saveState({ progress: { completed: completed.value, rounds: rounds.value } }),
    { deep: true },
  )

  function isCompleted(kpId: string): boolean {
    return completed.value[kpId] === true
  }

  /** 做完一整轮练习即标记为已完成（只增不减）。 */
  function markCompleted(kpId: string): void {
    if (!completed.value[kpId]) completed.value[kpId] = true
  }

  /**
   * 手动切换完成状态（家长可不做题直接标记/取消）。取消时删键，避免残留 false；
   * 取消一个已做满一轮的知识点等于「重来」，把那一轮的记录也清掉（做到一半的保留，下次接着做）。
   */
  function toggleCompleted(kpId: string): void {
    if (completed.value[kpId]) {
      delete completed.value[kpId]
      if (isRoundFinished(kpId)) delete rounds.value[kpId]
    } else {
      completed.value[kpId] = true
    }
  }

  /** 当前这一轮（没做过就是 undefined）。 */
  function roundOf(kpId: string): RoundState | undefined {
    return rounds.value[kpId]
  }

  /** 这一轮逐题的对错（按答题顺序；没做过就是空数组），进度点 / 进度条按它上色。 */
  function resultsOf(kpId: string): boolean[] {
    return rounds.value[kpId]?.results ?? []
  }

  /** 这一轮已答几题，地图进度条与统计用。 */
  function answeredOf(kpId: string): number {
    return Math.min(resultsOf(kpId).length, ROUND_SIZE)
  }

  /** 这一轮是否已做满：做满的下次进来要开新的一轮。 */
  function isRoundFinished(kpId: string): boolean {
    return answeredOf(kpId) >= ROUND_SIZE
  }

  /** 这一轮的统计：总数（已答）/ 对 / 错。 */
  function statsOf(kpId: string): { total: number; correct: number; wrong: number } {
    const results = resultsOf(kpId)
    const correct = results.filter(Boolean).length
    return { total: results.length, correct, wrong: results.length - correct }
  }

  /** 开始新的一轮：记下 seed（能复现同一组题），逐题记录清空。 */
  function startRound(kpId: string, seed: number): void {
    rounds.value[kpId] = { seed, results: [] }
  }

  /** 答了一题：按顺序记下对错。 */
  function answer(kpId: string, correct: boolean): void {
    const r = rounds.value[kpId]
    if (!r || r.results.length >= ROUND_SIZE) return
    rounds.value[kpId] = { ...r, results: [...r.results, correct] }
  }

  /** 做完一整轮：标记已完成（不看正确率）；这一轮的记录留着给地图看，下次进来会开新的一轮。 */
  function finishRound(kpId: string): void {
    markCompleted(kpId)
  }

  return {
    completed,
    rounds,
    isCompleted,
    markCompleted,
    toggleCompleted,
    roundOf,
    resultsOf,
    answeredOf,
    isRoundFinished,
    statsOf,
    startRound,
    answer,
    finishRound,
  }
})
