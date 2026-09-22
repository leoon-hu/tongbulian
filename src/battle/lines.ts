/**
 * 角色的台词（需求 B71，用户 todo「点击游戏中的角色时……冒出对话框显示角色的台词，不同角色不同台词，让玩家加油做题才能赢；台词自动播放，不同角色不同音色」）。
 * 每种游戏红 / 蓝各一个角色（同一种动物的两边共用一个），每个角色 3 句（`char.<角色>.<n>` 词条，中英 + 拼音，进语料），
 * 每次随机一句、不连续重复；「音色」= 每个角色一个播放速率（乌龟慢而低、兔子快而高），真正换 TTS 音色要改音频管线，先不做。
 */
import type { RNG } from '@/engine'
import type { Team } from './protocol'

export type CharacterId = 'tortoise' | 'hare' | 'driver' | 'engineer' | 'rocket' | 'balloon' | 'frog' | 'duck' | 'climber' | 'mole' | 'badger' | 'cat' | 'bear' | 'builder' | 'flower' | 'hen' | 'blower' | 'picker' | 'starkid' | 'puzzlekid' | 'puller' | 'rider' | 'flagkid' | 'penguin' | 'guard'

export const CHARACTER_IDS: readonly CharacterId[] = ['tortoise', 'hare', 'driver', 'engineer', 'rocket', 'balloon', 'frog', 'duck', 'climber', 'mole', 'badger', 'cat', 'bear', 'builder', 'flower', 'hen', 'blower', 'picker', 'starkid', 'puzzlekid', 'puller', 'rider', 'flagkid', 'penguin', 'guard']

/** 每种游戏两队各是谁 */
export const CHARACTERS: Record<string, { red: CharacterId; blue: CharacterId }> = {
  race: { red: 'tortoise', blue: 'hare' },
  car: { red: 'driver', blue: 'driver' },
  train: { red: 'engineer', blue: 'engineer' },
  rocket: { red: 'rocket', blue: 'rocket' },
  balloon: { red: 'balloon', blue: 'balloon' },
  swim: { red: 'frog', blue: 'duck' },
  ladder: { red: 'climber', blue: 'climber' },
  dig: { red: 'mole', blue: 'badger' },
  fish: { red: 'cat', blue: 'bear' },
  tower: { red: 'builder', blue: 'builder' },
  flower: { red: 'flower', blue: 'flower' },
  egg: { red: 'hen', blue: 'hen' },
  bubble: { red: 'blower', blue: 'blower' },
  fruit: { red: 'picker', blue: 'picker' },
  stars: { red: 'starkid', blue: 'starkid' },
  puzzle: { red: 'puzzlekid', blue: 'puzzlekid' },
  tug: { red: 'puller', blue: 'puller' },
  seesaw: { red: 'rider', blue: 'rider' },
  flag: { red: 'flagkid', blue: 'flagkid' },
  ice: { red: 'penguin', blue: 'penguin' },
  castle: { red: 'guard', blue: 'guard' },
}

/** 播放速率 = 音色：< 1 慢而低，> 1 快而高 */
export const CHARACTER_RATE: Record<CharacterId, number> = {
  tortoise: 0.85,
  hare: 1.25,
  driver: 1.1,
  engineer: 0.95,
  rocket: 1.15,
  balloon: 1.05,
  frog: 1.1,
  duck: 1.2,
  climber: 1.0,
  mole: 0.9,
  badger: 0.95,
  cat: 1.2,
  bear: 0.85,
  builder: 0.95,
  flower: 1.15,
  hen: 1.05,
  blower: 1.1,
  picker: 1.0,
  starkid: 1.15,
  puzzlekid: 1.1,
  puller: 0.9,
  rider: 1.1,
  flagkid: 1.15,
  penguin: 1.05,
  guard: 0.9,
}

export const LINES_PER_CHARACTER = 3
/** 不认识的皮肤 id（多设备时建房者填的）用它 */
export const DEFAULT_CHARACTER: CharacterId = 'climber'

export function characterOf(skinId: string, team: Team): CharacterId {
  return CHARACTERS[skinId]?.[team] ?? DEFAULT_CHARACTER
}

export function lineKey(c: CharacterId, n: number): string {
  return `char.${c}.${n}`
}

/** 全部台词的词条键（语料用） */
export const LINE_KEYS: readonly string[] = CHARACTER_IDS.flatMap((c) => Array.from({ length: LINES_PER_CHARACTER }, (_, i) => lineKey(c, i + 1)))

export interface PickedLine {
  character: CharacterId
  key: string
  rate: number
}

/** 这一队的角色随机说一句；avoid = 上一句的键，不连续重复 */
export function pickLine(skinId: string, team: Team, rng: RNG, avoid: string | null = null): PickedLine {
  const character = characterOf(skinId, team)
  const keys = Array.from({ length: LINES_PER_CHARACTER }, (_, i) => lineKey(character, i + 1))
  const pool = keys.length > 1 && avoid ? keys.filter((k) => k !== avoid) : keys
  return { character, key: rng.pick(pool), rate: CHARACTER_RATE[character] }
}
