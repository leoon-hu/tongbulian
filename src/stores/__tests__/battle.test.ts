// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import '@/content/math/grade1'
import type { Player } from '@/battle/protocol'
import { AI_ID } from '@/battle/ai'
import type { Question } from '@/types/models'
import { EVENT_LOG, FEEDBACK_CALLOUT_MS, FEEDBACK_RIGHT_MS, FEEDBACK_WRONG_MS, INTRO_AGAIN_MS, POKE_GAP_MS, useBattleStore } from '../battle'
import { BOT_REPLY_MS, EMOTE_GAP_MS, EMOTE_MS } from '@/battle/emotes'
import { playSfx } from '@/battle/sfx'
import { apply, createRoom, join, snapshot } from '../../../server/room'
import { ROBOT_LINE_DELAY_MS, ROBOT_SAY_MS, planAnswer } from '@/battle/ai'

vi.mock('@/battle/ai', async (orig) => {
  const m = await orig<typeof import('@/battle/ai')>()
  return { ...m, planAnswer: vi.fn(m.planAnswer) }
})
vi.mock('@/battle/sfx', async (orig) => ({ ...(await orig<typeof import('@/battle/sfx')>()), playSfx: vi.fn() }))

const KP = 's1-05-carry-add'

function correctOf(q: Question): number | string {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('对战偏好（B50）', () => {
  it('昵称、皮肤、机器人快慢记在 tongbulian:battle，重开还在；坏数据回默认', () => {
    const s = useBattleStore()
    expect(s.prefs.names.me).toBe('')
    s.setName('me', '  🐰 小兔 ')
    s.setName('right', '小虎')
    s.prefs.aiLevel = 'fast'
    const raw = JSON.parse(localStorage.getItem('tongbulian:battle')!)
    expect(raw.names).toEqual({ me: '🐰 小兔', left: '', right: '小虎' })
    const clientId = raw.clientId
    setActivePinia(createPinia())
    const again = useBattleStore()
    expect(again.prefs.names.me).toBe('🐰 小兔')
    expect(again.prefs.aiLevel).toBe('fast')
    expect(again.prefs.clientId).toBe(clientId)

    localStorage.setItem('tongbulian:battle', '{"skin":"nope","aiLevel":"turbo","names":5,"difficulty":9')
    setActivePinia(createPinia())
    const broken = useBattleStore()
    expect(broken.prefs.aiLevel).toBe('auto') // 默认「跟着你」（B60）
    localStorage.setItem('tongbulian:battle', JSON.stringify({ skin: 'nope', aiLevel: 'turbo', names: 5, difficulty: 9 }))
    setActivePinia(createPinia())
  })
})

describe('两人同屏（B12）', () => {
  it('开场规则句：本设备第一次进这个游戏才讲，同一个游戏一天内不重复，换游戏再讲，再来一局不讲；记在偏好里重开还在', () => {
    const t0 = 1_700_000_000_000
    const s = useBattleStore()
    s.prefs.names.me = '小兔'
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', now: t0 })
    expect(s.intro).toBe(true)
    expect(s.prefs.intros.race).toBe(t0)
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', now: t0 + 60 * 60 * 1000 })
    expect(s.intro).toBe(false)
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'tower', now: t0 + 60 * 60 * 1000 })
    expect(s.intro).toBe(true)
    s.rematch(undefined, t0 + 2 * 60 * 60 * 1000)
    expect(s.intro).toBe(false)
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', now: t0 + INTRO_AGAIN_MS + 1 })
    expect(s.intro).toBe(true)
    expect(s.prefs.intros.race).toBe(t0 + INTRO_AGAIN_MS + 1)
    setActivePinia(createPinia())
    const again = useBattleStore()
    expect(again.prefs.intros.race).toBe(t0 + INTRO_AGAIN_MS + 1)
    again.startLocal({ kpId: KP, mode: 'ai', skin: 'race', now: t0 + INTRO_AGAIN_MS + 2 })
    expect(again.intro).toBe(false)
  })

  it('倒数 → 开打 → 左边连对 8 题 → 红队赢；反馈窗口按对错停留后清掉', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.setName('right', '小虎')
    s.startLocal({ kpId: KP, mode: 'duo', skin: 'race', seeds: { left: 1, right: 2 } })
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.skin).toBe('race')
    expect(s.state!.players.map((p) => [p.id, p.name, p.team])).toEqual([
      ['left', '小兔', 'red'],
      ['right', '小虎', 'blue'],
    ])
    expect(s.operable).toEqual(['left', 'right'])
    s.beginPlay()
    expect(s.state!.phase).toBe('playing')

    // 先答错一题：不加分，反馈窗口 1.2 秒
    const left = (): Player => s.state!.players[0]!
    const q0 = s.questionOf(left())
    s.submit('left', q0.answer.kind === 'number' ? -1 : 'zzz')
    expect(s.state!.score.red).toBe(0)
    expect(s.pending.left).toMatchObject({ correct: false })
    // 窗口期内再提交被忽略
    s.submit('left', correctOf(s.questionOf(left())))
    expect(left().index).toBe(1)
    vi.advanceTimersByTime(FEEDBACK_WRONG_MS - 1)
    expect(s.pending.left).toBeDefined()
    vi.advanceTimersByTime(2)
    expect(s.pending.left).toBeUndefined()

    for (let i = 0; i < 8; i++) {
      s.submit('left', correctOf(s.questionOf(left())))
      expect(s.pending.left).toMatchObject({ correct: true })
      // 连对 3 / 5 题与到 7 分会弹提示（B5a），弹的时候反馈窗口延长到 1.4 秒
      const score = i + 1
      if (score === 3 || score === 5) expect(s.callout).toMatchObject({ key: 'battle.streak', team: 'red', p: { n: score } })
      else if (score === 7) expect(s.callout).toMatchObject({ key: 'battle.nearWin', team: 'red' })
      else if (score === 4) expect(s.callout).toMatchObject({ key: 'battle.half.red', team: 'red' })
      vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
      if (s.pending.left) vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS - FEEDBACK_RIGHT_MS)
      expect(s.pending.left).toBeUndefined()
    }
    expect(s.state!.phase).toBe('ended')
    expect(s.state!.winner).toBe('red')
    expect(s.state!.score).toEqual({ red: 8, blue: 0 })
    expect(left()).toMatchObject({ index: 9, correct: 8 })
    expect(s.lastEvent).toEqual({ type: 'finished', winner: 'red' })
    // 结束后提交无效
    s.submit('right', correctOf(s.questionOf(s.state!.players[1]!)))
    expect(s.state!.score.blue).toBe(0)

    s.rematch({ left: 5, right: 6 })
    expect(s.state!.phase).toBe('countdown')
    expect(s.state!.score).toEqual({ red: 0, blue: 0 })
    expect(s.state!.players[0]!.seed).toBe(5)
    s.leave()
    expect(s.state).toBeNull()
  })
})

