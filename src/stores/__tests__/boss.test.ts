// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import type { Question } from '@/types/models'
import { AI_ID } from '@/battle/ai'
import { playSfx } from '@/battle/sfx'
import { COUNTDOWN_MS } from '@/battle/match'
import { LAST_TEN_MS } from '@/battle/timed'
import { FEEDBACK_WRONG_MS, useBattleStore } from '../battle'
import { BOSS_FEEDBACK_RIGHT_MS, CLOCK_MS, ROAR_AT_MS, SPLAT_AT_MS, TAUNT_AFTER_MS, TAUNT_AGAIN_MS, TAUNT_REPEAT_MS, TICKLE_AGAIN_MS, bossInKey, useBossStore } from '../boss'
import { bestKey, BEST_MAX, withBest } from '@/battle/boss'

vi.mock('@/battle/sfx', async (orig) => ({ ...(await orig<typeof import('@/battle/sfx')>()), playSfx: vi.fn() }))

const KP = 's1-05-carry-add'
const T0 = 1_700_000_000_000

function correctOf(q: Question): number | string {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}
function wrongOf(q: Question): number | string {
  if (q.answer.kind === 'number') return q.answer.value + 1
  const answer = q.answer
  return q.choices!.find((c) => c.id !== (answer.kind === 'choice' ? answer.choiceId : ''))!.id
}

/** 开一局并开打：倒数结束的时刻是 T0 */
function started(opts: Parameters<ReturnType<typeof useBossStore>['startLocal']>[0]) {
  const s = useBossStore()
  vi.setSystemTime(T0 - COUNTDOWN_MS)
  s.startLocal({ now: T0 - COUNTDOWN_MS, ...opts })
  vi.setSystemTime(T0)
  s.beginPlay(T0)
  return s
}

/** 某人答一题（对 / 错），然后等反馈窗口过去 */
function answerOnce(s: ReturnType<typeof useBossStore>, id: string, ok: boolean): void {
  const p = s.state!.players.find((x) => x.id === id)!
  const q = s.questionOf(p)
  s.submit(id, ok ? correctOf(q) : wrongOf(q), Date.now())
  vi.advanceTimersByTime(ok ? BOSS_FEEDBACK_RIGHT_MS : FEEDBACK_WRONG_MS)
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.mocked(playSfx).mockClear()
})
afterEach(() => {
  useBossStore().leave()
  vi.useRealTimers()
})

describe('打怪兽的偏好（M5）', () => {
  it('玩法页签、谁来玩、一起打还是各打各的、时长记在对战偏好里；坏数据回默认', () => {
    const b = useBattleStore()
    expect(b.prefs.format).toBe('battle')
    expect(b.prefs.boss).toEqual({ mode: 'solo', variant: 'coop', durationS: 90 })
    b.prefs.format = 'boss'
    b.prefs.boss = { mode: 'duo', variant: 'versus', durationS: 120 }
    setActivePinia(createPinia())
    const again = useBattleStore()
    expect(again.prefs.format).toBe('boss')
    expect(again.prefs.boss).toEqual({ mode: 'duo', variant: 'versus', durationS: 120 })
    localStorage.setItem('tongbulian:battle', JSON.stringify({ format: 'nope', boss: { mode: 'x', variant: 'y', durationS: 75 } }))
    setActivePinia(createPinia())
    const broken = useBattleStore()
    expect(broken.prefs.format).toBe('battle')
    expect(broken.prefs.boss).toEqual({ mode: 'solo', variant: 'coop', durationS: 90 })
  })
})

