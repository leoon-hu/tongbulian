import { describe, expect, it } from 'vitest'
import { nextLineup, STAGE_MIN_MS, SWAP_GAP_MS, type LineupPlayer } from '../boss/lineup'

const P = (id: string, team: 'red' | 'blue'): LineupPlayer => ({ id, team })
const players = [P('r1', 'red'), P('r2', 'red'), P('r3', 'red'), P('b1', 'blue'), P('b2', 'blue'), P('b3', 'blue'), P('b4', 'blue')]
const none = new Map<string, number>()

describe('谁在台上（M9）', () => {
  it('一开始每队按原来的顺序上两个；两个人时就是全部', () => {
    expect(nextLineup([], players, none, none, 0)).toEqual(['r1', 'r2', 'b1', 'b2'])
    expect(nextLineup([], [P('a', 'red'), P('b', 'blue')], none, none, 0)).toEqual(['a', 'b'])
  })

  it('台下的人打中了：台上同队最久没打中、待满 5 秒的那个换下去，新来的顶他的位置', () => {
    const since = new Map([
      ['r1', 0],
      ['r2', 0],
      ['b1', 0],
      ['b2', 0],
    ])
    const hits = new Map([
      ['r1', 3000],
      ['r2', 1000],
      ['r3', 6000],
    ])
    expect(nextLineup(['r1', 'r2', 'b1', 'b2'], players, hits, since, 6000)).toEqual(['r1', 'r3', 'b1', 'b2'])
  })

  it('刚上台不到 5 秒的不换；台上的人打得更近的也不换', () => {
    const since = new Map([
      ['r1', 0],
      ['r2', 4000],
    ])
    const hits = new Map([['r3', 5000]])
    // r1 待满了但 r2 没有：换 r1
    expect(nextLineup(['r1', 'r2'], players, hits, since, 5000)).toEqual(['r3', 'r2', 'b1', 'b2'])
    // 都没待满：不换
    expect(nextLineup(['r1', 'r2'], players, hits, new Map([['r1', 1000], ['r2', 1000]]), 5000)).toEqual(['r1', 'r2', 'b1', 'b2'])
    // 台上两个都比他打得近：不换
    const hot = new Map([
      ['r1', 5500],
      ['r2', 5600],
      ['r3', 5000],
    ])
    expect(nextLineup(['r1', 'r2'], players, hot, since, 5000 + STAGE_MIN_MS)).toEqual(['r1', 'r2', 'b1', 'b2'])
  })

  it('一队一次只换一个；离上次换人不到 2.5 秒先不换', () => {
    const since = new Map([
      ['r1', 0],
      ['r2', 0],
    ])
    const hits = new Map([
      ['r3', 6000],
      ['me', 6100],
    ])
    const ps = [...players, P('me', 'red')]
    // 台下两个都打中了：只换一个（打得近的那个）
    expect(nextLineup(['r1', 'r2', 'b1', 'b2'], ps, hits, since, 7000)).toEqual(['me', 'r2', 'b1', 'b2'])
    // 红队 1 秒前刚换过：先不换
    expect(nextLineup(['r1', 'r2', 'b1', 'b2'], ps, hits, since, 7000, new Map([['red', 6000]]))).toEqual(['r1', 'r2', 'b1', 'b2'])
    expect(nextLineup(['r1', 'r2', 'b1', 'b2'], ps, hits, since, 7000, new Map([['red', 7000 - SWAP_GAP_MS]]))).toEqual(['me', 'r2', 'b1', 'b2'])
  })

  it('一队只剩一个人时只上一个；名单里已经不在比赛里的去掉', () => {
    expect(nextLineup(['x', 'r1'], [P('r1', 'red'), P('b1', 'blue')], none, none, 0)).toEqual(['r1', 'b1'])
  })
})