describe('事件队列（B34：给游戏宿主用）', () => {
  it('倒数、开打、每次答题的事件按序号入队，同一次答题的几条都在；只留最近 EVENT_LOG 条；离开清空', () => {
    const s = useBattleStore()
    s.setName('me', 'A')
    s.setName('right', 'B')
    s.startLocal({ kpId: KP, mode: 'duo', skin: 'race', seeds: { left: 1, right: 2 } })
    expect(s.events.map((x) => x.e.type)).toEqual(['countdown'])
    s.beginPlay()
    expect(s.events.map((x) => x.e.type)).toEqual(['countdown', 'go'])
    expect(s.events.map((x) => x.seq)).toEqual([1, 2])
    const left = (): Player => s.state!.players[0]!
    for (let i = 0; i < 3; i++) {
      s.submit('left', correctOf(s.questionOf(left())))
      vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS + 1)
    }
    // 第 3 题答对：answered → point → streak 三条都在，序号递增
    const tail = s.events.slice(-3)
    expect(tail.map((x) => x.e.type)).toEqual(['answered', 'point', 'streak'])
    expect(tail.map((x) => x.seq)).toEqual([tail[0]!.seq, tail[0]!.seq + 1, tail[0]!.seq + 2])
    // 一直答错不会结束比赛：把队列灌满，只留最近 EVENT_LOG 条，序号继续递增
    for (let i = 0; i < EVENT_LOG + 10; i++) {
      const q = s.questionOf(s.state!.players[1]!)
      s.submit('right', q.answer.kind === 'number' ? -1 : 'zzz')
      vi.advanceTimersByTime(FEEDBACK_WRONG_MS + 1)
    }
    expect(s.events).toHaveLength(EVENT_LOG)
    const seqs = s.events.map((x) => x.seq)
    expect(seqs[seqs.length - 1]! - seqs[0]!).toBe(EVENT_LOG - 1)
    s.leave()
    expect(s.events).toEqual([])
  })
})