describe('一个人打（M1–M3）', () => {
  it('开局进倒数、第一次讲规则；开打后计时器走；答对打 Boss、答错打空', () => {
    const s = useBossStore()
    s.startLocal({ kpId: KP, mode: 'solo', now: T0 - COUNTDOWN_MS })
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.variant).toBe('coop')
    expect(s.state!.players.map((p) => [p.id, p.team, p.kind])).toEqual([['left', 'red', 'human']])
    expect(s.operable).toEqual(['left'])
    expect(s.intro).toBe(true)
    expect(s.events.map((e) => e.e.type)).toEqual(['countdown'])
    vi.setSystemTime(T0)
    s.beginPlay(T0)
    expect(s.state!.phase).toBe('playing')
    expect(s.events.at(-1)!.e.type).toBe('go')
    expect(s.remaining).toBe(90_000)
    vi.advanceTimersByTime(10_000)
    expect(s.remaining).toBe(80_000)

    answerOnce(s, 'left', true)
    expect(s.state!.players[0]!.score).toBe(1)
    expect(s.events.at(-1)!.e).toMatchObject({ type: 'hit', playerId: 'left', points: 1, move: 'jab' })
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('punch')
    answerOnce(s, 'left', false)
    expect(s.events.at(-1)!.e).toMatchObject({ type: 'miss', playerId: 'left' })
    expect(s.wrongs).toEqual([{ playerId: 'left', index: 1 }])
    expect(s.timeline).toHaveLength(1)
  })

  it('答对后 400 ms、答错后 1.2 秒出下一题；反馈窗口里再交不算', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    const q = s.questionOf(s.state!.players[0]!)
    s.submit('left', correctOf(q), Date.now())
    expect(s.pending.left).toBeTruthy()
    s.submit('left', correctOf(q), Date.now())
    expect(s.state!.players[0]!.index).toBe(1)
    vi.advanceTimersByTime(BOSS_FEEDBACK_RIGHT_MS - 1)
    expect(s.pending.left).toBeTruthy()
    vi.advanceTimersByTime(1)
    expect(s.pending.left).toBeUndefined()
  })

  it('打倒一只：弹「打倒啦」，过一会儿说下一只来了', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    // 第 1 只 5 血：连对 4 题 = 1 + 1 + 2 + 2
    for (let i = 0; i < 4; i++) answerOnce(s, 'left', true)
    const types = s.events.map((e) => e.e.type)
    expect(types).toContain('bossDown')
    expect(types.at(-1)).toBe('bossIn')
    expect(s.state!.bosses[0]).toMatchObject({ level: 2, downs: 1 })
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('deflate')
    // 答完第 4 题后已经过了 400 ms：「打倒啦」还在；再过一会儿换成下一只的介绍
    expect(s.callout?.key).toBe('boss.down')
    vi.advanceTimersByTime(1300)
    expect(s.callout?.key).toBe(bossInKey(2))
  })

  it('最后 10 秒弹提示、每题多 1 分；时间到结束，之后交的不算', () => {
    const s = started({ kpId: KP, mode: 'solo', durationS: 60 })
    vi.advanceTimersByTime(60_000 - LAST_TEN_MS + CLOCK_MS)
    expect(s.state!.lastTen).toBe(true)
    expect(s.callout?.key).toBe('boss.lastTen')
    answerOnce(s, 'left', true)
    expect(s.events.filter((e) => e.e.type === 'hit').at(-1)!.e).toMatchObject({ points: 2 })
    vi.advanceTimersByTime(LAST_TEN_MS)
    expect(s.state!.phase).toBe('ended')
    expect(s.events.slice(-2).map((e) => e.e.type)).toEqual(['timeUp', 'finished'])
    expect(s.remaining).toBe(0)
    const before = s.state!.players[0]!.index
    const q = s.questionOf(s.state!.players[0]!)
    s.submit('left', correctOf(q), Date.now())
    expect(s.state!.players[0]!.index).toBe(before)
  })

  it('6 秒没人打中，Boss 演一段（M8）：挑衅舞 → 吼 → 扔果冻轮流；说话至少隔 12 秒；吼、果冻的声音对着画面', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    const taunts = () => s.events.filter((x) => x.e.type === 'taunt').map((x) => x.e)
    vi.advanceTimersByTime(TAUNT_AFTER_MS - CLOCK_MS)
    expect(taunts()).toEqual([])
    expect(s.bossLine).toBeNull()
    vi.advanceTimersByTime(CLOCK_MS * 2)
    expect(taunts()).toEqual([{ type: 'taunt', side: 'shared', act: 'dance' }])
    expect(s.bossLine?.key).toBe('boss.taunt')
    vi.mocked(playSfx).mockClear()
    vi.advanceTimersByTime(TAUNT_REPEAT_MS)
    expect(taunts().map((e) => e.type === 'taunt' && e.act)).toEqual(['dance', 'roar'])
    // 离上一句不到 12 秒：吼的时候不说话，只有声音（晚一点，和张嘴那一帧对齐）
    expect(TAUNT_REPEAT_MS).toBeLessThan(TAUNT_AGAIN_MS)
    vi.advanceTimersByTime(ROAR_AT_MS)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('roar')
    vi.advanceTimersByTime(TAUNT_REPEAT_MS - ROAR_AT_MS)
    expect(taunts().map((e) => e.type === 'taunt' && e.act)).toEqual(['dance', 'roar', 'jelly'])
    expect(s.bossLine?.key).toBe('boss.jelly')
    vi.advanceTimersByTime(SPLAT_AT_MS)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['toss', 'splat']))
  })

  it('表演还没出手就暂停了：果冻球不扔，「嗖」「啪」也不响', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    s.taunt('shared', 'jelly', Date.now())
    s.pause(Date.now())
    vi.mocked(playSfx).mockClear()
    vi.advanceTimersByTime(SPLAT_AT_MS + 100)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).not.toContain('toss')
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).not.toContain('splat')
  })

  it('打中了就重新数 6 秒；挥空不算', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    const taunts = () => s.events.filter((x) => x.e.type === 'taunt').length
    vi.advanceTimersByTime(4000)
    answerOnce(s, 'left', true)
    vi.advanceTimersByTime(TAUNT_AFTER_MS - BOSS_FEEDBACK_RIGHT_MS - CLOCK_MS * 2)
    expect(taunts()).toBe(0)
    vi.advanceTimersByTime(CLOCK_MS * 3)
    expect(taunts()).toBe(1)
    answerOnce(s, 'left', false)
    vi.advanceTimersByTime(TAUNT_REPEAT_MS)
    expect(taunts()).toBe(2)
  })

  it('各打各的：两只 Boss 各自数，打中红队那只不耽误蓝队那只演', () => {
    const s = started({ kpId: KP, mode: 'duo', variant: 'versus' })
    vi.advanceTimersByTime(3000)
    answerOnce(s, 'left', true)
    vi.advanceTimersByTime(TAUNT_AFTER_MS - 3000 - BOSS_FEEDBACK_RIGHT_MS + CLOCK_MS)
    expect(s.events.filter((x) => x.e.type === 'taunt').map((x) => x.e)).toEqual([{ type: 'taunt', side: 'blue', act: 'dance' }])
  })

  it('暂停（M1）：计时停、不演、不能答；继续后时间接着走，挪过暂停的那么久', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    vi.advanceTimersByTime(10_000)
    const left = s.remaining
    s.pause(Date.now())
    expect(s.state!.phase).toBe('paused')
    vi.advanceTimersByTime(60_000)
    s.advance(Date.now())
    expect(s.remaining).toBe(left)
    expect(s.events.filter((x) => x.e.type === 'taunt')).toHaveLength(1) // 暂停前那一段（6 秒）
    const p = s.state!.players[0]!
    s.submit('left', correctOf(s.questionOf(p)), Date.now())
    expect(s.state!.players[0]!.score).toBe(0)
    s.resume(Date.now())
    expect(s.state!.phase).toBe('playing')
    vi.advanceTimersByTime(1000)
    expect(s.remaining).toBeGreaterThan(left - 1500)
    expect(s.remaining).toBeLessThan(left)
    // 暂停前离下一段表演还有 4 秒：继续后 4 秒左右才演，不是一继续就演
    expect(s.events.filter((x) => x.e.type === 'taunt')).toHaveLength(1)
    vi.advanceTimersByTime(TAUNT_REPEAT_MS - 4000)
    expect(s.events.filter((x) => x.e.type === 'taunt')).toHaveLength(2)
    vi.advanceTimersByTime(90_000)
    expect(s.state!.phase).toBe('ended')
  })

  it('和机器人一起打时暂停：机器人也停，继续后接着答', () => {
    const s = started({ kpId: KP, mode: 'ai', variant: 'coop', aiSeed: 3 })
    s.pause(Date.now())
    const robot = () => s.state!.players.find((p) => p.id === AI_ID)!
    const before = robot().index
    vi.advanceTimersByTime(60_000)
    expect(robot().index).toBe(before)
    s.resume(Date.now())
    vi.advanceTimersByTime(40_000)
    expect(robot().index).toBeGreaterThan(before)
  })

  it('点一下舞台（M12）：按游戏说的点中了什么放声音；点 Boss 隔一会儿说一句「好痒」', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    const sounds = () => vi.mocked(playSfx).mock.calls.map((c) => c[0])
    vi.mocked(playSfx).mockClear()
    s.poke('red', 'boss', Date.now())
    expect(sounds()).toEqual(['giggle'])
    expect(s.bossLine?.key).toBe('boss.tickle')
    vi.advanceTimersByTime(3000)
    s.poke('red', 'boss', Date.now())
    expect(s.bossLine).toBeNull()
    vi.advanceTimersByTime(TICKLE_AGAIN_MS)
    s.poke('red', 'boss', Date.now())
    expect(s.bossLine?.key).toBe('boss.tickle')
    vi.mocked(playSfx).mockClear()
    s.poke('blue', 'fighter')
    s.poke('red', 'gong')
    s.poke('red', 'crowd')
    s.poke('red', undefined)
    expect(sounds()).toEqual(['boing', 'gong', 'cheer'])
  })

  it('一个人打的最好成绩（M7）：比以前高就是新纪录并记下；没打破只报以前的；按知识点 + 时长分开记', () => {
    const b = useBattleStore()
    let s = started({ kpId: KP, mode: 'solo' })
    answerOnce(s, 'left', true)
    answerOnce(s, 'left', true)
    vi.advanceTimersByTime(90_000)
    expect(s.record).toEqual({ score: 2, best: null, isNew: true })
    expect(b.prefs.bossBest[bestKey(KP, 90)]).toBe(2)
    s = started({ kpId: KP, mode: 'solo' })
    answerOnce(s, 'left', true)
    vi.advanceTimersByTime(90_000)
    expect(s.record).toEqual({ score: 1, best: 2, isNew: false })
    expect(b.prefs.bossBest[bestKey(KP, 90)]).toBe(2)
    s = started({ kpId: KP, mode: 'solo', durationS: 60 })
    vi.advanceTimersByTime(60_000)
    expect(s.record).toEqual({ score: 0, best: null, isNew: false })
    // 存下来了，坏数据读的时候丢掉
    setActivePinia(createPinia())
    expect(useBattleStore().prefs.bossBest).toEqual({ [bestKey(KP, 90)]: 2 })
    localStorage.setItem('tongbulian:battle', JSON.stringify({ bossBest: { [bestKey(KP, 90)]: 5, nope: 3, [bestKey(KP, 60)]: -1, [bestKey(KP, 120)]: 'x' } }))
    setActivePinia(createPinia())
    expect(useBattleStore().prefs.bossBest).toEqual({ [bestKey(KP, 90)]: 5 })
  })

  it('和机器人、两人一台不记最好成绩', () => {
    const s = started({ kpId: KP, mode: 'duo', variant: 'coop' })
    answerOnce(s, 'left', true)
    vi.advanceTimersByTime(90_000)
    expect(s.record).toBeNull()
    expect(useBattleStore().prefs.bossBest).toEqual({})
  })

  it('最好成绩最多记 BEST_MAX 个，新打破的挪到最后', () => {
    let best: Record<string, number> = {}
    for (let i = 0; i < BEST_MAX + 5; i++) best = withBest(best, bestKey(`k${i}`, 90), i)
    expect(Object.keys(best)).toHaveLength(BEST_MAX)
    expect(best[bestKey('k0', 90)]).toBeUndefined()
    best = withBest(best, bestKey('k10', 90), 99)
    expect(Object.keys(best).at(-1)).toBe(bestKey('k10', 90))
  })

  it('再来一局：同样的人和时长、新题目，不再讲规则', () => {
    const s = started({ kpId: KP, mode: 'solo', durationS: 120 })
    answerOnce(s, 'left', true)
    s.rematch(Date.now())
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.durationMs).toBe(120_000)
    expect(s.state!.players[0]!.score).toBe(0)
    expect(s.intro).toBe(false)
    expect(s.timeline).toEqual([])
  })
})

