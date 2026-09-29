import { describe, expect, it } from 'vitest'
import { createRng } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { BossFighter, BossGameEvent, BossGameState, BossStage } from '@/battle/game/boss-contract'
import { BOSS_POKE_TARGETS } from '@/battle/game/boss-contract'
import { boxerTop } from '@/battle/game/sprites/boxer'
import { stubCanvas, stubCtx } from '@/battle/game/__tests__/stub'
import { drawLink, hpTickEvery } from '@/battle/game/sprites/ring'
import {
  answer,
  beginPlay,
  bossHp,
  createTimed,
  pause,
  resume,
  setInput,
  tick,
  type BossSide,
  type TimedMatch,
  type TimedPlayerInit,
  type TimedVariant,
} from '@/battle/timed'
import { createDinoGame } from '..'
import {
  BOXER_K,
  BUBBLE_AGAIN,
  BUBBLE_BLOW,
  BUBBLE_FIRST,
  BUBBLE_POP_AT,
  DANCE_TIME,
  DinoModel,
  ENERGY_AT,
  ENERGY_CAP,
  ENTER_TIME,
  FLEX_TIME,
  HIT_AT,
  JELLY_LAND,
  JELLY_THROW,
  JELLY_TIME,
  KO_DROP_DELAY,
  LINK_FLASH,
  LINK_TIME,
  MOVE_TIME,
  RECONCILE_WAIT,
  ROAR_OPEN,
  ROAR_TIME,
  SPIN_TIME,
  layoutStage,
  type Box,
  type Fighter,
} from '../model'
import { COIL_SPIN_TIME } from '../moves'
import { renderBackground, renderDynamic } from '../render'

const fighter = (id: string, team: Team, o: Partial<BossFighter> = {}): BossFighter => ({
  id,
  team,
  robot: false,
  streak: 0,
  input: '',
  avatar: team === 'red' ? 'rabbit' : 'cat',
  ...o,
})
const stage = (side: BossSide, level: number, hp: number, max: number): BossStage => ({ side, level, hp, max })
const snap = (o: Partial<BossGameState> = {}): BossGameState => ({
  phase: 'playing',
  variant: 'coop',
  lastTen: false,
  fighters: [fighter('a', 'red')],
  bosses: [stage('shared', 1, 5, 5)],
  ...o,
})

function settle(m: DinoModel, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) {
    m.step(1 / 60)
    each?.()
  }
}

/** 用真的限时状态机（timed.ts）喂模型：快照先到、事件后到，和竞技场一样 */
class Driver {
  m: TimedMatch
  now = 1_000_000
  readonly model: DinoModel

  constructor(
    readonly variant: TimedVariant,
    readonly players: TimedPlayerInit[],
    size: [number, number, boolean] = [1004, 292, false],
    reducedMotion = false,
    seed = 3,
  ) {
    this.model = new DinoModel(createRng(seed), { reducedMotion })
    this.model.layout(size[0], size[1], size[2])
    this.m = createTimed({ kpId: 'k', boss: 'dino', variant, durationMs: 90_000, players, seeds: { a: 1, b: 2 }, now: this.now })
  }

  state(): BossGameState {
    return {
      phase: this.m.phase,
      variant: this.m.variant,
      lastTen: this.m.lastTen,
      fighters: this.m.players.map((p) => ({ id: p.id, team: p.team, avatar: p.avatar, robot: p.kind === 'ai', streak: p.streak, input: p.input })),
      bosses: this.m.bosses.map((b) => ({ side: b.side, level: b.level, hp: b.hp, max: b.max })),
    }
  }

  push(m: TimedMatch, events: readonly BossGameEvent[]): BossGameEvent[] {
    this.m = m
    this.model.setState(this.state())
    for (const e of events) this.model.onEvent(e)
    return [...events]
  }

  start(): void {
    this.push(this.m, [{ type: 'countdown' }])
    settle(this.model, 3)
    this.push(beginPlay(this.m, this.now), [{ type: 'go' }])
  }

  type(id: string, input: string): void {
    this.push(setInput(this.m, id, input), [])
  }

  answer(id: string, ok: boolean): BossGameEvent[] {
    const p = this.m.players.find((q) => q.id === id)!
    const r = answer(this.m, id, p.index, ok, this.now)
    return this.push(r.match, r.events)
  }

  /** 离时间到还有 ms：推进状态机的时钟（最后 10 秒、时间到） */
  timeLeft(ms: number): BossGameEvent[] {
    this.now = Math.max(this.now, this.m.endsAt - ms)
    const r = tick(this.m, this.now)
    return this.push(r.match, r.events)
  }

  step(seconds: number): void {
    settle(this.model, seconds)
    this.now += seconds * 1000
  }
}

const SOLO: TimedPlayerInit[] = [{ id: 'a', name: 'A', team: 'red', avatar: 'rabbit' }]
const DUO: TimedPlayerInit[] = [
  { id: 'a', name: 'A', team: 'red', avatar: 'rabbit' },
  { id: 'b', name: 'B', team: 'blue', avatar: 'cat' },
]
const WITH_BOT: TimedPlayerInit[] = [
  { id: 'a', name: 'A', team: 'red', avatar: 'panda' },
  { id: 'b', name: 'B', team: 'blue', kind: 'ai' },
]

/** 需求里的六种舞台（CSS 像素）与是不是手机紧凑版 */
const SIZES: [string, number, number, boolean][] = [
  ['iPad 横屏', 1004, 292, false],
  ['电脑', 1260, 304, false],
  ['手机横屏一个人', 400, 340, true],
  ['手机横屏两个人', 230, 340, true],
  ['小手机横屏两个人', 180, 330, true],
  ['手机竖屏', 374, 300, false],
]
const CONFIGS: { name: string; s: Partial<BossGameState> }[] = [
  { name: '一起打 1 人', s: { variant: 'coop', fighters: [fighter('a', 'red')], bosses: [stage('shared', 1, 5, 5)] } },
  {
    name: '一起打 2 人',
    s: {
      variant: 'coop',
      fighters: [fighter('a', 'red'), fighter('b', 'blue', { robot: true, avatar: undefined })],
      bosses: [stage('shared', 1, 10, 10)],
    },
  },
  {
    name: '各打各的 2 人',
    s: {
      variant: 'versus',
      fighters: [fighter('a', 'red', { avatar: 'bear' }), fighter('b', 'blue')],
      bosses: [stage('red', 1, 5, 5), stage('blue', 1, 5, 5)],
    },
  },
]

/** 这一次答题的那一拳什么时候打到（按招式） */
function hitAtOf(events: readonly BossGameEvent[]): number {
  const hit = events.find((e) => e.type === 'hit')
  return hit && hit.type === 'hit' ? HIT_AT[hit.move] : 0
}

function inside(b: Box, W: number, H: number, what: string): void {
  expect(b.x0, `${what} 左`).toBeGreaterThanOrEqual(-0.01)
  expect(b.y0, `${what} 上`).toBeGreaterThanOrEqual(-0.01)
  expect(b.x1, `${what} 右`).toBeLessThanOrEqual(W + 0.01)
  expect(b.y1, `${what} 下`).toBeLessThanOrEqual(H + 0.01)
}

describe('捣蛋龙 · 血条与 Boss 链（M3 / M8）', () => {
  it('每个第几只 × 剩多少血：血条的格数（满血）、血量、第几只都和快照一致，Boss 是那一只的样子', () => {
    for (const fighters of [1, 2]) {
      const m = new DinoModel(createRng(1))
      m.layout(1004, 292, false)
      const fs = fighters === 1 ? [fighter('a', 'red')] : [fighter('a', 'red'), fighter('b', 'blue')]
      for (let level = 1; level <= 6; level++) {
        const max = bossHp(level, fighters, 90_000)
        for (const hp of [...new Set([1, 2, Math.ceil(max / 3), Math.ceil(max / 2), max - 1, max])].filter((h) => h >= 1 && h <= max)) {
          m.setState(snap({ fighters: fs, bosses: [stage('shared', level, hp, max)] }))
          settle(m, RECONCILE_WAIT + 0.6)
          const lane = m.laneOf('shared')!
          expect(lane.boss?.level, `第 ${level} 只`).toBe(level)
          expect(lane.boss?.look.tier).toBe(Math.min(4, level))
          expect(lane.bar.level).toBe(level)
          expect(lane.bar.max, `第 ${level} 只 ${hp}/${max}`).toBe(max)
          expect(lane.bar.shown).toBeCloseTo(hp, 2)
          expect(lane.bar.ghost).toBeCloseTo(hp, 2)
          expect(lane.bar.refill).toBe(1)
          expect(lane.boss?.low).toBe(hp / max < 1 / 3)
        }
      }
    }
  })

  it('血条一分一格：格子够宽时每分一条线，太窄时每 5 / 10 分一条', () => {
    expect(hpTickEvery(5, 500)).toBe(1)
    expect(hpTickEvery(20, 150)).toBe(1)
    expect(hpTickEvery(80, 150)).toBe(5)
    expect(hpTickEvery(320, 500)).toBe(5)
    expect(hpTickEvery(320, 150)).toBe(10)
    // 画出来的分隔线条数 = 格数 − 1
    const ctx = stubCtx()
    const m = new DinoModel(createRng(2))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 2, 7, 10)] }))
    settle(m, 0.5)
    renderDynamic(ctx, m, null)
    expect(ctx.count('lineTo')).toBeGreaterThan(9)
  })

  it('打倒一只 → 下一只（bossDown / bossIn）：拳头打到才开始泄气乱飞；下一只从天而降、和上一只飞走重叠；整个过场不超过 2 秒', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    const lane = d.model.laneOf('shared')!
    // 5 血：1 + 1 + 2 = 4，第 4 拳（2 分）打倒，多出来的 1 分算到第 2 只身上
    for (let i = 0; i < 3; i++) {
      d.answer('a', true)
      d.step(0.7)
    }
    expect(lane.boss?.level).toBe(1)
    const events = d.answer('a', true)
    expect(events.map((e) => e.type)).toEqual(['hit', 'bossDown', 'bossIn'])
    // 快照里已经是第 2 只了，但画面上还没换：上一只在等拳头，下一只还在天上
    expect(lane.boss?.level).toBe(2)
    expect(lane.boss?.mode).toBe('wait')
    expect(lane.outgoing.map((a) => [a.level, a.mode])).toEqual([[1, 'koWait']])
    const old = lane.outgoing[0]!
    // 第 4 拳是上勾拳（连击第 4 题）：按它的命中时刻
    const at = hitAtOf(events) + 0.02
    d.step(at)
    expect(old.mode).toBe('reel')
    expect(lane.time.frozen || lane.time.factor < 1).toBe(true)
    let overlap = false
    let landedAt = -1
    let tt = at
    for (; tt < 3.2; tt += 1 / 60) {
      d.step(1 / 60)
      const b = lane.boss!
      if (b.visible && old.visible) overlap = true
      if (landedAt < 0 && (b.mode === 'land' || b.mode === 'idle')) landedAt = tt
    }
    expect(overlap).toBe(true)
    expect(landedAt).toBeGreaterThan(KO_DROP_DELAY)
    expect(landedAt).toBeLessThanOrEqual(2)
    // 上一只最后缩小挥手、蹦出舞台
    expect(old.mode).toBe('gone')
    expect(lane.outgoing).toHaveLength(0)
    expect(lane.boss?.level).toBe(2)
    expect(lane.bar.level).toBe(2)
    expect(lane.bar.max).toBe(10)
    expect(lane.bar.shown).toBeCloseTo(9, 2)
  })

  it('过场里来的拳：打在正落下来的新 Boss 身上（它赶紧落地接这一拳），不抛错', () => {
    const d = new Driver('coop', WITH_BOT)
    d.start()
    d.step(1)
    const lane = d.model.laneOf('shared')!
    // 10 血：两人轮流打到打倒
    let who = 'a'
    for (let i = 0; i < 20 && lane.boss?.level === 1; i++) {
      d.answer(who, true)
      who = who === 'a' ? 'b' : 'a'
      d.step(0.05)
    }
    expect(lane.boss?.level).toBe(2)
    d.step(0.1)
    const next = lane.boss!
    expect(next.mode).toBe('wait')
    // 下一只还在等：这一拳来了，它马上掉下来接住
    expect(() => d.answer(who, true)).not.toThrow()
    expect(next.mode).toBe('drop')
    d.step(HIT_AT.jab + 0.05)
    expect(next.visible).toBe(true)
    expect(next.squint.value).toBeGreaterThan(0.3)
    d.step(2)
    expect(lane.boss).toBe(next)
    expect(['idle', 'land', 'dance']).toContain(next.mode)
    expect(lane.bar.shown).toBeCloseTo(d.m.bosses[0]!.hp, 2)
  })

  it('快照比 hit 先到：血条等拳头打到那一刻才掉（旋风拳等得更久）', () => {
    const m = new DinoModel(createRng(6))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 3, 15, 15)] }))
    settle(m, 0.5)
    const bar = m.laneOf('shared')!.bar
    m.setState(snap({ bosses: [stage('shared', 3, 14, 15)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 1, streak: 1, move: 'jab', together: false })
    settle(m, HIT_AT.jab * 0.5)
    expect(bar.shown).toBe(15)
    settle(m, 0.2)
    expect(bar.shown).toBeLessThan(14.5)
    expect(bar.ghost).toBeGreaterThan(bar.shown)
    m.setState(snap({ bosses: [stage('shared', 3, 11, 15)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 3, streak: 6, move: 'super', together: false })
    settle(m, HIT_AT.jab + 0.02)
    expect(bar.target).toBe(14)
    settle(m, HIT_AT.super)
    expect(bar.target).toBe(11)
  })

  it('打倒的那一拳还没打到、下一拳就来了：下一只提前落地接拳，它的血条不会被上一只的清空带走', () => {
    const m = new DinoModel(createRng(7))
    m.layout(1004, 292, false)
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    m.setState(snap({ fighters: two, bosses: [stage('shared', 1, 1, 10)] }))
    settle(m, 0.5)
    m.setState(snap({ fighters: two, bosses: [stage('shared', 2, 20, 20)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 1, streak: 1, move: 'jab', together: false })
    m.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 2 })
    settle(m, 0.02)
    m.setState(snap({ fighters: two, bosses: [stage('shared', 2, 19, 20)] }))
    m.onEvent({ type: 'hit', playerId: 'b', team: 'blue', side: 'shared', points: 1, streak: 1, move: 'jab', together: true })
    const lane = m.laneOf('shared')!
    expect(lane.boss!.mode).toBe('drop')
    settle(m, 0.3)
    expect(lane.outgoing[0]!.level).toBe(1)
    expect(lane.bar.level).toBe(2)
    expect(lane.bar.max).toBe(20)
    expect(lane.bar.target).toBe(19)
    settle(m, 2.5)
    expect(lane.bar.shown).toBeCloseTo(19, 2)
    expect(lane.boss!.level).toBe(2)
    expect(lane.boss!.visible).toBe(true)
  })

  it('一拳溢出好几只（血量很少时）：中间那只不上台，最后画面是最新的一只', () => {
    const m = new DinoModel(createRng(4))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 1, 1, 1)] }))
    settle(m, 0.5)
    m.setState(snap({ bosses: [stage('shared', 3, 2, 3)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 3, streak: 5, move: 'super', together: false })
    m.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 2 })
    m.onEvent({ type: 'bossDown', side: 'shared', level: 2 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 3 })
    const lane = m.laneOf('shared')!
    expect(lane.outgoing.map((a) => a.level)).toEqual([1])
    expect(lane.boss?.level).toBe(3)
    settle(m, 3)
    expect(lane.boss?.level).toBe(3)
    expect(lane.boss?.visible).toBe(true)
    expect(lane.outgoing).toHaveLength(0)
    expect(lane.bar.max).toBe(3)
    expect(lane.bar.shown).toBeCloseTo(2, 2)
  })

  it('第几只变了却没有事件（晚进来 / 事件丢了）：等一小会儿就直接换；有事件时不直接换', () => {
    const m = new DinoModel(createRng(5))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 1, 5, 5)] }))
    settle(m, 0.3)
    m.setState(snap({ bosses: [stage('shared', 3, 12, 15)] }))
    const lane = m.laneOf('shared')!
    settle(m, RECONCILE_WAIT * 0.5)
    expect(lane.boss?.level).toBe(1)
    settle(m, RECONCILE_WAIT)
    expect(lane.boss?.level).toBe(3)
    expect(lane.boss?.mode).toBe('idle')
    expect(lane.bar.max).toBe(15)
    expect(lane.bar.shown).toBeCloseTo(12, 2)
    expect(lane.outgoing).toHaveLength(0)
  })

  it('倒数是新的一局：全部复位到第 1 只满血、从天而降；拳手、星星、粒子、收尾都清掉', () => {
    const d = new Driver('versus', DUO)
    d.start()
    d.step(1)
    for (let i = 0; i < 6; i++) {
      d.answer('a', true)
      d.answer('b', i % 2 === 0)
      d.step(0.3)
    }
    d.timeLeft(0)
    d.step(0.5)
    expect(d.model.ended).toBe(true)
    // 再来一局
    d.m = createTimed({ kpId: 'k', boss: 'dino', variant: 'versus', durationMs: 90_000, players: DUO, seeds: { a: 5, b: 6 }, now: d.now })
    d.push(d.m, [{ type: 'countdown' }])
    const model = d.model
    expect(model.ended).toBe(false)
    expect(model.stars).toHaveLength(0)
    expect(model.particles.count).toBe(0)
    for (const side of ['red', 'blue'] as const) {
      const lane = model.laneOf(side)!
      expect(lane.boss?.level).toBe(1)
      expect(lane.boss?.mode).toBe('wait')
      expect(lane.outgoing).toHaveLength(0)
      expect(lane.bar.max).toBe(5)
    }
    for (const f of model.fighters) {
      expect(f.finish).toBeNull()
      expect(f.punch).toBeNull()
      expect(f.charge).toBe(0)
    }
    settle(model, 1.5)
    for (const side of ['red', 'blue'] as const) {
      const lane = model.laneOf(side)!
      expect(lane.boss?.mode === 'idle' || lane.boss?.mode === 'land').toBe(true)
      expect(lane.bar.shown).toBe(5)
      expect(lane.bar.refill).toBe(1)
    }
  })
})