describe('打机器人（B11）', () => {
  it('机器人自己答题：一个一个按出来，最后有一方到 8 分', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'tower', aiLevel: 'fast', aiSeed: 7, seeds: { left: 1, [AI_ID]: 2 } })
    const ai = (): Player => s.state!.players.find((p) => p.id === AI_ID)!
    expect(ai().kind).toBe('ai')
    expect(s.operable).toEqual(['left'])
    s.beginPlay()
    // 观察到它在「按」：输入框里出现过内容
    let sawInput = false
    for (let t = 0; t < 120_000 && s.state!.phase === 'playing'; t += 100) {
      vi.advanceTimersByTime(100)
      if (ai().input !== '') sawInput = true
    }
    expect(sawInput).toBe(true)
    expect(s.state!.phase).toBe('ended')
    expect(s.state!.winner).toBe('blue')
    expect(ai().correct).toBe(8)
    expect(ai().index).toBeGreaterThanOrEqual(8)
  })
})

describe('表情与点游戏（B58 / B59）', () => {
  it('两人一台：哪一排发的就从哪边飞，同一排 EMOTE_GAP_MS 内只发一个，EMOTE_MS 后消失；没开局不发', () => {
    const s = useBattleStore()
    expect(s.sendEmote('red', 'cheer')).toBe(false)
    s.setName('me', '小兔')
    s.setName('right', '小虎')
    s.startLocal({ kpId: KP, mode: 'duo', skin: 'race', seeds: { left: 1, right: 2 } })
    expect(s.sendEmote('red', 'cheer')).toBe(true)
    expect(s.sendEmote('red', 'laugh')).toBe(false) // 太快了
    expect(s.sendEmote('blue', 'wow')).toBe(true) // 另一排不受影响
    expect(s.emotes.map((e) => [e.kind, e.side, e.mine])).toEqual([
      ['cheer', 'red', true],
      ['wow', 'blue', true],
    ])
    expect(vi.mocked(playSfx)).toHaveBeenCalledWith('boing')
    vi.advanceTimersByTime(EMOTE_GAP_MS)
    expect(s.sendEmote('red', 'laugh')).toBe(true)
    vi.advanceTimersByTime(EMOTE_MS)
    expect(s.emotes).toEqual([])
    // 两人一台没有机器人：不会有人回
    expect(s.emotes.filter((e) => !e.mine)).toEqual([])
  })

  it('打机器人：发一个表情机器人 BOT_REPLY_MS 后回一个（蓝队、不是我发的）；机器人反超时自己 😎、被反超 😱；结束后按输赢发', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', seeds: { left: 1, ai: 2 }, aiSeed: 3 })
    s.beginPlay()
    s.sendEmote('red', 'laugh')
    expect(s.emotes).toHaveLength(1)
    vi.advanceTimersByTime(BOT_REPLY_MS)
    expect(s.emotes.map((e) => [e.kind, e.side, e.mine])).toEqual([
      ['laugh', 'red', true],
      ['laugh', 'blue', false],
    ])
    vi.advanceTimersByTime(EMOTE_MS)
    // 机器人先得分领先，我再连得两分反超：机器人 😱
    s.submit(AI_ID, correctOf(s.questionOf(s.state!.players[1]!)))
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
    s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
    s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
    expect(s.state!.score).toEqual({ red: 2, blue: 1 })
    expect(s.emotes).toEqual([])
    vi.advanceTimersByTime(600)
    expect(s.emotes.map((e) => [e.kind, e.side, e.mine])).toEqual([['wow', 'blue', false]])
    vi.advanceTimersByTime(EMOTE_MS)
    // 我打满：机器人给我 🔥
    while (s.state!.phase === 'playing') {
      s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
      vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS + 1)
    }
    expect(s.state!.winner).toBe('red')
    // 结束的表情等 1.5 秒（胜利动画开始了）才发：循环末尾已经推进了 FEEDBACK_CALLOUT_MS + 1
    vi.advanceTimersByTime(200)
    expect(s.emotes.some((e) => e.kind === 'cheer' && e.side === 'blue')).toBe(true)
  })

  it('多设备：发表情只发给服务器（本机也画自己的）、不会有机器人回；别人的表情由 onRemoteEmote 画', () => {
    const s = useBattleStore()
    const sent: unknown[] = []
    s.startOnline({ send: (m) => sent.push(m) })
    expect(s.sendEmote('red', 'cheer')).toBe(false) // 还没有比赛快照
    s.onRemoteEmote('watch', 'cheer')
    expect(s.emotes).toEqual([])
    let r = createRoom({ code: 'ABC234', kpId: KP, skin: 'race', host: { clientId: 'hhhhhh', name: '主持' }, version: 'v1', now: 1000 })
    r = join(r, { clientId: 'me', name: '小兔', t: 'red', version: 'v1' }, 2000).room
    r = apply(r, 'hhhhhh', { type: 'team', role: 'blue' }, 3000, () => 7).room
    r = apply(r, 'hhhhhh', { type: 'start' }, 3000, () => 7).room
    s.syncOnline(snapshot(r), 'me')
    expect(s.sendEmote('red', 'cheer')).toBe(true)
    expect(sent).toEqual([{ type: 'emote', id: 'cheer' }])
    s.onRemoteEmote('watch', 'wow')
    expect(s.emotes.map((e) => [e.kind, e.side, e.mine])).toEqual([
      ['cheer', 'red', true],
      ['wow', 'watch', false],
    ])
    vi.advanceTimersByTime(BOT_REPLY_MS + 100)
    expect(s.emotes).toHaveLength(2) // 没有机器人
  })

  it('点游戏（B59）：放这种游戏的得分音（小声），POKE_GAP_MS 内只放一次；没开局不放', () => {
    const s = useBattleStore()
    vi.mocked(playSfx).mockClear()
    s.poke('red')
    expect(vi.mocked(playSfx)).not.toHaveBeenCalled()
    s.setName('me', '小兔')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'train', seeds: { left: 1, ai: 2 } })
    vi.mocked(playSfx).mockClear()
    s.poke('red')
    s.poke('blue')
    expect(vi.mocked(playSfx).mock.calls).toEqual([['chug', 1, 0.45]])
    vi.advanceTimersByTime(POKE_GAP_MS)
    s.poke('blue')
    expect(vi.mocked(playSfx)).toHaveBeenCalledTimes(2)
  })
})

