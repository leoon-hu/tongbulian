/**
 * 谁在台上（需求 M9）：多设备一起打最多 12 人，拳台上放不下——每队最多 STAGE_PER_TEAM 个上台，其他人在观众席举牌，
 * 他们打中时从观众席飞出能量拳。台上的是「每队最近打中的两个」，轮换上台：台下的人打中了，而台上同队有人已经待满
 * STAGE_MIN_MS、又比他更久没打中，就换他上来（刚上台的不马上被换下去，免得台上一直在换人）；同一队一次只换一个、
 * 两次换人至少隔 SWAP_GAP_MS（换人的动画要半秒，太密了台上总有人在跳）。
 * 纯函数：输入上一次的名单、选手、各人最近打中的时刻与上台的时刻，输出新名单；单设备两个人时就是全部。
 */
import type { Team } from '../protocol'

export const STAGE_PER_TEAM = 2
/** 上台后至少待这么久才能被换下去 */
export const STAGE_MIN_MS = 5000
/** 同一队两次换人至少隔这么久 */
export const SWAP_GAP_MS = 2500

export interface LineupPlayer {
  id: string
  team: Team
}

/**
 * 新的台上名单（id，按上一次的顺序留位置，新上来的顶替被换下去的那个位置）：
 * 每队先留住上一次在台上的；不够两个就按「最近打中的优先、没打中过的按原来的顺序」补上；
 * 再看台下打中过的人，比台上同队最久没打中、待满 STAGE_MIN_MS 的那个打得更近就换（一队一次最多换一个；
 * lastSwap 里这一队上次换人不到 SWAP_GAP_MS 就先不换，调用方到时候再调一次）
 */
export function nextLineup(
  prev: readonly string[],
  players: readonly LineupPlayer[],
  lastHit: ReadonlyMap<string, number>,
  since: ReadonlyMap<string, number>,
  now: number,
  lastSwap: ReadonlyMap<Team, number> = new Map(),
): string[] {
  const hitOf = (id: string): number => lastHit.get(id) ?? -Infinity
  const order = new Map(players.map((p, i) => [p.id, i]))
  const byRecent = (a: LineupPlayer, b: LineupPlayer): number => hitOf(b.id) - hitOf(a.id) || order.get(a.id)! - order.get(b.id)!
  const known = new Set(players.map((p) => p.id))
  // 上一次的名单里还在比赛里的，保持原来的位置
  const out: string[] = prev.filter((id) => known.has(id))
  for (const team of ['red', 'blue'] as const satisfies readonly Team[]) {
    const members = players.filter((p) => p.team === team)
    const onStage = (): string[] => out.filter((id) => members.some((m) => m.id === id))
    // 不够就补
    for (const p of members.filter((m) => !out.includes(m.id)).sort(byRecent)) {
      if (onStage().length >= STAGE_PER_TEAM) break
      out.push(p.id)
    }
    // 台下打中过的，按打得近的先来，换掉台上最久没打中、待够了的；一队一次只换一个，离上次换人太近就先不换
    if (now - (lastSwap.get(team) ?? -Infinity) < SWAP_GAP_MS) continue
    for (const p of members.filter((m) => !out.includes(m.id) && lastHit.has(m.id)).sort(byRecent)) {
      const candidates = onStage()
        .filter((id) => now - (since.get(id) ?? -Infinity) >= STAGE_MIN_MS && hitOf(id) < hitOf(p.id))
        .sort((a, b) => hitOf(a) - hitOf(b))
      const out1 = candidates[0]
      if (out1 === undefined) continue
      out[out.indexOf(out1)] = p.id
      break
    }
  }
  return out
}