describe('捣蛋龙 · 时间到与收尾（M8 / M9）', () => {
  it('时间到还没打倒：一屁股坐下喘气 → 挥手 → 跑掉、掉几颗星星；各打各的赢的一边举双拳、另一边拍手', () => {
    const d = new Driver('versus', DUO)
    d.start()
    d.step(1)
    d.answer('a', true)
    d.answer('a', true)
    d.step(1)
    const events = d.timeLeft(0)
    expect(events.map((e) => e.type)).toEqual(['timeUp', 'finished'])
    const model = d.model
    const red = model.laneOf('red')!.boss!
    const blue = model.laneOf('blue')!.boss!
    expect(red.mode).toBe('sit')
    expect(blue.mode).toBe('sit')
    expect(model.fighter('a')!.finish).toBe('cheer')
    expect(model.fighter('b')!.finish).toBe('clap')
    const modes = new Set<string>()
    for (let t = 0; t < 4; t += 1 / 60) {
      model.step(1 / 60)
      modes.add(red.mode)
    }
    expect([...modes]).toEqual(expect.arrayContaining(['sit', 'pant', 'bye', 'run', 'gone']))
    expect(red.starsDropped).toBeGreaterThan(0)
    // 画面里举双拳面向观众 / 拍手
    const cheer = model.boxerPose(model.fighter('a')!).pose
    expect(cheer.turn).toBe(1)
    expect(cheer.lead.y).toBeLessThan(-1.1)
    expect(cheer.rear.y).toBeLessThan(-1.1)
    const clap = model.boxerPose(model.fighter('b')!).pose
    expect(clap.lead.y).toBeGreaterThan(-0.9)
    // 终局特写对准这一队的 Boss（跑掉之后对准它原来站的地方），都在盒子里
    for (const team of ['red', 'blue'] as const) {
      const p = model.focus(team)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1004)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(292)
    }
    expect(model.focus('red').x).toBeLessThan(502)
    expect(model.focus('blue').x).toBeGreaterThan(502)
  })

  it('一起打 / 平局：大家都欢呼；只有快照说结束了、没有事件（晚进来）也会收尾', () => {
    const d = new Driver('coop', WITH_BOT)
    d.start()
    d.step(0.5)
    d.timeLeft(0)
    for (const f of d.model.fighters) expect(f.finish).toBe('cheer')
    const m = new DinoModel(createRng(6))
    m.layout(400, 340, true)
    m.setState(
      snap({
        phase: 'ended',
        variant: 'versus',
        fighters: [fighter('a', 'red'), fighter('b', 'blue')],
        bosses: [stage('red', 2, 4, 10), stage('blue', 3, 9, 15)],
      }),
    )
    expect(m.ended).toBe(false)
    settle(m, RECONCILE_WAIT + 0.1)
    expect(m.ended).toBe(true)
    for (const f of m.fighters) expect(f.finish).toBe('cheer')
    // 平局
    m.onEvent({ type: 'finished', winner: null })
    for (const f of m.fighters) expect(f.finish).toBe('cheer')
    expect(m.laneOf('red')!.boss!.mode).toBe('pant')
    settle(m, 3)
    expect(m.laneOf('red')!.boss!.mode).toBe('gone')
  })

  it('最后 10 秒：拳手头上火焰光环、观众全站起来、灯光变暖红呼吸；平时连击到第 3 题先冒一圈小火苗', () => {
    const d = new Driver('coop', SOLO, [1004, 292, false])
    d.start()
    d.step(1)
    const f0 = d.model.fighter('a')!
    for (let i = 0; i < 2; i++) {
      d.answer('a', true)
      d.step(0.8)
    }
    expect(f0.fire).toBe(0)
    d.answer('a', true)
    d.step(0.8)
    expect(f0.fire).toBeGreaterThan(0.45)
    expect(f0.fire).toBeLessThan(0.6)
    d.answer('a', false)
    d.step(1.2)
    expect(f0.fire).toBeLessThan(0.05)
    const events = d.timeLeft(9_000)
    expect(events.map((e) => e.type)).toEqual(['lastTen'])
    d.step(1.2)
    const model = d.model
    expect(model.lastTen).toBe(true)
    expect(model.fighter('a')!.fire).toBeGreaterThan(0.9)
    expect(model.crowd.length).toBeGreaterThan(10)
    expect(model.crowd.every((c) => c.lift > c.r)).toBe(true)
    const w0 = model.warm
    d.step(0.3)
    expect(model.warm).not.toBe(w0)
  })
})

describe('捣蛋龙 · 拳手（M9）', () => {
  it('蓄力：按一个键亮一格并抖一下（最多 3 格），删一个泄一格，清空放下；倒数时不蓄', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    const f = d.model.fighter('a')!
    const seq: [string, number][] = [
      ['1', 1],
      ['12', 2],
      ['123', 3],
      ['1234', 3],
      ['123', 2],
      ['12', 1],
      ['125', 2],
      ['126', 2],
      ['', 0],
    ]
    for (const [input, charge] of seq) {
      d.type('a', input)
      expect(f.charge, input).toBe(charge)
      if (input === '126') expect(f.press.value).toBe(1) // 换了一个数（一样长）也抖一下
    }
    d.type('a', '7')
    expect(f.press.value).toBe(1)
    d.step(0.3)
    const pose = d.model.boxerPose(f).pose
    expect(pose.pips).toBe(1)
    expect(pose.charge).toBeGreaterThan(0.8)
    // 护架往后拉
    d.type('a', '78')
    d.type('a', '789')
    d.step(0.3)
    const pulled = d.model.boxerPose(f).pose
    expect(pulled.lead.x).toBeLessThan(0.3)
    expect(pulled.lean).toBeLessThan(0)
    const m = new DinoModel(createRng(1))
    m.layout(1004, 292, false)
    m.setState(snap({ phase: 'countdown', fighters: [fighter('a', 'red', { input: '12' })] }))
    expect(m.fighter('a')!.charge).toBe(0)
  })

  it('答对：同一帧拳头就动了（第一帧已经伸出一截），约 70 ms 打到 Boss（顿帧、眯眼、布袋迸星星飞向打的那边）；左右手轮流', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    const f = d.model.fighter('a')!
    const lane = d.model.laneOf('shared')!
    const guard = d.model.boxerPose(f).pose
    d.answer('a', true)
    expect(f.punch?.arm).toBe(0)
    const first = d.model.boxerPose(f).pose
    expect(first.lead.x).toBeGreaterThan(guard.lead.x + 0.05)
    expect(first.grit).toBe(1)
    const boss = lane.boss!
    d.step(0.05)
    expect(boss.squint.value).toBe(0)
    d.step(0.03)
    expect(f.punch?.impacted).toBe(true)
    expect(boss.squint.value).toBeGreaterThan(0.5)
    expect(Math.abs(boss.tilt.velocity) + Math.abs(boss.tilt.value)).toBeGreaterThan(0.01)
    // 拳手在左边：Boss 往右倒，星星往左飞（飞向打的那一边）
    d.step(0.1)
    expect(boss.tilt.value).toBeGreaterThan(0)
    expect(d.model.stars.length).toBeGreaterThan(0)
    expect(d.model.stars.every((s) => s.vx < 0)).toBe(true)
    expect(d.model.impacts.length).toBeGreaterThan(0)
    d.step(0.6)
    expect(f.punch).toBeNull()
    d.answer('a', true)
    expect(f.punch?.arm).toBe(1)
  })

  it('旋风拳（super）：先转一圈再打，拳套放大；Boss 转半圈再转回来；合力拳时另一个人也跟着挥一下、打出金色的光圈', () => {
    const m = new DinoModel(createRng(8))
    m.layout(1004, 292, false)
    m.setState(snap({ fighters: [fighter('a', 'red'), fighter('b', 'blue')], bosses: [stage('shared', 2, 20, 20)] }))
    settle(m, 1)
    const lane = m.laneOf('shared')!
    m.setState(snap({ fighters: [fighter('a', 'red'), fighter('b', 'blue')], bosses: [stage('shared', 2, 17, 20)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 3, streak: 6, move: 'super', together: true })
    const a = m.fighter('a')!
    const b = m.fighter('b')!
    expect(b.punch?.echo).toBe(true)
    settle(m, 0.06)
    const spinning = m.boxerPose(a).pose
    expect(spinning.spin).toBeGreaterThan(0)
    expect(spinning.spin).toBeLessThan(1)
    settle(m, HIT_AT.super - 0.06 + 0.02)
    expect(a.punch?.impacted).toBe(true)
    expect(m.boxerPose(a).pose.lead.s).toBeGreaterThan(1.4)
    expect(lane.boss!.spinLeft).toBeGreaterThan(0)
    expect(m.impacts.some((fx) => fx.color === '#ffd24a')).toBe(true)
    // Boss 转半圈（背对拳手）再转回来
    let most = 0
    settle(m, SPIN_TIME + 0.4, () => (most = Math.max(most, lane.boss!.spin)))
    expect(most).toBeGreaterThan(0.45)
    expect(most).toBeLessThanOrEqual(0.5)
    expect(lane.boss!.spin).toBe(0)
    // 挥的那一下不算命中（不会再打一次）
    expect(b.punch).toBeNull()
  })

  it('挥空：转一圈、头上两颗小星星、甩甩头，Boss 做个鬼脸；1.2 秒后回到准备姿势', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    const f = d.model.fighter('a')!
    const boss = d.model.laneOf('shared')!.boss!
    const events = d.answer('a', false)
    expect(events.map((e) => e.type)).toEqual(['miss'])
    expect(f.missT).toBe(0)
    expect(boss.faceT).toBe(0)
    d.step(0.3)
    expect(d.model.boxerPose(f).pose.spin).toBeGreaterThan(0)
    d.step(0.4)
    expect(d.model.boxerPose(f).pose.dizzy).toBeGreaterThan(0.3)
    expect(d.model.dinoPose(d.model.laneOf('shared')!, boss).pose.tongue).toBeGreaterThanOrEqual(0)
    d.step(0.6)
    expect(f.missT).toBe(-1)
    // 片段放完了，正在淡回弹跳站姿
    expect(d.model.boxerPose(f).pose.dizzy).toBeLessThan(0.05)
    d.step(0.2)
    expect(d.model.boxerPose(f).pose.dizzy).toBe(0)
  })

  it('打倒一只：那一条道的拳手在拳头打到的那一刻跳起来举拳', () => {
    const m = new DinoModel(createRng(9))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 1, 1, 5)] }))
    settle(m, 0.5)
    m.setState(snap({ bosses: [stage('shared', 2, 10, 10)] }))
    m.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 1, streak: 1, move: 'jab', together: false })
    m.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 2 })
    const g = m.fighter('a')!
    expect(g.cheerT).toBe(-1)
    settle(m, HIT_AT.jab + 0.02)
    expect(g.cheerT).toBeGreaterThanOrEqual(0)
    let high = 0
    let jump = 0
    settle(m, 1.6, () => {
      const p = m.boxerPose(g)
      high = Math.min(high, p.pose.lead.y)
      jump = Math.max(jump, g.y - p.y)
    })
    expect(high).toBeLessThan(-1)
    expect(jump).toBeGreaterThan(g.b * 0.15)
    expect(g.cheerT).toBe(-1)
  })
})