describe('机器人跟着你 + 会说话（B60 / B61）', () => {
  it('「跟着你」：机器人的计划带着孩子的节奏——开局还没答过是空的，答了几题后平均用时、正确率、分差都对', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    expect(s.prefs.aiLevel).toBe('auto')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', seeds: { left: 1, [AI_ID]: 2 }, aiSeed: 3 })
    vi.mocked(planAnswer).mockClear()
    s.beginPlay()
    expect(vi.mocked(planAnswer).mock.calls.at(-1)?.[1]).toBe('auto')
    expect(vi.mocked(planAnswer).mock.calls.at(-1)?.[3]).toEqual({ avgMs: null, accuracy: null, diff: 0 })
    // 孩子每题 2 秒，答对、答错、答对
    vi.advanceTimersByTime(2000)
    s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
    vi.advanceTimersByTime(2000)
    s.submit('left', 'nope')
    vi.advanceTimersByTime(FEEDBACK_WRONG_MS + 1)
    vi.advanceTimersByTime(2000)
    s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
    // 机器人答完一题后为下一题做计划：这时带着孩子的节奏
    vi.advanceTimersByTime(12000)
    const pace = vi.mocked(planAnswer).mock.calls.at(-1)?.[3]
    expect(pace?.avgMs).toBeGreaterThanOrEqual(2000) // 反馈窗口多推进的那 1 ms 也算在下一题里
    expect(pace?.avgMs).toBeLessThanOrEqual(2002)
    expect(pace?.accuracy).toBeCloseTo(2 / 3, 5)
    expect(Number.isInteger(pace?.diff)).toBe(true) // 做计划那一刻的分差（之后机器人又得了分）
  })

  it('机器人的话：开打 0.4 秒后「我准备好啦」冒气泡、2.6 秒后收起；被反超「哎呀被追上了」；孩子还差一分「别急别急」；输了「你太厉害了」；两人一台没有', () => {
    const s = useBattleStore()
    s.setName('me', '小兔')
    s.startLocal({ kpId: KP, mode: 'ai', skin: 'race', seeds: { left: 1, [AI_ID]: 2 }, aiSeed: 3, aiLevel: 'slow' })
    s.beginPlay()
    expect(s.robotLine).toBeNull()
    vi.advanceTimersByTime(ROBOT_LINE_DELAY_MS.go)
    expect(s.robotLine?.key).toBe('robot.ready')
    vi.advanceTimersByTime(ROBOT_SAY_MS)
    expect(s.robotLine).toBeNull()
    // 机器人先领先，我反超
    s.submit(AI_ID, correctOf(s.questionOf(s.state!.players[1]!)))
    vi.advanceTimersByTime(FEEDBACK_RIGHT_MS + 1)
    for (let i = 0; i < 2; i++) {
      s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
      vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS + 1)
    }
    expect(s.state!.score).toEqual({ red: 2, blue: 1 })
    vi.advanceTimersByTime(ROBOT_LINE_DELAY_MS.lead - FEEDBACK_CALLOUT_MS) // 「反超啦」读完再说
    expect(s.robotLine?.key).toBe('robot.behind')
    vi.advanceTimersByTime(ROBOT_SAY_MS)
    while (s.state!.score.red < 7) {
      s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
      vi.advanceTimersByTime(FEEDBACK_CALLOUT_MS + 1)
    }
    vi.advanceTimersByTime(ROBOT_LINE_DELAY_MS.nearWin - FEEDBACK_CALLOUT_MS)
    expect(s.robotLine?.key).toBe('robot.worry')
    vi.advanceTimersByTime(ROBOT_SAY_MS)
    s.submit('left', correctOf(s.questionOf(s.state!.players[0]!)))
    expect(s.state!.phase).toBe('ended')
    vi.advanceTimersByTime(ROBOT_LINE_DELAY_MS.finished)
    expect(s.robotLine?.key).toBe('robot.lose')
    // 两人一台：没有机器人，什么都不说
    s.setName('right', '小虎')
    s.startLocal({ kpId: KP, mode: 'duo', skin: 'race', seeds: { left: 1, right: 2 } })
    s.beginPlay()
    vi.advanceTimersByTime(3000)
    expect(s.robotLine).toBeNull()
  })
})