describe('和机器人、两人一台（M4 / M5）', () => {
  it('和机器人一起打：机器人自己答题、打同一只 Boss', () => {
    const s = started({ kpId: KP, mode: 'ai', variant: 'coop', aiSeed: 7 })
    expect(s.state!.players.map((p) => [p.id, p.kind])).toEqual([
      ['left', 'human'],
      [AI_ID, 'ai'],
    ])
    expect(s.operable).toEqual(['left'])
    expect(s.state!.bosses).toHaveLength(1)
    expect(s.state!.bosses[0]!.max).toBe(10)
    vi.advanceTimersByTime(60_000)
    const robot = s.state!.players.find((p) => p.id === AI_ID)!
    expect(robot.index).toBeGreaterThan(2)
  })

  it('两人一台各打各的：两条 Boss 链，时间到按得分定胜负', () => {
    const s = started({ kpId: KP, mode: 'duo', variant: 'versus' })
    expect(s.operable).toEqual(['left', 'right'])
    expect(s.state!.bosses.map((b) => b.side)).toEqual(['red', 'blue'])
    answerOnce(s, 'left', true)
    answerOnce(s, 'left', true)
    answerOnce(s, 'right', true)
    vi.advanceTimersByTime(90_000)
    expect(s.state!.phase).toBe('ended')
    expect(s.state!.winner).toBe('red')
  })

  it('两个人 1.5 秒内先后打中是合力拳（一起打），击掌一声', () => {
    const s = started({ kpId: KP, mode: 'duo', variant: 'coop' })
    const a = s.questionOf(s.state!.players[0]!)
    const b = s.questionOf(s.state!.players[1]!)
    s.submit('left', correctOf(a), Date.now())
    vi.advanceTimersByTime(500)
    s.submit('right', correctOf(b), Date.now())
    expect(s.events.at(-1)!.e).toMatchObject({ type: 'hit', together: true })
    // 声音放在拳头打到的那一刻（HIT_AT）
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).not.toContain('clap')
    vi.advanceTimersByTime(200)
    expect(vi.mocked(playSfx).mock.calls.map((c) => c[0])).toContain('clap')
  })

  it('离开：清空、计时器停', () => {
    const s = started({ kpId: KP, mode: 'solo' })
    s.leave()
    expect(s.state).toBeNull()
    vi.advanceTimersByTime(120_000)
    expect(s.state).toBeNull()
  })
})