describe('捣蛋龙 · 舞台排版（M6 / M10）', () => {
  for (const [label, W, H, compact] of SIZES) {
    for (const cfg of CONFIGS) {
      it(`${label} ${W}×${H} · ${cfg.name}：拳手、每一只 Boss、血条都在画面里，大小说得过去`, () => {
        const m = new DinoModel(createRng(1))
        m.layout(W, H, compact)
        m.setState(snap(cfg.s))
        settle(m, 0.5)
        const g = m.geo
        for (const f of m.fighters) {
          inside(m.fighterBox(f.id)!, W, H, `拳手 ${f.id}`)
          expect(f.b).toBeGreaterThan(H * (g.stacked ? 0.14 : 0.24))
        }
        for (const lane of m.lanes) {
          const lg = lane.geo
          for (let level = 1; level <= 5; level++) inside(m.bossBox(lane.side, level)!, W, H, `Boss ${lane.side} 第 ${level} 只`)
          inside(m.barBox(lane.side)!, W, H, `血条 ${lane.side}`)
          // 血条在 Boss 头顶上面，不压着
          expect(m.barBox(lane.side)!.y1).toBeLessThanOrEqual(m.bossBox(lane.side, 3)!.y0 + 1)
          // 上下叠时各自在自己那一半里
          if (g.stacked) {
            for (let level = 1; level <= 5; level++) {
              const b = m.bossBox(lane.side, level)!
              expect(b.y0).toBeGreaterThanOrEqual(lg.y0 - 0.01)
              expect(b.y1).toBeLessThanOrEqual(lg.y1 + 0.01)
            }
          }
          // Boss 大概占舞台（一条道）高的一半到四分之三；横着放不下时再小一点也行
          const bossH = m.bossBox(lane.side, 3)!.y1 - m.bossBox(lane.side, 3)!.y0
          const laneH = lg.y1 - lg.y0
          expect(bossH / laneH).toBeLessThan(0.8)
          expect(bossH / laneH).toBeGreaterThan(W / H < 0.6 ? 0.35 : 0.45)
          expect(lg.boxerH / lg.u).toBeCloseTo(BOXER_K, 6)
        }
        // 各打各的：红左蓝右（左右并排）或红上蓝下（上下叠）
        if (m.lanes.length === 2) {
          const red = m.laneOf('red')!.geo
          const blue = m.laneOf('blue')!.geo
          if (g.stacked) expect(red.y1).toBeLessThanOrEqual(blue.y0 + 0.01)
          else expect(red.bossX).toBeLessThan(blue.bossX)
          expect(m.fighter('a')!.x).toBeLessThan(m.laneOf('red')!.geo.bossX)
          expect(m.fighter('b')!.x).toBeGreaterThan(m.laneOf('blue')!.geo.bossX)
        } else if (m.fighters.length === 2) {
          const lane = m.lanes[0]!.geo
          expect(m.fighter('a')!.x).toBeLessThan(lane.bossX)
          expect(m.fighter('b')!.x).toBeGreaterThan(lane.bossX)
        } else expect(m.fighter('a')!.x).toBeLessThan(m.lanes[0]!.geo.bossX)
        // 紧凑版 / 很小的舞台去掉观众和锣
        expect(g.small).toBe(compact || W < 300 || H < 200)
        if (g.small) {
          expect(m.crowd).toHaveLength(0)
          expect(g.gong).toBeNull()
        } else expect(m.crowd.length).toBeGreaterThan(0)
        // 终局特写对准的点在盒子里
        for (const team of ['red', 'blue'] as const) {
          const p = m.focus(team)
          expect(p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H).toBe(true)
        }
      })
    }
  }

  it('以后多设备台上最多 4 个人（每边前后两排）：各种舞台也都放得下，第二排站在后面、小一点', () => {
    const four = [
      fighter('a', 'red'),
      fighter('b', 'red', { avatar: 'bear' }),
      fighter('c', 'blue'),
      fighter('d', 'blue', { robot: true, avatar: undefined }),
    ]
    for (const [label, W, H, compact] of SIZES) {
      for (const s of [
        { variant: 'coop' as const, fighters: four, bosses: [stage('shared', 3, 60, 60)] },
        { variant: 'coop' as const, fighters: four.slice(0, 3), bosses: [stage('shared', 3, 45, 45)] },
        { variant: 'versus' as const, fighters: four, bosses: [stage('red', 3, 30, 30), stage('blue', 3, 30, 30)] },
      ]) {
        const m = new DinoModel(createRng(1))
        m.layout(W, H, compact)
        m.setState(snap(s))
        settle(m, 0.3)
        for (const f of m.fighters) inside(m.fighterBox(f.id)!, W, H, `${label} ${s.variant} ${s.fighters.length} 人 · 拳手 ${f.id}`)
        for (const lane of m.lanes)
          for (let level = 1; level <= 5; level++) inside(m.bossBox(lane.side, level)!, W, H, `${label} ${s.variant} · Boss 第 ${level} 只`)
        const back = m.fighters.filter((f) => f.row > 0)
        expect(back.length).toBeGreaterThan(0)
        for (const f of back) {
          const front = m.fighters.find((o) => o.row === 0 && o.dir === f.dir && o.side === f.side)!
          expect(f.y).toBeLessThan(front.y)
          expect(f.b).toBeLessThan(front.b)
        }
      }
    }
  })

  it('又高又窄的舞台各打各的上下叠，宽的左右并排；手机两个人的中间一栏也放得下两对', () => {
    const input = {
      variant: 'versus' as const,
      sides: ['red', 'blue'] as BossSide[],
      fighters: [
        { id: 'a', team: 'red' as Team, kind: 'bear' as const },
        { id: 'b', team: 'blue' as Team, kind: 'cat' as const },
      ],
    }
    expect(layoutStage(230, 340, true, input).stacked).toBe(true)
    expect(layoutStage(180, 330, true, input).stacked).toBe(true)
    expect(layoutStage(400, 340, true, input).stacked).toBe(false)
    expect(layoutStage(1004, 292, false, input).stacked).toBe(false)
    const coop = layoutStage(1004, 292, false, { variant: 'coop', sides: ['shared'], fighters: [] })
    expect(coop.lanes).toHaveLength(1)
    expect(coop.truss).not.toBeNull()
    expect(coop.gong).not.toBeNull()
  })

  it('换尺寸、上台的人变了：重新排版（拳手接着演），背景变了（尺寸、拳台、灯光色）背景的键才跟着变', () => {
    const m = new DinoModel(createRng(2))
    m.layout(1004, 292, false)
    m.setState(snap())
    settle(m, 0.3)
    const k0 = m.bgKey()
    m.setState(snap({ fighters: [fighter('a', 'red'), fighter('b', 'blue')], bosses: [stage('shared', 1, 10, 10)] }))
    // 宽舞台上多一个人拳台不变：背景不用重画
    expect(m.bgKey()).toBe(k0)
    expect(m.fighters).toHaveLength(2)
    const f = m.fighter('a')!
    m.layout(400, 340, true)
    expect(m.bgKey()).not.toBe(k0)
    expect(m.fighter('a')).toBe(f)
    expect(f.x).toBeLessThan(400)
    // 窄舞台上变成 4 个人：拳手（和角柱）变小，背景重画
    const n = new DinoModel(createRng(2))
    n.layout(300, 300, false)
    n.setState(snap())
    const n0 = n.bgKey()
    const four = [fighter('a', 'red'), fighter('b', 'red'), fighter('c', 'blue'), fighter('d', 'blue')]
    n.setState(snap({ fighters: four, bosses: [stage('shared', 1, 10, 10)] }))
    expect(n.bgKey()).not.toBe(n0)
    // 换了一只 Boss（灯光色）也要重画背景
    const k1 = m.bgKey()
    m.setState(snap({ fighters: [fighter('a', 'red'), fighter('b', 'blue')], bosses: [stage('shared', 2, 20, 20)] }))
    settle(m, RECONCILE_WAIT + 0.1)
    expect(m.bgKey()).not.toBe(k1)
  })
})

describe('捣蛋龙 · Boss 的表演（M8）', () => {
  it('挑衅舞由 taunt 事件触发（不再自己计时），打中了马上停', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    const lane = d.model.laneOf('shared')!
    const boss = lane.boss!
    d.step(8)
    expect(boss.mode).toBe('idle')
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'dance' }])
    expect(boss.mode).toBe('dance')
    d.step(0.5)
    expect(d.model.dinoPose(lane, boss).pose.up).toBeGreaterThan(0)
    d.answer('a', true)
    d.step(0.1)
    expect(boss.mode).toBe('idle')
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'dance' }])
    d.step(DANCE_TIME + 0.05)
    expect(boss.mode).toBe('idle')
  })

  it('血少于 1/3：冒汗、蚊香眼、晃得慢；第 2 只血少于一半头盔歪、快没血了掉下来；第 3 只戴王冠、第 4 只起金色', () => {
    const m = new DinoModel(createRng(4))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 2, 9, 10)] }))
    settle(m, 0.5)
    const lane = m.laneOf('shared')!
    let p = m.dinoPose(lane, lane.boss!).pose
    expect(p.helmetTilt).toBe(0)
    expect(p.helmetOff).toBe(0)
    expect(p.dizzy).toBe(0)
    m.setState(snap({ bosses: [stage('shared', 2, 4, 10)] }))
    settle(m, 0.5)
    p = m.dinoPose(lane, lane.boss!).pose
    expect(p.helmetTilt).not.toBe(0)
    expect(p.helmetOff).toBe(0)
    m.setState(snap({ bosses: [stage('shared', 2, 3, 10)] }))
    settle(m, 0.3)
    p = m.dinoPose(lane, lane.boss!).pose
    expect(p.dizzy).toBe(1)
    expect(p.sweat).toBeGreaterThan(0.5)
    expect(lane.boss!.tilt.omega).toBeLessThan(2 * Math.PI * 1.5)
    m.setState(snap({ bosses: [stage('shared', 2, 1, 10)] }))
    settle(m, 1)
    expect(m.dinoPose(lane, lane.boss!).pose.helmetOff).toBe(1)
    expect(lane.boss!.look.hat).toBe('helmet')
    for (const [level, hat, shine] of [
      [1, 'none', false],
      [3, 'crown', false],
      [4, 'none', true],
      [9, 'none', true],
    ] as const) {
      m.setState(snap({ bosses: [stage('shared', level, 5, 20)] }))
      settle(m, RECONCILE_WAIT + 0.1)
      expect(lane.boss!.look.hat).toBe(hat)
      expect(lane.boss!.look.shine).toBe(shine)
    }
  })

  it('点一下（B59 / M12）：点 Boss 咯咯笑着晃一下、点拳手秀肌肉、点锣当一声、点别处观众欢呼', () => {
    const m = new DinoModel(createRng(5))
    m.layout(1004, 292, false)
    m.setState(snap())
    settle(m, 0.5)
    const lane = m.laneOf('shared')!
    const g = lane.geo
    const boss = lane.boss!
    const s = g.u * boss.look.scale
    expect(m.hitTest(g.bossX, g.floorY - s * 0.35)).toEqual({ kind: 'boss', side: 'shared' })
    expect(m.hitTest(g.bossX + g.facing * s * 0.1, g.floorY - s * 0.85)).toEqual({ kind: 'boss', side: 'shared' })
    const f = m.fighter('a')!
    expect(m.hitTest(f.x, f.y - f.b * 0.5)).toEqual({ kind: 'fighter', id: 'a' })
    expect(m.hitTest(m.geo.gong!.x, m.geo.gong!.y)).toEqual({ kind: 'gong' })
    expect(m.hitTest(20, 20)).toEqual({ kind: 'crowd' })
    m.poke(g.bossX, g.floorY - s * 0.35, 'red')
    expect(boss.giggle.value).toBe(1)
    expect(Math.abs(boss.tilt.velocity)).toBeGreaterThan(0)
    settle(m, 0.1)
    expect(m.dinoPose(lane, boss).pose.happy).toBeGreaterThan(0.45)
    m.poke(f.x, f.y - f.b * 0.5, 'red')
    expect(f.pokeT).toBe(0)
    settle(m, 0.4)
    expect(m.boxerPose(f).pose.happy).toBe(1)
    m.poke(m.geo.gong!.x, m.geo.gong!.y, 'blue')
    expect(Math.abs(m.gongSwing.velocity)).toBeGreaterThan(0)
    const near = m.crowd.filter((c) => Math.abs(c.x - 200) < 1004 * 0.18)
    m.poke(200, 60, 'red')
    expect(near.every((c) => c.standT > 0)).toBe(true)
  })
})

