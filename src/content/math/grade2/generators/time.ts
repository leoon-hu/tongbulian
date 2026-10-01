import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 时间在哪里（二下 ☆）：几时几分（钟面、电子表）、时分秒（大格小格、转一圈、换算）、我与时间的故事（选时间单位）
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
/** 电子表的写法：8:05、12:30（p3 电子表 12:00、12:30、1:00；p6 作息表 8:20） */
const digital = (hour: number, minute: number): string => `${norm(hour)}:${String(minute).padStart(2, '0')}`

function genTimeRead(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-01-time-read'
  const roll = rng.next()
  if (roll < 0.2) {
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
  if (roll < 0.35) {
    // 钟面上的时间用电子表怎么写
    const wrong = timeDistractors(hour, minute).map((l) => {
      const p = typeof l === 'string' ? {} : (l.p ?? {})
      return digital(Number(p.hour), Number(p.minute))
    })
    return labelQuestion({
      kpId,
      type: 'time',
      difficulty: d,
      sig: `digital-${hour}-${minute}`,
      stem: [
        { kind: 'text', text: { k: 'q.time.digital' } },
        { kind: 'clock', hour, minute },
      ],
      correct: digital(hour, minute),
      distractors: wrong,
      rng,
    })
  }
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

// ── 时、分、秒（p2–3：钟面上的大格小格、时针分针秒针转一圈、1 时 = 60 分、1 分 = 60 秒、半小时、半分钟）──
// 课本没有「再过几分 / 经过几分」的方法（时间小书只让孩子提问题），不出；2 时以上的换算要算 60 × 2，也不出。
const FACTS: { key: string; value: number; n?: number }[] = [
  { key: 'q.time.bigTick', value: 5 },
  { key: 'q.time.smallTick', value: 1 },
  { key: 'q.time.round', value: 60 },
  { key: 'q.time.hourTick', value: 1 },
  { key: 'q.time.hourRound', value: 12 },
  { key: 'q.time.secTick', value: 1 },
  { key: 'q.time.secRound', value: 60 },
  { key: 'q.time.hourToMin', value: 60, n: 1 },
  { key: 'q.time.minToHour', value: 1, n: 60 },
  { key: 'q.time.minToSec', value: 60, n: 1 },
  { key: 'q.time.secToMin', value: 1, n: 60 },
  { key: 'q.time.halfHour', value: 30 },
  { key: 'q.time.halfMin', value: 30 },
]

function genTimeCalc(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-01-time-calc'
  const f = rng.pick(FACTS)
  return numberQuestion({
    kpId,
    type: 'time',
    difficulty: d,
    sig: f.key,
    stem: [{ kind: 'text', text: f.n === undefined ? { k: f.key } : { k: f.key, p: { n: f.n } } }],
    value: f.value,
    rng,
    min: 1,
    max: 100,
    smart: [5, 1, 60, 12, 30, 100].filter((x) => x !== f.value),
  })
}
defineGenerator('m2s2-01-time-calc', genTimeCalc)

// ── 我与时间的故事（p5–6「找一找」：50 米跑 11 秒、一千米跑 3 分 50 秒、马拉松 3 小时）：选时间单位 ──
export const ACTS: { key: string; n: number; unit: 'hour' | 'minute' | 'second' }[] = [
  { key: 'run50', n: 11, unit: 'second' },
  { key: 'blink', n: 1, unit: 'second' },
  { key: 'clap', n: 1, unit: 'second' },
  { key: 'run1000', n: 4, unit: 'minute' },
  { key: 'brush', n: 3, unit: 'minute' },
  { key: 'lesson', n: 40, unit: 'minute' },
  { key: 'lunch', n: 20, unit: 'minute' },
  { key: 'song', n: 2, unit: 'minute' },
  { key: 'marathon', n: 3, unit: 'hour' },
  { key: 'movie', n: 2, unit: 'hour' },
  { key: 'school', n: 4, unit: 'hour' },
  { key: 'train', n: 5, unit: 'hour' },
]

function genTimeStory(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-01-time-story'
  const act = rng.pick(ACTS)
  const units = ['hour', 'minute', 'second'] as const
  return labelQuestion({
    kpId,
    type: 'time',
    difficulty: d,
    sig: `unit-${act.key}`,
    stem: [{ kind: 'text', text: { k: 'q.time.unit', p: { what: { k: `q.time.act.${act.key}` }, n: act.n } } }],
    correct: { k: `opt.${act.unit}` },
    distractors: units.filter((u) => u !== act.unit).map((u) => ({ k: `opt.${u}` })),
    rng,
  })
}
defineGenerator('m2s2-01-time-story', genTimeStory)
