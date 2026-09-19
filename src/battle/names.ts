/** 昵称（需求 B17）：现成名字池给不识字的孩子点选；输入的名字只做清洗与长度限制。 */
import type { Lang } from '@/types/models'
import type { RNG } from '@/engine'

export const NAME_MAX = 8

export const NAME_POOL: Record<Lang, readonly string[]> = {
  zh: [
    '🐰 小兔', '🐯 小虎', '🐼 团团', '🦊 阿狐', '🐻 熊熊', '🐨 考拉', '🐸 呱呱', '🐧 企鹅',
    '🦁 狮子', '🐵 猴猴', '🐶 汪汪', '🐱 咪咪', '🦄 独角兽', '🐷 小猪', '🐭 小米', '🐹 仓鼠',
    '🦖 小恐龙', '🐳 鲸鱼', '🐢 龟龟', '🐝 蜜蜂', '🦋 蝴蝶', '🐙 章鱼', '🦉 猫头鹰', '🐺 小狼',
  ],
  en: [
    '🐰 Bunny', '🐯 Tiger', '🐼 Panda', '🦊 Fox', '🐻 Bear', '🐨 Koala', '🐸 Frog', '🐧 Penguin',
    '🦁 Lion', '🐵 Monkey', '🐶 Puppy', '🐱 Kitty', '🦄 Unicorn', '🐷 Piggy', '🐭 Mouse', '🐹 Hamster',
    '🦖 Dino', '🐳 Whale', '🐢 Turtle', '🐝 Bee', '🦋 Butterfly', '🐙 Octopus', '🦉 Owl', '🐺 Wolf',
  ],
}

/** 随机给几个现成名字（去掉已被占用的） */
export function suggestNames(lang: Lang, rng: RNG, count = 6, taken: readonly string[] = []): string[] {
  const pool = NAME_POOL[lang].filter((n) => !taken.includes(n))
  return rng.shuffle(pool).slice(0, count)
}

/** 清洗：去控制字符、去首尾空白，最多 NAME_MAX 个字符（按码点数，emoji 算一个） */
export function cleanName(raw: string): string {
  const stripped = raw.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029]/g, '').trim()
  return Array.from(stripped).slice(0, NAME_MAX).join('')
}