describe('捣蛋龙 · 紧凑版 / 减少动画 / 降级 / 性能', () => {
  it('紧凑版：没有观众、没有锣，灯不动（从画面上面照下来两道）', () => {
    const d = new Driver('coop', SOLO, [400, 340, true])
    d.start()
    d.step(1)
    const m = d.model
    expect(m.geo.small).toBe(true)
    expect(m.crowd).toHaveLength(0)
    expect(m.geo.gong).toBeNull()
    expect(m.geo.lamps.length).toBeGreaterThan(0)
    expect(m.lightT).toBe(0)
  })

  it('减少动画：不顿帧、不震、不推镜头、不放粒子和星星、Boss 从天而降换成原地出现、打倒换成缩小淡出；照样看得出谁打中了', () => {
    const d = new Driver('coop', SOLO, [1004, 292, false], true)
    d.start()
    d.step(1)
    const m = d.model
    const lane = m.laneOf('shared')!
    expect(m.camera.enabled).toBe(false)
    expect(lane.time.enabled).toBe(false)
    const f = m.fighter('a')!
    const boss = lane.boss!
    for (let i = 0; i < 3; i++) {
      d.answer('a', true)
      d.step(0.05)
      const pose = m.boxerPose(f)
      expect(pose.pose.lead.x + pose.pose.rear.x).toBeGreaterThan(0.6) // 拳头伸出去了
      d.step(HIT_AT.jab)
      expect(lane.time.frozen).toBe(false)
      expect(m.camera.x).toBe(0)
      expect(m.camera.zoom.value).toBe(1)
      expect(boss.squint.value).toBeGreaterThan(0.3)
      d.step(0.6)
    }
    expect(m.particles.count).toBe(0)
    expect(m.stars).toHaveLength(0)
    expect(m.impacts).toHaveLength(0)
    expect(m.boxerPose(f).y).toBe(f.y) // 不弹跳
    // 打倒：缩小淡出，下一只原地出现
    d.step(hitAtOf(d.answer('a', true)) + 0.02)
    expect(boss.mode).toBe('fade')
    d.step(0.8)
    expect(boss.mode).toBe('gone')
    expect(lane.boss!.level).toBe(2)
    expect(lane.boss!.visible).toBe(true)
    expect(lane.boss!.y).toBe(0)
    expect(m.particles.count).toBe(0)
    expect(m.stars).toHaveLength(0)
    // 挥空不转圈
    d.answer('a', false)
    d.step(0.3)
    expect(m.boxerPose(f).pose.spin).toBe(0)
  })

  it('降级：1 级停观众与灯光摆动，2 级停粒子、星星与残影', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    const m = d.model
    const t0 = m.lightT
    d.step(0.2)
    expect(m.lightT).toBeGreaterThan(t0)
    m.degrade(1)
    const t1 = m.lightT
    d.step(0.5)
    expect(m.lightT).toBe(t1)
    expect(m.crowd.every((c) => Math.abs(c.swing) <= 0.2 + 1e-9)).toBe(true)
    d.answer('a', true)
    d.step(0.1)
    expect(m.stars.length).toBeGreaterThan(0)
    m.degrade(2)
    expect(m.stars).toHaveLength(0)
    expect(m.particles.count).toBe(0)
    d.step(0.5)
    d.answer('a', true)
    d.step(0.03)
    expect(m.boxerPose(m.fighter('a')!).pose.trailAlpha).toBe(0)
    d.step(0.1)
    expect(m.stars).toHaveLength(0)
    expect(m.impacts).toHaveLength(0)
  })

  it('模型 10000 步很快（< 300 ms）', () => {
    const d = new Driver('versus', DUO)
    d.start()
    const m = d.model
    const t0 = performance.now()
    for (let i = 0; i < 10000; i++) {
      if (i % 90 === 0) {
        d.answer('a', true)
        d.answer('b', i % 180 === 0)
      }
      m.step(1 / 60)
    }
    expect(performance.now() - t0).toBeLessThan(300)
  })
})

describe('捣蛋龙 · 渲染', () => {
  it('假 ctx：背景与每帧动态的绘制调用有上限（最大的舞台、两条链、打倒过场 + 最后 10 秒最热闹的时候也 ≤ 2500），save / restore 配对', () => {
    const d = new Driver('versus', DUO, [1260, 304, false])
    d.start()
    d.step(0.5)
    const bg = stubCtx()
    renderBackground(bg, d.model)
    expect(bg.calls.length).toBeGreaterThan(50)
    expect(bg.calls.length).toBeLessThan(1500)
    d.timeLeft(9_000)
    d.type('a', '12')
    d.type('b', '3')
    let max = 0
    let total = 0
    for (let round = 0; round < 12; round++) {
      d.answer('a', true)
      d.answer('b', true)
      for (let i = 0; i < 8; i++) {
        d.step(1 / 30)
        const ctx = stubCtx()
        renderDynamic(ctx, d.model, null)
        max = Math.max(max, ctx.calls.length - bg.calls.length)
        total = Math.max(total, ctx.calls.length)
        expect(ctx.count('save')).toBe(ctx.count('restore'))
      }
    }
    expect(d.model.laneOf('red')!.boss!.level).toBeGreaterThan(2)
    // 拿着离屏背景时每帧只画会动的部分
    const withBg = stubCtx()
    renderDynamic(withBg, d.model, {} as CanvasImageSource)
    expect(withBg.count('drawImage')).toBe(1)
    expect(withBg.calls.length).toBeLessThan(2500)
    expect(max).toBeLessThan(2500)
    expect(total).toBeLessThan(2500 + bg.calls.length)
  })

  it('每种舞台都画得出来（紧凑版、上下叠、减少动画）', () => {
    for (const [, W, H, compact] of SIZES) {
      for (const cfg of CONFIGS) {
        for (const reduced of [false, true]) {
          const m = new DinoModel(createRng(1), { reducedMotion: reduced })
          m.layout(W, H, compact)
          m.setState(snap(cfg.s))
          settle(m, 0.2)
          const ctx = stubCtx()
          renderBackground(ctx, m)
          renderDynamic(ctx, m, null)
          expect(ctx.calls.length).toBeGreaterThan(60)
          expect(ctx.count('save')).toBe(ctx.count('restore'))
        }
      }
    }
  })

  it('GameModule：全流程不抛错（倒数 → 开打 → 蓄力 → 连着打 → 打倒 → 下一只 → 最后 10 秒 → 时间到）；拿不到 2D 上下文也静默', () => {
    const ctx = stubCtx()
    const game = createDinoGame()
    expect(game.meta.id).toBe('boss-dino')
    game.mount({ canvas: stubCanvas(ctx), width: 1004, height: 292, dpr: 2, compact: false, reducedMotion: false })
    const d = new Driver('coop', SOLO)
    const feed = (m: TimedMatch, events: BossGameEvent[]): void => {
      d.m = m
      game.setState(d.state())
      for (const e of events) game.onEvent(e)
    }
    feed(d.m, [{ type: 'countdown' }])
    for (let i = 0; i < 30; i++) game.tick(0.05)
    feed(beginPlay(d.m, d.now), [{ type: 'go' }])
    feed(setInput(d.m, 'a', '1'), [])
    for (let n = 0; n < 8; n++) {
      const r = answer(d.m, 'a', d.m.players[0]!.index, n !== 3, d.now)
      feed(r.match, r.events)
      for (let i = 0; i < 20; i++) game.tick(1 / 60)
    }
    d.now = d.m.endsAt - 8000
    let r = tick(d.m, d.now)
    feed(r.match, r.events)
    game.poke?.(500, 150, 'red')
    expect(game.focus?.('red')).not.toBeNull()
    d.now = d.m.endsAt
    r = tick(d.m, d.now)
    feed(r.match, r.events)
    for (let i = 0; i < 60; i++) game.tick(1 / 60)
    expect(ctx.count('clearRect')).toBe(30 + 8 * 20 + 60)
    game.resize(400, 340, 3)
    game.tick(0.016)
    game.degrade?.(3)
    game.tick(0.016)
    game.degrade?.(0)
    game.pause()
    game.resume()
    game.destroy()
    expect(() => game.tick(0.016)).not.toThrow()
    const mute = createDinoGame()
    mute.mount({ canvas: stubCanvas(null), width: 1004, height: 292, dpr: 1, compact: false, reducedMotion: true })
    expect(() => {
      mute.setState(snap())
      mute.onEvent({ type: 'hit', playerId: 'a', team: 'red', side: 'shared', points: 1, streak: 1, move: 'jab', together: false })
      mute.tick(0.016)
      mute.poke?.(10, 10, 'red')
      mute.focus?.('blue')
      mute.destroy()
    }).not.toThrow()
  })
})

const hitEv = (id: string, team: Team, move: 'jab' | 'hook' | 'upper' | 'super', o: Partial<Extract<BossGameEvent, { type: 'hit' }>> = {}): BossGameEvent => ({
  type: 'hit',
  playerId: id,
  team,
  side: 'shared',
  points: 2,
  streak: 3,
  move,
  together: false,
  ...o,
})

/** 拳手出拳那只手的拳套在画面上的位置 */
function punchGlove(m: DinoModel, f: Fighter): { x: number; y: number } {
  const bp = m.boxerPose(f)
  const g = f.punchArm === 0 ? bp.pose.lead : bp.pose.rear
  return { x: bp.x + f.dir * g.x * bp.b, y: bp.y + g.y * bp.b }
}

describe('捣蛋龙 · 阶段 2：四种拳（M9 / M10）', () => {
  /** 打一拳，记下这一拳前后 1.4 秒里 Boss 与拳手的反应 */
  function throwOne(move: 'jab' | 'hook' | 'upper' | 'super', reduced = false) {
    const m = new DinoModel(createRng(11), { reducedMotion: reduced })
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 2, 20, 20)] }))
    settle(m, 1)
    const lane = m.laneOf('shared')!
    const a = lane.boss!
    const f = m.fighter('a')!
    const guard = m.boxerPose(f).pose
    m.setState(snap({ bosses: [stage('shared', 2, 18, 20)] }))
    m.onEvent(hitEv('a', 'red', move))
    const first = m.boxerPose(f).pose
    const r = { m, lane, a, f, guard, first, impactedEarly: false, impactedLate: false, push: 0, air: 0, spin: 0, tilt: 0, zoom: 1, twist: 0, minSy: 9, lift: 0, glove: 0, spinF: 0, upY: 0 }
    settle(m, HIT_AT[move] - 0.02, () => {
      const bp = m.boxerPose(f)
      r.minSy = Math.min(r.minSy, bp.pose.sy)
      r.spinF = Math.max(r.spinF, bp.pose.spin)
    })
    r.impactedEarly = !!f.punch?.impacted
    settle(m, 0.03)
    r.impactedLate = !!f.punch?.impacted
    const bp = m.boxerPose(f)
    r.twist = bp.pose.twist
    r.glove = (f.punchArm === 0 ? bp.pose.lead : bp.pose.rear).s
    settle(m, 1.4, () => {
      r.push = Math.max(r.push, a.push.value * -lane.geo.facing)
      r.air = Math.max(r.air, a.air)
      r.spin = Math.max(r.spin, a.spin)
      r.tilt = Math.max(r.tilt, Math.abs(a.tilt.value))
      r.zoom = Math.max(r.zoom, m.camera.zoom.value)
      r.lift = Math.max(r.lift, f.y - m.boxerPose(f).y)
      r.upY = Math.max(r.upY, lane.geo.floorY - m.dinoPose(lane, a).y)
    })
    return r
  }

  it('拳头按招式在 HIT_AT 那一刻打到（竞技场按它放「嘭」）；第一帧拳头就动了（≤ 50 ms）', () => {
    expect(HIT_AT.super).toBeLessThanOrEqual(0.25)
    for (const move of ['jab', 'hook', 'upper', 'super'] as const) {
      const r = throwOne(move)
      expect(r.impactedEarly, move).toBe(false)
      expect(r.impactedLate, move).toBe(true)
      const moved = Math.hypot(r.first.lead.x - r.guard.lead.x, r.first.lead.y - r.guard.lead.y) + Math.abs(r.first.spin - r.guard.spin) + Math.abs(r.first.sy - r.guard.sy)
      expect(moved, move).toBeGreaterThan(0.02)
    }
  })

  it('一眼分得出：直拳只倒一下；勾拳扭身、Boss 倒得更狠还被推往侧后方；上勾拳先蹲、Boss 离地弹起；旋风拳转圈、超大拳套、Boss 转半圈、镜头推近', () => {
    const jab = throwOne('jab')
    const hook = throwOne('hook')
    const upper = throwOne('upper')
    const sup = throwOne('super')
    const u = jab.lane.geo.u
    expect(jab.push).toBeLessThan(u * 0.01)
    expect(jab.air).toBe(0)
    expect(jab.spin).toBe(0)
    // 勾拳：身子扭过去；Boss 倒得比同样分数的直拳狠、被推开一截再弹回
    expect(hook.twist).toBeGreaterThan(0.8)
    expect(hook.tilt).toBeGreaterThan(jab.tilt * 1.3)
    expect(hook.push).toBeGreaterThan(u * 0.08)
    expect(Math.abs(hook.a.push.value)).toBeLessThan(u * 0.02)
    expect(hook.air).toBe(0)
    // 上勾拳：出拳前蹲下去，打完拳手离地；Boss 离地弹起、落回台面
    expect(upper.minSy).toBeLessThan(0.9)
    expect(upper.lift).toBeGreaterThan(upper.f.b * 0.06)
    expect(upper.air).toBeGreaterThan(u * 0.15)
    expect(upper.upY).toBeGreaterThan(u * 0.15)
    expect(upper.a.air).toBe(0)
    expect(upper.push).toBeLessThan(u * 0.01)
    // 旋风拳：先转一圈、拳套放大；Boss 转半圈、被推开；镜头往 Boss 推
    expect(sup.spinF).toBeGreaterThan(0.3)
    expect(sup.glove).toBeGreaterThan(1.5)
    expect(sup.spin).toBeGreaterThan(0.45)
    expect(sup.zoom).toBeGreaterThan(1.03)
    expect(jab.zoom).toBe(1)
    expect(sup.push).toBeGreaterThan(u * 0.08)
  })

  it('残影按招式不同：直拳 2 个、勾拳 / 上勾拳 3 个、旋风拳 4 个，勾拳的残影是一道弧', () => {
    for (const [move, n] of [
      ['jab', 2],
      ['hook', 3],
      ['upper', 3],
      ['super', 4],
    ] as const) {
      const m = new DinoModel(createRng(2))
      m.layout(1004, 292, false)
      m.setState(snap())
      settle(m, 1)
      m.onEvent(hitEv('a', 'red', move))
      settle(m, HIT_AT[move] - 1 / 60)
      const p = m.boxerPose(m.fighter('a')!).pose
      expect(p.trail.length, move).toBe(n)
      expect(p.trailAlpha).toBe(1)
      if (move === 'hook') {
        // 弧：中间那个残影不在两头连线上
        const [g0, g1, g2] = p.trail
        const cross = (g1!.x - g0!.x) * (g2!.y - g0!.y) - (g1!.y - g0!.y) * (g2!.x - g0!.x)
        expect(Math.abs(cross)).toBeGreaterThan(1e-4)
      }
    }
  })

  it('旋风拳蓄力：下一题就是旋风拳时按键先原地转一圈、后手拉满；交卷后直接用后手冲出去（不再转）；还不是旋风拳时照常蓄力', () => {
    const m = new DinoModel(createRng(3))
    m.layout(1004, 292, false)
    m.setState(snap({ fighters: [fighter('a', 'red', { streak: 2 })] }))
    settle(m, 1)
    const f = m.fighter('a')!
    m.setState(snap({ fighters: [fighter('a', 'red', { streak: 2, input: '1' })] }))
    settle(m, 0.2)
    expect(f.clipName).toBe('idle')
    m.setState(snap({ fighters: [fighter('a', 'red', { streak: 4, input: '12' })] }))
    settle(m, 0.1)
    expect(f.clipName).toBe('coil')
    const spinning = m.boxerPose(f).pose
    expect(spinning.spin).toBeGreaterThan(0)
    expect(spinning.swirl).toBeGreaterThan(0)
    settle(m, COIL_SPIN_TIME)
    const coiled = m.boxerPose(f).pose
    expect(coiled.spin).toBe(0)
    expect(coiled.rear.x).toBeLessThan(0)
    expect(coiled.rear.s).toBeGreaterThan(1.2)
    m.setState(snap({ fighters: [fighter('a', 'red', { streak: 5, input: '' })], bosses: [stage('shared', 1, 2, 5)] }))
    m.onEvent(hitEv('a', 'red', 'super', { points: 3, streak: 5 }))
    expect(f.punch?.coiled).toBe(true)
    expect(f.punch?.arm).toBe(1)
    let spin = 0
    settle(m, HIT_AT.super + 0.02, () => (spin = Math.max(spin, m.boxerPose(f).pose.spin)))
    expect(spin).toBe(0)
    expect(f.punch?.impacted).toBe(true)
    expect(m.boxerPose(f).pose.rear.s).toBeGreaterThan(1.5)
  })
})

