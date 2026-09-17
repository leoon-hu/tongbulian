import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion } from '@/engine'

/** 规范化到 1~12 时、整/半，作为时刻的唯一标识（去重与出标签共用）。 */
function canon(hour: number, minute: number): { h: number; m: number } {
  return { h: ((hour + 11) % 12) + 1, m: minute === 30 ? 30 : 0 }
}

function clockLabel(h: number, m: number): LStr {
  return { k: 'clock.time', p: { hour: h, minute: m } }
}

/**
 * 认识钟表（整时 / 半时）：显示钟面，选出正确时刻。
 * 干扰项刻意包含「差半小时」「差 1 小时」——这两处正是孩子最常读错的地方。
 */
function genClock(d: Difficulty, rng: RNG): Question {
  const hour = rng.int(1, 12)
  const minute = d === 1 ? 0 : rng.chance(0.5) ? 0 : 30
  const correct = canon(hour, minute)
  const correctKey = `${correct.h}:${correct.m}`

  const candidates: [number, number][] = [
    [hour, minute === 0 ? 30 : 0], // 同一小时，整/半互换
    [(hour % 12) + 1, minute], // 后一小时
    [((hour + 10) % 12) + 1, minute], // 前一小时
    [(hour % 12) + 1, minute === 0 ? 30 : 0],
  ]
  const distractors: LStr[] = []
  const seen = new Set<string>([correctKey])
  for (const [h, m] of candidates) {
    const c = canon(h, m)
    const key = `${c.h}:${c.m}`
    if (!seen.has(key) && distractors.length < 3) {
      seen.add(key)
      distractors.push(clockLabel(c.h, c.m))
    }
  }

  return labelQuestion({
    kpId: 'm2s2-01-clock-hour',
    type: 'clock-read',
    difficulty: d,
    sig: `clk-${hour}-${minute}`,
    stem: [
      { kind: 'text', text: { k: 'q.whatTime' } },
      { kind: 'clock', hour, minute },
    ],
    correct: clockLabel(correct.h, correct.m),
    distractors,
    rng,
  })
}

defineGenerator('m2s2-01-clock-hour', genClock)
