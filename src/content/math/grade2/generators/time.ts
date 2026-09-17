import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 认识时间：几时几分（钟面）、时与分（换算、分针走格、时间的推算）
// ─────────────────────────────────────────────────────────────

function norm(hour: number): number {
  return ((hour + 11) % 12) + 1
}

function timeLabel(hour: number, minute: number): LStr {
  return { k: 'time.hm', p: { hour: norm(hour), minute } }
}

/** 几时几分的干扰项：时针读到下一格、分针差 5 分、把分针指的数当成分钟数；互异且不等于正确时刻 */
function timeDistractors(hour: number, minute: number): LStr[] {
  const seen = new Set<string>([`${norm(hour)}:${minute}`])
  const out: LStr[] = []
  const push = (h: number, m: number): void => {
    const hh = norm(h)
    const mm = ((m % 60) + 60) % 60
    const key = `${hh}:${mm}`
    if (!seen.has(key) && out.length < 3) {
      seen.add(key)
      out.push(timeLabel(hh, mm))
    }
  }
  push(hour + 1, minute)
  if (minute % 5 === 0 && minute !== 0) push(hour, minute / 5)
  push(hour, minute + 5)
  push(hour, minute - 5)
  push(hour - 1, minute)
  push(hour + 1, minute + 5)
  return out
}

// ── 认识几时几分 ──
function genTimeRead(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-01-time-read'
  if (rng.chance(0.25)) {
    // 分针指着 k，是几分
    const k = rng.int(1, 11)
    return numberQuestion({
      kpId,
      type: 'time',
      difficulty: d,
      sig: `hand-${k}`,
      stem: [
        { kind: 'text', text: { k: 'q.time.minuteHand', p: { k } } },
        { kind: 'clock', hour: 12, minute: k * 5 },
      ],
      value: k * 5,
      rng,
      min: 1,
      max: 60,
      smart: [k, k * 5 + 5, k * 5 - 5, k * 10],
      input: 'numpad',
    })
  }
  const hour = rng.int(1, 12)
  const minute = d === 1 ? rng.int(1, 11) * 5 : d === 2 ? rng.int(0, 11) * 5 : rng.int(1, 59)
  return labelQuestion({
    kpId,
    type: 'time',
    difficulty: d,
    sig: `read-${hour}-${minute}`,
    stem: [
      { kind: 'text', text: { k: 'q.time.read' } },
      { kind: 'clock', hour, minute },
    ],
    correct: timeLabel(hour, minute),
    distractors: timeDistractors(hour, minute),
    rng,
  })
}
defineGenerator('m2s2-01-time-read', genTimeRead)

// ── 时与分 ──
const FACTS: { key: string; value: number }[] = [
  { key: 'q.time.bigTick', value: 5 },
  { key: 'q.time.smallTick', value: 1 },
  { key: 'q.time.round', value: 60 },
  { key: 'q.time.hourTick', value: 1 },
]

function genTimeCalc(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-01-time-calc'
  const roll = rng.next()
  if (roll < 0.2) {
    const f = rng.pick(FACTS)
    return numberQuestion({
      kpId,
      type: 'time',
      difficulty: d,
      sig: f.key,
      stem: [{ kind: 'text', text: { k: f.key } }],
      value: f.value,
      rng,
      min: 1,
      max: 60,
      smart: [5, 1, 60, 12],
    })
  }
  if (roll < 0.45) {
    // 时 ↔ 分
    const n = d === 1 ? 1 : rng.int(1, 3)
    if (rng.chance(0.5)) {
      return numberQuestion({
        kpId,
        type: 'time',
        difficulty: d,
        sig: `h2m-${n}`,
        stem: [{ kind: 'text', text: { k: 'q.time.hourToMin', p: { n } } }],
        value: n * 60,
        rng,
        min: 1,
        max: 200,
        smart: [n * 100, n * 60 + 60, n * 60 - 60, n * 10],
      })
    }
    return numberQuestion({
      kpId,
      type: 'time',
      difficulty: d,
      sig: `m2h-${n}`,
      stem: [{ kind: 'text', text: { k: 'q.time.minToHour', p: { n: n * 60 } } }],
      value: n,
      rng,
      min: 1,
      max: 12,
      smart: [n + 1, n - 1, n * 6, n * 10],
    })
  }
  const hour = rng.int(1, 12)
  if (roll < 0.75) {
    // 再过 k 分是几时几分（d3 会跨过整点）
    const step = rng.pick([5, 10, 15, 20, 30])
    const minute = d === 3 ? rng.int(Math.max(0, (60 - step) / 5), 11) * 5 : rng.int(0, (55 - step) / 5) * 5
    const total = minute + step
    const h2 = hour + Math.floor(total / 60)
    const m2 = total % 60
    return labelQuestion({
      kpId,
      type: 'time',
      difficulty: d,
      sig: `after-${hour}-${minute}-${step}`,
      stem: [
        { kind: 'text', text: { k: 'q.time.after', p: { t: timeLabel(hour, minute), k: step } } },
        { kind: 'clock', hour, minute },
      ],
      correct: timeLabel(h2, m2),
      distractors: timeDistractors(h2, m2),
      rng,
    })
  }
  // 从 t1 到 t2 经过了几分（同一小时内）
  const m1 = rng.int(0, 9) * 5
  const m2 = rng.int(m1 / 5 + 1, 11) * 5
  return numberQuestion({
    kpId,
    type: 'time',
    difficulty: d,
    sig: `elapsed-${hour}-${m1}-${m2}`,
    stem: [{ kind: 'text', text: { k: 'q.time.elapsed', p: { t1: timeLabel(hour, m1), t2: timeLabel(hour, m2) } } }],
    value: m2 - m1,
    rng,
    min: 1,
    max: 60,
    smart: [m2 - m1 + 5, m2 - m1 - 5, m2, (m2 - m1) / 5],
  })
}
defineGenerator('m2s2-01-time-calc', genTimeCalc)