describe('捣蛋龙 · 阶段 2：合力拳、碰拳（M4 / M9）', () => {
  it('合力拳：最近打中过的队友同步出一拳，两只拳套一起打到肚子上（金色光圈），然后两人朝对方举拳、Boss 头顶上方一道金弧闪一下', () => {
    const m = new DinoModel(createRng(21))
    m.layout(1004, 292, false)
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    m.setState(snap({ fighters: two, bosses: [stage('shared', 2, 20, 20)] }))
    settle(m, 1)
    const lane = m.laneOf('shared')!
    const g = lane.geo
    const a = m.fighter('a')!
    const b = m.fighter('b')!
    m.onEvent(hitEv('b', 'blue', 'jab', { points: 1 }))
    settle(m, 0.8)
    m.onEvent(hitEv('a', 'red', 'hook', { together: true }))
    expect(a.punch?.mate).toBe('b')
    expect(b.punch?.echo).toBe(true)
    expect(b.punch?.move).toBe('hook')
    expect(b.clipName).toBe('hook')
    settle(m, HIT_AT.hook + 0.004)
    const boss = lane.boss!
    const s = g.u * boss.look.scale
    const belly = { x: g.bossX + boss.push.value, y: g.floorY - boss.air - s * 0.36 }
    for (const f of [a, b]) {
      const gl = punchGlove(m, f)
      expect(Math.hypot(gl.x - belly.x, gl.y - belly.y), f.id).toBeLessThan(g.u * 0.4)
    }
    expect(m.impacts.some((fx) => fx.color === '#ffd24a')).toBe(true)
    expect(m.links).toHaveLength(1)
    expect(a.hiT).toBeGreaterThanOrEqual(0)
    expect(b.hiT).toBeGreaterThanOrEqual(0)
    settle(m, 0.15)
    expect(a.clipName).toBe('bump')
    expect(b.clipName).toBe('bump')
    const l = m.links[0]!
    settle(m, Math.max(0, LINK_FLASH - l.t) + 0.03)
    const geo = m.linkGeo(l)!
    expect(geo.flash).toBeGreaterThan(0.5)
    expect(geo.grow).toBe(1)
    // 最高点在两只拳之间、比两只拳都高、在 Boss 头顶上方
    expect(geo.cx).toBeGreaterThan(Math.min(geo.ax, geo.bx))
    expect(geo.cx).toBeLessThan(Math.max(geo.ax, geo.bx))
    expect(geo.cy).toBeLessThan(Math.min(geo.ay, geo.by))
    expect(geo.cy).toBeLessThan(m.bossBox('shared')!.y0)
    expect(geo.cy).toBeGreaterThan(0)
    // 两人都朝对方举拳（拳头高过头顶）
    for (const f of [a, b]) expect(m.boxerPose(f).pose.lead.y).toBeLessThan(-1)
    settle(m, LINK_TIME)
    expect(m.links).toHaveLength(0)
    settle(m, 0.5)
    expect(a.hiT).toBe(-1)
    expect(a.clipName).toBe('idle')
  })

  it('光敏安全：击掌的闪光一秒不超过 3 次，挤在一起的那一道只长弧不闪；闪光的那一圈光亮度 ≤ 35%', () => {
    const m = new DinoModel(createRng(23))
    m.layout(1004, 292, false)
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    m.setState(snap({ fighters: two, bosses: [stage('shared', 4, 60, 60)] }))
    settle(m, 1)
    const flashes: number[] = []
    let t = 0
    for (let i = 0; i < 12; i++) {
      m.onEvent(hitEv(i % 2 ? 'a' : 'b', i % 2 ? 'red' : 'blue', 'jab', { together: i > 0 }))
      for (let k = 0; k < 12; k++) {
        m.step(1 / 60)
        t += 1 / 60
        for (const l of m.links) {
          const geo = m.linkGeo(l)
          if (geo && geo.flash > 0.8 && !flashes.some((x) => Math.abs(x - t) < 0.2)) flashes.push(t)
        }
      }
    }
    expect(flashes.length).toBeGreaterThan(1)
    for (let i = 1; i < flashes.length; i++) expect(flashes[i]! - flashes[i - 1]!).toBeGreaterThan(0.3)
    // 画出来的那一圈光：globalAlpha 不超过 0.35
    const ctx = stubCtx()
    const alphas: number[] = []
    const spy = new Proxy(ctx, {
      set(target, key, value) {
        if (key === 'globalAlpha') alphas.push(value as number)
        ;(target as unknown as Record<string | symbol, unknown>)[key] = value
        return true
      },
    })
    drawLink(spy, 0, 100, 200, 100, 100, 20, 1, 1, 1, 1)
    expect(alphas.filter((a) => a < 1).every((a) => a <= 0.35 + 1e-9)).toBe(true)
  })

  it('打倒一只：台上有队友时两人跳起来碰拳（一道金弧），只有自己时一个人举双拳', () => {
    const m = new DinoModel(createRng(22))
    m.layout(1004, 292, false)
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    m.setState(snap({ fighters: two, bosses: [stage('shared', 1, 1, 10)] }))
    settle(m, 1)
    m.setState(snap({ fighters: two, bosses: [stage('shared', 2, 20, 20)] }))
    m.onEvent(hitEv('a', 'red', 'jab', { points: 1 }))
    m.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 2 })
    settle(m, HIT_AT.jab + 0.02)
    for (const f of m.fighters) {
      expect(f.cheerT).toBeGreaterThanOrEqual(0)
      expect(f.bumpCheer).toBe(true)
    }
    expect(m.links).toHaveLength(1)
    settle(m, 0.6)
    expect(m.fighters.every((f) => f.clipName === 'bump')).toBe(true)
  })
})

describe('捣蛋龙 · 阶段 2：Boss 的表演（M8）', () => {
  it('吼（roar）：吸气 → 张大嘴吼（声波）→ 收；这条道的拳手往后仰、眯眼、耳朵和带子被吹向后，吼完回来', () => {
    const d = new Driver('coop', DUO)
    d.start()
    d.step(1)
    const lane = d.model.laneOf('shared')!
    const boss = lane.boss!
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'roar' }])
    expect(boss.mode).toBe('roar')
    d.step(ROAR_OPEN * 0.5)
    expect(d.model.dinoPose(lane, boss).pose.roar).toBe(0)
    d.step(ROAR_OPEN * 0.5 + 0.2)
    const bp = d.model.dinoPose(lane, boss).pose
    expect(bp.roar).toBeGreaterThan(0.9)
    expect(bp.squint).toBeGreaterThan(0.9)
    for (const f of d.model.fighters) {
      expect(f.clipName).toBe('brace')
      const p = d.model.boxerPose(f).pose
      expect(p.lean, f.id).toBeLessThan(-0.15)
      expect(p.squint).toBeGreaterThan(0.5)
      expect(p.blow).toBeGreaterThan(0.5)
    }
    d.step(ROAR_TIME)
    expect(boss.mode).toBe('idle')
    d.step(0.3)
    for (const f of d.model.fighters) {
      expect(f.clipName).toBe('idle')
      expect(Math.abs(d.model.boxerPose(f).pose.lean)).toBeLessThan(0.03)
    }
    // 吼的时候被打中：照吼完（声音是按时刻放的），只是晃一下
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'roar' }])
    d.step(0.3)
    d.answer('a', true)
    d.step(0.2)
    expect(boss.mode).toBe('roar')
  })

  it('果冻球（jelly）：0.25 秒从布袋里掏出来扔、0.85 秒落在拳手身后的台面上抖两下淡掉；拳手一低头躲开，球从他头顶（没低头时脑袋的高度）过去', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    const m = d.model
    const lane = m.laneOf('shared')!
    const boss = lane.boss!
    const f = m.fighter('a')!
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'jelly' }])
    expect(boss.mode).toBe('jelly')
    const j = lane.jelly!
    expect(j.target).toBe('a')
    settle(m, 0.15)
    expect(m.dinoPose(lane, boss).pose.grab).toBeGreaterThan(0.5)
    expect(m.jellyPos(lane, j)).not.toBeNull()
    settle(m, JELLY_THROW - 0.15 - 0.02)
    expect(j.launched).toBe(false)
    settle(m, 0.04)
    expect(j.launched).toBe(true)
    let over = 0
    let ducked = false
    for (let t = JELLY_THROW + 0.02; t < JELLY_LAND - 0.03; t += 1 / 60) {
      m.step(1 / 60)
      const pos = m.jellyPos(lane, j)!
      if (Math.abs(pos.x - f.x) < f.b * 0.12) {
        over += 1
        // 在拳手头顶那一段：球比他低头后的脑袋高、比他没低头时的头顶低（不躲就砸到）
        expect(pos.y).toBeLessThan(f.y - f.b * 0.8)
        expect(pos.y).toBeGreaterThan(f.y - f.b * 1.2)
        expect(f.clipName).toBe('duck')
        const p = m.boxerPose(f).pose
        if (p.sy < 0.8 && p.lean > 0.25) ducked = true
      }
    }
    expect(over).toBeGreaterThan(0)
    expect(ducked).toBe(true)
    expect(j.landed).toBe(false)
    settle(m, 0.06)
    expect(j.landed).toBe(true)
    const landed = m.jellyPos(lane, j)!
    // 落在身后（拳手朝右：更靠左）、在台面上
    expect((landed.x - f.x) * f.dir).toBeLessThan(0)
    expect(landed.y).toBeGreaterThan(f.y - f.b * 0.3)
    settle(m, 0.1)
    expect(m.jellyPos(lane, j)!.sy).not.toBe(1)
    settle(m, JELLY_TIME - JELLY_LAND - 0.2)
    expect(m.jellyPos(lane, j)?.alpha ?? 0).toBeLessThan(0.6)
    settle(m, 0.2)
    expect(lane.jelly).toBeNull()
    expect(boss.mode).toBe('idle')
    settle(m, 0.3)
    expect(f.clipName).toBe('idle')
  })

  it('不在待机就不演：倒数、登场、跳着舞、打倒的过场、暂停、时间到的时候收到 taunt 都忽略', () => {
    const m = new DinoModel(createRng(31))
    m.layout(1004, 292, false)
    m.setState(snap({ phase: 'countdown' }))
    m.onEvent({ type: 'countdown' })
    settle(m, 1)
    m.onEvent({ type: 'taunt', side: 'shared', act: 'roar' })
    expect(m.laneOf('shared')!.boss!.mode).not.toBe('roar')
    m.setState(snap())
    settle(m, 0.1)
    const boss = m.laneOf('shared')!.boss!
    // 刚落地叉腰做鬼脸（登场）
    expect(boss.mode).toBe('land')
    m.onEvent({ type: 'taunt', side: 'shared', act: 'dance' })
    expect(boss.mode).toBe('land')
    settle(m, 0.7)
    m.onEvent({ type: 'taunt', side: 'shared', act: 'dance' })
    expect(boss.mode).toBe('dance')
    m.onEvent({ type: 'taunt', side: 'shared', act: 'jelly' })
    expect(boss.mode).toBe('dance')
    expect(m.laneOf('shared')!.jelly).toBeNull()
    settle(m, DANCE_TIME + 0.1)
    m.setState(snap({ phase: 'paused' }))
    m.onEvent({ type: 'taunt', side: 'shared', act: 'roar' })
    expect(boss.mode).toBe('idle')
    m.setState(snap())
    // 各打各的：没有这一边就不演
    m.onEvent({ type: 'taunt', side: 'red', act: 'roar' })
    expect(boss.mode).toBe('idle')
    m.onEvent({ type: 'timeUp' })
    m.onEvent({ type: 'taunt', side: 'shared', act: 'roar' })
    expect(boss.mode).not.toBe('roar')
  })

  it('各打各的：吼和果冻球只作用于那一边的拳手', () => {
    const d = new Driver('versus', DUO)
    d.start()
    d.step(1)
    const m = d.model
    const a = m.fighter('a')!
    const b = m.fighter('b')!
    d.push(d.m, [{ type: 'taunt', side: 'red', act: 'roar' }])
    d.step(ROAR_OPEN + 0.1)
    expect(a.clipName).toBe('brace')
    expect(b.clipName).toBe('idle')
    expect(m.laneOf('blue')!.boss!.mode).toBe('idle')
    d.step(ROAR_TIME)
    d.push(d.m, [{ type: 'taunt', side: 'blue', act: 'jelly' }])
    expect(m.laneOf('blue')!.jelly!.target).toBe('b')
    expect(m.laneOf('red')!.jelly).toBeNull()
    d.step(0.6)
    expect(b.clipName).toBe('duck')
    expect(a.clipName).toBe('idle')
  })

  it('第 3 只吹泡泡挡拳：待机一会儿吹一个挡在肚子前；拳头先把它打破（迸水珠），再打中；过几秒再吹；第 1、2 只不吹', () => {
    for (const level of [1, 2]) {
      const m = new DinoModel(createRng(40 + level))
      m.layout(1004, 292, false)
      m.setState(snap({ bosses: [stage('shared', level, 10, 10)] }))
      settle(m, 10)
      expect(m.laneOf('shared')!.boss!.bubble).toBe('none')
    }
    const m = new DinoModel(createRng(43))
    m.layout(1004, 292, false)
    m.setState(snap({ bosses: [stage('shared', 3, 15, 15)] }))
    settle(m, 0.2)
    const lane = m.laneOf('shared')!
    const a = lane.boss!
    expect(a.blower).toBe(true)
    expect(a.bubble).toBe('none')
    settle(m, BUBBLE_FIRST[1] + BUBBLE_BLOW + 0.1)
    expect(a.bubble).toBe('float')
    const bub = m.bubblePoint(lane, a)!
    const g = lane.geo
    // 挡在肚子前面（朝着拳手那一侧）
    expect((bub.x - g.bossX) * g.facing).toBeGreaterThan(0)
    expect(bub.y).toBeLessThan(g.floorY)
    expect(bub.r).toBeGreaterThan(g.u * 0.15)
    m.setState(snap({ bosses: [stage('shared', 3, 14, 15)] }))
    m.onEvent(hitEv('a', 'red', 'upper'))
    const f = m.fighter('a')!
    const before = m.particles.count
    settle(m, HIT_AT.upper * BUBBLE_POP_AT + 0.017)
    expect(a.bubble).toBe('none')
    expect(f.punch!.impacted).toBe(false)
    expect(m.particles.count).toBeGreaterThan(before)
    settle(m, HIT_AT.upper)
    expect(f.punch!.impacted).toBe(true)
    expect(a.squint.value).toBeGreaterThan(0.3)
    settle(m, BUBBLE_AGAIN[1] + BUBBLE_BLOW + 0.3)
    expect(a.bubble).toBe('float')
    // 暂停时不长；打倒时泡泡也破掉
    m.setState(snap({ phase: 'paused', bosses: [stage('shared', 3, 14, 15)] }))
    m.setState(snap({ bosses: [stage('shared', 4, 20, 20)] }))
    m.onEvent(hitEv('a', 'red', 'jab'))
    m.onEvent({ type: 'bossDown', side: 'shared', level: 3 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 4 })
    settle(m, 0.2)
    expect(a.bubble).toBe('none')
  })

  it('点一下返回点中的是什么（竞技场按它放声音）；拳手秀肌肉 / 挥手轮流', () => {
    const m = new DinoModel(createRng(5))
    m.layout(1004, 292, false)
    m.setState(snap())
    settle(m, 0.5)
    const lane = m.laneOf('shared')!
    const g = lane.geo
    const s = g.u * lane.boss!.look.scale
    const f = m.fighter('a')!
    expect(m.poke(g.bossX, g.floorY - s * 0.35, 'red')).toBe('boss')
    expect(m.poke(m.geo.gong!.x, m.geo.gong!.y, 'red')).toBe('gong')
    expect(m.poke(20, 20, 'red')).toBe('crowd')
    expect(m.poke(f.x, f.y - f.b * 0.5, 'red')).toBe('fighter')
    settle(m, 0.1)
    expect(f.clipName).toBe('flex')
    settle(m, FLEX_TIME)
    expect(m.poke(f.x, f.y - f.b * 0.5, 'red')).toBe('fighter')
    settle(m, 0.3)
    expect(f.clipName).toBe('wave')
    expect(m.boxerPose(f).pose.lead.y).toBeLessThan(-1.05)
    const game = createDinoGame()
    game.mount({ canvas: stubCanvas(stubCtx()), width: 1004, height: 292, dpr: 1, compact: false, reducedMotion: false })
    game.setState(snap())
    game.tick(0.5)
    expect(game.poke?.(20, 20, 'red')).toBe('crowd')
  })
})

describe('捣蛋龙 · 阶段 2：暂停、减少动画、降级', () => {
  it('暂停：Boss 安静待机（不做小动作、不挑衅），拳手放下拳头轻轻呼吸、不弹跳，火焰光环与灯光呼吸停下；继续就回来；暂停后的 3-2-1 不是新的一局', () => {
    const d = new Driver('coop', SOLO)
    d.start()
    d.step(1)
    d.answer('a', true)
    d.step(1)
    d.timeLeft(9_000)
    d.type('a', '12')
    d.step(1)
    const m = d.model
    const f = m.fighter('a')!
    const lane = m.laneOf('shared')!
    const boss = lane.boss!
    expect(f.fire).toBeGreaterThan(0.9)
    d.push(pause(d.m, d.now), [])
    expect(m.phase).toBe('paused')
    d.step(1)
    expect(f.clipName).toBe('rest')
    expect(m.boxerPose(f).y).toBeCloseTo(f.y, 6)
    expect(m.boxerPose(f).pose.pips).toBe(0)
    expect(m.boxerPose(f).pose.hop).toBe(0)
    expect(f.fire).toBeLessThan(0.05)
    const bounce = f.bounce
    const warm = m.warm
    let gestures = 0
    settle(m, 10, () => {
      if (boss.tongueT >= 0 || boss.wiggleT >= 0) gestures++
    })
    expect(gestures).toBe(0)
    expect(f.bounce).toBe(bounce)
    expect(m.warm).toBe(warm)
    expect(boss.mode).toBe('idle')
    m.onEvent({ type: 'taunt', side: 'shared', act: 'dance' })
    expect(boss.mode).toBe('idle')
    // 继续前的 3-2-1：不复位（还是这一只、血量不变）
    m.setState({ ...d.state(), phase: 'countdown' })
    m.onEvent({ type: 'countdown' })
    expect(lane.boss).toBe(boss)
    expect(boss.mode).toBe('idle')
    d.push(resume(d.m, d.now), [])
    d.step(1)
    expect(f.clipName).toBe('idle')
    expect(f.fire).toBeGreaterThan(0.5)
    expect(f.bounce).not.toBe(bounce)
    expect(m.warm).not.toBe(warm)
    expect(lane.boss).toBe(boss)
  })

  it('减少动画：表演只换姿势 + 小幅位移——吼没有震动、果冻球不飞、上勾拳只离地一点点、旋风拳不转圈，照样看得懂', () => {
    const d = new Driver('coop', SOLO, [1004, 292, false], true)
    d.start()
    d.step(1)
    const m = d.model
    const lane = m.laneOf('shared')!
    const boss = lane.boss!
    const f = m.fighter('a')!
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'roar' }])
    d.step(ROAR_OPEN + 0.2)
    expect(m.dinoPose(lane, boss).pose.roar).toBeGreaterThan(0.9)
    expect(m.boxerPose(f).pose.squint).toBeGreaterThan(0.5)
    expect(m.camera.x).toBe(0)
    d.step(ROAR_TIME)
    d.push(d.m, [{ type: 'taunt', side: 'shared', act: 'jelly' }])
    d.step(JELLY_THROW + 0.05)
    const j = lane.jelly!
    const held = m.jellyPos(lane, j)!
    d.step(0.3)
    const still = m.jellyPos(lane, j)!
    expect(still.x).toBeCloseTo(held.x, 6)
    expect(still.y).toBeCloseTo(held.y, 6)
    expect(f.clipName).toBe('duck')
    d.step(1)
    let air = 0
    let spin = 0
    for (const move of ['upper', 'super'] as const) {
      m.onEvent(hitEv('a', 'red', move))
      settle(m, 1, () => {
        air = Math.max(air, boss.air)
        spin = Math.max(spin, boss.spin, m.boxerPose(f).pose.spin)
      })
    }
    expect(air).toBeGreaterThan(0)
    expect(air).toBeLessThan(lane.geo.u * 0.05)
    expect(spin).toBe(0)
    expect(m.particles.count).toBe(0)
  })

  it('降级 2 级：泡泡破了不迸水珠、击掌不撒亮片', () => {
    const m = new DinoModel(createRng(44))
    m.layout(1004, 292, false)
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    m.setState(snap({ fighters: two, bosses: [stage('shared', 3, 30, 30)] }))
    settle(m, BUBBLE_FIRST[1] + BUBBLE_BLOW + 0.3)
    m.degrade(2)
    expect(m.laneOf('shared')!.boss!.bubble).toBe('float')
    m.onEvent(hitEv('b', 'blue', 'jab'))
    settle(m, 0.8)
    m.onEvent(hitEv('a', 'red', 'jab', { together: true }))
    settle(m, 1)
    expect(m.laneOf('shared')!.boss!.bubble).toBe('none')
    expect(m.particles.count).toBe(0)
    expect(m.impacts).toHaveLength(0)
  })

  it('假 ctx：一起打两个人、第 3 只吹着泡泡、吼 + 果冻球 + 合力拳 + 最后 10 秒同时出现也 ≤ 2500 次调用，save / restore 配对', () => {
    let max = 0
    for (const [W, H, compact] of [
      [1260, 304, false],
      [400, 340, true],
    ] as const) {
      const m = new DinoModel(createRng(45))
      m.layout(W, H, compact)
      const two = [fighter('a', 'red', { streak: 4, input: '12' }), fighter('b', 'blue', { robot: true, avatar: undefined })]
      m.setState(snap({ lastTen: true, fighters: two, bosses: [stage('shared', 3, 30, 30)] }))
      settle(m, BUBBLE_FIRST[1] + BUBBLE_BLOW + 0.3)
      m.onEvent({ type: 'taunt', side: 'shared', act: 'jelly' })
      settle(m, 0.5)
      m.onEvent({ type: 'lastTen' })
      for (let i = 0; i < 30; i++) {
        if (i === 3) m.onEvent(hitEv('b', 'blue', 'super'))
        if (i === 10) m.onEvent(hitEv('a', 'red', 'hook', { together: true }))
        if (i === 12) m.onEvent({ type: 'taunt', side: 'shared', act: 'roar' })
        m.step(1 / 30)
        const ctx = stubCtx()
        renderDynamic(ctx, m, {} as CanvasImageSource)
        max = Math.max(max, ctx.calls.length)
        expect(ctx.count('save')).toBe(ctx.count('restore'))
      }
    }
    expect(max).toBeGreaterThan(300)
    expect(max).toBeLessThan(2500)
  })
})

// ———————————————————— 阶段 3：多设备的观众席、能量拳、上下台（M9 / M12） ————————————————————

const AVS = ['bear', 'pig', 'panda', 'monkey', 'rabbit', 'cat'] as const
/** 台下的 n 个人：红蓝轮流，小动物轮着来 */
const crowdOf = (n: number, from = 0): BossFighter[] =>
  Array.from({ length: n }, (_, i) => fighter(`k${from + i}`, (from + i) % 2 ? 'blue' : 'red', { avatar: AVS[(from + i) % AVS.length] }))
const FOUR = [fighter('a', 'red'), fighter('b', 'red', { avatar: 'bear' }), fighter('c', 'blue'), fighter('d', 'blue', { avatar: 'panda' })]
const multi = (o: Partial<BossGameState> = {}): BossGameState => snap({ fighters: FOUR, crowd: crowdOf(8), bosses: [stage('shared', 2, 40, 40)], ...o })
const crowdHit = (id: string, team: Team, o: Partial<Extract<BossGameEvent, { type: 'hit' }>> = {}): BossGameEvent => ({
  type: 'hit',
  playerId: id,
  team,
  side: 'shared',
  points: 2,
  streak: 3,
  move: 'hook',
  together: false,
  ...o,
})
const overlap = (a: Box, b: Box): boolean => a.x0 < b.x1 - 0.01 && b.x0 < a.x1 - 0.01 && a.y0 < b.y1 - 0.01 && b.y0 < a.y1 - 0.01

/** 多设备的舞台：四种比例（含手机横屏两个人时的矮条、紧凑版）+ 上下叠 */
const MULTI_SIZES: [string, number, number, boolean][] = [
  ['iPad 横屏', 1004, 292, false],
  ['电脑', 1260, 304, false],
  ['手机竖屏', 374, 300, false],
  ['矮一点的横条', 640, 200, false],
  ['手机横屏两个人的矮条', 640, 90, true],
  ['手机横屏紧凑版', 400, 340, true],
  ['又高又窄', 420, 520, false],
]

function mkMulti(W: number, H: number, compact: boolean, s: BossGameState, reducedMotion = false, seed = 7): DinoModel {
  const m = new DinoModel(createRng(seed), { reducedMotion })
  m.layout(W, H, compact)
  m.setState(s)
  settle(m, 0.6)
  return m
}

describe('捣蛋龙 · 阶段 3：观众席（M9）', () => {
  for (const [label, W, H, compact] of MULTI_SIZES) {
    for (const variant of ['coop', 'versus'] as const) {
      it(`${label} ${W}×${H} · ${variant}：台下 0 / 4 / 10 人都在画面里、互不重叠，不压着锣和血条；台上 4 个人都在画面里、脑袋不叠在一起`, () => {
        for (const n of [0, 4, 10]) {
          const bosses = variant === 'coop' ? [stage('shared', 3, 60, 60)] : [stage('red', 3, 30, 30), stage('blue', 3, 30, 30)]
          const m = mkMulti(W, H, compact, multi({ variant, crowd: crowdOf(n), bosses }))
          const g = m.geo
          const what = `${label} ${variant} 台下 ${n} 人`
          if (g.small) {
            // 紧凑版 / 小舞台不画观众席（能量拳从舞台下角飞进来）
            expect(g.seats.red, what).toHaveLength(0)
            for (let i = 0; i < n; i++) expect(m.seatBox(`k${i}`), what).toBeNull()
            expect(m.seatFigures(0), what).toHaveLength(0)
          } else {
            const boxes = Array.from({ length: n }, (_, i) => m.seatBox(`k${i}`))
            // 十个人都坐得下
            for (const b of boxes) expect(b, what).not.toBeNull()
            boxes.forEach((b, i) => inside(b!, W, H, `${what} · 座位 k${i}`))
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) expect(overlap(boxes[i]!, boxes[j]!), `${what} · k${i} 与 k${j} 重叠`).toBe(false)
            const gong = g.gong
            for (const b of boxes) {
              if (gong) expect(overlap(b!, { x0: gong.x - gong.r * 1.3, x1: gong.x + gong.r * 1.3, y0: gong.y - gong.r * 1.4, y1: gong.floorY }), `${what} 压着锣`).toBe(false)
              for (const lane of m.lanes) expect(overlap(b!, m.barBox(lane.side)!), `${what} 压着血条`).toBe(false)
              // 在台子后沿之上（观众区里）
              const band = g.crowdBands[m.geo.seats.red[0]!.band]!
              expect(b!.y1).toBeLessThanOrEqual(g.rings[0]!.backY + 0.01 + (g.stacked ? H : 0))
              expect(b!.y0).toBeGreaterThanOrEqual((g.stacked ? 0 : band.y0) - 0.01)
            }
            // 红队靠左、蓝队靠右（同一片观众区里）
            if (n && g.seatShared) {
              const red = boxes.filter((_, i) => i % 2 === 0).map((b) => b!.x0)
              const blue = boxes.filter((_, i) => i % 2 === 1).map((b) => b!.x0)
              if (red.length && blue.length) expect(Math.max(...red)).toBeLessThan(Math.min(...blue))
            }
            // 画出来的就是坐着的这几个
            const drawn = g.crowdBands.reduce((k, _, bi) => k + m.seatFigures(bi).length, 0)
            expect(drawn, what).toBe(n)
          }
          // 台上 4 个人：都在画面里；同一边前后两排的脑袋不叠在一起；两边的人不叠在一起
          for (const f of m.fighters) inside(m.fighterBox(f.id)!, W, H, `${what} · 拳手 ${f.id}`)
          for (const f of m.fighters) {
            for (const o of m.fighters) {
              if (o === f) continue
              if (o.side === f.side && o.dir === f.dir) {
                if (o.row > f.row) expect(Math.abs(o.x - f.x), `${what} ${f.id} / ${o.id} 脑袋叠在一起`).toBeGreaterThanOrEqual(0.38 * f.b)
              } else if (o.side === f.side) expect(overlap(m.fighterBox(f.id)!, m.fighterBox(o.id)!), `${what} ${f.id} / ${o.id}`).toBe(false)
            }
          }
          for (const lane of m.lanes) for (let level = 1; level <= 5; level++) inside(m.bossBox(lane.side, level)!, W, H, `${what} · Boss 第 ${level} 只`)
        }
      })
    }
  }

  it('座位按 id 稳定分配：别人来来去去时不挪；回到观众席坐原来那个；红队从左边往里、蓝队从右边往里', () => {
    const m = mkMulti(1004, 292, false, multi({ crowd: crowdOf(6) }))
    const idx = (id: string): number => m.seats.find((s) => s.id === id)!.idx
    expect([0, 1, 2, 3, 4, 5].map((i) => idx(`k${i}`))).toEqual([0, 0, 1, 1, 2, 2])
    const x2 = m.seatBox('k2')!.x0
    // k0 上台、a 下台：k2 不挪，a 坐一个空座位
    m.setState(multi({ fighters: [fighter('k0', 'red', { avatar: 'bear' }), ...FOUR.slice(1)], crowd: [fighter('a', 'red'), ...crowdOf(5, 1)] }))
    settle(m, 1)
    expect(m.seatBox('k2')!.x0).toBe(x2)
    expect(idx('a')).toBe(3)
    expect(m.seats.find((s) => s.id === 'k0')).toBeUndefined()
    // k0 回到观众席：还坐 0 号
    m.setState(multi({ crowd: crowdOf(6) }))
    settle(m, 1)
    expect(idx('k0')).toBe(0)
    const red = m.seatBox('k0')!
    const blue = m.seatBox('k1')!
    expect(red.x0).toBeLessThan(m.geo.W * 0.2)
    expect(blue.x1).toBeGreaterThan(m.geo.W * 0.8)
  })

  it('座位不够时：先让出不在台下的人留着的座位；一队人多时可以往另一队那边多坐几个，两队加起来不超过 SEAT_MAX', () => {
    const reds = Array.from({ length: 9 }, (_, i) => fighter(`r${i}`, 'red', { avatar: AVS[i % 6] }))
    const m = mkMulti(1260, 304, false, multi({ crowd: [...reds, fighter('z', 'blue')] }))
    const idx = (id: string): number => m.seats.find((s) => s.id === id)!.idx
    expect(reds.map((r) => idx(r.id))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
    expect(idx('z')).toBe(0)
    // 第 11 个人没座位（不画），能量拳照样从他这一队那边飞出来
    m.setState(multi({ crowd: [...reds, fighter('z', 'blue'), fighter('y', 'blue')] }))
    expect(idx('y')).toBe(-1)
    expect(m.seatBox('y')).toBeNull()
    m.onEvent(crowdHit('y', 'blue'))
    expect(m.energy).toHaveLength(1)
    expect(m.energy[0]!.x0).toBeGreaterThan(m.geo.W * 0.8)
    // 离蓝队最近的那个红队的人上台（座位空出来、沉下去之后）：下一个人坐得上
    m.setState(multi({ crowd: [...reds.slice(0, 8), fighter('z', 'blue'), fighter('y', 'blue')] }))
    expect(idx('y')).toBe(-1)
    settle(m, 0.5)
    m.setState(multi({ crowd: [...reds.slice(0, 8), fighter('z', 'blue'), fighter('y', 'blue')] }))
    expect(idx('y')).toBe(1)
    // 别人的座位不挪
    expect(reds.slice(0, 8).map((r) => idx(r.id))).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('真人在剪影前排：画在剪影后面（同一个裁剪里）、更亮（队色的光）；紧凑版没有观众席', () => {
    const m = mkMulti(1004, 292, false, multi())
    const ctx = stubCtx()
    renderDynamic(ctx, m, {} as CanvasImageSource)
    expect(ctx.count('save')).toBe(ctx.count('restore'))
    expect(m.seatFigures(0)).toHaveLength(8)
    const c = mkMulti(400, 340, true, multi())
    expect(c.seatFigures(0)).toHaveLength(0)
    expect(c.crowd).toHaveLength(0)
  })
})

describe('捣蛋龙 · 阶段 3：能量拳（M9）', () => {
  it('台下的人打中：从他的牌子里飞出能量拳（牌子举高），ENERGY_AT 秒打到肚子——Boss 的反应、星星、血条掉血、冲击环都在那一刻', () => {
    const m = mkMulti(1004, 292, false, multi())
    const lane = m.laneOf('shared')!
    const boss = lane.boss!
    // 快照先到（血少了 2），事件后到
    m.setState(multi({ bosses: [stage('shared', 2, 38, 40)] }))
    m.onEvent(crowdHit('k0', 'red', { points: 2 }))
    expect(m.energy).toHaveLength(1)
    const fist = m.energy[0]!
    expect(fist.p.hitAt).toBe(ENERGY_AT)
    const seat = m.seats.find((s) => s.id === 'k0')!
    const sign = m.seatFigure(seat)!
    // 起点就是他举着的牌子
    const box = m.seatBox('k0')!
    expect(fist.x0).toBeGreaterThanOrEqual(box.x0)
    expect(fist.x0).toBeLessThanOrEqual(box.x1)
    expect(fist.y0).toBeLessThan(sign.y)
    settle(m, 0.12)
    expect(m.seatFigure(seat)!.lift).toBeGreaterThan(0.8)
    // 还在飞：Boss 没反应、血条没掉
    const mid = m.energyPoint(fist, fist.p.t)
    expect(mid.x).toBeGreaterThan(fist.x0)
    expect(boss.squint.value).toBe(0)
    expect(lane.bar.target).toBe(40)
    expect(m.impacts).toHaveLength(0)
    expect(m.stars).toHaveLength(0)
    const figs = m.energyFigures()
    expect(figs).toHaveLength(1)
    expect(figs[0]!.trail.length).toBeGreaterThan(0)
    expect(figs[0]!.halo).toBeLessThanOrEqual(0.35)
    // 打到之前的最后一帧还没反应
    while (fist.p.t + 1 / 60 < ENERGY_AT - 1e-9) m.step(1 / 60)
    expect(boss.squint.value).toBe(0)
    expect(lane.bar.target).toBe(40)
    settle(m, 2 / 60)
    // 打到了：直拳那样的反应、星星、血条、白 + 队色冲击环、一团光
    expect(m.energy).toHaveLength(0)
    expect(boss.squint.value).toBeGreaterThan(0.3)
    expect(m.stars.length).toBeGreaterThan(0)
    expect(lane.bar.target).toBe(38)
    expect(m.impacts.map((i) => i.color)).toEqual(['#ffffff', '#ff6b6b'])
    expect(m.glows.some((gl) => !gl.calm)).toBe(true)
    // 打在肚子上（红队的座位在左边：从左边打过来）
    const belly = m.bellyPoint(lane, boss, -1)
    expect(Math.abs(m.impacts[0]!.x - belly.x)).toBeLessThan(lane.geo.u * 0.05)
    expect(Math.abs(m.impacts[0]!.y - belly.y)).toBeLessThan(lane.geo.u * 0.2)
  })

  it('分多冲击大一点，合力拳冒金光；几个同时飞的各走各的路、各自在 ENERGY_AT 打到', () => {
    const m = mkMulti(1004, 292, false, multi())
    m.onEvent(crowdHit('k0', 'red', { points: 1 }))
    settle(m, ENERGY_AT + 0.02)
    const small = m.impacts[0]!.r
    settle(m, 1)
    m.onEvent(crowdHit('k0', 'red', { points: 4, together: true }))
    settle(m, ENERGY_AT + 0.02)
    expect(m.impacts[0]!.r).toBeGreaterThan(small * 1.3)
    expect(m.impacts.some((i) => i.color === '#ffd24a')).toBe(true)
    settle(m, 1)
    // 三个人一起打中
    m.onEvent(crowdHit('k2', 'red'))
    m.onEvent(crowdHit('k4', 'red'))
    m.onEvent(crowdHit('k1', 'blue'))
    expect(m.energy).toHaveLength(3)
    settle(m, 0.18)
    const pts = m.energy.map((f) => m.energyPoint(f, f.p.t))
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y)).toBeGreaterThan(m.energy[0]!.r)
    // 打在肚子上的点也不一样
    const aims = m.energy.map((f) => m.energyAim(m.laneOf('shared')!, f.p))
    expect(new Set(aims.map((a) => Math.round(a.y))).size).toBeGreaterThan(1)
    // 红队的从左边打过来、蓝队的从右边
    expect(m.energy.map((f) => f.p.energy!.dir)).toEqual([1, 1, -1])
    settle(m, ENERGY_AT - 0.18 + 0.02)
    expect(m.energy).toHaveLength(0)
  })

  it('打倒那一拳是能量拳：拳头打到那一刻才开始倒下；太多拳同时飞时最早的直接打到', () => {
    const m = mkMulti(1004, 292, false, multi({ bosses: [stage('shared', 1, 1, 20)] }))
    const lane = m.laneOf('shared')!
    const old = lane.boss!
    m.setState(multi({ bosses: [stage('shared', 2, 40, 40)] }))
    m.onEvent(crowdHit('k0', 'red', { points: 1 }))
    m.onEvent({ type: 'bossDown', side: 'shared', level: 1 })
    m.onEvent({ type: 'bossIn', side: 'shared', level: 2 })
    settle(m, ENERGY_AT - 0.05)
    expect(old.mode).toBe('koWait')
    settle(m, 0.08)
    expect(old.mode).not.toBe('koWait')
    settle(m, 3)
    expect(lane.boss!.level).toBe(2)
    for (let i = 0; i < ENERGY_CAP + 3; i++) m.onEvent(crowdHit(`k${i % 8}`, i % 2 ? 'blue' : 'red'))
    expect(m.energy.length).toBeLessThanOrEqual(ENERGY_CAP)
  })

  it('紧凑版 / 矮条：没有观众席，能量拳从这一队那边的舞台下角飞进来，一路都在画面里', () => {
    for (const [W, H] of [
      [640, 90],
      [400, 340],
    ] as const) {
      for (const variant of ['coop', 'versus'] as const) {
        const bosses = variant === 'coop' ? [stage('shared', 1, 20, 20)] : [stage('red', 1, 10, 10), stage('blue', 1, 10, 10)]
        const m = mkMulti(W, H, true, multi({ variant, bosses }))
        m.onEvent(crowdHit('k0', 'red', { side: variant === 'coop' ? 'shared' : 'red' }))
        m.onEvent(crowdHit('k1', 'blue', { side: variant === 'coop' ? 'shared' : 'blue' }))
        const [red, blue] = m.energy
        const redLane = m.laneOf(variant === 'coop' ? 'shared' : 'red')!.geo
        const blueLane = m.laneOf(variant === 'coop' ? 'shared' : 'blue')!.geo
        expect(red!.x0).toBeLessThan(redLane.bossX)
        expect(red!.x0).toBeLessThanOrEqual(redLane.x0 + 1)
        expect(red!.y0).toBeGreaterThan(redLane.y1 - red!.r * 2)
        expect(blue!.x0).toBeGreaterThanOrEqual(blueLane.x1 - 1)
        for (let t = 0.05; t < ENERGY_AT; t += 0.05) {
          for (const f of [red!, blue!]) {
            const p = m.energyPoint(f, t)
            expect(p.x).toBeGreaterThan(-f.r)
            expect(p.x).toBeLessThan(W + f.r)
            expect(p.y).toBeGreaterThan(0)
            expect(p.y).toBeLessThan(H + f.r)
          }
        }
      }
    }
  })

  it('减少动画：能量拳不飞、不带拖尾、不震，Boss 身上慢慢亮起一团队色的光（≤ 35%），ENERGY_AT 时 Boss 照样有反应', () => {
    const m = mkMulti(1004, 292, false, multi(), true)
    const lane = m.laneOf('shared')!
    const boss = lane.boss!
    m.onEvent(crowdHit('k0', 'red'))
    expect(m.energyFigures()).toHaveLength(0)
    let peak = 0
    settle(m, ENERGY_AT - 0.03, () => {
      peak = Math.max(peak, ...m.glows.map((g) => g.level))
    })
    expect(m.glows.every((g) => g.calm)).toBe(true)
    expect(peak).toBeGreaterThan(0.2)
    expect(peak).toBeLessThanOrEqual(0.35)
    expect(boss.squint.value).toBe(0)
    settle(m, 0.06)
    expect(boss.squint.value).toBeGreaterThan(0.3)
    expect(m.camera.x).toBe(0)
    expect(m.particles.count).toBe(0)
    expect(m.impacts).toHaveLength(0)
    // 连着好几个人打中：一直是那一团光（不一闪一闪）
    for (let i = 0; i < 6; i++) {
      m.onEvent(crowdHit(`k${i}`, i % 2 ? 'blue' : 'red'))
      settle(m, 0.1)
      expect(m.glows.filter((g) => g.side === 'shared')).toHaveLength(1)
    }
  })

  it('降级：2 级没有拖尾、不迸亮片；光敏：命中的闪光一秒不超过 3 次、亮度 ≤ 35%', () => {
    const m = mkMulti(1004, 292, false, multi())
    m.degrade(2)
    m.onEvent(crowdHit('k0', 'red'))
    settle(m, 0.1)
    expect(m.energyFigures()[0]!.trail).toHaveLength(0)
    settle(m, 0.4)
    expect(m.particles.count).toBe(0)
    const n = mkMulti(1004, 292, false, multi())
    let flashes = 0
    const seen = new Set<unknown>()
    for (let i = 0; i < 60; i++) {
      n.onEvent(crowdHit(`k${i % 8}`, i % 2 ? 'blue' : 'red'))
      n.step(1 / 30)
      for (const g of n.glows) {
        expect(g.level).toBeLessThanOrEqual(0.35)
        if (!g.calm && !seen.has(g)) {
          seen.add(g)
          flashes++
        }
      }
    }
    // 两秒：最多 3 × 2 + 1 次
    expect(flashes).toBeLessThanOrEqual(7)
    expect(flashes).toBeGreaterThan(2)
  })
})

describe('捣蛋龙 · 阶段 3：换人上下台（M9）', () => {
  it('上台的从台边跳上来、下台的往自己的座位那边跳过去淡出、座位上冒出来；台上其他人不动，Boss 和拳台不跟着跳', () => {
    const m = mkMulti(1004, 292, false, multi())
    const lane = m.laneOf('shared')!
    const { u, bossX } = lane.geo
    const before = new Map(m.fighters.map((f) => [f.id, { x: f.x, y: f.y, b: f.b, row: f.row }]))
    const bg = m.bgKey()
    const crowd = crowdOf(8)
    // k0（台下，红队）换上 a（台上前排）
    m.setState(multi({ fighters: [fighter('k0', 'red', { avatar: 'bear' }), ...FOUR.slice(1)], crowd: [fighter('a', 'red'), ...crowd.slice(1)] }))
    expect(lane.geo.u).toBe(u)
    expect(lane.geo.bossX).toBe(bossX)
    // 背景没变：不重画离屏背景
    expect(m.bgKey()).toBe(bg)
    const k0 = m.fighter('k0')!
    // 顶替 a 的位置（前排）
    expect(k0.homeX).toBeCloseTo(before.get('a')!.x, 6)
    expect(k0.row).toBe(0)
    expect(k0.glide?.kind).toBe('enter')
    expect(k0.alpha).toBe(0)
    expect(k0.x).toBeLessThan(m.geo.rings[0]!.fx0)
    for (const id of ['b', 'c', 'd']) {
      const f = m.fighter(id)!
      expect(f.x).toBe(before.get(id)!.x)
      expect(f.glide).toBeNull()
    }
    const a = m.leaving.find((f) => f.id === 'a')!
    expect(a.glide?.kind).toBe('leave')
    const seatA = m.seats.find((s) => s.id === 'a')!
    const seatK0 = m.seats.find((s) => s.id === 'k0')!
    expect(seatK0.here).toBe(false)
    // 跳的时候脑袋不碰到血条；跳到一半多时 a 的座位冒出来
    const bar = m.barBox('shared')!
    let seatShownAt = -1
    let t = 0
    settle(m, ENTER_TIME + 0.05, () => {
      t += 1 / 60
      const p = m.boxerPose(k0)
      expect(p.y - boxerTop(k0.kind) * p.b).toBeGreaterThan(bar.y1 - 1)
      if (seatShownAt < 0 && seatA.show > 0) seatShownAt = t
    })
    expect(seatShownAt).toBeGreaterThan(0.2)
    expect(k0.glide).toBeNull()
    expect(k0.x).toBe(k0.homeX)
    expect(k0.alpha).toBe(1)
    expect(m.leaving).toHaveLength(0)
    settle(m, 0.5)
    expect(seatA.show).toBe(1)
    expect(m.seats.find((s) => s.id === 'k0')).toBeUndefined()
    // 上台的人打中：正常出拳（不是能量拳）；下台的人打中：能量拳
    m.onEvent(crowdHit('k0', 'red'))
    m.onEvent(crowdHit('a', 'red'))
    expect(k0.punch).not.toBeNull()
    expect(m.energy.map((f) => f.id)).toEqual(['a'])
  })

  it('台上少了一个人：后排的平滑挪到前排（不瞬移）；Boss 大小不变', () => {
    const m = mkMulti(1004, 292, false, multi())
    const lane = m.laneOf('shared')!
    const u = lane.geo.u
    const b = m.fighter('b')!
    const x0 = b.x
    m.setState(multi({ fighters: FOUR.slice(1), crowd: [fighter('a', 'red'), ...crowdOf(8)] }))
    expect(lane.geo.u).toBe(u)
    expect(b.row).toBe(0)
    expect(b.glide?.kind).toBe('move')
    m.step(1 / 60)
    expect(Math.abs(b.x - x0)).toBeLessThan(lane.geo.u * 0.05)
    let last = b.x
    let maxStep = 0
    settle(m, MOVE_TIME + 0.05, () => {
      maxStep = Math.max(maxStep, Math.abs(b.x - last))
      last = b.x
    })
    expect(b.x).toBe(b.homeX)
    expect(b.homeX).toBeGreaterThan(x0)
    expect(maxStep).toBeLessThan(lane.geo.u * 0.1)
  })

  it('各打各的：每条道最多 2 个人上下台；正在下台的又被换回来：接着从现在的位置回去；换尺寸时直接放好', () => {
    const m = mkMulti(1004, 292, false, multi({ variant: 'versus', bosses: [stage('red', 1, 10, 10), stage('blue', 1, 10, 10)] }))
    const d0 = m.fighter('d')!
    m.setState(multi({ variant: 'versus', fighters: [...FOUR.slice(0, 3), fighter('k1', 'blue', { avatar: 'pig' })], crowd: [fighter('d', 'blue', { avatar: 'panda' }), ...crowdOf(8).filter((c) => c.id !== 'k1')], bosses: [stage('red', 1, 10, 10), stage('blue', 1, 10, 10)] }))
    expect(m.fighter('k1')!.side).toBe('blue')
    settle(m, 0.2)
    expect(m.leaving).toContain(d0)
    const x = d0.x
    // 又换回来
    m.setState(multi({ variant: 'versus', bosses: [stage('red', 1, 10, 10), stage('blue', 1, 10, 10)] }))
    expect(m.fighter('d')).toBe(d0)
    expect(m.leaving).not.toContain(d0)
    expect(d0.x).toBe(x)
    expect(d0.glide?.kind).toBe('move')
    // 换尺寸：直接到位
    m.layout(1260, 304, false)
    expect(d0.glide).toBeNull()
    expect(d0.x).toBe(d0.homeX)
    expect(m.leaving).toHaveLength(0)
  })

  it('减少动画：上下台原地淡入淡出（不跳），挪位置直接到', () => {
    const m = mkMulti(1004, 292, false, multi(), true)
    m.setState(multi({ fighters: [fighter('k0', 'red', { avatar: 'bear' }), ...FOUR.slice(1)], crowd: [fighter('a', 'red'), ...crowdOf(8).slice(1)] }))
    const k0 = m.fighter('k0')!
    expect(k0.x).toBe(k0.homeX)
    settle(m, 0.1)
    expect(k0.hopY).toBe(0)
    expect(k0.alpha).toBeGreaterThan(0)
    expect(k0.alpha).toBeLessThan(1)
    const a = m.leaving[0]!
    expect(a.hopY).toBe(0)
    settle(m, 0.3)
    expect(k0.alpha).toBe(1)
    m.setState(multi({ fighters: [fighter('k0', 'red', { avatar: 'bear' }), ...FOUR.slice(2)], crowd: [fighter('a', 'red'), fighter('b', 'red'), ...crowdOf(8).slice(1)] }))
    expect(k0.glide).toBeNull()
    expect(k0.x).toBe(k0.homeX)
  })

  it('单设备（没有台下的人、最多 2 个）排版和原来一样：不按 2 排留地方', () => {
    const two = [fighter('a', 'red'), fighter('b', 'blue')]
    const m = mkMulti(1004, 292, false, snap({ fighters: two, bosses: [stage('shared', 1, 10, 10)] }))
    const ref = layoutStage(1004, 292, false, { variant: 'coop', sides: ['shared'], fighters: two.map((f) => ({ id: f.id, team: f.team, kind: f.avatar! })) })
    expect(m.laneOf('shared')!.geo.u).toBeCloseTo(ref.lanes[0]!.u, 6)
    expect(m.fighter('a')!.x).toBeCloseTo(ref.lanes[0]!.slots[0]!.x, 6)
  })
})

describe('捣蛋龙 · 阶段 3：表情、点一下（M12）', () => {
  it('发表情：台下的举牌蹦一下、牌子晃；台上的挥手；正在出拳时不打断；不认识的 id 不抛错', () => {
    const m = mkMulti(1004, 292, false, multi())
    const seat = m.seats.find((s) => s.id === 'k1')!
    m.onEvent({ type: 'emote', playerId: 'k1' })
    settle(m, 0.1)
    const fig = m.seatFigure(seat)!
    expect(fig.lift).toBeGreaterThan(0.8)
    expect(fig.hop).toBeGreaterThan(0)
    let shake = 0
    settle(m, 0.3, () => {
      shake = Math.max(shake, Math.abs(m.seatFigure(seat)!.shake))
    })
    expect(shake).toBeGreaterThan(fig.r * 0.15)
    const c = m.fighter('c')!
    m.onEvent({ type: 'emote', playerId: 'c' })
    settle(m, 0.05)
    expect(c.clipName).toBe('wave')
    const a = m.fighter('a')!
    m.onEvent(crowdHit('a', 'red', { move: 'jab' }))
    m.onEvent({ type: 'emote', playerId: 'a' })
    settle(m, 0.05)
    expect(a.clipName).toBe('jab')
    expect(() => m.onEvent({ type: 'emote', playerId: 'nobody' })).not.toThrow()
  })

  it('点一下：点到观众席里的真人返回 crowd、他举一下牌子；点别处还是 crowd（附近的剪影欢呼）', () => {
    const m = mkMulti(1004, 292, false, multi())
    const seat = m.seats.find((s) => s.id === 'k2')!
    const box = m.seatBox('k2')!
    const fig = m.seatFigure(seat)!
    expect(m.hitTest((box.x0 + box.x1) / 2, fig.y - fig.r * 4.7)).toEqual({ kind: 'crowd', id: 'k2' })
    expect(m.poke((box.x0 + box.x1) / 2, fig.y - fig.r * 4.7, 'red')).toBe('crowd')
    settle(m, 0.15)
    expect(m.seatFigure(seat)!.lift).toBeGreaterThan(0.8)
    expect(m.poke(m.geo.W / 2, 6, 'red')).toBe('crowd')
    // 拳手、Boss、锣照旧
    const f = m.fighter('a')!
    expect(m.poke(f.x, f.y - f.b * 0.5, 'red')).toBe('fighter')
    expect(m.poke(m.geo.gong!.x, m.geo.gong!.y, 'red')).toBe('gong')
  })

  it('降级：1 级观众席的牌子不再跟着节奏晃（发表情时照样晃）；减少动画时举牌直接举起来、不蹦', () => {
    const m = mkMulti(1004, 292, false, multi())
    const seat = m.seats.find((s) => s.id === 'k3')!
    let sway = 0
    settle(m, 1, () => {
      sway = Math.max(sway, Math.abs(m.seatFigure(seat)!.shake))
    })
    expect(sway).toBeGreaterThan(0)
    m.degrade(1)
    settle(m, 1, () => {
      expect(m.seatFigure(seat)!.shake).toBe(0)
    })
    const r = mkMulti(1004, 292, false, multi(), true)
    const rs = r.seats.find((s) => s.id === 'k3')!
    r.onEvent({ type: 'emote', playerId: 'k3' })
    r.step(1 / 60)
    const fig = r.seatFigure(rs)!
    expect(fig.lift).toBe(1)
    expect(fig.hop).toBe(0)
    expect(fig.shake).toBe(0)
  })
})

describe('捣蛋龙 · 阶段 3：渲染', () => {
  it('假 ctx：台上 4 个人 + 台下 8 个人 + 能量拳 + 换人 + 合力拳 + 吼 + 果冻球 + 泡泡 + 最后 10 秒同时出现也 ≤ 2500 次调用，save / restore 配对', () => {
    let max = 0
    for (const [W, H, compact] of [
      [1260, 304, false],
      [1004, 292, false],
      [640, 90, true],
      [400, 340, true],
    ] as const) {
      const four = FOUR.map((f, i) => ({ ...f, streak: 4, input: i === 0 ? '12' : '' }))
      const m = mkMulti(W, H, compact, multi({ lastTen: true, fighters: four, bosses: [stage('shared', 3, 90, 90)] }))
      settle(m, BUBBLE_FIRST[1] + BUBBLE_BLOW)
      m.onEvent({ type: 'taunt', side: 'shared', act: 'jelly' })
      settle(m, 0.5)
      m.onEvent({ type: 'lastTen' })
      for (let i = 0; i < 40; i++) {
        if (i === 2) m.onEvent(hitEv('c', 'blue', 'super'))
        if (i === 6) m.onEvent(hitEv('a', 'red', 'hook', { together: true }))
        if (i === 8) m.onEvent({ type: 'taunt', side: 'shared', act: 'roar' })
        if (i === 10) {
          // 换人：k0 上台、b 下台
          m.setState(multi({ lastTen: true, fighters: [four[0]!, fighter('k0', 'red', { avatar: 'bear' }), four[2]!, four[3]!], crowd: [fighter('b', 'red', { avatar: 'bear' }), ...crowdOf(8).slice(1)], bosses: [stage('shared', 3, 80, 90)] }))
        }
        if (i >= 4 && i < 12) {
          m.onEvent(crowdHit(`k${(i % 7) + 1}`, i % 2 ? 'blue' : 'red', { together: i === 7 }))
          m.onEvent({ type: 'emote', playerId: `k${(i % 7) + 1}` })
        }
        m.step(1 / 30)
        const ctx = stubCtx()
        renderDynamic(ctx, m, {} as CanvasImageSource)
        max = Math.max(max, ctx.calls.length)
        expect(ctx.count('save')).toBe(ctx.count('restore'))
      }
      if (!compact) expect(m.seats.length).toBeGreaterThan(5)
    }
    expect(max).toBeGreaterThan(500)
    expect(max).toBeLessThan(2500)
  })

  it('GameModule：台下的人、能量拳、表情、换人、点观众席全流程不抛错；减少动画也画得出来', () => {
    for (const reducedMotion of [false, true]) {
      const ctx = stubCtx()
      const game = createDinoGame()
      game.mount({ canvas: stubCanvas(ctx), width: 1004, height: 292, dpr: 2, compact: false, reducedMotion })
      game.setState(multi({ phase: 'countdown' }))
      game.onEvent({ type: 'countdown' })
      for (let i = 0; i < 20; i++) game.tick(0.05)
      game.setState(multi())
      game.onEvent({ type: 'go' })
      game.onEvent(crowdHit('k0', 'red'))
      game.onEvent({ type: 'emote', playerId: 'k1' })
      game.onEvent({ type: 'emote', playerId: 'c' })
      for (let i = 0; i < 20; i++) game.tick(1 / 60)
      game.setState(multi({ fighters: [fighter('k0', 'red'), ...FOUR.slice(1)], crowd: [fighter('a', 'red'), ...crowdOf(8).slice(1)] }))
      for (let i = 0; i < 40; i++) game.tick(1 / 60)
      expect(BOSS_POKE_TARGETS).toContain(game.poke?.(40, 200, 'red'))
      game.resize(640, 90, 2)
      game.onEvent(crowdHit('k1', 'blue'))
      for (let i = 0; i < 30; i++) game.tick(1 / 60)
      game.destroy()
    }
  })
})
